import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../lib/server/supabaseAdmin'
import {
  getDriverForToken,
  driverToken,
  driverApplicationId,
} from '../../../../../lib/server/marketplaceAuth'

export async function GET(req: Request) {
  const driver = await getDriverForToken(
    driverApplicationId(req),
    driverToken(req)
  )

  if (!driver) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getSupabaseAdmin()

  const { data: offers, error: offerError } = await db
    .from('ride_offers')
    .select('id,ride_request_id,amount,status,created_at')
    .eq('driver_application_id', driver.id)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })
    .limit(150)

  if (offerError) {
    return NextResponse.json({ error: offerError.message }, { status: 500 })
  }

  const rideIds = Array.from(
    new Set((offers || []).map((o: any) => o.ride_request_id).filter(Boolean))
  )

  let passengerTrips: any[] = []

  if (rideIds.length) {
    const { data: rides, error } = await db
      .from('ride_requests')
      .select(
        'id,booking_ref,pickup_address,dropoff_address,pickup_date,pickup_time,status,agreed_fare,ride_type,commercial_mode,passenger_count,vehicle_preference,driver_presence_status,driver_eta_minutes,driver_completed_at,rider_confirmed_at,created_at'
      )
      .in('id', rideIds)
      .order('pickup_date', { ascending: false })
      .order('pickup_time', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const offerMap = new Map(
      (offers || []).map((o: any) => [o.ride_request_id, o])
    )

    passengerTrips = (rides || []).map((r: any) => ({
      ...r,
      booking_type: 'passenger_trip',
      offer: offerMap.get(r.id) || null,
    }))
  }

  const { data: hireJobs, error: hireError } = await db
    .from('driver_hire_requests')
    .select(
      'id,booking_ref,pickup_address,destination_address,start_date,start_time,status,agreed_fare,job_type,created_at'
    )
    .eq('selected_driver_application_id', driver.id)
    .in('status', [
      'awaiting_payment',
      'confirmed',
      'driver_en_route',
      'driver_arrived',
      'in_progress',
      'awaiting_customer_confirmation',
      'completed',
    ])
    .order('created_at', { ascending: false })
    .limit(150)

  if (hireError) {
    return NextResponse.json({ error: hireError.message }, { status: 500 })
  }

  const driverHireTrips = (hireJobs || []).map((job: any) => ({
    ...job,
    booking_type: 'driver_hire',
    dropoff_address: job.destination_address,
    pickup_date: job.start_date,
    pickup_time: job.start_time,
  }))

  return NextResponse.json({
    trips: [...driverHireTrips, ...passengerTrips],
  })
}
