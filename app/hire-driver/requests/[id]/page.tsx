'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import MarketplaceNav from '../../../components/MarketplaceNav'
import DriverHireBankTransferPanel from './DriverHireBankTransferPanel'

type Driver = {
  id: string
  full_name: string
  city: string | null
  state: string | null
  work_mode: string
  driving_experience_years: number | null
  drives_automatic: boolean
  drives_manual: boolean
  driver_hire_job_types: string[]
  driver_hire_status: string
}

type Offer = {
  id: string
  driver_hire_request_id: string
  driver_application_id: string
  amount: number
  base_amount: number | null
  included_hours: number | null
  overtime_rate: number | null
  additional_charges: number
  additional_charges_note: string | null
  fuel_terms: string | null
  toll_parking_terms: string | null
  accommodation_terms: string | null
  offer_conditions: string | null
  message: string | null
  status: string
  version_number: number
  accepted_at: string | null
  created_at: string
    driver: Driver | null

  unread_message_count?: number

  latest_driver_message?: {
    id: string
    body: string
    created_at: string
  } | null
}

type NegotiationState = {
  offer_id: string
  current_amount: number
  last_actor: 'customer' | 'driver' | 'owner' | 'admin'
  status: 'open' | 'accepted' | 'declined' | 'closed'
  revision: number
  updated_at: string
}
type ChatMessage = {
  id: string
  driver_hire_request_id: string
  driver_application_id: string
  sender_role: 'customer' | 'driver'
  body: string
  created_at: string
}

type HireRequest = {
  id: string
  booking_ref: string
  customer_name: string
  status: string
  currency: string

  driver_need_type: string | null
  job_type: string

  pickup_address: string
  pickup_city: string | null
  pickup_state: string | null
  public_work_area: string | null

  destination_pattern: string | null
  destination_address: string | null
  destination_city: string | null
  destination_state: string | null

  start_date: string
  start_time: string
  end_time: string | null

  finish_time_uncertain: boolean
  estimated_min_hours: number | null
  estimated_max_hours: number | null
  duration_hours: number | null

  service_frequency: string
  recurring_pattern: string | null
  recurring_days: string[]
  recurring_duration_note: string | null
  custom_schedule: string | null

  duties: string[]

  vehicle_type: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  vehicle_transmission: string | null
  vehicle_notes: string | null

  passenger_count: number | null

  waiting_expected: boolean
  estimated_waiting_hours: number | null

  interstate_required: boolean
  overnight_required: boolean
  accommodation_arrangement: string | null

  luggage_notes: string | null
  special_requirements: string | null

    job_start_pin: string | null
  job_start_pin_used_at: string | null
  driver_arrived_at: string | null
  job_started_at: string | null
  driver_finished_at: string | null
  customer_confirmed_at: string | null

  created_at: string
}

type Agreement = {
  id: string
  accepted_offer_id: string
  driver_application_id: string
  agreed_amount: number
  included_hours: number | null
  overtime_rate: number | null
  additional_charges: number
  fuel_terms: string | null
  toll_parking_terms: string | null
  accommodation_terms: string | null
  offer_conditions: string | null
  accepted_at: string
}

function words(value?: string | null) {
  if (!value) return 'Not specified'

  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, letter =>
      letter.toUpperCase()
    )
}


function money(
  value?: number | null,
  currency = 'NGN'
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return '-'
  }

  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(value))
  } catch {
    return `${currency} ${Number(value).toLocaleString('en-NG')}`
  }
}


function formatDate(value?: string | null) {
  if (!value) return 'Not specified'

  const date = new Date(
    `${value}T12:00:00`
  )

  if (
    Number.isNaN(date.getTime())
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    'en-NG',
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  ).format(date)
}

