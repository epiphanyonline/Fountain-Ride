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

    lagos_daily_rate: '',
    airport_pickup_rate: '',
    lagos_to_abeokuta_rate: '',
    lagos_to_ado_ekiti_rate: '',
    lagos_to_akure_rate: '',
    lagos_to_ibadan_rate: '',
    lagos_to_ile_ife_rate: '',
    lagos_to_ondo_rate: '',
    lagos_to_osogbo_rate: '',
    overnight_allowance: '',

    bank_name: '',
    account_name: '',
    account_number: '',
    notes: '',
    agreement_accepted: false,
  })

  function updateField(name: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function toNumber(value: string) {
    return value ? Number(value) : null
  }

  async function submitApplication(e: React.FormEvent) {
    e.preventDefault()

    if (!form.agreement_accepted) {
      alert('Please accept the listing agreement before submitting.')
      return
    }

    setSaving(true)

    const { error } = await supabase.from('car_owner_applications').insert({
      owner_name: form.owner_name,
      phone: form.phone,
      whatsapp: form.whatsapp,
      location: form.location,
      car_brand: form.car_brand,
      car_model: form.car_model,
      car_year: toNumber(form.car_year),
      car_category: form.car_category,
      plate_number: form.plate_number,
      car_condition: form.car_condition,
      availability: form.availability,

      lagos_daily_rate: toNumber(form.lagos_daily_rate),
      airport_pickup_rate: toNumber(form.airport_pickup_rate),
      lagos_to_abeokuta_rate: toNumber(form.lagos_to_abeokuta_rate),
      lagos_to_ado_ekiti_rate: toNumber(form.lagos_to_ado_ekiti_rate),
      lagos_to_akure_rate: toNumber(form.lagos_to_akure_rate),
      lagos_to_ibadan_rate: toNumber(form.lagos_to_ibadan_rate),
      lagos_to_ile_ife_rate: toNumber(form.lagos_to_ile_ife_rate),
      lagos_to_ondo_rate: toNumber(form.lagos_to_ondo_rate),
      lagos_to_osogbo_rate: toNumber(form.lagos_to_osogbo_rate),
      overnight_allowance: toNumber(form.overnight_allowance),

      bank_name: form.bank_name,
      account_name: form.account_name,
      account_number: form.account_number,
      notes: form.notes,
      agreement_accepted: form.agreement_accepted,
      status: 'new',
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
            Thank you. Our team will review your vehicle details, route pricing,
            availability and agreement confirmation. We will contact you shortly.
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

  const inputClass = 'border rounded-2xl p-4 w-full'
  const sectionTitle = 'md:col-span-2 mt-4 text-xl font-black text-gray-950'
  const helperText = 'md:col-span-2 text-sm text-gray-500 -mt-2'

  return (
    <main className="min-h-screen bg-[#f7f4fb] px-4 py-8 md:py-12">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-[2rem] p-6 md:p-10 shadow-sm border">
          <p className="text-sm font-bold text-purple-700">
            Controlled partner listing
          </p>

          <h1 className="text-3xl md:text-5xl font-black mt-2">
            Submit your car details
          </h1>

          <p className="text-gray-600 mt-4">
            This page is for verified or invited car owners who want to list
            their vehicle with Fountain Ride. Submitting this form does not
            automatically list your vehicle. Our team will review and approve
            suitable cars before they appear publicly.
          </p>

          <form onSubmit={submitApplication} className="grid md:grid-cols-2 gap-4 mt-8">
            <h2 className={sectionTitle}>Owner details</h2>

            <input className={inputClass} placeholder="Owner name" required value={form.owner_name} onChange={(e) => updateField('owner_name', e.target.value)} />
            <input className={inputClass} placeholder="Phone number" required value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
            <input className={inputClass} placeholder="WhatsApp number" value={form.whatsapp} onChange={(e) => updateField('whatsapp', e.target.value)} />
            <input className={inputClass} placeholder="Owner / car location" value={form.location} onChange={(e) => updateField('location', e.target.value)} />

            <h2 className={sectionTitle}>Vehicle details</h2>

            <input className={inputClass} placeholder="Car brand e.g Toyota" required value={form.car_brand} onChange={(e) => updateField('car_brand', e.target.value)} />
            <input className={inputClass} placeholder="Car model e.g Camry" required value={form.car_model} onChange={(e) => updateField('car_model', e.target.value)} />
            <input className={inputClass} placeholder="Year e.g 2014" type="number" value={form.car_year} onChange={(e) => updateField('car_year', e.target.value)} />
            <input className={inputClass} placeholder="Category e.g Sedan, SUV, Bus" value={form.car_category} onChange={(e) => updateField('car_category', e.target.value)} />
            <input className={inputClass} placeholder="Plate number" required value={form.plate_number} onChange={(e) => updateField('plate_number', e.target.value)} />

            <select className={inputClass} value={form.car_condition} onChange={(e) => updateField('car_condition', e.target.value)}>
              <option value="">Car condition</option>
              <option value="excellent">Excellent</option>
              <option value="very_good">Very good</option>
              <option value="good">Good</option>
              <option value="needs_review">Needs review</option>
            </select>

            <select className={inputClass} value={form.availability} onChange={(e) => updateField('availability', e.target.value)}>
              <option value="">Availability</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekends">Weekends</option>
              <option value="selected_days">Selected days</option>
              <option value="full_time">Full time</option>
            </select>

            <h2 className={sectionTitle}>Route pricing</h2>

            <p className={helperText}>
              Please enter the amount you want to receive for each route.
              Fountain Ride may add a 30% service margin before listing the
              public customer price. Extra hours attract a standard ₦10,000 per
              hour late fee.
            </p>

            <input className={inputClass} placeholder="Lagos daily hire rate" type="number" value={form.lagos_daily_rate} onChange={(e) => updateField('lagos_daily_rate', e.target.value)} />
            <input className={inputClass} placeholder="Airport pickup rate" type="number" value={form.airport_pickup_rate} onChange={(e) => updateField('airport_pickup_rate', e.target.value)} />
            <input className={inputClass} placeholder="Lagos to Abeokuta rate" type="number" value={form.lagos_to_abeokuta_rate} onChange={(e) => updateField('lagos_to_abeokuta_rate', e.target.value)} />
            <input className={inputClass} placeholder="Lagos to Ado-Ekiti rate" type="number" value={form.lagos_to_ado_ekiti_rate} onChange={(e) => updateField('lagos_to_ado_ekiti_rate', e.target.value)} />
            <input className={inputClass} placeholder="Lagos to Akure rate" type="number" value={form.lagos_to_akure_rate} onChange={(e) => updateField('lagos_to_akure_rate', e.target.value)} />
            <input className={inputClass} placeholder="Lagos to Ibadan rate" type="number" value={form.lagos_to_ibadan_rate} onChange={(e) => updateField('lagos_to_ibadan_rate', e.target.value)} />
            <input className={inputClass} placeholder="Lagos to Ile-Ife rate" type="number" value={form.lagos_to_ile_ife_rate} onChange={(e) => updateField('lagos_to_ile_ife_rate', e.target.value)} />
            <input className={inputClass} placeholder="Lagos to Ondo rate" type="number" value={form.lagos_to_ondo_rate} onChange={(e) => updateField('lagos_to_ondo_rate', e.target.value)} />
            <input className={inputClass} placeholder="Lagos to Osogbo rate" type="number" value={form.lagos_to_osogbo_rate} onChange={(e) => updateField('lagos_to_osogbo_rate', e.target.value)} />
            <input className={inputClass} placeholder="Overnight allowance" type="number" value={form.overnight_allowance} onChange={(e) => updateField('overnight_allowance', e.target.value)} />

            <h2 className={sectionTitle}>Bank details for payout</h2>

            <input className={inputClass} placeholder="Bank name" value={form.bank_name} onChange={(e) => updateField('bank_name', e.target.value)} />
            <input className={inputClass} placeholder="Account name" value={form.account_name} onChange={(e) => updateField('account_name', e.target.value)} />
            <input className={inputClass} placeholder="Account number" value={form.account_number} onChange={(e) => updateField('account_number', e.target.value)} />

            <h2 className={sectionTitle}>Additional notes</h2>

            <textarea
              className="md:col-span-2 border rounded-2xl p-4 min-h-[120px]"
              placeholder="Tell us anything important about the vehicle, availability, driver arrangement, routes covered, or special conditions."
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
            />

            <div className="md:col-span-2 bg-[#f7f4fb] rounded-3xl p-5 border">
              <label className="flex gap-3 items-start">
                <input type="checkbox" checked={form.agreement_accepted} onChange={(e) => updateField('agreement_accepted', e.target.checked)} className="mt-1" />

                <span className="text-sm text-gray-700 leading-relaxed">
                  I confirm that the vehicle information provided is accurate. I
                  understand that Fountain Ride will review this application
                  before any listing goes live. I agree that Fountain Ride may
                  add its service margin to my preferred owner rate, determine
                  the final public listing price, and manage customer bookings
                  through its platform. I also agree not to bypass Fountain Ride
                  for direct transactions with customers introduced through the
                  platform.
                </span>
              </label>
            </div>

            <button disabled={saving} className="md:col-span-2 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white py-4 rounded-2xl font-bold">
              {saving ? 'Submitting...' : 'Submit Car Details'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}