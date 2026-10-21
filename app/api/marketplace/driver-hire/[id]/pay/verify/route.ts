import { NextResponse } from 'next/server'
import crypto from 'crypto'

import { getSupabaseAdmin } from '../../../../../../../lib/server/supabaseAdmin'
import { settleVerifiedDriverHirePaystackPayment } from '../../../../../../../lib/server/driverHirePaystackSettlement'

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)

  return (
    left.length === right.length &&
    crypto.timingSafeEqual(left, right)
  )
}

export async function POST(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>
  }
) {
  const { id } = await params
  const db = getSupabaseAdmin()

  // Verify customer access
  const suppliedToken =
    req.headers.get(
      'x-driver-hire-access-token'
    ) || ''

  if (!suppliedToken) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const {
    data: access,
    error: accessError,
  } = await db
    .from('driver_hire_customer_access')
    .select('*')
    .eq(
      'driver_hire_request_id',
      id
    )
    .eq('access_token', suppliedToken)
    .is('revoked_at', null)
    .maybeSingle()

  if (
    accessError ||
    !access ||
    !safeEqual(
      suppliedToken,
      String(access.access_token || '')
    )
  ) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Get Paystack reference supplied after checkout
  const body =
    await req.json().catch(() => null)

  const reference =
    String(
      body?.reference || ''
    ).trim()

  if (!reference) {
    return NextResponse.json(
      {
        error:
          'Payment reference is required.',
      },
      { status: 400 }
    )
  }

  // Ensure this reference was created for this request
  const {
    data: localPayment,
    error: localPaymentError,
  } = await db
    .from('driver_hire_payments')
    .select(
      'id, driver_hire_request_id, provider_reference, gross_amount, currency, status'
    )
    .eq(
      'provider',
      'paystack'
    )
    .eq(
      'provider_reference',
      reference
    )
    .maybeSingle()

  if (
    localPaymentError ||
    !localPayment
  ) {
    return NextResponse.json(
      {
        error:
          'Payment reference was not created by Fountain Ride.',
      },
      { status: 404 }
    )
  }

  if (
    localPayment
      .driver_hire_request_id !== id
  ) {
    return NextResponse.json(
      {
        error:
          'Payment reference does not belong to this Driver Hire request.',
      },
      { status: 403 }
    )
  }

  // Paystack configuration
  const secret =
    process.env.PAYSTACK_SECRET_KEY

  if (!secret) {
    return NextResponse.json(
      {
        error:
          'Payment provider is not configured.',
      },
      { status: 503 }
    )
  }

  const paymentMode: 'test' | 'live' =
  secret.startsWith('sk_test_')
    ? 'test'
    : secret.startsWith('sk_live_')
      ? 'live'
      : (() => {
          throw new Error('Unrecognised Paystack key mode.')
        })()

  // Verify directly with Paystack
  const response =
    await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        headers: {
          Authorization:
            `Bearer ${secret}`,
        },
        cache: 'no-store',
      }
    )

  const data =
    await response
      .json()
      .catch(() => null)

  if (
    !response.ok ||
    !data?.status ||
    !data?.data
  ) {
    return NextResponse.json(
      {
        error:
          data?.message ||
          'Unable to verify payment with Paystack.',
      },
      { status: 502 }
    )
  }

  if (
    String(data.data.reference || '') !== reference
  ) {
    return NextResponse.json(
      {
        error: 'Paystack transaction reference mismatch.',
      },
      { status: 409 }
    )
  }
  if (
    data.data.status !== 'success'
  ) {
    return NextResponse.json(
      {
        error:
          `Payment is ${
            data.data.status ||
            'not successful'
          }.`,
      },
      { status: 409 }
    )
  }

  if (
    String(
      data.data.currency || ''
    ).toUpperCase() !==
    String(
      localPayment.currency ||
      'NGN'
    ).toUpperCase()
  ) {
    return NextResponse.json(
      {
        error:
          'Unexpected payment currency.',
      },
      { status: 400 }
    )
  }

  const amount =
    Number(
      data.data.amount || 0
    ) / 100

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: 'Invalid verified payment amount.' },
      { status: 409 }
    )
  }

  if (
    Math.abs(
      amount -
        Number(
          localPayment.gross_amount
        )
    ) > 0.01
  ) {
    return NextResponse.json(
      {
        error:
          'Verified payment amount does not match the agreed amount.',
      },
      { status: 409 }
    )
  }

  // Settle only after successful Paystack verification
  try {
    const settlement =
  await settleVerifiedDriverHirePaystackPayment({
    reference,
    amount,
    expectedRequestId: id,
    paymentMode,
  })

    await db
      .from(
        'driver_hire_customer_access'
      )
      .update({
        last_used_at:
          new Date().toISOString(),
      })
      .eq('id', access.id)

    return NextResponse.json({
      ok: true,
      settlement,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          'Unable to settle verified Driver Hire payment.',
      },
      { status: 409 }
    )
  }
}
