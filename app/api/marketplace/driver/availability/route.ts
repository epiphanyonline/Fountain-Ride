import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../lib/server/supabaseAdmin'
import {
  getDriverForToken,
  driverToken,
  driverApplicationId,
} from '../../../../../lib/server/marketplaceAuth'

export async function POST(req: Request) {
  const driver =
    await getDriverForToken(
      driverApplicationId(req),
      driverToken(req)
    )

  if (!driver) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const body = await req
    .json()
    .catch(() => null)

  if (!body) {
    return NextResponse.json(
      { error: 'Invalid request.' },
      { status: 400 }
    )
  }

  const workMode =
    driver.work_mode === 'driver_hire'
      ? 'driver_hire'
      : driver.work_mode === 'both'
        ? 'both'
        : 'passenger_trips'

  const supportsPassengerTrips =
    workMode === 'passenger_trips' ||
    workMode === 'both'

  const supportsDriverHire =
    workMode === 'driver_hire' ||
    workMode === 'both'

  const updates: Record<
    string,
    boolean | string
  > = {
    updated_at: new Date().toISOString(),
  }

  if (
    typeof body.passenger_trip_available ===
    'boolean'
  ) {
    if (!supportsPassengerTrips) {
      return NextResponse.json(
        {
          error:
            'Passenger Trips are not enabled for this driver account.',
        },
        { status: 400 }
      )
    }

    updates.passenger_trip_available =
      body.passenger_trip_available

    /*
     * Keep the legacy field synchronized
     * because existing matching code still
     * uses is_available in some places.
     */
    updates.is_available =
      body.passenger_trip_available
  }

  if (
    typeof body.driver_hire_available ===
    'boolean'
  ) {
    if (!supportsDriverHire) {
      return NextResponse.json(
        {
          error:
            'Driver Hire is not enabled for this driver account.',
        },
        { status: 400 }
      )
    }

    updates.driver_hire_available =
      body.driver_hire_available
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json(
      {
        error:
          'No availability setting was supplied.',
      },
      { status: 400 }
    )
  }

  const db = getSupabaseAdmin()

  const { data, error } = await db
    .from('driver_applications')
    .update(updates)
    .eq('id', driver.id)
    .select(
      'id,work_mode,passenger_trip_available,driver_hire_available,driver_hire_approved,is_available'
    )
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  await db
    .from('driver_security_events')
    .insert({
      driver_application_id:
        driver.id,
      event_type:
        'work_availability_updated',
      actor_type: 'driver',
      metadata: {
        passenger_trip_available:
          data.passenger_trip_available,
        driver_hire_available:
          data.driver_hire_available,
      },
    })

  return NextResponse.json({
    success: true,
    availability: {
      passengerTripAvailable:
        data.passenger_trip_available,
      driverHireAvailable:
        data.driver_hire_available,
      driverHireApproved:
        data.driver_hire_approved,
    },
  })
}
