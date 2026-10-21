import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../../../lib/server/supabaseAdmin'
import {
  getDriverForToken,
  driverToken,
  driverApplicationId,
} from '../../../../../../../lib/server/marketplaceAuth'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const driver = await getDriverForToken(
      driverApplicationId(req),
      driverToken(req)
    )

    if (!driver) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supportsDriverHire =
      driver.work_mode === 'driver_hire' ||
      driver.work_mode === 'both'

    if (
      !supportsDriverHire ||
      driver.verification_status !== 'approved' ||
      driver.driver_hire_status !== 'approved' ||
      driver.driver_hire_approved !== true
    ) {
      return NextResponse.json(
        { error: 'Driver Hire account is not approved.' },
        { status: 403 }
      )
    }

    const { id } = await context.params

    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json(
        { error: 'Invalid request ID.' },
        { status: 400 }
      )
    }

    let body: Record<string, unknown>

    try {
      const parsed: unknown = await req.json()

      if (
        !parsed ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
      ) {
        throw new Error('Invalid body')
      }

      body = parsed as Record<string, unknown>
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body.' },
        { status: 400 }
      )
    }

    const offerId = body.offerId
    const action = body.action
    const expectedRevision = body.expectedRevision

    if (
      typeof offerId !== 'string' ||
      !UUID_PATTERN.test(offerId)
    ) {
      return NextResponse.json(
        { error: 'Valid offerId is required.' },
        { status: 400 }
      )
    }

    if (
      action !== 'accept' &&
      action !== 'counter' &&
      action !== 'decline'
    ) {
      return NextResponse.json(
        { error: 'Invalid negotiation action.' },
        { status: 400 }
      )
    }

    if (
      typeof expectedRevision !== 'number' ||
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 1
    ) {
      return NextResponse.json(
        { error: 'Valid expectedRevision is required.' },
        { status: 400 }
      )
    }

    let amount: number | null = null

    if (action === 'counter') {
      if (
        typeof body.amount !== 'number' ||
        !Number.isFinite(body.amount) ||
        body.amount <= 0 ||
        body.amount > 1000000000 ||
        !Number.isInteger(body.amount)
      ) {
        return NextResponse.json(
          { error: 'Valid counteroffer amount is required.' },
          { status: 400 }
        )
      }

      amount = body.amount
    }

    if (
      body.message !== undefined &&
      body.message !== null &&
      typeof body.message !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Message must be text.' },
        { status: 400 }
      )
    }

    const message =
      typeof body.message === 'string'
        ? body.message.trim()
        : null

    if (message && message.length > 2000) {
      return NextResponse.json(
        { error: 'Message exceeds 2000 characters.' },
        { status: 400 }
      )
    }

    const db = getSupabaseAdmin()

    // Verify quotation ownership using authenticated driver ID.
    const { data: offer, error: offerError } = await db
      .from('driver_hire_offers')
      .select('id')
      .eq('id', offerId)
      .eq('driver_hire_request_id', id)
      .eq('driver_application_id', driver.id)
      .eq('is_current', true)
      .maybeSingle()

    if (offerError) {
      console.error('Negotiation offer lookup:', offerError)

      return NextResponse.json(
        { error: 'Unable to verify quotation.' },
        { status: 500 }
      )
    }

    if (!offer) {
      return NextResponse.json(
        { error: 'Quotation not found for this driver.' },
        { status: 403 }
      )
    }

    // Verify the request is still eligible for negotiation.
    const { data: job, error: jobError } = await db
      .from('driver_hire_requests')
      .select(
        'status, start_date, start_time, end_date, service_frequency, recurring_end_date, selected_driver_application_id'
      )
      .eq('id', id)
      .maybeSingle()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Unable to verify Driver Hire request.' },
        { status: jobError ? 500 : 404 }
      )
    }

    const isAssigned =
      job.selected_driver_application_id === driver.id

    if (!['requested', 'negotiating'].includes(job.status)) {
      return NextResponse.json(
        { error: 'This request is no longer open for negotiation.' },
        { status: 409 }
      )
    }

    const frequency = String(job.service_frequency || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_')

    const isOneTime =
      !frequency ||
      ['one_time', 'one_off', 'one_time_only', 'once'].includes(frequency)

    const expiryDate = isOneTime
      ? job.start_date
      : (job.recurring_end_date || job.end_date)

    if (!isAssigned && expiryDate) {
      const expiryTime = isOneTime
        ? (job.start_time || '00:00:00')
        : '23:59:59'

      const expiry = new Date(`${expiryDate}T${expiryTime}+01:00`)

      if (!Number.isNaN(expiry.getTime()) && expiry < new Date()) {
        return NextResponse.json(
          {
            error: 'Expired Driver Hire opportunities cannot be negotiated.',
          },
          { status: 409 }
        )
      }
    }
    // The database function performs the atomic state transition.
    const { data, error } = await db.rpc(
      'respond_driver_hire_negotiation_atomic',
      {
        p_request_id: id,
        p_offer_id: offerId,
        p_driver_application_id: driver.id,
        p_action: action,
        p_amount: amount,
        p_message: message || null,
        p_expected_revision: expectedRevision,
      }
    )

    if (error) {
      console.error('Driver Hire negotiation RPC:', error)

      return NextResponse.json(
        {
          error:
            'Negotiation could not be completed. Refresh the job and try again.',
        },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      negotiation: data,
    })
  } catch (error) {
    console.error('Driver Hire negotiation API:', error)

    return NextResponse.json(
      { error: 'Unable to process negotiation.' },
      { status: 500 }
    )
  }
}
