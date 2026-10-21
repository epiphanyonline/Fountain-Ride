'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminGuard from '../../../../components/AdminGuard'
import { money } from '../../../../../lib/marketplace'

function dateTime(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function label(value?: string | null) {
  if (!value) return '—'
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function StatusPill({ value }: { value?: string | null }) {
  const text = value || 'unknown'

  return (
    <span className="inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-black uppercase text-purple-700">
      {text.replaceAll('_', ' ')}
    </span>
  )
}

function Card({
  title,
  eyebrow,
  children,
}: {
  title: string
  eyebrow?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border bg-white p-5 shadow-sm">
      {eyebrow && (
        <p className="text-xs font-black uppercase tracking-wider text-purple-700">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-1 text-xl font-black">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Row({
  name,
  value,
}: {
  name: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-5 border-b py-3 last:border-0">
      <span className="text-sm text-gray-500">{name}</span>
      <span className="text-right text-sm font-bold">{value || '—'}</span>
    </div>
  )
}

export default function AdminTripOperationsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params?.id) return

    setLoading(true)

    fetch(`/api/admin/marketplace/rides/${params.id}`)
      .then(async (response) => {
        const body = await response.json()

        if (!response.ok) {
          throw new Error(body.error || 'Unable to load trip')
        }

        setData(body)
        setError('')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [params?.id])

  const payment = data?.payments?.[0] || null
  const earning = data?.earnings?.[0] || null
  const review = data?.reviews?.[0] || null
  const activeDispute =
    data?.disputes?.find((item: any) => item.status === 'open') ||
    data?.disputes?.[0] ||
    null

  const acceptedDriver = data?.driver

  const events = useMemo(() => data?.events || [], [data])

  return (
    <AdminGuard>
      <main className="min-h-screen bg-[#f8f6fb] px-4 py-6 md:px-7 md:py-8">
        <div className="mx-auto max-w-7xl">
          <button
            onClick={() => router.push('/admin/marketplace')}
            className="mb-5 rounded-xl border bg-white px-4 py-2 text-sm font-black"
          >
            ← Marketplace Control Centre
          </button>

          {loading && (
            <div className="rounded-3xl border bg-white p-8">
              <p className="font-bold">Loading trip operations…</p>
            </div>
          )}

          {error && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700">
              <p className="font-black">Unable to load this trip</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          )}

          {!loading && data && (
            <>
              <header className="rounded-[32px] bg-gray-950 p-6 text-white md:p-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-300">
                      Live Trip Operations
                    </p>

                    <h1 className="mt-2 text-3xl font-black md:text-4xl">
                      {data.ride.booking_ref || 'Trip record'}
                    </h1>

                    <p className="mt-3 max-w-3xl text-sm text-gray-300 md:text-base">
                      {data.ride.pickup_address || data.ride.pickup_state || 'Pickup'}
                      {' → '}
                      {data.ride.dropoff_address ||
                        data.ride.dropoff_state ||
                        'Destination'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StatusPill value={data.ride.status} />

                    {data.rider?.verified && (
                      <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-black text-green-200">
                        RIDER VERIFIED
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs text-gray-400">Agreed fare</p>
                    <p className="mt-1 text-xl font-black">
                      {data.ride.agreed_fare
                        ? money(data.ride.agreed_fare)
                        : 'Not agreed'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs text-gray-400">Payment</p>
                    <p className="mt-1 text-xl font-black">
                      {payment ? label(payment.status) : 'Not paid'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs text-gray-400">Driver</p>
                    <p className="mt-1 text-xl font-black">
                      {acceptedDriver?.full_name || 'Not assigned'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs text-gray-400">Payment Protection</p>
                    <p className="mt-1 text-xl font-black">
                      {data.paymentProtection?.disputed
                        ? 'Under review'
                        : payment?.status === 'paid'
                          ? 'Protected'
                          : 'Pending'}
                    </p>
                  </div>
                </div>
              </header>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <Card title="Rider" eyebrow="Contact & support">
                  <Row name="Name" value={data.rider?.name} />

                  <Row
                    name="Mobile"
                    value={
                      data.rider?.phone ? (
                        <a
                          href={`tel:${data.rider.phone}`}
                          className="text-purple-700 underline"
                        >
                          {data.rider.phone}
                        </a>
                      ) : (
                        '—'
                      )
                    }
                  />

                  <Row
                    name="Email"
                    value={
                      data.rider?.email ? (
                        <a
                          href={`mailto:${data.rider.email}`}
                          className="text-purple-700 underline"
                        >
                          {data.rider.email}
                        </a>
                      ) : (
                        '—'
                      )
                    }
                  />

                  <Row
                    name="Verification"
                    value={data.rider?.verified ? 'Verified' : 'Not verified'}
                  />

                  <p className="mt-4 rounded-2xl bg-purple-50 p-3 text-xs text-purple-800">
                    Contact information is visible here for Fountain Ride
                    operational support.
                  </p>
                </Card>

                <Card title="Assigned driver" eyebrow="Driver operations">
                  {acceptedDriver ? (
                    <>
                      <Row name="Name" value={acceptedDriver.full_name} />

                      <Row
                        name="Mobile"
                        value={
                          acceptedDriver.phone ? (
                            <a
                              href={`tel:${acceptedDriver.phone}`}
                              className="text-purple-700 underline"
                            >
                              {acceptedDriver.phone}
                            </a>
                          ) : (
                            '—'
                          )
                        }
                      />

                      <Row
                        name="Email"
                        value={
                          acceptedDriver.email ? (
                            <a
                              href={`mailto:${acceptedDriver.email}`}
                              className="text-purple-700 underline"
                            >
                              {acceptedDriver.email}
                            </a>
                          ) : (
                            '—'
                          )
                        }
                      />

                      <Row
                        name="Vehicle"
                        value={[
                          acceptedDriver.vehicle_year,
                          acceptedDriver.vehicle_make,
                          acceptedDriver.vehicle_model,
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      />

                      <Row
                        name="Plate"
                        value={acceptedDriver.vehicle_plate}
                      />

                      <Row
                        name="Driver verification"
                        value={label(acceptedDriver.verification_status)}
                      />

                      <Row
                        name="Garage"
                        value={
                          acceptedDriver.park_name ||
                          data.garage?.name ||
                          'Not linked'
                        }
                      />
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No driver has been assigned to this trip yet.
                    </p>
                  )}
                </Card>

                <Card title="Booking details" eyebrow="Trip">
                  <Row
                    name="Booking reference"
                    value={data.ride.booking_ref}
                  />

                  <Row
                    name="Pickup"
                    value={
                      data.ride.pickup_address ||
                      data.ride.pickup_state
                    }
                  />

                  <Row
                    name="Destination"
                    value={
                      data.ride.dropoff_address ||
                      data.ride.dropoff_state
                    }
                  />

                  <Row
                    name="Pickup date"
                    value={data.ride.pickup_date}
                  />

                  <Row
                    name="Pickup time"
                    value={data.ride.pickup_time}
                  />

                  <Row
                    name="Passengers"
                    value={data.ride.passenger_count}
                  />

                  <Row
                    name="Service"
                    value={
                      data.ride.ride_type === 'commercial'
                        ? data.ride.commercial_mode === 'garage'
                          ? 'Mobile Garage™'
                          : 'Quick Match'
                        : 'Private Ride'
                    }
                  />

                  <Row
                    name="Requested"
                    value={dateTime(data.ride.created_at)}
                  />
                </Card>

                <Card title="Payment & driver earning" eyebrow="Financials">
                  <Row
                    name="Agreed fare"
                    value={
                      data.ride.agreed_fare
                        ? money(data.ride.agreed_fare)
                        : '—'
                    }
                  />

                  <Row
                    name="Payment status"
                    value={payment ? label(payment.status) : 'No payment'}
                  />

                  <Row
                    name="Provider"
                    value={payment?.provider || '—'}
                  />

                  <Row
                    name="Payment reference"
                    value={payment?.provider_reference || '—'}
                  />

                  <Row
                    name="Paid"
                    value={dateTime(payment?.paid_at)}
                  />

                  <Row
                    name="Platform commission"
                    value={
                      payment
                        ? money(payment.platform_fee)
                        : earning
                          ? money(earning.commission_amount)
                          : '—'
                    }
                  />

                  <Row
                    name="Driver net"
                    value={
                      payment
                        ? money(payment.driver_net)
                        : earning
                          ? money(earning.net_amount)
                          : '—'
                    }
                  />

                  <Row
                    name="Driver earning"
                    value={earning ? label(earning.status) : '—'}
                  />
                </Card>
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
                <Card title="Trip lifecycle" eyebrow="Operations timeline">
                  {events.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No trip events have been recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-0">
                      {events.map((event: any, index: number) => (
                        <div
                          key={event.id}
                          className="relative flex gap-4 pb-6"
                        >
                          {index < events.length - 1 && (
                            <div className="absolute left-[7px] top-5 h-full w-px bg-purple-200" />
                          )}

                          <div className="relative mt-1 h-4 w-4 shrink-0 rounded-full bg-purple-700 ring-4 ring-purple-100" />

                          <div className="min-w-0">
                            <p className="font-black">
                              {label(event.event_type)}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {dateTime(event.created_at)}
                            </p>

                            {event.metadata &&
                              Object.keys(event.metadata).length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {Object.entries(event.metadata).map(
                                    ([key, value]) => (
                                      <span
                                        key={key}
                                        className="rounded-lg bg-gray-100 px-2 py-1 text-xs"
                                      >
                                        {label(key)}:{' '}
                                        <b>{String(value)}</b>
                                      </span>
                                    )
                                  )}
                                </div>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card title="Payment Protection™" eyebrow="Trip protection">
                  <Row
                    name="Payment received"
                    value={payment?.status === 'paid' ? 'Yes' : 'No'}
                  />

                  <Row
                    name="Trip Start PIN"
                    value={
                      data.paymentProtection?.tripPinGenerated
                        ? 'Generated ✓'
                        : 'Not generated'
                    }
                  />

                  <Row
                    name="Trip started"
                    value={
                      data.paymentProtection?.tripStarted ? 'Yes' : 'No'
                    }
                  />

                  <Row
                    name="Dispute"
                    value={
                      data.paymentProtection?.disputed
                        ? 'Under review'
                        : 'None'
                    }
                  />

                  {activeDispute && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="font-black text-amber-900">
                        {label(activeDispute.category)}
                      </p>

                      <p className="mt-2 text-sm text-amber-900">
                        {activeDispute.description}
                      </p>

                      <p className="mt-2 text-xs text-amber-700">
                        Status: {label(activeDispute.status)}
                      </p>

                      {activeDispute.resolution && (
                        <p className="mt-2 text-xs">
                          Resolution: {activeDispute.resolution}
                        </p>
                      )}
                    </div>
                  )}

                  <p className="mt-4 text-xs text-gray-500">
                    The actual Trip Start PIN is intentionally hidden from this
                    routine admin view.
                  </p>
                </Card>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <Card title="Fare negotiation" eyebrow="Offers">
                  {data.offers?.length ? (
                    <div className="divide-y">
                      {data.offers.map((offer: any) => (
                        <div key={offer.id} className="py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-black">
                                {offer.driver?.full_name || 'Driver'}
                              </p>

                              <p className="mt-1 text-sm text-gray-500">
                                {offer.driver?.vehicle_make}{' '}
                                {offer.driver?.vehicle_model}{' '}
                                {offer.driver?.vehicle_plate}
                              </p>
                            </div>

                            <StatusPill value={offer.status} />
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-black">
                              Offer {money(offer.amount)}
                            </span>

                            {offer.counter_amount && (
                              <span className="rounded-xl bg-purple-50 px-3 py-2 text-sm font-black text-purple-700">
                                Counter {money(offer.counter_amount)}
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-xs text-gray-400">
                            {dateTime(offer.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No driver offers recorded.
                    </p>
                  )}
                </Card>

                <Card title="Rider ↔ driver communication" eyebrow="Admin support">
                  {data.messages?.length ? (
                    <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                      {data.messages.map((message: any) => (
                        <div
                          key={message.id}
                          className={`rounded-2xl p-3 ${
                            message.sender_role === 'rider'
                              ? 'bg-purple-50'
                              : 'bg-gray-100'
                          }`}
                        >
                          <div className="flex justify-between gap-3">
                            <p className="text-xs font-black uppercase text-purple-700">
                              {message.sender_role}
                            </p>

                            <p className="text-[11px] text-gray-400">
                              {dateTime(message.created_at)}
                            </p>
                          </div>

                          <p className="mt-2 text-sm">{message.body}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No rider-driver messages for this trip.
                    </p>
                  )}

                  <p className="mt-4 text-xs text-gray-500">
                    This communication history is available to Fountain Ride
                    administration for trip support and dispute handling.
                  </p>
                </Card>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <Card title="Latest location activity" eyebrow="Trip tracking">
                  {data.locations?.length ? (
                    <div className="divide-y">
                      {data.locations.slice(0, 10).map(
                        (location: any, index: number) => (
                          <div
                            key={`${location.actor_role}-${location.created_at}-${index}`}
                            className="py-3"
                          >
                            <div className="flex justify-between gap-3">
                              <b>{label(location.actor_role)}</b>
                              <span className="text-xs text-gray-400">
                                {dateTime(location.created_at)}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-gray-500">
                              {location.latitude}, {location.longitude}
                              {location.accuracy_meters
                                ? ` · accuracy ${location.accuracy_meters}m`
                                : ''}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No location updates recorded for this trip.
                    </p>
                  )}
                </Card>

                <Card title="Review & dispute record" eyebrow="After trip">
                  {review ? (
                    <div className="rounded-2xl bg-green-50 p-4">
                      <p className="text-lg font-black text-green-800">
                        {'★'.repeat(Number(review.rating || 0))}
                      </p>

                      {review.comment && (
                        <p className="mt-2 text-sm">{review.comment}</p>
                      )}

                      <p className="mt-2 text-xs text-gray-500">
                        {label(review.review_status)} ·{' '}
                        {dateTime(review.created_at)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No review has been submitted.
                    </p>
                  )}

                  <div className="mt-4">
                    <Row
                      name="Disputes"
                      value={String(data.disputes?.length || 0)}
                    />

                    {activeDispute && (
                      <Row
                        name="Latest dispute status"
                        value={label(activeDispute.status)}
                      />
                    )}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </AdminGuard>
  )
}
