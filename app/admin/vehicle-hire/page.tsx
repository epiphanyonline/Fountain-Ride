'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AdminGuard from '../../components/AdminGuard'

type Vehicle = {
  id: string
  name: string
  brand?: string | null
  model?: string | null
  year?: number | null
  transmission?: string | null
  fuel_type?: string | null
  seats?: number | null
  daily_rate?: number | null
  image_url?: string | null
  image_urls?: string[] | null
  status?: string | null
}

type Offer = {
  id: string
  amount: number
  status: string
  version_number: number
  created_at: string
}

type HireRequest = {
  id: string
  booking_ref: string
  car_id: string

  customer_name: string
  customer_phone: string
  customer_email?: string | null

  pickup_address: string
  destination_address: string

  start_date: string
  start_time?: string | null
  end_date?: string | null
  end_time?: string | null

  trip_type?: string | null
  passenger_count?: number | null

  guide_daily_rate?: number | null
  agreed_amount?: number | null

  status: string
  currency: string
  created_at: string

  vehicle: Vehicle | null
  current_offer: Offer | null

  unread_customer_messages: number
}

function money(
  value?: number | null,
  currency = 'NGN'
) {
  if (value === null || value === undefined) {
    return '—'
  }

  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(value))
  } catch {
    return `₦${Number(value).toLocaleString()}`
  }
}

function words(value?: string | null) {
  if (!value) return 'Not specified'

  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    )
}

