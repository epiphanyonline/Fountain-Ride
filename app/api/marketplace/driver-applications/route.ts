import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../lib/server/supabaseAdmin'
import {
  createActivationToken,
  hashActivationToken,
  normalizeDriverPhone,
} from '../../../../lib/server/driverSecurity'
import { NIGERIA_STATES } from '../../../../lib/marketplace'

const states = new Set(NIGERIA_STATES)

type WorkMode = 'passenger_trips' | 'driver_hire' | 'both'

export async function POST(req: Request) {
  const b = await req.json().catch(() => null)

  if (!b) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }

  const workMode: WorkMode =
    b.work_mode === 'driver_hire'
      ? 'driver_hire'
      : b.work_mode === 'both'
        ? 'both'
        : 'passenger_trips'

  const wantsPassengerTrips =
    workMode === 'passenger_trips' || workMode === 'both'

  const wantsDriverHire =
    workMode === 'driver_hire' || workMode === 'both'

  const type =
    wantsPassengerTrips && b.driver_type === 'commercial'
      ? 'commercial'
      : 'private'

  const fullName = String(b.full_name || '').trim()
  const phone = String(b.phone || '').trim()
  const homeState = String(b.home_state || '').trim()
  const homeCity = String(b.home_city || '').trim() || null

  if (!fullName || !phone || !homeState) {
    return NextResponse.json(
      { error: 'Please complete all required fields.' },
      { status: 400 }
    )
  }

  if (!states.has(homeState)) {
    return NextResponse.json(
      { error: 'Invalid home state.' },
      { status: 400 }
    )
  }

  const phoneKey = normalizeDriverPhone(phone)

  if (phoneKey.length < 10) {
    return NextResponse.json(
      { error: 'Enter a valid mobile number.' },
      { status: 400 }
    )
  }

  const email =
    String(b.email || '').trim().toLowerCase() || null

  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json(
      { error: 'Enter a valid email or leave it blank.' },
      { status: 400 }
    )
  }

  /*
   * Vehicle information is required only when the driver
   * wants to receive passenger-trip opportunities.
   */
  const vehicleMake = wantsPassengerTrips
    ? String(b.vehicle_make || '').trim()
    : null

  const vehicleModel = wantsPassengerTrips
    ? String(b.vehicle_model || '').trim()
    : null

  const vehiclePlate = wantsPassengerTrips
    ? String(b.vehicle_plate || '').trim().toUpperCase()
    : null

  const vehicleYear =
    wantsPassengerTrips && Number(b.vehicle_year)
      ? Number(b.vehicle_year)
      : null

  if (
    wantsPassengerTrips &&
    (!vehicleMake || !vehicleModel || !vehiclePlate)
  ) {
    return NextResponse.json(
      {
        error:
          'Vehicle make, model and registration number are required for passenger trips.',
      },
      { status: 400 }
    )
  }

  /*
   * Driver Hire information
   */
  let drivingExperienceYears: number | null = null

  if (wantsDriverHire) {
    const experience = Number(b.driving_experience_years)

    if (
      !Number.isFinite(experience) ||
      experience < 0 ||
      experience > 70
    ) {
      return NextResponse.json(
        {
          error:
            'Enter your years of driving experience.',
        },
        { status: 400 }
      )
    }

    drivingExperienceYears = experience
  }

  const drivesAutomatic =
    wantsDriverHire ? b.drives_automatic !== false : true

  const drivesManual =
    wantsDriverHire ? !!b.drives_manual : false

  if (
    wantsDriverHire &&
    !drivesAutomatic &&
    !drivesManual
  ) {
    return NextResponse.json(
      {
        error:
          'Select at least one transmission type you can drive.',
      },
      { status: 400 }
    )
  }

  const allowedHireJobs = new Set([
    'hourly',
    'full_day',
    'event',
    'temporary_contract',
    'work_commute',
    'intercity',
  ])

  const driverHireJobTypes = wantsDriverHire
    ? Array.from(
        new Set(
          (Array.isArray(b.driver_hire_job_types)
            ? b.driver_hire_job_types
            : []
          )
            .map((value: unknown) => String(value))
            .filter((value: string) =>
              allowedHireJobs.has(value)
            )
        )
      )
    : []

  const db = getSupabaseAdmin()

  /*
   * Duplicate detection.
   *
   * Driver Hire-only applicants have no vehicle plate,
   * so plate matching is added only when a plate exists.
   */
  const filters = [`phone_login_key.eq.${phoneKey}`]

  if (vehiclePlate) {
    filters.push(`vehicle_plate.eq.${vehiclePlate}`)
  }

  if (email) {
    filters.push(`email.eq.${email}`)
  }

  const { data: dupes, error: duplicateError } = await db
    .from('driver_applications')
    .select('id')
    .or(filters.join(','))
    .limit(1)

  if (duplicateError) {
    return NextResponse.json(
      { error: duplicateError.message },
      { status: 500 }
    )
  }

  if ((dupes || []).length) {
    return NextResponse.json(
      {
        error:
          'A driver profile with this mobile number, email or vehicle plate already exists.',
      },
      { status: 409 }
    )
  }

  /*
   * Motor park / Mobile Garage applies only to
   * passenger-trip commercial drivers.
   */
  let parkId: string | null = null
  let parkName: string | null = null

  if (wantsPassengerTrips && type === 'commercial') {
    parkId = String(b.park_id || '').trim() || null
    parkName = String(b.park_name || '').trim() || null

    if (parkId) {
      const { data: park } = await db
        .from('registered_parks')
        .select('id,name')
        .eq('id', parkId)
        .eq('verification_status', 'verified')
        .maybeSingle()

      if (!park) {
        return NextResponse.json(
          { error: 'Selected garage is not available.' },
          { status: 409 }
        )
      }

      parkName = park.name
    } else if (parkName) {
      const { data: park, error } = await db
        .from('registered_parks')
        .insert({
          name: parkName,
          state: homeState,
          city: homeCity,
          verification_status: 'pending',
        })
        .select('id')
        .single()

      if (!error && park) {
        parkId = park.id
      }
    } else {
      return NextResponse.json(
        {
          error:
            'Commercial drivers must select or request a motor park.',
        },
        { status: 400 }
      )
    }
  }

  const token = createActivationToken()
  const expires = new Date(
    Date.now() + 30 * 60 * 1000
  ).toISOString()

  const { data, error } = await db
    .from('driver_applications')
    .insert({
      full_name: fullName,
      phone,
      phone_login_key: phoneKey,
      email,

      /*
       * Existing passenger-trip classification.
       * Driver Hire-only users are stored as private internally
       * because driver_type remains NOT NULL in the existing schema.
       */
      driver_type: type,

      work_mode: workMode,

      park_id: parkId,
      park_name: parkName,

      home_state: homeState,
      home_city: homeCity,

      vehicle_make: vehicleMake,
      vehicle_model: vehicleModel,
      vehicle_year: vehicleYear,
      vehicle_plate: vehiclePlate,

      accept_unverified_riders:
        wantsPassengerTrips &&
        !!b.accept_unverified_riders,

      /*
       * Passenger availability and Driver Hire availability
       * are deliberately independent.
       */
      passenger_trip_available:
        wantsPassengerTrips,

      driver_hire_available:
        wantsDriverHire,

      /*
       * Driver Hire receives its own approval.
       * Registration does not automatically approve someone
       * to drive customers' vehicles.
       */
      driver_hire_approved: false,

      driving_experience_years:
        drivingExperienceYears,

      drives_automatic: drivesAutomatic,
      drives_manual: drivesManual,

      driver_hire_job_types:
        driverHireJobTypes,

      verification_status: 'pending',
      account_status: 'pre_registered',

      activation_hash: hashActivationToken(token),
      activation_expires_at: expires,

      /*
       * Preserve compatibility with the existing marketplace.
       * Driver Hire-only applicants must not appear as available
       * passenger-trip drivers.
       */
      is_available: wantsPassengerTrips,
    })
    .select('id,verification_status')
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
      driver_application_id: data.id,
      event_type: 'self_registration_started',
      actor_type: 'driver',
      metadata: {
        setup_token_expires_at: expires,
        phone_verified: false,
        work_mode: workMode,
        passenger_trips: wantsPassengerTrips,
        driver_hire: wantsDriverHire,
      },
    })

  const origin = new URL(req.url).origin

  return NextResponse.json(
    {
      applicationId: data.id,
      status: data.verification_status,
      activationUrl:
        `${origin}/driver/claim?driver=${data.id}` +
        `&token=${encodeURIComponent(token)}`,
    },
    { status: 201 }
  )
}
