import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../../lib/server/supabaseAdmin'
import {
  getDriverForToken,
  driverToken,
  driverApplicationId,
} from '../../../../../../lib/server/marketplaceAuth'

export async function GET(
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

    const workMode =
      driver.work_mode === 'driver_hire'
        ? 'driver_hire'
        : driver.work_mode === 'both'
          ? 'both'
          : 'passenger_trips'

    const supportsDriverHire =
      workMode === 'driver_hire' ||
      workMode === 'both'

    if (!supportsDriverHire) {
      return NextResponse.json(
        {
          error:
            'Driver Hire is not enabled for this account.',
        },
        { status: 403 }
      )
    }

    if (driver.verification_status !== 'approved') {
      return NextResponse.json(
        {
          error:
            'Driver profile is not approved.',
        },
        { status: 403 }
      )
    }

    if (
      driver.driver_hire_status !== 'approved' ||
      driver.driver_hire_approved !== true
    ) {
      return NextResponse.json(
        {
          error:
            'Driver Hire profile is not approved.',
        },
        { status: 403 }
      )
    }

    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        {
          error:
            'Driver Hire request ID is required.',
        },
        { status: 400 }
      )
    }

    const db = getSupabaseAdmin()

    // ---------------------------------------------------------
    // Load ONE marketplace-safe Driver Hire request
    //
    // IMPORTANT:
    // Customer identity and exact private addresses are
    // deliberately excluded.
    //
    // IMPORTANT:
    // job_start_pin is deliberately NOT selected.
    // The driver must never receive the customer's PIN.
    // ---------------------------------------------------------

    const {
      data: job,
      error: jobError,
    } = await db
      .from('driver_hire_requests')
      .select(
        `
          id,
          booking_ref,
          status,
          driver_need_type,
          job_type,
          job_description,
          public_work_area,
          pickup_city,
          pickup_state,
          destination_pattern,
          destination_city,
          destination_state,
          start_date,
          start_time,
          end_date,
          end_time,
          duration_hours,
          finish_time_uncertain,
          estimated_min_hours,
          estimated_max_hours,
          service_frequency,
          recurring_pattern,
          recurring_days,
          custom_schedule,
          recurring_end_date,
          recurring_duration_note,
          duties,
          vehicle_type,
          vehicle_make,
          vehicle_model,
          vehicle_year,
          vehicle_transmission,
          vehicle_notes,
          passenger_count,
          interstate_required,
          overnight_required,
          accommodation_arrangement,
          waiting_expected,
          estimated_waiting_hours,
          luggage_notes,
          special_requirements,
          selected_driver_application_id,
          accepted_offer_id,
          agreed_fare,
          driver_arrived_at,
          job_start_pin_used_at,
          job_started_at,
          driver_finished_at,
          customer_confirmed_at,
          created_at
        `
      )
      .eq('id', id)
      .maybeSingle()

    if (jobError) {
      console.error(
        'Driver Hire job detail lookup error:',
        jobError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load Driver Hire job.',
        },
        { status: 500 }
      )
    }

    if (!job) {
      return NextResponse.json(
        {
          error:
            'Driver Hire job not found.',
        },
        { status: 404 }
      )
    }

    // ---------------------------------------------------------
    // Determine whether this is:
    //
    // 1. An open marketplace job that the driver may quote for
    //
    // OR
    //
    // 2. An already-awarded operational booking assigned to
    //    this driver.
    //
    // Availability applies to discovering/opening NEW jobs.
    // It must NOT prevent a driver from completing a booking
    // that has already been awarded to them.
    // ---------------------------------------------------------

    const isOpenMarketplaceJob = [
      'requested',
      'negotiating',
    ].includes(job.status)

    const isAssignedToThisDriver =
      job.selected_driver_application_id ===
      driver.id
    // Expired marketplace opportunities are admin-only.
    // Assigned drivers retain access to their bookings.
    if (isOpenMarketplaceJob && !isAssignedToThisDriver) {
      const start = job.start_date
        ? new Date(`${job.start_date}T${job.start_time || '00:00:00'}+01:00`)
        : null

      const frequency = String(job.service_frequency || '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_')

      const isOneTime =
        !frequency ||
        ['one_time', 'one_off', 'one_time_only', 'once'].includes(frequency)

      if (start && !Number.isNaN(start.getTime())) {
        const now = new Date()

        let expired = isOneTime && start < now

        if (!isOneTime) {
          const endDate = job.recurring_end_date || job.end_date

          if (endDate) {
            const end = new Date(`${endDate}T23:59:59+01:00`)
            expired = !Number.isNaN(end.getTime()) && end < now
          }
        }

        if (expired) {
          return NextResponse.json(
            { error: 'This Driver Hire opportunity has expired.' },
            { status: 403 }
          )
        }
      }
    }

    const operationalStatuses = [
      'awaiting_payment',
      'confirmed',
      'driver_en_route',
      'driver_arrived',
      'in_progress',
      'awaiting_customer_confirmation',
      'completed',
    ]

    const isAssignedOperationalJob =
      isAssignedToThisDriver &&
      operationalStatuses.includes(job.status)

    // ---------------------------------------------------------
    // Open marketplace jobs require availability ON
    // ---------------------------------------------------------

    if (
      isOpenMarketplaceJob &&
      driver.driver_hire_available !== true
    ) {
      return NextResponse.json(
        {
          error:
            'Switch Driver Hire availability on before viewing marketplace jobs.',
        },
        { status: 403 }
      )
    }

    // ---------------------------------------------------------
    // Closed/operational jobs are private to the selected
    // driver.
    //
    // This prevents another driver from opening an accepted,
    // paid, in-progress or completed booking.
    // ---------------------------------------------------------

    if (
      !isOpenMarketplaceJob &&
      !isAssignedOperationalJob
    ) {
      return NextResponse.json(
        {
          error:
            'This Driver Hire request is no longer available to this driver.',
        },
        { status: 403 }
      )
    }

    // ---------------------------------------------------------
    // Transmission capability check
    //
    // Keep the existing marketplace safety check for open
    // quotation jobs.
    //
    // Once the job has already been awarded, we do not block
    // operational access because the driver/customer agreement
    // already exists.
    // ---------------------------------------------------------

    if (isOpenMarketplaceJob) {
      if (
        job.vehicle_transmission === 'manual' &&
        driver.drives_manual !== true
      ) {
        return NextResponse.json(
          {
            error:
              'This job requires a driver who can drive a manual vehicle.',
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
              'This job requires a driver who can drive an automatic vehicle.',
          },
          { status: 403 }
        )
      }
    }

    // ---------------------------------------------------------
    // Load this driver's CURRENT quotation for this job.
    //
    // This remains useful after acceptance because it lets the
    // driver see the commercial terms that were agreed.
    // ---------------------------------------------------------

    const {
      data: currentOffer,
      error: offerError,
    } = await db
      .from('driver_hire_offers')
      .select(
        `
          id,
          driver_hire_request_id,
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
          marketplace_terms_accepted,
          marketplace_terms_accepted_at,
          accepted_at,
          created_at,
          updated_at
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

    if (offerError) {
      console.error(
        'Driver Hire current quotation lookup error:',
        offerError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load your quotation for this job.',
        },
        { status: 500 }
      )
    }

    // ---------------------------------------------------------
    // Load negotiation for this driver's own quotation.
    let myNegotiation = null

    if (currentOffer) {
      const { data: negotiation, error: negotiationError } =
        await db
          .from('hire_negotiation_state')
          .select(
            'id, service_type, request_id, offer_id, current_amount, last_actor, status, revision, created_at, updated_at'
          )
          .eq('service_type', 'driver_hire')
          .eq('request_id', id)
          .eq('offer_id', currentOffer.id)
          .maybeSingle()

      if (negotiationError) {
        console.error(
          'Driver Hire negotiation lookup error:',
          negotiationError
        )

        return NextResponse.json(
          { error: 'Unable to load negotiation.' },
          { status: 500 }
        )
      }

      myNegotiation = negotiation
    }
    // Driver preferences
    // ---------------------------------------------------------

    const interests = Array.isArray(
      driver.driver_hire_job_types
    )
      ? driver.driver_hire_job_types
      : []

    // ---------------------------------------------------------
    // Determine what the driver is allowed to do from the UI.
    //
    // These are convenience flags only.
    // The action endpoints still perform their own authoritative
    // server-side authorization.
    // ---------------------------------------------------------

    const canSubmitQuotation =
      isOpenMarketplaceJob

    const canRecordArrival =
      isAssignedToThisDriver &&
      job.status === 'confirmed'

    const canEnterStartPin =
      isAssignedToThisDriver &&
      job.status === 'driver_arrived' &&
      Boolean(job.driver_arrived_at) &&
      !job.job_start_pin_used_at

    const canFinishJob =
      isAssignedToThisDriver &&
      job.status === 'in_progress' &&
      Boolean(job.job_start_pin_used_at) &&
      Boolean(job.job_started_at)

    const awaitingCustomerConfirmation =
      isAssignedToThisDriver &&
      job.status ===
        'awaiting_customer_confirmation'

    const isCompleted =
      isAssignedToThisDriver &&
      job.status === 'completed'

    // ---------------------------------------------------------
    // Safe response
    //
    // DO NOT add job_start_pin here.
    // ---------------------------------------------------------

    return NextResponse.json({
      ok: true,

      job: {
        ...job,

        matches_interest:
          interests.length === 0 ||
          interests.includes(job.job_type),

        my_offer:
          currentOffer || null,


        my_negotiation: myNegotiation,
        lifecycle: {
          is_open_marketplace_job:
            isOpenMarketplaceJob,

          is_assigned_to_me:
            isAssignedToThisDriver,

          can_submit_quotation:
            canSubmitQuotation,

          can_record_arrival:
            canRecordArrival,

          can_enter_start_pin:
            canEnterStartPin,

          can_finish_job:
            canFinishJob,

          awaiting_customer_confirmation:
            awaitingCustomerConfirmation,

          is_completed:
            isCompleted,
        },
      },

      driver: {
        id: driver.id,

        driving_experience_years:
          driver.driving_experience_years,

        drives_automatic:
          driver.drives_automatic === true,

        drives_manual:
          driver.drives_manual === true,

        driver_hire_job_types:
          interests,
      },
    })
  } catch (error) {
    console.error(
      'Driver Hire job detail API error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to load Driver Hire job.',
      },
      { status: 500 }
    )
  }
}
