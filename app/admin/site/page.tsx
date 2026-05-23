'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import AdminGuard from '../../components/AdminGuard'

export default function AdminSitePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    headline: '',
    subheadline: '',
    hero_image: '',
    whatsapp_number: '',
    office_address: '',
  })

  useEffect(() => {
    fetchContent()
  }, [])

  async function fetchContent() {
    setLoading(true)

    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('id', 1)
      .single()

    if (error && error.code !== 'PGRST116') {
      alert(error.message)
    }

    if (data) {
      setForm({
        headline: data.headline || '',
        subheadline: data.subheadline || '',
        hero_image: data.hero_image || '',
        whatsapp_number: data.whatsapp_number || '',
        office_address: data.office_address || '',
      })
    }

    setLoading(false)
  }

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function saveContent() {
    setSaving(true)

    const { error } = await supabase.from('site_content').upsert({
      id: 1,
      headline: form.headline,
      subheadline: form.subheadline,
      hero_image: form.hero_image,
      whatsapp_number: form.whatsapp_number,
      office_address: form.office_address,
    })

    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    alert('Homepage updated successfully ✅')
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-[#f7f4fb] px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <p className="text-sm font-bold text-purple-700">
              Fountain Ride Admin
            </p>

            <h1 className="text-3xl md:text-5xl font-black mt-2">
              Homepage Editor
            </h1>

            <p className="text-gray-600 mt-3">
              Update homepage headline, hero image, WhatsApp number and office details.
            </p>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl border shadow-sm p-8">
              Loading homepage content...
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] shadow-sm border p-6 md:p-8 space-y-4">
              <input
                className="border p-4 rounded-2xl w-full"
                placeholder="Headline"
                value={form.headline}
                onChange={(e) => update('headline', e.target.value)}
              />

              <textarea
                className="border p-4 rounded-2xl w-full min-h-[120px]"
                placeholder="Subheadline"
                value={form.subheadline}
                onChange={(e) => update('subheadline', e.target.value)}
              />

              <input
                className="border p-4 rounded-2xl w-full"
                placeholder="Hero Image URL"
                value={form.hero_image}
                onChange={(e) => update('hero_image', e.target.value)}
              />

              <input
                className="border p-4 rounded-2xl w-full"
                placeholder="WhatsApp Number e.g. 2348168839382"
                value={form.whatsapp_number}
                onChange={(e) => update('whatsapp_number', e.target.value)}
              />

              <input
                className="border p-4 rounded-2xl w-full"
                placeholder="Office Address"
                value={form.office_address}
                onChange={(e) => update('office_address', e.target.value)}
              />

              <button
                onClick={saveContent}
                disabled={saving}
                className="w-full bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white py-4 rounded-2xl font-bold"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  )
}