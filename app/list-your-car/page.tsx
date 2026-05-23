'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'

export default function ListYourCarPage() {
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    owner_name: '',
    phone: '',
    whatsapp: '',
    location: '',
    car_brand: '',
    car_model: '',
    car_year: '',
    car_category: '',
    plate_number: '',
    car_condition: '',
    availability: '',
    expected_daily_rate: '',
    notes: '',
  })

  function updateField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function submitApplication(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase.from('car_owner_applications').insert({
      ...form,
      car_year: form.car_year ? Number(form.car_year) : null,
      expected_daily_rate: form.expected_daily_rate
        ? Number(form.expected_daily_rate)
        : null,
    })

    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#f7f4fb] px-4 py-10">
        <div className="max-w-2xl mx-auto bg-white rounded-[2rem] p-8 shadow-sm border text-center">
          <h1 className="text-3xl font-black">Application received</h1>
          <p className="text-gray-600 mt-3">
            Thank you. Our team will review your car details and contact you shortly.
          </p>

          <Link href="/">
            <button className="mt-6 bg-purple-700 text-white px-8 py-4 rounded-2xl font-bold">
              Back to Home
            </button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f4fb] px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-[2rem] p-6 md:p-10 shadow-sm border">
          <p className="text-sm font-bold text-purple-700">
            Earn from your car
          </p>

          <h1 className="text-3xl md:text-5xl font-black mt-2">
            List your car with Fountain Ride
          </h1>

          <p className="text-gray-600 mt-4">
            Turn your car into an income-generating asset during its free time.
            Submit your details and our team will contact you.
          </p>

          <form onSubmit={submitApplication} className="grid md:grid-cols-2 gap-4 mt-8">
            <input className="border rounded-2xl p-4" placeholder="Owner name" required value={form.owner_name} onChange={(e) => updateField('owner_name', e.target.value)} />
            <input className="border rounded-2xl p-4" placeholder="Phone number" required value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
            <input className="border rounded-2xl p-4" placeholder="WhatsApp number" value={form.whatsapp} onChange={(e) => updateField('whatsapp', e.target.value)} />
            <input className="border rounded-2xl p-4" placeholder="Location" value={form.location} onChange={(e) => updateField('location', e.target.value)} />

            <input className="border rounded-2xl p-4" placeholder="Car brand e.g Toyota" required value={form.car_brand} onChange={(e) => updateField('car_brand', e.target.value)} />
            <input className="border rounded-2xl p-4" placeholder="Car model e.g Camry" required value={form.car_model} onChange={(e) => updateField('car_model', e.target.value)} />
            <input className="border rounded-2xl p-4" placeholder="Year e.g 2014" type="number" value={form.car_year} onChange={(e) => updateField('car_year', e.target.value)} />
            <input className="border rounded-2xl p-4" placeholder="Category e.g Sedan, SUV, Bus" value={form.car_category} onChange={(e) => updateField('car_category', e.target.value)} />

            <input className="border rounded-2xl p-4" placeholder="Plate number optional" value={form.plate_number} onChange={(e) => updateField('plate_number', e.target.value)} />
            <input className="border rounded-2xl p-4" placeholder="Expected daily rate" type="number" value={form.expected_daily_rate} onChange={(e) => updateField('expected_daily_rate', e.target.value)} />

            <select className="border rounded-2xl p-4" value={form.car_condition} onChange={(e) => updateField('car_condition', e.target.value)}>
              <option value="">Car condition</option>
              <option value="excellent">Excellent</option>
              <option value="very_good">Very good</option>
              <option value="good">Good</option>
              <option value="needs_review">Needs review</option>
            </select>

            <select className="border rounded-2xl p-4" value={form.availability} onChange={(e) => updateField('availability', e.target.value)}>
              <option value="">Availability</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekends">Weekends</option>
              <option value="selected_days">Selected days</option>
              <option value="full_time">Full time</option>
            </select>

            <textarea
              className="md:col-span-2 border rounded-2xl p-4 min-h-[120px]"
              placeholder="Any extra details about the car?"
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
            />

            <button
              disabled={saving}
              className="md:col-span-2 bg-purple-700 hover:bg-purple-800 text-white py-4 rounded-2xl font-bold"
            >
              {saving ? 'Submitting...' : 'Submit Car Details'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}