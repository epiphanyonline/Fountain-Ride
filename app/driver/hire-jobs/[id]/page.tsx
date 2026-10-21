'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Job = {
  id: string
  booking_ref: string
  status: string
  driver_need_type?: string | null
  job_type?: string | null
  public_work_area?: string | null
  pickup_city?: string | null
  pickup_state?: string | null
  destination_pattern?: string | null
  destination_city?: string | null
  destination_state?: string | null
  start_date?: string | null
  start_time?: string | null
  end_date?: string | null
  end_time?: string | null
  duration_hours?: number | null
  finish_time_uncertain?: boolean | null
  estimated_min_hours?: number | null
  estimated_max_hours?: number | null
  service_frequency?: string | null
  recurring_pattern?: string | null
  recurring_days?: string[] | null
  custom_schedule?: string | null
  recurring_end_date?: string | null
  recurring_duration_note?: string | null
  duties?: string[] | null
  vehicle_type?: string | null
  vehicle_make?: string | null
  vehicle_model?: string | null
  vehicle_year?: number | null
  vehicle_transmission?: string | null
  vehicle_notes?: string | null
  passenger_count?: number | null
  interstate_required?: boolean | null
  overnight_required?: boolean | null
  accommodation_arrangement?: string | null
  waiting_expected?: boolean | null
  estimated_waiting_hours?: number | null
  luggage_notes?: string | null
    matches_interest?: boolean

  selected_driver_application_id?: string | null
  accepted_offer_id?: string | null
  agreed_fare?: number | null

  driver_arrived_at?: string | null
  job_start_pin_used_at?: string | null
  job_started_at?: string | null
  driver_finished_at?: string | null
  customer_confirmed_at?: string | null

  lifecycle?: {
    is_open_marketplace_job: boolean
    is_assigned_to_me: boolean
    can_submit_quotation: boolean
    can_record_arrival: boolean
    can_enter_start_pin: boolean
    can_finish_job: boolean
    awaiting_customer_confirmation: boolean
    is_completed: boolean
  }

  my_offer?: Offer | null
  my_negotiation?: Negotiation | null
}

type Negotiation = {
  id: string
  service_type: string
  request_id: string
  offer_id: string
  current_amount: number
  last_actor: 'customer' | 'driver' | 'owner' | 'admin'
  status: 'open' | 'accepted' | 'declined' | 'closed'
  revision: number
  created_at: string
  updated_at: string
}
type Offer = {
  id: string
  amount: number
  base_amount?: number | null
  included_hours?: number | null
  overtime_rate?: number | null
  additional_charges?: number | null
  additional_charges_note?: string | null
  fuel_terms?: string | null
  toll_parking_terms?: string | null
  accommodation_terms?: string | null
  offer_conditions?: string | null
  message?: string | null
  status: string
  version_number: number
  is_current: boolean
}

type ChatMessage = {
  id: string
  driver_hire_request_id: string
  driver_application_id: string
  sender_role: 'customer' | 'driver'
  body: string
  created_at: string
}

function label(value?: string | null) {
  if (!value) return 'Not specified'

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function money(value?: number | null) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return 'â€”'
  }

  return `â‚¦${Number(value).toLocaleString('en-NG')}`
}

