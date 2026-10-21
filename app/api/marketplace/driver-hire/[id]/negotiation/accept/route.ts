import { NextResponse } from 'next/server'
import crypto from 'crypto'

import { getSupabaseAdmin } from '../../../../../../../lib/server/supabaseAdmin'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function safeEqual(supplied: string, stored: string): boolean {
  try {
    const a = Buffer.from(supplied)
    const b = Buffer.from(stored)

    return a.length === b.length && crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(
  req: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const { id } = await context.params

    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json(
        { error: 'Invalid Driver Hire request ID.' },
        { status: 400 }
      )
    }

    const accessToken =
      req.headers.get('x-driver-hire-access-token')?.trim() || ''

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Customer access token is required.' },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => null)

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'A valid request body is required.' },
        { status: 400 }
      )
    }

    const offerId =
      typeof body.offerId === 'string'
        ? body.offerId.trim()
        : ''

    if (!UUID_PATTERN.test(offerId)) {
      return NextResponse.json(
        { error: 'Valid quotation ID is required.' },
        { status: 400 }
      )
    }

    const expectedRevision = body.expectedRevision

    if (
      typeof expectedRevision !== 'number' ||
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 1
    ) {
      return NextResponse.json(
        { error: 'A valid negotiation revision is required.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Authenticate access to this specific Driver Hire booking.
    const { data: access, error: accessError } = await supabase
      .from('driver_hire_customer_access')
      .select('id, access_token')
      .eq('driver_hire_request_id', id)
      .eq('access_token', accessToken)
      .is('revoked_at', null)
      .maybeSingle()

    if (accessError) {
      console.error('Negotiation acceptance access lookup failed:', accessError)

      return NextResponse.json(
        { error: 'Unable to verify booking access.' },
        { status: 500 }
      )
    }

    if (
      !access ||
      !safeEqual(accessToken, String(access.access_token || ''))
    ) {
      return NextResponse.json(
        { error: 'You do not have access to this Driver Hire request.' },
        { status: 403 }
      )
    }

    // The RPC atomically validates and accepts the latest driver price.
    const { data: result, error: rpcError } = await supabase.rpc(
      'accept_driver_hire_customer_negotiation_atomic',
      {
        p_request_id: id,
        p_offer_id: offerId,
        p_expected_revision: expectedRevision,
      }
    )

    if (rpcError) {
      console.error('Customer negotiation acceptance failed:', rpcError)

      const reason = rpcError.message || ''

      const conflictMessages = [
        'no longer open',
        'no longer eligible',
        'No open negotiation',
        'Negotiation has changed',
        'Waiting for the driver',
      ]

      if (conflictMessages.some(text => reason.includes(text))) {
        return NextResponse.json(
          { error: reason },
          { status: 409 }
        )
      }

      if (
        reason.includes('request not found') ||
        reason.includes('Quotation not found')
      ) {
        return NextResponse.json(
          { error: 'Booking or quotation not found.' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Unable to accept the negotiated price.' },
        { status: 500 }
      )
    }

    // Best-effort customer access activity update.
    await supabase
      .from('driver_hire_customer_access')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', access.id)

    return NextResponse.json({
      success: true,
      agreement: result,
    })
  } catch (error) {
    console.error('Customer negotiation acceptance API error:', error)

    return NextResponse.json(
      { error: 'Unable to accept the negotiated price.' },
      { status: 500 }
    )
  }
}
