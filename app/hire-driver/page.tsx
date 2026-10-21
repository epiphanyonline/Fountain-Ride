'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import MarketplaceNav from '../components/MarketplaceNav'
import LocationField from '../components/marketplace/LocationField'
import { NIGERIA_STATES } from '../../lib/marketplace'

type Loc = {
  address: string
  lat: number | null
  lng: number | null
}

type Profile = {
  name: string
  phone: string
  email: string
}

const emptyLoc: Loc = {
  address: '',
  lat: null,
  lng: null,
}

const driverTypes = [
  [
    'personal_private',
    'Personal / Family',
    'Appointments, family journeys, errands and everyday driving.',
  ],
  [
    'business_corporate',
    'Business',
    'Office commute, meetings and business activities.',
  ],
  [
    'school_run',
    'School Run',
    'Regular school pickup and drop-off.',
  ],
  [
    'event',
    'Event',
    'Weddings, parties, ceremonies and special occasions.',
  ],
  [
    'travel_interstate',
    'Interstate Travel',
    'Long-distance journeys between cities or states.',
  ],
  [
    'temporary_relief',
    'Temporary / Relief',
    'Temporary cover when you need a driver for a period.',
  ],
  [
    'other',
    'Other',
    'Tell us what you need.',
  ],
]

const days = [
  ['monday', 'Mon'],
  ['tuesday', 'Tue'],
  ['wednesday', 'Wed'],
  ['thursday', 'Thu'],
  ['friday', 'Fri'],
  ['saturday', 'Sat'],
  ['sunday', 'Sun'],
]

function labelFrom(options: string[][], value: string) {
  return (
    options.find(item => item[0] === value)?.[1] ||
    value.replaceAll('_', ' ')
  )
}

function calculateHours(startTime: string, endTime: string) {
  if (!startTime || !endTime) return null

  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)

  const start = sh * 60 + sm
  let end = eh * 60 + em

  if (end < start) {
    end += 24 * 60
  }

  const minutes = end - start

  if (minutes <= 0) return null

  return Math.round((minutes / 60) * 10) / 10
}

function deriveJobType(
  driverNeedType: string,
  serviceFrequency: string
) {
  if (serviceFrequency === 'fixed_contract') {
    return 'temporary_contract'
  }

  if (driverNeedType === 'event') {
    return 'event'
  }

  if (driverNeedType === 'travel_interstate') {
    return 'intercity'
  }

  if (
    driverNeedType === 'business_corporate' ||
    driverNeedType === 'school_run'
  ) {
    return serviceFrequency === 'recurring'
      ? 'work_commute'
      : 'full_day'
  }

  return 'full_day'
}

function deriveDuties(driverNeedType: string) {
  switch (driverNeedType) {
    case 'personal_private':
      return ['personal_driving']

    case 'family':
      return ['family_members']

    case 'business_corporate':
      return ['work_commute']

    case 'school_run':
      return ['school_runs']

    case 'event':
      return ['event_transportation']

    case 'travel_interstate':
      return ['interstate_travel']

    case 'delivery_errand':
      return ['deliveries']

    case 'temporary_relief':
      return ['personal_driving']

    default:
      return ['other']
  }
}

