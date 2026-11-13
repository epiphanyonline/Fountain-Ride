'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AdminGuard from '../../components/AdminGuard'

type Driver = {
  id: string
  full_name: string
  phone: string
  email: string | null
  driver_type: string | null
  work_mode: string | null
  account_status: string | null
  verification_status: string | null
  driver_hire_status: string | null
  driver_hire_approved: boolean | null
  is_available: boolean | null
  passenger_trip_available: boolean | null
  driver_hire_available: boolean | null
  home_city: string | null
  home_state: string | null
  park_name: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  vehicle_plate: string | null
  driving_experience_years: number | null
  drives_automatic: boolean | null
  drives_manual: boolean | null
  created_at: string
}

function normalisePhone(phone: string) {
  const compact = phone.replace(/[^\d+]/g, '')
  if (/^0\d{10}$/.test(compact)) return '+234' + compact.slice(1)
  if (/^234\d{10}$/.test(compact)) return '+' + compact
  if (/^\+234\d{10}$/.test(compact)) return compact
  return compact
}

function describe(value: string | null | undefined) {
  return value ? value.replaceAll('_', ' ') : 'Not recorded'
}

function badge(status: string | null | undefined) {
  if (status === 'approved' || status === 'activated') {
    return 'bg-green-100 text-green-800'
  }
  if (status === 'pending' || status === 'pre_registered') {
    return 'bg-amber-100 text-amber-900'
  }
  if (status === 'rejected' || status === 'suspended' || status === 'locked') {
    return 'bg-red-100 text-red-800'
  }
  return 'bg-gray-100 text-gray-700'
}

