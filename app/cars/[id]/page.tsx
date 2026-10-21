'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { formatNaira } from '../../../lib/format'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

function getCarImages(car: any): string[] {
  if (Array.isArray(car?.image_urls) && car.image_urls.length > 0) {
    return car.image_urls.filter(Boolean)
  }

  if (car?.image_url) return [car.image_url]

  return []
}

function formatDateForApi(date: Date | null) {
  if (!date) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getMinimumPickupDate() {
  const date = new Date()
  date.setDate(date.getDate() + 2)
  date.setHours(0, 0, 0, 0)
  return date
}

export default function CarDetailsPage() {
  const params = useParams()
  const router = useRouter()

  const carId = params.id as string

  const [car, setCar] = useState<any>(null)
  const [selectedImage, setSelectedImage] = useState('')
  const [loading, setLoading] = useState(true)

  const [dateRange, setDateRange] = useState<
    [Date | null, Date | null]
  >([null, null])

  const [startDate, endDate] = dateRange

  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const [pickupAddress, setPickupAddress] = useState('')
  const [destinationAddress, setDestinationAddress] =
    useState('')

  const [tripType, setTripType] = useState('local')

  const [passengerCount, setPassengerCount] =
    useState('')

  const [specialRequirements, setSpecialRequirements] =
    useState('')

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const minimumPickupDate = useMemo(
    () => getMinimumPickupDate(),
    []
  )

  const carImages = useMemo(
    () => (car ? getCarImages(car) : []),
    [car]
  )

  useEffect(() => {
    fetchCar()
  }, [carId])

  async function fetchCar() {
    setLoading(true)

    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .eq('id', carId)
      .single()

    if (error) {
      console.error(error)
      setCar(null)
      setLoading(false)
      return
    }

    setCar(data)

    const images = getCarImages(data)
    setSelectedImage(images[0] || '')

    setLoading(false)
  }

  async function submitQuoteRequest() {
    setMessage('')

    if (
      !startDate ||
      !endDate ||
      !startTime ||
      !pickupAddress.trim() ||
      !destinationAddress.trim() ||
      !customerName.trim() ||
      !customerPhone.trim()
    ) {
      setMessage(
        'Please complete all required journey and contact details.'
      )
      return
    }

    if (startDate < minimumPickupDate) {
      setMessage(
        'Vehicle hire requests require at least 48 hours advance notice.'
      )
      return
    }

    if (endDate < startDate) {
      setMessage('Return date cannot be before the pickup date.')
      return
    }

    const startDateString = formatDateForApi(startDate)
    const endDateString = formatDateForApi(endDate)

    setSubmitting(true)

    try {
            const response = await fetch(
        '/api/marketplace/vehicle-hire',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            carId,

            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),

            customerEmail:
              customerEmail.trim() || null,

            pickupAddress: pickupAddress.trim(),
            destinationAddress:
              destinationAddress.trim(),

            startDate: startDateString,
            startTime,

            endDate: endDateString,
            endTime: endTime || null,

            tripType,

            passengerCount:
              passengerCount === ''
                ? null
                : Number(passengerCount),

            specialRequirements:
              specialRequirements.trim() || null,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        setMessage(
          result?.error ||
            'Unable to submit your quotation request.'
        )
        setSubmitting(false)
        return
      }

      /*
       * Keep the private access token on this device.
       *
       * We will use it on the request page in the next step.
       */
      localStorage.setItem(
        `vehicleHireAccess:${result.id}`,
        result.accessToken
      )

      /*
       * Send the customer to their private request page.
       *
       * We will create this page immediately after this build
       * passes.
       */
      router.push(
        `/vehicle-hire/requests/${result.id}`
      )
    } catch (error) {
      console.error(error)

      setMessage(
        'Something went wrong while submitting your request.'
      )

      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f4fb]">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="bg-white rounded-3xl border p-8">
            <p className="font-semibold text-gray-600">
              Loading vehicle...
            </p>
          </div>
        </div>
      </main>
    )
  }

  if (!car) {
    return (
      <main className="min-h-screen bg-[#f7f4fb]">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <div className="bg-white rounded-3xl border p-8 text-center">
            <h1 className="text-2xl font-black">
              Vehicle not found
            </h1>

            <Link
              href="/cars"
              className="inline-block mt-5 bg-purple-700 text-white px-6 py-3 rounded-2xl font-bold"
            >
              Browse Vehicles
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f4fb] text-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        <Link
          href="/cars"
          className="inline-flex items-center text-sm font-bold text-purple-700 hover:text-purple-900 mb-5"
        >
          ← Back to vehicles
        </Link>

        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-7">
          {/* VEHICLE */}
          <section>
            <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
              <div className="h-[320px] md:h-[480px] bg-gray-100">
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt={car.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-gray-400 font-semibold">
                      Image coming soon
                    </p>
                  </div>
                )}
              </div>
            </div>

            {carImages.length > 1 && (
              <div className="grid grid-cols-4 md:grid-cols-5 gap-3 mt-4">
                {carImages.map(
                  (url: string, index: number) => (
                    <button
                      key={`${url}-${index}`}
                      type="button"
                      onClick={() =>
                        setSelectedImage(url)
                      }
                      className={`h-20 rounded-2xl overflow-hidden border-2 ${
                        selectedImage === url
                          ? 'border-purple-700'
                          : 'border-transparent'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`${car.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  )
                )}
              </div>
            )}

            <div className="bg-white rounded-[2rem] border shadow-sm p-6 md:p-8 mt-5">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-purple-100 text-purple-800 px-3 py-1 text-xs font-black">
                  DRIVER INCLUDED
                </span>

                <span className="rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-black">
                  CHAUFFEUR-DRIVEN
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-black mt-4">
                {car.name}
              </h1>

              <p className="text-gray-500 mt-2">
                {car.transmission || 'Automatic'} •{' '}
                {car.fuel_type || 'Petrol'} •{' '}
                {car.seats || 5} seats
              </p>

              <div className="mt-6">
                <p className="text-sm font-bold text-gray-500">
                  Guide price
                </p>

                <p className="text-3xl font-black mt-1">
                  From {formatNaira(car.daily_rate)}
                  <span className="text-base text-gray-500 font-semibold">
                    {' '}
                    / day
                  </span>
                </p>

                <p className="text-sm text-gray-500 mt-2 max-w-xl">
                  This is a guide price. Send your journey
                  details and the vehicle owner will provide
                  the quotation for your specific hire.
                </p>
              </div>

              <div className="mt-6 rounded-2xl bg-purple-50 border border-purple-100 p-5">
                <p className="font-black text-purple-950">
                  Vehicle + driver included
                </p>

                <p className="text-sm leading-6 text-gray-600 mt-2">
                  You are hiring this vehicle as a
                  chauffeur-driven service. The quotation you
                  receive covers the vehicle and its driver
                  together.
                </p>
              </div>

              {car.description && (
                <p className="text-gray-600 leading-7 mt-6">
                  {car.description}
                </p>
              )}

              <div className="grid sm:grid-cols-3 gap-3 mt-6">
                <Feature
                  title="Request a quote"
                  text="Tell the owner about your journey."
                />

                <Feature
                  title="Negotiate"
                  text="Discuss the quotation on Fountain Ride."
                />

                <Feature
                  title="Pay securely"
                  text="Pay after you agree the final price."
                />
              </div>
            </div>
          </section>

          {/* REQUEST FORM */}
          <section className="bg-white rounded-[2rem] border shadow-sm p-5 md:p-7 h-fit lg:sticky lg:top-6">
            <p className="text-xs font-black tracking-[0.18em] text-purple-700 uppercase">
              Vehicle Hire
            </p>

            <h2 className="text-2xl md:text-3xl font-black mt-2">
              Request a Quote
            </h2>

            <p className="text-gray-500 mt-2 leading-6">
              Tell us about your journey. No payment is
              required until you receive and accept a
              quotation.
            </p>

            <div className="mt-6">
              <label className="text-sm font-bold text-gray-700">
                Trip type
              </label>

              <select
                value={tripType}
                onChange={(e) =>
                  setTripType(e.target.value)
                }
                className="border border-gray-200 p-3.5 rounded-2xl w-full mt-2 bg-white"
              >
                <option value="local">
                  Local / within city
                </option>

                <option value="intercity">
                  City to city
                </option>

                <option value="event">
                  Event / special occasion
                </option>

                <option value="business">
                  Business / corporate
                </option>

                <option value="airport">
                  Airport transfer
                </option>

                <option value="other">
                  Other journey
                </option>
              </select>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <Field
                label="Pickup location"
                required
              >
                <input
                  value={pickupAddress}
                  onChange={(e) =>
                    setPickupAddress(e.target.value)
                  }
                  placeholder="Where should the driver pick you up?"
                  className="border border-gray-200 p-3.5 rounded-2xl w-full"
                />
              </Field>

              <Field
                label="Destination"
                required
              >
                <input
                  value={destinationAddress}
                  onChange={(e) =>
                    setDestinationAddress(
                      e.target.value
                    )
                  }
                  placeholder="Where are you going?"
                  className="border border-gray-200 p-3.5 rounded-2xl w-full"
                />
              </Field>
            </div>

            <div className="mt-4">
              <label className="text-sm font-bold text-gray-700">
                Hire dates{' '}
                <span className="text-red-500">*</span>
              </label>

              <DatePicker
                selectsRange
                startDate={startDate}
                endDate={endDate}
                onChange={(
                  update: [
                    Date | null,
                    Date | null,
                  ]
                ) => {
                  setDateRange(update)
                  setMessage('')
                }}
                minDate={minimumPickupDate}
                placeholderText="Select pickup and return dates"
                className="border border-gray-200 p-3.5 rounded-2xl w-full mt-2"
              />

              <p className="text-xs text-gray-500 mt-2">
                Please request your vehicle at least 48
                hours in advance.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <Field
                label="Pickup time"
                required
              >
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) =>
                    setStartTime(e.target.value)
                  }
                  className="border border-gray-200 p-3.5 rounded-2xl w-full"
                />
              </Field>

              <Field label="Expected return time">
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) =>
                    setEndTime(e.target.value)
                  }
                  className="border border-gray-200 p-3.5 rounded-2xl w-full"
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Number of passengers">
                <input
                  type="number"
                  min="1"
                  max={car.seats || undefined}
                  value={passengerCount}
                  onChange={(e) =>
                    setPassengerCount(e.target.value)
                  }
                  placeholder={`Up to ${
                    car.seats || 5
                  } passengers`}
                  className="border border-gray-200 p-3.5 rounded-2xl w-full"
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Anything else the owner should know?">
                <textarea
                  value={specialRequirements}
                  onChange={(e) =>
                    setSpecialRequirements(
                      e.target.value
                    )
                  }
                  placeholder="Luggage, multiple stops, event details, waiting time, special requirements..."
                  rows={4}
                  className="border border-gray-200 p-3.5 rounded-2xl w-full resize-none"
                />
              </Field>
            </div>

            <div className="border-t mt-7 pt-6">
              <h3 className="font-black text-lg">
                Your details
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                We'll use these details for this quotation
                request.
              </p>

              <div className="mt-4">
                <Field
                  label="Full name"
                  required
                >
                  <input
                    value={customerName}
                    onChange={(e) =>
                      setCustomerName(e.target.value)
                    }
                    placeholder="Your full name"
                    className="border border-gray-200 p-3.5 rounded-2xl w-full"
                  />
                </Field>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <Field
                  label="Mobile number"
                  required
                >
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) =>
                      setCustomerPhone(
                        e.target.value
                      )
                    }
                    placeholder="080..."
                    className="border border-gray-200 p-3.5 rounded-2xl w-full"
                  />
                </Field>

                <Field label="Email optional">
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) =>
                      setCustomerEmail(
                        e.target.value
                      )
                    }
                    placeholder="you@example.com"
                    className="border border-gray-200 p-3.5 rounded-2xl w-full"
                  />
                </Field>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-gray-50 p-4">
              <div className="flex gap-3">
                <div className="text-xl">✓</div>

                <div>
                  <p className="font-bold">
                    No payment now
                  </p>

                  <p className="text-sm text-gray-500 mt-1 leading-5">
                    Submit your request, receive the
                    owner's quotation, negotiate if
                    necessary, and pay only after you agree
                    the final price.
                  </p>
                </div>
              </div>
            </div>

            {message && (
              <div className="mt-5 rounded-2xl bg-red-50 border border-red-100 p-4">
                <p className="text-sm font-semibold text-red-700">
                  {message}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={submitQuoteRequest}
              disabled={submitting}
              className="mt-5 w-full bg-purple-700 hover:bg-purple-800 disabled:bg-gray-400 text-white py-4 rounded-2xl font-black text-base transition"
            >
              {submitting
                ? 'Sending request...'
                : 'Request Quote'}
            </button>

            <p className="text-center text-xs text-gray-400 mt-3">
              Vehicle and driver are included in the
              quotation.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-gray-700">
        {label}
        {required && (
          <span className="text-red-500"> *</span>
        )}
      </span>

      <div className="mt-2">{children}</div>
    </label>
  )
}

function Feature({
  title,
  text,
}: {
  title: string
  text: string
}) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="font-black text-sm">{title}</p>
      <p className="text-xs text-gray-500 mt-1 leading-5">
        {text}
      </p>
    </div>
  )
}
