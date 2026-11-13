
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getSupabaseAdmin } from '../../../../../../lib/server/supabaseAdmin'

type Context = {
  params: Promise<{ id: string }>
}

type DB = ReturnType<typeof getSupabaseAdmin>

function respond(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function safeEqual(a: string, b: string) {
  try {
    const left = Buffer.from(a)
    const right = Buffer.from(b)

    return (
      left.length === right.length &&
      crypto.timingSafeEqual(left, right)
    )
  } catch {
    return false
  }
}

async function customerHasAccess(
  db: DB,
  id: string,
  token: string
) {
  if (!token || token.length > 1024) return false

  const { data, error } = await db
    .from('driver_hire_customer_access')
    .select('access_token')
    .eq('driver_hire_request_id', id)
    .is('revoked_at', null)

  if (error) {
    throw new Error('Unable to verify booking access.')
  }

  return (data || []).some((row) =>
    safeEqual(
      token,
      String(row.access_token || '')
    )
  )
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00Z`)

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

async function loadPaymentState(db: DB, id: string) {
  const { data: booking, error: bookingError } =
    await db
      .from('driver_hire_requests')
      .select(
        'id, booking_ref, status, accepted_offer_id, currency'
      )
      .eq('id', id)
      .maybeSingle()

  if (bookingError) throw bookingError
  if (!booking) return null

  const [
    agreementResult,
    paymentsResult,
    reportResult,
  ] = await Promise.all([
    db
      .from('driver_hire_agreements')
      .select(
        'id, accepted_offer_id, agreed_amount, driver_application_id'
      )
      .eq('driver_hire_request_id', id)
      .maybeSingle(),

    db
      .from('driver_hire_payments')
      .select('id, status')
      .eq('driver_hire_request_id', id)
      .in('status', ['paid', 'pending'])
      .limit(1),

    db
      .from('driver_hire_bank_transfer_reports')
      .select(
        'id, status, sender_name, transfer_date, transfer_time_wat, created_at, verified_at'
      )
      .eq('driver_hire_request_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (agreementResult.error) {
    throw agreementResult.error
  }

  if (paymentsResult.error) {
    throw paymentsResult.error
  }

  if (reportResult.error) {
    throw reportResult.error
  }

  const agreement = agreementResult.data
  const report = reportResult.data
  const onlinePaymentExists =
    (paymentsResult.data || []).length > 0

  const eligible =
    booking.status === 'awaiting_payment' &&
    Boolean(booking.accepted_offer_id) &&
    Boolean(agreement) &&
    agreement?.accepted_offer_id ===
      booking.accepted_offer_id &&
    Number(agreement?.agreed_amount) > 0

  const existingReport =
    report?.status === 'reported' ||
    report?.status === 'verified'

  const bankName =
    process.env.FOUNTAIN_RIDE_BANK_NAME?.trim() || ''

  const accountName =
    process.env.FOUNTAIN_RIDE_BANK_ACCOUNT_NAME?.trim() || ''

  const accountNumber =
    process.env.FOUNTAIN_RIDE_BANK_ACCOUNT_NUMBER?.trim() || ''

  const bankConfigured =
    Boolean(bankName && accountName) &&
    /^\d{10}$/.test(accountNumber)

  const canReport =
    eligible &&
    bankConfigured &&
    !onlinePaymentExists &&
    !existingReport

  let reason = ''

  if (!bankConfigured) {
    reason = 'Bank transfer is not configured.'
  } else if (existingReport) {
    reason =
      report?.status === 'verified'
        ? 'Payment has already been verified.'
        : 'Your payment is awaiting verification.'
  } else if (onlinePaymentExists) {
    reason =
      'An online payment needs reconciliation. Please contact support before transferring money.'
  } else if (!eligible) {
    reason =
      'This booking is not eligible for payment.'
  }

  return {
    booking,
    agreement,
    report,
    canReport,
    reason,
    bankDetails: canReport
      ? { bankName, accountName, accountNumber }
      : null,
  }
}

// Customer checks bank details and report status.
export async function GET(
  req: NextRequest,
  context: Context
) {
  try {
    const { id } = await context.params
    const token =
      req.headers
        .get('x-driver-hire-access-token')
        ?.trim() || ''

    if (!id || !token) {
      return respond(
        { error: 'Customer access required.' },
        401
      )
    }

    const db = getSupabaseAdmin()

    if (!(await customerHasAccess(db, id, token))) {
      return respond(
        { error: 'Access denied.' },
        403
      )
    }

    const state = await loadPaymentState(db, id)

    if (!state) {
      return respond(
        { error: 'Booking not found.' },
        404
      )
    }

    return respond({
      ok: true,
      bookingRef: state.booking.booking_ref,
      agreedAmount:
        Number(state.agreement?.agreed_amount || 0),
      currency: state.booking.currency,
      canReport: state.canReport,
      reason: state.reason,
      bankDetails: state.bankDetails,
      report: state.report,
    })
  } catch (error) {
    console.error('Driver Hire bank lookup:', error)

    return respond(
      { error: 'Unable to load bank details.' },
      500
    )
  }
}

// Customer reports transfer details.
// This never confirms payment.
export async function POST(
  req: NextRequest,
  context: Context
) {
  try {
    const { id } = await context.params
    const token =
      req.headers
        .get('x-driver-hire-access-token')
        ?.trim() || ''

    if (!id || !token) {
      return respond(
        { error: 'Customer access required.' },
        401
      )
    }

    const db = getSupabaseAdmin()

    if (!(await customerHasAccess(db, id, token))) {
      return respond(
        { error: 'Access denied.' },
        403
      )
    }

    const body = await req.json().catch(() => null)

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
        { error: 'Enter a valid transfer date.' },
        400
      )
    }

    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(
        transferTimeWat
      )
    ) {
      return respond(
        { error: 'Enter a valid Nigerian transfer time.' },
        400
      )
    }

    const state = await loadPaymentState(db, id)

    if (!state) {
      return respond(
        { error: 'Booking not found.' },
        404
      )
    }

    if (!state.canReport) {
      return respond(
        {
          error:
            state.reason ||
            'Transfer reporting is unavailable.',
        },
        409
      )
    }

    const { data, error } = await db
      .from('driver_hire_bank_transfer_reports')
      .insert({
        driver_hire_request_id: id,
        sender_name: senderName,
        transfer_date: transferDate,
        transfer_time_wat: transferTimeWat,
        status: 'reported',
      })
      .select('id, status')
      .single()

    if (error) {
      if (error.code === '23505') {
        return respond(
          {
            error:
              'A payment report already exists for this booking.',
          },
          409
        )
      }

      throw error
    }

    return respond(
      {
        ok: true,
        reportId: data.id,
        status: data.status,
        message:
          'Your transfer details have been received. Fountain Ride will verify the bank credit before confirming your Driver Hire booking.',
      },
      201
    )
  } catch (error) {
    console.error(
      'Driver Hire bank transfer submission:',
      error
    )

    return respond(
      { error: 'Unable to submit transfer details.' },
      500
    )
  }
}
