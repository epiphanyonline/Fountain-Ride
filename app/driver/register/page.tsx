'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { NIGERIA_STATES } from '../../../lib/marketplace'
import MarketplaceNav from '../../components/MarketplaceNav'

type Garage = {
  id: string
  name: string
  city?: string
  state: string
}

type WorkMode = 'passenger_trips' | 'driver_hire' | 'both'
type DriverType = 'private' | 'commercial'

const hireJobs = [
  {
    id: 'hourly',
    title: 'Hourly',
    description: 'Short driving jobs for a few hours.',
  },
  {
    id: 'full_day',
    title: 'Full day',
    description: 'Drive a customer for the day.',
  },
  {
    id: 'event',
    title: 'Events',
    description: 'Weddings, parties and special occasions.',
  },
  {
    id: 'temporary_contract',
    title: 'Temporary contracts',
    description: 'Cover for days, weeks or short-term contracts.',
  },
  {
    id: 'work_commute',
    title: 'Work commute',
    description: 'Morning drop-off and later pickup arrangements.',
  },
  {
    id: 'intercity',
    title: 'Intercity',
    description: 'Drive customers between cities.',
  },
]

export default function DriverRegister() {
  const [wizardStep, setWizardStep] = useState(1)
  const [reviewDetails, setReviewDetails] = useState<Record<string, string>>({})

  function nextWizardStep() {
    const currentSection = document.querySelector(
      `[data-wizard-step="${wizardStep}"]`
    )

    if (currentSection) {
      const fields = currentSection.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >('input, select, textarea')

      for (const field of fields) {
        if (!field.checkValidity()) {
          field.reportValidity()
          field.focus()
          return
        }
      }
    }

    if (wizardStep === 3) {
      const form = document.querySelector<HTMLFormElement>(
        'form[data-driver-registration]'
      )

      if (form) {
        const fd = new FormData(form)
        setReviewDetails({
          name: String(fd.get('name') || ''),
          phone: String(fd.get('phone') || ''),
          email: String(fd.get('email') || ''),
          city: String(fd.get('city') || ''),
          experience: String(fd.get('experience') || ''),
          make: String(fd.get('make') || ''),
          model: String(fd.get('model') || ''),
          year: String(fd.get('year') || ''),
          plate: String(fd.get('plate') || ''),
          park: String(fd.get('park') || ''),
        })
      }
    }

    setErr('')
    setWizardStep((current) => Math.min(current + 1, 4))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function previousWizardStep() {
    setWizardStep((current) => Math.max(current - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const router = useRouter()

  const [workMode, setWorkMode] =
    useState<WorkMode>('passenger_trips')

  const [type, setType] =
    useState<DriverType>('private')

  const [state, setState] = useState('Oyo')

  const [garages, setGarages] =
    useState<Garage[]>([])

  const [parkId, setParkId] = useState('')
  const [newPark, setNewPark] = useState(false)

  const [automatic, setAutomatic] = useState(true)
  const [manual, setManual] = useState(false)

  const [selectedHireJobs, setSelectedHireJobs] =
    useState<string[]>([
      'hourly',
      'full_day',
      'event',
      'temporary_contract',
    ])

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const wantsPassengerTrips =
    workMode === 'passenger_trips' ||
    workMode === 'both'

  const wantsDriverHire =
    workMode === 'driver_hire' ||
    workMode === 'both'

  useEffect(() => {
    if (!wantsPassengerTrips || type !== 'commercial') {
      return
    }

    fetch(
      `/api/marketplace/garages?state=${encodeURIComponent(
        state
      )}`
    )
      .then((r) => r.json())
      .then((d) => setGarages(d.garages || []))
      .catch(() => {})
  }, [wantsPassengerTrips, type, state])

  function toggleHireJob(id: string) {
    setSelectedHireJobs((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    )
  }

  async function submit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    if (wizardStep !== 4) {
      return
    }

    const form = e.currentTarget
    const requiredFields = form.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >('input[required], select[required], textarea[required]')

    for (const field of requiredFields) {
      if (!field.checkValidity()) {
        const parentStep = field.closest<HTMLElement>('[data-wizard-step]')
        const targetStep = Number(parentStep?.dataset.wizardStep || 2)

        setWizardStep(targetStep)
        setErr('Please complete the required information before submitting.')
        return
      }
    }

    setBusy(true)
    setErr('')

    const fd = new FormData(e.currentTarget)

    const payload = {
      full_name: fd.get('name'),
      phone: fd.get('phone'),
      email: fd.get('email'),

      work_mode: workMode,

      driver_type: wantsPassengerTrips
        ? type
        : 'private',

      home_state: state,
      home_city: fd.get('city'),

      park_id:
        wantsPassengerTrips &&
        type === 'commercial' &&
        !newPark
          ? parkId
          : null,

      park_name:
        wantsPassengerTrips &&
        type === 'commercial' &&
        newPark
          ? fd.get('park')
          : null,

      vehicle_make: wantsPassengerTrips
        ? fd.get('make')
        : null,

      vehicle_model: wantsPassengerTrips
        ? fd.get('model')
        : null,

      vehicle_year: wantsPassengerTrips
        ? Number(fd.get('year') || 0) || null
        : null,

      vehicle_plate: wantsPassengerTrips
        ? fd.get('plate')
        : null,

      accept_unverified_riders:
        wantsPassengerTrips &&
        fd.get('unverified') === 'on',

      driving_experience_years:
        wantsDriverHire
          ? Number(fd.get('experience') || 0)
          : null,

      drives_automatic:
        wantsDriverHire ? automatic : true,

      drives_manual:
        wantsDriverHire ? manual : false,

      driver_hire_job_types:
        wantsDriverHire
          ? selectedHireJobs
          : [],
    }

    try {
      const res = await fetch(
        '/api/marketplace/driver-applications',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.error ||
            'Unable to submit application'
        )
      }

      router.push(data.activationUrl)
    } catch (e: any) {
      setErr(e.message)
      setBusy(false)
    }
  }

  return (
    <>
      <MarketplaceNav />

      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#efe4ff,#f8f5fb_45%)] p-5 py-10">
        <div className="mx-auto mb-5 max-w-3xl rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-gray-900">
              Driver registration
            </p>
            <p className="text-xs font-bold text-purple-700">
              Step {wizardStep} of 4
            </p>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((number) => (
              <div
                key={number}
                className={`h-2 rounded-full ${
                  number <= wizardStep
                    ? 'bg-purple-700'
                    : 'bg-purple-100'
                }`}
              />
            ))}
          </div>

          <p className="mt-3 text-sm text-gray-600">
            {[
              'Choose how you want to earn',
              'Tell us about yourself',
              'Driving and vehicle details',
              'Review and continue',
            ][wizardStep - 1]}
          </p>
        </div>

        <form
          data-driver-registration
          noValidate
          onSubmit={submit}
          className="max-w-5xl mx-auto"
        >
          <div className="fr-glass border rounded-[2rem] p-6 md:p-9 shadow-xl shadow-purple-100">
            <p className="text-purple-700 font-black">
              Earn with Fountain Ride
            </p>

            <h1 className="text-4xl md:text-5xl font-black mt-2">
              How would you like to drive?
            </h1>

            <p className="text-gray-600 mt-3 max-w-3xl">
              Drive your own or assigned vehicle, earn
              by driving customers&apos; vehicles, or do
              both. You do not need to own a vehicle to
              apply for Driver Hire.
            </p>

            <div className="bg-white border rounded-2xl p-5 mt-6">
              <b>Mobile-first driver account</b>

              <p className="text-sm text-gray-600 mt-1">
                Your mobile number becomes your Fountain
                Ride driver ID. Email is optional. After
                applying, you&apos;ll privately create
                your Driver PIN and Wallet PIN.
              </p>
            </div>

            {/* WORK MODE */}

            <section data-wizard-step="1" className={wizardStep === 1 ? "mt-9" : "hidden"}>
              <p className="font-black text-lg">
                How do you want to earn?
              </p>

              <p className="text-sm text-gray-500 mt-1">
                You can change your availability later
                from your driver dashboard.
              </p>

              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <button
                  type="button"
                  onClick={() =>
                    setWorkMode('passenger_trips')
                  }
                  className={`fr-choice p-6 rounded-3xl border text-left ${
                    workMode === 'passenger_trips'
                      ? 'border-purple-700 bg-purple-50 ring-4 ring-purple-100'
                      : 'bg-white'
                  }`}
                >
                  <span className="text-3xl">
                    🚘
                  </span>

                  <b className="block text-xl mt-3">
                    Passenger Trips
                  </b>

                  <p className="text-sm text-gray-500 mt-2">
                    Use your own or assigned vehicle to
                    receive Fountain Ride trip requests.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setWorkMode('driver_hire')
                  }
                  className={`fr-choice p-6 rounded-3xl border text-left ${
                    workMode === 'driver_hire'
                      ? 'border-purple-700 bg-purple-50 ring-4 ring-purple-100'
                      : 'bg-white'
                  }`}
                >
                  <span className="text-3xl">
                    👨🏾‍✈️
                  </span>

                  <b className="block text-xl mt-3">
                    Driver Hire
                  </b>

                  <p className="text-sm text-gray-500 mt-2">
                    Get paid to drive customers&apos;
                    vehicles. You don&apos;t need to own
                    a car.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setWorkMode('both')
                  }
                  className={`fr-choice p-6 rounded-3xl border text-left ${
                    workMode === 'both'
                      ? 'border-purple-700 bg-purple-50 ring-4 ring-purple-100'
                      : 'bg-white'
                  }`}
                >
                  <span className="text-3xl">
                    🔄
                  </span>

                  <b className="block text-xl mt-3">
                    Both
                  </b>

                  <p className="text-sm text-gray-500 mt-2">
                    Receive passenger trips and Driver
                    Hire opportunities when available.
                  </p>
                </button>
              </div>
            </section>

            {/* PERSONAL INFORMATION */}

            <section data-wizard-step="2" className={wizardStep === 2 ? "mt-10" : "hidden"}>
              <h2 className="text-2xl font-black">
                About you
              </h2>

              <div className="grid md:grid-cols-2 gap-4 mt-5">
                <label>
                  <span className="text-sm font-black">
                    Full legal name
                  </span>

                  <input
                    name="name"
                    required
                    className="input mt-2"
                    placeholder="Your full name"
                  />
                </label>

                <label>
                  <span className="text-sm font-black">
                    Mobile number
                  </span>

                  <input
                    name="phone"
                    required
                    className="input mt-2"
                    placeholder="0803 000 0000"
                  />
                </label>

                <label>
                  <span className="text-sm font-black">
                    Email (optional)
                  </span>

                  <input
                    name="email"
                    type="email"
                    className="input mt-2"
                    placeholder="For account recovery"
                  />
                </label>

                <label>
                  <span className="text-sm font-black">
                    Home city
                  </span>

                  <input
                    name="city"
                    className="input mt-2"
                    placeholder="e.g. Ibadan"
                  />
                </label>

                <label>
                  <span className="text-sm font-black">
                    Home state
                  </span>

                  <select
                    className="input mt-2"
                    value={state}
                    onChange={(e) =>
                      setState(e.target.value)
                    }
                  >
                    {NIGERIA_STATES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            {/* DRIVER HIRE */}

            {wantsDriverHire && (
              <section data-wizard-step="3" className={wizardStep === 3 ? "mt-10 border-t pt-9" : "hidden"}>
                <p className="text-purple-700 font-black">
                  Driver Hire
                </p>

                <h2 className="text-2xl font-black mt-1">
                  Tell us about your driving experience
                </h2>

                <p className="text-gray-500 mt-2">
                  These details help us match you with
                  customers who need someone to drive
                  their vehicle.
                </p>

                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <label>
                    <span className="text-sm font-black">
                      Years of driving experience
                    </span>

                    <input
                      name="experience"
                      required
                      type="number"
                      min="0"
                      max="70"
                      className="input mt-2"
                      placeholder="e.g. 5"
                    />
                  </label>
                </div>

                <div className="mt-7">
                  <p className="font-black">
                    What can you drive?
                  </p>

                  <div className="flex flex-wrap gap-3 mt-3">
                    <button
                      type="button"
                      onClick={() =>
                        setAutomatic(!automatic)
                      }
                      className={`px-5 py-3 rounded-2xl border font-bold ${
                        automatic
                          ? 'bg-purple-700 text-white border-purple-700'
                          : 'bg-white'
                      }`}
                    >
                      {automatic ? '✓ ' : ''}
                      Automatic
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setManual(!manual)
                      }
                      className={`px-5 py-3 rounded-2xl border font-bold ${
                        manual
                          ? 'bg-purple-700 text-white border-purple-700'
                          : 'bg-white'
                      }`}
                    >
                      {manual ? '✓ ' : ''}
                      Manual
                    </button>
                  </div>
                </div>

                <div className="mt-8">
                  <p className="font-black">
                    What Driver Hire jobs interest you?
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    Choose as many as you like.
                  </p>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                    {hireJobs.map((job) => {
                      const selected =
                        selectedHireJobs.includes(job.id)

                      return (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() =>
                            toggleHireJob(job.id)
                          }
                          className={`p-4 rounded-2xl border text-left ${
                            selected
                              ? 'border-purple-700 bg-purple-50 ring-2 ring-purple-100'
                              : 'bg-white'
                          }`}
                        >
                          <b>
                            {selected ? '✓ ' : ''}
                            {job.title}
                          </b>

                          <p className="text-xs text-gray-500 mt-1">
                            {job.description}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-6 bg-purple-50 border border-purple-100 rounded-2xl p-5">
                  <b>
                    You don&apos;t need your own vehicle.
                  </b>

                  <p className="text-sm text-gray-600 mt-1">
                    Driver Hire opportunities involve
                    driving a customer&apos;s or
                    organisation&apos;s vehicle.
                    Eligibility is subject to Fountain
                    Ride verification.
                  </p>
                </div>
              </section>
            )}

            {/* PASSENGER TRIPS */}

            {wantsPassengerTrips && (
              <section data-wizard-step="3" className={wizardStep === 3 ? "mt-10 border-t pt-9" : "hidden"}>
                <p className="text-purple-700 font-black">
                  Passenger Trips
                </p>

                <h2 className="text-2xl font-black mt-1">
                  Tell us about your vehicle
                </h2>

                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() =>
                      setType('private')
                    }
                    className={`fr-choice p-6 rounded-3xl border text-left ${
                      type === 'private'
                        ? 'border-purple-700 bg-purple-50 ring-4 ring-purple-100'
                        : 'bg-white'
                    }`}
                  >
                    <b className="block text-xl">
                      Private driver
                    </b>

                    <p className="text-sm text-gray-500 mt-2">
                      Independent passenger-trip
                      opportunities.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setType('commercial')
                    }
                    className={`fr-choice p-6 rounded-3xl border text-left ${
                      type === 'commercial'
                        ? 'border-purple-700 bg-purple-50 ring-4 ring-purple-100'
                        : 'bg-white'
                    }`}
                  >
                    <b className="block text-xl">
                      Commercial / park driver
                    </b>

                    <p className="text-sm text-gray-500 mt-2">
                      Join Fountain Ride Mobile Garage™.
                    </p>
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-7">
                  <label>
                    <span className="text-sm font-black">
                      Vehicle make
                    </span>

                    <input
                      name="make"
                      required
                      className="input mt-2"
                      placeholder="e.g. Toyota"
                    />
                  </label>

                  <label>
                    <span className="text-sm font-black">
                      Vehicle model
                    </span>

                    <input
                      name="model"
                      required
                      className="input mt-2"
                      placeholder="e.g. Sienna"
                    />
                  </label>

                  <label>
                    <span className="text-sm font-black">
                      Vehicle year
                    </span>

                    <input
                      name="year"
                      required
                      type="number"
                      className="input mt-2"
                      placeholder="e.g. 2010"
                    />
                  </label>

                  <label>
                    <span className="text-sm font-black">
                      Registration number
                    </span>

                    <input
                      name="plate"
                      required
                      className="input mt-2"
                      placeholder="e.g. ABC 123 XY"
                    />
                  </label>

                  {type === 'commercial' && (
                    <div>
                      <span className="text-sm font-black">
                        Registered Mobile Garage™
                      </span>

                      {!newPark ? (
                        <>
                          <select
                            className="input mt-2"
                            value={parkId}
                            onChange={(e) =>
                              setParkId(e.target.value)
                            }
                            required
                          >
                            <option value="">
                              Choose a verified garage
                            </option>

                            {garages.map((g) => (
                              <option
                                key={g.id}
                                value={g.id}
                              >
                                {g.name}
                                {g.city
                                  ? ` — ${g.city}`
                                  : ''}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            className="text-sm text-purple-700 font-bold mt-2"
                            onClick={() =>
                              setNewPark(true)
                            }
                          >
                            My park is not listed →
                          </button>
                        </>
                      ) : (
                        <>
                          <input
                            name="park"
                            className="input mt-2"
                            required
                            placeholder="Park / garage name"
                          />

                          <button
                            type="button"
                            className="text-sm text-purple-700 font-bold mt-2"
                            onClick={() =>
                              setNewPark(false)
                            }
                          >
                            Choose existing garage instead
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <label className="flex gap-3 items-start mt-6 bg-white border p-4 rounded-2xl">
                  <input
                    type="checkbox"
                    name="unverified"
                    defaultChecked
                  />

                  <span>
                    <b>
                      Accept requests from unverified
                      riders
                    </b>

                    <span className="block text-sm text-gray-500 mt-1">
                      You can change this preference
                      later.
                    </span>
                  </span>
                </label>
              </section>
            )}

            {wizardStep === 4 && (
              <section className="mt-8 rounded-3xl border border-purple-100 bg-white p-5 sm:p-7">
                <p className="text-xs font-black uppercase tracking-widest text-purple-700">
                  Final step
                </p>
                <h2 className="mt-2 text-2xl font-black text-gray-950">
                  Review your application
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Check your information before continuing to secure account setup.
                </p>

                <div className="mt-6 space-y-3">
                  {[
                    ['Service', workMode === 'driver_hire' ? 'Driver Hire' : workMode === 'both' ? 'Driver Hire and Passenger Trips' : 'Passenger Trips'],
                    ['Full name', reviewDetails.name],
                    ['Mobile number', reviewDetails.phone],
                    ['Email', reviewDetails.email || 'Not provided'],
                    ['Location', [reviewDetails.city, state].filter(Boolean).join(', ')],
                    ...(wantsDriverHire ? [
                      ['Driving experience', `${reviewDetails.experience} years`],
                      ['Transmission', [automatic && 'Automatic', manual && 'Manual'].filter(Boolean).join(', ')],
                      ['Preferred jobs', selectedHireJobs.join(', ')],
                    ] : []),
                    ...(wantsPassengerTrips ? [
                      ['Vehicle', [reviewDetails.make, reviewDetails.model, reviewDetails.year].filter(Boolean).join(' ')],
                      ['Registration number', reviewDetails.plate],
                      ['Driver category', type === 'commercial' ? 'Commercial / park driver' : 'Private driver'],
                      ...(type === 'commercial' ? [
                        ['Mobile Garage', newPark ? reviewDetails.park : garages.find(g => g.id === parkId)?.name || 'Not selected'],
                      ] : []),
                    ] : []),
                  ].map(([label, value]) => (
                    <div key={label} className="flex flex-col gap-1 border-b border-gray-100 pb-3 sm:flex-row sm:justify-between sm:gap-5">
                      <span className="text-sm text-gray-500">{label}</span>
                      <span className="text-sm font-bold text-gray-950 sm:text-right">{value || 'Not provided'}</span>
                    </div>
                  ))}
                </div>

                <p className="mt-5 text-xs text-gray-500">
                  Select Back to correct any details. Your application will be submitted only when you choose Continue to secure account.
                </p>
              </section>
            )}
            {err && (
              <p className="text-red-600 mt-6 text-sm font-bold">
                {err}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              {wizardStep > 1 ? (
                <button
                  type="button"
                  onClick={previousWizardStep}
                  className="rounded-2xl border border-gray-200 bg-white px-6 py-4 font-black text-gray-800"
                >
                  Back
                </button>
              ) : (
                <span />
              )}

              {wizardStep < 4 ? (
                <button
                  type="button"
                  onClick={nextWizardStep}
                  className="rounded-2xl bg-purple-700 px-7 py-4 font-black text-white"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-2xl bg-purple-700 px-7 py-4 font-black text-white disabled:opacity-50"
                >
                  {busy ? 'Creating account setup…' : 'Continue to secure account →'}
                </button>
              )}
            </div>

            <p className="text-sm mt-4">
              Already registered?{' '}
              <a
                href="/driver/login"
                className="text-purple-700 font-black"
              >
                Sign in with mobile number
              </a>
            </p>
          </div>
        </form>
      </main>
    </>
  )
}
