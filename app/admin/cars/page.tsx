'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { formatNaira } from '../../../lib/format'
import AdminGuard from '../../components/AdminGuard'

function parseImageUrls(value: string) {
  return value
    .split('\n')
    .map((url) => url.trim())
    .filter(Boolean)
}

function getCarImages(car: any) {
  if (Array.isArray(car.image_urls) && car.image_urls.length > 0) {
    return car.image_urls.filter(Boolean)
  }

  if (car.image_url) return [car.image_url]

  return []
}

export default function AdminCarsPage() {
  const router = useRouter()

  const [cars, setCars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [priceUpdates, setPriceUpdates] = useState<Record<string, string>>({})
  const [imageUpdates, setImageUpdates] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    name: '',
    brand: '',
    model: '',
    year: '',
    category: '',
    transmission: '',
    fuel_type: '',
    seats: '',
    daily_rate: '',
    deposit_amount: '',
    image_urls: '',
    status: 'available',
    description: '',
  })

  useEffect(() => {
  fetchCars()
}, [])

  async function fetchCars() {
    setLoading(true)

    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error(error)

    setCars(data || [])
    setLoading(false)
  }

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function addCar() {
    setSaving(true)

    if (!form.name || !form.daily_rate) {
      alert('Car name and daily rate are required.')
      setSaving(false)
      return
    }

    const imageUrls = parseImageUrls(form.image_urls)

    const { error } = await supabase.from('cars').insert({
      name: form.name.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: form.year ? Number(form.year) : null,
      category: form.category,
      transmission: form.transmission,
      fuel_type: form.fuel_type.trim(),
      seats: form.seats ? Number(form.seats) : null,
      daily_rate: Number(form.daily_rate),
      deposit_amount: form.deposit_amount ? Number(form.deposit_amount) : 0,
      image_url: imageUrls[0] || '',
      image_urls: imageUrls,
      status: form.status,
      description: form.description.trim(),
    })

    if (error) {
      console.error(error)
      alert('Could not add car.')
      setSaving(false)
      return
    }

    setForm({
      name: '',
      brand: '',
      model: '',
      year: '',
      category: '',
      transmission: '',
      fuel_type: '',
      seats: '',
      daily_rate: '',
      deposit_amount: '',
      image_urls: '',
      status: 'available',
      description: '',
    })

    await fetchCars()
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('cars').update({ status }).eq('id', id)

    if (error) {
      console.error(error)
      alert('Could not update car status.')
      return
    }

    fetchCars()
  }

  async function updatePrice(id: string) {
    const newPrice = priceUpdates[id]

    if (!newPrice) {
      alert('Enter a new price.')
      return
    }

    const { error } = await supabase
      .from('cars')
      .update({ daily_rate: Number(newPrice) })
      .eq('id', id)

    if (error) {
      console.error(error)
      alert('Could not update price.')
      return
    }

    setPriceUpdates((prev) => ({ ...prev, [id]: '' }))
    fetchCars()
  }

  async function updateImages(id: string) {
    const newImagesText = imageUpdates[id]

    if (!newImagesText) {
      alert('Enter at least one image URL.')
      return
    }

    const imageUrls = parseImageUrls(newImagesText)

    if (imageUrls.length === 0) {
      alert('Enter at least one valid image URL.')
      return
    }

    const { error } = await supabase
      .from('cars')
      .update({
        image_url: imageUrls[0],
        image_urls: imageUrls,
      })
      .eq('id', id)

    if (error) {
      console.error(error)
      alert('Could not update images.')
      return
    }

    setImageUpdates((prev) => ({ ...prev, [id]: '' }))
    fetchCars()
  }

  function logout() {
  localStorage.removeItem('fountain_admin_logged_in')
  router.push('/admin/login')
}

  if (loading) {
  return (
    <AdminGuard>
      <div className="p-6">Loading cars...</div>
    </AdminGuard>
  )
}

  return (
  <AdminGuard>
    <main className="min-h-screen bg-[#f7f4fb] px-4 py-6 md:py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-purple-700">
              Fleet Management
            </p>
            <h1 className="text-4xl font-bold mt-2">Manage Cars</h1>
            <p className="text-gray-500 mt-2">
              Add cars, update prices, add multiple images, and control vehicle availability.
            </p>
          </div>

          <button
            onClick={logout}
            className="bg-gray-900 text-white px-5 py-3 rounded-2xl font-semibold"
          >
            Logout
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl shadow p-6 lg:col-span-1">
            <h2 className="text-2xl font-bold">Add New Car</h2>
            <p className="text-gray-500 text-sm mt-1">
              Add one image URL per line. The first image becomes the main display image.
            </p>

            <div className="grid gap-3 mt-5">
              <input className="border p-3 rounded-xl" placeholder="Car name e.g. Toyota Rav4 2007" value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
              <input className="border p-3 rounded-xl" placeholder="Brand" value={form.brand} onChange={(e) => updateForm('brand', e.target.value)} />
              <input className="border p-3 rounded-xl" placeholder="Model" value={form.model} onChange={(e) => updateForm('model', e.target.value)} />
              <input className="border p-3 rounded-xl" placeholder="Year" value={form.year} onChange={(e) => updateForm('year', e.target.value)} />

              <select className="border p-3 rounded-xl" value={form.category} onChange={(e) => updateForm('category', e.target.value)}>
                <option value="">Select category</option>
                <option value="Economy">Economy</option>
                <option value="SUV">SUV</option>
                <option value="Luxury">Luxury</option>
                <option value="Executive">Executive</option>
              </select>

              <select className="border p-3 rounded-xl" value={form.transmission} onChange={(e) => updateForm('transmission', e.target.value)}>
                <option value="">Transmission</option>
                <option value="Automatic">Automatic</option>
                <option value="Manual">Manual</option>
              </select>

              <input className="border p-3 rounded-xl" placeholder="Fuel type" value={form.fuel_type} onChange={(e) => updateForm('fuel_type', e.target.value)} />
              <input className="border p-3 rounded-xl" placeholder="Seats" value={form.seats} onChange={(e) => updateForm('seats', e.target.value)} />
              <input className="border p-3 rounded-xl" placeholder="Daily rate in naira e.g. 140000" value={form.daily_rate} onChange={(e) => updateForm('daily_rate', e.target.value)} />
              <input className="border p-3 rounded-xl" placeholder="Deposit amount optional" value={form.deposit_amount} onChange={(e) => updateForm('deposit_amount', e.target.value)} />

              <textarea
                className="border p-3 rounded-xl min-h-32"
                placeholder={`Image URLs, one per line:\nhttps://example.com/front.jpg\nhttps://example.com/interior.jpg\nhttps://example.com/back-seat.jpg`}
                value={form.image_urls}
                onChange={(e) => updateForm('image_urls', e.target.value)}
              />

              <select className="border p-3 rounded-xl" value={form.status} onChange={(e) => updateForm('status', e.target.value)}>
                <option value="available">Available</option>
                <option value="maintenance">Maintenance</option>
                <option value="hidden">Hidden</option>
              </select>

              <textarea className="border p-3 rounded-xl" placeholder="Description" value={form.description} onChange={(e) => updateForm('description', e.target.value)} />

              <button
                onClick={addCar}
                disabled={saving}
                className="bg-purple-700 hover:bg-purple-800 disabled:bg-gray-400 text-white py-3 rounded-2xl font-semibold"
              >
                {saving ? 'Saving...' : 'Add Car'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 grid md:grid-cols-2 gap-5">
            {cars.map((car) => {
              const images = getCarImages(car)
              const mainImage = images[0]

              return (
                <div key={car.id} className="bg-white rounded-3xl shadow overflow-hidden">
                  {mainImage ? (
                    <img
                      src={mainImage}
                      alt={car.name}
                      className="w-full h-48 object-cover bg-gray-100"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                      <p className="text-sm text-gray-400 font-semibold">
                        No image added
                      </p>
                    </div>
                  )}

                  {images.length > 1 && (
                    <div className="px-4 pt-3 grid grid-cols-5 gap-2">
                      {images.slice(0, 5).map((url: string, index: number) => (
                        <img
                          key={`${url}-${index}`}
                          src={url}
                          alt={`${car.name} ${index + 1}`}
                          className="h-14 w-full object-cover rounded-xl bg-gray-100"
                        />
                      ))}
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold">{car.name}</h2>
                        <p className="text-gray-500 text-sm">
                          {car.transmission} • {car.fuel_type} • {car.seats} seats
                        </p>
                        <p className="text-xs text-purple-700 font-semibold mt-1">
                          {images.length} image{images.length === 1 ? '' : 's'}
                        </p>
                      </div>

                      <span className="h-fit text-xs px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold">
                        {car.status}
                      </span>
                    </div>

                    <p className="text-2xl font-bold mt-4">
                      {formatNaira(car.daily_rate)} / day
                    </p>

                    <div className="mt-4">
                      <input
                        type="number"
                        placeholder="New daily price e.g. 140000"
                        value={priceUpdates[car.id] || ''}
                        onChange={(e) =>
                          setPriceUpdates((prev) => ({
                            ...prev,
                            [car.id]: e.target.value,
                          }))
                        }
                        className="border p-3 rounded-xl w-full"
                      />

                      <button
                        onClick={() => updatePrice(car.id)}
                        className="mt-2 w-full bg-purple-700 hover:bg-purple-800 text-white py-2 rounded-xl font-semibold"
                      >
                        Update Price
                      </button>
                    </div>

                    <div className="mt-4">
                      <textarea
                        placeholder={`Replace image URLs, one per line.\nFirst URL becomes main image.`}
                        value={imageUpdates[car.id] || ''}
                        onChange={(e) =>
                          setImageUpdates((prev) => ({
                            ...prev,
                            [car.id]: e.target.value,
                          }))
                        }
                        className="border p-3 rounded-xl w-full min-h-28"
                      />

                      <button
                        onClick={() => updateImages(car.id)}
                        className="mt-2 w-full bg-gray-900 hover:bg-black text-white py-2 rounded-xl font-semibold"
                      >
                        Update Images
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-5">
                      <button
                        onClick={() => updateStatus(car.id, 'available')}
                        className="bg-green-600 text-white py-2 rounded-xl text-sm font-semibold"
                      >
                        Available
                      </button>

                      <button
                        onClick={() => updateStatus(car.id, 'maintenance')}
                        className="bg-orange-500 text-white py-2 rounded-xl text-sm font-semibold"
                      >
                        Maintain
                      </button>

                      <button
                        onClick={() => updateStatus(car.id, 'hidden')}
                        className="bg-gray-900 text-white py-2 rounded-xl text-sm font-semibold"
                      >
                        Hide
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {cars.length === 0 && (
              <div className="bg-white rounded-3xl shadow p-8 text-center md:col-span-2">
                <p className="font-semibold">No cars added yet</p>
                <p className="text-gray-500 text-sm">
                  Add your first car using the form.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
            </main>
  </AdminGuard>
  )
}