function formatDate(value?: string | null) {
  if (!value) return '—'

  const date = new Date(`${value}T12:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function getVehicleImage(
  vehicle: Vehicle | null
) {
  if (!vehicle) return ''

  if (
    Array.isArray(vehicle.image_urls) &&
    vehicle.image_urls.length > 0
  ) {
    return vehicle.image_urls[0] || ''
  }

  return vehicle.image_url || ''
}

export default function AdminVehicleHirePage() {
  const [requests, setRequests] =
    useState<HireRequest[]>([])

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState('')

  const [filter, setFilter] =
    useState('all')

  async function loadRequests(
    quiet = false
  ) {
    if (quiet) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const response = await fetch(
        '/api/admin/vehicle-hire',
        {
          cache: 'no-store',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to load Vehicle Hire requests.'
        )
      }

      setRequests(data.requests || [])
    } catch (err: any) {
      setError(
        err.message ||
          'Unable to load Vehicle Hire requests.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const filteredRequests =
    useMemo(() => {
      if (filter === 'all') {
        return requests
      }

      if (filter === 'needs_quote') {
        return requests.filter(
          (request) =>
            !request.current_offer &&
            [
              'requested',
              'negotiating',
            ].includes(request.status)
        )
      }

      if (filter === 'quoted') {
        return requests.filter(
          (request) =>
            Boolean(request.current_offer)
        )
      }

      if (filter === 'active') {
        return requests.filter(
          (request) =>
            [
              'fare_agreed',
              'awaiting_payment',
              'confirmed',
              'in_progress',
              'awaiting_customer_confirmation',
            ].includes(request.status)
        )
      }

      return requests.filter(
        (request) =>
          request.status === filter
      )
    }, [requests, filter])

  const needsQuoteCount =
    requests.filter(
      (request) =>
        !request.current_offer &&
        [
          'requested',
          'negotiating',
        ].includes(request.status)
    ).length

  const quotedCount =
    requests.filter(
      (request) =>
        Boolean(request.current_offer)
    ).length

  const activeCount =
    requests.filter((request) =>
      [
        'fare_agreed',
        'awaiting_payment',
        'confirmed',
        'in_progress',
        'awaiting_customer_confirmation',
      ].includes(request.status)
    ).length

  return (
    <AdminGuard>
      <main className="min-h-screen bg-[#f7f4fb]">
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-10">

          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div>
              <p className="text-xs font-black tracking-[0.18em] text-purple-700">
                FOUNTAIN RIDE ADMIN
              </p>

              <h1 className="text-3xl md:text-4xl font-black mt-2">
                Vehicle Hire Requests
              </h1>

              <p className="text-gray-600 mt-2">
                Manage chauffeur-driven vehicle
                enquiries, quotations and bookings.
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                href="/admin"
                className="bg-white border px-4 py-3 rounded-2xl font-bold text-sm"
              >
                Admin Home
              </Link>

              <button
                type="button"
                onClick={() =>
                  loadRequests(true)
                }
                disabled={refreshing}
                className="bg-purple-700 text-white px-4 py-3 rounded-2xl font-black text-sm disabled:opacity-50"
              >
                {refreshing
                  ? 'Refreshing...'
                  : 'Refresh'}
              </button>
            </div>
          </div>

          {/* SUMMARY */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-7">
            <Summary
              label="All requests"
              value={requests.length}
            />

            <Summary
              label="Need quotation"
              value={needsQuoteCount}
            />

            <Summary
              label="Quoted"
              value={quotedCount}
            />

            <Summary
              label="Active bookings"
              value={activeCount}
            />
          </div>

          {/* FILTERS */}
          <div className="flex gap-2 overflow-x-auto mt-6 pb-1">
            <FilterButton
              active={filter === 'all'}
              onClick={() =>
                setFilter('all')
              }
            >
              All
            </FilterButton>

            <FilterButton
              active={
                filter === 'needs_quote'
              }
              onClick={() =>
                setFilter('needs_quote')
              }
            >
              Needs Quote
            </FilterButton>

            <FilterButton
              active={filter === 'quoted'}
              onClick={() =>
                setFilter('quoted')
              }
            >
              Quoted
            </FilterButton>

            <FilterButton
              active={filter === 'active'}
              onClick={() =>
                setFilter('active')
              }
            >
              Active
            </FilterButton>

            <FilterButton
              active={
                filter === 'completed'
              }
              onClick={() =>
                setFilter('completed')
              }
            >
              Completed
            </FilterButton>

            <FilterButton
              active={
                filter === 'cancelled'
              }
              onClick={() =>
                setFilter('cancelled')
              }
            >
              Cancelled
            </FilterButton>
          </div>

          {/* ERROR */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 font-semibold">
              {error}
            </div>
          )}

          {/* LOADING */}
          {loading ? (
            <div className="mt-6 bg-white border rounded-[2rem] p-8">
              <p className="font-bold text-gray-600">
                Loading Vehicle Hire
                requests...
              </p>
            </div>
          ) : filteredRequests.length ===
            0 ? (
            <div className="mt-6 bg-white border rounded-[2rem] p-10 text-center">
              <div className="text-4xl">
                🚘
              </div>

              <h2 className="text-xl font-black mt-3">
                No requests here
              </h2>

              <p className="text-gray-500 mt-2">
                Vehicle Hire requests matching
                this filter will appear here.
              </p>
            </div>
          ) : (
            <div className="grid xl:grid-cols-2 gap-5 mt-6">
              {filteredRequests.map(
                (request) => {
                  const image =
                    getVehicleImage(
                      request.vehicle
                    )

                  return (
                    <article
                      key={request.id}
                      className="bg-white border rounded-[2rem] overflow-hidden shadow-sm"
                    >
                      <div className="grid sm:grid-cols-[180px_1fr]">
                        <div className="bg-gray-100 min-h-[170px]">
                          {image ? (
                            <img
                              src={image}
                              alt={
                                request
                                  .vehicle
                                  ?.name ||
                                'Vehicle'
                              }
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="h-full min-h-[170px] flex items-center justify-center text-gray-400 font-bold">
                              Vehicle
                            </div>
                          )}
                        </div>

                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-black text-purple-700 tracking-wider">
                                {
                                  request.booking_ref
                                }
                              </p>

                              <h2 className="text-xl font-black mt-1">
                                {request.vehicle
                                  ?.name ||
                                  'Vehicle'}
                              </h2>
                            </div>

                            <StatusBadge
                              status={
                                request.status
                              }
                              hasOffer={Boolean(
                                request.current_offer
                              )}
                            />
                          </div>

                          <div className="mt-4 text-sm">
                            <p className="font-black">
                              {
                                request.pickup_address
                              }
                              {' → '}
                              {
                                request.destination_address
                              }
                            </p>

                            <p className="text-gray-500 mt-1">
                              {formatDate(
                                request.start_date
                              )}
                              {request.end_date
                                ? ` – ${formatDate(
                                    request.end_date
                                  )}`
                                : ''}
                              {' · '}
                              {words(
                                request.trip_type
                              )}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mt-4">
                            <MiniInfo
                              label="Customer"
                              value={
                                request.customer_name
                              }
                            />

                            <MiniInfo
                              label="Passengers"
                              value={
                                request.passenger_count !==
                                null &&
                                request.passenger_count !==
                                  undefined
                                  ? String(
                                      request.passenger_count
                                    )
                                  : '—'
                              }
                            />

                            <MiniInfo
                              label="Guide"
                              value={money(
                                request.guide_daily_rate,
                                request.currency
                              )}
                            />

                            <MiniInfo
                              label={
                                request.current_offer
                                  ? 'Current quote'
                                  : 'Quotation'
                              }
                              value={
                                request.current_offer
                                  ? money(
                                      request
                                        .current_offer
                                        .amount,
                                      request.currency
                                    )
                                  : 'Not sent'
                              }
                            />
                          </div>

                          {request.unread_customer_messages >
                            0 && (
                            <div className="mt-4 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2 text-xs font-black text-purple-800">
                              {
                                request.unread_customer_messages
                              }{' '}
                              unread customer{' '}
                              {request.unread_customer_messages ===
                              1
                                ? 'message'
                                : 'messages'}
                            </div>
                          )}

                          <Link
                            href={`/admin/vehicle-hire/${request.id}`}
                            className="mt-4 block w-full text-center bg-gray-950 text-white rounded-2xl px-4 py-3 font-black"
                          >
                            {request.current_offer
                              ? 'Open Request'
                              : 'Review & Quote'}
                          </Link>
                        </div>
                      </div>
                    </article>
                  )
                }
              )}
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  )
}

function Summary({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="bg-white border rounded-2xl p-4">
      <p className="text-xs font-bold text-gray-500">
        {label}
      </p>

      <p className="text-3xl font-black mt-1">
        {value}
      </p>
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-4 py-2.5 rounded-full text-sm font-black border ${
        active
          ? 'bg-purple-700 border-purple-700 text-white'
          : 'bg-white text-gray-700'
      }`}
    >
      {children}
    </button>
  )
}

function MiniInfo({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-[11px] font-bold text-gray-500">
        {label}
      </p>

      <p className="text-sm font-black mt-1 truncate">
        {value}
      </p>
    </div>
  )
}

function StatusBadge({
  status,
  hasOffer,
}: {
  status: string
  hasOffer: boolean
}) {
  let label = words(status)

  if (
    status === 'requested' &&
    !hasOffer
  ) {
    label = 'Needs Quote'
  }

  if (
    ['requested', 'negotiating'].includes(
      status
    ) &&
    hasOffer
  ) {
    label = 'Quoted'
  }

  const active =
    [
      'fare_agreed',
      'awaiting_payment',
      'confirmed',
      'in_progress',
      'awaiting_customer_confirmation',
    ].includes(status)

  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${
        active
          ? 'bg-green-100 text-green-800'
          : hasOffer
            ? 'bg-blue-100 text-blue-800'
            : 'bg-amber-100 text-amber-800'
      }`}
    >
      {label}
    </span>
  )
}
