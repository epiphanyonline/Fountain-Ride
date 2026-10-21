'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import MarketplaceNav from '../components/MarketplaceNav'

type Garage = {
  id: string
  name: string
  state?: string | null
  city?: string | null
  address?: string | null
  available_drivers?: number
  distance_km?: number | null
}

export default function MobileGarageDirectory() {
  const [garages, setGarages] = useState<Garage[]>([])
  const [search, setSearch] = useState('')
  const [state, setState] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadGarages() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch('/api/marketplace/garages')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load Mobile Garages')
        }

        setGarages(data.garages || [])
      } catch (err: any) {
        setError(err.message || 'Unable to load Mobile Garages')
      } finally {
        setLoading(false)
      }
    }

    loadGarages()
  }, [])

  const states = useMemo(() => {
    return Array.from(
      new Set(
        garages
          .map((garage) => garage.state)
          .filter(Boolean) as string[]
      )
    ).sort()
  }, [garages])

  const filteredGarages = useMemo(() => {
    const query = search.trim().toLowerCase()

    return garages.filter((garage) => {
      if (state && garage.state !== state) {
        return false
      }

      if (!query) {
        return true
      }

      const searchable = [
        garage.name,
        garage.city,
        garage.state,
        garage.address,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchable.includes(query)
    })
  }, [garages, search, state])

  return (
    <>
      <MarketplaceNav />

      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#efe4ff,#f8f5fb_45%)] pb-24">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">

          {/* HERO */}
          <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-purple-800 via-purple-700 to-gray-950 p-6 text-white shadow-xl md:p-10">
            <div className="max-w-3xl">
              <p className="text-xs font-black tracking-[0.18em] text-purple-200">
                FOUNTAIN RIDE MOBILE GARAGE™
              </p>

              <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">
                Walk into a digital motor park.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-purple-100 md:text-base">
                Find the garage you trust, enter it, compare its registered
                drivers and choose who you want to travel with.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold">
                  Verified garages
                </span>

                <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold">
                  Driver reviews
                </span>

                <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold">
                  Completed trip history
                </span>

                <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold">
                  Choose your driver
                </span>
              </div>
            </div>
          </section>

          {/* EXPLANATION */}
          <section className="mt-5 rounded-[2rem] border bg-white p-5 md:p-6">
            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 font-black text-purple-700">
                  1
                </div>
                <h2 className="mt-3 font-black">
                  Find a garage
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Search for a registered motor park by name, city, area or
                  state.
                </p>
              </div>

              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 font-black text-purple-700">
                  2
                </div>
                <h2 className="mt-3 font-black">
                  Compare drivers
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  See vehicles, ratings, rider reviews and completed Fountain
                  Ride trips.
                </p>
              </div>

              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 font-black text-purple-700">
                  3
                </div>
                <h2 className="mt-3 font-black">
                  Choose and book
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Send your booking directly to the driver you choose and
                  negotiate the fare.
                </p>
              </div>
            </div>
          </section>

          {/* SEARCH */}
          <section className="mt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black tracking-widest text-purple-700">
                  GARAGE DIRECTORY
                </p>
                <h2 className="mt-1 text-2xl font-black md:text-3xl">
                  Find your motor park
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Enter a garage and see the drivers registered there.
                </p>
              </div>

              <p className="text-sm text-gray-500">
                <b className="text-gray-950">{filteredGarages.length}</b>{' '}
                {filteredGarages.length === 1 ? 'garage' : 'garages'}
              </p>
            </div>

            <div className="mt-4 grid gap-3 rounded-[2rem] border bg-white p-4 md:grid-cols-[2fr_1fr]">
              <label>
                <span className="text-xs font-black text-gray-600">
                  Search garage
                </span>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Garage name, city, area or address"
                  className="mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-purple-600"
                />
              </label>

              <label>
                <span className="text-xs font-black text-gray-600">
                  State
                </span>

                <select
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  className="mt-1 w-full rounded-xl border bg-white px-4 py-3 text-sm"
                >
                  <option value="">All states</option>

                  {states.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* GARAGES */}
          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-5 rounded-[2rem] border bg-white p-8 text-center text-sm text-gray-500">
              Loading Mobile Garages…
            </div>
          ) : filteredGarages.length === 0 ? (
            <div className="mt-5 rounded-[2rem] border bg-white p-8 text-center">
              <h3 className="font-black">
                No garage found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Try another garage name, city, area or state.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredGarages.map((garage) => (
                <article
                  key={garage.id}
                  className="flex flex-col rounded-[2rem] border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-xl">
                      🏁
                    </div>

                    <span className="rounded-full bg-green-50 px-3 py-1 text-[10px] font-black uppercase text-green-700">
                      Verified Garage
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-black">
                    {garage.name}
                  </h3>

                  <p className="mt-1 text-sm text-gray-600">
                    {[garage.city, garage.state]
                      .filter(Boolean)
                      .join(', ') || 'Nigeria'}
                  </p>

                  {garage.address && (
                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      {garage.address}
                    </p>
                  )}

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-[10px] font-black uppercase text-gray-400">
                        Available now
                      </p>
                      <p className="mt-1 text-lg font-black">
                        {garage.available_drivers || 0}
                      </p>
                      <p className="text-xs text-gray-500">
                        drivers
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-[10px] font-black uppercase text-gray-400">
                        Distance
                      </p>
                      <p className="mt-1 text-lg font-black">
                        {garage.distance_km != null
                          ? `${garage.distance_km} km`
                          : '—'}
                      </p>
                      <p className="text-xs text-gray-500">
                        from pickup
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto pt-5">
                    <Link
                      href={`/garage/${garage.id}`}
                      className="block w-full rounded-2xl bg-purple-700 p-3.5 text-center font-black text-white transition hover:bg-purple-800"
                    >
                      Enter Garage →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* QUICK MATCH ALTERNATIVE */}
          <section className="mt-8 rounded-[2rem] bg-gray-950 p-6 text-white md:flex md:items-center md:justify-between md:gap-6">
            <div>
              <p className="text-xs font-black tracking-widest text-purple-300">
                DON'T WANT TO CHOOSE?
              </p>

              <h2 className="mt-1 text-xl font-black">
                Let Fountain Ride find a driver for you.
              </h2>

              <p className="mt-2 text-sm text-gray-300">
                Use Quick Match and allow available drivers to send you their
                offers.
              </p>
            </div>

            <Link
              href="/"
              className="mt-4 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-black text-gray-950 md:mt-0"
            >
              Use Quick Match →
            </Link>
          </section>
        </div>
      </main>
    </>
  )
}