export default function DriverHireRequestPage() {
  const params = useParams()
  const router = useRouter()

  const id = String(params.id || '')

  const [hireRequest, setHireRequest] =
    useState<HireRequest | null>(null)

  const [offers, setOffers] =
    useState<Offer[]>([])

  const [negotiations, setNegotiations] =
    useState<NegotiationState[]>([])

  const [agreement, setAgreement] =
    useState<Agreement | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

    const [chatOffer, setChatOffer] =
  useState<Offer | null>(null)

const [chatMessages, setChatMessages] =
  useState<ChatMessage[]>([])

const [chatText, setChatText] =
  useState('')

const [chatLoading, setChatLoading] =
  useState(false)

const [chatSending, setChatSending] =
  useState(false)

const [chatError, setChatError] =
  useState('')

  const [acceptOffer, setAcceptOffer] =
  useState<Offer | null>(null)
  const [negotiateOffer, setNegotiateOffer] =
    useState<Offer | null>(null)

  const [counterAmount, setCounterAmount] =
    useState('')

  const [counterMessage, setCounterMessage] =
    useState('')

  const [counterLoading, setCounterLoading] =
    useState(false)

  const [counterError, setCounterError] =
    useState('')

const [acceptingOffer, setAcceptingOffer] =
  useState(false)

const [acceptError, setAcceptError] =
  useState('')

const [paymentLoading, setPaymentLoading] =
  useState(false)

const [paymentError, setPaymentError] =
  useState('')

const [paymentVerifying, setPaymentVerifying] =
  useState(false)

const [paymentMessage, setPaymentMessage] =
  useState('')

  const [completionLoading, setCompletionLoading] = useState(false)
  const [completionError, setCompletionError] = useState('')

  async function confirmJobCompletion() {
    if (completionLoading ||
        hireRequest?.status !== 'awaiting_customer_confirmation') {
      return
    }

    if (!window.confirm(
      'Confirm that the driver has completed the job? This will release the driver earnings.'
    )) {
      return
    }

    setCompletionLoading(true)
    setCompletionError('')

    try {
      const accessToken = localStorage.getItem(
        `fountain_driver_hire_access_${id}`
      )

      if (!accessToken) {
        throw new Error('Customer booking access is unavailable.')
      }

      const response = await fetch(
        `/api/marketplace/driver-hire/${id}/confirm-completion`,
        {
          method: 'POST',
          headers: {
            'x-driver-hire-access-token': accessToken,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Unable to confirm completion.')
      }

      await loadRequest()
    } catch (err) {
      setCompletionError(
        err instanceof Error ? err.message : 'Unable to confirm completion.'
      )
    } finally {
      setCompletionLoading(false)
    }
  }
  async function startPayment() {
  if (
    !id ||
    paymentLoading
  ) {
    return
  }

  setPaymentLoading(true)
  setPaymentError('')
  setPaymentMessage('')

  try {
    const accessToken =
      localStorage.getItem(
        `fountain_driver_hire_access_${id}`
      )

    if (!accessToken) {
      throw new Error(
        'This device does not have access to this Driver Hire request.'
      )
    }

    const response = await fetch(
      `/api/marketplace/driver-hire/${id}/pay`,
      {
        method: 'POST',

        headers: {
          'x-driver-hire-access-token':
            accessToken,
        },
      }
    )

    const data =
      await response.json()

    if (!response.ok) {
      throw new Error(
        data.error ||
          'Unable to start payment.'
      )
    }

    if (!data.authorizationUrl) {
      throw new Error(
        'Payment checkout URL was not returned.'
      )
    }

    // Keep our own reference in case we need it
    // after returning from Paystack.
    if (data.reference) {
      sessionStorage.setItem(
        `fountain_driver_hire_payment_${id}`,
        data.reference
      )
    }

    window.location.href =
      data.authorizationUrl
  } catch (err: any) {
    setPaymentError(
      err.message ||
        'Unable to start payment.'
    )

    setPaymentLoading(false)
  }
}

async function verifyPayment(
  reference: string
) {
  if (
    !reference ||
    !id ||
    paymentVerifying
  ) {
    return
  }

  setPaymentVerifying(true)
  setPaymentError('')
  setPaymentMessage(
    'Confirming your payment...'
  )

  try {
    const accessToken =
      localStorage.getItem(
        `fountain_driver_hire_access_${id}`
      )

    if (!accessToken) {
      throw new Error(
        'This device does not have access to this Driver Hire request.'
      )
    }

    const response = await fetch(
      `/api/marketplace/driver-hire/${id}/pay/verify`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          'x-driver-hire-access-token':
            accessToken,
        },

        body: JSON.stringify({
          reference,
        }),
      }
    )

    const data =
      await response.json()

    if (!response.ok) {
      throw new Error(
        data.error ||
          'Unable to verify payment.'
      )
    }

    sessionStorage.removeItem(
      `fountain_driver_hire_payment_${id}`
    )

    setPaymentMessage(
      'Payment confirmed. Your Driver Hire booking is now confirmed.'
    )

    await loadRequest()

    // Remove Paystack parameters from the URL
    // so refreshing does not trigger verification again.
    window.history.replaceState(
      {},
      '',
      `/hire-driver/requests/${id}`
    )
  } catch (err: any) {
    setPaymentMessage('')

    setPaymentError(
      err.message ||
        'Unable to verify payment.'
    )
  } finally {
    setPaymentVerifying(false)
  }
}

  async function acceptCustomerNegotiatedPrice() {
    if (!negotiateOffer || !id || counterLoading || !hireRequest) return

    const negotiation = negotiations.find(
      item => item.offer_id === negotiateOffer.id
    )

    if (
      !negotiation ||
      negotiation.status !== 'open' ||
      negotiation.last_actor !== 'driver' ||
      !Number.isSafeInteger(negotiation.revision) ||
      negotiation.revision < 1
    ) {
      setCounterError(
        'The driver has no current counteroffer available for acceptance. Refresh the booking.'
      )
      return
    }

    const agreedAmount = Number(negotiation.current_amount)

    if (
      !Number.isFinite(agreedAmount) ||
      agreedAmount <= 0
    ) {
      setCounterError('The negotiated price is invalid. Refresh the booking.')
      return
    }

    if (
      !window.confirm(
        `Accept the driver's negotiated price of NGN ${agreedAmount.toLocaleString('en-NG')}? This selects the driver and moves your booking to payment.`
      )
    ) {
      return
    }

    setCounterLoading(true)
    setCounterError('')

    try {
      const accessToken = localStorage.getItem(
        `fountain_driver_hire_access_${id}`
      )

      if (!accessToken) {
        throw new Error(
          'This device does not have access to this Driver Hire request.'
        )
      }

      const response = await fetch(
        `/api/marketplace/driver-hire/${id}/negotiation/accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-driver-hire-access-token': accessToken,
          },
          body: JSON.stringify({
            offerId: negotiateOffer.id,
            expectedRevision: negotiation.revision,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || data?.success !== true) {
        throw new Error(
          data?.error || 'Unable to accept the negotiated price.'
        )
      }

      setNegotiateOffer(null)
      setCounterAmount('')
      setCounterMessage('')

      await loadRequest()
    } catch (err: unknown) {
      setCounterError(
        err instanceof Error
          ? err.message
          : 'Unable to accept the negotiated price.'
      )
    } finally {
      setCounterLoading(false)
    }
  }
  async function submitCustomerCounteroffer() {
    if (!negotiateOffer || !id || counterLoading || !hireRequest) return

    const negotiation = negotiations.find(
      item => item.offer_id === negotiateOffer.id
    )

    if (
      negotiation &&
      (negotiation.status !== 'open' ||
        negotiation.last_actor !== 'driver')
    ) {
      setCounterError(
        'This negotiation is not awaiting your response. Refresh the booking.'
      )
      return
    }

    const amount = Number(counterAmount.trim())

    if (
      !counterAmount.trim() ||
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      amount > 1000000000
    ) {
      setCounterError('Enter a valid whole-naira counteroffer amount.')
      return
    }

    if (counterMessage.length > 2000) {
      setCounterError('Your message must not exceed 2,000 characters.')
      return
    }

    const currentAmount =
      negotiation?.current_amount ?? negotiateOffer.amount

    if (amount === Number(currentAmount)) {
      setCounterError(
        'Your counteroffer must differ from the current proposed price.'
      )
      return
    }

    if (
      !window.confirm(
        `Send your counteroffer of NGN ${amount.toLocaleString('en-NG')} to the driver?`
      )
    ) {
      return
    }

    setCounterLoading(true)
    setCounterError('')

    try {
      const accessToken = localStorage.getItem(
        `fountain_driver_hire_access_${id}`
      )

      if (!accessToken) {
        throw new Error(
          'This device does not have access to this Driver Hire request.'
        )
      }

      const response = await fetch(
        `/api/marketplace/driver-hire/${id}/counteroffer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-driver-hire-access-token': accessToken,
          },
          body: JSON.stringify({
            offerId: negotiateOffer.id,
            amount,
            message: counterMessage.trim() || null,
            expectedRevision: negotiation?.revision ?? 0,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || data?.success !== true) {
        throw new Error(
          data?.error || 'Unable to submit your counteroffer.'
        )
      }

      setNegotiateOffer(null)
      setCounterAmount('')
      setCounterMessage('')

      await loadRequest()
    } catch (err: unknown) {
      setCounterError(
        err instanceof Error
          ? err.message
          : 'Unable to submit your counteroffer.'
      )
    } finally {
      setCounterLoading(false)
    }
  }
  async function confirmAcceptOffer() {
  if (
    !acceptOffer ||
    acceptingOffer ||
    !id
  ) {
    return
  }

  if (negotiations.some(item => item.offer_id === acceptOffer.id && item.status === "open")) {
    setAcceptError("This quotation has an open negotiation. Wait until the negotiation is resolved.")
    return
  }

  if (negotiations.some(item => item.offer_id === acceptOffer.id && item.status === "open")) {
    setAcceptError("This quotation has an open negotiation. Wait until it is resolved.")
    return
  }

  setAcceptingOffer(true)
  setAcceptError('')

  try {
    const accessToken =
      localStorage.getItem(
        `fountain_driver_hire_access_${id}`
      )

    if (!accessToken) {
      throw new Error(
        'This device does not have access to this Driver Hire request.'
      )
    }

    const response = await fetch(
      `/api/marketplace/driver-hire/${id}/accept`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          'x-driver-hire-access-token':
            accessToken,
        },

        body: JSON.stringify({
          offerId: acceptOffer.id,
        }),
      }
    )

    const data =
      await response.json()

    if (!response.ok) {
      throw new Error(
        data.error ||
          'Unable to accept quotation.'
      )
    }

    setAcceptOffer(null)

    await loadRequest()
  } catch (err: any) {
    setAcceptError(
      err.message ||
        'Unable to accept quotation.'
    )
  } finally {
    setAcceptingOffer(false)
  }
}

