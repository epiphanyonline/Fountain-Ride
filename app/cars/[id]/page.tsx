'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { formatNaira } from '../../../lib/format'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const EXTRA_HOUR_RATE = 15000

const cityPackageLabels: Record<string, string> = {
  drop_off_only: 'City-to-city drop off only',
  city_to_city_12hrs: 'City-to-city 12 hours',
  city_to_city_24hrs: 'City-to-city 24 hours',
}

function getCarImages(car: any): string[] {
  if (Array.isArray(car.image_urls) && car.image_urls.length > 0) {
    return car.image_urls.filter(Boolean)
  }

  if (car.image_url) return [car.image_url]

  return []
}

function getMinimumPickupDate() {
  const date = new Date()
  date.setDate(date.getDate() + 2)
  date.setHours(0, 0, 0, 0)
  return date
}

export default function CarDetailsPage() {
  const params = useParams()
  const carId = params.id as string
  const whatsappNumber = '2348168839382'

  const [car, setCar] = useState<any>(null)
  const [routePrices, setRoutePrices] = useState<any[]>([])
  const [selectedImage, setSelectedImage] = useState('')
  const [loading, setLoading] = useState(true)

  const [tripType, setTripType] = useState('daily_hire')
  const [cityPackageType, setCityPackageType] = useState('drop_off_only')
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [extraHours, setExtraHours] = useState('0')

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ])

  const [pickupDate, returnDate] = dateRange

  const [pickupTime, setPickupTime] = useState('')
  const [returnTime, setReturnTime] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [pickupLocation, setPickupLocation] = useState('')
  const [bookedRanges, setBookedRanges] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [whatsappLink, setWhatsappLink] = useState('')

  const minimumPickupDate = getMinimumPickupDate()

  useEffect(() => {
    fetchCar()
    fetchBookedDates()
    fetchRoutePrices()
  }, [])

  async function fetchCar() {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .eq('id', carId)
      .single()

    if (error) console.error(error)

    setCar(data)

    const images = getCarImages(data)
    setSelectedImage(images[0] || '')

    setLoading(false)
  }

  async function fetchRoutePrices() {
    const { data, error } = await supabase
      .from('route_prices')
      .select('*')
      .eq('is_active', true)
      .order('destination', { ascending: true })

    if (error) {
      console.error(error)
      setRoutePrices([])
      return
    }

    setRoutePrices(data || [])
  }

  async function fetchBookedDates() {
    const { data, error } = await supabase
      .from('bookings')
      .select('pickup_date, return_date')
      .eq('car_id', carId)
      .in('status', ['pending', 'confirmed'])

    if (error) console.error(error)

    setBookedRanges(data || [])
  }

  function isDateBooked(date: Date) {
    return bookedRanges.some((range) => {
      const start = new Date(range.pickup_date)
      const end = new Date(range.return_date)

      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)

      return date >= start && date <= end
    })
  }

  function rangeContainsBookedDate(start: Date, end: Date) {
    const current = new Date(start)
    current.setHours(0, 0, 0, 0)

    const finalDate = new Date(end)
    finalDate.setHours(0, 0, 0, 0)

    while (current <= finalDate) {
      if (isDateBooked(new Date(current))) return true
      current.setDate(current.getDate() + 1)
    }

    return false
  }

  const filteredRoutePrices = useMemo(() => {
    return routePrices.filter((route) => route.package_type === cityPackageType)
  }, [routePrices, cityPackageType])

  const selectedRoute = useMemo(() => {
    return routePrices.find((route) => route.id === selectedRouteId)
  }, [routePrices, selectedRouteId])

  const priceOnRequest =
    tripType !== 'daily_hire' && selectedRoute?.price_on_request === true

  const totalDays = useMemo(() => {
    if (!pickupDate || !returnDate) return 0

    const diff = returnDate.getTime() - pickupDate.getTime()

    if (diff < 0) return 0

    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [pickupDate, returnDate])

  const extraHoursAmount = Number(extraHours || 0) * EXTRA_HOUR_RATE

  const baseAmount =
    tripType !== 'daily_hire'
      ? priceOnRequest
        ? 0
        : Number(selectedRoute?.price || 0)
      : car
        ? totalDays * Number(car.daily_rate || 0)
        : 0

  const totalAmount = priceOnRequest ? 0 : baseAmount + extraHoursAmount
  const carImages = car ? getCarImages(car) : []

  async function submitBooking() {
    setSubmitting(true)
    setMessage('')
    setWhatsappLink('')

    if (
      !pickupDate ||
      !returnDate ||
      !pickupTime ||
      !returnTime ||
      !fullName ||
      !phone ||
      !pickupLocation
    ) {
      setMessage('Please fill all required fields.')
      setSubmitting(false)
      return
    }

    if (pickupDate < minimumPickupDate) {
      setMessage('Bookings require at least 48 hours advance notice.')
      setSubmitting(false)
      return
    }

    if (tripType !== 'daily_hire' && !selectedRoute) {
      setMessage('Please select your city-to-city route.')
      setSubmitting(false)
      return
    }

    if (totalDays <= 0) {
      setMessage('Invalid date selection.')
      setSubmitting(false)
      return
    }

    if (rangeContainsBookedDate(pickupDate, returnDate)) {
      setMessage('Selected range includes unavailable dates.')
      setSubmitting(false)
      return
    }

    const pickupDateStr = pickupDate.toISOString().split('T')[0]
    const returnDateStr = returnDate.toISOString().split('T')[0]

    const { data: isAvailable, error: availabilityError } = await supabase.rpc(
      'check_car_availability',
      {
        p_car_id: carId,
        p_pickup_date: pickupDateStr,
        p_return_date: returnDateStr,
      }
    )

    if (availabilityError) {
      console.error(availabilityError)
      setMessage('Could not check availability. Please try again.')
      setSubmitting(false)
      return
    }

    if (!isAvailable) {
      setMessage('This car is not available for selected dates.')
      setSubmitting(false)
      return
    }

    const bookingRef = `FR-${Date.now()}`

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        full_name: fullName.trim(),
        phone: phone.trim(),
        whatsapp_number: whatsapp.trim() || phone.trim(),
      })
      .select()
      .single()

    if (customerError || !customer) {
      console.error(customerError)
      setMessage('Could not save customer details.')
      setSubmitting(false)
      return
    }

    const { error: bookingError } = await supabase.from('bookings').insert({
      booking_ref: bookingRef,
      car_id: carId,
      customer_id: customer.id,
      pickup_date: pickupDateStr,
      pickup_time: pickupTime,
      return_date: returnDateStr,
      return_time: returnTime,
      pickup_location: pickupLocation.trim(),
      return_location: pickupLocation.trim(),
      total_days: totalDays,
      daily_rate: car.daily_rate,
      total_amount: totalAmount,
      status: 'pending',
      trip_type: tripType,
      city_package_type: tripType !== 'daily_hire' ? cityPackageType : null,
      route_origin: tripType !== 'daily_hire' ? selectedRoute.origin : null,
      route_destination:
        tripType !== 'daily_hire' ? selectedRoute.destination : null,
      route_price:
        tripType !== 'daily_hire' && !priceOnRequest
          ? selectedRoute.price
          : 0,
      price_on_request: priceOnRequest,
      extra_hours: Number(extraHours || 0),
      extra_hour_rate: EXTRA_HOUR_RATE,
    })

    if (bookingError) {
      console.error(bookingError)
      setMessage('Could not submit booking. Please try again.')
      setSubmitting(false)
      return
    }

    const packageText =
      tripType === 'daily_hire'
        ? 'Daily hire within city'
        : cityPackageLabels[cityPackageType]

    const routeText =
      tripType !== 'daily_hire' && selectedRoute
        ? `${selectedRoute.origin} to ${selectedRoute.destination}`
        : 'Daily hire'

    const priceText = priceOnRequest
      ? 'Price to be confirmed on WhatsApp'
      : formatNaira(totalAmount)

    const whatsappMessage = encodeURIComponent(
      `Hello, I just submitted a car hire booking request.

Booking Ref: ${bookingRef}
Brand: Epiphany Ride / Fountain Ride
Car: ${car.name}
Trip Type: ${packageText}
Route: ${routeText}
Pickup Date: ${pickupDateStr}
Pickup Time: ${pickupTime}
Return Date: ${returnDateStr}
Return Time: ${returnTime}
Pickup Location: ${pickupLocation.trim()}
Name: ${fullName.trim()}
Phone: ${phone.trim()}
WhatsApp: ${whatsapp.trim() || phone.trim()}
Extra Hours: ${extraHours || 0}
Extra Hour Rate: ${formatNaira(EXTRA_HOUR_RATE)}
Price: ${priceText}

Please confirm my booking.`
    )

    setWhatsappLink(`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`)
    setMessage(
      `Booking received. Ref: ${bookingRef}. Please send the details to WhatsApp for faster confirmation.`
    )

    setDateRange([null, null])
    setPickupTime('')
    setReturnTime('')
    setFullName('')
    setPhone('')
    setWhatsapp('')
    setPickupLocation('')
    setTripType('daily_hire')
    setCityPackageType('drop_off_only')
    setSelectedRouteId('')
    setExtraHours('0')
    setSubmitting(false)

    fetchBookedDates()
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!car) return <div className="p-6">Car not found</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6 grid md:grid-cols-2 gap-8">
        <div>
          <div className="bg-white rounded-3xl shadow overflow-hidden">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt={car.name}
                className="w-full h-80 md:h-[28rem] object-cover"
              />
            ) : (
              <div className="w-full h-80 md:h-[28rem] bg-gray-100 flex items-center justify-center">
                <p className="text-gray-400 font-semibold">
                  Image coming soon
                </p>
              </div>
            )}
          </div>

          {carImages.length > 1 && (
            <div className="grid grid-cols-4 md:grid-cols-5 gap-3 mt-4">
              {carImages.map((url: string, index: number) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(url)}
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
              ))}
            </div>
          )}

          <div className="mt-6 bg-white rounded-3xl shadow p-6">
            <p className="text-sm font-bold text-purple-700">
              Chauffeur-driven car hire
            </p>

            <h1 className="text-3xl font-bold mt-2">{car.name}</h1>

            <p className="text-gray-500 mt-2">
              {car.transmission || 'Automatic'} • {car.fuel_type || 'Petrol'} •{' '}
              {car.seats || 5} seats
            </p>

            <p className="text-2xl font-bold mt-4">
              {formatNaira(car.daily_rate)} / day
            </p>

            <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
              <p className="font-bold">Important booking notice</p>
              <p className="mt-1">
                48 hours advance notice required. Daily hire is 8am–8pm.
                Extra hour is {formatNaira(EXTRA_HOUR_RATE)} per hour.
              </p>
            </div>

            {car.description && (
              <p className="text-gray-600 mt-4 leading-relaxed">
                {car.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
              <div className="bg-purple-50 rounded-2xl p-4">
                <p className="font-bold">Driver included</p>
                <p className="text-gray-500 mt-1">Professional service</p>
              </div>

              <div className="bg-purple-50 rounded-2xl p-4">
                <p className="font-bold">Daily hire</p>
                <p className="text-gray-500 mt-1">8am to 8pm</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow p-6 h-fit">
          <h2 className="text-2xl font-semibold">Reserve Your Ride</h2>

          <p className="text-gray-500 mt-1">
            Select pickup and return dates. Unavailable dates are blocked.
          </p>

          <div className="mt-4 rounded-2xl bg-purple-50 p-4 text-sm">
            <p className="font-bold text-purple-900">Booking policy</p>
            <p className="text-gray-600 mt-1">
              Please book at least 48 hours ahead. Extra hours are charged at{' '}
              <b>{formatNaira(EXTRA_HOUR_RATE)}</b> per hour.
            </p>
          </div>

          <div className="mt-5">
            <label className="text-sm font-bold text-gray-700">Trip type</label>

            <select
              value={tripType}
              onChange={(e) => {
                setTripType(e.target.value)
                setSelectedRouteId('')
                setMessage('')
                setWhatsappLink('')
              }}
              className="border p-3 rounded-xl w-full mt-2"
            >
              <option value="daily_hire">Daily hire within city</option>
              <option value="drop_off_only">City-to-city drop off only</option>
              <option value="city_to_city_12hrs">City-to-city 12 hours</option>
              <option value="city_to_city_24hrs">City-to-city 24 hours</option>
            </select>
          </div>

          {tripType !== 'daily_hire' && (
            <div className="mt-4">
              <label className="text-sm font-bold text-gray-700">
                Select route
              </label>

              <select
                value={selectedRouteId}
                onChange={(e) => {
                  setSelectedRouteId(e.target.value)
                  setMessage('')
                  setWhatsappLink('')
                }}
                className="border p-3 rounded-xl w-full mt-2"
              >
                <option value="">Choose destination</option>
                {routePrices
                  .filter((route: any) => route.package_type === tripType)
                  .map((route: any) => (
                    <option key={route.id} value={route.id}>
                      {route.origin} to {route.destination} —{' '}
                      {route.price_on_request
                        ? 'Complete booking via WhatsApp for actual price'
                        : formatNaira(route.price)}
                    </option>
                  ))}
              </select>

              {selectedRoute && (
                <div className="mt-3 bg-gray-50 rounded-2xl p-4">
                  <p className="font-bold">
                    {selectedRoute.origin} to {selectedRoute.destination}
                  </p>

                  {selectedRoute.price_on_request ? (
                    <div>
                      <p className="text-lg font-black mt-1 text-purple-700">
                        Complete booking via WhatsApp for actual price
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Pricing may depend on exact location, vehicle type,
                        waiting time, and trip details.
                      </p>
                    </div>
                  ) : (
                    <p className="text-2xl font-black mt-1">
                      {formatNaira(selectedRoute.price)}
                    </p>
                  )}

                  {selectedRoute.notes && (
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedRoute.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-4">
            <DatePicker
              selectsRange
              startDate={pickupDate}
              endDate={returnDate}
              onChange={(update: [Date | null, Date | null]) => {
                const [start, end] = update

                if (start && start < minimumPickupDate) {
                  setMessage('Bookings require at least 48 hours advance notice.')
                  setDateRange([null, null])
                  return
                }

                if (start && end && rangeContainsBookedDate(start, end)) {
                  setMessage(
                    'Selected range includes unavailable dates. Please choose another range.'
                  )
                  setDateRange([null, null])
                  return
                }

                setMessage('')
                setWhatsappLink('')
                setDateRange(update)
              }}
              filterDate={(date: Date) => !isDateBooked(date)}
              minDate={minimumPickupDate}
              placeholderText="Select pickup and return dates"
              className="border p-3 rounded-xl w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <input
              type="time"
              className="border p-3 rounded-xl"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
            />

            <input
              type="time"
              className="border p-3 rounded-xl"
              value={returnTime}
              onChange={(e) => setReturnTime(e.target.value)}
            />
          </div>

          <input
            className="border p-3 rounded-xl w-full mt-4"
            placeholder="Pickup location"
            value={pickupLocation}
            onChange={(e) => setPickupLocation(e.target.value)}
          />

          <input
            type="number"
            min="0"
            className="border p-3 rounded-xl w-full mt-4"
            placeholder="Extra hours optional"
            value={extraHours}
            onChange={(e) => setExtraHours(e.target.value)}
          />

          <input
            className="border p-3 rounded-xl w-full mt-4"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
            className="border p-3 rounded-xl w-full mt-4"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <input
            className="border p-3 rounded-xl w-full mt-4"
            placeholder="WhatsApp optional"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />

          <div className="bg-gray-50 rounded-2xl p-4 mt-5">
            <p>
              Total days: <b>{totalDays}</b>
            </p>

            <p>
              Base price:{' '}
              <b>
                {priceOnRequest
                  ? 'To be confirmed on WhatsApp'
                  : tripType !== 'daily_hire'
                    ? selectedRoute
                      ? formatNaira(selectedRoute.price)
                      : formatNaira(0)
                    : formatNaira(baseAmount)}
              </b>
            </p>

            {!priceOnRequest && (
              <>
                <p>
                  Extra hours:{' '}
                  <b>
                    {extraHours || 0} × {formatNaira(EXTRA_HOUR_RATE)}
                  </b>
                </p>

                <p className="text-xl mt-2">
                  Total: <b>{formatNaira(totalAmount)}</b>
                </p>
              </>
            )}

            {priceOnRequest && (
              <p className="text-sm text-purple-700 font-semibold mt-2">
                Please submit your request and complete pricing on WhatsApp.
              </p>
            )}
          </div>

          <button
            onClick={submitBooking}
            disabled={submitting}
            className="mt-5 w-full bg-purple-700 hover:bg-purple-800 disabled:bg-gray-400 text-white py-3 rounded-2xl font-semibold"
          >
            {submitting ? 'Submitting...' : 'Submit Booking'}
          </button>

          {message && (
            <p className="mt-4 text-sm font-medium text-purple-700">
              {message}
            </p>
          )}

          {whatsappLink && (
            <a href={whatsappLink} target="_blank">
              <button className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-2xl font-semibold">
                Send Booking to WhatsApp
              </button>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}