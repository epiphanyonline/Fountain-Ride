import { NextResponse } from 'next/server'
import crypto from 'crypto'

import { getSupabaseAdmin } from '../../../../../../../lib/server/supabaseAdmin'
import { settleVerifiedVehicleHirePaystackPayment } from '../../../../../../../lib/server/vehicleHirePaystackSettlement'

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

  // ---------------------------------------------------------
  // 1. VERIFY CUSTOMER ACCESS
  // ---------------------------------------------------------

  const suppliedToken =
    req.headers.get(
      'x-vehicle-hire-access-token'
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
    .from(
      'vehicle_hire_customer_access'
    )
    .select('*')
    .eq(
      'vehicle_hire_request_id',
      id
    )
    .is('revoked_at', null)
    .maybeSingle()

  if (
    accessError ||
    !access ||
    !safeEqual(
      suppliedToken,
      String(
        access.access_token || ''
      )
    )
  ) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // ---------------------------------------------------------
  // 2. GET PAYSTACK REFERENCE
  // ---------------------------------------------------------

  const body =
    await req.json().catch(
      () => null
    )

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

  // ---------------------------------------------------------
  // 3. ENSURE REFERENCE WAS CREATED BY FOUNTAIN RIDE
  // ---------------------------------------------------------

  const {
    data: localPayment,
    error: localPaymentError,
  } = await db
    .from(
      'vehicle_hire_payments'
    )
    .select(
      `
        id,
        vehicle_hire_request_id,
        vehicle_hire_agreement_id,
        reference,
        amount,
        currency,
        status
      `
    )
    .eq(
      'provider',
      'paystack'
    )
    .eq(
      'reference',
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
      .vehicle_hire_request_id !==
    id
  ) {
    return NextResponse.json(
      {
        error:
          'Payment reference does not belong to this Vehicle Hire request.',
      },
      { status: 403 }
    )
  }

  // ---------------------------------------------------------
  // 4. PAYSTACK CONFIGURATION
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // 5. VERIFY DIRECTLY WITH PAYSTACK
  // ---------------------------------------------------------

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

        cache:
          'no-store',
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

  // ---------------------------------------------------------
  // 6. PAYSTACK MUST REPORT SUCCESS
  // ---------------------------------------------------------

  if (
    data.data.status !==
    'success'
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

  // ---------------------------------------------------------
  // 7. VERIFY CURRENCY
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // 8. VERIFY EXACT AMOUNT
  //
  // Paystack returns amount in kobo.
  // ---------------------------------------------------------

  const amount =
    Number(
      data.data.amount || 0
    ) / 100

  if (
    Math.abs(
      amount -
        Number(
          localPayment.amount
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

  // ---------------------------------------------------------
  // 9. SETTLE VERIFIED PAYMENT
  // ---------------------------------------------------------

  try {
    const settlement =
      await settleVerifiedVehicleHirePaystackPayment({
        reference,
        amount,
        expectedRequestId:
          id,
      })

    await db
      .from(
        'vehicle_hire_customer_access'
      )
      .update({
        last_used_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        access.id
      )

    return NextResponse.json({
      ok: true,
      settlement,
    })
  } catch (error: any) {
    console.error(
      'Vehicle Hire settlement error:',
      error
    )

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Unable to settle verified Vehicle Hire payment.',
      },
      { status: 409 }
    )
  }
}
