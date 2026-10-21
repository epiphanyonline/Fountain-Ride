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
    // Availability is deliberately NOT checked because this
    // driver is completing an already-assigned booking.
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
    // Load only fields required to authorize completion.
    //
    // Job Start PIN is deliberately NOT selected.
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
          job_start_pin_used_at,
          job_started_at,
          driver_finished_at
        `
      )
      .eq('id', id)
      .maybeSingle()

    if (jobError) {
      console.error(
        'Driver Hire finish job lookup error:',
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
    // Only selected driver can finish this booking
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

    // ---------------------------------------------------------
    // Idempotency
    // ---------------------------------------------------------

    if (
      job.status ===
        'awaiting_customer_confirmation' &&
      job.driver_finished_at
    ) {
      return NextResponse.json({
        ok: true,
        alreadyFinished: true,
        status: job.status,
        driverFinishedAt:
          job.driver_finished_at,
      })
    }

    // ---------------------------------------------------------
    // Must have been legitimately started first
    // ---------------------------------------------------------

    if (job.status !== 'in_progress') {
      return NextResponse.json(
        {
          error:
            'This job is not currently in progress.',
        },
        { status: 409 }
      )
    }

    if (
      !job.job_start_pin_used_at ||
      !job.job_started_at
    ) {
      return NextResponse.json(
        {
          error:
            'This job does not have a verified start.',
        },
        { status: 409 }
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

    const now = new Date().toISOString()

    // ---------------------------------------------------------
    // Driver finishes work.
    //
    // IMPORTANT:
    // This does NOT release the driver's earning.
    // Customer confirmation comes next.
    // ---------------------------------------------------------

    const {
      data: updatedJob,
      error: updateError,
    } = await db
      .from('driver_hire_requests')
      .update({
        status:
          'awaiting_customer_confirmation',
        driver_finished_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .eq(
        'selected_driver_application_id',
        driver.id
      )
      .eq('status', 'in_progress')
      .select(
        `
          id,
          booking_ref,
          status,
          job_started_at,
          driver_finished_at
        `
      )
      .maybeSingle()

    if (updateError) {
      console.error(
        'Driver Hire finish job update error:',
        updateError
      )

      return NextResponse.json(
        {
          error:
            'Unable to finish this Driver Hire job.',
        },
        { status: 500 }
      )
    }

    if (!updatedJob) {
      return NextResponse.json(
        {
          error:
            'The booking changed before completion could be recorded. Refresh and try again.',
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
        event_type: 'driver_finished',
        actor_role: 'driver',
        actor_id: String(driver.id),
        metadata: {
          driver_finished_at: now,
        },
      })

    if (eventError) {
      console.error(
        'Driver Hire finish job event insert error:',
        eventError
      )
    }

    return NextResponse.json({
      ok: true,
      alreadyFinished: false,
      status: updatedJob.status,
      jobStartedAt:
        updatedJob.job_started_at,
      driverFinishedAt:
        updatedJob.driver_finished_at,
    })
  } catch (error) {
    console.error(
      'Driver Hire finish job API error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to finish this Driver Hire job.',
      },
      { status: 500 }
    )
  }
}
