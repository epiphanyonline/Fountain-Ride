import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../../lib/server/supabaseAdmin'
import { isAdminSession } from '../../../../../../lib/server/adminSession'

function optionalNumber(value: unknown) {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return null
  }

  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : NaN
}

function optionalText(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const result = value.trim()

  return result || null
}

export async function POST(
  req: NextRequest,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    // ---------------------------------------------------------
    // ADMIN AUTHENTICATION
    // ---------------------------------------------------------

    const authenticated =
      await isAdminSession()

    if (!authenticated) {
      return NextResponse.json(
        {
          error:
            'Admin authentication required.',
        },
        { status: 401 }
      )
    }

    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        {
          error:
            'Vehicle Hire request is required.',
        },
        { status: 400 }
      )
    }

    const body = await req.json()

    const amount = Number(body.amount)

    const includedDays =
      optionalNumber(body.includedDays)

    const includedHours =
      optionalNumber(body.includedHours)

    const overtimeRate =
      optionalNumber(body.overtimeRate)

    const extraDayRate =
      optionalNumber(body.extraDayRate)

    const additionalCharges =
      body.additionalCharges === '' ||
      body.additionalCharges === null ||
      body.additionalCharges === undefined
        ? 0
        : Number(body.additionalCharges)

    const additionalChargesNote =
      optionalText(
        body.additionalChargesNote
      )

    const offerConditions =
      optionalText(body.offerConditions)

    const message =
      optionalText(body.message)

    // ---------------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------------

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            'Enter a valid quotation amount greater than zero.',
        },
        { status: 400 }
      )
    }

    const optionalValues = [
      {
        label: 'Included days',
        value: includedDays,
      },
      {
        label: 'Included hours',
        value: includedHours,
      },
      {
        label: 'Overtime rate',
        value: overtimeRate,
      },
      {
        label: 'Extra day rate',
        value: extraDayRate,
      },
    ]

    for (const item of optionalValues) {
      if (
        item.value !== null &&
        (
          !Number.isFinite(item.value) ||
          item.value < 0
        )
      ) {
        return NextResponse.json(
          {
            error: `${item.label} must be zero or greater.`,
          },
          { status: 400 }
        )
      }
    }

    if (
      !Number.isFinite(
        additionalCharges
      ) ||
      additionalCharges < 0
    ) {
      return NextResponse.json(
        {
          error:
            'Additional charges must be zero or greater.',
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
            'Explain any additional charges included in the quotation.',
        },
        { status: 400 }
      )
    }

    const supabase =
      getSupabaseAdmin()

    // ---------------------------------------------------------
    // LOAD REQUEST
    // ---------------------------------------------------------

    const {
      data: hireRequest,
      error: requestError,
    } = await supabase
      .from('vehicle_hire_requests')
      .select(`
        id,
        booking_ref,
        car_id,
        status,
        selected_offer_id,
        agreed_amount
      `)
      .eq('id', id)
      .maybeSingle()

    if (requestError) {
      console.error(
        'Vehicle Hire quote request lookup failed:',
        requestError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load Vehicle Hire request.',
        },
        { status: 500 }
      )
    }

    if (!hireRequest) {
      return NextResponse.json(
        {
          error:
            'Vehicle Hire request not found.',
        },
        { status: 404 }
      )
    }

    // Once a quotation is accepted, it becomes the agreement.
    // Do not let admin silently replace it with another quote.
    const quoteableStatuses = [
      'requested',
      'negotiating',
    ]

    if (
      !quoteableStatuses.includes(
        hireRequest.status
      )
    ) {
      return NextResponse.json(
        {
          error:
            'A new quotation cannot be sent at this stage of the booking.',
        },
        { status: 409 }
      )
    }

    // ---------------------------------------------------------
    // FIND CURRENT OFFER
    // ---------------------------------------------------------

    const {
      data: existingOffer,
      error: existingOfferError,
    } = await supabase
      .from('vehicle_hire_offers')
      .select(`
        id,
        version_number,
        is_current,
        status
      `)
      .eq(
        'vehicle_hire_request_id',
        id
      )
      .eq('is_current', true)
      .maybeSingle()

    if (existingOfferError) {
      console.error(
        'Current Vehicle Hire offer lookup failed:',
        existingOfferError
      )

      return NextResponse.json(
        {
          error:
            'Unable to check the current quotation.',
        },
        { status: 500 }
      )
    }

    const nextVersion =
      existingOffer
        ? Number(
            existingOffer.version_number ||
              1
          ) + 1
        : 1

    // ---------------------------------------------------------
    // SUPERSEDE CURRENT OFFER
    // ---------------------------------------------------------

    if (existingOffer) {
      const {
        error: supersedeError,
      } = await supabase
        .from('vehicle_hire_offers')
        .update({
          is_current: false,
          status: 'superseded',
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', existingOffer.id)

      if (supersedeError) {
        console.error(
          'Unable to supersede Vehicle Hire quotation:',
          supersedeError
        )

        return NextResponse.json(
          {
            error:
              'Unable to update the previous quotation.',
          },
          { status: 500 }
        )
      }
    }

    // ---------------------------------------------------------
    // CREATE NEW QUOTATION VERSION
    //
    // amount = complete vehicle + driver package price.
    // We do NOT create a separate driver charge.
    // ---------------------------------------------------------

    const {
      data: offer,
      error: offerError,
    } = await supabase
      .from('vehicle_hire_offers')
      .insert({
        vehicle_hire_request_id:
          id,

        car_id:
          hireRequest.car_id,

        amount,

        included_days:
          includedDays,

        included_hours:
          includedHours,

        overtime_rate:
          overtimeRate,

        extra_day_rate:
          extraDayRate,

        additional_charges:
          additionalCharges,

        additional_charges_note:
          additionalChargesNote,

        offer_conditions:
          offerConditions,

        message,

        status: 'submitted',

        version_number:
          nextVersion,

        previous_offer_id:
          existingOffer?.id || null,

        is_current: true,

        updated_at:
          new Date().toISOString(),
      })
      .select('*')
      .single()

    if (
      offerError ||
      !offer
    ) {
      console.error(
        'Vehicle Hire quotation creation failed:',
        offerError
      )

      /*
       * If creating the new version fails after we superseded
       * the previous one, restore the previous quotation.
       */
      if (existingOffer) {
        const {
          error: restoreError,
        } = await supabase
          .from('vehicle_hire_offers')
          .update({
            is_current: true,
            status: 'submitted',
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'id',
            existingOffer.id
          )

        if (restoreError) {
          console.error(
            'Vehicle Hire previous quotation restore failed:',
            restoreError
          )
        }
      }

      return NextResponse.json(
        {
          error:
            'Unable to send the quotation.',
        },
        { status: 500 }
      )
    }

    // ---------------------------------------------------------
    // REQUEST → NEGOTIATING
    // ---------------------------------------------------------

    const {
      error: statusError,
    } = await supabase
      .from('vehicle_hire_requests')
      .update({
        status: 'negotiating',
        updated_at:
          new Date().toISOString(),
      })
      .eq('id', id)

    if (statusError) {
      console.error(
        'Vehicle Hire request status update failed:',
        statusError
      )
    }

    // ---------------------------------------------------------
    // AUDIT EVENT
    // ---------------------------------------------------------

    const {
      error: eventError,
    } = await supabase
      .from('vehicle_hire_events')
      .insert({
        vehicle_hire_request_id:
          id,

        event_type:
          existingOffer
            ? 'quotation_updated'
            : 'quotation_submitted',

        actor_role: 'owner',

        metadata: {
          offer_id: offer.id,

          version_number:
            offer.version_number,

          amount:
            Number(offer.amount),

          currency: 'NGN',

          vehicle_and_driver_included:
            true,

          previous_offer_id:
            existingOffer?.id || null,
        },
      })

    if (eventError) {
      console.error(
        'Vehicle Hire quotation event failed:',
        eventError
      )
    }

    return NextResponse.json({
      ok: true,

      offer,

      status: 'negotiating',

      message:
        existingOffer
          ? 'Vehicle Hire quotation updated.'
          : 'Vehicle Hire quotation sent.',
    })
  } catch (error) {
    console.error(
      'Vehicle Hire quotation API error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to send the Vehicle Hire quotation.',
      },
      { status: 500 }
    )
  }
}
