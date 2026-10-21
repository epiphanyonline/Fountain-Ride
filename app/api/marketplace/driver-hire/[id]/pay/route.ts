import { NextResponse } from 'next/server'
import crypto from 'crypto'

import { getSupabaseAdmin } from '../../../../../../lib/server/supabaseAdmin'
import { settleVerifiedDriverHirePaystackPayment } from '../../../../../../lib/server/driverHirePaystackSettlement'

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

  // -------------------------------------------------------
  // 1. Verify customer access to this exact request
  // -------------------------------------------------------

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

  // -------------------------------------------------------
  // 2. Load request
  // -------------------------------------------------------

  const {
    data: hireRequest,
    error: requestError,
  } = await db
    .from('driver_hire_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (
    requestError ||
    !hireRequest
  ) {
    return NextResponse.json(
      {
        error:
          requestError?.message ||
          'Driver Hire request not found.',
      },
      { status: 404 }
    )
  }

  if (
    hireRequest.status !==
    'awaiting_payment'
  ) {
    return NextResponse.json(
      {
        error:
          'This Driver Hire request is not awaiting payment.',
      },
      { status: 409 }
    )
  }

  if (
    !hireRequest.accepted_offer_id ||
    !hireRequest
      .selected_driver_application_id
  ) {
    return NextResponse.json(
      {
        error:
          'No accepted driver quotation is attached to this request.',
      },
      { status: 409 }
    )
  }

  // -------------------------------------------------------
  // 3. Load immutable agreement
  // -------------------------------------------------------

  const {
    data: agreement,
    error: agreementError,
  } = await db
    .from('driver_hire_agreements')
    .select('*')
    .eq(
      'driver_hire_request_id',
      id
    )
    .single()

  if (
    agreementError ||
    !agreement
  ) {
    return NextResponse.json(
      {
        error:
          agreementError?.message ||
          'Driver Hire agreement not found.',
      },
      { status: 409 }
    )
  }

  if (
    agreement.accepted_offer_id !==
      hireRequest.accepted_offer_id ||
    agreement.driver_application_id !==
      hireRequest
        .selected_driver_application_id
  ) {
    return NextResponse.json(
      {
        error:
          'Driver Hire agreement does not match the selected quotation.',
      },
      { status: 409 }
    )
  }

  const paymentCurrency =
    String(hireRequest.currency || 'NGN').trim().toUpperCase()

  if (paymentCurrency !== 'NGN') {
    return NextResponse.json(
      { error: 'Unsupported Driver Hire payment currency.' },
      { status: 409 }
    )
  }
  const amount =
    Number(agreement.agreed_amount)

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return NextResponse.json(
      {
        error:
          'The agreed payment amount is invalid.',
      },
      { status: 409 }
    )
  }

  // -------------------------------------------------------
  // 4. Paystack configuration
  // -------------------------------------------------------

  const secret =
    process.env.PAYSTACK_SECRET_KEY

  if (!secret) {
    return NextResponse.json(
      {
        error:
          'Online payment is not configured yet.',
      },
      { status: 503 }
    )
  }

  const email =
    hireRequest.customer_email ||
    process.env.PAYSTACK_FALLBACK_EMAIL

  if (!email) {
    return NextResponse.json(
      {
        error:
          'An email address is required for online payment.',
      },
      { status: 400 }
    )
  }

  // -------------------------------------------------------
  // 5. Commission snapshot
  // -------------------------------------------------------

  const {
    data: driver,
    error: driverError,
  } = await db
    .from('driver_applications')
    .select('commission_rate')
    .eq(
      'id',
      agreement.driver_application_id
    )
    .single()

  if (driverError) {
    return NextResponse.json(
      { error: driverError.message },
      { status: 500 }
    )
  }

  const commissionRate =
    Number(
      driver?.commission_rate ?? 10
    )

  const platformFee =
    Number(
      (
        amount *
        commissionRate /
        100
      ).toFixed(2)
    )

  const driverNet =
    Number(
      (
        amount -
        platformFee
      ).toFixed(2)
    )

  // -------------------------------------------------------
  // Existing payment protection
  const { data: existingPayments, error: existingPaymentError } =
    await db
      .from('driver_hire_payments')
      .select('status, provider_reference')
      .eq('driver_hire_request_id', id)
      .in('status', ['pending', 'paid'])
      .limit(10)

  if (existingPaymentError) {
    return NextResponse.json(
      { error: 'Unable to check existing payments.' },
      { status: 500 }
    )
  }

  if (existingPayments?.some(payment => payment.status === 'paid')) {
    return NextResponse.json(
      { error: 'This booking has already been paid.' },
      { status: 409 }
    )
  }

  if (existingPayments?.some(payment => payment.status === 'pending')) {
    return NextResponse.json(
      {
        error:
          'A payment attempt already exists for this booking. Please verify its status before starting another payment.',
      },
      { status: 409 }
    )
  }
  // 6. Create our own payment reference first
  // -------------------------------------------------------

  const reference =
    `FRDH-${Date.now()}-${crypto
      .randomBytes(3)
      .toString('hex')
      .toUpperCase()}`

  const {
    error: insertError,
  } = await db
    .from('driver_hire_payments')
    .insert({
      driver_hire_request_id:
        id,

      driver_application_id:
        agreement.driver_application_id,

      provider:
        'paystack',

      provider_reference:
        reference,

      gross_amount:
        amount,

      platform_fee:
        platformFee,

      driver_net:
        driverNet,

      currency:
        paymentCurrency,

      status:
        'pending',
    })

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    )
  }

  // -------------------------------------------------------
  // 7. Initialize Paystack
  // -------------------------------------------------------

  const site =
    (
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(req.url).origin
    ).replace(/\/$/, '')

  const response =
    await fetch(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${secret}`,

          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          email,

          amount:
            Math.round(
              amount * 100
            ),

          currency:
            'NGN',

          reference,

          callback_url:
            `${site}/hire-driver/requests/${id}`,

          metadata: {
            payment_type:
              'driver_hire',

            driver_hire_request_id:
              id,

            booking_ref:
              hireRequest.booking_ref,

            agreement_id:
              agreement.id,

            driver_application_id:
              agreement.driver_application_id,
          },
        }),
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
      ?.authorization_url
  ) {

    return NextResponse.json(
      {
        error:
          data?.message ||
          'Payment initialization could not be confirmed. Please check the existing transaction before retrying.',
      },
      { status: 502 }
    )
  }

  // Store the checkout URL for interrupted-payment recovery.
  const { data: savedPayment, error: checkoutUrlError } = await db
    .from('driver_hire_payments')
    .update({
      authorization_url: data.data.authorization_url,
      updated_at: new Date().toISOString(),
    })
    .eq('driver_hire_request_id', id)
    .eq('provider_reference', reference)
    .eq('status', 'pending')
    .select('id, authorization_url')
    .maybeSingle()

  if (
    checkoutUrlError ||
    !savedPayment ||
    savedPayment.authorization_url !== data.data.authorization_url
  ) {
    return NextResponse.json(
      {
        error:
          'Payment was initialized but its checkout link could not be saved. Please contact support before retrying.',
      },
      { status: 503 }
    )
  }
  // -------------------------------------------------------
  // 8. Update access activity
  // -------------------------------------------------------

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
    authorizationUrl:
      data.data.authorization_url,

    reference,

    amount,

    currency:
      paymentCurrency,
  })
}
