
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getSupabaseAdmin } from '../../../../../../lib/server/supabaseAdmin'

type Context = {
  params: Promise<{ id: string }>
}

type Database = ReturnType<typeof getSupabaseAdmin>

function respond(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

function safeEqual(
  supplied: string,
  stored: string
) {
  try {
    const a = Buffer.from(supplied)
    const b = Buffer.from(stored)

    return (
      a.length === b.length &&
      crypto.timingSafeEqual(a, b)
    )
  } catch {
    return false
  }
}

async function hasCustomerAccess(
  db: Database,
  id: string,
  token: string
) {
  const { data, error } = await db
    .from('vehicle_hire_customer_access')
    .select('access_token')
    .eq('vehicle_hire_request_id', id)
    .is('revoked_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(
      'Unable to verify customer access.'
    )
  }

  return (
    !!data &&
    safeEqual(
      token,
      String(data.access_token || '')
    )
  )
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(
    `${value}T00:00:00.000Z`
  )

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

// ---------------------------------------------------
// GET: Customer checks submitted transfer status
// ---------------------------------------------------


// GET: Load bank details and payment-report status

export async function GET(
  req: NextRequest,
  context: Context
) {
  try {
    const { id } = await context.params

    const token =
      req.headers.get(
        'x-vehicle-hire-access-token'
      )?.trim() || ''

    if (!id || !token) {
      return respond(
        { error: 'Customer access required.' },
        401
      )
    }

    const db = getSupabaseAdmin()

    if (!(await hasCustomerAccess(db, id, token))) {
      return respond(
        { error: 'Access denied.' },
        403
      )
    }

    // Load booking.

    const {
      data: booking,
      error: bookingError,
    } = await db
      .from('vehicle_hire_requests')
      .select(`
        id,
        status,
        agreed_amount,
        currency,
        selected_offer_id,
        booking_ref
      `)
      .eq('id', id)
      .maybeSingle()

    if (bookingError || !booking) {
      return respond(
        { error: 'Booking not found.' },
        404
      )
    }

    // Load most recent bank transfer report.

    const {
      data: report,
      error: reportError,
    } = await db
      .from('vehicle_hire_bank_transfer_reports')
      .select(`
        id,
        status,
        sender_name,
        transfer_date,
        transfer_time_wat,
        created_at,
        verified_at
      `)
      .eq('vehicle_hire_request_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (reportError) {
      throw reportError
    }

    // Check existing Paystack/payment attempts.

    const {
      data: existingPayments,
      error: paymentError,
    } = await db
      .from('vehicle_hire_payments')
      .select('status')
      .eq('vehicle_hire_request_id', id)
      .in('status', ['paid', 'pending'])

    if (paymentError) {
      throw paymentError
    }

    const hasOtherPayment =
      (existingPayments || []).length > 0

    // Official bank details come from the server.

    const bankName =
      process.env.FOUNTAIN_RIDE_BANK_NAME?.trim() || ''

    const accountName =
      process.env.FOUNTAIN_RIDE_BANK_ACCOUNT_NAME?.trim() || ''

    const accountNumber =
      process.env.FOUNTAIN_RIDE_BANK_ACCOUNT_NUMBER?.trim() || ''

    const bankConfigured =
      Boolean(bankName && accountName) &&
      /^\d{10}$/.test(accountNumber)

    const bookingEligible =
      booking.status === 'awaiting_payment' &&
      Boolean(booking.selected_offer_id) &&
      Number(booking.agreed_amount) > 0

    const alreadyReported =
      report?.status === 'reported' ||
      report?.status === 'verified'

    const canReport =
      bankConfigured &&
      bookingEligible &&
      !hasOtherPayment &&
      !alreadyReported

    let reason = ''

    if (!bankConfigured) {
      reason =
        'Bank transfer is not configured yet.'
    } else if (alreadyReported) {
      reason =
        report?.status === 'verified'
          ? 'This transfer has already been verified.'
          : 'Your payment is awaiting bank verification.'
    } else if (hasOtherPayment) {
      reason =
        'Another payment attempt requires reconciliation. Please contact Fountain Ride support before transferring money.'
    } else if (!bookingEligible) {
      reason =
        'This booking is not currently eligible for payment.'
    }

    return respond({
      ok: true,

      report: report || null,

      canReport,

      reason,

      bookingRef: booking.booking_ref,

      agreedAmount: booking.agreed_amount,

      currency: booking.currency,

      bankDetails: canReport
        ? {
            bankName,
            accountName,
            accountNumber,
          }
        : null,
    })

  } catch (error) {
    console.error(
      'Bank transfer details lookup failed:',
      error
    )

    return respond(
      {
        error:
          'Unable to load bank transfer details.',
      },
      500
    )
  }
}


// ---------------------------------------------------
// POST: Customer reports a bank transfer
// This does NOT confirm payment.
// ---------------------------------------------------

export async function POST(
  req: NextRequest,
  context: Context
) {
  try {
    const { id } = await context.params

    if (!id) {
      return respond(
        { error: 'Booking ID is required.' },
        400
      )
    }

    const token =
      req.headers.get(
        'x-vehicle-hire-access-token'
      )?.trim() || ''

    if (!token) {
      return respond(
        { error: 'Customer access required.' },
        401
      )
    }

    const db = getSupabaseAdmin()

    if (!(await hasCustomerAccess(db, id, token))) {
      return respond(
        { error: 'Access denied.' },
        403
      )
    }

    const body = await req
      .json()
      .catch(() => null)

    const senderName =
      typeof body?.senderName === 'string'
        ? body.senderName.trim()
        : ''

    const transferDate =
      typeof body?.transferDate === 'string'
        ? body.transferDate.trim()
        : ''

    const transferTimeWat =
      typeof body?.transferTimeWat === 'string'
        ? body.transferTimeWat.trim()
        : ''

    if (
      senderName.length < 2 ||
      senderName.length > 150
    ) {
      return respond(
        { error: 'Enter a valid sender name.' },
        400
      )
    }

    if (!validDate(transferDate)) {
      return respond(
        { error: 'Enter a valid payment date.' },
        400
      )
    }

    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(
        transferTimeWat
      )
    ) {
      return respond(
        {
          error:
            'Enter a valid payment time in Nigerian time.',
        },
        400
      )
    }

    // Check booking is eligible for payment.

    const {
      data: booking,
      error: bookingError,
    } = await db
      .from('vehicle_hire_requests')
      .select(`
        id,
        status,
        selected_offer_id,
        agreed_amount
      `)
      .eq('id', id)
      .maybeSingle()

    if (bookingError || !booking) {
      return respond(
        { error: 'Booking not found.' },
        404
      )
    }

    if (
      booking.status !== 'awaiting_payment' ||
      !booking.selected_offer_id ||
      Number(booking.agreed_amount) <= 0
    ) {
      return respond(
        {
          error:
            'This booking is not eligible for payment reporting.',
        },
        409
      )
    }

    // Prevent reporting a bank transfer when
    // Paystack payment is already paid or pending.

    const {
      data: payments,
      error: paymentError,
    } = await db
      .from('vehicle_hire_payments')
      .select('status, provider')
      .eq('vehicle_hire_request_id', id)

    if (paymentError) {
      throw paymentError
    }

    if (
      (payments || []).some(
        payment => payment.status === 'paid'
      )
    ) {
      return respond(
        { error: 'This booking has already been paid.' },
        409
      )
    }

    if (
      (payments || []).some(
        payment =>
          payment.provider === 'paystack' &&
          payment.status === 'pending'
      )
    ) {
      return respond(
        {
          error:
            'An online payment attempt is still pending. Please contact support before reporting another payment.',
        },
        409
      )
    }

    // Prevent duplicate pending or verified reports.

    const {
      data: existing,
      error: existingError,
    } = await db
      .from('vehicle_hire_bank_transfer_reports')
      .select('id, status')
      .eq('vehicle_hire_request_id', id)
      .in('status', ['reported', 'verified'])
      .limit(1)
      .maybeSingle()

    if (existingError) {
      throw existingError
    }

    if (existing) {
      return respond(
        {
          error:
            existing.status === 'verified'
              ? 'Payment has already been verified.'
              : 'Your payment report is already awaiting verification.',
        },
        409
      )
    }

    // Save report only.
    // Do not mark booking paid or confirmed.

    const {
      data: report,
      error: insertError,
    } = await db
      .from('vehicle_hire_bank_transfer_reports')
      .insert({
        vehicle_hire_request_id: id,
        sender_name: senderName,
        transfer_date: transferDate,
        transfer_time_wat: transferTimeWat,
        status: 'reported',
      })
      .select('id, status')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return respond(
          {
            error:
              'A payment report is already awaiting verification.',
          },
          409
        )
      }

      throw insertError
    }

    return respond(
      {
        ok: true,
        reportId: report.id,
        status: report.status,
        message:
          'Payment details received. Fountain Ride will verify the bank transfer before confirming your booking.',
      },
      201
    )
  } catch (error) {
    console.error(
      'Bank transfer reporting error:',
      error
    )

    return respond(
      {
        error:
          'Unable to submit payment details. Please try again.',
      },
      500
    )
  }
}