async function loadChat(
  offer: Offer
) {
  if (!id) return

  setChatOffer(offer)
  setChatLoading(true)
  setChatError('')

  try {
    const accessToken =
      localStorage.getItem(
        `fountain_driver_hire_access_${id}`
      )

    if (!accessToken) {
      throw new Error(
        'This device does not have access to this conversation.'
      )
    }

    const response = await fetch(
      `/api/marketplace/driver-hire/${id}/messages?driverApplicationId=${encodeURIComponent(
        offer.driver_application_id
      )}`,
      {
        headers: {
          'x-driver-hire-access-token':
            accessToken,
        },
        cache: 'no-store',
      }
    )

    const data =
      await response.json()

    if (!response.ok) {
      throw new Error(
        data.error ||
          'Unable to load conversation.'
      )
    }

        setChatMessages(
      data.messages || []
    )

    // The chat API has now marked this driver's
    // incoming messages as read by the customer.
    // Clear the unread indicator immediately.
    setOffers(current =>
      current.map(currentOffer =>
        currentOffer.driver_application_id ===
        offer.driver_application_id
          ? {
              ...currentOffer,
              unread_message_count: 0,
              latest_driver_message: null,
            }
          : currentOffer
      )
    )
  } catch (err: any) {
    setChatError(
      err.message ||
        'Unable to load conversation.'
    )
  } finally {
    setChatLoading(false)
  }
}

