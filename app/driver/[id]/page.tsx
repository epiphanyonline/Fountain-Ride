'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import MarketplaceNav from '../../components/MarketplaceNav'

type Driver = {
  id: string
  full_name: string
  driver_type?: string | null
  park_name?: string | null
  home_state?: string | null
  home_city?: string | null
  vehicle_make?: string | null
  vehicle_model?: string | null
  vehicle_year?: number | null
  verification_status?: string | null
  created_at?: string | null
}

type Reputation = {
  average_rating?: number
  review_count?: number
  completed_trips?: number
}

type Review = {
  id: string
  rating: number
  comment?: string | null
  punctuality_rating?: number | null
  safety_rating?: number | null
  vehicle_rating?: number | null
  communication_rating?: number | null
  professionalism_rating?: number | null
  created_at?: string | null
}

export default function DriverProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [driver, setDriver] = useState<Driver | null>(null)
  const [reputation, setReputation] = useState<Reputation>({})
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const garageId = searchParams.get('garageId')

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(
          `/api/marketplace/drivers/${id}/profile`
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load driver profile')
        }

        setDriver(data.driver)
        setReputation(data.reputation || {})
        setReviews(data.reviews || [])
      } catch (err: any) {
        setError(err.message || 'Unable to load driver profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [id])

  function stars(value: number) {
    const rounded = Math.round(Number(value || 0))

    return Array.from({ length: 5 }, (_, index) =>
      index < rounded ? '★' : '☆'
    ).join('')
  }

  function bookDriver() {
    const query = new URLSearchParams({
      mode: 'garage',
      driverId: id,
    })

    if (garageId) {
      query.set('garageId', garageId)
    }

    router.push(`/book?${query.toString()}`)
  }

  const averageRating = Number(reputation.average_rating || 0)
  const reviewCount = Number(reputation.review_count || 0)
  const completedTrips = Number(reputation.completed_trips || 0)

  if (loading) {
    return (
      <>
        <MarketplaceNav />
        <main className="min-h-screen bg-[#f7f4fb] px-4 py-12">
          <div className="mx-auto max-w-4xl rounded-[2rem] border bg-white p-10 text-center text-gray-500">
            Loading driver profile…
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <MarketplaceNav />

      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#efe4ff,#f8f5fb_45%)] pb-24">
        <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">

          {garageId ? (
            <Link
              href={`/garage/${garageId}`}
              className="text-sm font-black text-purple-700"
            >
              ← Back to garage
            </Link>
          ) : (
            <Link
              href="/garage"
              className="text-sm font-black text-purple-700"
            >
              ← Mobile Garage
            </Link>
          )}

          {error || !driver ? (
            <section className="mt-5 rounded-[2rem] border border-red-200 bg-red-50 p-8">
              <h1 className="text-2xl font-black text-red-800">
                Driver profile unavailable
              </h1>

              <p className="mt-2 text-sm text-red-700">
                {error || 'Driver profile not found'}
              </p>
            </section>
          ) : (
            <>
              {/* DRIVER HERO */}
              <section className="mt-4 overflow-hidden rounded-[2rem] bg-gradient-to-br from-purple-800 via-purple-700 to-gray-950 p-6 text-white shadow-xl md:p-9">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[1.5rem] bg-white/10 text-4xl">
                      🚘
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-black tracking-widest text-purple-200">
                          VERIFIED FOUNTAIN RIDE DRIVER
                        </p>

                        <span className="rounded-full bg-green-400/20 px-2.5 py-1 text-[10px] font-black text-green-200">
                          APPROVED
                        </span>
                      </div>

                      <h1 className="mt-2 text-3xl font-black md:text-5xl">
                        {driver.full_name}
                      </h1>

                      <p className="mt-2 text-sm text-purple-100">
                        {[
                          driver.vehicle_year,
                          driver.vehicle_make,
                          driver.vehicle_model,
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      </p>

                      {driver.park_name && (
                        <p className="mt-1 text-sm text-purple-200">
                          {driver.park_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={bookDriver}
                    className="rounded-2xl bg-white px-6 py-4 font-black text-purple-800"
                  >
                    Book this driver →
                  </button>
                </div>
              </section>

              {/* REPUTATION SUMMARY */}
              <section className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.5rem] border bg-white p-5">
                  <p className="text-xs font-black uppercase tracking-wider text-gray-400">
                    Rating
                  </p>

                  {reviewCount > 0 ? (
                    <>
                      <p className="mt-2 text-3xl font-black">
                        {averageRating.toFixed(1)}
                      </p>

                      <p className="mt-1 font-black text-amber-500">
                        {stars(averageRating)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-lg font-black">
                      New driver
                    </p>
                  )}
                </div>

                <div className="rounded-[1.5rem] border bg-white p-5">
                  <p className="text-xs font-black uppercase tracking-wider text-gray-400">
                    Completed trips
                  </p>

                  <p className="mt-2 text-3xl font-black">
                    {completedTrips}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Fountain Ride journeys
                  </p>
                </div>

                <div className="rounded-[1.5rem] border bg-white p-5">
                  <p className="text-xs font-black uppercase tracking-wider text-gray-400">
                    Rider reviews
                  </p>

                  <p className="mt-2 text-3xl font-black">
                    {reviewCount}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Published reviews
                  </p>
                </div>
              </section>

              {/* DRIVER DETAILS */}
              <section className="mt-5 rounded-[2rem] border bg-white p-6">
                <p className="text-xs font-black tracking-widest text-purple-700">
                  DRIVER & VEHICLE
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  About this driver
                </h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs font-black text-gray-400">
                      DRIVER TYPE
                    </p>
                    <p className="mt-1 font-bold capitalize">
                      {driver.driver_type || 'Commercial'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-black text-gray-400">
                      VEHICLE
                    </p>
                    <p className="mt-1 font-bold">
                      {[driver.vehicle_make, driver.vehicle_model]
                        .filter(Boolean)
                        .join(' ') || 'Vehicle registered'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-black text-gray-400">
                      LOCATION
                    </p>
                    <p className="mt-1 font-bold">
                      {[driver.home_city, driver.home_state]
                        .filter(Boolean)
                        .join(', ') || 'Nigeria'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-black text-gray-400">
                      GARAGE
                    </p>
                    <p className="mt-1 font-bold">
                      {driver.park_name || 'Registered park'}
                    </p>
                  </div>
                </div>
              </section>

              {/* REVIEWS */}
              <section className="mt-5">
                <div>
                  <p className="text-xs font-black tracking-widest text-purple-700">
                    VERIFIED RIDER FEEDBACK
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    What riders say
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Reviews shown here are published Fountain Ride trip reviews.
                  </p>
                </div>

                {reviews.length === 0 ? (
                  <div className="mt-4 rounded-[2rem] border bg-white p-8 text-center">
                    <h3 className="font-black">
                      No rider reviews yet
                    </h3>

                    <p className="mt-2 text-sm text-gray-500">
                      This driver has not received a published Fountain Ride
                      review yet.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {reviews.map((review) => (
                      <article
                        key={review.id}
                        className="rounded-[2rem] border bg-white p-5 md:p-6"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-amber-500">
                                {stars(review.rating)}
                              </span>

                              <span className="font-black">
                                {Number(review.rating).toFixed(1)}
                              </span>
                            </div>

                            <p className="mt-1 text-xs font-bold text-green-700">
                              Completed trip review
                            </p>
                          </div>

                          {review.created_at && (
                            <p className="text-xs text-gray-400">
                              {new Date(review.created_at).toLocaleDateString(
                                'en-GB',
                                {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                }
                              )}
                            </p>
                          )}
                        </div>

                        {review.comment && (
                          <p className="mt-4 text-sm leading-6 text-gray-700">
                            “{review.comment}”
                          </p>
                        )}

                        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                          <RatingItem
                            label="Punctuality"
                            value={review.punctuality_rating}
                          />
                          <RatingItem
                            label="Safety"
                            value={review.safety_rating}
                          />
                          <RatingItem
                            label="Vehicle"
                            value={review.vehicle_rating}
                          />
                          <RatingItem
                            label="Communication"
                            value={review.communication_rating}
                          />
                          <RatingItem
                            label="Professionalism"
                            value={review.professionalism_rating}
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              {/* CTA */}
              <section className="mt-7 rounded-[2rem] bg-gray-950 p-6 text-white md:flex md:items-center md:justify-between md:gap-6">
                <div>
                  <p className="text-xs font-black tracking-widest text-purple-300">
                    READY TO TRAVEL?
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    Request a fare from {driver.full_name}.
                  </h2>

                  <p className="mt-2 text-sm text-gray-300">
                    Enter your journey details first. You can review and
                    negotiate the driver's fare before paying.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={bookDriver}
                  className="mt-4 rounded-xl bg-white px-5 py-3 text-sm font-black text-gray-950 md:mt-0"
                >
                  Book this driver →
                </button>
              </section>
            </>
          )}
        </div>
      </main>
    </>
  )
}

function RatingItem({
  label,
  value,
}: {
  label: string
  value?: number | null
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-[10px] font-black uppercase text-gray-400">
        {label}
      </p>

      <p className="mt-1 font-black">
        {value != null ? `${value}/5` : '—'}
      </p>
    </div>
  )
}
