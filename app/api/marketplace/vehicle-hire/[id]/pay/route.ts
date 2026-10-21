import {
  NextRequest,
  NextResponse,
} from 'next/server'

import crypto from 'crypto'

import { getSupabaseAdmin } from '../../../../../../lib/server/supabaseAdmin'

function safeEqual(
  supplied: string,
  stored: string
) {
  try {
    const left =
      Buffer.from(supplied)

    const right =
      Buffer.from(stored)

    return (
      left.length === right.length &&
      crypto.timingSafeEqual(
        left,
        right
      )
    )
  } catch {
    return false
  }
}

export async function POST(
  req: NextRequest,
  context: {
    params: Promise<{
      id: string
    }>
  }
) {
  try {
    const { id } =
      await context.params

    if (!id) {
      return NextResponse.json(
        {
          error:
            'Vehicle Hire request ID is required.',
        },
        {
          status: 400,
        }
      )
    }

    const db =
      getSupabaseAdmin()

    // -------------------------------------------------------
    // 1. VERIFY CUSTOMER ACCESS
    // -------------------------------------------------------

    const suppliedToken =
      req.headers
        .get(
          'x-vehicle-hire-access-token'
        )
        ?.trim() || ''

    if (!suppliedToken) {
      return NextResponse.json(
        {
          error:
            'Customer access token is required.',
        },
        {
          status: 401,
        }
      )
    }

    const {
      data: access,
      error: accessError,
    } = await db
      .from(
        'vehicle_hire_customer_access'
      )
      .select(
        `
          id,
          vehicle_hire_request_id,
          access_token,
          revoked_at
        `
      )
      .eq(
        'vehicle_hire_request_id',
        id
      )
      .is(
        'revoked_at',
        null
      )
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
        {
          error:
            'You do not have access to this Vehicle Hire request.',
        },
        {
          status: 403,
        }
      )
    }

    // -------------------------------------------------------
    // 2. LOAD REQUEST
    // -------------------------------------------------------

    const {
      data: hireRequest,
      error: requestError,
    } = await db
      .from(
        'vehicle_hire_requests'
      )
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (
      requestError ||
      !hireRequest
    ) {
      return NextResponse.json(
        {
          error:
            requestError?.message ||
            'Vehicle Hire request not found.',
        },
        {
          status: 404,
        }
      )
    }

    if (
      hireRequest.status !==
      'awaiting_payment'
    ) {
      return NextResponse.json(
        {
          error:
            'This Vehicle Hire request is not awaiting payment.',
        },
        {
          status: 409,
        }
      )
    }

    if (
      !hireRequest.selected_offer_id ||
      !hireRequest.agreed_amount
    ) {
      return NextResponse.json(
        {
          error:
            'No accepted Vehicle Hire quotation is attached to this request.',
        },
        {
          status: 409,
        }
      )
    }

    // -------------------------------------------------------
    // 3. LOAD IMMUTABLE AGREEMENT
    // -------------------------------------------------------

    const {
      data: agreement,
      error: agreementError,
    } = await db
      .from(
        'vehicle_hire_agreements'
      )
      .select('*')
      .eq(
        'vehicle_hire_request_id',
        id
      )
      .maybeSingle()

    if (
      agreementError ||
      !agreement
    ) {
      return NextResponse.json(
        {
          error:
            agreementError?.message ||
            'Vehicle Hire agreement not found.',
        },
        {
          status: 409,
        }
      )
    }

    if (
      agreement.accepted_offer_id !==
        hireRequest.selected_offer_id ||
      agreement.car_id !==
        hireRequest.car_id
    ) {
      return NextResponse.json(
        {
          error:
            'Vehicle Hire agreement does not match the accepted quotation.',
        },
        {
          status: 409,
        }
      )
    }

    const amount =
      Number(
        agreement.agreed_amount
      )

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            'The agreed payment amount is invalid.',
        },
        {
          status: 409,
        }
      )
    }

    // -------------------------------------------------------
    // 4. PAYSTACK CONFIGURATION
    // -------------------------------------------------------

    const secret =
      process.env
        .PAYSTACK_SECRET_KEY

    if (!secret) {
      return NextResponse.json(
        {
          error:
            'Online payment is not configured yet.',
        },
        {
          status: 503,
        }
      )
    }

    const email =
      hireRequest.customer_email ||
      process.env
        .PAYSTACK_FALLBACK_EMAIL

    if (!email) {
      return NextResponse.json(
        {
          error:
            'An email address is required for online payment.',
        },
        {
          status: 400,
        }
      )
    }

    // -------------------------------------------------------
    // 5. PREVENT DUPLICATE LIVE PAYMENT INITIALIZATION
    //
    // If there is already a paid payment, the customer
    // should not initialize another one.
    //
    // Failed attempts do not block a retry.
    // -------------------------------------------------------

    const {
      data: existingPayments,
      error: existingPaymentError,
    } = await db
      .from(
        'vehicle_hire_payments'
      )
      .select(
        `
          id,
          reference,
          status
        `
      )
      .eq(
        'vehicle_hire_request_id',
        id
      )
      .order(
        'created_at',
        {
          ascending: false,
        }
      )

    if (existingPaymentError) {
      console.error(
        'Vehicle Hire existing payment lookup failed:',
        existingPaymentError
      )

      return NextResponse.json(
        {
          error:
            'Unable to check payment status.',
        },
        {
          status: 500,
        }
      )
    }

    const paidPayment =
      (existingPayments || []).find(
        payment =>
          payment.status === 'paid'
      )

    if (paidPayment) {
      return NextResponse.json(
        {
          error:
            'This Vehicle Hire booking has already been paid.',
        },
        {
          status: 409,
        }
      )
    }

    // -------------------------------------------------------
    // 6. CREATE OUR PAYMENT REFERENCE
    // -------------------------------------------------------

    const reference =
      `FRVH-${Date.now()}-${crypto
        .randomBytes(3)
        .toString('hex')
        .toUpperCase()}`

    const currency =
      hireRequest.currency ||
      'NGN'

    const {
      error: insertError,
    } = await db
      .from(
        'vehicle_hire_payments'
      )
      .insert({
        vehicle_hire_request_id:
          id,

        vehicle_hire_agreement_id:
          agreement.id,

        reference,

        amount,

        currency,

        status:
          'pending',

        provider:
          'paystack',
      })

    if (insertError) {
      console.error(
        'Vehicle Hire payment insert failed:',
        insertError
      )

      return NextResponse.json(
        {
          error:
            insertError.message,
        },
        {
          status: 500,
        }
      )
    }

    // -------------------------------------------------------
    // 7. INITIALIZE PAYSTACK
    // -------------------------------------------------------

    const site =
      (
        process.env
          .NEXT_PUBLIC_SITE_URL ||
        new URL(req.url).origin
      ).replace(/\/$/, '')

    const paystackResponse =
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

            currency,

            reference,

            callback_url:
              `${site}/vehicle-hire/requests/${id}`,

            metadata: {
              payment_type:
                'vehicle_hire',

              vehicle_hire_request_id:
                id,

              booking_ref:
                hireRequest.booking_ref,

              agreement_id:
                agreement.id,

              accepted_offer_id:
                agreement.accepted_offer_id,

              car_id:
                agreement.car_id,
            },
          }),
        }
      )

    const data =
      await paystackResponse
        .json()
        .catch(() => null)

    if (
      !paystackResponse.ok ||
      !data?.status ||
      !data?.data
        ?.authorization_url
    ) {
      await db
        .from(
          'vehicle_hire_payments'
        )
        .update({
          status:
            'failed',

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'reference',
          reference
        )

      return NextResponse.json(
        {
          error:
            data?.message ||
            'Unable to initialize payment.',
        },
        {
          status: 502,
        }
      )
    }

    // -------------------------------------------------------
    // 8. UPDATE CUSTOMER ACCESS ACTIVITY
    // -------------------------------------------------------

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

    // -------------------------------------------------------
    // IMPORTANT:
    //
    // We DO NOT:
    // - mark the booking confirmed
    // - mark the payment paid
    // - create owner earnings
    //
    // Those actions happen only after Paystack verifies
    // that this exact transaction was actually successful.
    // -------------------------------------------------------

    return NextResponse.json({
      authorizationUrl:
        data.data.authorization_url,

      reference,

      amount,

      currency,
    })
  } catch (error) {
    console.error(
      'Vehicle Hire payment initialization error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to initialize Vehicle Hire payment.',
      },
      {
        status: 500,
      }
    )
  }
}
