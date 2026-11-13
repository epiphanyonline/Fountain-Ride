
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AdminGuard from '../../components/AdminGuard'

type Booking = {
  id: string
  bookingRef: string
  customerName: string
  customerPhone: string
  jobType: string
  driverNeedType: string | null
  workArea: string
  startDate: string
  startTime: string
  status: string
  currency: string
  offerCount: number
  selectedDriverId: string | null
  agreedAmount: number | null
  paymentStatus: string | null
  paymentMethod: string | null
  paymentAmount: number | null
  bankReportStatus: string | null
  bankSenderName: string | null
  earningsStatus: string | null
  commissionAmount: number | null
  driverNet: number | null
  earningRecordsCount: number
  latestEvent: string | null
  latestEventAt: string | null
}

function money(
  amount: number | null,
  currency = 'NGN'
) {
  if (amount == null) return 'Not available'

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount))
}

function readable(value: string | null | undefined) {
  if (!value) return 'Not recorded'

  return value.replaceAll('_', ' ')
}

function statusColor(status: string) {
  if (
    ['confirmed', 'completed', 'paid', 'verified']
      .includes(status)
  ) {
    return 'bg-green-100 text-green-800'
  }

  if (
    ['awaiting_payment', 'reported', 'pending',
      'negotiating', 'requested'].includes(status)
  ) {
    return 'bg-amber-100 text-amber-800'
  }

  return 'bg-purple-100 text-purple-800'
}

function Detail({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-gray-500">
        {label}
      </p>

      <div className="mt-1 break-words text-sm font-bold text-gray-900">
        {value}
      </div>
    </div>
  )
}

