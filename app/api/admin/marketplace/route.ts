import { NextResponse } from 'next/server'
import { isAdminSession } from '../../../../lib/server/adminSession'
import { getSupabaseAdmin } from '../../../../lib/server/supabaseAdmin'

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getSupabaseAdmin()

  const [
    rides,
    drivers,
    payments,
    garages,
    earnings,
    messages,
    withdrawals,
    reviews,
    events,
  ] = await Promise.all([
    db
      .from('ride_requests')
      .select(
        'id,booking_ref,rider_name,rider_phone,rider_verified,pickup_address,pickup_state,dropoff_address,dropoff_state,pickup_date,pickup_time,passenger_count,vehicle_preference,status,agreed_fare,accepted_offer_id,ride_type,commercial_mode,requested_park_id,created_at'
      )
      .order('created_at', { ascending: false })
      .limit(100),

    db
      .from('driver_applications')
      .select(
  'id,full_name,phone,email,driver_type,park_id,park_name,home_state,home_city,vehicle_make,vehicle_model,vehicle_year,vehicle_plate,accept_unverified_riders,verification_status,commission_rate,is_available,account_status,activated_at,email_verified_at,login_pin_set_at,wallet_pin_set_at,work_mode,passenger_trip_available,driver_hire_available,driver_hire_approved,driver_hire_status,driving_experience_years,drives_automatic,drives_manual,driver_hire_job_types,created_at'
)
      .order('created_at', { ascending: false })
      .limit(100),

    db
      .from('marketplace_payments')
      .select(
        'id,ride_request_id,gross_amount,platform_fee,driver_net,status,paid_at,created_at'
      )
      .order('created_at', { ascending: false })
      .limit(100),

    db
      .from('registered_parks')
      .select(
        'id,name,state,city,address,verification_status,created_at'
      )
      .order('created_at', { ascending: false })
      .limit(100),

    db
      .from('driver_earnings')
      .select(
        'id,driver_application_id,ride_request_id,gross_amount,commission_amount,net_amount,status,created_at,available_at'
      )
      .order('created_at', { ascending: false })
      .limit(100),

    db
      .from('ride_messages')
      .select(
        'id,ride_request_id,sender_role,body,created_at,driver_application_id,target_driver_application_id'
      )
      .order('created_at', { ascending: false })
      .limit(200),

    db
      .from('driver_withdrawals')
      .select(
        'id,driver_application_id,amount,bank_name,bank_code,account_name,account_number_masked,account_number,status,created_at,processed_at,rejection_reason,account_verified_at,verification_provider,payout_reference,provider_reference,admin_note,payout_mode,transfer_initiated_at,transfer_code,transfer_verified_at'
      )
      .order('created_at', { ascending: false })
      .limit(100),

    db
      .from('ride_reviews')
      .select(
        'id,ride_request_id,driver_application_id,rating,comment,review_status,created_at'
      )
      .order('created_at', { ascending: false })
      .limit(100),

    db
      .from('trip_events')
      .select(
        'id,ride_request_id,event_type,actor_id,metadata,created_at'
      )
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  const queries = [
    rides,
    drivers,
    payments,
    garages,
    earnings,
    messages,
    withdrawals,
    reviews,
    events,
  ]

  const failed = queries.find((query) => query.error)

  if (failed?.error) {
    return NextResponse.json(
      { error: failed.error.message },
      { status: 500 }
    )
  }

  /*
   * Connect accepted offers to their drivers.
   *
   * ride.accepted_offer_id
   *        â†“
   * ride_offers.id
   *        â†“
   * driver_application_id
   *        â†“
   * driver_applications
   */
  const acceptedOfferIds = (rides.data || [])
    .map((ride) => ride.accepted_offer_id)
    .filter(Boolean) as string[]

  let acceptedOffers: any[] = []

  if (acceptedOfferIds.length) {
    const { data, error } = await db
      .from('ride_offers')
      .select('id,driver_application_id,amount,status')
      .in('id', acceptedOfferIds)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    acceptedOffers = data || []
  }

  const offerMap = new Map(
    acceptedOffers.map((offer) => [offer.id, offer])
  )

  const driverMap = new Map(
    (drivers.data || []).map((driver) => [driver.id, driver])
  )

  const enrichedRides = (rides.data || []).map((ride) => {
    const acceptedOffer = ride.accepted_offer_id
      ? offerMap.get(ride.accepted_offer_id)
      : null

    const acceptedDriver = acceptedOffer?.driver_application_id
      ? driverMap.get(acceptedOffer.driver_application_id) || null
      : null

    return {
      ...ride,

      accepted_driver: acceptedDriver
        ? {
            id: acceptedDriver.id,
            full_name: acceptedDriver.full_name,
            phone: acceptedDriver.phone,
            email: acceptedDriver.email,
            vehicle_make: acceptedDriver.vehicle_make,
            vehicle_model: acceptedDriver.vehicle_model,
            vehicle_year: acceptedDriver.vehicle_year,
            vehicle_plate: acceptedDriver.vehicle_plate,
            park_name: acceptedDriver.park_name,
            verification_status: acceptedDriver.verification_status,
          }
        : null,
    }
  })

  return NextResponse.json({
    rides: enrichedRides,
    drivers: drivers.data || [],
    payments: payments.data || [],
    garages: garages.data || [],
    earnings: earnings.data || [],
    messages: messages.data || [],
    withdrawals: withdrawals.data || [],
    reviews: reviews.data || [],
    events: events.data || [],
  })
}
