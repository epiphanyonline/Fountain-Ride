'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function CarOwnerApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchApplications()
  }, [])

  async function fetchApplications() {
    setLoading(true)

    const { data, error } = await supabase
      .from('car_owner_applications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      alert(error.message)
      setApplications([])
    } else {
      setApplications(data || [])
    }

    setLoading(false)
  }

  async function approveApplication(app: any) {
    const publicDailyRate = app.lagos_daily_rate
      ? Math.round(Number(app.lagos_daily_rate) * 1.3)
      : 0

    const { error: carError } = await supabase.from('cars').insert({
      name: `${app.car_brand} ${app.car_model} ${app.car_year || ''}`.trim(),
      brand: app.car_brand,
      model: app.car_model,
      year: app.car_year,
      category: app.car_category || 'Sedan',
      transmission: 'Automatic',
      fuel_type: 'Petrol',
      seats: 5,
      daily_rate: publicDailyRate,
      deposit_amount: 0,
      image_url: '',
      status: 'hidden',
      description:
        'Partner vehicle under review. Final listing details will be updated by Fountain Ride.',
    })

    if (carError) {
      alert(carError.message)
      return
    }

    const { error } = await supabase
      .from('car_owner_applications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
      })
      .eq('id', app.id)

    if (error) {
      alert(error.message)
      return
    }

    fetchApplications()
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from('car_owner_applications')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
        alert(error.message)
        return
        }

        alert('Approved successfully. Hidden listing created.')

        fetchApplications()
  }

  function addMargin(value: number | null) {
    if (!value) return '—'
    return `₦${Math.round(Number(value) * 1.3).toLocaleString()}`
  }

  function formatNaira(value: number | null) {
    if (!value) return '—'
    return `₦${Number(value).toLocaleString()}`
  }

  return (
    <main className="min-h-screen bg-[#f7f4fb] px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <p className="text-sm font-bold text-purple-700">
            Fountain Ride Admin
          </p>

          <h1 className="text-3xl md:text-5xl font-black mt-2">
            Car Owner Applications
          </h1>

          <p className="text-gray-600 mt-3">
            Review submitted vehicles, check owner pricing, and approve suitable
            cars into your hidden fleet list.
          </p>
        </div>

        {loading && (
          <div className="bg-white rounded-3xl p-8 border shadow-sm">
            Loading applications...
          </div>
        )}

        {!loading && applications.length === 0 && (
          <div className="bg-white rounded-3xl p-8 border shadow-sm text-center">
            <h2 className="text-2xl font-black">No applications yet</h2>
            <p className="text-gray-500 mt-2">
              Submitted owner applications will appear here.
            </p>
          </div>
        )}

        <div className="grid gap-6">
          {applications.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-[2rem] border shadow-sm p-6"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <span className="inline-flex px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase">
                    {app.status || 'new'}
                  </span>

                  <h2 className="text-2xl font-black mt-3">
                    {app.car_brand} {app.car_model} {app.car_year || ''}
                  </h2>

                  <p className="text-gray-500 mt-1">
                    {app.car_category || 'Vehicle'} •{' '}
                    {app.car_condition || 'Condition not stated'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateStatus(app.id, 'under_review')}
                    className="bg-yellow-500 text-white px-4 py-2 rounded-xl font-bold"
                  >
                    Review
                  </button>

                  <button
                    onClick={() => approveApplication(app)}
                    disabled={app.status === 'approved'}
                    className="bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded-xl font-bold"
                  >
                    Approve & Create Hidden Listing
                  </button>

                  <button
                    onClick={() => updateStatus(app.id, 'rejected')}
                    className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold"
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <Info title="Owner" value={app.owner_name || '—'} />
                <Info title="Phone" value={app.phone || '—'} />
                <Info title="WhatsApp" value={app.whatsapp || '—'} />
                <Info title="Location" value={app.location || '—'} />
                <Info title="Plate Number" value={app.plate_number || '—'} />
                <Info title="Availability" value={app.availability || '—'} />
              </div>

              <div className="mt-6">
                <h3 className="font-black text-lg mb-3">
                  Route pricing and 30% public price preview
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border rounded-2xl overflow-hidden">
                    <thead className="bg-gray-100 text-left">
                      <tr>
                        <th className="p-3">Route</th>
                        <th className="p-3">Owner Price</th>
                        <th className="p-3">Public Price +30%</th>
                      </tr>
                    </thead>

                    <tbody>
                      <PriceRow route="Lagos Daily Hire" value={app.lagos_daily_rate} addMargin={addMargin} formatNaira={formatNaira} />
                      <PriceRow route="Airport Pickup" value={app.airport_pickup_rate} addMargin={addMargin} formatNaira={formatNaira} />
                      <PriceRow route="Lagos → Abeokuta" value={app.lagos_to_abeokuta_rate} addMargin={addMargin} formatNaira={formatNaira} />
                      <PriceRow route="Lagos → Ado-Ekiti" value={app.lagos_to_ado_ekiti_rate} addMargin={addMargin} formatNaira={formatNaira} />
                      <PriceRow route="Lagos → Akure" value={app.lagos_to_akure_rate} addMargin={addMargin} formatNaira={formatNaira} />
                      <PriceRow route="Lagos → Ibadan" value={app.lagos_to_ibadan_rate} addMargin={addMargin} formatNaira={formatNaira} />
                      <PriceRow route="Lagos → Ile-Ife" value={app.lagos_to_ile_ife_rate} addMargin={addMargin} formatNaira={formatNaira} />
                      <PriceRow route="Lagos → Ondo" value={app.lagos_to_ondo_rate} addMargin={addMargin} formatNaira={formatNaira} />
                      <PriceRow route="Lagos → Osogbo" value={app.lagos_to_osogbo_rate} addMargin={addMargin} formatNaira={formatNaira} />
                      <PriceRow route="Overnight Allowance" value={app.overnight_allowance} addMargin={addMargin} formatNaira={formatNaira} />
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <Info title="Bank Name" value={app.bank_name || '—'} />
                <Info title="Account Name" value={app.account_name || '—'} />
                <Info title="Account Number" value={app.account_number || '—'} />
              </div>

              <div className="mt-6 bg-[#f7f4fb] rounded-2xl p-4">
                <p className="font-bold">Agreement accepted</p>
                <p className="text-sm text-gray-600 mt-1">
                  {app.agreement_accepted ? 'Yes' : 'No'}
                </p>
              </div>

              {app.notes && (
                <div className="mt-4 bg-gray-50 rounded-2xl p-4">
                  <p className="font-bold">Owner Notes</p>
                  <p className="text-sm text-gray-600 mt-1">{app.notes}</p>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-5">
                Submitted: {new Date(app.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="font-bold mt-1">{value}</p>
    </div>
  )
}

function PriceRow({
  route,
  value,
  formatNaira,
  addMargin,
}: {
  route: string
  value: number | null
  formatNaira: (value: number | null) => string
  addMargin: (value: number | null) => string
}) {
  return (
    <tr className="border-t">
      <td className="p-3 font-semibold">{route}</td>
      <td className="p-3">{formatNaira(value)}</td>
      <td className="p-3 font-bold text-purple-700">{addMargin(value)}</td>
    </tr>
  )
}