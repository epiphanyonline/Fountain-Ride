import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../lib/server/supabaseAdmin'

const DRIVER_TYPES = new Set([
  'personal_private',
  'family',
  'business_corporate',
  'school_run',
  'event',
  'travel_interstate',
  'delivery_errand',
  'temporary_relief',
  'other',
])

const JOB_TYPES = new Set([
  'hourly',
  'full_day',
  'event',
  'temporary_contract',
  'work_commute',
  'intercity',
])

const DESTINATION_PATTERNS = new Set([
  'specific_destination',
  'multiple_destinations',
  'no_fixed_destination',
  'driver_for_day',
])

const FREQUENCIES = new Set([
  'one_time',
  'recurring',
  'fixed_contract',
])

const TRANSMISSIONS = new Set([
  'automatic',
  'manual',
])

const VEHICLE_TYPES = new Set([
  'saloon_sedan',
  'suv',
  'bus',
  'van',
  'luxury',
  'truck',
  'other',
])

function text(value: unknown, max = 1000) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

function nullableText(value: unknown, max = 1000) {
  const valueText = text(value, max)
  return valueText || null
}

function boolean(value: unknown) {
  return value === true
}

function positiveNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return null

  const number = Number(value)

  if (!Number.isFinite(number) || number < 0) {
    return null
  }

  return number
}

function makeCustomerAccessToken() {
  return crypto.randomUUID().replace(/-/g, '') +
    crypto.randomUUID().replace(/-/g, '')
}

function makeBookingRef() {
  const date = new Date()

  const yy = String(date.getUTCFullYear()).slice(-2)
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')

  const suffix = crypto.randomUUID()
    .replace(/-/g, '')
    .slice(0, 6)
    .toUpperCase()

  return `DH-${yy}${mm}${dd}-${suffix}`
}

function cleanArray(value: unknown, maxItems = 30) {
  if (!Array.isArray(value)) return []

  return value
    .filter(item => typeof item === 'string')
    .map(item => item.trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, maxItems)
}