async function sendChatMessage() {
  if (
    !chatOffer ||
    !chatText.trim() ||
    chatSending
  ) {
    return
  }

  setChatSending(true)
  setChatError('')

  try {
    const accessToken =
      localStorage.getItem(
        `fountain_driver_hire_access_${id}`
      )

    if (!accessToken) {
      throw new Error(
        'This device does not have access to this conversation.'
      )
    }

    const response = await fetch(
      `/api/marketplace/driver-hire/${id}/messages`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          'x-driver-hire-access-token':
            accessToken,
        },

        body: JSON.stringify({
          driverApplicationId:
            chatOffer.driver_application_id,

          message:
            chatText.trim(),
        }),
      }
    )

    const data =
      await response.json()

    if (!response.ok) {
      throw new Error(
        data.error ||
          'Unable to send message.'
      )
    }

    setChatText('')

    await loadChat(chatOffer)
  } catch (err: any) {
    setChatError(
      err.message ||
        'Unable to send message.'
    )
  } finally {
    setChatSending(false)
  }
}

  async function loadRequest() {
    if (!id) return

    setLoading(true)
    setError('')

    try {
      const accessToken =
        localStorage.getItem(
          `fountain_driver_hire_access_${id}`
        )

      if (!accessToken) {
        setError(
          'This device does not have access to this Driver Hire request.'
        )
        setLoading(false)
        return
      }

      const response = await fetch(
        `/api/marketplace/driver-hire/${id}`,
        {
          headers: {
            'x-driver-hire-access-token':
              accessToken,
          },
          cache: 'no-store',
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to load request.'
        )
      }

      setHireRequest(data.request)
      setOffers(data.offers || [])
        setNegotiations(data.negotiations || [])
      setAgreement(
        data.agreement || null
      )
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
  if (!id) return

  loadRequest()

  const params =
    new URLSearchParams(
      window.location.search
    )

  const paystackReference =
    params.get('reference') ||
    params.get('trxref')

  const storedReference =
    sessionStorage.getItem(
      `fountain_driver_hire_payment_${id}`
    )

  const reference =
    paystackReference ||
    storedReference

  if (reference) {
    verifyPayment(reference)
  }
}, [id])

  if (loading) {
    return (
      <>
        <MarketplaceNav />

        <main className="min-h-screen bg-[#faf8fd] px-4 py-12">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white border rounded-[2rem] p-8">
              <p className="font-black">
                Loading your Driver Hire
                request...
              </p>
            </div>
          </div>
        </main>
      </>
    )
  }

  if (
    error ||
    !hireRequest
  ) {
    return (
      <>
        <MarketplaceNav />

        <main className="min-h-screen bg-[#faf8fd] px-4 py-12">
          <div className="max-w-xl mx-auto bg-white border rounded-[2rem] p-7">
            <p className="text-xs font-black text-purple-700 tracking-widest">
              FOUNTAIN RIDE DRIVER HIRE
            </p>

            <h1 className="text-2xl font-black mt-2">
              Request unavailable
            </h1>

            <p className="text-gray-600 mt-3">
              {error ||
                'We could not load this request.'}
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  '/hire-driver'
                )
              }
              className="mt-6 bg-purple-700 text-white px-6 py-3 rounded-2xl font-black"
            >
              Hire a Driver
            </button>
          </div>
        </main>
      </>
    )
  }

  const activeOffers =
    offers.filter(
      offer =>
        ![
          'withdrawn',
          'declined',
          'not_selected',
        ].includes(offer.status)
    )

  return (
    <>
      <MarketplaceNav />

      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f2e9ff_0,#faf8fd_42%,#f7f4fb_100%)] px-4 py-7 md:py-10 pb-28">
        <div className="max-w-6xl mx-auto">

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div>
              <p className="text-xs font-black text-purple-700 tracking-[.18em]">
                DRIVER HIRE REQUEST
              </p>

              <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-2">
                {hireRequest.booking_ref}
              </h1>

              <p className="text-gray-600 mt-2">
                {words(
                  hireRequest.driver_need_type
                )}{' '}
                 -{' '}
                {words(
                  hireRequest.job_type
                )}
              </p>
            </div>

            <StatusCard
              status={
                hireRequest.status
              }
              offerCount={
                activeOffers.length
              }
            />
          </div>

          {hireRequest.status === 'awaiting_customer_confirmation' && (
            <section className="mt-6 rounded-3xl border-2 border-green-300 bg-green-50 p-6">
              <h2 className="text-xl font-black text-green-950">
                Driver has finished the job
              </h2>

              <p className="mt-2 text-sm text-green-900">
                Please confirm that the agreed service has been completed.
                Confirmation will release the driver's earnings.
              </p>

              {completionError && (
                <p role="alert" className="mt-3 text-sm font-semibold text-red-700">
                  {completionError}
                </p>
              )}

              <button
                type="button"
                disabled={completionLoading}
                onClick={confirmJobCompletion}
                className="mt-5 rounded-2xl bg-green-700 px-6 py-4 font-bold text-white disabled:opacity-50"
              >
                {completionLoading
                  ? 'Confirming completion...'
                  : 'Confirm Job Completion'}
              </button>
            </section>
          )}
          {agreement && (
  <section
    className={`mt-6 border rounded-[2rem] p-6 ${
      hireRequest.status === 'confirmed'
        ? 'bg-green-50 border-green-200'
        : 'bg-amber-50 border-amber-200'
    }`}
  >
    <p
      className={`text-xs font-black tracking-widest ${
        hireRequest.status === 'confirmed'
          ? 'text-green-700'
          : 'text-amber-700'
      }`}
    >
      {hireRequest.status === 'confirmed'
        ? 'BOOKING CONFIRMED'
        : 'QUOTATION ACCEPTED'}
    </p>

    <h2 className="text-2xl font-black mt-2">
      {hireRequest.status === 'confirmed'
        ? 'Your Driver Hire booking is confirmed'
        : 'Complete your booking'}
    </h2>

    <p className="text-gray-600 mt-2">
      Final agreed amount:{' '}
      <b className="text-gray-950">
        {money(
          agreement.agreed_amount,
          hireRequest.currency
        )}
      </b>
    </p>

    {hireRequest.status === 'awaiting_payment' && (
  <DriverHireBankTransferPanel
    requestId={String(id ?? '')}
  />
)}

    {hireRequest.status ===
      'confirmed' && (
      <div className="mt-5 bg-white/70 border border-green-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <span className="flex shrink-0 items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white font-black">
            &#10003;
          </span>

          <div>
            <p className="font-black text-green-900">
              Payment confirmed
            </p>

            <p className="text-sm text-green-800 mt-1">
              Your payment has been
              verified and the Driver Hire
              booking is confirmed.
            </p>
          </div>
        </div>
      </div>
    )}
        {['confirmed', 'driver_en_route', 'driver_arrived'].includes(
  hireRequest.status
) &&
hireRequest.job_start_pin &&
!hireRequest.job_start_pin_used_at && (
        <div className="mt-5 bg-purple-950 text-white rounded-2xl p-5 md:p-6">
          <p className="text-xs font-black text-purple-300 tracking-[.18em]">
            JOB START PIN
          </p>

          <p className="text-sm text-purple-100 mt-2">
            Give this PIN to your driver only when
            the driver has arrived and you are ready
            for the job to begin.
          </p>

          <div className="flex gap-2 mt-5">
            {hireRequest.job_start_pin
              .split('')
              .map((digit, index) => (
                <span
                  key={index}
                  className="flex items-center justify-center w-12 h-14 bg-white text-purple-950 rounded-xl text-2xl font-black"
                >
                  {digit}
                </span>
              ))}
          </div>

          <div className="mt-5 border border-purple-700 bg-purple-900/60 rounded-xl p-4">
            <p className="text-sm font-black">
              Keep this PIN private
            </p>

            <p className="text-xs text-purple-200 mt-1 leading-5">
              Do not send the PIN to the driver in
              advance. Entering this PIN will confirm
              that the Driver Hire job has started.
            </p>
          </div>
        </div>
      )}
  </section>
)}

          <div className="grid lg:grid-cols-[1fr_.78fr] gap-6 mt-6">

            <div className="space-y-6">
              <section className="bg-white border rounded-[2rem] p-5 md:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black text-purple-700 tracking-widest">
                      JOB BRIEF
                    </p>

                    <h2 className="text-2xl font-black mt-1">
                      What drivers are
                      quoting for
                    </h2>
                  </div>

                  <span className="bg-purple-50 text-purple-800 px-3 py-2 rounded-xl text-xs font-black">
                    {words(
                      hireRequest.service_frequency
                    )}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mt-6">
                  <Info
                    label="Driver needed"
                    value={words(
                      hireRequest.driver_need_type
                    )}
                  />

                  <Info
                    label="Job type"
                    value={words(
                      hireRequest.job_type
                    )}
                  />

                  <Info
                    label="Work area"
                    value={
                      hireRequest.public_work_area ||
                      hireRequest.pickup_city ||
                      hireRequest.pickup_state ||
                      'Not specified'
                    }
                  />

                  <Info
                    label="Start date"
                    value={formatDate(
                      hireRequest.start_date
                    )}
                  />

                  <Info
                    label="Start time"
                    value={
                      hireRequest.start_time
                    }
                  />

                  <Info
                    label="Expected finish"
                    value={
                      hireRequest.finish_time_uncertain
                        ? 'Not fixed'
                        : hireRequest.end_time ||
                          'Not specified'
                    }
                  />
                </div>

                {hireRequest.finish_time_uncertain &&
                  (hireRequest.estimated_min_hours !==
                    null ||
                    hireRequest.estimated_max_hours !==
                      null) && (
                    <div className="mt-4 bg-gray-50 rounded-2xl p-4">
                      <p className="text-xs text-gray-500 font-bold">
                        ESTIMATED DURATION
                      </p>

                      <p className="font-black mt-1">
                        {hireRequest.estimated_min_hours ??
                          '?'}
                        {' - '}
                        {hireRequest.estimated_max_hours ??
                          '?'}{' '}
                        hours
                      </p>
                    </div>
                  )}

                {!hireRequest.finish_time_uncertain &&
                  hireRequest.duration_hours !==
                    null && (
                    <div className="mt-4 bg-gray-50 rounded-2xl p-4">
                      <p className="text-xs text-gray-500 font-bold">
                        ESTIMATED DURATION
                      </p>

                      <p className="font-black mt-1">
                        Approx.{' '}
                        {
                          hireRequest.duration_hours
                        }{' '}
                        hours
                      </p>
                    </div>
                  )}
              </section>

              <section className="bg-white border rounded-[2rem] p-5 md:p-7">
                <p className="text-xs font-black text-purple-700 tracking-widest">
                  JOURNEY / WORK PATTERN
                </p>

                <h2 className="text-2xl font-black mt-1">
                  Location details
                </h2>

                <div className="mt-5 space-y-4">
                  <Info
                    label="Reporting location"
                    value={
                      hireRequest.pickup_address
                    }
                  />

                  <Info
                    label="Work pattern"
                    value={words(
                      hireRequest.destination_pattern
                    )}
                  />

                  {hireRequest.destination_address && (
                    <Info
                      label="Expected destination"
                      value={
                        hireRequest.destination_address
                      }
                    />
                  )}
                </div>
              </section>

              {hireRequest.service_frequency !==
                'one_time' && (
                <section className="bg-white border rounded-[2rem] p-5 md:p-7">
                  <p className="text-xs font-black text-purple-700 tracking-widest">
                    RECURRING ARRANGEMENT
                  </p>

                  <h2 className="text-2xl font-black mt-1">
                    Schedule
                  </h2>

                  <div className="grid sm:grid-cols-2 gap-4 mt-5">
                    <Info
                      label="Pattern"
                      value={words(
                        hireRequest.recurring_pattern
                      )}
                    />

                    <Info
                      label="Expected period"
                      value={
                        hireRequest.recurring_duration_note ||
                        'Not specified'
                      }
                    />
                  </div>

                  {hireRequest.recurring_days?.length >
                    0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {hireRequest.recurring_days.map(
                        day => (
                          <span
                            key={day}
                            className="bg-purple-50 text-purple-800 px-3 py-2 rounded-xl text-xs font-black"
                          >
                            {words(day)}
                          </span>
                        )
                      )}
                    </div>
                  )}

                  {hireRequest.custom_schedule && (
                    <p className="text-sm text-gray-600 mt-4 whitespace-pre-wrap">
                      {
                        hireRequest.custom_schedule
                      }
                    </p>
                  )}
                </section>
              )}

              <section className="bg-white border rounded-[2rem] p-5 md:p-7">
                <p className="text-xs font-black text-purple-700 tracking-widest">
                  DUTIES & VEHICLE
                </p>

                <h2 className="text-2xl font-black mt-1">
                  What the job involves
                </h2>

                <div className="flex flex-wrap gap-2 mt-5">
                  {(hireRequest.duties ||
                    []).map(duty => (
                    <span
                      key={duty}
                      className="bg-gray-100 px-3 py-2 rounded-xl text-sm font-bold"
                    >
                      {words(duty)}
                    </span>
                  ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mt-6">
                  <Info
                    label="Vehicle"
                    value={
                      [
                        hireRequest.vehicle_make,
                        hireRequest.vehicle_model,
                        hireRequest.vehicle_year,
                      ]
                        .filter(Boolean)
                        .join(' ') ||
                      words(
                        hireRequest.vehicle_type
                      )
                    }
                  />

                  <Info
                    label="Transmission"
                    value={words(
                      hireRequest.vehicle_transmission
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
                        : 'Not specified'
                    }
                  />

                  <Info
                    label="Waiting"
                    value={
                      hireRequest.waiting_expected
                        ? hireRequest.estimated_waiting_hours
                          ? `Yes - approx. ${hireRequest.estimated_waiting_hours} hours`
                          : 'Yes'
                        : 'No'
                    }
                  />

                  <Info
                    label="Interstate travel"
                    value={
                      hireRequest.interstate_required
                        ? 'Yes'
                        : 'No'
                    }
                  />

                  <Info
                    label="Overnight stay"
                    value={
                      hireRequest.overnight_required
                        ? 'Yes'
                        : 'No'
                    }
                  />
                </div>

                {hireRequest.vehicle_notes && (
                  <TextBlock
                    title="Vehicle notes"
                    text={
                      hireRequest.vehicle_notes
                    }
                  />
                )}

                {hireRequest.luggage_notes && (
                  <TextBlock
                    title="Luggage / load"
                    text={
                      hireRequest.luggage_notes
                    }
                  />
                )}

                {hireRequest.special_requirements && (
                  <TextBlock
                    title="Additional requirements"
                    text={
                      hireRequest.special_requirements
                    }
                  />
                )}
              </section>
            </div>

            <aside className="space-y-6">

              <section className="bg-gray-950 text-white rounded-[2rem] p-6">
                <p className="text-xs font-black text-purple-300 tracking-widest">
                  DRIVER OFFERS
                </p>

                <div className="flex items-end justify-between mt-2">
                  <div>
                    <p className="text-4xl font-black">
                      {activeOffers.length}
                    </p>

                    <p className="text-sm text-gray-300">
                      quotation
                      {activeOffers.length ===
                      1
                        ? ''
                        : 's'}{' '}
                      received
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={loadRequest}
                    className="border border-white/20 px-4 py-2 rounded-xl text-sm font-black"
                  >
                    Refresh
                  </button>
                </div>

                {activeOffers.length ===
                  0 && (
                  <div className="border-t border-white/10 mt-5 pt-5">
                    <p className="font-black">
                      Looking for drivers
                    </p>

                    <p className="text-sm text-gray-400 mt-2">
                      Eligible Fountain Ride
                      drivers will be able to
                      review your job brief
                      and submit their own
                      quotation.
                    </p>
                  </div>
                )}
              </section>

              {activeOffers.map(
                offer => (
                  <OfferCard
  key={offer.id}
  offer={offer}
  negotiation={negotiations.find(
    item => item.offer_id === offer.id
  ) || null}
  currency={
    hireRequest.currency
  }
  onChat={() =>
    loadChat(offer)
  }
  onAccept={() => {
    setAcceptError('')
    setAcceptOffer(offer)
  }}
  onNegotiate={() => {
    setCounterError('')
    setCounterAmount('')
    setCounterMessage('')
    setNegotiateOffer(offer)
  }}

/>
                )
              )}

              {chatOffer && (
  <section className="bg-white border rounded-[2rem] overflow-hidden shadow-sm">
    <div className="border-b p-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-black text-purple-700 tracking-widest">
          DRIVER CHAT
        </p>

        <h3 className="font-black text-xl mt-1">
          {chatOffer.driver?.full_name ||
            'Fountain Ride Driver'}
        </h3>

        <p className="text-sm text-gray-500 mt-1">
          Current quotation:{' '}
          <b className="text-gray-950">
            {money(
              chatOffer.amount,
              hireRequest.currency
            )}
          </b>
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          setChatOffer(null)
          setChatMessages([])
          setChatText('')
          setChatError('')
        }}
        className="border rounded-xl px-3 py-2 text-sm font-black"
      >
        Close
      </button>
    </div>

    <div className="bg-purple-50 border-b px-5 py-4">
      <p className="text-xs leading-5 text-purple-900">
        Chat is for discussing the job and
        quotation. A price discussed here does
        not change the driver's formal offer.
        The driver must submit an updated
        quotation before you accept a different
        price.
      </p>
    </div>

    <div className="p-5">
      {chatLoading ? (
        <p className="text-sm text-gray-500">
          Loading conversation...
        </p>
      ) : chatMessages.length === 0 ? (
        <div className="py-7 text-center">
          <p className="font-black">
            Start the conversation
          </p>

          <p className="text-sm text-gray-500 mt-2">
            Ask the driver about the schedule,
            duties or quotation terms.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {chatMessages.map(
            message => {
              const mine =
                message.sender_role ===
                'customer'

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    mine
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      mine
                        ? 'bg-purple-700 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-[11px] font-black opacity-70 mb-1">
                      {mine
                        ? 'You'
                        : chatOffer.driver
                            ?.full_name ||
                          'Driver'}
                    </p>

                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.body}
                    </p>

                    <p className="text-[10px] mt-2 opacity-60">
                      {new Date(
                        message.created_at
                      ).toLocaleString(
                        'en-GB',
                        {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </p>
                  </div>
                </div>
              )
            }
          )}
        </div>
      )}

      {chatError && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          {chatError}
        </div>
      )}

      <div className="mt-5 border-t pt-5">
        <textarea
          value={chatText}
          onChange={event =>
            setChatText(
              event.target.value
            )
          }
          maxLength={2000}
          rows={3}
          placeholder="Message the driver..."
          className="w-full border rounded-2xl p-4 text-sm outline-none focus:border-purple-600 resize-none"
        />

        <div className="flex items-center justify-between gap-3 mt-3">
          <button
            type="button"
            onClick={() =>
              loadChat(chatOffer)
            }
            disabled={
              chatLoading ||
              chatSending
            }
            className="border rounded-xl px-4 py-3 text-sm font-black disabled:opacity-50"
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={
              sendChatMessage
            }
            disabled={
              chatSending ||
              !chatText.trim()
            }
            className="bg-purple-700 text-white rounded-xl px-5 py-3 text-sm font-black disabled:opacity-50"
          >
            {chatSending
              ? 'Sending...'
              : 'Send message'}
          </button>
        </div>
      </div>
    </div>
  </section>
)}

              <section className="bg-purple-50 border border-purple-200 rounded-[2rem] p-5">
                <p className="text-xs font-black text-purple-700 tracking-widest">
                  PAYMENT PROTECTION
                </p>

                <h3 className="font-black text-lg mt-2">
                  Keep the agreement on
                  Fountain Ride.
                </h3>

                <p className="text-sm text-gray-600 mt-2">
                  Compare quotations and
                  keep negotiation and
                  payment on the platform.
                  This creates a record of
                  what was agreed and allows
                  Fountain Ride to review
                  eligible payment,
                  cancellation and
                  non-performance disputes
                  under its applicable
                  policies.
                </p>

                <p className="text-xs text-gray-500 mt-3">
                  Do not send money directly
                  to a driver introduced
                  through this request.
                </p>
              </section>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/hire-driver'
                  )
                }
                className="w-full bg-white border px-5 py-4 rounded-2xl font-black"
              >
                + Create another request
              </button>
            </aside>
          </div>
        </div>
        {/* CUSTOMER PRICE NEGOTIATION */}
        {negotiateOffer && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Negotiate driver quotation"
              className="w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-purple-700">
                    Price negotiation
                  </p>
                  <h2 className="mt-2 text-xl font-black text-slate-900">
                    Negotiate with{' '}
                    {negotiateOffer.driver?.full_name ||
                      'your driver'}
                  </h2>
                </div>

                <button
                  type="button"
                  disabled={counterLoading}
                  onClick={() => setNegotiateOffer(null)}
                  className="rounded-xl border px-3 py-2 text-sm font-bold"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">
                    Original quotation
                  </p>
                  <p className="mt-2 text-xl font-black text-slate-900">
                    {money(negotiateOffer.amount, hireRequest.currency)}
                  </p>
                </div>

                <div className="rounded-2xl bg-purple-50 p-4">
                  <p className="text-xs font-semibold text-purple-700">
                    Latest proposed price
                  </p>
                  <p className="mt-2 text-xl font-black text-purple-900">
                    {money(
                      negotiations.find(
                        item => item.offer_id === negotiateOffer.id
                      )?.current_amount ?? negotiateOffer.amount,
                      hireRequest.currency
                    )}
                  </p>
                </div>
              </div>

              {(() => {
                const negotiation = negotiations.find(
                  item => item.offer_id === negotiateOffer.id
                )

                return (
                  <div className="mt-4 space-y-4">
                    {negotiation && (
                      <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-sm text-purple-900">
                        <p>
                          Status: <strong>{negotiation.status}</strong>
                        </p>
                        <p className="mt-1">
                          Revision: <strong>{negotiation.revision}</strong>
                        </p>
                        <p className="mt-1">
                          Last proposal by:{' '}
                          <strong>{negotiation.last_actor}</strong>
                        </p>
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="customer-counter-amount"
                        className="block text-sm font-bold text-slate-700"
                      >
                        Your proposed price (NGN)
                      </label>
                      <input
                        id="customer-counter-amount"
                        type="number"
                        min="1"
                        max="1000000000"
                        step="1"
                        value={counterAmount}
                        onChange={event =>
                          setCounterAmount(event.target.value)
                        }
                        disabled={counterLoading}
                        placeholder="Enter your proposed amount"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="customer-counter-message"
                        className="block text-sm font-bold text-slate-700"
                      >
                        Message to driver (optional)
                      </label>
                      <textarea
                        id="customer-counter-message"
                        rows={3}
                        maxLength={2000}
                        value={counterMessage}
                        onChange={event =>
                          setCounterMessage(event.target.value)
                        }
                        disabled={counterLoading}
                        placeholder="Explain your proposed price"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                      />
                    </div>

                    {counterError && (
                      <p
                        role="alert"
                        className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
                      >
                        {counterError}
                      </p>
                    )}

                    {negotiation?.status === 'open' &&
                      negotiation.last_actor === 'driver' &&
                      Number.isSafeInteger(negotiation.revision) &&
                      negotiation.revision >= 1 && (
                        <button
                          type="button"
                          onClick={acceptCustomerNegotiatedPrice}
                          disabled={counterLoading}
                          className="w-full rounded-xl bg-green-700 px-4 py-3 font-black text-white disabled:opacity-50"
                        >
                          {counterLoading
                            ? 'Processing...'
                            : `Accept Driver's Price - ${money(
                                negotiation.current_amount,
                                hireRequest.currency
                              )}`}
                        </button>
                      )}

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={counterLoading}
                        onClick={() => setNegotiateOffer(null)}
                        className="rounded-xl border px-4 py-3 font-bold"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={submitCustomerCounteroffer}
                        disabled={
                          counterLoading ||
                          !counterAmount.trim()
                        }
                        className="rounded-xl bg-purple-700 px-4 py-3 font-bold text-white disabled:opacity-50"
                      >
                        {counterLoading
                          ? 'Sending...'
                          : 'Send counteroffer'}
                      </button>
                    </div>

                    <p className="text-xs leading-5 text-slate-500">
                      A counteroffer is not a confirmed booking.
                      Payment and booking confirmation are required
                      before the driver begins the job.
                    </p>
                  </div>
                )
              })()}
            </div>
          </div>
        )}
        {acceptOffer && (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
    <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden">
      <div className="p-6 border-b">
        <p className="text-xs font-black text-purple-700 tracking-widest">
          ACCEPT QUOTATION
        </p>

        <h2 className="text-2xl font-black mt-2">
          Review before accepting
        </h2>

        <p className="text-sm text-gray-500 mt-2">
          You are selecting{' '}
          <b className="text-gray-950">
            {acceptOffer.driver?.full_name ||
              'this driver'}
          </b>{' '}
          for this Driver Hire request.
        </p>
      </div>

      <div className="p-6 max-h-[65vh] overflow-y-auto">
        <div className="bg-purple-50 rounded-2xl p-5">
          <p className="text-xs font-black text-purple-700">
            QUOTATION - VERSION{' '}
            {acceptOffer.version_number}
          </p>

          <p className="text-4xl font-black mt-2">
            {money(
              acceptOffer.amount,
              hireRequest.currency
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <Info
            label="Hours included"
            value={
              acceptOffer.included_hours !==
              null
                ? `${acceptOffer.included_hours} hours`
                : 'Not specified'
            }
          />

          <Info
            label="Overtime"
            value={
              acceptOffer.overtime_rate !==
              null
                ? `${money(
                    acceptOffer.overtime_rate,
                    hireRequest.currency
                  )} / hour`
                : 'Not specified'
            }
          />

          <Info
            label="Additional charges"
            value={money(
              acceptOffer.additional_charges,
              hireRequest.currency
            )}
          />

          <Info
            label="Driver"
            value={
              acceptOffer.driver?.full_name ||
              'Fountain Ride Driver'
            }
          />
        </div>

        {acceptOffer.fuel_terms && (
          <TextBlock
            title="Fuel terms"
            text={acceptOffer.fuel_terms}
          />
        )}

        {acceptOffer.toll_parking_terms && (
          <TextBlock
            title="Toll / parking terms"
            text={
              acceptOffer.toll_parking_terms
            }
          />
        )}

        {acceptOffer.accommodation_terms && (
          <TextBlock
            title="Accommodation terms"
            text={
              acceptOffer.accommodation_terms
            }
          />
        )}

        {acceptOffer.offer_conditions && (
          <TextBlock
            title="Conditions"
            text={
              acceptOffer.offer_conditions
            }
          />
        )}

        <div className="mt-5 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="font-black text-sm">
            What happens next?
          </p>

          <p className="text-sm text-gray-700 mt-2">
            Accepting this quotation selects
            this driver and records the exact
            quotation as your agreement.
            Other quotations will be closed.
            You will then proceed to payment
            before the booking is confirmed.
          </p>
        </div>

        {acceptOffer && negotiations.some(
          item => item.offer_id === acceptOffer.id && item.status === "open"
        ) && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            An open negotiation exists for this quotation. The original price cannot be accepted.
          </div>
        )}

        {acceptError && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
            {acceptError}
          </div>
        )}
      </div>

      <div className="p-5 border-t grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={acceptingOffer}
          onClick={() => {
            setAcceptOffer(null)
            setAcceptError('')
          }}
          className="border rounded-xl py-3 font-black disabled:opacity-50"
        >
          Go back
        </button>

        <button
          type="button"
          disabled={acceptingOffer || negotiations.some(
            item => item.offer_id === acceptOffer.id && item.status === "open"
          )}
          onClick={confirmAcceptOffer}
          className="bg-purple-700 text-white rounded-xl py-3 font-black disabled:opacity-50"
        >
          {acceptingOffer
            ? 'Accepting...'
            : 'Confirm & Accept Quotation'}
        </button>
      </div>
    </div>
  </div>
)}
      </main>
    </>
  )
}

