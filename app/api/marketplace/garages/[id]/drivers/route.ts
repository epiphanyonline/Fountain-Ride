import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../../lib/server/supabaseAdmin'
import { getDriverReputation } from '../../../../../../lib/server/driverReputation'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = getSupabaseAdmin()

  const [
    { data: park, error: parkError },
    { data: drivers, error: driversError },
  ] = await Promise.all([
    db
      .from('registered_parks')
      .select(
        'id,name,state,city,address,latitude,longitude,verification_status'
      )
      .eq('id', id)
      .maybeSingle(),

    db
      .from('driver_applications')
      .select(
        'id,full_name,vehicle_make,vehicle_model,vehicle_year,vehicle_plate,home_city,home_state,is_available,park_id,created_at'
      )
      .eq('park_id', id)
      .eq('driver_type', 'commercial')
      .eq('verification_status', 'approved')
      .order('is_available', { ascending: false })
      .order('created_at', { ascending: true }),
  ])

  if (
    parkError ||
    !park ||
    park.verification_status !== 'verified'
  ) {
    return NextResponse.json(
      { error: 'Garage not found' },
      { status: 404 }
    )
  }

  if (driversError) {
    return NextResponse.json(
      { error: driversError.message },
      { status: 500 }
    )
  }

  const driverList = drivers || []
  const driverIds = driverList.map((driver) => driver.id)

  const reputationMap =
    driverIds.length > 0
      ? await getDriverReputation(db, driverIds)
      : {}

  const enrichedDrivers = driverList.map((driver) => ({
    ...driver,
    reputation: reputationMap[driver.id] || {
      average_rating: 0,
      review_count: 0,
      completed_trips: 0,
    },
  }))

  return NextResponse.json({
    garage: park,
    drivers: enrichedDrivers,
  })
}
