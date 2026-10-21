'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MarketplaceNav from '../../components/MarketplaceNav'

type Reputation = {
  average_rating?: number
  review_count?: number
  completed_trips?: number
}

type Driver = {
  id: string
  full_name: string
  vehicle_make?: string | null
  vehicle_model?: string | null
  vehicle_year?: number | null
  vehicle_plate?: string | null
  home_city?: string | null
  home_state?: string | null
  is_available?: boolean
  created_at?: string
  reputation?: Reputation
}

type Garage = {
  id: string
  name: string
  state?: string | null
  city?: string | null
  address?: string | null
}

export default function GaragePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [garage, setGarage] = useState<Garage | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [search, setSearch] = useState('')
  const [availability, setAvailability] = useState<'all' | 'available'>('all')
  const [ratingFilter, setRatingFilter] = useState<
  'all' | '5' | '4' | '3'
>('all')
  const [sort, setSort] = useState<'recommended' | 'rating' | 'trips'>(
    'recommended'
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadGarage() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(
          `/api/marketplace/garages/${id}/drivers`
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load garage')
        }

        setGarage(data.garage)
        setDrivers(data.drivers || [])
      } catch (err: any) {
        setError(err.message || 'Unable to load garage')
      } finally {
        setLoading(false)
      }
    }

    loadGarage()
  }, [id])

  const filteredDrivers = useMemo(() => {
    const query = search.trim().toLowerCase()

    const result = drivers.filter((driver) => {
      if (availability === 'available' && !driver.is_available) {
        return false
      }

      const driverRating = Number(driver.reputation?.average_rating || 0)
const reviewCount = Number(driver.reputation?.review_count || 0)

if (ratingFilter === '5' && (reviewCount === 0 || driverRating < 5)) {
  return false
}

if (ratingFilter === '4' && (reviewCount === 0 || driverRating < 4)) {
  return false
}

if (ratingFilter === '3' && (reviewCount === 0 || driverRating < 3)) {
  return false
}

      if (!query) {
        return true
      }

      return [
        driver.full_name,
        driver.vehicle_make,
        driver.vehicle_model,
        driver.vehicle_plate,
        driver.home_city,
        driver.home_state,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    })

    return [...result].sort((a, b) => {
      if (sort === 'rating') {
        return (
          Number(b.reputation?.average_rating || 0) -
          Number(a.reputation?.average_rating || 0)
        )
      }

      if (sort === 'trips') {
        return (
          Number(b.reputation?.completed_trips || 0) -
          Number(a.reputation?.completed_trips || 0)
        )
      }

      if (a.is_available !== b.is_available) {
        return a.is_available ? -1 : 1
      }

      const ratingDifference =
        Number(b.reputation?.average_rating || 0) -
        Number(a.reputation?.average_rating || 0)

      if (ratingDifference !== 0) {
        return ratingDifference
      }

      return (
        Number(b.reputation?.completed_trips || 0) -
        Number(a.reputation?.completed_trips || 0)
      )
    })
  }, [drivers, search, availability, ratingFilter, sort])

  function bookDriver(driver: Driver) {
    if (!driver.is_available) return

    const query = new URLSearchParams({
      mode: 'garage',
      garageId: id,
      driverId: driver.id,
    })

    router.push(`/book?${query.toString()}`)
  }

  function stars(rating: number) {
    const rounded = Math.round(rating)

    return Array.from({ length: 5 }, (_, index) =>
      index < rounded ? '★' : '☆'
    ).join('')
  }

  if (loading) {
    return (
      <>
        <MarketplaceNav />
        <main className="min-h-screen bg-[#f7f4fb] px-4 py-12">
          <div className="mx-auto max-w-6xl rounded-[2rem] border bg-white p-10 text-center text-gray-500">
            Loading Mobile Garage…
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <MarketplaceNav />

      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#efe4ff,#f8f5fb_45%)] pb-24">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">

          <Link
            href="/garage"
            className="inline-flex items-center text-sm font-black text-purple-700"
          >
            ← Back to Mobile Garage
          </Link>

          {error ? (
            <section className="mt-5 rounded-[2rem] border border-red-200 bg-red-50 p-8">
              <h1 className="text-2xl font-black text-red-800">
                Garage unavailable
              </h1>

              <p className="mt-2 text-sm text-red-700">
                {error}
              </p>
            </section>
          ) : (
            <>
              {/* GARAGE HERO */}
              <section className="mt-4 overflow-hidden rounded-[2rem] bg-gradient-to-br from-purple-800 via-purple-700 to-gray-950 p-6 text-white shadow-xl md:p-9">
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs font-black tracking-[0.18em] text-purple-200">
                      FOUNTAIN RIDE MOBILE GARAGE™
                    </p>

                    <h1 className="mt-2 text-4xl font-black md:text-5xl">
                      {garage?.name}
                    </h1>

                    <p className="mt-2 text-sm text-purple-100">
                      {[garage?.city, garage?.state]
                        .filter(Boolean)
                        .join(', ')}
                    </p>

                    {garage?.address && (
                      <p className="mt-2 max-w-2xl text-sm text-purple-200">
                        {garage.address}
                      </p>
                    )}

                    <p className="mt-5 max-w-2xl leading-6 text-purple-100">
                      You are inside the digital motor park. Compare the
                      registered drivers here, check their Fountain Ride
                      history and choose who you want to travel with.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-white/10 px-5 py-4">
                      <p className="text-2xl font-black">
                        {drivers.length}
                      </p>
                      <p className="text-xs text-purple-200">
                        Registered drivers
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/10 px-5 py-4">
                      <p className="text-2xl font-black">
                        {drivers.filter((driver) => driver.is_available).length}
                      </p>
                      <p className="text-xs text-purple-200">
                        Available now
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* CONTROL BAR */}
              <section className="mt-5 rounded-[2rem] border bg-white p-4 md:p-5">
                <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
                  <label>
                    <span className="text-xs font-black text-gray-600">
                      Find a driver
                    </span>

                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Driver name, vehicle or plate"
                      className="mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-purple-600"
                    />
                  </label>

                  <label>
                    <span className="text-xs font-black text-gray-600">
                      Availability
                    </span>

                    <select
                      value={availability}
                      onChange={(event) =>
                        setAvailability(
                          event.target.value as 'all' | 'available'
                        )
                      }
                      className="mt-1 w-full rounded-xl border bg-white px-4 py-3 text-sm"
                    >
                      <option value="all">All drivers</option>
                      <option value="available">Available now</option>
                    </select>
                  </label>

                  <label>
  <span className="text-xs font-black text-gray-600">
    Rating
  </span>

  <select
    value={ratingFilter}
    onChange={(event) =>
      setRatingFilter(
        event.target.value as 'all' | '5' | '4' | '3'
      )
    }
    className="mt-1 w-full rounded-xl border bg-white px-4 py-3 text-sm"
  >
    <option value="all">All ratings</option>
    <option value="5">★★★★★ 5.0 only</option>
    <option value="4">★★★★ 4.0 & above</option>
    <option value="3">★★★ 3.0 & above</option>
  </select>
</label>

                  <label>
                    <span className="text-xs font-black text-gray-600">
                      Sort by
                    </span>

                    <select
                      value={sort}
                      onChange={(event) =>
                        setSort(
                          event.target.value as
                            | 'recommended'
                            | 'rating'
                            | 'trips'
                        )
                      }
                      className="mt-1 w-full rounded-xl border bg-white px-4 py-3 text-sm"
                    >
                      <option value="recommended">Recommended</option>
                      <option value="rating">Highest rating</option>
                      <option value="trips">Most completed trips</option>
                    </select>
                  </label>
                </div>
              </section>

              {/* DRIVER DIRECTORY HEADER */}
              <section className="mt-7 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black tracking-widest text-purple-700">
                    DRIVERS IN THIS GARAGE
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    Choose your driver
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Reputation is based on completed Fountain Ride trips and
                    published rider reviews.
                  </p>
                </div>

                <p className="hidden text-sm text-gray-500 sm:block">
                  <b className="text-gray-950">
                    {filteredDrivers.length}
                  </b>{' '}
                  {filteredDrivers.length === 1 ? 'driver' : 'drivers'}
                </p>
              </section>

              {/* DRIVER CARDS */}
              {filteredDrivers.length === 0 ? (
                <section className="mt-4 rounded-[2rem] border bg-white p-8 text-center">
                  <h3 className="font-black">
                    No matching driver
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    Try changing your search or availability filter.
                  </p>
                </section>
              ) : (
                <section className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredDrivers.map((driver) => {
                    const rating = Number(
                      driver.reputation?.average_rating || 0
                    )

                    const reviewCount = Number(
                      driver.reputation?.review_count || 0
                    )

                    const completedTrips = Number(
                      driver.reputation?.completed_trips || 0
                    )

                    return (
                      <article
                        key={driver.id}
                        className="flex flex-col overflow-hidden rounded-[2rem] border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-2xl">
                              🚘
                            </div>

                            {driver.is_available ? (
                              <span className="rounded-full bg-green-50 px-3 py-1.5 text-[10px] font-black uppercase text-green-700">
                                Available
                              </span>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-3 py-1.5 text-[10px] font-black uppercase text-gray-500">
                                Currently busy
                              </span>
                            )}
                          </div>

                          <h3 className="mt-4 text-xl font-black">
                            {driver.full_name}
                          </h3>

                          <p className="mt-1 text-sm text-gray-600">
                            {[
                              driver.vehicle_year,
                              driver.vehicle_make,
                              driver.vehicle_model,
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          </p>

                          {driver.vehicle_plate && (
                            <p className="mt-1 text-xs font-bold text-gray-400">
                              {driver.vehicle_plate}
                            </p>
                          )}

                          {/* REPUTATION */}
                          <div className="mt-5 rounded-2xl bg-gray-50 p-4">
                            {reviewCount > 0 ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-amber-500">
                                    {stars(rating)}
                                  </span>

                                  <span className="font-black">
                                    {rating.toFixed(1)}
                                  </span>
                                </div>

                                <p className="mt-1 text-xs text-gray-500">
                                  {reviewCount}{' '}
                                  {reviewCount === 1
                                    ? 'published review'
                                    : 'published reviews'}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="font-black">
                                  New on Fountain Ride
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                  No published rider reviews yet
                                </p>
                              </>
                            )}
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-2xl border p-3">
                              <p className="text-[10px] font-black uppercase text-gray-400">
                                Completed
                              </p>

                              <p className="mt-1 text-lg font-black">
                                {completedTrips}
                              </p>

                              <p className="text-xs text-gray-500">
                                trips
                              </p>
                            </div>

                            <div className="rounded-2xl border p-3">
                              <p className="text-[10px] font-black uppercase text-gray-400">
                                Status
                              </p>

                              <p
                                className={`mt-1 text-sm font-black ${
                                  driver.is_available
                                    ? 'text-green-700'
                                    : 'text-gray-500'
                                }`}
                              >
                                {driver.is_available
                                  ? 'Ready'
                                  : 'Busy'}
                              </p>

                              <p className="text-xs text-gray-500">
                                for bookings
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="mt-auto border-t bg-gray-50 p-4">
                          <div className="grid grid-cols-2 gap-2">
                            <Link
                              href={`/driver/${driver.id}?garageId=${id}`}
                              className="rounded-xl border bg-white px-3 py-3 text-center text-sm font-black text-gray-800"
                            >
                              View Driver
                            </Link>

                            <button
                              type="button"
                              disabled={!driver.is_available}
                              onClick={() => bookDriver(driver)}
                              className="rounded-xl bg-purple-700 px-3 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {driver.is_available
                                ? 'Book Driver'
                                : 'Unavailable'}
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </section>
              )}

              {/* EXPLANATION */}
              <section className="mt-8 rounded-[2rem] border bg-white p-6">
                <p className="text-xs font-black tracking-widest text-purple-700">
                  HOW MOBILE GARAGE™ WORKS
                </p>

                <div className="mt-4 grid gap-5 md:grid-cols-3">
                  <div>
                    <b className="block">
                      1. You choose
                    </b>
                    <p className="mt-1 text-sm text-gray-500">
                      Unlike Quick Match, you decide which registered driver
                      you want to approach.
                    </p>
                  </div>

                  <div>
                    <b className="block">
                      2. Driver quotes
                    </b>
                    <p className="mt-1 text-sm text-gray-500">
                      Your selected driver receives the journey request and can
                      send a fare for you to review.
                    </p>
                  </div>

                  <div>
                    <b className="block">
                      3. Agree, then pay
                    </b>
                    <p className="mt-1 text-sm text-gray-500">
                      Negotiate first. Payment only comes after you accept the
                      driver and agreed fare.
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </>
  )
}
