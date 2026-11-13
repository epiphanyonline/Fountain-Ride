
'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'

type BankDetails = {
  bankName: string
  accountName: string
  accountNumber: string
}

type TransferReport = {
  id: string
  status: 'reported' | 'verified' | 'rejected'
  sender_name: string
  transfer_date: string
  transfer_time_wat: string
  created_at: string
  verified_at: string | null
}

type PaymentDetails = {
  ok: boolean
  bookingRef: string
  agreedAmount: number
  currency: string
  canReport: boolean
  reason: string
  bankDetails: BankDetails | null
  report: TransferReport | null
}

type Props = {
  requestId: string
}

export default function DriverHireBankTransferPanel({
  requestId,
}: Props) {
  const [details, setDetails] =
    useState<PaymentDetails | null>(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [senderName, setSenderName] = useState('')
  const [transferDate, setTransferDate] = useState('')
  const [transferTimeWat, setTransferTimeWat] =
    useState('')

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Must match the existing Driver Hire booking token key.
  
function accessToken() {
  return (
    localStorage.getItem(
      `fountain_driver_hire_access_${requestId}`
    ) || ''
  )
}


  const loadDetails = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const token = accessToken()

      if (!token) {
        throw new Error(
          'Your booking access could not be found. Please reopen the original booking link.'
        )
      }

      const response = await fetch(
        `/api/marketplace/driver-hire/${requestId}/bank-transfer`,
        {
          method: 'GET',
          headers: {
            'x-driver-hire-access-token': token,
          },
          cache: 'no-store',
        }
      )

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || 'Unable to load bank details.'
        )
      }

      setDetails(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load payment information.'
      )
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    void loadDetails()
  }, [loadDetails])

  async function copyAccountNumber() {
    const number = details?.bankDetails?.accountNumber

    if (!number) return

    try {
      await navigator.clipboard.writeText(number)
      setMessage('Account number copied.')
    } catch {
      setError('Unable to copy the account number.')
    }
  }

  async function submitReport(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (submitting || !details?.canReport) return

    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      const token = accessToken()

      if (!token) {
        throw new Error('Booking access has expired or is unavailable.')
      }

      const response = await fetch(
        `/api/marketplace/driver-hire/${requestId}/bank-transfer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-driver-hire-access-token': token,
          },
          body: JSON.stringify({
            senderName: senderName.trim(),
            transferDate,
            transferTimeWat,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            'Unable to submit payment confirmation.'
        )
      }

      setMessage(
        'Your payment details have been submitted. Fountain Ride will check the bank credit before confirming your booking.'
      )

      await loadDetails()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit payment details.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const bank = details?.bankDetails
  const report = details?.report

  return (
    <section className="mt-6 rounded-3xl border border-purple-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-black uppercase tracking-widest text-purple-700">
        Fountain Ride Mobile Garage
      </p>

      <h3 className="mt-2 text-2xl font-black text-gray-950">
        Complete Your Driver Hire Payment
      </h3>

      <p className="mt-2 text-sm text-gray-600">
        Pay directly into Fountain Ride's official
        corporate bank account. Your booking will
        be confirmed once we verify the payment.
      </p>

      {loading && (
        <p className="mt-5 text-sm text-gray-500">
          Loading secure payment details...
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {message}
        </div>
      )}

      {!loading && details && (
        <>
          <div className="mt-5 rounded-2xl bg-purple-50 p-4">
            <p className="text-xs font-bold text-purple-700">
              Agreed Driver Hire Quotation
            </p>

            <p className="mt-1 text-2xl font-black text-purple-950">
              {new Intl.NumberFormat('en-NG', {
                style: 'currency',
                currency: details.currency || 'NGN',
              }).format(details.agreedAmount)}
            </p>
          </div>

          {report?.status === 'reported' && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-black text-amber-900">
                Payment Awaiting Verification
              </p>

              <p className="mt-2 text-sm text-amber-800">
                We have received your transfer details.
                Our team will check the corporate bank
                account before confirming your booking.
              </p>

              <p className="mt-3 text-xs text-amber-900">
                Please do not make another payment
                unless Fountain Ride asks you to.
              </p>
            </div>
          )}

          {report?.status === 'verified' && (
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5">
              <p className="font-black text-green-900">
                Payment Confirmed
              </p>

              <p className="mt-2 text-sm text-green-800">
                Your bank payment has been verified
                and your Driver Hire booking confirmed.
              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-xl bg-green-700 px-5 py-3 font-bold text-white"
              >
                View Confirmed Booking
              </button>
            </div>
          )}

          {details.canReport && bank && (
            <>
              <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm font-black text-gray-900">
                  Official Fountain Ride Bank Account
                </p>

                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs text-gray-500">
                      Bank
                    </p>

                    <p className="font-black text-gray-950">
                      {bank.bankName}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Account Name
                    </p>

                    <p className="font-black text-gray-950">
                      {bank.accountName}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Account Number
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <p className="text-xl font-black tracking-wider text-gray-950">
                        {bank.accountNumber}
                      </p>

                      <button
                        type="button"
                        onClick={() => void copyAccountNumber()}
                        className="rounded-lg bg-purple-100 px-3 py-2 text-xs font-black text-purple-800"
                      >
                        Copy Number
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-lg font-black text-gray-950">
                  I've Made the Bank Transfer
                </h4>

                <p className="mt-2 text-sm text-gray-600">
                  After sending the exact agreed amount,
                  enter the details below. You do not
                  need to upload a receipt.
                </p>

                <form
                  onSubmit={(event) =>
                    void submitReport(event)
                  }
                  className="mt-4 space-y-4"
                >
                  <div>
                    <label
                      htmlFor="driver-transfer-sender"
                      className="mb-2 block text-sm font-bold text-gray-800"
                    >
                      Sender's Account Name
                    </label>

                    <input
                      id="driver-transfer-sender"
                      type="text"
                      required
                      minLength={2}
                      maxLength={150}
                      value={senderName}
                      onChange={(event) =>
                        setSenderName(event.target.value)
                      }
                      placeholder="Name on the sending bank account"
                      className="w-full rounded-xl border border-gray-300 p-3 text-gray-950"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="driver-transfer-date"
                        className="mb-2 block text-sm font-bold text-gray-800"
                      >
                        Transfer Date
                      </label>

                      <input
                        id="driver-transfer-date"
                        type="date"
                        required
                        value={transferDate}
                        onChange={(event) =>
                          setTransferDate(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 p-3 text-gray-950"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="driver-transfer-time"
                        className="mb-2 block text-sm font-bold text-gray-800"
                      >
                        Transfer Time (WAT)
                      </label>

                      <input
                        id="driver-transfer-time"
                        type="time"
                        required
                        value={transferTimeWat}
                        onChange={(event) =>
                          setTransferTimeWat(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 p-3 text-gray-950"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-2xl bg-purple-700 px-6 py-4 font-black text-white hover:bg-purple-800 disabled:opacity-50"
                  >
                    {submitting
                      ? 'Submitting Details...'
                      : 'Submit Payment Confirmation'}
                  </button>
                </form>
              </div>
            </>
          )}

          {!details.canReport &&
            report?.status !== 'reported' &&
            report?.status !== 'verified' && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {details.reason ||
                  'Bank transfer is currently unavailable.'}
              </div>
            )}
        </>
      )}

      <button
        type="button"
        onClick={() => void loadDetails()}
        disabled={loading || submitting}
        className="mt-5 text-sm font-bold text-purple-700 underline disabled:opacity-50"
      >
        Refresh Payment Status
      </button>
    </section>
  )
}
