import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getSupabaseAdmin } from '../../../../lib/server/supabaseAdmin'

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function nullableText(value: unknown) {
  const valueText = text(value)
  return valueText || null
}

function makeBookingRef() {
  const now = new Date()

  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')

  const suffix = crypto
    .randomBytes(3)
    .toString('hex')
    .toUpperCase()

  return `VH-${yy}${mm}${dd}-${suffix}`
}

function makeCustomerAccessToken() {
  return (
    crypto.randomUUID().replace(/-/g, '') +
    crypto.randomUUID().replace(/-/g, '')
  )
}

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin()

  try {
    const body = await req.json()

    const carId = text(body.carId)

    const customerName = text(body.customerName)
    const customerPhone = text(body.customerPhone)
    const customerEmail = nullableText(body.customerEmail)

    const pickupAddress = text(body.pickupAddress)
    const destinationAddress = text(body.destinationAddress)

    const pickupState = nullableText(body.pickupState)
    const pickupCity = nullableText(body.pickupCity)

    const destinationState = nullableText(body.destinationState)
    const destinationCity = nullableText(body.destinationCity)

    const startDate = text(body.startDate)
    const startTime = nullableText(body.startTime)

    const endDate = nullableText(body.endDate)
    const endTime = nullableText(body.endTime)

    const tripType = nullableText(body.tripType)

    const passengerCount =
      body.passengerCount === '' ||
      body.passengerCount === null ||
      body.passengerCount === undefined
        ? null
        : Number(body.passengerCount)

    const specialRequirements =
      nullableText(body.specialRequirements)

    if (!carId) {
      return NextResponse.json(
        { error: 'Vehicle is required.' },
        { status: 400 }
      )
    }

    if (!customerName) {
      return NextResponse.json(
        { error: 'Your name is required.' },
        { status: 400 }
      )
    }

    if (!customerPhone) {
      return NextResponse.json(
        { error: 'Your mobile number is required.' },
        { status: 400 }
      )
    }

    if (!pickupAddress) {
      return NextResponse.json(
        { error: 'Pickup location is required.' },
        { status: 400 }
      )
    }

    if (!destinationAddress) {
      return NextResponse.json(
        { error: 'Destination is required.' },
        { status: 400 }
      )
    }

    if (!startDate) {
      return NextResponse.json(
        { error: 'Start date is required.' },
        { status: 400 }
      )
    }

    if (
      passengerCount !== null &&
      (
        !Number.isInteger(passengerCount) ||
        passengerCount < 1
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Passenger count must be a whole number greater than zero.',
        },
        { status: 400 }
      )
    }

    /*
     * Load the selected vehicle server-side.
     *
     * We deliberately do NOT trust the browser to tell us
     * the vehicle name, availability or guide rate.
     */
    const { data: car, error: carError } = await supabase
      .from('cars')
      .select(
        `
          id,
          name,
          daily_rate,
          status,
          transmission,
          fuel_type,
          seats
        `
      )
      .eq('id', carId)
      .maybeSingle()

    if (carError) {
      console.error('Vehicle lookup failed:', carError)

      return NextResponse.json(
        { error: 'Unable to check this vehicle.' },
        { status: 500 }
      )
    }

    if (!car) {
      return NextResponse.json(
        { error: 'Vehicle not found.' },
        { status: 404 }
      )
    }

    if (car.status !== 'available') {
      return NextResponse.json(
        {
          error:
            'This vehicle is not currently available for new requests.',
        },
        { status: 409 }
      )
    }

    if (
      passengerCount !== null &&
      car.seats &&
      passengerCount > Number(car.seats)
    ) {
      return NextResponse.json(
        {
          error: `This vehicle is listed for up to ${car.seats} passengers.`,
        },
        { status: 400 }
      )
    }

    const bookingRef = makeBookingRef()
    const accessToken = makeCustomerAccessToken()

    const { data: hireRequest, error: requestError } =
      await supabase
        .from('vehicle_hire_requests')
        .insert({
          booking_ref: bookingRef,

          car_id: car.id,

          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,

          pickup_address: pickupAddress,
          destination_address: destinationAddress,

          pickup_state: pickupState,
          pickup_city: pickupCity,

          destination_state: destinationState,
          destination_city: destinationCity,

          start_date: startDate,
          start_time: startTime,

          end_date: endDate,
          end_time: endTime,

          trip_type: tripType,

          passenger_count: passengerCount,

          special_requirements: specialRequirements,

          guide_daily_rate:
            car.daily_rate === null ||
            car.daily_rate === undefined
              ? null
              : Number(car.daily_rate),

          currency: 'NGN',

          status: 'requested',

          updated_at: new Date().toISOString(),
        })
        .select(
          `
            id,
            booking_ref,
            car_id,
            status,
            created_at
          `
        )
        .single()

    if (requestError || !hireRequest) {
      console.error(
        'Vehicle hire request creation failed:',
        requestError
      )

      return NextResponse.json(
        {
          error:
            'Unable to create your vehicle hire request.',
        },
        { status: 500 }
      )
    }

    /*
     * Create private customer access.
     *
     * If this fails we remove the request so we do not leave
     * a request that the customer cannot securely reopen.
     */
    const { error: accessError } = await supabase
      .from('vehicle_hire_customer_access')
      .insert({
        vehicle_hire_request_id: hireRequest.id,
        access_token: accessToken,
      })

    if (accessError) {
      console.error(
        'Vehicle hire customer access creation failed:',
        accessError
      )

      await supabase
        .from('vehicle_hire_requests')
        .delete()
        .eq('id', hireRequest.id)

      return NextResponse.json(
        {
          error:
            'Unable to create secure access for this request.',
        },
        { status: 500 }
      )
    }

    /*
     * Audit event.
     *
     * Do not put the access token or private contact details
     * into the event metadata.
     */
    const { error: eventError } = await supabase
      .from('vehicle_hire_events')
      .insert({
        vehicle_hire_request_id: hireRequest.id,
        event_type: 'request_created',
        actor_role: 'customer',

        metadata: {
          car_id: car.id,
          car_name: car.name,
          guide_daily_rate:
            car.daily_rate === null ||
            car.daily_rate === undefined
              ? null
              : Number(car.daily_rate),

          vehicle_and_driver_included: true,
        },
      })

    if (eventError) {
      console.error(
        'Vehicle hire event creation failed:',
        eventError
      )
    }

    return NextResponse.json({
      ok: true,

      id: hireRequest.id,

      bookingRef: hireRequest.booking_ref,

      status: hireRequest.status,

      accessToken,

      vehicle: {
        id: car.id,
        name: car.name,
      },

      message:
        'Vehicle hire quotation request created.',
    })
  } catch (error) {
    console.error(
      'Vehicle hire request API error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to process your vehicle hire request.',
      },
      { status: 500 }
    )
  }
}
