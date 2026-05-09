'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatNaira } from '../../lib/format'
import Link from 'next/link'

function getCarImages(car: any): string[] {
  if (Array.isArray(car.image_urls) && car.image_urls.length > 0) {
    return car.image_urls.filter(Boolean)
  }

  if (car.image_url) return [car.image_url]

  return []
}

export default function CarsPage() {
  const [cars, setCars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCars()
  }, [])

  async function fetchCars() {
    setLoading(true)

    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .eq('status', 'available')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setCars([])
    } else {
      setCars(data || [])
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#f7f4fb] text-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-8">
          <p className="text-sm font-bold text-purple-700">
            Careful drivers. Professional service. No overspeeding.
          </p>

          <h1 className="text-3xl md:text-5xl font-black mt-2">
            Explore Our Fleet
          </h1>

          <p className="text-gray-600 mt-3 max-w-2xl">
            Choose from our available cars and send your booking request.
            Hidden or unavailable cars will not appear here.
          </p>
        </div>

        {loading && (
          <div className="bg-white rounded-3xl border shadow-sm p-8">
            <p className="font-semibold text-gray-600">
              Loading available cars...
            </p>
          </div>
        )}

        {!loading && cars.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {cars.map((car) => {
              const images = getCarImages(car)
              const mainImage = images[0]

              return (
                <div
                  key={car.id}
                  className="bg-white rounded-3xl shadow-sm border overflow-hidden hover:shadow-lg transition"
                >
                  <div className="h-48 bg-gray-100 overflow-hidden relative">
                    {mainImage ? (
                      <img
                        src={mainImage}
                        alt={car.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center px-4 text-center">
                        <p className="text-gray-400 text-sm font-semibold">
                          Image coming soon
                        </p>
                      </div>
                    )}

                    {images.length > 1 && (
                      <div className="absolute top-3 right-3 bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full">
                        {images.length} photos
                      </div>
                    )}
                  </div>

                  {images.length > 1 && (
                    <div className="px-4 pt-3 grid grid-cols-4 gap-2">
                      {images.slice(0, 4).map((url: string, index: number) => (
                        <img
                          key={`${url}-${index}`}
                          src={url}
                          alt={`${car.name} ${index + 1}`}
                          className="h-12 w-full object-cover rounded-xl bg-gray-100"
                        />
                      ))}
                    </div>
                  )}

                  <div className="p-5">
                    <h2 className="font-black text-lg">{car.name}</h2>

                    <div className="text-sm text-gray-500 mt-2">
                      {car.transmission || 'Automatic'} •{' '}
                      {car.fuel_type || 'Petrol'} • {car.seats || 5} seats
                    </div>

                    <div className="mt-4 font-black text-xl">
                      {formatNaira(car.daily_rate)} / day
                    </div>

                    <Link href={`/cars/${car.id}`}>
                      <button className="mt-5 w-full bg-purple-700 hover:bg-purple-800 text-white py-3 rounded-2xl font-bold">
                        Select Car
                      </button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && cars.length === 0 && (
          <div className="bg-white rounded-[2rem] border shadow-sm p-8 md:p-12 text-center">
            <h2 className="text-2xl font-black">
              No cars available right now
            </h2>

            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              Please check back later or chat with us on WhatsApp for assistance.
            </p>

            <a
              href="https://wa.me/2348168839382?text=Hello%2C%20I%20need%20a%20reliable%20car%20with%20driver.%20Please%20assist%20me."
              target="_blank"
            >
              <button className="mt-6 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-bold">
                Chat on WhatsApp
              </button>
            </a>
          </div>
        )}
      </div>
    </main>
  )
}