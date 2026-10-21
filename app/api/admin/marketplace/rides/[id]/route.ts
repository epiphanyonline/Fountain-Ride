import { NextResponse } from 'next/server'
import { isAdminSession } from '../../../../../../lib/server/adminSession'
import { getSupabaseAdmin } from '../../../../../../lib/server/supabaseAdmin'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const db = getSupabaseAdmin()

  // Main ride record
  const { data: ride, error: rideError } = await db
    .from('ride_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (rideError || !ride) {
    return NextResponse.json(
      { error: rideError?.message || 'Ride not found' },
      { status: 404 }
    )
  }

  // Never expose the stored access hash to the admin browser.
  const safeRide = { ...ride }
  delete safeRide.rider_access_hash

  // Do not routinely expose the actual Trip Start PIN.
  const tripPinGenerated = Boolean(safeRide.trip_start_pin)
  delete safeRide.trip_start_pin

  const [
    offersResult,
    messagesResult,
    eventsResult,
    paymentsResult,
    earningsResult,
    reviewsResult,
    disputesResult,
    locationsResult,
  ] = await Promise.all([
    db
      .from('ride_offers')
      .select(
        'id,ride_request_id,driver_application_id,amount,counter_amount,status,last_actor,created_at,updated_at'
      )
      .eq('ride_request_id', id)
      .order('created_at', { ascending: true }),

    db
      .from('ride_messages')
      .select(
        'id,ride_request_id,sender_role,body,created_at,driver_application_id,target_driver_application_id'
      )
      .eq('ride_request_id', id)
      .order('created_at', { ascending: true }),

    db
      .from('trip_events')
      .select(
        'id,ride_request_id,event_type,actor_id,metadata,created_at'
      )
      .eq('ride_request_id', id)
      .order('created_at', { ascending: true }),

    db
      .from('marketplace_payments')
      .select('*')
      .eq('ride_request_id', id)
      .order('created_at', { ascending: false }),

    db
      .from('driver_earnings')
      .select('*')
      .eq('ride_request_id', id)
      .order('created_at', { ascending: false }),

    db
      .from('ride_reviews')
      .select('*')
      .eq('ride_request_id', id)
      .order('created_at', { ascending: false }),

    db
      .from('ride_disputes')
      .select('*')
      .eq('ride_request_id', id)
      .order('created_at', { ascending: false }),

    db
      .from('trip_locations')
      .select(
        'actor_role,driver_application_id,latitude,longitude,accuracy_meters,created_at'
      )
      .eq('ride_request_id', id)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const results = [
    offersResult,
    messagesResult,
    eventsResult,
    paymentsResult,
    earningsResult,
    reviewsResult,
    disputesResult,
    locationsResult,
  ]

  const failed = results.find((result) => result.error)

  if (failed?.error) {
    return NextResponse.json(
      { error: failed.error.message },
      { status: 500 }
    )
  }

  const offers = offersResult.data || []

  // Determine accepted driver through:
  // ride.accepted_offer_id -> ride_offers -> driver_application_id
  const acceptedOffer =
    offers.find((offer) => offer.id === ride.accepted_offer_id) || null

  let driver = null

  if (acceptedOffer?.driver_application_id) {
    const { data, error } = await db
      .from('driver_applications')
      .select(
        'id,full_name,phone,email,driver_type,park_id,park_name,home_state,home_city,vehicle_make,vehicle_model,vehicle_year,vehicle_plate,accept_unverified_riders,verification_status,commission_rate,is_available,account_status,activated_at,created_at'
      )
      .eq('id', acceptedOffer.driver_application_id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    driver = data
  }

  // Load profiles for every driver who participated in negotiation.
  const driverIds = Array.from(
    new Set(
      offers
        .map((offer) => offer.driver_application_id)
        .filter(Boolean)
    )
  ) as string[]

  let offerDrivers: any[] = []

  if (driverIds.length) {
    const { data, error } = await db
      .from('driver_applications')
      .select(
        'id,full_name,phone,driver_type,park_name,vehicle_make,vehicle_model,vehicle_year,vehicle_plate,verification_status'
      )
      .in('id', driverIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    offerDrivers = data || []
  }

  const driverMap = new Map(
    offerDrivers.map((item) => [item.id, item])
  )

  const enrichedOffers = offers.map((offer) => ({
    ...offer,
    driver: driverMap.get(offer.driver_application_id) || null,
  }))

  // Garage / Mobile Garage information
  let garage = null

  if (ride.requested_park_id) {
    const { data, error } = await db
      .from('registered_parks')
      .select(
        'id,name,state,city,address,verification_status,created_at'
      )
      .eq('id', ride.requested_park_id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    garage = data
  }

  return NextResponse.json({
    ride: safeRide,

    rider: {
      name: ride.rider_name || null,
      phone: ride.rider_phone || null,
      email: ride.rider_email || null,
      verified: Boolean(ride.rider_verified),
    },

    driver,

    acceptedOffer,

    offers: enrichedOffers,

    messages: messagesResult.data || [],

    events: eventsResult.data || [],

    payments: paymentsResult.data || [],

    earnings: earningsResult.data || [],

    reviews: reviewsResult.data || [],

    disputes: disputesResult.data || [],

    locations: locationsResult.data || [],

    garage,

    paymentProtection: {
      tripPinGenerated,
      tripStarted: (eventsResult.data || []).some(
        (event) =>
          event.event_type === 'in_progress' ||
          event.event_type === 'trip_started'
      ),
      disputed:
        ride.status === 'disputed' ||
        (disputesResult.data || []).some(
          (dispute) => dispute.status === 'open'
        ),
    },
  })
}