function StatusCard({
  status,
  offerCount,
}: {
  status: string
  offerCount: number
}) {
  let title = words(status)
  let description =
    'Your Driver Hire request is active.'

  if (
    status === 'requested' &&
    offerCount === 0
  ) {
    title = 'Looking for drivers'
    description =
      'Your request is waiting for eligible drivers to quote.'
  }

  if (
    status === 'requested' &&
    offerCount > 0
  ) {
    title = 'Offers received'
    description =
      'Compare the quotations before choosing a driver.'
  }

  if (status === 'negotiating') {
    title = 'Negotiating'
    description =
      'You are discussing quotation terms with drivers.'
  }

  if (
    status === 'fare_agreed' ||
    status === 'awaiting_payment'
  ) {
    title = 'Offer accepted'
    description =
      'Complete payment to confirm the booking.'
  }

  if (status === 'confirmed') {
    title = 'Booking confirmed'
    description =
      'Your Driver Hire booking is confirmed.'
  }

  return (
    <div className="bg-white border rounded-2xl px-5 py-4 min-w-[260px]">
      <p className="text-xs font-black text-gray-400 tracking-widest">
        STATUS
      </p>

      <p className="font-black text-lg mt-1">
        {title}
      </p>

      <p className="text-xs text-gray-500 mt-1">
        {description}
      </p>
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
        {value || 'Not specified'}
      </p>
    </div>
  )
}

