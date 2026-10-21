'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import MarketplaceNav from '../components/MarketplaceNav'

type DriverHireHistoryItem = {
  id: string
  booking_ref: string
  status: string
  created_at: string
  quotationCount: number
}

type CarHireHistoryItem = {
  id: string
  booking_ref: string
  status: string
  created_at: string
  vehicleName: string
}
const groupOf = (s: string) => {
  if (['requested', 'negotiating'].includes(s)) return 'Negotiating'
  if (s === 'awaiting_payment') return 'Awaiting payment'
  if (['confirmed', 'driver_en_route', 'driver_arrived'].includes(s)) return 'Upcoming'
  if (s === 'in_progress') return 'Active'
  if (s === 'completed') return 'Completed'
  return 'Cancelled / closed'
}

export default function Rider() {
  const [rides, setRides] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState(false)
  const [driverHireRequests, setDriverHireRequests] =
    useState<DriverHireHistoryItem[]>([])
  const [driverHireLoading, setDriverHireLoading] = useState(true)
  const [carHireRequests, setCarHireRequests] =
    useState<CarHireHistoryItem[]>([])
  const [carHireLoading, setCarHireLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const token = localStorage.getItem('fountain_rider_token')

        if (token) {
          const response = await fetch('/api/marketplace/rider/rides', {
            headers: { 'x-rider-token': token },
          })

          if (response.ok) {
            const data = await response.json()
            setRides(data.rides || [])
            setSignedIn(true)
            return
          }
        }

        const raw = localStorage.getItem('fountain_rider_trip_ids')
        const parsed = JSON.parse(raw || '[]')
        const ids: string[] = Array.isArray(parsed) ? parsed : []
        const result: any[] = []

        for (const id of ids.slice(0, 50)) {
          const rideToken = localStorage.getItem(`fountain_ride_trip_${id}`)
          if (!rideToken) continue

          try {
            const response = await fetch(`/api/marketplace/rides/${id}`, {
              headers: { 'x-ride-token': rideToken },
            })

            if (response.ok) {
              const data = await response.json()
              if (data.ride) result.push(data.ride)
            }
          } catch {}
        }

        setRides(result)
      } catch (error) {
        console.error('Unable to load rider history:', error)
      } finally {
        setLoading(false)
      }
    })()

    ;(async () => {
      try {
        const raw = localStorage.getItem(
          'fountain_driver_hire_request_ids'
        )

        const parsed = JSON.parse(raw || '[]')
        const ids: string[] = Array.isArray(parsed)
          ? parsed.filter((id: unknown): id is string =>
              typeof id === 'string' &&
              /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)
            ).slice(0, 50)
          : []

        const results = await Promise.all(
          ids.map(async id => {
            const accessToken = localStorage.getItem(
              `fountain_driver_hire_access_${id}`
            )

            if (!accessToken) return null

            try {
              const response = await fetch(
                `/api/marketplace/driver-hire/${id}`,
                {
                  headers: {
                    'x-driver-hire-access-token': accessToken,
                  },
                }
              )

              if (!response.ok) return null

              const data = await response.json()
              const request = data.request

              if (!request || request.id !== id) return null

              return {
                id,
                booking_ref: request.booking_ref || id,
                status: request.status || 'requested',
                created_at: request.created_at || '',
                quotationCount: Array.isArray(data.offers)
                  ? data.offers.filter(
                      (offer: any) => offer.is_current !== false
                    ).length
                  : 0,
              } satisfies DriverHireHistoryItem
            } catch {
              return null
            }
          })
        )

        setDriverHireRequests(
          results.filter(
            (item): item is DriverHireHistoryItem => item !== null
          )
        )
      } catch (error) {
        console.error('Unable to load Driver Hire history:', error)
      } finally {
        setDriverHireLoading(false)
      }
    ;(async () => {
      try {
        const ids: string[] = []

        for (let index = 0; index < localStorage.length; index++) {
          const key = localStorage.key(index)
          if (!key?.startsWith('vehicleHireAccess:')) continue

          const id = key.slice('vehicleHireAccess:'.length)

          if (
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
          ) {
            ids.push(id)
          }
        }

        const results = await Promise.all(
          ids.slice(0, 50).map(async id => {
            const token = localStorage.getItem(`vehicleHireAccess:${id}`)
            if (!token) return null

            try {
              const response = await fetch(
                `/api/marketplace/vehicle-hire/${id}`,
                {
                  headers: {
                    'x-vehicle-hire-access-token': token,
                  },
                  cache: 'no-store',
                }
              )

              if (!response.ok) return null

              const data = await response.json()
              const request = data.request || data.hireRequest

              if (!request || request.id !== id) return null

              return {
                id,
                booking_ref: request.booking_ref || id,
                status: request.status || 'requested',
                created_at: request.created_at || '',
                vehicleName: data.car?.name || 'Vehicle hire request',
              } satisfies CarHireHistoryItem
            } catch {
              return null
            }
          })
        )

        setCarHireRequests(
          results.filter(
            (item): item is CarHireHistoryItem => item !== null
          )
        )
      } catch (error) {
        console.error('Unable to load Car Hire history:', error)
      } finally {
        setCarHireLoading(false)
      }
    })()
    })()
  }, [])

  const groups = useMemo(() => {
    const order = [
      'Upcoming',
      'Negotiating',
      'Awaiting payment',
      'Active',
      'Completed',
      'Cancelled / closed',
    ]

    return order
      .map(title => ({
        title,
        items: rides.filter(r => groupOf(r.status) === title),
      }))
      .filter(group => group.items.length)
  }, [rides])

  return (
    <>
      <MarketplaceNav />
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#eee5ff,#f8f5fb_45%)] p-5 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-end gap-4">
            <div>
              <p className="font-bold text-purple-700">Fountain Ride Mobile Garage</p>
              <h1 className="text-4xl md:text-5xl font-black">My Bookings</h1>
              <p className="text-gray-500 mt-2">
                {signedIn
                  ? 'Manage your bookings, quotations and journeys in one place.'
                  : 'Manage bookings saved on this browser.'}
              </p>
            </div>
            <Link
              href="/cars"
              className="bg-purple-700 text-white px-5 py-3 rounded-2xl font-black"
            >
              Hire a Car
            </Link>
          </div>

          {/* FOUNTAIN_BOOKING_SUMMARY_V1 */}
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <a
              href="#driver-bookings"
              className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm transition hover:border-purple-400 hover:shadow-md"
            >
              <p className="text-sm font-bold text-purple-700">
                Hire a Driver
              </p>
              <p className="mt-3 text-3xl font-black">
                {driverHireRequests.length}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Driver requests
              </p>
            </a>

            <a
              href="#car-bookings"
              className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm transition hover:border-purple-400 hover:shadow-md"
            >
              <p className="text-sm font-bold text-purple-700">
                Hire a Car
              </p>
              <p className="mt-3 text-3xl font-black">
                {carHireRequests.length}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Vehicle bookings
              </p>
            </a>

            <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-purple-700">
                Awaiting Payment
              </p>
              <p className="mt-3 text-3xl font-black">
                {
                  driverHireRequests.filter(
                    r => r.status === 'awaiting_payment'
                  ).length +
                  carHireRequests.filter(
                    r => r.status === 'awaiting_payment'
                  ).length
                }
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Payments outstanding
              </p>
            </div>

            <a
              href="#previous-journeys"
              className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm transition hover:border-purple-400 hover:shadow-md"
            >
              <p className="text-sm font-bold text-purple-700">
                Previous Journeys
              </p>
              <p className="mt-3 text-3xl font-black">
                {rides.length}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Historical bookings
              </p>
            </a>
          </div>
          {!signedIn && !loading && (
            <div className="bg-purple-50 border border-purple-100 rounded-3xl p-5 mt-6">
              <b>Take your rides with you.</b>
              <p className="text-sm text-gray-600 mt-1">
                Create a rider account so new bookings and ride history
                are connected to you instead of only this browser.
              </p>
              <div className="flex gap-3 mt-4">
                <Link
                  href="/rider/register"
                  className="bg-purple-700 text-white px-4 py-3 rounded-xl font-black"
                >
                  Create rider account
                </Link>
                <Link
                  href="/rider/login"
                  className="bg-white border px-4 py-3 rounded-xl font-black"
                >
                  Sign in
                </Link>
              </div>
            </div>
          )}

          <section id="driver-bookings" className="mt-12">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <p className="text-sm font-bold text-purple-700">
                  Driver Hire
                </p>
                <h2 className="text-2xl font-black">
                  My Driver Hire Requests
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Review quotations, negotiate and manage your bookings.
                </p>
              </div>
              <Link
                href="/hire-driver"
                className="bg-purple-700 text-white px-4 py-3 rounded-xl font-bold"
              >
                Hire a driver
              </Link>
            </div>

            {driverHireLoading ? (
              <div className="bg-white border rounded-3xl p-5 mt-4 text-gray-500">
                Loading Driver Hire requests...
              </div>
            ) : driverHireRequests.length === 0 ? (
              <div className="bg-white border rounded-3xl p-6 mt-4">
                <b>No Driver Hire requests found on this browser.</b>
                <p className="text-sm text-gray-500 mt-2">
                  Requests created in another browser or device will
                  not appear here yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {driverHireRequests.map(request => (
                  <Link
                    key={request.id}
                    href={`/hire-driver/requests/${request.id}`}
                    className="fr-choice block bg-white border rounded-3xl p-5"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <b>{request.booking_ref}</b>
                      <span className="text-xs font-bold uppercase text-purple-700">
                        {request.status.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-3 mt-3">
                      <p className="text-sm text-gray-600">
                        {request.quotationCount}{' '}
                        {request.quotationCount === 1
                          ? 'driver quotation'
                          : 'driver quotations'}
                      </p>
                      <span className="font-bold text-purple-700">
                        View request →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section id="car-bookings" className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-purple-700">
                  Vehicle + driver included
                </p>
                <h2 className="text-2xl font-black">
                  My Car Hire Requests
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Review vehicle quotations and manage your bookings.
                </p>
              </div>
              <Link
                href="/cars"
                className="rounded-xl bg-purple-700 px-4 py-3 font-bold text-white"
              >
                Hire a Car
              </Link>
            </div>

            {carHireLoading ? (
              <div className="mt-4 rounded-3xl border bg-white p-5 text-gray-500">
                Loading Car Hire requests...
              </div>
            ) : carHireRequests.length === 0 ? (
              <div className="mt-4 rounded-3xl border bg-white p-6">
                <b>No Car Hire requests found on this browser.</b>
                <p className="mt-2 text-sm text-gray-500">
                  Requests saved on another device may not appear here.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {carHireRequests.map(request => (
                  <Link
                    key={request.id}
                    href={`/vehicle-hire/requests/${request.id}`}
                    className="fr-choice block rounded-3xl border bg-white p-5"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <b>{request.booking_ref}</b>
                      <span className="text-xs font-bold uppercase text-purple-700">
                        {request.status.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-gray-600">
                      {request.vehicleName}
                    </p>
                    <span className="mt-3 inline-block font-bold text-purple-700">
                      View request →
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>


          <details id="previous-journeys" className="mt-12 border-t border-purple-100 pt-8">
            <summary className="cursor-pointer list-none rounded-2xl bg-white p-5 font-black text-xl shadow-sm">
              Previous Journeys ({rides.length})
              <span className="ml-3 text-sm font-medium text-purple-700">
                Click to expand or collapse
              </span>
            </summary>
          {loading && (
            <div className="bg-white border rounded-3xl p-5 text-gray-500 mt-5">
              Loading previous journeys...
            </div>
          )}

          {!loading && rides.length === 0 && (
            <div className="bg-white border rounded-3xl p-6 mt-5">
              <b>No previous journeys yet.</b>
              <p className="text-sm text-gray-500 mt-2">
                New journeys begin with Hire a Driver or Hire a Car.
              </p>
            </div>
          )}

          <div className="space-y-8 mt-7">
            {groups.map(group => (
              <section key={group.title}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black">{group.title}</h2>
                  <span className="text-xs rounded-full bg-purple-100 text-purple-700 px-3 py-1 font-black">
                    {group.items.length}
                  </span>
                </div>
                <div className="space-y-3 mt-3">
                  {group.items.map(r => (
                    <Link
                      href={`/trips/${r.id}`}
                      key={r.id}
                      className="fr-choice block bg-white border rounded-3xl p-5"
                    >
                      <div className="flex justify-between gap-3">
                        <b>{r.booking_ref}</b>
                        <span className="text-xs font-bold uppercase text-purple-700">
                          {String(r.status).replaceAll('_', ' ')}
                        </span>
                      </div>
                      <p className="font-black text-lg mt-2">
                        {r.pickup_address} → {r.dropoff_address}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
                        <span>
                          {r.pickup_date} · {r.pickup_time}
                        </span>
                        <span>
                          {r.ride_type === 'commercial'
                            ? r.commercial_mode === 'garage'
                              ? 'Mobile Garage'
                              : 'Quick Match'
                            : 'Private Driver'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
          </details>
        </div>
      </main>
    </>
  )
}
