'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { formatNaira } from '../../../lib/format'

export default function AdminRoutesPage() {
  const router = useRouter()

  const [routes, setRoutes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    origin: 'Lagos',
    destination: '',
    package_type: 'drop_off_only',
    price: '',
    price_on_request: false,
    notes: '',
    is_active: true,
  })

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth')

    if (auth !== 'true') {
      router.push('/admin/login')
      return
    }

    fetchRoutes()
  }, [router])

  async function fetchRoutes() {
    setLoading(true)

    const { data, error } = await supabase
      .from('route_prices')
      .select('*')
      .order('destination', { ascending: true })

    if (error) {
      console.error(error)
      setRoutes([])
    } else {
      setRoutes(data || [])
    }

    setLoading(false)
  }

  function updateForm(field: string, value: any) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  function packageLabel(type: string) {
    switch (type) {
      case 'drop_off_only':
        return 'Drop off only'

      case 'city_to_city_12hrs':
        return 'City-to-city 12 hours'

      case 'city_to_city_24hrs':
        return 'City-to-city 24 hours'

      default:
        return type
    }
  }

  async function addRoute() {
    setSaving(true)

    if (!form.origin || !form.destination || !form.package_type) {
      alert('Please complete required fields.')
      setSaving(false)
      return
    }

    const { error } = await supabase.from('route_prices').insert({
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      package_type: form.package_type,
      price: form.price ? Number(form.price) : 0,
      price_on_request: form.price_on_request,
      notes: form.notes.trim(),
      is_active: form.is_active,
    })

    if (error) {
      console.error(error)
      alert('Could not add route.')
      setSaving(false)
      return
    }

    setForm({
      origin: 'Lagos',
      destination: '',
      package_type: 'drop_off_only',
      price: '',
      price_on_request: false,
      notes: '',
      is_active: true,
    })

    await fetchRoutes()
    setSaving(false)
  }

  async function updatePrice(id: string, value: string) {
    const { error } = await supabase
      .from('route_prices')
      .update({
        price: Number(value || 0),
        price_on_request: false,
      })
      .eq('id', id)

    if (error) {
      console.error(error)
      alert('Could not update price.')
      return
    }

    fetchRoutes()
  }

  async function togglePriceRequest(id: string, current: boolean) {
    const { error } = await supabase
      .from('route_prices')
      .update({
        price_on_request: !current,
      })
      .eq('id', id)

    if (error) {
      console.error(error)
      alert('Could not update.')
      return
    }

    fetchRoutes()
  }

  async function toggleStatus(id: string, current: boolean) {
    const { error } = await supabase
      .from('route_prices')
      .update({
        is_active: !current,
      })
      .eq('id', id)

    if (error) {
      console.error(error)
      alert('Could not update route.')
      return
    }

    fetchRoutes()
  }

  if (loading) {
    return <div className="p-6">Loading routes...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8">
          <p className="text-sm font-semibold text-purple-700">
            Route Management
          </p>

          <h1 className="text-4xl font-bold mt-2">
            Manage Route Pricing
          </h1>

          <p className="text-gray-500 mt-2">
            Add destination routes, package types, fixed prices or WhatsApp pricing.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Add Route */}
          <div className="bg-white rounded-3xl shadow p-6 h-fit">
            <h2 className="text-2xl font-bold">
              Add Route
            </h2>

            <div className="grid gap-4 mt-5">

              <input
                className="border p-3 rounded-xl"
                placeholder="Origin"
                value={form.origin}
                onChange={(e) =>
                  updateForm('origin', e.target.value)
                }
              />

              <input
                className="border p-3 rounded-xl"
                placeholder="Destination"
                value={form.destination}
                onChange={(e) =>
                  updateForm('destination', e.target.value)
                }
              />

              <select
                className="border p-3 rounded-xl"
                value={form.package_type}
                onChange={(e) =>
                  updateForm('package_type', e.target.value)
                }
              >
                <option value="drop_off_only">
                  Drop off only
                </option>

                <option value="city_to_city_12hrs">
                  City-to-city 12 hours
                </option>

                <option value="city_to_city_24hrs">
                  City-to-city 24 hours
                </option>
              </select>

              <input
                type="number"
                className="border p-3 rounded-xl"
                placeholder="Fixed price optional"
                value={form.price}
                onChange={(e) =>
                  updateForm('price', e.target.value)
                }
              />

              <label className="flex items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.price_on_request}
                  onChange={(e) =>
                    updateForm('price_on_request', e.target.checked)
                  }
                />

                Price available via WhatsApp only
              </label>

              <textarea
                className="border p-3 rounded-xl"
                placeholder="Notes optional"
                value={form.notes}
                onChange={(e) =>
                  updateForm('notes', e.target.value)
                }
              />

              <button
                onClick={addRoute}
                disabled={saving}
                className="bg-purple-700 hover:bg-purple-800 text-white py-3 rounded-2xl font-semibold"
              >
                {saving ? 'Saving...' : 'Add Route'}
              </button>

            </div>
          </div>

          {/* Routes List */}
          <div className="lg:col-span-2 grid gap-5">

            {routes.map((route) => (
              <div
                key={route.id}
                className="bg-white rounded-3xl shadow p-5"
              >

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                  <div>
                    <h2 className="text-2xl font-bold">
                      {route.origin} → {route.destination}
                    </h2>

                    <p className="text-sm text-purple-700 font-semibold mt-1">
                      {packageLabel(route.package_type)}
                    </p>

                    <div className="mt-3">

                      {route.price_on_request ? (
                        <div className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-4 py-2 text-sm font-bold">
                          Price on request via WhatsApp
                        </div>
                      ) : (
                        <p className="text-3xl font-black">
                          {formatNaira(route.price)}
                        </p>
                      )}

                    </div>

                    {route.notes && (
                      <p className="text-gray-500 text-sm mt-3">
                        {route.notes}
                      </p>
                    )}
                  </div>

                  <div className="w-full md:w-72">

                    <input
                      type="number"
                      placeholder="Update fixed price"
                      className="border p-3 rounded-xl w-full"
                      defaultValue={route.price}
                      onBlur={(e) =>
                        updatePrice(route.id, e.target.value)
                      }
                    />

                    <button
                      onClick={() =>
                        togglePriceRequest(
                          route.id,
                          route.price_on_request
                        )
                      }
                      className={`mt-3 w-full py-3 rounded-2xl font-semibold ${
                        route.price_on_request
                          ? 'bg-green-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {route.price_on_request
                        ? 'Disable WhatsApp Pricing'
                        : 'Enable WhatsApp Pricing'}
                    </button>

                    <button
                      onClick={() =>
                        toggleStatus(
                          route.id,
                          route.is_active
                        )
                      }
                      className={`mt-3 w-full py-3 rounded-2xl font-semibold ${
                        route.is_active
                          ? 'bg-gray-900 text-white'
                          : 'bg-purple-700 text-white'
                      }`}
                    >
                      {route.is_active
                        ? 'Hide Route'
                        : 'Activate Route'}
                    </button>

                  </div>

                </div>

              </div>
            ))}

            {routes.length === 0 && (
              <div className="bg-white rounded-3xl shadow p-10 text-center">
                <p className="font-semibold">
                  No routes added yet
                </p>

                <p className="text-sm text-gray-500 mt-2">
                  Add your first route pricing package.
                </p>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  )
}