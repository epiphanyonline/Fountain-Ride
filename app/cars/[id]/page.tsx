'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { formatNaira } from '../../../lib/format'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

export default function CarDetailsPage() {
  const params = useParams()
  const carId = params.id as string

  const whatsappNumber = '2348168839382'

  const [car, setCar] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    fetchCar()
    fetchBookedDates()
  }, [])

  async function fetchCar() {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .eq('id', carId)
      .single()

    if (error) console.error(error)

    setCar(data)
    setLoading(false)
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

  const totalDays = useMemo(() => {
    if (!pickupDate || !returnDate) return 0

    const diff = returnDate.getTime() - pickupDate.getTime()

    if (diff < 0) return 0

    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [pickupDate, returnDate])

  const totalAmount = car ? totalDays * Number(car.daily_rate || 0) : 0

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
    })

    if (bookingError) {
      console.error(bookingError)
      setMessage('Could not submit booking. Please try again.')
      setSubmitting(false)
      return
    }

    const whatsappMessage = encodeURIComponent(
      `Hello, I just submitted a car hire booking request.

Booking Ref: ${bookingRef}
Brand: Epiphany Ride / Fountain Ride
Car: ${car.name}
Pickup Date: ${pickupDateStr}
Pickup Time: ${pickupTime}
Return Date: ${returnDateStr}
Return Time: ${returnTime}
Pickup Location: ${pickupLocation.trim()}
Name: ${fullName.trim()}
Phone: ${phone.trim()}
WhatsApp: ${whatsapp.trim() || phone.trim()}
Total: ${formatNaira(totalAmount)}

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
    setSubmitting(false)

    fetchBookedDates()
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!car) return <div className="p-6">Car not found</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 grid md:grid-cols-2 gap-8">
        <div>
          <img
            src={car.image_url}
            alt={car.name}
            className="w-full h-80 object-cover rounded-3xl shadow"
          />

          <h1 className="text-3xl font-bold mt-6">{car.name}</h1>

          <p className="text-gray-500 mt-2">
            {car.transmission} • {car.fuel_type} • {car.seats} seats
          </p>

          <p className="text-2xl font-bold mt-4">
            {formatNaira(car.daily_rate)} / day
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow p-6">
          <h2 className="text-2xl font-semibold">Reserve Your Ride</h2>

          <p className="text-gray-500 mt-1">
            Select pickup and return dates. Unavailable dates are blocked.
          </p>

          <div className="mt-4">
            <DatePicker
              selectsRange
              startDate={pickupDate}
              endDate={returnDate}
              onChange={(update: [Date | null, Date | null]) => {
                const [start, end] = update

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
              minDate={new Date()}
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
              Total: <b>{formatNaira(totalAmount)}</b>
            </p>
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