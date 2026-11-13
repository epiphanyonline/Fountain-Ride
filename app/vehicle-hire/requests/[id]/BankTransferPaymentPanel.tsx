
'use client'

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react'

type BankDetails = {
  bankName: string
  accountName: string
  accountNumber: string
}

type TransferReport = {
  id: string
  status: string
  sender_name: string
  transfer_date: string
  transfer_time_wat: string
}

type PaymentDetails = {
  ok: boolean
  canReport: boolean
  reason: string
  bookingRef: string
  agreedAmount: number
  currency: string
  bankDetails: BankDetails | null
  report: TransferReport | null
}

type Props = {
  requestId: string
  agreedAmount: number
  currency: string
}

function money(amount: number, currency = 'NGN') {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

export default function BankTransferPaymentPanel({
  requestId,
  agreedAmount,
  currency,
}: Props) {
  const [details, setDetails] =
    useState<PaymentDetails | null>(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [senderName, setSenderName] = useState('')
  const [transferDate, setTransferDate] = useState('')
  const [transferTimeWat, setTransferTimeWat] = useState('')

  const [copied, setCopied] = useState(false)

  const getToken = useCallback(() => {
    return localStorage.getItem(
      `vehicleHireAccess:${requestId}`
    ) || ''
  }, [requestId])

  const loadDetails = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      if (!requestId) {
        throw new Error('Booking ID is missing.')
      }

      const token = getToken()

      if (!token) {
        throw new Error(
          'Booking access is missing on this browser. Please contact Fountain Ride support to recover your booking.'
        )
      }

      const response = await fetch(
        `/api/marketplace/vehicle-hire/${encodeURIComponent(requestId)}/bank-transfer`,
        {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'x-vehicle-hire-access-token': token,
          },
        }
      )

      const result = await response
        .json()
        .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Unable to load bank transfer details.'
        )
      }

      setDetails(result as PaymentDetails)
    } catch (err: unknown) {
      setDetails(null)
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load payment details.'
      )
    } finally {
      setLoading(false)
    }
  }, [requestId, getToken])

  useEffect(() => {
    void loadDetails()
  }, [loadDetails])

  async function copyAccountNumber() {
    const accountNumber =
      details?.bankDetails?.accountNumber

    if (!accountNumber) return

    try {
      await navigator.clipboard.writeText(accountNumber)
      setCopied(true)
    } catch {
      setError(
        'Could not copy automatically. Please select and copy the account number.'
      )
    }
  }

  async function submitTransfer(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (submitting || !details?.canReport) return

    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      const token = getToken()

      if (!token) {
        throw new Error(
          'Booking access has expired or is missing.'
        )
      }

      const response = await fetch(
        `/api/marketplace/vehicle-hire/${encodeURIComponent(requestId)}/bank-transfer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-vehicle-hire-access-token': token,
          },
          body: JSON.stringify({
            senderName: senderName.trim(),
            transferDate,
            transferTimeWat,
          }),
        }
      )

      const result = await response
        .json()
        .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Unable to submit payment details.'
        )
      }

      setMessage(
        'Your payment details have been received. Fountain Ride will verify the bank credit before confirming your booking.'
      )

      await loadDetails()
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit payment details.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const report = details?.report
  const bank = details?.bankDetails

  return (
    <section className="mt-5 rounded-2xl border border-purple-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-700">
        Fountain Ride Mobile Garage
      </p>

      <h3 className="mt-3 text-2xl font-black text-slate-950">
        Complete Your Payment
      </h3>

      <div className="mt-5 rounded-2xl bg-[#F8F7FB] p-5">
        <p className="text-sm font-semibold text-slate-600">
          Agreed Quotation
        </p>

        <p className="mt-2 text-3xl font-black text-purple-800">
          {money(agreedAmount, currency)}
        </p>

        <p className="mt-2 text-sm text-slate-600">
          Vehicle and professional driver included.
        </p>
      </div>

      {loading && (
        <p className="mt-6 text-sm text-slate-600">
          Loading secure payment details...
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800"
        >
          {message}
        </div>
      )}

      {!loading && report?.status === 'reported' && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-lg font-black text-amber-900">
            Payment Reported — Awaiting Verification
          </p>

          <p className="mt-3 text-sm leading-7 text-amber-900">
            Thank you. We have received your bank
            transfer information.
          </p>

          <p className="mt-2 text-sm leading-7 text-amber-900">
            Our team will confirm the payment against
            Fountain Ride's bank account before
            confirming your booking.
          </p>

          <div className="mt-4 rounded-xl bg-white p-4 text-sm">
            <p>
              <strong>Sender:</strong> {report.sender_name}
            </p>
            <p className="mt-2">
              <strong>Date:</strong> {report.transfer_date}
            </p>
            <p className="mt-2">
              <strong>Time (WAT):</strong>{' '}
              {report.transfer_time_wat}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadDetails()}
            className="mt-5 w-full rounded-xl bg-purple-700 px-5 py-3 font-bold text-white hover:bg-purple-800"
          >
            Refresh Payment Status
          </button>
        </div>
      )}

      {!loading && report?.status === 'verified' && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
          <p className="text-lg font-black text-green-900">
            Payment Verified
          </p>
          <p className="mt-2 text-sm text-green-800">
            Fountain Ride has confirmed your bank transfer.
            Refresh your booking page to see the latest status.
          </p>
        </div>
      )}

      {!loading &&
        report?.status !== 'reported' &&
        report?.status !== 'verified' &&
        !details?.canReport && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-bold text-amber-900">
              Payment action unavailable
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-900">
              {details?.reason ||
                'Payment details are not available. Please contact support.'}
            </p>

            <p className="mt-3 text-xs text-amber-800">
              Please do not transfer money again
              until the existing payment status
              has been checked.
            </p>
          </div>
        )}

      {!loading && details?.canReport && bank && (
        <>
          {report?.status === 'rejected' && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Your previous payment report could not
              be verified. Please contact support if
              you believe payment was received, or
              provide corrected details below.
            </div>
          )}

          <div className="mt-6">
            <h4 className="text-lg font-black text-slate-950">
              Pay by Bank Transfer
            </h4>

            <p className="mt-2 text-sm leading-7 text-slate-600">
              Transfer the exact agreed amount to
              Fountain Ride's official bank account.
            </p>

            <div className="mt-4 rounded-2xl border border-purple-200 bg-purple-50 p-5">
              <p className="text-xs font-bold uppercase text-purple-700">
                Bank Name
              </p>

              <p className="mt-1 text-lg font-black">
                {bank.bankName}
              </p>

              <div className="my-4 border-t border-purple-200" />

              <p className="text-xs font-bold uppercase text-purple-700">
                Account Name
              </p>

              <p className="mt-1 font-black">
                {bank.accountName}
              </p>

              <div className="my-4 border-t border-purple-200" />

              <p className="text-xs font-bold uppercase text-purple-700">
                Account Number
              </p>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="break-all text-2xl font-black tracking-wider text-slate-950">
                  {bank.accountNumber}
                </p>

                <button
                  type="button"
                  onClick={() => void copyAccountNumber()}
                  className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-bold text-white"
                >
                  {copied ? 'Copied' : 'Copy Number'}
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <strong>Payment Safety:</strong> Pay only
              to the official Fountain Ride account
              shown above. Verify the recipient's
              account name in your banking app.
              Never pay into a personal driver's account.
            </div>
          </div>

          <form
            onSubmit={submitTransfer}
            className="mt-7 border-t border-slate-200 pt-6"
          >
            <h4 className="text-lg font-black">
              I've Made Payment
            </h4>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Please provide the details below so
              our team can locate your transfer.
              A receipt upload is not required.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="bank-sender-name"
                  className="block text-sm font-bold"
                >
                  Sender's Account Name
                </label>

                <input
                  id="bank-sender-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={150}
                  value={senderName}
                  onChange={(e) =>
                    setSenderName(e.target.value)
                  }
                  placeholder="Name used for the transfer"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="bank-transfer-date"
                    className="block text-sm font-bold"
                  >
                    Transfer Date
                  </label>

                  <input
                    id="bank-transfer-date"
                    type="date"
                    required
                    value={transferDate}
                    onChange={(e) =>
                      setTransferDate(e.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  />
                </div>

                <div>
                  <label
                    htmlFor="bank-transfer-time"
                    className="block text-sm font-bold"
                  >
                    Transfer Time (Nigeria)
                  </label>

                  <input
                    id="bank-transfer-time"
                    type="time"
                    required
                    value={transferTimeWat}
                    onChange={(e) =>
                      setTransferTimeWat(e.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  />
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Use Nigerian time (WAT, UTC+1)
              when entering the transfer time.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-xl bg-purple-700 px-6 py-4 font-black text-white hover:bg-purple-800 disabled:opacity-50"
            >
              {submitting
                ? 'Submitting Payment Details...'
                : 'Submit Payment Confirmation'}
            </button>

            <p className="mt-3 text-center text-xs leading-5 text-slate-500">
              Submitting these details does not
              automatically confirm payment.
              Fountain Ride will verify the
              actual bank credit first.
            </p>
          </form>
        </>
      )}

      {!loading && (
        <button
          type="button"
          onClick={() => void loadDetails()}
          className="mt-5 text-sm font-bold text-purple-700 underline"
        >
          Reload payment information
        </button>
      )}
    </section>
  )
}
