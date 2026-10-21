import { NextResponse } from 'next/server'

import { isAdminSession } from '../../../../../lib/server/adminSession'
import { getSupabaseAdmin } from '../../../../../lib/server/supabaseAdmin'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const db = getSupabaseAdmin()

  // DRIVER HIRE VERIFICATION
  if (body?.action === 'driver_hire') {
    const status = String(body?.status || '')

    if (!['approved', 'rejected', 'suspended', 'pending'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid Driver Hire status' },
        { status: 400 }
      )
    }

    const { data: driver, error: driverError } = await db
      .from('driver_applications')
      .select('id,work_mode')
      .eq('id', id)
      .single()

    if (driverError || !driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    if (!['driver_hire', 'both'].includes(driver.work_mode)) {
      return NextResponse.json(
        { error: 'This driver is not registered for Driver Hire.' },
        { status: 409 }
      )
    }

    const update: Record<string, any> = {
  driver_hire_status: status,
  driver_hire_approved: status === 'approved',

  // Approval gives permission to work.
  // The driver must personally switch availability ON.
  driver_hire_available: false,

  updated_at: new Date().toISOString(),
}

    // A rejected, suspended or pending Driver Hire profile
    // must not remain available for Hire jobs.
    if (status !== 'approved') {
      update.driver_hire_available = false
    }

    const { data, error } = await db
      .from('driver_applications')
      .update(update)
      .eq('id', id)
      .select(
        'id,work_mode,driver_hire_status,driver_hire_approved,driver_hire_available'
      )
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  }

  // GENERAL DRIVER VERIFICATION
  const status = String(body?.status || '')

  if (!['approved', 'rejected', 'suspended', 'pending'].includes(status)) {
    return NextResponse.json(
      { error: 'Invalid verification status' },
      { status: 400 }
    )
  }

  if (status === 'approved') {
    const { data: driver } = await db
      .from('driver_applications')
      .select('driver_type,park_id,work_mode')
      .eq('id', id)
      .single()

    // Garage requirement applies only when the driver
    // actually provides passenger trips.
    const providesPassengerTrips =
      driver?.work_mode === 'passenger_trips' ||
      driver?.work_mode === 'both'

    if (
      providesPassengerTrips &&
      driver?.driver_type === 'commercial'
    ) {
      if (!driver.park_id) {
        return NextResponse.json(
          {
            error:
              'Commercial passenger driver must be linked to a registered garage before approval.',
          },
          { status: 409 }
        )
      }

      const { data: park } = await db
        .from('registered_parks')
        .select('verification_status')
        .eq('id', driver.park_id)
        .single()

      if (park?.verification_status !== 'verified') {
        return NextResponse.json(
          {
            error:
              'Verify the driver\'s Mobile Garage before approving this commercial passenger driver.',
          },
          { status: 409 }
        )
      }
    }
  }

  const update: Record<string, any> = {
    verification_status: status,
    updated_at: new Date().toISOString(),
  }

  // A suspended/rejected general account cannot remain available.
  if (status === 'rejected' || status === 'suspended') {
    update.passenger_trip_available = false
    update.driver_hire_available = false
    update.is_available = false
  }

  const { data, error } = await db
    .from('driver_applications')
    .update(update)
    .eq('id', id)
    .select(
      'id,verification_status,work_mode,driver_hire_status,driver_hire_approved'
    )
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
