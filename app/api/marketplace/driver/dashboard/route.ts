import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../lib/server/supabaseAdmin'
import {
  getDriverForToken,
  driverToken,
  driverApplicationId,
} from '../../../../../lib/server/marketplaceAuth'
import {
  driverCanSeeRide,
  kmBetween,
} from '../../../../../lib/server/rideEligibility'
import { getDriverReputation } from '../../../../../lib/server/driverReputation'

export async function GET(req: Request) {
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

  const db = getSupabaseAdmin()

  const safeDriver = { ...driver }

  delete safeDriver.driver_access_hash
  delete safeDriver.wallet_pin_hash
  delete safeDriver.login_pin_hash
  delete safeDriver.activation_hash
  delete safeDriver.failed_login_attempts
  delete safeDriver.login_locked_until

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

  /*
   * Pending drivers can access the dashboard,
   * but they receive no work opportunities.
   */
  if (driver.verification_status !== 'approved') {
    return NextResponse.json({
      driver: safeDriver,
      requests: [],
      driverHireRequests: [],
      earnings: [],
      offers: [],
      withdrawals: [],
      wallet: {
        withdrawable: 0,
        withdrawalPending: 0,
      },
      reputation: {
        average_rating: 0,
        review_count: 0,
        completed_trips: 0,
      },
      walletPinSet: !!driver.wallet_pin_hash,
      capabilities: {
        workMode,
        passengerTrips: supportsPassengerTrips,
        driverHire: supportsDriverHire,
        passengerTripAvailable:
          supportsPassengerTrips &&
          driver.passenger_trip_available !== false,
        driverHireAvailable:
          supportsDriverHire &&
          driver.driver_hire_available === true,
        driverHireApproved:
          supportsDriverHire &&
          driver.driver_hire_approved === true,
      },
    })
  }

  const today = new Date()
    .toISOString()
    .slice(0, 10)

  /*
   * Only passenger-trip capable drivers should query
   * ordinary ride requests.
   *
   * Driver Hire-only drivers must never receive these.
   */
  const rideRequestsPromise =
    supportsPassengerTrips &&
    driver.passenger_trip_available !== false
      ? db
          .from('ride_requests')
          .select(
            'id,booking_ref,rider_verified,pickup_address,pickup_state,pickup_lat,pickup_lng,dropoff_address,dropoff_state,pickup_date,pickup_time,passenger_count,vehicle_preference,status,ride_type,commercial_mode,requested_park_id,requested_driver_application_id,created_at'
          )
          .in('status', [
            'requested',
            'negotiating',
          ])
          .eq('ride_type', driver.driver_type)
          .gte('pickup_date', today)
          .order('created_at', {
            ascending: false,
          })
          .limit(150)
      : Promise.resolve({ data: [] } as any)

  const invitesPromise =
    supportsPassengerTrips &&
    driver.passenger_trip_available !== false
      ? db
          .from('ride_driver_invites')
          .select('ride_request_id,status')
          .eq(
            'driver_application_id',
            driver.id
          )
          .in('status', [
            'invited',
            'viewed',
            'offered',
          ])
      : Promise.resolve({ data: [] } as any)

  const [
    { data: rawRequests },
    { data: earnings },
    { data: offers },
    { data: invites },
    { data: park },
    { data: withdrawals },
  ] = await Promise.all([
    rideRequestsPromise,

    db
      .from('driver_earnings')
      .select('*')
      .eq(
        'driver_application_id',
        driver.id
      )
      .order('created_at', {
        ascending: false,
      })
      .limit(100),

    db
      .from('ride_offers')
      .select(
        'id,ride_request_id,amount,counter_amount,status,created_at'
      )
      .eq(
        'driver_application_id',
        driver.id
      )
      .order('created_at', {
        ascending: false,
      })
      .limit(100),

    invitesPromise,

    driver.park_id
      ? db
          .from('registered_parks')
          .select('id,state,city,name')
          .eq('id', driver.park_id)
          .maybeSingle()
      : Promise.resolve({
          data: null,
        } as any),

    db
      .from('driver_withdrawals')
      .select(
        'id,amount,bank_name,account_name,account_number_masked,status,created_at,processed_at,rejection_reason,payout_reference,account_verified_at'
      )
      .eq(
        'driver_application_id',
        driver.id
      )
      .order('created_at', {
        ascending: false,
      })
      .limit(50),
  ])

  const { data: hireEarnings, error: hireEarningsError } = await db
    .from('driver_hire_earnings')
    .select(`
      id,
      driver_hire_request_id,
      gross_amount,
      commission_amount,
      net_amount,
      status,
      available_at,
      created_at,
      driver_hire_requests (
        booking_ref
      )
    `)
    .eq('driver_application_id', driver.id)
    .order('created_at', { ascending: false })

  if (hireEarningsError) {
    console.error('Driver Hire earnings lookup error:', hireEarningsError)
    return NextResponse.json(
      { error: 'Unable to load driver earnings.' },
      { status: 500 }
    )
  }

  const combinedEarnings = [
    ...(earnings || []),
    ...(hireEarnings || []).map((e: any) => ({
      ...e,
      entry_type: 'driver_hire',
      booking_ref: e.driver_hire_requests?.booking_ref || null,
    })),
  ].sort(
    (a: any, b: any) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  )

  const inviteSet = new Set(
    (invites || []).map(
      (x: any) => x.ride_request_id
    )
  )

  const radius = Number(
    process.env.QUICK_MATCH_RADIUS_KM ||
      120
  )

  let requests = supportsPassengerTrips
    ? (rawRequests || []).filter((r: any) =>
        driverCanSeeRide(driver, r, {
          invited: inviteSet.has(r.id),
          parkState: park?.state || null,
          quickMatchRadiusKm:
            Number.isFinite(radius)
              ? radius
              : 120,
        })
      )
    : []

  requests = requests
    .map((r: any) => {
      const hasCoords =
        driver.current_lat != null &&
        driver.current_lng != null &&
        r.pickup_lat != null &&
        r.pickup_lng != null

      const distance_km = hasCoords
        ? Number(
            kmBetween(
              Number(driver.current_lat),
              Number(driver.current_lng),
              Number(r.pickup_lat),
              Number(r.pickup_lng)
            ).toFixed(1)
          )
        : null

      const sameMarket = Boolean(
        r.pickup_state &&
          (r.pickup_state ===
            driver.home_state ||
            r.pickup_state ===
              park?.state)
      )

      return {
        ...r,
        distance_km,
        same_market: sameMarket,
      }
    })
    .sort((a: any, b: any) => {
      if (
        a.distance_km != null ||
        b.distance_km != null
      ) {
        return (
          (a.distance_km ?? 99999) -
          (b.distance_km ?? 99999)
        )
      }

      if (
        a.same_market !== b.same_market
      ) {
        return a.same_market ? -1 : 1
      }

      return (
        new Date(
          b.created_at
        ).getTime() -
        new Date(
          a.created_at
        ).getTime()
      )
    })

  const availableEarned = (
    combinedEarnings
  )
    .filter(
      (e: any) =>
        e.status === 'available' &&
        e.entry_type !== 'withdrawal'
    )
    .reduce(
      (sum: number, e: any) =>
        sum + Number(e.net_amount || 0),
      0
    )

  const reservedOrPaid = (
    withdrawals || []
  )
    .filter((w: any) =>
      [
        'requested',
        'processing',
        'paid',
      ].includes(w.status)
    )
    .reduce(
      (sum: number, w: any) =>
        sum + Number(w.amount || 0),
      0
    )

  const reputation = (
    await getDriverReputation(db, [
      driver.id,
    ])
  )[driver.id]

  return NextResponse.json({
    driver: safeDriver,

    requests,

    /*
     * Driver Hire jobs will be connected here
     * when we build the customer Hire a Driver
     * request table.
     */
    driverHireRequests: [],

    earnings: combinedEarnings,
    offers: offers || [],
    withdrawals: withdrawals || [],

    wallet: {
      withdrawable: Math.max(
        0,
        availableEarned -
          reservedOrPaid
      ),

      withdrawalPending: (
        withdrawals || []
      )
        .filter((w: any) =>
          [
            'requested',
            'processing',
          ].includes(w.status)
        )
        .reduce(
          (sum: number, w: any) =>
            sum +
            Number(w.amount || 0),
          0
        ),
    },

    reputation,

    walletPinSet:
      !!driver.wallet_pin_hash,

    capabilities: {
      workMode,

      passengerTrips:
        supportsPassengerTrips,

      driverHire:
        supportsDriverHire,

      passengerTripAvailable:
        supportsPassengerTrips &&
        driver.passenger_trip_available !==
          false,

      driverHireAvailable:
        supportsDriverHire &&
        driver.driver_hire_available ===
          true,

      driverHireApproved:
        supportsDriverHire &&
        driver.driver_hire_approved ===
          true,
    },

    matching: supportsPassengerTrips
      ? {
          mode:
            driver.current_lat != null &&
            driver.current_lng != null
              ? 'distance'
              : 'market-fallback',

          radiusKm: Number.isFinite(
            radius
          )
            ? radius
            : 120,
        }
      : null,
  })
}
