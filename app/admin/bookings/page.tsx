'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { formatNaira } from '../../../lib/format'
import AdminGuard from '../../components/AdminGuard'

function packageLabel(type: string) {
  switch (type) {
    case 'daily_hire':
      return 'Daily hire within city'
    case 'drop_off_only':
      return 'City-to-city drop off only'
    case 'city_to_city_12hrs':
      return 'City-to-city 12 hours'
    case 'city_to_city_24hrs':
      return 'City-to-city 24 hours'
    default:
      return type || 'Not specified'
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-700'
    case 'completed':
      return 'bg-gray-900 text-white'
    case 'rejected':
    case 'cancelled':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-purple-100 text-purple-700'
  }
}

function cleanPhone(phone: string) {
  return String(phone || '').replace(/\D/g, '')
}

export default function AdminBookingsPage() {
  const router = useRouter()

  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

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
          image_url,
          image_urls
        ),
        customers (
          full_name,
          phone,
          whatsapp_number
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setBookings([])
    } else {
      setBookings(data || [])
    }

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

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesStatus =
        statusFilter === 'all' || booking.status === statusFilter

      const text = `
        ${booking.booking_ref || ''}
        ${booking.cars?.name || ''}
        ${booking.customers?.full_name || ''}
        ${booking.customers?.phone || ''}
        ${booking.customers?.whatsapp_number || ''}
        ${booking.route_origin || ''}
        ${booking.route_destination || ''}
      `.toLowerCase()

      const matchesSearch = text.includes(search.toLowerCase())

      return matchesStatus && matchesSearch
    })
  }, [bookings, statusFilter, search])

  const stats = useMemo(() => {
    const total = bookings.length
    const pending = bookings.filter((b) => b.status === 'pending').length
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length
    const completed = bookings.filter((b) => b.status === 'completed').length
    const priceRequests = bookings.filter((b) => b.price_on_request).length

    const visibleRevenue = bookings.reduce((sum, b) => {
      if (b.price_on_request) return sum
      if (['rejected', 'cancelled'].includes(b.status)) return sum
      return sum + Number(b.total_amount || 0)
    }, 0)

    return {
      total,
      pending,
      confirmed,
      completed,
      priceRequests,
      visibleRevenue,
    }
  }, [bookings])

  if (loading) return <div className="p-6">Loading bookings...</div>

  return (
  <AdminGuard>
    <main className="min-h-screen bg-[#f7f4fb] px-4 py-6 md:py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-purple-700">
              Admin Bookings
            </p>

            <h1 className="text-3xl font-bold mt-2">
              Booking Requests
            </h1>

            <p className="text-gray-500 mt-2">
              Review, confirm, reject, complete bookings and contact customers quickly.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/admin/routes')}
              className="bg-purple-700 text-white px-5 py-3 rounded-2xl font-semibold"
            >
              Route Prices
            </button>

            <button
              onClick={logout}
              className="bg-gray-900 text-white px-5 py-3 rounded-2xl font-semibold"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white rounded-2xl shadow p-4">
            <p className="text-xs text-gray-500 font-semibold">Total</p>
            <p className="text-2xl font-black">{stats.total}</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-4">
            <p className="text-xs text-gray-500 font-semibold">Pending</p>
            <p className="text-2xl font-black">{stats.pending}</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-4">
            <p className="text-xs text-gray-500 font-semibold">Confirmed</p>
            <p className="text-2xl font-black">{stats.confirmed}</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-4">
            <p className="text-xs text-gray-500 font-semibold">Completed</p>
            <p className="text-2xl font-black">{stats.completed}</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-4">
            <p className="text-xs text-gray-500 font-semibold">Quote Needed</p>
            <p className="text-2xl font-black">{stats.priceRequests}</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-4">
            <p className="text-xs text-gray-500 font-semibold">Visible Value</p>
            <p className="text-xl font-black">
              {formatNaira(stats.visibleRevenue)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow p-4 mb-6 grid md:grid-cols-3 gap-3">
          <input
            className="border p-3 rounded-xl md:col-span-2"
            placeholder="Search booking ref, customer, phone, car or route"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="border p-3 rounded-xl"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="grid gap-5">
          {filteredBookings.map((booking) => {
            const images = Array.isArray(booking.cars?.image_urls)
              ? booking.cars.image_urls.filter(Boolean)
              : []

            const carImage = images[0] || booking.cars?.image_url || ''

            const whatsappNumber =
              booking.customers?.whatsapp_number ||
              booking.customers?.phone ||
              ''

            const cleanWhatsapp = cleanPhone(whatsappNumber)

            const tripPackage =
              booking.city_package_type || booking.trip_type || 'daily_hire'

            const routeText =
              booking.route_origin && booking.route_destination
                ? `${booking.route_origin} → ${booking.route_destination}`
                : 'Within city / daily hire'

            const priceText = booking.price_on_request
              ? 'Price to be confirmed on WhatsApp'
              : formatNaira(booking.total_amount)

            const whatsappMessage = encodeURIComponent(
              `Hello ${booking.customers?.full_name || ''}, your Fountain Ride booking update:

Booking Ref: ${booking.booking_ref}
Car: ${booking.cars?.name || ''}
Status: ${booking.status}
Trip: ${packageLabel(tripPackage)}
Route: ${routeText}
Pickup: ${booking.pickup_date} at ${booking.pickup_time}
Return: ${booking.return_date} at ${booking.return_time}
Location: ${booking.pickup_location}
Extra Hours: ${booking.extra_hours || 0}
Price: ${priceText}

Fountain Ride`
            )

            const whatsappUrl = cleanWhatsapp
              ? `https://wa.me/${cleanWhatsapp}?text=${whatsappMessage}`
              : ''

            return (
              <div
                key={booking.id}
                className="bg-white rounded-3xl shadow p-5 grid md:grid-cols-5 gap-5"
              >
                <div className="md:col-span-1">
                  {carImage ? (
                    <img
                      src={carImage}
                      alt={booking.cars?.name || 'Car'}
                      className="w-full h-36 object-cover rounded-2xl bg-gray-100"
                    />
                  ) : (
                    <div className="w-full h-36 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <p className="text-gray-400 text-sm font-semibold">
                        No car image
                      </p>
                    </div>
                  )}
                </div>

                <div className="md:col-span-3">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h2 className="text-xl font-semibold">
                      {booking.cars?.name || 'Car not found'}
                    </h2>

                    <span
                      className={`text-xs px-3 py-1 rounded-full font-semibold ${statusClass(
                        booking.status
                      )}`}
                    >
                      {booking.status}
                    </span>

                    {booking.price_on_request && (
                      <span className="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold">
                        Quote needed
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-500">
                    Ref: {booking.booking_ref}
                  </p>

                  <div className="grid md:grid-cols-2 gap-3 mt-4 text-sm">
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="font-bold text-gray-900">Customer</p>
                      <p className="mt-1">{booking.customers?.full_name}</p>
                      <p className="text-gray-500">
                        Phone: {booking.customers?.phone}
                      </p>
                      <p className="text-gray-500">
                        WhatsApp: {booking.customers?.whatsapp_number}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="font-bold text-gray-900">Trip Details</p>
                      <p className="mt-1">{packageLabel(tripPackage)}</p>
                      <p className="text-gray-500">{routeText}</p>
                      <p className="text-gray-500">
                        Extra hours: {booking.extra_hours || 0}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="font-bold text-gray-900">Pickup</p>
                      <p className="mt-1">
                        {booking.pickup_date} at {booking.pickup_time}
                      </p>
                      <p className="text-gray-500">
                        {booking.pickup_location}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="font-bold text-gray-900">Return</p>
                      <p className="mt-1">
                        {booking.return_date} at {booking.return_time}
                      </p>
                      <p className="text-gray-500">
                        {booking.total_days} day(s)
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-purple-50 p-4">
                    <p className="text-sm text-gray-500">Booking Price</p>
                    <p className="text-2xl font-black">
                      {booking.price_on_request
                        ? 'To be confirmed on WhatsApp'
                        : formatNaira(booking.total_amount)}
                    </p>

                    {booking.route_price > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        Route price: {formatNaira(booking.route_price)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="md:col-span-1 flex md:flex-col gap-3 flex-wrap">
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

                  <button
                    onClick={() => updateStatus(booking.id, 'cancelled')}
                    className="bg-orange-500 text-white px-4 py-3 rounded-xl font-semibold"
                  >
                    Cancel
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

          {filteredBookings.length === 0 && (
            <div className="bg-white rounded-3xl shadow p-8 text-center">
              <p className="font-semibold">No bookings found</p>
              <p className="text-gray-500 text-sm">
                Try another search or status filter.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
</AdminGuard>
  )
}