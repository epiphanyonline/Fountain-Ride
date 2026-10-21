import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../../../lib/server/supabaseAdmin'
import {
  getDriverForToken,
  driverToken,
  driverApplicationId,
} from '../../../../../../../lib/server/marketplaceAuth'

function numberOrNull(value: any) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  const n = Number(value)

  return Number.isFinite(n) ? n : null
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ---------------------------------------------------------
    // Authenticate driver
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // Driver Hire eligibility
    // ---------------------------------------------------------

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
        {
          error:
            'Your account is not currently approved for Driver Hire.',
        },
        { status: 403 }
      )
    }

    if (driver.driver_hire_available !== true) {
      return NextResponse.json(
        {
          error:
            'Switch Driver Hire availability on before submitting a quotation.',
        },
        { status: 403 }
      )
    }

    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { error: 'Driver Hire request ID is required.' },
        { status: 400 }
      )
    }

    const body = await req.json()

    const baseAmount = numberOrNull(
      body.baseAmount
    )

    const includedHours = numberOrNull(
      body.includedHours
    )

    const overtimeRate = numberOrNull(
      body.overtimeRate
    )

    const additionalCharges =
      numberOrNull(body.additionalCharges) ?? 0

    const additionalChargesNote =
      String(
        body.additionalChargesNote || ''
      ).trim() || null

    const fuelTerms =
      String(body.fuelTerms || '').trim() || null

    const tollParkingTerms =
      String(
        body.tollParkingTerms || ''
      ).trim() || null

    const accommodationTerms =
      String(
        body.accommodationTerms || ''
      ).trim() || null

    // Validate quotation terms against database constraints.
    const validFuelTerms = [
      'included',
      'customer_pays',
      'not_applicable',
      'to_be_agreed',
    ]

    const validTollParkingTerms = [
      'included',
      'customer_pays',
      'not_applicable',
      'to_be_agreed',
    ]

    const validAccommodationTerms = [
      'included',
      'customer_provides',
      'not_required',
      'to_be_agreed',
    ]

    if (
      (fuelTerms !== null && !validFuelTerms.includes(fuelTerms)) ||
      (tollParkingTerms !== null &&
        !validTollParkingTerms.includes(tollParkingTerms)) ||
      (accommodationTerms !== null &&
        !validAccommodationTerms.includes(accommodationTerms))
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid quotation terms. Please select the fuel, toll/parking and accommodation arrangements from the available options.',
        },
        { status: 400 }
      )
    }
    const offerConditions =
      String(
        body.offerConditions || ''
      ).trim() || null

    const message =
      String(body.message || '').trim() || null

    const marketplaceTermsAccepted =
      body.marketplaceTermsAccepted === true

    // ---------------------------------------------------------
    // Validate quotation
    // ---------------------------------------------------------

    if (
      baseAmount === null ||
      baseAmount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            'Enter a valid base quotation amount.',
        },
        { status: 400 }
      )
    }

    if (
      includedHours !== null &&
      includedHours <= 0
    ) {
      return NextResponse.json(
        {
          error:
            'Included hours must be greater than zero.',
        },
        { status: 400 }
      )
    }

    if (
      overtimeRate !== null &&
      overtimeRate < 0
    ) {
      return NextResponse.json(
        {
          error:
            'Overtime rate cannot be negative.',
        },
        { status: 400 }
      )
    }

    if (additionalCharges < 0) {
      return NextResponse.json(
        {
          error:
            'Additional charges cannot be negative.',
        },
        { status: 400 }
      )
    }

    if (
      additionalCharges > 0 &&
      !additionalChargesNote
    ) {
      return NextResponse.json(
        {
          error:
            'Explain what the additional charges cover.',
        },
        { status: 400 }
      )
    }

    if (!marketplaceTermsAccepted) {
      return NextResponse.json(
        {
          error:
            'You must accept the Driver Hire Marketplace Agreement before submitting a quotation.',
        },
        { status: 400 }
      )
    }

    const totalAmount =
      baseAmount + additionalCharges

    const db = getSupabaseAdmin()

    // ---------------------------------------------------------
    // Verify request is still open
    // ---------------------------------------------------------

    const {
      data: job,
      error: jobError,
    } = await db
      .from('driver_hire_requests')
      .select(
        `
          id,
          status,
          vehicle_transmission,
          start_date,
          start_time,
          end_date,
          service_frequency,
          recurring_end_date
        `
      )
      .eq('id', id)
      .maybeSingle()

    if (jobError) {
      console.error(
        'Driver Hire quotation request lookup error:',
        jobError
      )

      return NextResponse.json(
        {
          error:
            'Unable to verify this Driver Hire request.',
        },
        { status: 500 }
      )
    }

    if (!job) {
      return NextResponse.json(
        {
          error:
            'Driver Hire request not found.',
        },
        { status: 404 }
      )
    }

    if (
      ![
        'requested',
        'negotiating',
      ].includes(job.status)
    ) {
      return NextResponse.json(
        {
          error:
            'This request is no longer accepting quotations.',
        },
        { status: 409 }
      )
    }

    // ---------------------------------------------------------
    // Reject expired quotation opportunities.
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

    if (expiryDate) {
      const expiryTime = isOneTime
        ? (job.start_time || '00:00:00')
        : '23:59:59'

      const expiry = new Date(`${expiryDate}T${expiryTime}+01:00`)

      if (!Number.isNaN(expiry.getTime()) && expiry < new Date()) {
        return NextResponse.json(
          { error: 'This Driver Hire opportunity has expired.' },
          { status: 409 }
        )
      }
    }
    // Recheck transmission capability
    // ---------------------------------------------------------

    if (
      job.vehicle_transmission === 'manual' &&
      driver.drives_manual !== true
    ) {
      return NextResponse.json(
        {
          error:
            'This job requires manual driving capability.',
        },
        { status: 403 }
      )
    }

    if (
      job.vehicle_transmission === 'automatic' &&
      driver.drives_automatic !== true
    ) {
      return NextResponse.json(
        {
          error:
            'This job requires automatic driving capability.',
        },
        { status: 403 }
      )
    }

    // ---------------------------------------------------------
    // Find current quotation
    // ---------------------------------------------------------

    const {
      data: currentOffer,
      error: currentOfferError,
    } = await db
      .from('driver_hire_offers')
      .select(
        `
          id,
          version_number,
          status
        `
      )
      .eq(
        'driver_hire_request_id',
        id
      )
      .eq(
        'driver_application_id',
        driver.id
      )
      .eq('is_current', true)
      .maybeSingle()

    if (currentOfferError) {
      console.error(
        'Current Driver Hire quotation lookup error:',
        currentOfferError
      )

      return NextResponse.json(
        {
          error:
            'Unable to verify your existing quotation.',
        },
        { status: 500 }
      )
    }

    if (
      currentOffer &&
      currentOffer.status === 'accepted'
    ) {
      return NextResponse.json(
        {
          error:
            'An accepted quotation can no longer be changed.',
        },
        { status: 409 }
      )
    }

        // ---------------------------------------------------------
    // Submit quotation atomically
    // ---------------------------------------------------------

    const { data: result, error: rpcError } = await db.rpc(
      'submit_driver_hire_offer_atomic',
      {
        p_request_id: id,
        p_driver_application_id: driver.id,
        p_base_amount: baseAmount,
        p_included_hours: includedHours,
        p_overtime_rate: overtimeRate,
        p_additional_charges: additionalCharges,
        p_additional_charges_note: additionalChargesNote,
        p_fuel_terms: fuelTerms,
        p_toll_parking_terms: tollParkingTerms,
        p_accommodation_terms: accommodationTerms,
        p_offer_conditions: offerConditions,
        p_message: message,
      }
    )

    if (rpcError || !result?.success || !result?.offer_id) {
      console.error(
        'Atomic Driver Hire quotation error:',
        rpcError ?? result
      )

      return NextResponse.json(
        {
          error:
            'Unable to submit your quotation. Please check that the booking is still available and no negotiation is in progress.',
        },
        { status: 409 }
      )
    }

    // ---------------------------------------------------------
    // Retrieve the committed quotation
    // ---------------------------------------------------------

    const { data: offer, error: offerError } = await db
      .from('driver_hire_offers')
      .select(
        `
          id,
          amount,
          base_amount,
          included_hours,
          overtime_rate,
          additional_charges,
          additional_charges_note,
          fuel_terms,
          toll_parking_terms,
          accommodation_terms,
          offer_conditions,
          message,
          status,
          version_number,
          is_current,
          created_at,
          updated_at
        `
      )
      .eq('id', result.offer_id)
      .eq('driver_hire_request_id', id)
      .eq('driver_application_id', driver.id)
      .single()

    if (offerError || !offer) {
      console.error(
        'Committed Driver Hire quotation lookup error:',
        offerError
      )

      return NextResponse.json(
        {
          error:
            'Quotation was saved, but its details could not be retrieved. Please refresh your quotations before trying again.',
        },
        { status: 500 }
      )
    }

        return NextResponse.json({
      ok: true,
      offer,
      message:
        offer.version_number > 1
          ? 'Your quotation has been updated.'
          : 'Your quotation has been submitted.',
    })
  } catch (error) {
    console.error(
      'Driver Hire quotation API error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to submit your quotation.',
      },
      { status: 500 }
    )
  }
}