export default function DriverHireOperationsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')

  const loadBookings = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        '/api/admin/driver-hire',
        {
          cache: 'no-store',
          credentials: 'same-origin',
        }
      )

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || 'Unable to load bookings.'
        )
      }

      setBookings(data.bookings || [])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load bookings.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBookings()
  }, [loadBookings])

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return bookings.filter((booking) => {
      const searchMatch =
        !keyword ||
        [
          booking.bookingRef,
          booking.customerName,
          booking.workArea,
        ]
          .join(' ')
          .toLowerCase()
          .includes(keyword)

      const statusMatch =
        statusFilter === 'all' ||
        booking.status === statusFilter

      const paymentMatch =
        paymentFilter === 'all' ||
        (
          paymentFilter === 'reported' &&
          booking.bankReportStatus === 'reported'
        ) ||
        (
          paymentFilter === 'paid' &&
          booking.paymentStatus === 'paid'
        ) ||
        (
          paymentFilter === 'not_paid' &&
          booking.paymentStatus !== 'paid'
        )

      return searchMatch && statusMatch && paymentMatch
    })
  }, [bookings, search, statusFilter, paymentFilter])

  const awaitingQuotes = bookings.filter((b) =>
    ['requested', 'negotiating'].includes(b.status)
  ).length

  const awaitingPayment = bookings.filter(
    (b) => b.status === 'awaiting_payment'
  ).length

  const transfersToReview = bookings.filter(
    (b) => b.bankReportStatus === 'reported'
  ).length

  const confirmed = bookings.filter(
    (b) => b.status === 'confirmed'
  ).length

  const active = bookings.filter((b) =>
    [
      'driver_en_route',
      'driver_arrived',
      'in_progress',
      'awaiting_customer_confirmation',
    ].includes(b.status)
  ).length

  const completed = bookings.filter(
    (b) => b.status === 'completed'
  ).length

  const summary = [
    { label: 'Awaiting Driver Offers', value: awaitingQuotes },
    { label: 'Awaiting Payment', value: awaitingPayment },
    { label: 'Bank Reports to Review', value: transfersToReview },
    { label: 'Confirmed Bookings', value: confirmed },
    { label: 'Active Jobs', value: active },
    { label: 'Completed Jobs', value: completed },
  ]

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/admin"
              className="text-sm font-bold text-purple-700 hover:underline"
            >
              Back to Main Admin
            </Link>

            <button
              type="button"
              onClick={() => void loadBookings()}
              disabled={loading}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-bold text-purple-700 disabled:opacity-50"
            >
              Refresh Bookings
            </button>
          </div>

          <header className="rounded-3xl bg-purple-800 p-6 text-white">
            <p className="text-xs font-black uppercase tracking-widest text-purple-200">
              Fountain Ride Mobile Garage
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Driver Hire Operations
            </h1>

            <p className="mt-2 text-sm text-purple-100">
              Monitor bookings, driver quotations,
              accepted agreements, payments,
              commissions and job progress.
            </p>
          </header>

          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href="/admin/driver-hire/bank-transfers"
              className="rounded-2xl border bg-white p-4 hover:border-purple-400"
            >
              <p className="font-black text-purple-800">
                Bank Transfer Payments
              </p>
              <p className="mt-1 text-xs text-gray-600">
                Review and verify customer reports
              </p>
            </Link>

            <Link
              href="/admin/marketplace"
              className="rounded-2xl border bg-white p-4 hover:border-purple-400"
            >
              <p className="font-black text-purple-800">
                Driver Management
              </p>
              <p className="mt-1 text-xs text-gray-600">
                Driver profiles and approvals
              </p>
            </Link>

            <Link
              href="/admin/vehicle-hire"
              className="rounded-2xl border bg-white p-4 hover:border-purple-400"
            >
              <p className="font-black text-purple-800">
                Vehicle Hire Operations
              </p>
              <p className="mt-1 text-xs text-gray-600">
                Manage vehicle-hire requests
              </p>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {summary.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border bg-white p-4"
              >
                <p className="text-xs font-bold text-gray-500">
                  {item.label}
                </p>

                <p className="mt-2 text-3xl font-black text-purple-800">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500">
            Summary covers the latest 100 bookings returned
            by the admin API, not necessarily every
            historical booking.
          </p>

          <section className="rounded-2xl border bg-white p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label
                  htmlFor="hire-search"
                  className="mb-1 block text-xs font-bold text-gray-600"
                >
                  Search bookings
                </label>

                <input
                  id="hire-search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Reference, customer or work area"
                  className="w-full rounded-xl border p-3 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="hire-status"
                  className="mb-1 block text-xs font-bold text-gray-600"
                >
                  Booking status
                </label>

                <select
                  id="hire-status"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  className="w-full rounded-xl border p-3 text-sm"
                >
                  <option value="all">All statuses</option>
                  <option value="requested">Requested</option>
                  <option value="negotiating">Negotiating</option>
                  <option value="awaiting_payment">Awaiting payment</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="driver_en_route">Driver en route</option>
                  <option value="driver_arrived">Driver arrived</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="disputed">Disputed</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="hire-payment"
                  className="mb-1 block text-xs font-bold text-gray-600"
                >
                  Payment status
                </label>

                <select
                  id="hire-payment"
                  value={paymentFilter}
                  onChange={(event) =>
                    setPaymentFilter(event.target.value)
                  }
                  className="w-full rounded-xl border p-3 text-sm"
                >
                  <option value="all">All payments</option>
                  <option value="reported">Bank report awaiting review</option>
                  <option value="paid">Recorded as paid</option>
                  <option value="not_paid">Not recorded as paid</option>
                </select>
              </div>
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border bg-white p-8 text-center">
              Loading Driver Hire bookings...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border bg-white p-8 text-center">
              No bookings match the current filters.
            </div>
          ) : (
            <section className="space-y-4">
              <p className="text-sm font-semibold text-gray-600">
                Showing {filtered.length} of {bookings.length} loaded bookings
              </p>

              {filtered.map((booking) => (
                <article
                  key={booking.id}
                  className="rounded-3xl border bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-purple-700">
                        Driver Hire Booking
                      </p>

                      <h2 className="mt-1 text-xl font-black text-gray-950">
                        {booking.bookingRef}
                      </h2>

                      <p className="mt-1 text-sm text-gray-600">
                        {booking.customerName}
                      </p>
                    </div>

                    <span
                      className={
                        'rounded-full px-3 py-2 text-xs font-black capitalize ' +
                        statusColor(booking.status)
                      }
                    >
                      {readable(booking.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Detail
                      label="Job type"
                      value={readable(booking.jobType)}
                    />
                    <Detail
                      label="Work area"
                      value={booking.workArea || 'Not recorded'}
                    />
                    <Detail
                      label="Service date"
                      value={booking.startDate}
                    />
                    <Detail
                      label="Start time"
                      value={booking.startTime}
                    />
                    <Detail
                      label="Customer phone"
                      value={booking.customerPhone}
                    />
                    <Detail
                      label="Driver quotations"
                      value={booking.offerCount}
                    />
                    <Detail
                      label="Agreed quotation"
                      value={money(
                        booking.agreedAmount,
                        booking.currency
                      )}
                    />
                    <Detail
                      label="Selected driver"
                      value={
                        booking.selectedDriverId
                          ? 'Driver assigned'
                          : 'Not yet assigned'
                      }
                    />
                  </div>

                  <div className="mt-5 rounded-2xl bg-purple-50 p-4">
                    <h3 className="font-black text-purple-950">
                      Payment & Earnings
                    </h3>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Detail
                        label="Payment record"
                        value={readable(
                          booking.paymentStatus || 'not_started'
                        )}
                      />
                      <Detail
                        label="Payment method"
                        value={readable(
                          booking.paymentMethod ||
                          (booking.bankReportStatus
                            ? 'bank_transfer'
                            : null)
                        )}
                      />
                      <Detail
                        label="Bank transfer report"
                        value={readable(booking.bankReportStatus)}
                      />
                      <Detail
                        label="Platform commission recorded"
                        value={money(booking.commissionAmount)}
                      />
                      <Detail
                        label="Driver earnings recorded"
                        value={money(booking.driverNet)}
                      />
                      <Detail
                        label="Driver earnings status"
                        value={readable(booking.earningsStatus)}
                      />
                    </div>
                  </div>

                  {booking.earningRecordsCount > 1 && (
                    <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
                      Attention: multiple driver earnings records
                      exist for this booking. Investigate before payout.
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">
                      Latest event: {readable(booking.latestEvent)}
                    </p>

                    {booking.bankReportStatus === 'reported' && (
                      <Link
                        href="/admin/driver-hire/bank-transfers"
                        className="rounded-xl bg-purple-700 px-4 py-3 text-sm font-black text-white hover:bg-purple-800"
                      >
                        Review Bank Transfer
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      </main>
    </AdminGuard>
  )
}
