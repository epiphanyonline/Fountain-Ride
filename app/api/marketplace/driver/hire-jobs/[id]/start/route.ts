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
        {
          error: 'Driver Hire is not approved for this account.',
        },
        { status: 403 }
      )
    }

    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { error: 'Driver Hire booking ID is required.' },
        { status: 400 }
      )
    }

    let body: { pin?: unknown }

    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Enter the 4-digit Job Start PIN.' },
        { status: 400 }
      )
    }

    const pin =
      typeof body?.pin === 'string'
        ? body.pin.trim()
        : ''

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'Enter a valid 4-digit Job Start PIN.' },
        { status: 400 }
      )
    }

    const db = getSupabaseAdmin()

    const { data, error } = await db.rpc(
      'start_driver_hire_job_atomic',
      {
        p_request_id: id,
        p_driver_application_id: driver.id,
        p_pin: pin,
      }
    )

    if (error) {
      console.error(
        'Driver Hire atomic start error:',
        error
      )

      const message = String(error.message || '')

      if (
        message.includes('assigned to another driver')
      ) {
        return NextResponse.json(
          { error: 'This booking is assigned to another driver.' },
          { status: 403 }
        )
      }

      if (
        message.includes('not ready to start') ||
        message.includes('Record arrival')
      ) {
        return NextResponse.json(
          { error: message },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Unable to start this Driver Hire job.' },
        { status: 500 }
      )
    }

    if (data?.ok !== true) {
      return NextResponse.json(
        {
          error: data?.error || 'PIN verification failed.',
          attemptsRemaining: data?.attempts_remaining ?? null,
          lockedUntil: data?.locked_until ?? null,
        },
        { status: 409 }
      )
    }

    return NextResponse.json({
      ok: true,
      alreadyStarted: data.already_started === true,
      status: data.status,
      jobStartedAt: data.job_started_at,
      startPinVerified: true,
    })
  } catch (error) {
    console.error(
      'Driver Hire start API error:',
      error
    )

    return NextResponse.json(
      { error: 'Unable to start this Driver Hire job.' },
      { status: 500 }
    )
  }
}
