
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AdminGuard from '../../../components/AdminGuard'

type Booking = {
  id: string
  booking_ref: string
  agreed_amount: number
  currency: string
  status: string
}

type BankTransferReport = {
  id: string
  vehicle_hire_request_id: string
  sender_name: string
  transfer_date: string
  transfer_time_wat: string
  status: string
  created_at: string
  booking: Booking | null
}

function money(
  amount: number,
  currency = 'NGN'
) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)
}

export default function AdminBankTransfersPage() {
  const [reports, setReports] =
    useState<BankTransferReport[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Payment verification form
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [verifiedAmount, setVerifiedAmount] = useState('')
  const [bankCreditReference, setBankCreditReference] =
    useState('')
  const [creditChecked, setCreditChecked] = useState(false)

  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        '/api/admin/vehicle-hire/bank-transfers',
        {
          cache: 'no-store',
          credentials: 'same-origin',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to load bank transfer reports.'
        )
      }

      setReports(
        Array.isArray(data.reports)
          ? data.reports
          : []
      )
    } catch (err: unknown) {
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

  function openReview(report: BankTransferReport) {
    if (reviewId === report.id) {
      setReviewId(null)
      return
    }

    setReviewId(report.id)

    setVerifiedAmount(
      report.booking?.agreed_amount != null
        ? String(report.booking.agreed_amount)
        : ''
    )

    setBankCreditReference('')
    setCreditChecked(false)
    setConfirmError('')
    setNotice('')
  }

  async function confirmBankPayment(
    report: BankTransferReport
  ) {
    if (confirming) return

    setConfirmError('')
    setNotice('')

    if (!report.booking) {
      setConfirmError(
        'The linked booking could not be found.'
      )
      return
    }

    const amount = Number(verifiedAmount)

    if (
      !verifiedAmount.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setConfirmError(
        'Enter the amount actually received.'
      )
      return
    }

    if (
      bankCreditReference.trim().length < 6
    ) {
      setConfirmError(
        'Enter the unique bank-statement transaction identifier.'
      )
      return
    }

    if (!creditChecked) {
      setConfirmError(
        'You must confirm that the actual bank credit has been checked.'
      )
      return
    }

    const proceed = window.confirm(
      `Confirm that Fountain Ride actually received ${money(
        amount,
        report.booking.currency
      )} for booking ${report.booking.booking_ref}?\n\n` +
      'This will confirm the booking and create pending vehicle-owner earnings. Continue only after checking the actual bank transaction.'
    )

    if (!proceed) return

    setConfirming(true)

    try {
      const response = await fetch(
        `/api/admin/vehicle-hire/bank-transfers/${report.id}/confirm`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            verifiedAmount: amount,
            bankCreditReference:
              bankCreditReference.trim(),
            creditChecked: true,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            'Unable to confirm this payment.'
        )
      }

      setNotice(
        data.message ||
          'Bank transfer verified successfully.'
      )

      setReviewId(null)
      setVerifiedAmount('')
      setBankCreditReference('')
      setCreditChecked(false)

      await loadReports()
    } catch (err: unknown) {
      setConfirmError(
        err instanceof Error
          ? err.message
          : 'Payment verification failed.'
      )
    } finally {
      setConfirming(false)
    }
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-[#F8F7FB] px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-6xl">

          {/* Header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/admin/vehicle-hire"
              className="font-bold text-purple-700 hover:underline"
            >
              ← Back to Vehicle Hire
            </Link>

            <button
              type="button"
              onClick={() => void loadReports()}
              disabled={loading || confirming}
              className="rounded-xl bg-purple-700 px-5 py-3 font-bold text-white disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh Reports'}
            </button>
          </div>

          <h1 className="text-3xl font-black md:text-4xl">
            Bank Transfer Payments
          </h1>

          <p className="mt-3 text-slate-600">
            Review customer-reported bank transfers.
            Confirm the actual credit in Fountain Ride's
            bank account before approving payment.
          </p>

          {/* Summary */}
          <div className="mt-7 rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Payments Awaiting Verification
            </p>

            <p className="mt-2 text-4xl font-black text-purple-800">
              {reports.length}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Customer-reported bank transfers
            </p>
          </div>

          {/* Successful confirmation */}
          {notice && (
            <div
              role="status"
              className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 font-semibold text-green-800"
            >
              {notice}
            </div>
          )}

          {/* Loading errors */}
          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
            >
              {error}
            </div>
          )}

          {loading && (
            <p className="mt-8 text-slate-600">
              Loading payment reports...
            </p>
          )}

          {!loading && !error && reports.length === 0 && (
            <div className="mt-8 rounded-2xl border bg-white p-8 text-center shadow-sm">
              <p className="text-xl font-black">
                No payments awaiting verification
              </p>

              <p className="mt-2 text-slate-600">
                Customer bank transfer reports will
                appear here when submitted.
              </p>
            </div>
          )}

          {/* Payment reports */}
          <div className="mt-8 grid gap-5">

            {!loading && reports.map((report) => (
              <article
                key={report.id}
                className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm md:p-7"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-700">
                      Vehicle Hire Payment
                    </p>

                    <h2 className="mt-2 text-xl font-black">
                      {report.booking?.booking_ref ||
                        'Booking unavailable'}
                    </h2>
                  </div>

                  <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-black text-amber-800">
                    Awaiting Verification
                  </span>
                </div>

                {/* Payment details */}
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">
                      Expected Amount
                    </p>
                    <p className="mt-1 text-2xl font-black">
                      {money(
                        report.booking?.agreed_amount || 0,
                        report.booking?.currency || 'NGN'
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Sender's Name
                    </p>
                    <p className="mt-1 font-bold">
                      {report.sender_name}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Transfer Date
                    </p>
                    <p className="mt-1 font-bold">
                      {report.transfer_date}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Transfer Time (Nigeria)
                    </p>
                    <p className="mt-1 font-bold">
                      {report.transfer_time_wat}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Booking Status
                    </p>
                    <p className="mt-1 font-bold">
                      {report.booking?.status || 'Unknown'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Report Received
                    </p>
                    <p className="mt-1 font-bold">
                      {new Date(report.created_at).toLocaleString(
                        'en-GB',
                        { timeZone: 'Africa/Lagos' }
                      )} WAT
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3 border-t pt-5">
                  {report.booking?.id && (
                    <Link
                      href={`/admin/vehicle-hire/${report.booking.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-purple-200 px-5 py-3 font-bold text-purple-800 hover:bg-purple-50"
                    >
                      View Booking
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => openReview(report)}
                    disabled={
                      confirming ||
                      !report.booking ||
                      report.booking.status !== 'awaiting_payment'
                    }
                    className="rounded-xl bg-purple-700 px-5 py-3 font-bold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {reviewId === report.id
                      ? 'Close Review'
                      : 'Review & Confirm Payment'}
                  </button>
                </div>

                {/* Admin-only verification form */}
                {reviewId === report.id && (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault()
                      void confirmBankPayment(report)
                    }}
                    className="mt-6 rounded-2xl border border-purple-200 bg-purple-50 p-5"
                  >
                    <h3 className="text-xl font-black">
                      Verify Bank Payment
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Open Fountain Ride's corporate
                      bank statement and independently
                      verify the incoming payment.
                      Do not rely solely on the
                      customer's submitted details.
                    </p>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="verifiedAmount"
                          className="block text-sm font-bold"
                        >
                          Actual Amount Received (NGN)
                        </label>

                        <input
                          id="verifiedAmount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                          value={verifiedAmount}
                          onChange={(event) =>
                            setVerifiedAmount(event.target.value)
                          }
                          className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-4 py-3"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="bankCreditReference"
                          className="block text-sm font-bold"
                        >
                          Bank Statement Transaction ID
                        </label>

                        <input
                          id="bankCreditReference"
                          type="text"
                          required
                          minLength={6}
                          maxLength={120}
                          value={bankCreditReference}
                          onChange={(event) =>
                            setBankCreditReference(
                              event.target.value
                            )
                          }
                          placeholder="Unique ID from the bank statement"
                          className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-4 py-3"
                        />
                      </div>
                    </div>

                    <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-purple-200 bg-white p-4">
                      <input
                        type="checkbox"
                        checked={creditChecked}
                        onChange={(event) =>
                          setCreditChecked(event.target.checked)
                        }
                        className="mt-1 h-5 w-5 accent-purple-700"
                      />

                      <span className="text-sm font-semibold leading-6">
                        I have independently verified that
                        the correct amount has been credited
                        to Fountain Ride's corporate bank
                        account and that this transaction
                        has not already been used to
                        confirm another booking.
                      </span>
                    </label>

                    {confirmError && (
                      <div
                        role="alert"
                        className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
                      >
                        {confirmError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={
                        confirming ||
                        !creditChecked ||
                        !verifiedAmount.trim() ||
                        bankCreditReference.trim().length < 6
                      }
                      className="mt-5 w-full rounded-xl bg-green-700 px-6 py-4 font-black text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {confirming
                        ? 'Confirming Payment...'
                        : 'Confirm Bank Payment & Booking'}
                    </button>

                    <p className="mt-3 text-center text-xs text-slate-500">
                      This action records verified
                      payment and creates pending
                      vehicle-owner earnings.
                      It does not send a payout.
                    </p>
                  </form>
                )}
              </article>
            ))}
          </div>
        </div>
      </main>
    </AdminGuard>
  )
}
