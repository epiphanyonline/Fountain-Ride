'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [pin, setPin] = useState('')
  const router = useRouter()

  function handleLogin() {
    if (pin === '1234') {
      localStorage.setItem('admin_auth', 'true')
      router.push('/admin')
    } else {
      alert('Invalid PIN')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-3xl shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-4">Admin Access</h1>

        <input
          type="password"
          placeholder="Enter PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="border p-3 rounded-xl w-full"
        />

        <button
          onClick={handleLogin}
          className="mt-4 w-full bg-purple-700 text-white py-3 rounded-xl"
        >
          Login
        </button>
      </div>
    </div>
  )
}