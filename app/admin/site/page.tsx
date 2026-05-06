'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AdminSitePage() {
  const router = useRouter()

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
    const auth = localStorage.getItem('admin_auth')

    if (auth !== 'true') {
      router.push('/admin/login')
      return
    }

    fetchContent()
  }, [router])

  async function fetchContent() {
    setLoading(true)

    const { data } = await supabase
      .from('site_content')
      .select('*')
      .eq('id', 1)
      .single()

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

    if (error) {
      console.error(error)
      alert('Could not save changes')
      setSaving(false)
      return
    }

    alert('Homepage updated successfully ✅')
    setSaving(false)
  }

  function logout() {
    localStorage.removeItem('admin_auth')
    router.push('/admin/login')
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Homepage Editor</h1>
            <p className="text-gray-500">
              Update hero text, image, and WhatsApp details.
            </p>
          </div>

          <button
            onClick={logout}
            className="bg-gray-900 text-white px-5 py-3 rounded-2xl"
          >
            Logout
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow p-6 space-y-4">

          <input
            className="border p-3 rounded-xl w-full"
            placeholder="Headline"
            value={form.headline}
            onChange={(e) => update('headline', e.target.value)}
          />

          <textarea
            className="border p-3 rounded-xl w-full"
            placeholder="Subheadline"
            value={form.subheadline}
            onChange={(e) => update('subheadline', e.target.value)}
          />

          <input
            className="border p-3 rounded-xl w-full"
            placeholder="Hero Image URL"
            value={form.hero_image}
            onChange={(e) => update('hero_image', e.target.value)}
          />

          <input
            className="border p-3 rounded-xl w-full"
            placeholder="WhatsApp Number e.g. 2348168839382"
            value={form.whatsapp_number}
            onChange={(e) => update('whatsapp_number', e.target.value)}
          />

          <input
            className="border p-3 rounded-xl w-full"
            placeholder="Office Address"
            value={form.office_address}
            onChange={(e) => update('office_address', e.target.value)}
          />

          <button
            onClick={saveContent}
            disabled={saving}
            className="w-full bg-purple-700 text-white py-3 rounded-2xl font-semibold"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

        </div>
      </div>
    </div>
  )
}