'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { formatNaira } from '../../../lib/format'

export default function AdminBookingsPage() {
  const router = useRouter()

  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth')

    if (auth !== 'true') {
      router.push('/admin/login')
      return
    }

    fetchBookings()
  }, [router])

  async function fetchBookings() {
    setLoading(true)

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        cars (
          name,
          image_url
        ),
        customers (
          full_name,
          phone,
          whatsapp_number
        )
      `)
      .order('created_at', { ascending: false })

    if (error) console.error(error)

    setBookings(data || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)

    if (error) {
      alert('Could not update booking')
      console.error(error)
      return
    }

    fetchBookings()
  }

  function logout() {
    localStorage.removeItem('admin_auth')
    router.push('/admin/login')
  }

  if (loading) return <div className="p-6">Loading bookings...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-purple-700">Admin Bookings</p>
            <h1 className="text-3xl font-bold mt-2">Booking Requests</h1>
            <p className="text-gray-500 mt-2">
              Review, confirm, reject, or complete customer car hire bookings.
            </p>
          </div>

          <button
            onClick={logout}
            className="bg-gray-900 text-white px-5 py-3 rounded-2xl font-semibold"
          >
            Logout
          </button>
        </div>

        <div className="grid gap-5">
          {bookings.map((booking) => {
            const whatsappNumber =
              booking.customers?.whatsapp_number || booking.customers?.phone || ''

            const cleanWhatsapp = whatsappNumber.replace(/\D/g, '')

            const whatsappMessage = encodeURIComponent(
              `Hello ${booking.customers?.full_name || ''}, your car hire booking update:

Booking Ref: ${booking.booking_ref}
Car: ${booking.cars?.name}
Status: ${booking.status}
Pickup: ${booking.pickup_date} at ${booking.pickup_time}
Return: ${booking.return_date} at ${booking.return_time}
Location: ${booking.pickup_location}
Total: ${formatNaira(booking.total_amount)}

Epiphany Ride / Fountain Ride`
            )

            const whatsappUrl = cleanWhatsapp
              ? `https://wa.me/${cleanWhatsapp}?text=${whatsappMessage}`
              : ''

            return (
              <div
                key={booking.id}
                className="bg-white rounded-3xl shadow p-5 grid md:grid-cols-4 gap-5 items-center"
              >
                <div className="md:col-span-1">
                  <img
                    src={booking.cars?.image_url}
                    alt={booking.cars?.name || 'Car'}
                    className="w-full h-32 object-cover rounded-2xl bg-gray-100"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-semibold">
                      {booking.cars?.name}
                    </h2>

                    <span className="text-xs px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold">
                      {booking.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500">
                    Ref: {booking.booking_ref}
                  </p>

                  <p className="mt-3 font-medium">
                    {booking.customers?.full_name}
                  </p>

                  <p className="text-sm text-gray-500">
                    Phone: {booking.customers?.phone}
                  </p>

                  <p className="text-sm text-gray-500">
                    WhatsApp: {booking.customers?.whatsapp_number}
                  </p>

                  <p className="text-sm text-gray-500 mt-3">
                    Pickup: {booking.pickup_date} at {booking.pickup_time}
                  </p>

                  <p className="text-sm text-gray-500">
                    Return: {booking.return_date} at {booking.return_time}
                  </p>

                  <p className="text-sm text-gray-500">
                    Location: {booking.pickup_location}
                  </p>

                  <p className="font-bold mt-3">
                    {formatNaira(booking.total_amount)} / {booking.total_days} day(s)
                  </p>
                </div>

                <div className="md:col-span-1 flex md:flex-col gap-3">
                  <button
                    onClick={() => updateStatus(booking.id, 'confirmed')}
                    className="bg-green-600 text-white px-4 py-3 rounded-xl font-semibold"
                  >
                    Confirm
                  </button>

                  <button
                    onClick={() => updateStatus(booking.id, 'rejected')}
                    className="bg-red-600 text-white px-4 py-3 rounded-xl font-semibold"
                  >
                    Reject
                  </button>

                  <button
                    onClick={() => updateStatus(booking.id, 'completed')}
                    className="bg-gray-900 text-white px-4 py-3 rounded-xl font-semibold"
                  >
                    Complete
                  </button>

                  {whatsappUrl && (
                    <a href={whatsappUrl} target="_blank">
                      <button className="w-full bg-green-700 text-white px-4 py-3 rounded-xl font-semibold">
                        WhatsApp
                      </button>
                    </a>
                  )}
                </div>
              </div>
            )
          })}

          {bookings.length === 0 && (
            <div className="bg-white rounded-3xl shadow p-8 text-center">
              <p className="font-semibold">No bookings yet</p>
              <p className="text-gray-500 text-sm">
                New customer booking requests will appear here.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}