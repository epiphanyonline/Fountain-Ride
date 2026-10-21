import { NextResponse } from 'next/server'

import { getSupabaseAdmin } from '../../../../../../../lib/server/supabaseAdmin'
import {
  getDriverForToken,
  driverToken,
  driverApplicationId,
} from '../../../../../../../lib/server/marketplaceAuth'

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
    //
    // Availability is deliberately NOT checked here.
    // Once a driver has an accepted and paid booking, switching
    // marketplace availability off must not block that job.
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
    // Load only the fields needed to authorize arrival.
    //
    // IMPORTANT:
    // job_start_pin is deliberately NOT selected.
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
          selected_driver_application_id,
          accepted_offer_id,
          driver_arrived_at
        `
      )
      .eq('id', id)
      .maybeSingle()

    if (jobError) {
      console.error(
        'Driver Hire arrival job lookup error:',
        jobError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load this Driver Hire booking.',
        },
        { status: 500 }
      )
    }

    if (!job) {
      return NextResponse.json(
        {
          error:
            'Driver Hire booking not found.',
        },
        { status: 404 }
      )
    }

    // ---------------------------------------------------------
    // Only the selected driver can operate this booking
    // ---------------------------------------------------------

    if (
      job.selected_driver_application_id !==
      driver.id
    ) {
      return NextResponse.json(
        {
          error:
            'This booking is assigned to another driver.',
        },
        { status: 403 }
      )
    }

    if (!job.accepted_offer_id) {
      return NextResponse.json(
        {
          error:
            'This booking does not have an accepted quotation.',
        },
        { status: 409 }
      )
    }

    // ---------------------------------------------------------
    // Idempotency
    //
    // If arrival has already been recorded, simply return the
    // current state rather than creating another event.
    // ---------------------------------------------------------

    if (
      job.status === 'driver_arrived' &&
      job.driver_arrived_at
    ) {
      return NextResponse.json({
        ok: true,
        alreadyArrived: true,
        status: job.status,
        driverArrivedAt:
          job.driver_arrived_at,
      })
    }

    // Payment must have been completed first.
    if (job.status !== 'confirmed') {
      return NextResponse.json(
        {
          error:
            'This booking is not ready for driver arrival.',
        },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()

    // ---------------------------------------------------------
    // Record arrival
    //
    // The status condition protects against a stale request
    // changing an already-progressed booking.
    // ---------------------------------------------------------

    const {
      data: updatedJob,
      error: updateError,
    } = await db
      .from('driver_hire_requests')
      .update({
        status: 'driver_arrived',
        driver_arrived_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .eq(
        'selected_driver_application_id',
        driver.id
      )
      .eq('status', 'confirmed')
      .select(
        `
          id,
          booking_ref,
          status,
          driver_arrived_at
        `
      )
      .maybeSingle()

    if (updateError) {
      console.error(
        'Driver Hire arrival update error:',
        updateError
      )

      return NextResponse.json(
        {
          error:
            'Unable to record driver arrival.',
        },
        { status: 500 }
      )
    }

    if (!updatedJob) {
      return NextResponse.json(
        {
          error:
            'The booking changed before arrival could be recorded. Refresh and try again.',
        },
        { status: 409 }
      )
    }

    // ---------------------------------------------------------
    // Audit event
    // ---------------------------------------------------------

    const {
      error: eventError,
    } = await db
      .from('driver_hire_events')
      .insert({
        driver_hire_request_id: id,
        event_type: 'driver_arrived',
        actor_role: 'driver',
        actor_id: String(driver.id),
        metadata: {
          driver_arrived_at: now,
        },
      })

    if (eventError) {
      // Arrival has already been safely recorded.
      // Do not roll it back merely because audit logging failed.
      console.error(
        'Driver Hire arrival event insert error:',
        eventError
      )
    }

    return NextResponse.json({
      ok: true,
      alreadyArrived: false,
      status: updatedJob.status,
      driverArrivedAt:
        updatedJob.driver_arrived_at,
    })
  } catch (error) {
    console.error(
      'Driver Hire arrival API error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to record driver arrival.',
      },
      { status: 500 }
    )
  }
}