function formatDate(value?: string | null) {
  if (!value) return 'Not specified'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function shortTime(value?: string | null) {
  if (!value) return 'Not specified'
  return value.slice(0, 5)
}

function Info({
  title,
  value,
}: {
  title: string
  value: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>

      <div className="mt-1 text-sm font-medium text-slate-900">
        {value || 'Not specified'}
      </div>
    </div>
  )
}

export default function DriverHireJobPage() {
  const params = useParams()
  const router = useRouter()

  const id = String(params?.id || '')

  const [job, setJob] =
    useState<Job | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

    const [submitting, setSubmitting] =
    useState(false)

  const [jobActionLoading, setJobActionLoading] =
    useState(false)
  const [negotiationLoading, setNegotiationLoading] =
    useState(false)

  const [negotiationAmount, setNegotiationAmount] =
    useState('')

  const [negotiationMessage, setNegotiationMessage] =
    useState('')

  const [negotiationError, setNegotiationError] =
    useState('')

  const [jobStartPin, setJobStartPin] =
    useState('')

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

  const [baseAmount, setBaseAmount] =
    useState('')

  const [includedHours, setIncludedHours] =
    useState('')

  const [overtimeRate, setOvertimeRate] =
    useState('')

  const [
    additionalCharges,
    setAdditionalCharges,
  ] = useState('0')

  const [
    additionalChargesNote,
    setAdditionalChargesNote,
  ] = useState('')

  const [fuelTerms, setFuelTerms] =
    useState('')

  const [
    tollParkingTerms,
    setTollParkingTerms,
  ] = useState('')

  const [
    accommodationTerms,
    setAccommodationTerms,
  ] = useState('')

  const [
    offerConditions,
    setOfferConditions,
  ] = useState('')

  const [message, setMessage] =
    useState('')

  const [
    marketplaceTermsAccepted,
    setMarketplaceTermsAccepted,
  ] = useState(false)

  // ---------------------------------------------------------
  // Driver authentication headers
  //
  // Uses the same localStorage values as the existing
  // driver dashboard.
  // ---------------------------------------------------------

  function authHeaders() {
    const token =
      localStorage.getItem(
        'fountain_driver_token'
      ) || ''

    const applicationId =
      localStorage.getItem(
        'fountain_driver_application_id'
      ) || ''

    return {
      'x-driver-token': token,
      'x-driver-application-id':
        applicationId,
    }
  }

  async function loadChat() {
    if (!id) return

    setChatLoading(true)
    setChatError('')

    try {
      const response = await fetch(
        `/api/marketplace/driver/hire-jobs/${id}/messages`,
        {
          headers: authHeaders(),
          cache: 'no-store',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to load customer messages.'
        )
      }

      setChatMessages(data.messages || [])
    } catch (err: any) {
      setChatError(
        err?.message ||
          'Unable to load customer messages.'
      )
    } finally {
      setChatLoading(false)
    }
  }

  async function sendChatMessage() {
    if (!chatText.trim() || chatSending) {
      return
    }

    setChatSending(true)
    setChatError('')

    try {
      const response = await fetch(
        `/api/marketplace/driver/hire-jobs/${id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
          },
          body: JSON.stringify({
            message: chatText.trim(),
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error || 'Unable to send message.'
        )
      }

      setChatText('')
      await loadChat()
    } catch (err: any) {
      setChatError(
        err?.message || 'Unable to send message.'
      )
    } finally {
      setChatSending(false)
    }
  }

  async function submitNegotiationAction(
    action: 'accept' | 'counter' | 'decline'
  ) {
    if (negotiationLoading || !job || !id) return

    const negotiation = job.my_negotiation
    const offer = job.my_offer

    if (
      !negotiation ||
      !offer ||
      negotiation.offer_id !== offer.id ||
      negotiation.status !== 'open' ||
      negotiation.last_actor !== 'customer'
    ) {
      setNegotiationError(
        'There is no customer counteroffer awaiting your response.'
      )
      return
    }

    const amount =
      action === 'counter'
        ? Number(negotiationAmount.trim())
        : undefined

    if (
      action === 'counter' &&
      (
        !negotiationAmount.trim() ||
        !Number.isSafeInteger(amount) ||
        amount! <= 0 ||
        amount! > 1000000000
      )
    ) {
      setNegotiationError(
        'Enter a valid whole-naira counteroffer amount.'
      )
      return
    }

    if (negotiationMessage.length > 2000) {
      setNegotiationError(
        'Your message must not exceed 2,000 characters.'
      )
      return
    }

    const description =
      action === 'accept'
        ? `Accept the customer's price of ${money(negotiation.current_amount)}? This creates a binding booking agreement.`
        : action === 'counter'
          ? `Send your counteroffer of ${money(amount!)} to the customer?`
          : 'Decline the customer counteroffer?'

    if (!window.confirm(description)) return

    setNegotiationLoading(true)
    setNegotiationError('')
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `/api/marketplace/driver/hire-jobs/${id}/negotiation`,
        {
          method: 'POST',
          headers: {
            ...authHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            offerId: offer.id,
            action,
            expectedRevision: negotiation.revision,
            ...(action === 'counter' ? { amount } : {}),
            ...(negotiationMessage.trim()
              ? { message: negotiationMessage.trim() }
              : {}),
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || data?.success !== true) {
        throw new Error(
          data?.error ||
          'Unable to complete the negotiation action.'
        )
      }

      setNegotiationAmount('')
      setNegotiationMessage('')

      await loadJob()

      setSuccess(
        action === 'accept'
          ? 'Customer counteroffer accepted. The booking agreement has been created.'
          : action === 'counter'
            ? 'Your counteroffer has been sent to the customer.'
            : 'The customer counteroffer has been declined.'
      )
    } catch (err: unknown) {
      setNegotiationError(
        err instanceof Error
          ? err.message
          : 'Unable to complete the negotiation action.'
      )
    } finally {
      setNegotiationLoading(false)
    }
  }
  async function loadJob() {
    if (!id) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `/api/marketplace/driver/hire-jobs/${id}`,
        {
          headers: authHeaders(),
          cache: 'no-store',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to load this Driver Hire job.'
        )
      }

      const loadedJob: Job = data.job

      setJob(loadedJob)

      const offer =
        loadedJob.my_offer

      if (offer) {
        setBaseAmount(
          offer.base_amount !== null &&
            offer.base_amount !== undefined
            ? String(offer.base_amount)
            : ''
        )

        setIncludedHours(
          offer.included_hours !== null &&
            offer.included_hours !== undefined
            ? String(offer.included_hours)
            : ''
        )

        setOvertimeRate(
          offer.overtime_rate !== null &&
            offer.overtime_rate !== undefined
            ? String(offer.overtime_rate)
            : ''
        )

        setAdditionalCharges(
          String(
            offer.additional_charges || 0
          )
        )

        setAdditionalChargesNote(
          offer.additional_charges_note || ''
        )

        setFuelTerms(
          offer.fuel_terms || ''
        )

        setTollParkingTerms(
          offer.toll_parking_terms || ''
        )

        setAccommodationTerms(
          offer.accommodation_terms || ''
        )

        setOfferConditions(
          offer.offer_conditions || ''
        )

        setMessage(
          offer.message || ''
        )

        /*
         * Require a fresh acknowledgement when
         * submitting a revised quotation.
         */
        setMarketplaceTermsAccepted(false)
      }
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to load this Driver Hire job.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadJob()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const totalAmount = useMemo(() => {
    const base =
      Number(baseAmount) || 0

    const extras =
      Number(additionalCharges) || 0

    return base + extras
  }, [
    baseAmount,
    additionalCharges,
  ])

  async function submitQuotation(
    e: React.FormEvent
  ) {
    e.preventDefault()

    setError('')
    setSuccess('')

    if (
      !baseAmount ||
      Number(baseAmount) <= 0
    ) {
      setError(
        'Enter your base quotation amount.'
      )
      return
    }

    if (
      Number(additionalCharges || 0) > 0 &&
      !additionalChargesNote.trim()
    ) {
      setError(
        'Explain what your additional charges cover.'
      )
      return
    }

    if (!marketplaceTermsAccepted) {
      setError(
        'Please accept the Driver Hire Marketplace Agreement.'
      )
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(
        `/api/marketplace/driver/hire-jobs/${id}/offer`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            ...authHeaders(),
          },

          body: JSON.stringify({
            baseAmount,
            includedHours,
            overtimeRate,
            additionalCharges,
            additionalChargesNote,
            fuelTerms,
            tollParkingTerms,
            accommodationTerms,
            offerConditions,
            message,
            marketplaceTermsAccepted,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to submit your quotation.'
        )
      }

      setSuccess(
        data?.message ||
          'Your quotation has been submitted.'
      )

      setMarketplaceTermsAccepted(false)

      await loadJob()

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to submit your quotation.'
      )
    } finally {
      setSubmitting(false)
    }
  }

   async function recordArrival() {
    if (!id || jobActionLoading) return

    setJobActionLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `/api/marketplace/driver/hire-jobs/${id}/arrive`,
        {
          method: 'POST',
          headers: authHeaders(),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to record your arrival.'
        )
      }

      setSuccess(
        'Arrival recorded. Ask the customer for the 4-digit Job Start PIN when they are ready for the job to begin.'
      )

      await loadJob()
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to record your arrival.'
      )
    } finally {
      setJobActionLoading(false)
    }
  }

  async function startJob() {
    if (!id || jobActionLoading) return

    const cleanPin = jobStartPin.trim()

    if (!/^\d{4}$/.test(cleanPin)) {
      setError(
        'Enter the 4-digit Job Start PIN provided by the customer.'
      )
      return
    }

    setJobActionLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `/api/marketplace/driver/hire-jobs/${id}/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
          },
          body: JSON.stringify({
            pin: cleanPin,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to start this job.'
        )
      }

      setJobStartPin('')

      setSuccess(
        'Job started successfully. Fountain Ride has recorded the verified start.'
      )

      await loadJob()
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to start this job.'
      )
    } finally {
      setJobActionLoading(false)
    }
  }

  async function finishJob() {
    if (!id || jobActionLoading) return

    setJobActionLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `/api/marketplace/driver/hire-jobs/${id}/finish`,
        {
          method: 'POST',
          headers: authHeaders(),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to finish this job.'
        )
      }

      setSuccess(
        'Job marked as finished. The customer now needs to confirm completion before your protected earning becomes available.'
      )

      await loadJob()
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to finish this job.'
      )
    } finally {
      setJobActionLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <p className="text-slate-600">
              Loading Driver Hire job...
            </p>
          </div>
        </div>
      </main>
    )
  }

  if (!job) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <button
            type="button"
            onClick={() =>
              router.push('/driver')
            }
            className="mb-5 text-sm font-semibold text-purple-700"
          >
            â† Back to Driver Centre
          </button>

          <div className="rounded-3xl border border-red-200 bg-white p-8">
            <h1 className="text-xl font-bold text-slate-900">
              Unable to open job
            </h1>

            <p className="mt-2 text-sm text-red-700">
              {error ||
                'This Driver Hire job could not be loaded.'}
            </p>
          </div>
        </div>
      </main>
    )
  }

  const existingOffer =
    job.my_offer || null

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <button
          type="button"
          onClick={() =>
            router.push('/driver')
          }
          className="mb-5 text-sm font-semibold text-purple-700"
        >
          â† Back to Driver Centre
        </button>

        {success && (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        {/* HEADER */}

        <section className="rounded-3xl bg-purple-700 p-6 text-white shadow-sm sm:p-8">
          <div className="text-xs font-bold uppercase tracking-widest text-purple-200">
            Driver Hire Marketplace
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold sm:text-3xl">
              {label(
                job.driver_need_type
              )}
            </h1>

            {job.matches_interest && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                Matches your interests
              </span>
            )}
          </div>

          <div className="mt-2 text-sm text-purple-100">
            {job.booking_ref} Â·{' '}
            {label(job.job_type)}
          </div>

          <div className="mt-5 rounded-2xl bg-white/10 p-4">
            <div className="text-xs uppercase tracking-wide text-purple-200">
              Work area
            </div>

            <div className="mt-1 text-lg font-semibold">
              {job.public_work_area ||
                job.pickup_city ||
                'Not specified'}
            </div>
          </div>
        </section>

        {/* JOB DETAILS */}

        <section className="mt-6">
          <h2 className="text-xl font-bold text-slate-900">
            Job details
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Review the work requirements
            before sending your quotation.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info
              title="Start"
              value={`${formatDate(
                job.start_date
              )} Â· ${shortTime(
                job.start_time
              )}`}
            />

            <Info
              title="Expected finish"
              value={
                job.finish_time_uncertain
                  ? job.estimated_min_hours ||
                    job.estimated_max_hours
                    ? `${
                        job.estimated_min_hours ||
                        '?'
                      }â€“${
                        job.estimated_max_hours ||
                        '?'
                      } hours estimated`
                    : 'Not confirmed'
                  : `${
                      job.end_date
                        ? formatDate(
                            job.end_date
                          )
                        : 'Same/next day'
                    } Â· ${shortTime(
                      job.end_time
                    )}`
              }
            />

            <Info
              title="Arrangement"
              value={label(
                job.service_frequency
              )}
            />

            <Info
              title="Work pattern"
              value={label(
                job.destination_pattern
              )}
            />

            {job.destination_city && (
              <Info
                title="Destination area"
                value={[
                  job.destination_city,
                  job.destination_state,
                ]
                  .filter(Boolean)
                  .join(', ')}
              />
            )}

            {job.recurring_pattern && (
              <Info
                title="Recurring schedule"
                value={label(
                  job.recurring_pattern
                )}
              />
            )}
          </div>

          {Array.isArray(
            job.recurring_days
          ) &&
            job.recurring_days.length >
              0 && (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Recurring days
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {job.recurring_days.map(
                    (day) => (
                      <span
                        key={day}
                        className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
                      >
                        {label(day)}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
        </section>

        {/* VEHICLE */}

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">
            Vehicle & duties
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info
              title="Vehicle"
              value={[
                job.vehicle_make,
                job.vehicle_model,
                job.vehicle_year,
                job.vehicle_type
                  ? label(
                      job.vehicle_type
                    )
                  : null,
              ]
                .filter(Boolean)
                .join(' Â· ')}
            />

            <Info
              title="Transmission"
              value={label(
                job.vehicle_transmission
              )}
            />

            <Info
              title="Passengers"
              value={
                job.passenger_count
                  ? String(
                      job.passenger_count
                    )
                  : 'Not specified'
              }
            />

            <Info
              title="Waiting"
              value={
                job.waiting_expected
                  ? job.estimated_waiting_hours
                    ? `Yes Â· approx. ${job.estimated_waiting_hours} hours`
                    : 'Yes'
                  : 'No'
              }
            />
          </div>

          {Array.isArray(job.duties) &&
            job.duties.length > 0 && (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Duties
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {job.duties.map(
                    (duty) => (
                      <span
                        key={duty}
                        className="rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700"
                      >
                        {label(duty)}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

          <div className="mt-3 flex flex-wrap gap-2">
            {job.interstate_required && (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium">
                Interstate travel
              </span>
            )}

            {job.overnight_required && (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium">
                Overnight
              </span>
            )}

            {job.waiting_expected && (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium">
                Waiting required
              </span>
            )}
          </div>
        </section>

            {/* ACTIVE JOB LIFECYCLE */}

        {job.lifecycle?.is_assigned_to_me &&
          !job.lifecycle.is_open_marketplace_job && (
            <section className="mt-8 overflow-hidden rounded-3xl border border-purple-200 bg-white shadow-sm">
              <div className="bg-purple-700 p-5 text-white sm:p-6">
                <div className="text-xs font-bold uppercase tracking-widest text-purple-200">
                  Your Driver Hire Booking
                </div>

                <h2 className="mt-2 text-2xl font-bold">
                  {job.lifecycle.is_completed
                    ? 'Job Completed'
                    : job.lifecycle.awaiting_customer_confirmation
                      ? 'Waiting for Customer Confirmation'
                      : job.lifecycle.can_finish_job
                        ? 'Job In Progress'
                        : job.lifecycle.can_enter_start_pin
                          ? 'Start Job'
                          : job.lifecycle.can_record_arrival
                            ? 'Ready for the Job'
                            : job.status === 'awaiting_payment'
                              ? 'Waiting for Customer Payment'
                              : label(job.status)}
                </h2>

                {job.agreed_fare !== null &&
                  job.agreed_fare !== undefined && (
                    <p className="mt-2 text-sm text-purple-100">
                      Agreed fare Â· {money(job.agreed_fare)}
                    </p>
                  )}
              </div>

              <div className="p-5 sm:p-6">
                {job.status === 'awaiting_payment' && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="font-bold text-amber-900">
                      Payment not yet confirmed
                    </div>

                    <p className="mt-2 text-sm leading-6 text-amber-800">
                      The customer accepted your quotation.
                      Wait until Fountain Ride confirms payment
                      before beginning the job.
                    </p>
                  </div>
                )}

                {job.lifecycle.can_record_arrival && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Have you arrived?
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Only tap this after you have arrived at the
                      agreed location. The customer will then give
                      you their 4-digit Job Start PIN when they are
                      ready for the job to begin.
                    </p>

                    <button
                      type="button"
                      onClick={recordArrival}
                      disabled={jobActionLoading}
                      className="mt-5 w-full rounded-2xl bg-purple-700 px-5 py-4 text-base font-bold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {jobActionLoading
                        ? 'Recording arrival...'
                        : "I've Arrived"}
                    </button>
                  </div>
                )}

                {job.lifecycle.can_enter_start_pin && (
                  <div>
                    <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                      <div className="font-bold text-green-900">
                        Arrival recorded
                      </div>

                      <p className="mt-1 text-sm leading-6 text-green-800">
                        Ask the customer for their Job Start PIN
                        only when they are ready for the job to
                        begin.
                      </p>
                    </div>

                    <div className="mt-6">
                      <label className="block">
                        <span className="text-sm font-bold text-slate-900">
                          4-digit Job Start PIN
                        </span>

                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={4}
                          value={jobStartPin}
                          onChange={(e) =>
                            setJobStartPin(
                              e.target.value
                                .replace(/\D/g, '')
                                .slice(0, 4)
                            )
                          }
                          placeholder="â€¢â€¢â€¢â€¢"
                          className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-4 text-center text-3xl font-bold tracking-[0.5em] outline-none focus:border-purple-600"
                        />
                      </label>

                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        The PIN is provided by the customer.
                        Fountain Ride does not display the
                        customer's PIN to drivers.
                      </p>

                      <button
                        type="button"
                        onClick={startJob}
                        disabled={
                          jobActionLoading ||
                          jobStartPin.length !== 4
                        }
                        className="mt-5 w-full rounded-2xl bg-purple-700 px-5 py-4 text-base font-bold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {jobActionLoading
                          ? 'Verifying PIN...'
                          : 'Verify PIN & Start Job'}
                      </button>
                    </div>
                  </div>
                )}

                {job.lifecycle.can_finish_job && (
                  <div>
                    <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                      <div className="font-bold text-green-900">
                        Job started
                      </div>

                      <p className="mt-2 text-sm leading-6 text-green-800">
                        The customer's Job Start PIN was verified
                        and Fountain Ride has recorded the start
                        of this job.
                      </p>
                    </div>

                    <div className="mt-6 rounded-2xl border border-slate-200 p-5">
                      <h3 className="font-bold text-slate-900">
                        Finished the job?
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Only mark the job finished after you have
                        completed the agreed Driver Hire service.
                        The customer will then be asked to confirm
                        completion.
                      </p>

                      <button
                        type="button"
                        onClick={finishJob}
                        disabled={jobActionLoading}
                        className="mt-5 w-full rounded-2xl bg-slate-900 px-5 py-4 text-base font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {jobActionLoading
                          ? 'Finishing job...'
                          : 'Finish Job'}
                      </button>
                    </div>
                  </div>
                )}

                {job.lifecycle
                  .awaiting_customer_confirmation && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="font-bold text-amber-900">
                      Waiting for customer confirmation
                    </div>

                    <p className="mt-2 text-sm leading-6 text-amber-800">
                      You have marked the job as finished.
                      Your protected earning remains pending until
                      the customer confirms that the job was
                      completed.
                    </p>
                  </div>
                )}

                {job.lifecycle.is_completed && (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                    <div className="text-lg font-bold text-green-900">
                      âœ“ Job completed
                    </div>

                    <p className="mt-2 text-sm leading-6 text-green-800">
                      The customer confirmed completion. Your
                      earning for this booking is now available
                      under the Fountain Ride payout process.
                    </p>

                    {job.customer_confirmed_at && (
                      <p className="mt-3 text-xs text-green-700">
                        Confirmed{' '}
                        {new Date(
                          job.customer_confirmed_at
                        ).toLocaleString('en-GB')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

        {/* DRIVER HIRE NEGOTIATION */}
        {existingOffer && job.my_negotiation && (
          <section className="mt-8 rounded-3xl border border-purple-300 bg-white p-6 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-widest text-purple-700">
              Price negotiation
            </div>

            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Customer and driver negotiation
            </h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  Original quotation
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {money(existingOffer.amount)}
                </p>
              </div>

              <div className="rounded-2xl bg-purple-50 p-4">
                <p className="text-xs font-semibold text-purple-700">
                  Latest negotiated amount
                </p>
                <p className="mt-2 text-2xl font-bold text-purple-900">
                  {money(job.my_negotiation.current_amount)}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 p-4">
              <p className="text-sm text-slate-700">
                Status: <strong>{label(job.my_negotiation.status)}</strong>
              </p>

              <p className="mt-2 text-sm text-slate-700">
                Revision: <strong>{job.my_negotiation.revision}</strong>
              </p>

              {job.my_negotiation.status === 'open' && (
                <p className="mt-3 text-sm font-semibold text-purple-800">
                  {job.my_negotiation.last_actor === 'customer'
                    ? 'Customer has proposed a price. Your response is required.'
                    : 'Your counteroffer has been sent. Awaiting customer response.'}
                </p>
              )}
            </div>

            {job.my_negotiation.status === 'open' &&
              job.my_negotiation.last_actor === 'customer' &&
              job.my_negotiation.offer_id === existingOffer.id && (
                <div className="mt-5 space-y-4 rounded-2xl border border-purple-200 bg-purple-50 p-4">
                  <h3 className="text-base font-bold text-slate-900">
                    Respond to customer's offer
                  </h3>

                  <p className="text-sm text-slate-700">
                    Customer's proposed amount:{' '}
                    <strong>
                      {money(job.my_negotiation.current_amount)}
                    </strong>
                  </p>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Your counteroffer (NGN)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000000000"
                      step="1"
                      value={negotiationAmount}
                      onChange={(event) =>
                        setNegotiationAmount(event.target.value)
                      }
                      disabled={negotiationLoading}
                      placeholder="Enter your proposed amount"
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Message (optional)
                    </label>
                    <textarea
                      value={negotiationMessage}
                      onChange={(event) =>
                        setNegotiationMessage(event.target.value)
                      }
                      disabled={negotiationLoading}
                      maxLength={2000}
                      rows={3}
                      placeholder="Explain your proposed price"
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                    />
                  </div>

                  {negotiationError && (
                    <p role="alert" className="text-sm font-semibold text-red-700">
                      {negotiationError}
                    </p>
                  )}

                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      disabled={negotiationLoading}
                      onClick={() => submitNegotiationAction('accept')}
                      className="rounded-xl bg-green-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {negotiationLoading
                        ? 'Processing...'
                        : 'Accept price'}
                    </button>

                    <button
                      type="button"
                      disabled={negotiationLoading}
                      onClick={() => submitNegotiationAction('counter')}
                      className="rounded-xl bg-purple-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                      Send counteroffer
                    </button>

                    <button
                      type="button"
                      disabled={negotiationLoading}
                      onClick={() => submitNegotiationAction('decline')}
                      className="rounded-xl border border-red-300 bg-white px-4 py-3 text-sm font-bold text-red-700 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>

                  <p className="text-xs text-slate-600">
                    Accepting creates a booking agreement awaiting payment.
                    Do not begin the job until payment and booking confirmation.
                  </p>
                </div>
              )}
            <p className="mt-4 text-xs leading-5 text-slate-500">
              This is the formal negotiation record. The original quotation
              remains unchanged until an agreement is accepted.
            </p>
          </section>
        )}
        {/* EXISTING OFFER */}

        {/* EXISTING OFFER */}

        {existingOffer && (
          <section className="mt-8 rounded-3xl border border-purple-200 bg-purple-50 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-purple-700">
                  Your current quotation
                </div>

                <div className="mt-1 text-3xl font-bold text-slate-900">
                  {money(
                    existingOffer.amount
                  )}
                </div>
              </div>

              <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-purple-700">
                Version{' '}
                {existingOffer.version_number}
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-700">
              You can revise the quotation
              below. Your previous version
              will remain in the marketplace
              record.
            </p>
          </section>
        )}

        {/* CUSTOMER CHAT */}

        {existingOffer && (
          <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-purple-700">
                  Customer Chat
                </div>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Discuss this job
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Quotation {money(existingOffer.amount)} Â· Version{' '}
                  {existingOffer.version_number}
                </p>
              </div>

              <button
                type="button"
                onClick={loadChat}
                disabled={chatLoading}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                {chatLoading
                  ? 'Loading...'
                  : chatMessages.length > 0
                    ? 'Refresh'
                    : 'Open Chat'}
              </button>
            </div>

            <div className="border-b border-purple-100 bg-purple-50 px-5 py-4 sm:px-6">
              <p className="text-xs leading-5 text-purple-900">
                Use chat to discuss the job and quotation. If you agree
                to change the price or commercial terms, update your
                formal quotation below. A chat message does not change
                your submitted offer.
              </p>
            </div>

            <div className="p-5 sm:p-6">
              {chatLoading && chatMessages.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Loading conversation...
                </p>
              ) : chatMessages.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-center">
                  <p className="font-semibold text-slate-900">
                    Open the conversation
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Customer messages about this quotation will appear
                    here.
                  </p>
                </div>
              ) : (
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {chatMessages.map((chatMessage) => {
                    const mine = chatMessage.sender_role === 'driver'

                    return (
                      <div
                        key={chatMessage.id}
                        className={`flex ${
                          mine ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                            mine
                              ? 'bg-purple-700 text-white'
                              : 'bg-slate-100 text-slate-900'
                          }`}
                        >
                          <p className="mb-1 text-[11px] font-bold opacity-70">
                            {mine ? 'You' : 'Customer'}
                          </p>

                          <p className="whitespace-pre-wrap break-words text-sm">
                            {chatMessage.body}
                          </p>

                          <p className="mt-2 text-[10px] opacity-60">
                            {new Date(
                              chatMessage.created_at
                            ).toLocaleString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {chatError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {chatError}
                </div>
              )}

              <div className="mt-5 border-t border-slate-200 pt-5">
                <textarea
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Reply to the customer..."
                  className="w-full resize-none rounded-2xl border border-slate-300 p-4 text-sm outline-none focus:border-purple-600"
                />

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">
                    Keep contact and payment on Fountain Ride.
                  </p>

                  <button
                    type="button"
                    onClick={sendChatMessage}
                    disabled={chatSending || !chatText.trim()}
                    className="rounded-xl bg-purple-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {chatSending ? 'Sending...' : 'Send reply'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

                {/* QUOTATION FORM */}

        {job.lifecycle?.can_submit_quotation !== false &&
          !['open', 'accepted'].includes(job.my_negotiation?.status ?? '') && (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="text-xs font-bold uppercase tracking-widest text-purple-700">
            {existingOffer
              ? 'Update quotation'
              : 'Submit quotation'}
          </div>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Your offer
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            State clearly what your price
            includes. The customer will use
            these terms when comparing
            quotations.
          </p>

          <form
            onSubmit={submitQuotation}
            className="mt-6 space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Base quotation (â‚¦) *
                </span>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={baseAmount}
                  onChange={(e) =>
                    setBaseAmount(
                      e.target.value
                    )
                  }
                  placeholder="e.g. 25000"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-600"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Hours included
                </span>

                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={includedHours}
                  onChange={(e) =>
                    setIncludedHours(
                      e.target.value
                    )
                  }
                  placeholder="e.g. 8"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-600"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Overtime rate (â‚¦ / hour)
                </span>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={overtimeRate}
                  onChange={(e) =>
                    setOvertimeRate(
                      e.target.value
                    )
                  }
                  placeholder="e.g. 3000"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-600"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Additional charges (â‚¦)
                </span>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    additionalCharges
                  }
                  onChange={(e) =>
                    setAdditionalCharges(
                      e.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-600"
                />
              </label>
            </div>

            {Number(
              additionalCharges || 0
            ) > 0 && (
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  What do the additional
                  charges cover? *
                </span>

                <textarea
                  value={
                    additionalChargesNote
                  }
                  onChange={(e) =>
                    setAdditionalChargesNote(
                      e.target.value
                    )
                  }
                  rows={2}
                  placeholder="Explain the additional charges."
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-600"
                />
              </label>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Fuel terms
                </span>

                <select
                  value={fuelTerms}
                  onChange={(e) => setFuelTerms(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-600"
                >
                  <option value="">Select fuel arrangement</option>
                  <option value="customer_pays">Customer pays for fuel</option>
                  <option value="included">Fuel included in quotation</option>
                  <option value="not_applicable">Not applicable</option>
                  <option value="to_be_agreed">To be agreed</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Toll / parking terms
                </span>

                <select
                  value={tollParkingTerms}
                  onChange={(e) => setTollParkingTerms(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-600"
                >
                  <option value="">Select toll / parking arrangement</option>
                  <option value="customer_pays">Customer pays</option>
                  <option value="included">Included in quotation</option>
                  <option value="not_applicable">Not applicable</option>
                  <option value="to_be_agreed">To be agreed</option>
                </select>
              </label>
            </div>

            {job.overnight_required && (
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Accommodation terms
                </span>

                <select
                  value={accommodationTerms}
                  onChange={(e) => setAccommodationTerms(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-600"
                >
                  <option value="">Select accommodation arrangement</option>
                  <option value="customer_provides">Customer provides accommodation</option>
                  <option value="included">Included in quotation</option>
                  <option value="not_required">Not required</option>
                  <option value="to_be_agreed">To be agreed</option>
                </select>
              </label>
            )}

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Conditions of your offer
              </span>

              <textarea
                value={offerConditions}
                onChange={(e) =>
                  setOfferConditions(
                    e.target.value
                  )
                }
                rows={3}
                placeholder="Any conditions the customer should understand before accepting."
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-600"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Message to customer
              </span>

              <textarea
                value={message}
                onChange={(e) =>
                  setMessage(
                    e.target.value
                  )
                }
                rows={3}
                placeholder="Briefly introduce your quotation."
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-600"
              />
            </label>

            {/* TOTAL */}

            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Total initial quotation
              </div>

              <div className="mt-1 text-3xl font-bold">
                {money(totalAmount)}
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-300">
                Base quotation plus stated
                additional charges. Overtime
                is charged separately only
                if applicable.
              </p>
            </div>

            {/* PLATFORM SAFETY */}

            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
              <div className="font-semibold text-slate-900">
                Keep the booking on Fountain Ride
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-700">
                Keeping your quotation,
                agreement and payment on the
                platform creates a record of
                what was agreed and allows
                Fountain Ride to review
                eligible cancellation,
                non-performance and payment
                disputes under the applicable
                refund and dispute policy.
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={
                  marketplaceTermsAccepted
                }
                onChange={(e) =>
                  setMarketplaceTermsAccepted(
                    e.target.checked
                  )
                }
                className="mt-1 h-4 w-4"
              />

              <span className="text-sm leading-6 text-slate-700">
                I accept the Fountain Ride
                Driver Hire Marketplace
                Agreement and confirm that
                the quotation and terms above
                are accurate.
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-purple-700 px-5 py-4 text-base font-bold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? 'Submitting...'
                : existingOffer
                  ? `Update Quotation Â· ${money(
                      totalAmount
                    )}`
                  : `Submit Quotation Â· ${money(
                      totalAmount
                    )}`}
            </button>
          </form>
                  </section>
        )}

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          Customer contact details and exact
          private addresses are not displayed
          at the quotation stage.
        </p>
      </div>
    </main>
  )
}
