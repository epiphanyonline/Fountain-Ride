
'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import AdminGuard from '../../../components/AdminGuard'

type Booking = {
  id: string
  booking_ref: string
  status: string
  currency: string
  agreed_amount: number | string | null
}

type TransferReport = {
  id: string
  driver_hire_request_id: string
  sender_name: string
  transfer_date: string
  transfer_time_wat: string
  status: string
  created_at: string
  booking: Booking | null
}

function money(
  amount: number | string | null | undefined
) {
  const value = Number(amount)

  if (
    amount === null ||
    amount === undefined ||
    !Number.isFinite(value)
  ) {
    return 'Amount unavailable'
  }

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(value)
}

function dateTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('en-GB', {
    timeZone: 'Africa/Lagos',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function DriverHireBankTransfersPage() {
  const [reports, setReports] = useState<
    TransferReport[]
  >([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [reviewId, setReviewId] = useState<
    string | null
  >(null)

  const [verifiedAmount, setVerifiedAmount] =
    useState('')

  const [
    bankCreditReference,
    setBankCreditReference,
  ] = useState('')

  const [creditChecked, setCreditChecked] =
    useState(false)

  const [submitting, setSubmitting] =
    useState(false)

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        '/api/admin/driver-hire/bank-transfers',
        {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        }
      )

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            'Unable to load payment reports.'
        )
      }

      setReports(data.reports || [])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load payment reports.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  function openReview(report: TransferReport) {
    setReviewId(report.id)

    setVerifiedAmount(
      report.booking?.agreed_amount == null
        ? ''
        : String(report.booking.agreed_amount)
    )

    setBankCreditReference('')
    setCreditChecked(false)
    setError('')
    setNotice('')
  }

  function closeReview() {
    setReviewId(null)
    setVerifiedAmount('')
    setBankCreditReference('')
    setCreditChecked(false)
    setError('')
  }

  async function confirmPayment(
    event: FormEvent<HTMLFormElement>,
    report: TransferReport
  ) {
    event.preventDefault()

    if (submitting) return

    setError('')
    setNotice('')

    if (!report.booking) {
      setError('Booking details are unavailable.')
      return
    }

    const amountText = verifiedAmount.trim()

    if (
      !/^[0-9]{1,12}(\.[0-9]{1,2})?$/.test(
        amountText
      )
    ) {
      setError('Enter a valid payment amount.')
      return
    }

    const amount = Number(amountText)

    const agreedAmount = Number(
      report.booking.agreed_amount
    )

    if (
      !Number.isFinite(agreedAmount) ||
      agreedAmount <= 0 ||
      Math.abs(amount - agreedAmount) > 0.001
    ) {
      setError(
        'The verified amount must match the agreed quotation.'
      )
      return
    }

    const reference =
      bankCreditReference.trim()

    if (
      reference.length < 4 ||
      reference.length > 160
    ) {
      setError(
        'Enter the unique bank statement transaction reference.'
      )
      return
    }

    if (!creditChecked) {
      setError(
        'You must confirm checking the actual bank credit.'
      )
      return
    }

    const accepted = window.confirm(
      `Confirm bank payment for ${report.booking.booking_ref}?\n\n` +
        `Amount: ${money(amount)}\n` +
        `Bank reference: ${reference}\n\n` +
        'Only proceed if the funds have actually arrived in the corporate bank account.'
    )

    if (!accepted) return

    setSubmitting(true)

    try {
      const response = await fetch(
        `/api/admin/driver-hire/bank-transfers/${report.id}/confirm`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            verifiedAmount: amount,
            bankCreditReference: reference,
            creditChecked: true,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            'Payment confirmation failed.'
        )
      }

      closeReview()

      setNotice(
        `Payment confirmed for ${report.booking.booking_ref}. ` +
          'The Driver Hire booking and earnings records have been updated.'
      )

      await loadReports()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Payment confirmation failed.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-6">

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/admin"
              className="text-sm font-bold text-purple-700 hover:underline"
            >
              Back to Admin Dashboard
            </Link>

            <button
              type="button"
              onClick={() => void loadReports()}
              disabled={loading || submitting}
              className="rounded-xl border border-purple-200 bg-white px-4 py-2 text-sm font-bold text-purple-700 disabled:opacity-50"
            >
              Refresh Reports
            </button>
          </div>

          <header className="rounded-3xl bg-purple-800 p-6 text-white shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-purple-200">
              Fountain Ride Mobile Garage
            </p>

            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Driver Hire Bank Transfers
            </h1>

            <p className="mt-2 text-sm text-purple-100">
              Review customer-reported payments and
              verify actual bank credits before
              confirming Driver Hire bookings.
            </p>
          </header>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <strong>Payment verification policy</strong>

            <p className="mt-1">
              A customer submitting transfer details
              does not prove payment. Check Fountain
              Ride's actual bank statement before
              approving any booking.
            </p>
          </div>

          {notice && (
            <div
              role="status"
              className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800"
            >
              {notice}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <section className="rounded-3xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-gray-950">
                  Pending Verification
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Customer-reported transfers requiring
                  bank statement checks.
                </p>
              </div>

              <div className="rounded-xl bg-purple-100 px-4 py-2 text-lg font-black text-purple-800">
                {reports.length}
              </div>
            </div>
          </section>

          {loading ? (
            <div className="rounded-3xl border bg-white p-8 text-center text-gray-600">
              Loading payment reports...
            </div>
          ) : reports.length === 0 && !error ? (
            <div className="rounded-3xl border bg-white p-8 text-center">
              <h3 className="text-lg font-black text-gray-900">
                No pending bank transfers
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                New Driver Hire payment reports will
                appear here after customers submit
                their transfer details.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {reports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-purple-700">
                        Driver Hire Booking
                      </p>

                      <h3 className="mt-1 text-xl font-black text-gray-950">
                        {report.booking?.booking_ref ||
                          'Unknown booking'}
                      </h3>
                    </div>

                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                      Awaiting Verification
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">

                    <div>
                      <p className="text-xs text-gray-500">
                        Expected Payment
                      </p>

                      <p className="mt-1 text-xl font-black text-gray-900">
                        {money(
                          report.booking?.agreed_amount
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Sender's Account Name
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {report.sender_name}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Reported Transfer Date
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {report.transfer_date}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Reported Transfer Time (WAT)
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {report.transfer_time_wat}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Booking Status
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {report.booking?.status || 'Unknown'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Report Submitted
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {dateTime(report.created_at)} WAT
                      </p>
                    </div>

                  </div>

                  {reviewId !== report.id ? (
                    <button
                      type="button"
                      onClick={() => openReview(report)}
                      disabled={!report.booking}
                      className="mt-6 w-full rounded-2xl bg-purple-700 px-6 py-4 font-black text-white hover:bg-purple-800 disabled:opacity-50 sm:w-auto"
                    >
                      Review & Confirm Payment
                    </button>
                  ) : (
                    <form
                      onSubmit={(event) =>
                        void confirmPayment(event, report)
                      }
                      className="mt-6 space-y-4 rounded-2xl border border-purple-200 bg-purple-50 p-5"
                    >
                      <h4 className="text-lg font-black text-gray-950">
                        Verify Actual Bank Credit
                      </h4>

                      <p className="text-sm text-gray-600">
                        Only enter details from the
                        corporate bank statement.
                      </p>

                      <div>
                        <label
                          htmlFor="driver-verified-amount"
                          className="mb-2 block text-sm font-bold text-gray-800"
                        >
                          Verified Amount (NGN)
                        </label>

                        <input
                          id="driver-verified-amount"
                          type="text"
                          inputMode="decimal"
                          required
                          value={verifiedAmount}
                          onChange={(event) =>
                            setVerifiedAmount(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-950"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="driver-bank-reference"
                          className="mb-2 block text-sm font-bold text-gray-800"
                        >
                          Unique Bank Statement Reference
                        </label>

                        <input
                          id="driver-bank-reference"
                          type="text"
                          required
                          maxLength={160}
                          value={bankCreditReference}
                          onChange={(event) =>
                            setBankCreditReference(
                              event.target.value
                            )
                          }
                          placeholder="Enter the bank transaction ID"
                          className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-950"
                        />
                      </div>

                      <label className="flex items-start gap-3 rounded-xl bg-white p-3 text-sm text-gray-800">
                        <input
                          type="checkbox"
                          checked={creditChecked}
                          onChange={(event) =>
                            setCreditChecked(
                              event.target.checked
                            )
                          }
                          className="mt-1 h-4 w-4"
                        />

                        <span>
                          I have checked Fountain Ride's
                          actual bank statement and
                          confirmed that this credit
                          was received, matches the
                          booking amount and has not
                          been used for another booking.
                        </span>
                      </label>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          disabled={
                            submitting ||
                            !creditChecked
                          }
                          className="rounded-xl bg-green-700 px-5 py-3 font-black text-white hover:bg-green-800 disabled:opacity-50"
                        >
                          {submitting
                            ? 'Confirming...'
                            : 'Confirm Verified Payment'}
                        </button>

                        <button
                          type="button"
                          onClick={closeReview}
                          disabled={submitting}
                          className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-bold text-gray-700 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  )
}