export default function HireDriverPage() {
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [profile, setProfile] = useState<Profile>({
    name: '',
    phone: '',
    email: '',
  })

  const [driverNeedType, setDriverNeedType] =
    useState('personal_private')

  const [serviceFrequency, setServiceFrequency] =
    useState('one_time')

  const [pickup, setPickup] =
    useState<Loc>(emptyLoc)

  const [pickupState, setPickupState] =
    useState('Lagos')

  const [destinationPattern, setDestinationPattern] =
    useState('specific_destination')

  const [destination, setDestination] =
    useState<Loc>(emptyLoc)

  const [startDate, setStartDate] =
    useState('')

  const [startTime, setStartTime] =
    useState('')

  const [endTime, setEndTime] =
    useState('')

  const [
    finishTimeUncertain,
    setFinishTimeUncertain,
  ] = useState(false)

  const [
    estimatedMinHours,
    setEstimatedMinHours,
  ] = useState('')

  const [
    estimatedMaxHours,
    setEstimatedMaxHours,
  ] = useState('')

  const [recurringPattern, setRecurringPattern] =
    useState('monday_friday')

  const [recurringDays, setRecurringDays] =
    useState<string[]>([])

  const [
    recurringDurationNote,
    setRecurringDurationNote,
  ] = useState('')

  const [customSchedule, setCustomSchedule] =
    useState('')

  const [vehicleType, setVehicleType] =
    useState('saloon_sedan')

  const [
    vehicleTransmission,
    setVehicleTransmission,
  ] = useState('automatic')

  const [
    interstateRequired,
    setInterstateRequired,
  ] = useState(false)

  const [
    overnightRequired,
    setOvernightRequired,
  ] = useState(false)

  const [
    specialRequirements,
    setSpecialRequirements,
  ] = useState('')

  const [
    platformSafetyAcknowledged,
    setPlatformSafetyAcknowledged,
  ] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(
          'fountain_rider_profile'
        ) || 'null'
      )

      if (saved?.name && saved?.phone) {
        setProfile({
          name: saved.name,
          phone: saved.phone,
          email: saved.email || '',
        })
      }
    } catch {}

    const riderToken =
      localStorage.getItem(
        'fountain_rider_token'
      )

    if (!riderToken) return

    fetch('/api/marketplace/rider/profile', {
      headers: {
        'x-rider-token': riderToken,
      },
    })
      .then(async response => {
        if (!response.ok) return

        const data = await response.json()

        if (data?.rider) {
          setProfile({
            name:
              data.rider.full_name || '',
            phone:
              data.rider.phone || '',
            email:
              data.rider.email || '',
          })
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (
      driverNeedType ===
      'travel_interstate'
    ) {
      setInterstateRequired(true)
    }
  }, [driverNeedType])

  const durationHours = useMemo(
    () =>
      finishTimeUncertain
        ? null
        : calculateHours(
            startTime,
            endTime
          ),
    [
      startTime,
      endTime,
      finishTimeUncertain,
    ]
  )

  const jobType = deriveJobType(
    driverNeedType,
    serviceFrequency
  )

  const duties =
    deriveDuties(driverNeedType)

  function toggleDay(value: string) {
    setRecurringDays(current =>
      current.includes(value)
        ? current.filter(
            item => item !== value
          )
        : [...current, value]
    )
  }

  function goToStep(nextStep: number) {
    setError('')
    setStep(nextStep)
    window.scrollTo(0, 0)
  }

  function nextFromStep1() {
    setError('')

    if (!driverNeedType) {
      setError(
        'Choose what you need the driver for.'
      )
      return
    }

    goToStep(2)
  }

  function nextFromStep2() {
    setError('')

    if (!pickup.address.trim()) {
      setError(
        'Add where the driver should report.'
      )
      return
    }

    if (!startDate || !startTime) {
      setError(
        'Choose the start date and time.'
      )
      return
    }

    if (
      destinationPattern ===
        'specific_destination' &&
      !destination.address.trim()
    ) {
      setError(
        'Add the expected destination.'
      )
      return
    }

    if (
      !finishTimeUncertain &&
      !endTime
    ) {
      setError(
        'Add the expected finish time or choose "Not sure".'
      )
      return
    }

    if (
      finishTimeUncertain &&
      (
        !estimatedMinHours ||
        !estimatedMaxHours
      )
    ) {
      setError(
        'Give drivers an estimated duration.'
      )
      return
    }

    if (
      serviceFrequency !==
        'one_time' &&
      recurringPattern ===
        'selected_days' &&
      recurringDays.length === 0
    ) {
      setError(
        'Select the days the driver will be needed.'
      )
      return
    }

    goToStep(3)
  }

  async function submitRequest() {
    setError('')

    if (
      !profile.name.trim() ||
      !profile.phone.trim()
    ) {
      setError(
        'Your name and mobile number are required.'
      )
      return
    }

    if (!vehicleTransmission) {
      setError(
        'Choose the vehicle transmission.'
      )
      return
    }

    if (
      !platformSafetyAcknowledged
    ) {
      setError(
        'Please confirm the Fountain Ride platform safety agreement.'
      )
      return
    }

    setBusy(true)

    try {
      const payload = {
        customerName:
          profile.name.trim(),

        customerPhone:
          profile.phone.trim(),

        customerEmail:
          profile.email.trim(),

        driverNeedType,
        jobType,
        serviceFrequency,

        pickupAddress:
          pickup.address.trim(),

        pickupState,

        pickupCity: '',

        publicWorkArea:
          pickup.address.trim() ||
          pickupState,

        destinationPattern,

        destinationAddress:
          destinationPattern ===
          'specific_destination'
            ? destination.address.trim()
            : '',

        destinationState: '',

        destinationCity: '',

        startDate,
        startTime,

        endTime:
          finishTimeUncertain
            ? null
            : endTime,

        finishTimeUncertain,

        durationHours,

        estimatedMinHours:
          finishTimeUncertain
            ? estimatedMinHours
            : null,

        estimatedMaxHours:
          finishTimeUncertain
            ? estimatedMaxHours
            : null,

        recurringPattern:
          serviceFrequency ===
          'one_time'
            ? null
            : recurringPattern,

        recurringDays:
          serviceFrequency ===
          'one_time'
            ? []
            : recurringDays,

        recurringDurationNote:
          serviceFrequency ===
          'one_time'
            ? null
            : recurringDurationNote,

        customSchedule:
          serviceFrequency !==
            'one_time' &&
          recurringPattern === 'custom'
            ? customSchedule
            : null,

        duties,

        vehicleType,
        vehicleTransmission,

        // Legacy fields retained for
        // compatibility with the existing API.
        vehicleMake: '',
        vehicleModel: '',
        vehicleYear: '',
        vehicleNotes: '',

        passengerCount: '',

        waitingExpected: false,

        estimatedWaitingHours: null,

        interstateRequired:
          interstateRequired ||
          driverNeedType ===
            'travel_interstate',

        overnightRequired,

        accommodationArrangement:
          overnightRequired
            ? 'customer_provides'
            : 'not_required',

        luggageNotes: '',

        specialRequirements:
          specialRequirements.trim(),

        platformSafetyAcknowledged,
      }

      const response = await fetch(
        '/api/marketplace/driver-hire',
        {
          method: 'POST',

          headers: {
            'content-type':
              'application/json',
          },

          body:
            JSON.stringify(payload),
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to create request.'
        )
      }

      try {
        localStorage.setItem(
          'fountain_rider_profile',
          JSON.stringify(profile)
        )

        const existing =
          JSON.parse(
            localStorage.getItem(
              'fountain_driver_hire_request_ids'
            ) || '[]'
          )

        localStorage.setItem(
          'fountain_driver_hire_request_ids',
          JSON.stringify(
            Array.from(
              new Set([
                data.id,
                ...existing,
              ])
            ).slice(0, 50)
          )
        )

        if (data.accessToken) {
          localStorage.setItem(
            `fountain_driver_hire_access_${data.id}`,
            data.accessToken
          )
        }
      } catch {}

      router.push(
        `/hire-driver/requests/${data.id}`
      )
    } catch (err: any) {
      setError(
        err.message ||
          'Unable to create request.'
      )

      setBusy(false)
    }
  }

  return (
    <>
      <MarketplaceNav />

      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f2e9ff_0,#faf8fd_42%,#f7f4fb_100%)] px-4 py-7 pb-32 md:py-10">
        <div className="mx-auto max-w-5xl">

          {/* HERO */}

          <section className="mb-7">
            <p className="text-xs font-black tracking-[.18em] text-purple-700">
              FOUNTAIN RIDE • NIGERIA&apos;S MOBILE GARAGE™
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
              Need a driver for your car?
            </h1>

            <p className="mt-3 max-w-2xl text-gray-600">
              Tell us where, when and what
              you&apos;ll be driving. Available
              drivers can send you quotations
              through Fountain Ride.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                'Verified drivers',
                'Compare quotes',
                'Protected payment',
                'Recorded agreement',
              ].map(item => (
                <span
                  key={item}
                  className="rounded-full border bg-white px-3 py-2 text-xs font-bold text-gray-700"
                >
                  ✓ {item}
                </span>
              ))}
            </div>
          </section>

          <Progress step={step} />

          {/* STEP 1 */}

          {step === 1 && (
            <Panel
              eyebrow="Step 1 of 3"
              title="What do you need a driver for?"
              text="Choose the closest option. You can add any special details later."
            >
              <div className="grid gap-3 md:grid-cols-2">
                {driverTypes.map(
                  ([
                    value,
                    title,
                    description,
                  ]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setDriverNeedType(
                          value
                        )
                      }
                      className={`rounded-2xl border p-5 text-left transition ${
                        driverNeedType ===
                        value
                          ? 'border-purple-700 bg-purple-50 ring-2 ring-purple-100'
                          : 'bg-white hover:border-purple-300'
                      }`}
                    >
                      <b className="block text-lg">
                        {title}
                      </b>

                      <span className="mt-1 block text-sm text-gray-500">
                        {description}
                      </span>
                    </button>
                  )
                )}
              </div>

              <div className="mt-7">
                <p className="text-sm font-black">
                  How often do you need the
                  driver?
                </p>

                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  <Choice
                    active={
                      serviceFrequency ===
                      'one_time'
                    }
                    onClick={() =>
                      setServiceFrequency(
                        'one_time'
                      )
                    }
                    title="One-time"
                    text="One journey, day or occasion"
                  />

                  <Choice
                    active={
                      serviceFrequency ===
                      'recurring'
                    }
                    onClick={() =>
                      setServiceFrequency(
                        'recurring'
                      )
                    }
                    title="Recurring"
                    text="Regular days or schedule"
                  />

                  <Choice
                    active={
                      serviceFrequency ===
                      'fixed_contract'
                    }
                    onClick={() =>
                      setServiceFrequency(
                        'fixed_contract'
                      )
                    }
                    title="Fixed period"
                    text="Temporary arrangement"
                  />
                </div>
              </div>

              <BottomButtons
                next={nextFromStep1}
              />
            </Panel>
          )}

          {/* STEP 2 */}

          {step === 2 && (
            <Panel
              eyebrow="Step 2 of 3"
              title="Where and when?"
              text="Give drivers enough information to understand the time and journey."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <LocationField
                  label="Where should the driver report?"
                  value={pickup}
                  onChange={setPickup}
                  placeholder="Area, street or landmark"
                />

                <Field label="State">
                  <StateSelect
                    value={pickupState}
                    onChange={
                      setPickupState
                    }
                  />
                </Field>
              </div>

              <div className="mt-6">
                <Field label="What will the journey look like?">
                  <select
                    className="input"
                    value={
                      destinationPattern
                    }
                    onChange={e =>
                      setDestinationPattern(
                        e.target.value
                      )
                    }
                  >
                    <option value="specific_destination">
                      Specific destination
                    </option>

                    <option value="multiple_destinations">
                      Multiple stops
                    </option>

                    <option value="no_fixed_destination">
                      No fixed destination
                    </option>

                    <option value="driver_for_day">
                      Driver needed for the day
                    </option>
                  </select>
                </Field>
              </div>

              {destinationPattern ===
                'specific_destination' && (
                <div className="mt-4">
                  <LocationField
                    label="Expected destination"
                    value={destination}
                    onChange={
                      setDestination
                    }
                    placeholder="Destination or area"
                  />
                </div>
              )}

              {destinationPattern ===
                'multiple_destinations' && (
                <div className="mt-4 rounded-2xl border border-purple-100 bg-purple-50 p-4">
                  <b>
                    Multiple stops
                  </b>

                  <p className="mt-1 text-sm text-gray-600">
                    You can describe the
                    expected stops in the
                    additional information
                    box on the next step.
                  </p>
                </div>
              )}

              <div className="mt-7 grid gap-4 md:grid-cols-3">
                <Field label="Start date">
                  <input
                    type="date"
                    className="input"
                    value={startDate}
                    onChange={e =>
                      setStartDate(
                        e.target.value
                      )
                    }
                  />
                </Field>

                <Field label="Start time">
                  <input
                    type="time"
                    className="input"
                    value={startTime}
                    onChange={e =>
                      setStartTime(
                        e.target.value
                      )
                    }
                  />
                </Field>

                <Field label="Expected finish">
                  <input
                    type="time"
                    disabled={
                      finishTimeUncertain
                    }
                    className="input disabled:bg-gray-100"
                    value={endTime}
                    onChange={e =>
                      setEndTime(
                        e.target.value
                      )
                    }
                  />
                </Field>
              </div>

              <label className="mt-4 flex items-start gap-3 rounded-2xl border bg-white p-4">
                <input
                  type="checkbox"
                  checked={
                    finishTimeUncertain
                  }
                  onChange={e =>
                    setFinishTimeUncertain(
                      e.target.checked
                    )
                  }
                  className="mt-1"
                />

                <span>
                  <b className="block">
                    I&apos;m not sure when
                    the job will finish
                  </b>

                  <span className="mt-1 block text-sm text-gray-500">
                    Give drivers an
                    approximate duration
                    instead.
                  </span>
                </span>
              </label>

              {finishTimeUncertain && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Minimum hours">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      className="input"
                      value={
                        estimatedMinHours
                      }
                      onChange={e =>
                        setEstimatedMinHours(
                          e.target.value
                        )
                      }
                      placeholder="e.g. 6"
                    />
                  </Field>

                  <Field label="Maximum hours">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      className="input"
                      value={
                        estimatedMaxHours
                      }
                      onChange={e =>
                        setEstimatedMaxHours(
                          e.target.value
                        )
                      }
                      placeholder="e.g. 10"
                    />
                  </Field>
                </div>
              )}

              {!finishTimeUncertain &&
                durationHours !== null && (
                  <div className="mt-4 rounded-2xl bg-gray-950 p-4 text-white">
                    <p className="text-xs font-black text-purple-300">
                      ESTIMATED DRIVER TIME
                    </p>

                    <p className="mt-1 text-xl font-black">
                      {startTime} –{' '}
                      {endTime} · Approx.{' '}
                      {durationHours} hours
                    </p>
                  </div>
                )}

              {serviceFrequency !==
                'one_time' && (
                <div className="mt-7 border-t pt-6">
                  <h3 className="text-xl font-black">
                    Regular schedule
                  </h3>

                  <div className="mt-4">
                    <Field label="How often?">
                      <select
                        className="input"
                        value={
                          recurringPattern
                        }
                        onChange={e =>
                          setRecurringPattern(
                            e.target.value
                          )
                        }
                      >
                        <option value="monday_friday">
                          Monday–Friday
                        </option>

                        <option value="weekends">
                          Weekends
                        </option>

                        <option value="selected_days">
                          Selected days
                        </option>

                        <option value="daily">
                          Daily
                        </option>

                        <option value="custom">
                          Custom schedule
                        </option>
                      </select>
                    </Field>
                  </div>

                  {recurringPattern ===
                    'selected_days' && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {days.map(
                        ([
                          value,
                          title,
                        ]) => (
                          <button
                            type="button"
                            key={value}
                            onClick={() =>
                              toggleDay(
                                value
                              )
                            }
                            className={`rounded-xl border px-4 py-3 font-black ${
                              recurringDays.includes(
                                value
                              )
                                ? 'border-purple-700 bg-purple-700 text-white'
                                : 'bg-white'
                            }`}
                          >
                            {title}
                          </button>
                        )
                      )}
                    </div>
                  )}

                  {recurringPattern ===
                    'custom' && (
                    <div className="mt-4">
                      <Field label="Describe the schedule">
                        <textarea
                          className="input min-h-24"
                          value={
                            customSchedule
                          }
                          onChange={e =>
                            setCustomSchedule(
                              e.target.value
                            )
                          }
                          placeholder="e.g. Alternate Mondays and Wednesdays"
                        />
                      </Field>
                    </div>
                  )}

                  <div className="mt-4">
                    <Field label="How long will you need the arrangement?">
                      <input
                        className="input"
                        value={
                          recurringDurationNote
                        }
                        onChange={e =>
                          setRecurringDurationNote(
                            e.target.value
                          )
                        }
                        placeholder="e.g. 6 weeks, 3 months"
                      />
                    </Field>
                  </div>
                </div>
              )}

              <BottomButtons
                back={() =>
                  goToStep(1)
                }
                next={nextFromStep2}
              />
            </Panel>
          )}

          {/* STEP 3 */}

          {step === 3 && (
            <Panel
              eyebrow="Step 3 of 3"
              title="Vehicle & final details"
              text="Just the essentials drivers need before sending you a quote."
            >
              <div className="rounded-[2rem] border bg-white p-5 md:p-6">
                <h3 className="text-xl font-black">
                  What will the driver
                  drive?
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  We only need the vehicle
                  class and transmission so
                  the right drivers can
                  respond.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field label="Vehicle">
                    <select
                      className="input"
                      value={vehicleType}
                      onChange={e =>
                        setVehicleType(
                          e.target.value
                        )
                      }
                    >
                      <option value="saloon_sedan">
                        Car / Saloon
                      </option>

                      <option value="suv">
                        SUV
                      </option>

                      <option value="van">
                        Van
                      </option>

                      <option value="bus">
                        Bus
                      </option>

                      <option value="truck">
                        Truck
                      </option>

                      <option value="other">
                        Other
                      </option>
                    </select>
                  </Field>

                  <Field label="Transmission">
                    <select
                      className="input"
                      value={
                        vehicleTransmission
                      }
                      onChange={e =>
                        setVehicleTransmission(
                          e.target.value
                        )
                      }
                    >
                      <option value="automatic">
                        Automatic
                      </option>

                      <option value="manual">
                        Manual
                      </option>
                    </select>
                  </Field>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <CheckRow
                  checked={
                    interstateRequired
                  }
                  onChange={
                    setInterstateRequired
                  }
                  title="Interstate travel"
                  text="The driver may travel outside the starting state."
                />

                <CheckRow
                  checked={
                    overnightRequired
                  }
                  onChange={
                    setOvernightRequired
                  }
                  title="Overnight stay"
                  text="The job may require the driver to stay overnight."
                />
              </div>

              {overnightRequired && (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <b className="text-sm">
                    Overnight jobs
                  </b>

                  <p className="mt-1 text-sm text-gray-600">
                    The customer is expected
                    to provide reasonable
                    accommodation unless a
                    different arrangement is
                    agreed on Fountain Ride.
                  </p>
                </div>
              )}

              <div className="mt-6">
                <Field label="Anything else the driver should know?">
                  <textarea
                    className="input min-h-32"
                    value={
                      specialRequirements
                    }
                    onChange={e =>
                      setSpecialRequirements(
                        e.target.value
                      )
                    }
                    placeholder="Optional: multiple stops, special timing, access instructions or anything else that could affect the job."
                  />
                </Field>
              </div>

              {/* STANDARD TERMS */}

              <div className="mt-6 rounded-[2rem] border border-purple-100 bg-purple-50 p-5">
                <p className="text-xs font-black tracking-widest text-purple-700">
                  STANDARD DRIVER HIRE TERMS
                </p>

                <h3 className="mt-2 text-lg font-black">
                  No need to negotiate the
                  obvious.
                </h3>

                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <p>
                    ✓ The customer provides
                    the vehicle being driven.
                  </p>

                  <p>
                    ✓ Fuel used by the
                    customer&apos;s vehicle is
                    the customer&apos;s
                    responsibility.
                  </p>

                  <p>
                    ✓ Journey-related tolls
                    and parking charges are
                    the customer&apos;s
                    responsibility.
                  </p>

                  <p>
                    ✓ Any unusual additional
                    expense must be stated
                    and agreed before payment.
                  </p>
                </div>
              </div>

              {/* REVIEW */}

              <div className="mt-7 border-t pt-7">
                <p className="text-xs font-black tracking-widest text-purple-700">
                  QUICK REVIEW
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Summary
                    title="Your request"
                    rows={[
                      [
                        'Driver',
                        labelFrom(
                          driverTypes,
                          driverNeedType
                        ),
                      ],
                      [
                        'Frequency',
                        serviceFrequency ===
                        'one_time'
                          ? 'One-time'
                          : serviceFrequency ===
                            'recurring'
                          ? 'Recurring'
                          : 'Fixed period',
                      ],
                      [
                        'Date',
                        startDate,
                      ],
                      [
                        'Time',
                        finishTimeUncertain
                          ? `${startTime} – finish not fixed`
                          : `${startTime} – ${endTime}`,
                      ],
                    ]}
                  />

                  <Summary
                    title="Journey"
                    rows={[
                      [
                        'Report at',
                        pickup.address,
                      ],
                      [
                        'Journey',
                        destinationPattern.replaceAll(
                          '_',
                          ' '
                        ),
                      ],
                      [
                        'Vehicle',
                        vehicleType ===
                        'saloon_sedan'
                          ? 'Car / Saloon'
                          : vehicleType.replaceAll(
                              '_',
                              ' '
                            ),
                      ],
                      [
                        'Transmission',
                        vehicleTransmission,
                      ],
                    ]}
                  />
                </div>
              </div>

              {/* CONTACT */}

              <div className="mt-6 rounded-[2rem] border bg-white p-5">
                <p className="text-xs font-black tracking-widest text-purple-700">
                  YOUR CONTACT DETAILS
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  Your phone number and email
                  are not shown on the public
                  job card.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <input
                    className="input"
                    value={profile.name}
                    onChange={e =>
                      setProfile(current => ({
                        ...current,
                        name:
                          e.target.value,
                      }))
                    }
                    placeholder="Full name"
                  />

                  <input
                    className="input"
                    value={profile.phone}
                    onChange={e =>
                      setProfile(current => ({
                        ...current,
                        phone:
                          e.target.value,
                      }))
                    }
                    placeholder="Mobile number"
                    inputMode="tel"
                  />

                  <input
                    type="email"
                    className="input md:col-span-2"
                    value={profile.email}
                    onChange={e =>
                      setProfile(current => ({
                        ...current,
                        email:
                          e.target.value,
                      }))
                    }
                    placeholder="Email (optional)"
                  />
                </div>
              </div>

              {/* SAFETY */}

              <label className="mt-6 block rounded-[2rem] border border-purple-200 bg-purple-50 p-5">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={
                      platformSafetyAcknowledged
                    }
                    onChange={e =>
                      setPlatformSafetyAcknowledged(
                        e.target.checked
                      )
                    }
                  />

                  <div>
                    <b className="block">
                      Keep your booking on
                      Fountain Ride
                    </b>

                    <p className="mt-1 text-sm text-gray-600">
                      I understand that the
                      quotation, agreed terms
                      and payment should stay
                      on Fountain Ride so
                      there is a record of
                      the transaction and
                      eligible disputes can
                      be reviewed.
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      Do not move payment
                      outside Fountain Ride.
                    </p>
                  </div>
                </div>
              </label>

              {error && (
                <p className="mt-5 text-sm font-bold text-red-600">
                  {error}
                </p>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() =>
                    goToStep(2)
                  }
                  className="rounded-2xl border bg-white px-6 py-4 font-black"
                >
                  ← Back
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={
                    submitRequest
                  }
                  className="rounded-2xl bg-purple-700 px-8 py-4 text-lg font-black text-white disabled:opacity-50"
                >
                  {busy
                    ? 'Sending request…'
                    : 'Request Driver Quotes →'}
                </button>
              </div>
            </Panel>
          )}

          {error && step !== 3 && (
            <p className="mt-5 text-sm font-bold text-red-600">
              {error}
            </p>
          )}

          {/* MOBILE GARAGE POSITIONING */}

          <section className="mt-6 rounded-[2rem] border bg-gray-950 p-6 text-white">
            <p className="text-xs font-black tracking-[.18em] text-purple-300">
              FOUNTAIN RIDE • MOBILE GARAGE™
            </p>

            <h2 className="mt-2 text-2xl font-black">
              The garage in your pocket.
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
              Hire a driver, book a protected
              trip, arrange package delivery,
              or enter a registered motor park
              from your phone and choose a
              driver.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['🚘', 'Hire a Driver'],
                ['🛡️', 'Protected Trips'],
                ['📦', 'Package Delivery'],
                ['🏁', 'Digital Motor Parks'],
              ].map(([icon, title]) => (
                <div
                  key={title}
                  className="rounded-2xl bg-white/10 p-4"
                >
                  <span className="text-xl">
                    {icon}
                  </span>

                  <b className="mt-2 block text-sm">
                    {title}
                  </b>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

function Progress({
  step,
}: {
  step: number
}) {
  const labels = [
    'Need',
    'Where & when',
    'Confirm',
  ]

  return (
    <div className="mb-5 grid grid-cols-3 gap-2">
      {labels.map((label, index) => {
        const number = index + 1
        const active =
          number <= step

        return (
          <div key={label}>
            <div
              className={`h-2 rounded-full ${
                active
                  ? 'bg-purple-700'
                  : 'bg-purple-100'
              }`}
            />

            <p
              className={`mt-2 text-[11px] font-bold sm:text-xs ${
                number === step
                  ? 'text-purple-700'
                  : 'text-gray-400'
              }`}
            >
              {number}. {label}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function Panel({
  eyebrow,
  title,
  text,
  children,
}: {
  eyebrow: string
  title: string
  text: string
  children: React.ReactNode
}) {
  return (
    <section className="fr-glass rounded-[2rem] border p-5 shadow-[0_25px_70px_rgba(59,20,90,.08)] md:p-8">
      <p className="text-sm font-black uppercase tracking-[.18em] text-purple-700">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-3xl font-black md:text-4xl">
        {title}
      </h2>

      <p className="mb-6 mt-2 max-w-3xl text-gray-600">
        {text}
      </p>

      {children}
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-gray-800">
        {label}
      </span>

      <div className="mt-2">
        {children}
      </div>
    </label>
  )
}

function StateSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <select
      className="input"
      value={value}
      onChange={e =>
        onChange(e.target.value)
      }
    >
      {NIGERIA_STATES.map(state => (
        <option
          value={state}
          key={state}
        >
          {state}
        </option>
      ))}
    </select>
  )
}

function Choice({
  active,
  onClick,
  title,
  text,
}: {
  active: boolean
  onClick: () => void
  title: string
  text: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left ${
        active
          ? 'border-purple-700 bg-purple-50 ring-2 ring-purple-100'
          : 'bg-white'
      }`}
    >
      <b className="block">
        {title}
      </b>

      <span className="mt-1 block text-xs text-gray-500">
        {text}
      </span>
    </button>
  )
}

function CheckRow({
  checked,
  onChange,
  title,
  text,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  title: string
  text: string
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border bg-white p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={e =>
          onChange(e.target.checked)
        }
        className="mt-1"
      />

      <span>
        <b className="block">
          {title}
        </b>

        <span className="mt-1 block text-sm text-gray-500">
          {text}
        </span>
      </span>
    </label>
  )
}

function BottomButtons({
  back,
  next,
}: {
  back?: () => void
  next: () => void
}) {
  return (
    <div className="mt-8 flex justify-between gap-3">
      <div>
        {back && (
          <button
            type="button"
            onClick={back}
            className="rounded-2xl border bg-white px-5 py-3 font-black"
          >
            ← Back
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={next}
        className="rounded-2xl bg-purple-700 px-7 py-4 font-black text-white"
      >
        Continue →
      </button>
    </div>
  )
}

function Summary({
  title,
  rows,
}: {
  title: string
  rows: [string, string][]
}) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <h3 className="text-lg font-black">
        {title}
      </h3>

      <div className="mt-3 divide-y">
        {rows.map(
          ([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-[100px_1fr] gap-3 py-3 text-sm sm:grid-cols-[120px_1fr]"
            >
              <span className="text-gray-500">
                {label}
              </span>

              <b className="capitalize">
                {value ||
                  'Not specified'}
              </b>
            </div>
          )
        )}
      </div>
    </div>
  )
}
