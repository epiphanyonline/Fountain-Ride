'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminGuard from '../../../components/AdminGuard'
type HireRequest = {
  id: string
  booking_ref: string
  car_id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  pickup_address: string
  destination_address: string
  start_date: string
  start_time: string | null
  end_date: string | null
  end_time: string | null
  trip_type: string | null
  passenger_count: number | null
  special_requirements: string | null
  guide_daily_rate: number | null
  agreed_amount: number | null
  currency: string
  status: string
  created_at: string
}
type Vehicle = {
  id: string
  name: string
  daily_rate: number | null
  transmission: string | null
  fuel_type: string | null
  seats: number | null
  image_url: string | null
  image_urls: string[] | null
}
type Offer = {
  id: string
  amount: number
  included_days: number | null
  included_hours: number | null
  overtime_rate: number | null
  extra_day_rate: number | null
  additional_charges: number
  additional_charges_note: string | null
  offer_conditions: string | null
  message: string | null
  status: string
  version_number: number
  is_current: boolean
  created_at: string
}
type Message = {
  id: string
  sender_role: string
  body: string
  created_at: string
}
function money(
  value?: number | null,
  currency = 'NGN'
) {
  if (
    value === null ||
    value === undefined
  ) {
    return '—'
  }
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(value))
  } catch {
    return `₦${Number(value).toLocaleString()}`
  }
}
function words(value?: string | null) {
  if (!value) return 'Not specified'
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    )
}
function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(
    `${value}T12:00:00`
  )
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
function vehicleImage(
  vehicle: Vehicle | null
) {
  if (!vehicle) return ''
  if (
    Array.isArray(vehicle.image_urls) &&
    vehicle.image_urls.length > 0
  ) {
    return vehicle.image_urls[0] || ''
  }
  return vehicle.image_url || ''
}
export default function AdminVehicleHireDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params.id || '')
  const [hireRequest, setHireRequest] =
    useState<HireRequest | null>(null)
  const [vehicle, setVehicle] =
    useState<Vehicle | null>(null)
  const [offers, setOffers] =
    useState<Offer[]>([])
  const [currentOffer, setCurrentOffer] =
    useState<Offer | null>(null)
  const [messages, setMessages] =
    useState<Message[]>([])
  const [loading, setLoading] =
    useState(true)
  const [submitting, setSubmitting] =
    useState(false)
  const [error, setError] =
    useState('')
  const [success, setSuccess] =
    useState('')
  // Quote form
  const [amount, setAmount] =
    useState('')
  const [includedDays, setIncludedDays] =
    useState('')
  const [includedHours, setIncludedHours] =
    useState('')
  const [overtimeRate, setOvertimeRate] =
    useState('')
  const [extraDayRate, setExtraDayRate] =
    useState('')
  const [
    additionalCharges,
    setAdditionalCharges,
  ] = useState('')
  const [
    additionalChargesNote,
    setAdditionalChargesNote,
  ] = useState('')
  const [
    offerConditions,
    setOfferConditions,
  ] = useState('')
  const [message, setMessage] =
    useState('')
  // Negotiation conversation
  const [chatMessage, setChatMessage] =
    useState('')
  const [sendingChat, setSendingChat] =
    useState(false)
  const [chatError, setChatError] =
    useState('')
  const [chatSuccess, setChatSuccess] =
    useState('')
  async function loadRequest() {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(
        `/api/admin/vehicle-hire/${id}`,
        {
          cache: 'no-store',
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to load request.'
        )
      }
      setHireRequest(data.request)
      setVehicle(data.vehicle || null)
      setOffers(data.offers || [])
      setCurrentOffer(
        data.currentOffer || null
      )
      setMessages(data.messages || [])
      /*
       * If there is already a current quote,
       * preload it into the form so admin can
       * deliberately issue an updated version.
       */
      if (data.currentOffer) {
        const offer = data.currentOffer
        setAmount(
          String(offer.amount ?? '')
        )
        setIncludedDays(
          offer.included_days === null
            ? ''
            : String(offer.included_days)
        )
        setIncludedHours(
          offer.included_hours === null
            ? ''
            : String(offer.included_hours)
        )
        setOvertimeRate(
          offer.overtime_rate === null
            ? ''
            : String(offer.overtime_rate)
        )
        setExtraDayRate(
          offer.extra_day_rate === null
            ? ''
            : String(offer.extra_day_rate)
        )
        setAdditionalCharges(
          !offer.additional_charges
            ? ''
            : String(
                offer.additional_charges
              )
        )
        setAdditionalChargesNote(
          offer.additional_charges_note ||
            ''
        )
        setOfferConditions(
          offer.offer_conditions || ''
        )
        setMessage(
          offer.message || ''
        )
      }
    } catch (err: any) {
      setError(
        err.message ||
          'Unable to load request.'
      )
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    loadRequest()
  }, [id])
  async function submitQuotation() {
    if (!hireRequest) return
    setError('')
    setSuccess('')
    if (
      !amount ||
      Number(amount) <= 0
    ) {
      setError(
        'Enter the complete vehicle + driver package price.'
      )
      return
    }
    if (
      additionalCharges &&
      Number(additionalCharges) > 0 &&
      !additionalChargesNote.trim()
    ) {
      setError(
        'Explain the additional charge before sending the quotation.'
      )
      return
    }
    const updating =
      Boolean(currentOffer)
    const confirmed = window.confirm(
      updating
        ? 'Send this updated quotation to the customer? The current quotation will remain in the history but will no longer be active.'
        : 'Send this vehicle + driver quotation to the customer?'
    )
    if (!confirmed) return
    setSubmitting(true)
    try {
      const response = await fetch(
        `/api/admin/vehicle-hire/${id}/offer`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            amount,
            includedDays:
              includedDays || null,
            includedHours:
              includedHours || null,
            overtimeRate:
              overtimeRate || null,
            extraDayRate:
              extraDayRate || null,
            additionalCharges:
              additionalCharges || 0,
            additionalChargesNote:
              additionalChargesNote.trim() ||
              null,
            offerConditions:
              offerConditions.trim() ||
              null,
            message:
              message.trim() || null,
          }),
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to send quotation.'
        )
      }
      setSuccess(
        updating
          ? 'Updated quotation sent to the customer.'
          : 'Quotation sent to the customer.'
      )
      await loadRequest()
    } catch (err: any) {
      setError(
        err.message ||
          'Unable to send quotation.'
      )
    } finally {
      setSubmitting(false)
    }
  }
  async function sendChatMessage() {
    if (!hireRequest) return

    const body = chatMessage.trim()
    setChatError('')
    setChatSuccess('')

    if (!body) {
      setChatError('Enter a message before sending.')
      return
    }

    if (body.length > 2000) {
      setChatError('Messages cannot exceed 2,000 characters.')
      return
    }

    setSendingChat(true)

    try {
      const response = await fetch(
        `/api/admin/vehicle-hire/${id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: body }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to send message.'
        )
      }

      setChatMessage('')
      setChatSuccess('Message sent to the customer.')
      await loadRequest()
    } catch (err: any) {
      setChatError(
        err.message || 'Unable to send message.'
      )
    } finally {
      setSendingChat(false)
    }
  }

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-[#f7f4fb] px-4 py-12">
          <div className="max-w-6xl mx-auto bg-white border rounded-[2rem] p-8">
            <p className="font-black">
              Loading Vehicle Hire
              request...
            </p>
          </div>
        </main>
      </AdminGuard>
    )
  }
  if (
    error &&
    !hireRequest
  ) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-[#f7f4fb] px-4 py-12">
          <div className="max-w-xl mx-auto bg-white border rounded-[2rem] p-7">
            <h1 className="text-2xl font-black">
              Request unavailable
            </h1>
            <p className="text-red-700 mt-3">
              {error}
            </p>
            <button
              onClick={() =>
                router.push(
                  '/admin/vehicle-hire'
                )
              }
              className="mt-6 bg-purple-700 text-white px-5 py-3 rounded-2xl font-black"
            >
              Vehicle Hire Requests
            </button>
          </div>
        </main>
      </AdminGuard>
    )
  }
  if (!hireRequest) {
    return null
  }
  const image =
    vehicleImage(vehicle)
  const canQuote = [
    'requested',
    'negotiating',
  ].includes(hireRequest.status)
  const canChat = [
    'requested',
    'negotiating',
  ].includes(hireRequest.status)
  return (
    <AdminGuard>
      <main className="min-h-screen bg-[#f7f4fb] px-4 py-8 pb-24">
        <div className="max-w-7xl mx-auto">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div>
              <Link
                href="/admin/vehicle-hire"
                className="text-sm font-black text-purple-700"
              >
                ← Vehicle Hire Requests
              </Link>
              <p className="text-xs font-black tracking-[.18em] text-purple-700 mt-5">
                REVIEW & QUOTE
              </p>
              <h1 className="text-3xl md:text-4xl font-black mt-1">
                {hireRequest.booking_ref}
              </h1>
              <p className="text-gray-600 mt-2">
                {vehicle?.name ||
                  'Selected vehicle'}
                {' · '}
                Vehicle + driver
              </p>
            </div>
            <div className="bg-white border rounded-2xl px-5 py-3">
              <p className="text-xs font-bold text-gray-500">
                STATUS
              </p>
              <p className="font-black mt-1">
                {words(
                  hireRequest.status
                )}
              </p>
            </div>
          </div>
          <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-6 mt-7">
            {/* LEFT */}
            <div className="space-y-6">
              {/* VEHICLE */}
              <section className="bg-white border rounded-[2rem] overflow-hidden">
                {image && (
                  <div className="h-64 bg-gray-100">
                    <img
                      src={image}
                      alt={
                        vehicle?.name ||
                        'Vehicle'
                      }
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <p className="text-xs font-black text-purple-700 tracking-widest">
                    SELECTED VEHICLE
                  </p>
                  <h2 className="text-2xl font-black mt-2">
                    {vehicle?.name ||
                      'Vehicle'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-2">
                    {vehicle?.transmission ||
                      'Transmission not specified'}
                    {' · '}
                    {vehicle?.fuel_type ||
                      'Fuel not specified'}
                    {' · '}
                    {vehicle?.seats || '—'}{' '}
                    seats
                  </p>
                  <div className="bg-purple-50 rounded-2xl p-4 mt-5">
                    <p className="text-xs font-bold text-purple-700">
                      GUIDE PRICE
                    </p>
                    <p className="text-2xl font-black mt-1">
                      {money(
                        hireRequest.guide_daily_rate,
                        hireRequest.currency
                      )}
                      <span className="text-sm text-gray-500">
                        {' '}
                        / day
                      </span>
                    </p>
                  </div>
                </div>
              </section>
              {/* JOURNEY */}
              <section className="bg-white border rounded-[2rem] p-6">
                <p className="text-xs font-black text-purple-700 tracking-widest">
                  CUSTOMER REQUEST
                </p>
                <h2 className="text-xl font-black mt-2">
                  Journey details
                </h2>
                <div className="mt-5 space-y-4">
                  <RouteInfo
                    label="Pickup"
                    value={
                      hireRequest.pickup_address
                    }
                  />
                  <RouteInfo
                    label="Destination"
                    value={
                      hireRequest.destination_address
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-5">
                  <Info
                    label="Trip type"
                    value={words(
                      hireRequest.trip_type
                    )}
                  />
                  <Info
                    label="Passengers"
                    value={
                      hireRequest.passenger_count !==
                      null
                        ? String(
                            hireRequest.passenger_count
                          )
                        : '—'
                    }
                  />
                  <Info
                    label="Pickup"
                    value={`${formatDate(
                      hireRequest.start_date
                    )}${
                      hireRequest.start_time
                        ? ` · ${hireRequest.start_time}`
                        : ''
                    }`}
                  />
                  <Info
                    label="Return"
                    value={`${formatDate(
                      hireRequest.end_date
                    )}${
                      hireRequest.end_time
                        ? ` · ${hireRequest.end_time}`
                        : ''
                    }`}
                  />
                </div>
                {hireRequest.special_requirements && (
                  <div className="border-t mt-5 pt-5">
                    <p className="text-xs font-black text-gray-500">
                      ADDITIONAL DETAILS
                    </p>
                    <p className="text-sm mt-2 whitespace-pre-wrap">
                      {
                        hireRequest.special_requirements
                      }
                    </p>
                  </div>
                )}
              </section>
              {/* CUSTOMER */}
              <section className="bg-white border rounded-[2rem] p-6">
                <p className="text-xs font-black text-purple-700 tracking-widest">
                  CUSTOMER
                </p>
                <h2 className="text-xl font-black mt-2">
                  {hireRequest.customer_name}
                </h2>
                <div className="mt-4 space-y-2 text-sm">
                  <p>
                    <span className="font-bold">
                      Phone:
                    </span>{' '}
                    {
                      hireRequest.customer_phone
                    }
                  </p>
                  {hireRequest.customer_email && (
                    <p>
                      <span className="font-bold">
                        Email:
                      </span>{' '}
                      {
                        hireRequest.customer_email
                      }
                    </p>
                  )}
                </div>
              </section>
              {/* NEGOTIATION */}
              <section className="bg-white border rounded-[2rem] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black text-purple-700 tracking-widest">
                      NEGOTIATION
                    </p>
                    <h2 className="text-xl font-black mt-2">
                      Customer conversation
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 leading-6">
                      Discuss the quotation here. If the price or formal terms change,
                      update the quotation so the customer has a clear final offer to accept.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadRequest}
                    disabled={loading}
                    className="shrink-0 border px-3 py-2 rounded-xl text-xs font-black disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>

                <div className="mt-5 border rounded-2xl bg-gray-50 p-4 max-h-[420px] overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="font-black text-gray-700">
                        No negotiation messages yet
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Messages between the customer and Fountain Ride will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((item) => {
                        const fromCustomer = item.sender_role === 'customer'

                        return (
                          <div
                            key={item.id}
                            className={`flex ${
                              fromCustomer ? 'justify-start' : 'justify-end'
                            }`}
                          >
                            <div
                              className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                                fromCustomer
                                  ? 'bg-white border text-gray-950'
                                  : 'bg-purple-700 text-white'
                              }`}
                            >
                              <p
                                className={`text-[11px] font-black tracking-wider ${
                                  fromCustomer
                                    ? 'text-purple-700'
                                    : 'text-purple-200'
                                }`}
                              >
                                {fromCustomer ? 'CUSTOMER' : 'FOUNTAIN RIDE'}
                              </p>
                              <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                                {item.body}
                              </p>
                              <p
                                className={`text-[11px] mt-2 ${
                                  fromCustomer
                                    ? 'text-gray-400'
                                    : 'text-purple-200'
                                }`}
                              >
                                {formatMessageTime(item.created_at)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {!canChat ? (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <p className="font-black text-amber-800">
                      Negotiation closed
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      This request has progressed beyond quotation negotiation,
                      so the conversation is now read-only.
                    </p>
                  </div>
                ) : !currentOffer ? (
                  <div className="mt-4 bg-purple-50 border border-purple-200 rounded-2xl p-4">
                    <p className="font-black text-purple-900">
                      Send the quotation first
                    </p>
                    <p className="text-sm text-purple-700 mt-1">
                      Customer negotiation opens after a formal vehicle + driver
                      quotation has been issued.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4">
                    <textarea
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      placeholder="Reply to the customer..."
                      className="w-full border rounded-2xl p-4 resize-none outline-none focus:ring-2 focus:ring-purple-300"
                    />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
                      <p className="text-xs text-gray-400">
                        {chatMessage.length}/2000
                      </p>
                      <button
                        type="button"
                        onClick={sendChatMessage}
                        disabled={sendingChat || !chatMessage.trim()}
                        className="bg-purple-700 hover:bg-purple-600 disabled:bg-gray-300 disabled:text-gray-500 text-white px-5 py-3 rounded-2xl font-black"
                      >
                        {sendingChat ? 'Sending...' : 'Send Message'}
                      </button>
                    </div>
                  </div>
                )}

                {chatError && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm font-semibold">
                    {chatError}
                  </div>
                )}
                {chatSuccess && (
                  <div className="mt-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 text-sm font-semibold">
                    {chatSuccess}
                  </div>
                )}
              </section>
              {/* HISTORY */}
              {offers.length > 0 && (
                <section className="bg-white border rounded-[2rem] p-6">
                  <p className="text-xs font-black text-purple-700 tracking-widest">
                    QUOTATION HISTORY
                  </p>
                  <div className="mt-4 space-y-3">
                    {offers.map(
                      (offer) => (
                        <div
                          key={offer.id}
                          className="bg-gray-50 rounded-2xl p-4"
                        >
                          <div className="flex justify-between gap-4">
                            <div>
                              <p className="font-black">
                                Version{' '}
                                {
                                  offer.version_number
                                }
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {words(
                                  offer.status
                                )}
                              </p>
                            </div>
                            <p className="font-black">
                              {money(
                                offer.amount,
                                hireRequest.currency
                              )}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </section>
              )}
            </div>
            {/* RIGHT — QUOTE */}
            <div>
              <section className="bg-gray-950 text-white rounded-[2rem] p-6 md:p-8 lg:sticky lg:top-6">
                <p className="text-xs font-black text-purple-300 tracking-widest">
                  {currentOffer
                    ? 'UPDATE QUOTATION'
                    : 'SEND QUOTATION'}
                </p>
                <h2 className="text-2xl md:text-3xl font-black mt-2">
                  Vehicle + driver package
                </h2>
                <p className="text-sm text-gray-400 mt-2 leading-6">
                  Enter the complete price for
                  this chauffeur-driven vehicle
                  hire. Do not add a separate
                  driver charge.
                </p>
                {!canQuote && (
                  <div className="mt-5 bg-amber-500/10 border border-amber-400/30 rounded-2xl p-4">
                    <p className="font-black text-amber-200">
                      Quotation locked
                    </p>
                    <p className="text-sm text-gray-300 mt-1">
                      The request has progressed
                      beyond negotiation, so the
                      agreed quotation can no
                      longer be replaced.
                    </p>
                  </div>
                )}
                <div className="mt-6">
                  <Label>
                    Total package quotation *
                  </Label>
                  <div className="relative mt-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">
                      ₦
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={amount}
                      disabled={!canQuote}
                      onChange={(e) =>
                        setAmount(
                          e.target.value
                        )
                      }
                      placeholder="e.g. 500000"
                      className="w-full bg-white text-gray-950 rounded-2xl pl-9 pr-4 py-4 font-black disabled:opacity-60"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    This is the complete
                    vehicle + driver price for
                    the quoted hire.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mt-5">
                  <QuoteInput
                    label="Days included"
                    value={includedDays}
                    disabled={!canQuote}
                    onChange={
                      setIncludedDays
                    }
                    placeholder="e.g. 4"
                  />
                  <QuoteInput
                    label="Hours included"
                    value={includedHours}
                    disabled={!canQuote}
                    onChange={
                      setIncludedHours
                    }
                    placeholder="Optional"
                  />
                  <QuoteInput
                    label="Extra day rate"
                    value={extraDayRate}
                    disabled={!canQuote}
                    onChange={
                      setExtraDayRate
                    }
                    prefix="₦"
                    placeholder="Optional"
                  />
                  <QuoteInput
                    label="Overtime / hour"
                    value={overtimeRate}
                    disabled={!canQuote}
                    onChange={
                      setOvertimeRate
                    }
                    prefix="₦"
                    placeholder="Optional"
                  />
                </div>
                <div className="mt-5">
                  <Label>
                    Additional charges
                  </Label>
                  <div className="relative mt-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                      ₦
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={
                        additionalCharges
                      }
                      disabled={!canQuote}
                      onChange={(e) =>
                        setAdditionalCharges(
                          e.target.value
                        )
                      }
                      placeholder="0"
                      className="w-full bg-white text-gray-950 rounded-2xl pl-9 pr-4 py-3.5 disabled:opacity-60"
                    />
                  </div>
                </div>
                {Number(
                  additionalCharges || 0
                ) > 0 && (
                  <div className="mt-4">
                    <Label>
                      Explain additional charges *
                    </Label>
                    <textarea
                      value={
                        additionalChargesNote
                      }
                      disabled={!canQuote}
                      onChange={(e) =>
                        setAdditionalChargesNote(
                          e.target.value
                        )
                      }
                      rows={2}
                      placeholder="What does this charge cover?"
                      className="mt-2 w-full bg-white text-gray-950 rounded-2xl p-4 resize-none disabled:opacity-60"
                    />
                  </div>
                )}
                <div className="mt-5">
                  <Label>
                    Conditions / inclusions
                  </Label>
                  <textarea
                    value={offerConditions}
                    disabled={!canQuote}
                    onChange={(e) =>
                      setOfferConditions(
                        e.target.value
                      )
                    }
                    rows={4}
                    placeholder="For example: quoted journey, agreed dates, waiting allowance, overnight arrangements..."
                    className="mt-2 w-full bg-white text-gray-950 rounded-2xl p-4 resize-none disabled:opacity-60"
                  />
                </div>
                <div className="mt-5">
                  <Label>
                    Message to customer
                  </Label>
                  <textarea
                    value={message}
                    disabled={!canQuote}
                    onChange={(e) =>
                      setMessage(
                        e.target.value
                      )
                    }
                    rows={3}
                    placeholder="Optional message about this quotation..."
                    className="mt-2 w-full bg-white text-gray-950 rounded-2xl p-4 resize-none disabled:opacity-60"
                  />
                </div>
                <div className="mt-5 bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs font-black text-purple-300">
                    STANDARD FOUNTAIN RIDE TERMS
                  </p>
                  <div className="text-sm text-gray-300 mt-3 space-y-2">
                    <p>
                      ✓ Vehicle and driver are
                      supplied together.
                    </p>
                    <p>
                      ✓ Customer accepts the
                      quotation before payment.
                    </p>
                    <p>
                      ✓ Any unusual additional
                      expense should be stated
                      before the customer accepts.
                    </p>
                    <p>
                      ✓ Payment should remain on
                      Fountain Ride.
                    </p>
                  </div>
                </div>
                {error && (
                  <div className="mt-5 bg-red-500/10 border border-red-400/30 text-red-200 rounded-2xl p-4 text-sm font-semibold">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mt-5 bg-green-500/10 border border-green-400/30 text-green-200 rounded-2xl p-4 text-sm font-semibold">
                    {success}
                  </div>
                )}
                {canQuote && (
                  <button
                    type="button"
                    onClick={
                      submitQuotation
                    }
                    disabled={submitting}
                    className="mt-5 w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 py-4 rounded-2xl font-black"
                  >
                    {submitting
                      ? 'Sending...'
                      : currentOffer
                        ? 'Send Updated Quotation'
                        : 'Send Quotation'}
                  </button>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>
    </AdminGuard>
  )
}
function formatMessageTime(value?: string | null) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function Label({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <p className="text-sm font-black text-gray-200">
      {children}
    </p>
  )
}
function QuoteInput({
  label,
  value,
  onChange,
  placeholder,
  prefix,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  prefix?: string
  disabled?: boolean
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative mt-2">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
            {prefix}
          </span>
        )}
        <input
          type="number"
          min="0"
          value={value}
          disabled={disabled}
          onChange={(e) =>
            onChange(e.target.value)
          }
          placeholder={placeholder}
          className={`w-full bg-white text-gray-950 rounded-2xl py-3.5 pr-4 disabled:opacity-60 ${
            prefix ? 'pl-9' : 'pl-4'
          }`}
        />
      </div>
    </div>
  )
}
function Info({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4">
      <p className="text-xs font-bold text-gray-500">
        {label}
      </p>
      <p className="font-black mt-1">
        {value}
      </p>
    </div>
  )
}
function RouteInfo({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-xs font-black text-gray-500">
        {label}
      </p>
      <p className="font-black mt-1">
        {value}
      </p>
    </div>
  )
}
