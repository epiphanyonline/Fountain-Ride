'use client'

import { useMemo, useState } from 'react'
import { money } from '../../../lib/marketplace'

function formatBooked(value?: string) {
  if (!value) return '—'

  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPickup(date?: string, time?: string) {
  if (!date) return 'Not scheduled'

  const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  )

  return time ? `${formattedDate} · ${time}` : formattedDate
}

export default function TripOperations({
  rides,
}: {
  rides: any[]
}) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [visible, setVisible] = useState(10)

  const statuses = useMemo(
    () =>
      Array.from(
        new Set(
          rides
            .map((ride) => ride.status)
            .filter(Boolean)
        )
      ).sort(),
    [rides]
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return rides.filter((ride) => {
      const driver = ride.accepted_driver

      const searchable = [
        ride.booking_ref,
        ride.rider_name,
        ride.rider_phone,
        ride.pickup_address,
        ride.pickup_state,
        ride.dropoff_address,
        ride.dropoff_state,
        driver?.full_name,
        driver?.phone,
        driver?.vehicle_plate,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      if (query && !searchable.includes(query)) {
        return false
      }

      if (status !== 'all' && ride.status !== status) {
        return false
      }

      // Date filtering uses the scheduled pickup date where available.
      // If no pickup date exists, fall back to the booking creation date.
      const rideDate =
        ride.pickup_date ||
        (ride.created_at ? ride.created_at.slice(0, 10) : '')

      if (fromDate && rideDate && rideDate < fromDate) {
        return false
      }

      if (toDate && rideDate && rideDate > toDate) {
        return false
      }

      return true
    })
  }, [rides, search, status, fromDate, toDate])

  const shown = filtered.slice(0, visible)

  function resetFilters() {
    setSearch('')
    setStatus('all')
    setFromDate('')
    setToDate('')
    setVisible(10)
  }

  return (
    <section className="rounded-3xl border bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-purple-700">
            Live Operations
          </p>

          <h2 className="text-xl font-black">
            Trip Operations
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Search and trace rider-driver trips without scrolling through the
            entire marketplace.
          </p>
        </div>

        <div className="text-sm text-gray-500">
          <b className="text-gray-950">{filtered.length}</b> matching trips
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <div>
          <label className="text-xs font-black text-gray-600">
            Search trip
          </label>

          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setVisible(10)
            }}
            placeholder="Booking ref, rider, phone, driver, route or plate"
            className="mt-1 w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-purple-600"
          />
        </div>

        <div>
          <label className="text-xs font-black text-gray-600">
            Status
          </label>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setVisible(10)
            }}
            className="mt-1 w-full rounded-xl border bg-white px-3 py-3 text-sm"
          >
            <option value="all">All statuses</option>

            {statuses.map((item) => (
              <option key={String(item)} value={String(item)}>
                {String(item).replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-black text-gray-600">
            From
          </label>

          <input
            type="date"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.target.value)
              setVisible(10)
            }}
            className="mt-1 w-full rounded-xl border px-3 py-3 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-black text-gray-600">
            To
          </label>

          <input
            type="date"
            value={toDate}
            onChange={(event) => {
              setToDate(event.target.value)
              setVisible(10)
            }}
            className="mt-1 w-full rounded-xl border px-3 py-3 text-sm"
          />
        </div>

        <button
          onClick={resetFilters}
          className="rounded-xl border px-4 py-3 text-sm font-black xl:mt-[21px]"
        >
          Clear
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border">
        {shown.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No trips match these filters.
          </div>
        ) : (
          <div className="divide-y">
            {shown.map((ride) => {
              const driver = ride.accepted_driver

              return (
                <div
                  key={ride.id}
                  className="p-4 transition hover:bg-purple-50/40"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`/admin/marketplace/rides/${ride.id}`}
                          className="font-black text-gray-950 hover:text-purple-700"
                        >
                          {ride.booking_ref}
                        </a>

                        <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-black uppercase text-purple-700">
                          {String(ride.status || 'unknown').replaceAll(
                            '_',
                            ' '
                          )}
                        </span>
                      </div>

                      <p className="mt-2 font-bold">
                        {ride.pickup_address ||
                          ride.pickup_state ||
                          'Pickup'}
                        {' → '}
                        {ride.dropoff_address ||
                          ride.dropoff_state ||
                          'Destination'}
                      </p>

                      <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <span className="block text-gray-400">
                            Booked
                          </span>
                          <b>{formatBooked(ride.created_at)}</b>
                        </div>

                        <div>
                          <span className="block text-gray-400">
                            Pickup
                          </span>
                          <b>
                            {formatPickup(
                              ride.pickup_date,
                              ride.pickup_time
                            )}
                          </b>
                        </div>

                        <div>
                          <span className="block text-gray-400">
                            Rider
                          </span>
                          <b>{ride.rider_name || '—'}</b>
                          {ride.rider_phone && (
                            <span className="block">
                              {ride.rider_phone}
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="block text-gray-400">
                            Driver
                          </span>
                          <b>
                            {driver?.full_name || 'Not assigned'}
                          </b>
                          {driver?.phone && (
                            <span className="block">
                              {driver.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-row items-center justify-between gap-5 xl:flex-col xl:items-end">
                      <div className="text-left xl:text-right">
                        {ride.agreed_fare ? (
                          <>
                            <p className="text-xs text-gray-400">
                              Agreed fare
                            </p>
                            <p className="font-black">
                              {money(ride.agreed_fare)}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400">
                            Fare not agreed
                          </p>
                        )}
                      </div>

                      <a
                        href={`/admin/marketplace/rides/${ride.id}`}
                        className="rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white"
                      >
                        View trip →
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Showing {Math.min(visible, filtered.length)} of {filtered.length}
        </p>

        <div className="flex gap-2">
          {visible > 10 && (
            <button
              onClick={() => setVisible(10)}
              className="rounded-xl border px-4 py-2 text-sm font-black"
            >
              Show less
            </button>
          )}

          {visible < filtered.length && (
            <button
              onClick={() => setVisible((current) => current + 15)}
              className="rounded-xl bg-purple-700 px-4 py-2 text-sm font-black text-white"
            >
              View more
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
