import { NextResponse } from 'next/server'
import crypto from 'crypto'

import { settleVerifiedPaystackPayment } from '../../../../../lib/server/paystackSettlement'
import { settleVerifiedDriverHirePaystackPayment } from '../../../../../lib/server/driverHirePaystackSettlement'
import { settleVerifiedVehicleHirePaystackPayment } from '../../../../../lib/server/vehicleHirePaystackSettlement'

export async function POST(req: Request) {
  const secret =
    process.env.PAYSTACK_SECRET_KEY

  if (!secret) {
    return NextResponse.json(
      {
        error:
          'Payment provider not configured',
      },
      { status: 503 }
    )
  }

  // -------------------------------------------------------
  // 1. Verify that the webhook genuinely came from Paystack
  // -------------------------------------------------------

  const raw = await req.text()

  const signature =
    req.headers.get(
      'x-paystack-signature'
    ) || ''

  const expected =
    crypto
      .createHmac(
        'sha512',
        secret
      )
      .update(raw)
      .digest('hex')

  if (
    signature.length !==
      expected.length ||
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  ) {
    return NextResponse.json(
      {
        error:
          'Invalid signature',
      },
      { status: 401 }
    )
  }

  // -------------------------------------------------------
  // 2. Read Paystack event
  // -------------------------------------------------------

  let event: any

  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json(
      {
        error:
          'Invalid webhook payload',
      },
      { status: 400 }
    )
  }

  // We only settle successful charges here.
  if (
    event?.event !==
    'charge.success'
  ) {
    return NextResponse.json({
      ok: true,
    })
  }

  const reference =
    String(
      event?.data?.reference || ''
    ).trim()

  const amount =
    Number(
      event?.data?.amount || 0
    ) / 100

  const currency =
    String(
      event?.data?.currency || ''
    ).toUpperCase()

  if (!reference) {
    return NextResponse.json(
      {
        error:
          'Missing payment reference',
      },
      { status: 400 }
    )
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return NextResponse.json(
      {
        error:
          'Invalid payment amount',
      },
      { status: 400 }
    )
  }

  if (currency !== 'NGN') {
    return NextResponse.json(
      {
        error:
          'Unexpected payment currency',
      },
      { status: 400 }
    )
  }

  // -------------------------------------------------------
  // 3. Route payment to the correct Fountain Ride service
  //
  // FRVH-  = Vehicle Hire
  // FRDH-  = Driver Hire
  // FRPAY- = Passenger marketplace
  // -------------------------------------------------------

  try {
    if (
      reference.startsWith(
        'FRVH-'
      )
    ) {
      await settleVerifiedVehicleHirePaystackPayment({
        reference,
        amount,
      })

      return NextResponse.json({
        ok: true,
        paymentType:
          'vehicle_hire',
      })
    }

    if (
      reference.startsWith(
        'FRDH-'
      )
    ) {
      const paymentMode: 'test' | 'live' =
  secret.startsWith('sk_test_')
    ? 'test'
    : secret.startsWith('sk_live_')
      ? 'live'
      : (() => {
          throw new Error('Unrecognised Paystack key mode.')
        })()

await settleVerifiedDriverHirePaystackPayment({
  reference,
  amount,
  paymentMode,
})

      return NextResponse.json({
        ok: true,
        paymentType:
          'driver_hire',
      })
    }

    if (
      reference.startsWith(
        'FRPAY-'
      )
    ) {
      await settleVerifiedPaystackPayment({
        reference,
        amount,
      })

      return NextResponse.json({
        ok: true,
        paymentType:
          'passenger_ride',
      })
    }

    // Do not try to settle references that were
    // not created by a Fountain Ride payment flow.
    return NextResponse.json(
      {
        error:
          'Unknown Fountain Ride payment reference',
      },
      { status: 400 }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          'Unable to settle payment.',
      },
      { status: 400 }
    )
  }
}