function TextBlock({
  title,
  text,
}: {
  title: string
  text: string
}) {
  return (
    <div className="mt-5 border-t pt-5">
      <p className="text-xs font-black text-gray-500">
        {title}
      </p>

      <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
        {text}
      </p>
    </div>
  )
}

function OfferCard({
  offer,
  negotiation,
  currency,
  onChat,
  onAccept,
  onNegotiate,
}: {
  offer: Offer
  negotiation: NegotiationState | null
  currency: string
  onChat: () => void
  onAccept: () => void
  onNegotiate: () => void
}) {
  const unreadCount =
    Number(offer.unread_message_count || 0)

  const hasUnread =
    unreadCount > 0

  const negotiationOpen = negotiation?.status === 'open'

  return (
    <section
      className={`bg-white rounded-[2rem] p-5 shadow-sm border ${
        hasUnread
          ? 'border-purple-500 ring-2 ring-purple-100'
          : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-purple-700 tracking-widest">
            DRIVER OFFER
          </p>

          <h3 className="font-black text-xl mt-1">
            {offer.driver?.full_name ||
              'Fountain Ride Driver'}
          </h3>

          <p className="text-xs text-gray-500 mt-1">
            {[
              offer.driver?.city,
              offer.driver?.state,
            ]
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>

        <span className="bg-purple-50 text-purple-800 px-3 py-2 rounded-xl text-xs font-black">
          {words(offer.status)}
        </span>
      </div>

      {hasUnread && (
        <div className="mt-5 rounded-2xl border border-purple-200 bg-purple-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-black text-purple-900 text-sm">
              New message from{' '}
              {offer.driver?.full_name ||
                'driver'}
            </p>

            <span className="shrink-0 bg-purple-700 text-white text-xs font-black px-3 py-1.5 rounded-full">
              {unreadCount}{' '}
              unread
            </span>
          </div>

          {offer.latest_driver_message?.body && (
            <p className="text-sm text-purple-900/80 mt-2 line-clamp-2">
              &ldquo;
              {
                offer.latest_driver_message
                  .body
              }
              &rdquo;
            </p>
          )}
        </div>
      )}

      <p className="text-3xl font-black mt-5">
        {money(
          offer.amount,
          currency
        )}
      </p>

      {negotiation && (
        <div className="mt-4 rounded-2xl border border-purple-200 bg-purple-50 p-4">
          <p className="text-xs font-black text-purple-700">
            NEGOTIATION STATUS
          </p>

          <p className="text-sm text-gray-600 mt-2">
            Latest proposed amount
          </p>

          <p className="text-2xl font-black text-gray-950 mt-1">
            {money(negotiation.current_amount, currency)}
          </p>

          <p className="text-sm font-bold text-purple-800 mt-2">
            {negotiation.status === 'open'
              ? negotiation.last_actor === 'customer'
                ? "Awaiting driver's response"
                : "Awaiting your response"
              : words(negotiation.status)}
          </p>

          <p className="text-xs text-gray-500 mt-2">
            Revision {negotiation.revision}
          </p>

          {negotiationOpen && (
            <p className="text-xs text-gray-600 mt-3">
              The original quotation cannot be accepted
              while this negotiation is open.
            </p>
          )}
        </div>
      )}
      {offer.included_hours !== null && (
        <p className="text-sm text-gray-500 mt-1">
          Includes{' '}
          {offer.included_hours} hours
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mt-5">
        <Info
          label="Overtime"
          value={
            offer.overtime_rate !== null
              ? `${money(
                  offer.overtime_rate,
                  currency
                )} / hour`
              : 'Not specified'
          }
        />

        <Info
          label="Extra charges"
          value={money(
            offer.additional_charges,
            currency
          )}
        />
      </div>

      {offer.message && (
        <p className="text-sm text-gray-700 mt-4 bg-gray-50 rounded-2xl p-4">
          {offer.message}
        </p>
      )}

      {offer.offer_conditions && (
        <div className="mt-4">
          <p className="text-xs font-black text-gray-500">
            CONDITIONS
          </p>

          <p className="text-sm mt-1">
            {offer.offer_conditions}
          </p>
        </div>
      )}

      {offer.driver && (
        <div className="border-t mt-5 pt-4 text-sm">
          <p>
            <b>Experience:</b>{' '}
            {offer.driver
              .driving_experience_years ??
              'Not specified'}{' '}
            years
          </p>

          <p className="mt-1">
            <b>Transmission:</b>{' '}
            {[
              offer.driver
                .drives_automatic
                ? 'Automatic'
                : null,

              offer.driver
                .drives_manual
                ? 'Manual'
                : null,
            ]
              .filter(Boolean)
              .join(' + ') ||
              'Not specified'}
          </p>
        </div>
      )}

      {offer.status === 'accepted' ? (
  <>
    <div className="mt-5 bg-green-50 border border-green-200 rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-green-600 text-white text-sm font-black">
          &#10003;
        </span>

        <div>
          <p className="font-black text-green-900">
            Quotation Accepted
          </p>

          <p className="text-xs text-green-800 mt-1">
            This is your selected driver and
            agreed quotation.
          </p>
        </div>
      </div>
    </div>

    <button
      type="button"
      onClick={onChat}
      className={`w-full mt-3 rounded-xl py-3 font-black text-sm ${
        hasUnread
          ? 'bg-purple-100 border border-purple-300 text-purple-900'
          : 'border border-purple-200 text-purple-800 hover:bg-purple-50'
      }`}
    >
      {hasUnread
        ? `Chat with Driver (${unreadCount})`
        : 'Chat with Driver'}
    </button>

    <p className="text-[11px] text-gray-400 mt-3">
      This quotation has been accepted.
      Payment is required before the Driver
      Hire booking is confirmed.
    </p>
  </>
) : (
  <>
    <div className="grid grid-cols-2 gap-3 mt-5">
      <button
        type="button"
        onClick={onChat}
        className={`rounded-xl py-3 font-black text-sm ${
          hasUnread
            ? 'bg-purple-100 border border-purple-300 text-purple-900'
            : 'border border-purple-200 text-purple-800 hover:bg-purple-50'
        }`}
      >
        {hasUnread
          ? `Chat (${unreadCount})`
          : 'Chat'}
      </button>

      <button
        type="button"
        onClick={onAccept}
        disabled={negotiationOpen}
        className="bg-purple-700 text-white rounded-xl py-3 font-black text-sm hover:bg-purple-800"
      >
        Accept Offer
      </button>

      {(!negotiation ||
        (negotiation.status === 'open' &&
          negotiation.last_actor === 'driver')) && (
        <button
          type="button"
          onClick={onNegotiate}
          className="mt-3 w-full rounded-xl border border-purple-300 bg-purple-50 px-4 py-3 text-sm font-black text-purple-800 hover:bg-purple-100"
        >
          {negotiation?.status === 'open'
            ? 'Respond to Driver Counteroffer'
            : 'Negotiate Price'}
        </button>
      )}

    </div>

    <p className="text-[11px] text-gray-400 mt-3">
      Review the quotation carefully before
      accepting. Payment is required after
      acceptance to confirm the booking.
    </p>
  </>
)}
    </section>
  )
}
