'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ADMIN_OPTIONS = [
  'Ronke',
  'Seyi',
  'Samuel',
  'Damilola',
]

export default function AdminLogin() {
  const router = useRouter()

  const [adminName, setAdminName] = useState('Ronke')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    if (!pin.trim()) {
      alert('Please enter admin password')
      return
    }

    setLoading(true)

    const correctPassword =
      process.env.NEXT_PUBLIC_ADMIN_PASSWORD

    if (pin === correctPassword) {
      localStorage.setItem(
        'fountain_admin_logged_in',
        'true'
      )

      localStorage.setItem(
        'fountain_admin_name',
        adminName
      )

      router.push('/admin')
    } else {
      alert('Invalid admin password')
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#f7f4fb] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-sm border overflow-hidden">
        <div className="bg-purple-700 text-white p-6">
          <p className="text-sm font-bold opacity-90">
            Fountain Ride Operations
          </p>

          <h1 className="text-3xl font-black mt-2">
            Admin Access
          </h1>

          <p className="text-purple-100 mt-2 text-sm leading-relaxed">
            Secure access for bookings, customer support,
            fleet operations and partner vehicle management.
          </p>
        </div>

        <div className="p-6 md:p-8">
          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Team Member
              </label>

              <select
                value={adminName}
                onChange={(e) =>
                  setAdminName(e.target.value)
                }
                className="w-full border rounded-2xl p-4 bg-white"
              >
                {ADMIN_OPTIONS.map((admin) => (
                  <option key={admin} value={admin}>
                    {admin}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Admin Password
              </label>

              <input
                type="password"
                placeholder="Enter secure password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full border rounded-2xl p-4"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white py-4 rounded-2xl font-bold transition"
            >
              {loading ? 'Signing in...' : 'Access Admin Dashboard'}
            </button>
          </form>

          <div className="mt-6 bg-[#f7f4fb] rounded-2xl p-4 border">
            <p className="text-sm text-gray-600 leading-relaxed">
              Logged-in staff identity is used for:
            </p>

            <ul className="mt-3 text-sm text-gray-700 space-y-2">
              <li>• Live chat assignment</li>
              <li>• Customer support tracking</li>
              <li>• Internal operations visibility</li>
              <li>• Team coordination</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}