function publicArea(
  suppliedArea: unknown,
  city: string | null,
  state: string | null
) {
  const supplied = text(suppliedArea, 150)

  if (supplied) return supplied

  return [city, state].filter(Boolean).join(', ') || 'Nigeria'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    // ---------------------------------------------------------
    // Customer
    // ---------------------------------------------------------

    const customerName = text(body.customerName, 150)
    const customerPhone = text(body.customerPhone, 50)
    const customerEmail = nullableText(body.customerEmail, 200)

    if (!customerName || !customerPhone) {
      return NextResponse.json(
        { error: 'Your name and mobile number are required.' },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Driver requirement
    // ---------------------------------------------------------

    const driverNeedType = text(body.driverNeedType, 50)
    const jobType = text(body.jobType, 50)

    if (!DRIVER_TYPES.has(driverNeedType)) {
      return NextResponse.json(
        { error: 'Choose the type of driver you need.' },
        { status: 400 }
      )
    }

    if (!JOB_TYPES.has(jobType)) {
      return NextResponse.json(
        { error: 'Choose the type of Driver Hire job.' },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Location
    // ---------------------------------------------------------

    const pickupAddress = text(body.pickupAddress, 500)
    const pickupState = nullableText(body.pickupState, 100)
    const pickupCity = nullableText(body.pickupCity, 150)

    const destinationAddress = nullableText(
      body.destinationAddress,
      500
    )

    const destinationState = nullableText(
      body.destinationState,
      100
    )

    const destinationCity = nullableText(
      body.destinationCity,
      150
    )

    const destinationPattern = text(
      body.destinationPattern,
      50
    )

    if (!pickupAddress) {
      return NextResponse.json(
        { error: 'Add the area where the driver will report for work.' },
        { status: 400 }
      )
    }

    if (!DESTINATION_PATTERNS.has(destinationPattern)) {
      return NextResponse.json(
        { error: 'Choose the expected destination or work pattern.' },
        { status: 400 }
      )
    }

    if (
      destinationPattern === 'specific_destination' &&
      !destinationAddress
    ) {
      return NextResponse.json(
        { error: 'Add the expected destination.' },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Schedule
    // ---------------------------------------------------------

    const startDate = text(body.startDate, 20)
    const startTime = text(body.startTime, 20)

    const finishTimeUncertain = boolean(
      body.finishTimeUncertain
    )

    const endDate = nullableText(body.endDate, 20)

    const endTime = finishTimeUncertain
      ? null
      : nullableText(body.endTime, 20)

    const serviceFrequency = text(
      body.serviceFrequency,
      30
    )

    const recurringPattern = nullableText(
      body.recurringPattern,
      50
    )

    const recurringDays = cleanArray(
      body.recurringDays,
      7
    )

    if (!startDate || !startTime) {
      return NextResponse.json(
        { error: 'Choose the start date and start time.' },
        { status: 400 }
      )
    }

    if (!FREQUENCIES.has(serviceFrequency)) {
      return NextResponse.json(
        { error: 'Choose whether the job is one-time, recurring or fixed.' },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Vehicle
    // ---------------------------------------------------------

    const vehicleTransmission = nullableText(
      body.vehicleTransmission,
      30
    )

    const vehicleType = nullableText(
      body.vehicleType,
      50
    )

    if (
      vehicleTransmission &&
      !TRANSMISSIONS.has(vehicleTransmission)
    ) {
      return NextResponse.json(
        { error: 'Choose Automatic or Manual transmission.' },
        { status: 400 }
      )
    }

    if (
      vehicleType &&
      !VEHICLE_TYPES.has(vehicleType)
    ) {
      return NextResponse.json(
        { error: 'Choose a valid vehicle type.' },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Duration
    // ---------------------------------------------------------

    const durationHours = positiveNumber(
      body.durationHours
    )

    const estimatedMinHours = positiveNumber(
      body.estimatedMinHours
    )

    const estimatedMaxHours = positiveNumber(
      body.estimatedMaxHours
    )

    if (
      estimatedMinHours !== null &&
      estimatedMaxHours !== null &&
      estimatedMaxHours < estimatedMinHours
    ) {
      return NextResponse.json(
        {
          error:
            'Maximum estimated hours cannot be less than minimum hours.',
        },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Additional requirements
    // ---------------------------------------------------------

    const passengerCount = positiveNumber(
      body.passengerCount
    )

    const waitingExpected = boolean(
      body.waitingExpected
    )

    const estimatedWaitingHours = waitingExpected
      ? positiveNumber(body.estimatedWaitingHours)
      : null

    const interstateRequired = boolean(
      body.interstateRequired
    )

    const overnightRequired = boolean(
      body.overnightRequired
    )

    const platformSafetyAcknowledged = boolean(
      body.platformSafetyAcknowledged
    )

    if (!platformSafetyAcknowledged) {
      return NextResponse.json(
        {
          error:
            'Please confirm that booking, communication and payment will remain on Fountain Ride.',
        },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Create RFQ
    // ---------------------------------------------------------

    const bookingRef = makeBookingRef()

    const record = {
      booking_ref: bookingRef,

      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,

      driver_need_type: driverNeedType,
      job_type: jobType,
      job_description: nullableText(
        body.jobDescription,
        2000
      ),

      pickup_address: pickupAddress,
      pickup_state: pickupState,
      pickup_city: pickupCity,

      public_work_area: publicArea(
        body.publicWorkArea,
        pickupCity,
        pickupState
      ),

      destination_pattern: destinationPattern,

      destination_address: destinationAddress,
      destination_state: destinationState,
      destination_city: destinationCity,

      start_date: startDate,
      start_time: startTime,

      end_date: endDate,
      end_time: endTime,

      duration_hours: durationHours,

      finish_time_uncertain: finishTimeUncertain,

      estimated_min_hours: estimatedMinHours,
      estimated_max_hours: estimatedMaxHours,

      service_frequency: serviceFrequency,

      recurring_pattern:
        serviceFrequency === 'one_time'
          ? null
          : recurringPattern,

      recurring_days:
        serviceFrequency === 'one_time'
          ? []
          : recurringDays,

      custom_schedule:
        serviceFrequency === 'one_time'
          ? null
          : nullableText(
              body.customSchedule,
              1000
            ),

      recurring_end_date:
        serviceFrequency === 'one_time'
          ? null
          : nullableText(
              body.recurringEndDate,
              20
            ),

      recurring_duration_note:
        serviceFrequency === 'one_time'
          ? null
          : nullableText(
              body.recurringDurationNote,
              500
            ),

      duties: cleanArray(body.duties),

      vehicle_type: vehicleType,

      vehicle_make: nullableText(
        body.vehicleMake,
        100
      ),

      vehicle_model: nullableText(
        body.vehicleModel,
        100
      ),

      vehicle_year:
        positiveNumber(body.vehicleYear),

      vehicle_transmission: vehicleTransmission,

      requires_manual:
        vehicleTransmission === 'manual',

      vehicle_notes: nullableText(
        body.vehicleNotes,
        1000
      ),

      passenger_count:
        passengerCount === null
          ? null
          : Math.floor(passengerCount),

      interstate_required: interstateRequired,

      overnight_required: overnightRequired,

      accommodation_arrangement:
        overnightRequired
          ? nullableText(
              body.accommodationArrangement,
              50
            )
          : 'not_required',

      waiting_expected: waitingExpected,

      estimated_waiting_hours:
        estimatedWaitingHours,

      luggage_notes: nullableText(
        body.luggageNotes,
        1000
      ),

      special_requirements: nullableText(
        body.specialRequirements,
        3000
      ),

      platform_safety_acknowledged: true,
      platform_safety_acknowledged_at:
        new Date().toISOString(),

      // Exact location remains private by default.
      exact_location_released: false,

      status: 'requested',
      currency: 'NGN',

      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('driver_hire_requests')
      .insert(record)
      .select(
        `
          id,
          booking_ref,
          status,
          driver_need_type,
          job_type,
          public_work_area,
          start_date,
          start_time,
          created_at
        `
      )
      .single()

    if (error) {
      console.error(
        'Driver Hire RFQ insert error:',
        error
      )

      return NextResponse.json(
        {
          error:
            'Unable to create the Driver Hire request.',
        },
        { status: 500 }
      )
    }

    // ---------------------------------------------------------
// Create private customer access
// ---------------------------------------------------------

const customerAccessToken = makeCustomerAccessToken()

const { error: accessError } = await supabase
  .from('driver_hire_customer_access')
  .insert({
    driver_hire_request_id: data.id,
    access_token: customerAccessToken,
  })

if (accessError) {
  console.error(
    'Driver Hire customer access error:',
    accessError
  )

  // Do not leave an RFQ behind if its customer
  // access credential could not be created.
  await supabase
    .from('driver_hire_requests')
    .delete()
    .eq('id', data.id)

  return NextResponse.json(
    {
      error:
        'Unable to secure the Driver Hire request.',
    },
    { status: 500 }
  )
}

    // ---------------------------------------------------------
    // Audit event
    // ---------------------------------------------------------

    await supabase
      .from('driver_hire_events')
      .insert({
        driver_hire_request_id: data.id,
        event_type: 'request_created',
        actor_role: 'customer',
        metadata: {
          booking_ref: data.booking_ref,
          driver_need_type:
            data.driver_need_type,
          job_type: data.job_type,
          public_work_area:
            data.public_work_area,
        },
      })

    return NextResponse.json(
  {
    ok: true,
    id: data.id,
    bookingRef: data.booking_ref,
    status: data.status,
    accessToken: customerAccessToken,

    message:
      "Your request has been created. Eligible drivers will be able to review the job requirements and submit their offers.",
  },
  { status: 201 }
)
  } catch (error) {
    console.error(
      'Driver Hire RFQ API error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to create the Driver Hire request.',
      },
      { status: 500 }
    )
  }
}