function Status({ label, status }: { label: string; status: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-bold capitalize ${badge(status)}`}>
        {describe(status)}
      </span>
    </div>
  )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-gray-950">{value}</p>
    </div>
  )
}

export default function RegisteredDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [total, setTotal] = useState(0)
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [verification, setVerification] = useState('all')
  const [mode, setMode] = useState('all')
  const [account, setAccount] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/drivers/directory', {
        credentials: 'same-origin',
        cache: 'no-store',
      })
      if (response.status === 401) {
        throw new Error('Admin session expired. Sign in again.')
      }
      const result = await response.json()
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Unable to load registered drivers.')
      }
      setDrivers(Array.isArray(result.drivers) ? result.drivers : [])
      setTotal(result.total ?? result.drivers?.length ?? 0)
      setTruncated(Boolean(result.truncated))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load drivers.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return drivers.filter((driver) => {
      const matchesSearch = !term ||
        [
          driver.full_name, driver.phone, driver.email, driver.park_name,
          driver.home_city, driver.home_state, driver.vehicle_plate,
          driver.vehicle_make, driver.vehicle_model,
        ].some((field) => (field || '').toLowerCase().includes(term))

      const matchesStatus =
        verification === 'all' ||
        driver.verification_status === verification ||
        (verification === 'driver_hire_approved' && driver.driver_hire_status === 'approved')

      const matchesMode =
        mode === 'all' ||
        driver.work_mode === mode ||
        (mode === 'driver_hire_or_both' && ['driver_hire', 'both'].includes(driver.work_mode || ''))

      const matchesAccount = account === 'all' || driver.account_status === account
      return matchesSearch && matchesStatus && matchesMode && matchesAccount
    })
  }, [drivers, search, verification, mode, account])

  const totals = useMemo(() => ({
    registered: drivers.length,
    generalApproved: drivers.filter((d) => d.verification_status === 'approved').length,
    hireApproved: drivers.filter((d) => d.driver_hire_status === 'approved').length,
    activated: drivers.filter((d) => d.account_status === 'activated').length,
  }), [drivers])

  return (
    <AdminGuard>
      <main className="min-h-screen bg-[#f7f4fb] px-4 py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link className="font-bold text-purple-700 hover:underline" href="/admin">
              Back to Admin Dashboard
            </Link>
            <button type="button" onClick={() => void reload()} disabled={loading}
              className="rounded-xl border border-purple-200 bg-white px-4 py-2 text-sm font-bold text-purple-700 disabled:opacity-50">
              {loading ? 'Refreshing...' : 'Refresh directory'}
            </button>
          </div>

          <header className="rounded-3xl bg-purple-900 p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-purple-200">Fountain Ride Mobile Garage</p>
            <h1 className="mt-2 text-3xl font-black">Registered Drivers Directory</h1>
            <p className="mt-2 text-sm text-purple-100">
              Contact registered drivers, check registration and approval status,
              and review their service and vehicle profiles. Admin access only.
            </p>
          </header>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Registered drivers', totals.registered],
              ['General profiles approved', totals.generalApproved],
              ['Driver Hire approved', totals.hireApproved],
              ['Activated accounts', totals.activated],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border bg-white p-4">
                <p className="text-xs font-semibold text-gray-600">{label}</p>
                <p className="mt-2 text-3xl font-black text-purple-800">{value}</p>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border bg-white p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <label className="md:col-span-2">
                <span className="text-xs font-bold text-gray-700">Search name, phone, email, location or vehicle</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)}
                  className="mt-1 w-full rounded-xl border p-3 text-sm" placeholder="Search registered drivers..." />
              </label>
              <label>
                <span className="text-xs font-bold text-gray-700">Verification</span>
                <select value={verification} onChange={(event) => setVerification(event.target.value)}
                  className="mt-1 w-full rounded-xl border p-3 text-sm">
                  <option value="all">All verification statuses</option>
                  <option value="approved">General approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="suspended">Suspended</option>
                  <option value="driver_hire_approved">Driver Hire approved</option>
                </select>
              </label>
              <label>
                <span className="text-xs font-bold text-gray-700">Service</span>
                <select value={mode} onChange={(event) => setMode(event.target.value)}
                  className="mt-1 w-full rounded-xl border p-3 text-sm">
                  <option value="all">All services</option>
                  <option value="driver_hire_or_both">Offers Driver Hire</option>
                  <option value="passenger_trips">Passenger trips only</option>
                  <option value="driver_hire">Driver Hire only</option>
                  <option value="both">Both services</option>
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="text-xs font-semibold text-gray-700">
                Account:{' '}
                <select value={account} onChange={(event) => setAccount(event.target.value)}
                  className="rounded-lg border bg-white p-2 text-sm">
                  <option value="all">All</option>
                  <option value="activated">Activated</option>
                  <option value="pre_registered">Pre-registered</option>
                  <option value="locked">Locked</option>
                </select>
              </label>
              <p className="text-sm font-bold text-gray-600">
                Showing {filtered.length} of {drivers.length} loaded drivers
                {total > drivers.length ? ` (${total} registered)` : ''}
              </p>
            </div>
            {truncated && <p className="mt-2 text-sm text-amber-800">
              Directory is limited to the latest 1,000 records. Contact support if you need older records.
            </p>}
          </section>

          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error} <Link href="/admin/login" className="ml-2 font-bold underline">Admin login</Link>
          </div>}

          {loading ? (
            <section className="rounded-2xl border bg-white p-8 text-center">Loading registered drivers...</section>
          ) : !error && filtered.length === 0 ? (
            <section className="rounded-2xl border bg-white p-8 text-center">
              No drivers match the selected filters.
            </section>
          ) : (
            <section className="grid gap-4 lg:grid-cols-2">
              {filtered.map((driver) => {
                const phone = normalisePhone(driver.phone || '')
                const whatsapp = phone.startsWith('+') ? phone.slice(1) : phone
                const isExpanded = expanded === driver.id
                return (
                  <article key={driver.id} className="min-w-0 rounded-3xl border bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-purple-700">Registered driver</p>
                        <h2 className="mt-1 break-words text-xl font-black text-gray-950">{driver.full_name}</h2>
                        <p className="mt-1 text-sm text-gray-600">{[driver.home_city, driver.home_state].filter(Boolean).join(', ') || 'Location not recorded'}</p>
                      </div>
                      <Status label="Verification" status={driver.verification_status} />
                    </div>

                    <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
                      <Info label="Phone number" value={driver.phone || 'Not recorded'} />
                      <Info label="Email" value={driver.email || 'Not provided'} />
                      <Info label="Account status" value={describe(driver.account_status)} />
                      <Info label="Service" value={describe(driver.work_mode)} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {phone && <a href={`tel:${phone}`} className="rounded-xl bg-purple-800 px-4 py-2 text-sm font-bold text-white hover:bg-purple-900">
                        Call driver
                      </a>}
                      {/^234\d{10}$/.test(whatsapp) && <a href={`https://wa.me/${whatsapp}`}
                        target="_blank" rel="noopener noreferrer"
                        className="rounded-xl border border-green-500 px-4 py-2 text-sm font-bold text-green-800 hover:bg-green-50">
                        WhatsApp
                      </a>}
                      {driver.email && <a href={`mailto:${encodeURIComponent(driver.email)}`}
                        className="rounded-xl border px-4 py-2 text-sm font-bold text-gray-900 hover:bg-gray-50">Email</a>}
                      <button type="button" onClick={() => setExpanded(isExpanded ? null : driver.id)}
                        aria-expanded={isExpanded}
                        className="rounded-xl border px-4 py-2 text-sm font-bold text-purple-800 hover:bg-purple-50">
                        {isExpanded ? 'Hide profile' : 'View profile'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 space-y-4 rounded-2xl bg-purple-50 p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Status label="Driver Hire approval" status={driver.driver_hire_status} />
                          <Status label="Account status" status={driver.account_status} />
                          <Info label="Driver type" value={describe(driver.driver_type)} />
                          <Info label="Garage / park" value={driver.park_name || 'Not recorded'} />
                          <Info label="Passenger trip availability" value={driver.passenger_trip_available ? 'On' : 'Off'} />
                          <Info label="Driver Hire availability" value={driver.driver_hire_available ? 'On' : 'Off'} />
                          <Info label="Vehicle" value={[driver.vehicle_year, driver.vehicle_make, driver.vehicle_model].filter(Boolean).join(' ') || 'Not recorded'} />
                          <Info label="Vehicle plate" value={driver.vehicle_plate || 'Not recorded'} />
                          <Info label="Driving experience" value={driver.driving_experience_years == null ? 'Not recorded' : `${driver.driving_experience_years} years`} />
                          <Info label="Transmission" value={[driver.drives_automatic && 'Automatic', driver.drives_manual && 'Manual'].filter(Boolean).join(' / ') || 'Not recorded'} />
                          <Info label="Registered" value={new Date(driver.created_at).toLocaleDateString('en-GB')} />
                        </div>
                        <Link href="/admin/marketplace" className="inline-block text-sm font-bold text-purple-700 underline">
                          Open Driver Management to review approvals
                        </Link>
                      </div>
                    )}
                  </article>
                )
              })}
            </section>
          )}

          <p className="text-xs text-gray-500">
            Driver contact information is confidential. Use it only for authorised Fountain Ride operations.
          </p>
        </div>
      </main>
    </AdminGuard>
  )
}
