'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatNaira } from '../../../lib/format'
import AdminGuard from '../../components/AdminGuard'

export default function AdminRoutesPage() {
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
    fetchRoutes()
  }, [])

  async function fetchRoutes() {
    setLoading(true)

    const { data, error } = await supabase
      .from('route_prices')
      .select('*')
      .order('destination', { ascending: true })

    if (error) {
      alert(error.message)
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
    if (!form.origin || !form.destination || !form.package_type) {
      alert('Please complete required fields.')
      return
    }

    setSaving(true)

    const { error } = await supabase.from('route_prices').insert({
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      package_type: form.package_type,
      price: form.price ? Number(form.price) : 0,
      price_on_request: form.price_on_request,
      notes: form.notes.trim(),
      is_active: form.is_active,
    })

    setSaving(false)

    if (error) {
      alert(error.message)
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

    fetchRoutes()
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
      alert(error.message)
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
      alert(error.message)
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
      alert(error.message)
      return
    }

    fetchRoutes()
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-[#f7f4fb] px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <p className="text-sm font-bold text-purple-700">
              Fountain Ride Admin
            </p>

            <h1 className="text-3xl md:text-5xl font-black mt-2">
              Manage Route Pricing
            </h1>

            <p className="text-gray-600 mt-3">
              Add destination routes, package types, fixed prices or WhatsApp pricing.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <section className="bg-white rounded-[2rem] border shadow-sm p-6 h-fit">
              <h2 className="text-2xl font-black">Add Route</h2>

              <div className="grid gap-4 mt-5">
                <input
                  className="border p-4 rounded-2xl"
                  placeholder="Origin"
                  value={form.origin}
                  onChange={(e) => updateForm('origin', e.target.value)}
                />

                <input
                  className="border p-4 rounded-2xl"
                  placeholder="Destination"
                  value={form.destination}
                  onChange={(e) => updateForm('destination', e.target.value)}
                />

                <select
                  className="border p-4 rounded-2xl"
                  value={form.package_type}
                  onChange={(e) => updateForm('package_type', e.target.value)}
                >
                  <option value="drop_off_only">Drop off only</option>
                  <option value="city_to_city_12hrs">City-to-city 12 hours</option>
                  <option value="city_to_city_24hrs">City-to-city 24 hours</option>
                </select>

                <input
                  type="number"
                  className="border p-4 rounded-2xl"
                  placeholder="Price"
                  value={form.price}
                  onChange={(e) => updateForm('price', e.target.value)}
                />

                <label className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
                  <input
                    type="checkbox"
                    checked={form.price_on_request}
                    onChange={(e) => updateForm('price_on_request', e.target.checked)}
                  />
                  <span className="text-sm font-semibold">
                    Price on request / WhatsApp confirmation
                  </span>
                </label>

                <label className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => updateForm('is_active', e.target.checked)}
                  />
                  <span className="text-sm font-semibold">Active route</span>
                </label>

                <textarea
                  className="border p-4 rounded-2xl min-h-[100px]"
                  placeholder="Notes"
                  value={form.notes}
                  onChange={(e) => updateForm('notes', e.target.value)}
                />

                <button
                  disabled={saving}
                  onClick={addRoute}
                  className="bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white py-4 rounded-2xl font-bold"
                >
                  {saving ? 'Adding...' : 'Add Route'}
                </button>
              </div>
            </section>

            <section className="lg:col-span-2 bg-white rounded-[2rem] border shadow-sm overflow-hidden">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black">Routes</h2>
                  <p className="text-sm text-gray-500">
                    Update prices and route availability.
                  </p>
                </div>

                <button
                  onClick={fetchRoutes}
                  className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl font-bold"
                >
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="p-6 text-gray-500">Loading routes...</div>
              ) : routes.length === 0 ? (
                <div className="p-8 text-center">
                  <h3 className="text-xl font-black">No routes yet</h3>
                  <p className="text-gray-500 mt-2">
                    Add your first route from the form.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-left">
                      <tr>
                        <th className="p-4">Route</th>
                        <th className="p-4">Package</th>
                        <th className="p-4">Price</th>
                        <th className="p-4">Pricing</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {routes.map((route) => (
                        <tr key={route.id} className="border-t align-top">
                          <td className="p-4 font-bold">
                            {route.origin} → {route.destination}
                            {route.notes && (
                              <p className="text-xs text-gray-500 font-normal mt-1">
                                {route.notes}
                              </p>
                            )}
                          </td>

                          <td className="p-4">
                            {packageLabel(route.package_type)}
                          </td>

                          <td className="p-4">
                            <input
                              type="number"
                              defaultValue={route.price || ''}
                              onBlur={(e) => updatePrice(route.id, e.target.value)}
                              className="border rounded-xl p-2 w-32"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {route.price_on_request
                                ? 'Price on request'
                                : formatNaira(route.price || 0)}
                            </p>
                          </td>

                          <td className="p-4">
                            <button
                              onClick={() =>
                                togglePriceRequest(
                                  route.id,
                                  Boolean(route.price_on_request)
                                )
                              }
                              className={`px-3 py-2 rounded-xl font-bold text-xs ${
                                route.price_on_request
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {route.price_on_request
                                ? 'Price on request'
                                : 'Fixed price'}
                            </button>
                          </td>

                          <td className="p-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                route.is_active
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-200 text-gray-600'
                              }`}
                            >
                              {route.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          <td className="p-4">
                            <button
                              onClick={() =>
                                toggleStatus(route.id, Boolean(route.is_active))
                              }
                              className="bg-gray-950 text-white px-4 py-2 rounded-xl font-bold text-xs"
                            >
                              {route.is_active ? 'Disable' : 'Enable'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </AdminGuard>
  )
}