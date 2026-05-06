'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminDashboardPage() {
  const router = useRouter()

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth')

    if (auth !== 'true') {
      router.push('/admin/login')
    }
  }, [router])

  function logout() {
    localStorage.removeItem('admin_auth')
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-purple-700">Car Hire Admin</p>
            <h1 className="text-4xl font-bold mt-2">Control Centre</h1>
            <p className="text-gray-500 mt-2">
              Manage bookings, cars, homepage content, and daily hire operations.
            </p>
          </div>

          <button
            onClick={logout}
            className="bg-gray-900 text-white px-5 py-3 rounded-2xl font-semibold"
          >
            Logout
          </button>
        </div>

        <div className="grid md:grid-cols-4 gap-6">

          <Link href="/admin/bookings">
            <div className="bg-white rounded-3xl shadow p-6 hover:shadow-lg transition cursor-pointer h-full">
              <div className="text-4xl mb-4">📅</div>
              <h2 className="text-xl font-bold">Bookings</h2>
              <p className="text-gray-500 mt-2">
                Review pending requests, confirm hires, reject bookings, and mark completed rentals.
              </p>
              <button className="mt-5 bg-purple-700 text-white px-5 py-3 rounded-2xl font-semibold">
                Manage Bookings
              </button>
            </div>
          </Link>

          <Link href="/admin/cars">
            <div className="bg-white rounded-3xl shadow p-6 hover:shadow-lg transition cursor-pointer h-full">
              <div className="text-4xl mb-4">🚗</div>
              <h2 className="text-xl font-bold">Fleet</h2>
              <p className="text-gray-500 mt-2">
                Add cars, update daily rates, manage images, and control vehicle availability.
              </p>
              <button className="mt-5 bg-purple-700 text-white px-5 py-3 rounded-2xl font-semibold">
                Manage Cars
              </button>
            </div>
          </Link>

          <Link href="/admin/site">
            <div className="bg-white rounded-3xl shadow p-6 hover:shadow-lg transition cursor-pointer h-full">
              <div className="text-4xl mb-4">🖼️</div>
              <h2 className="text-xl font-bold">Homepage Editor</h2>
              <p className="text-gray-500 mt-2">
                Update homepage headline, subtitle, hero image, WhatsApp text, and brand messaging.
              </p>
              <button className="mt-5 bg-purple-700 text-white px-5 py-3 rounded-2xl font-semibold">
                Edit Homepage
              </button>
            </div>
          </Link>

          <Link href="/">
            <div className="bg-white rounded-3xl shadow p-6 hover:shadow-lg transition cursor-pointer h-full">
              <div className="text-4xl mb-4">🌍</div>
              <h2 className="text-xl font-bold">Public Website</h2>
              <p className="text-gray-500 mt-2">
                View the customer-facing website exactly as customers will see it.
              </p>
              <button className="mt-5 bg-gray-900 text-white px-5 py-3 rounded-2xl font-semibold">
                View Website
              </button>
            </div>
          </Link>

        </div>
      </div>
    </div>
  )
}