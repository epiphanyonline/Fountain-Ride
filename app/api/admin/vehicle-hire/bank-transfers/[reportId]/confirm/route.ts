
import { NextRequest, NextResponse } from 'next/server'

import { getSupabaseAdmin } from '../../../../../../../lib/server/supabaseAdmin'
import { isAdminSession } from '../../../../../../../lib/server/adminSession'

type Context = {
  params: Promise<{
    reportId: string
  }>
}

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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function POST(
  req: NextRequest,
  context: Context
) {
  try {
    // ---------------------------------------
    // 1. Require a real admin session.
    // ---------------------------------------

    const authenticated =
      await isAdminSession()

    if (!authenticated) {
      return respond(
        {
          error:
            'Admin authentication required.',
        },
        401
      )
    }

    // Reject cross-origin browser requests.
    const origin = req.headers.get('origin')

    if (
      origin &&
      origin !== new URL(req.url).origin
    ) {
      return respond(
        { error: 'Invalid request origin.' },
        403
      )
    }

    // ---------------------------------------
    // 2. Validate the payment report ID.
    // ---------------------------------------

    const { reportId } =
      await context.params

    if (!isUuid(reportId)) {
      return respond(
        {
          error:
            'Invalid payment report ID.',
        },
        400
      )
    }

    // ---------------------------------------
    // 3. Read admin verification details.
    // ---------------------------------------

    const body =
      await req.json().catch(() => null)

    if (
      !body ||
      typeof body !== 'object'
    ) {
      return respond(
        {
          error:
            'Payment verification details are required.',
        },
        400
      )
    }

    const rawAmount =
      body.verifiedAmount

    const amount =
      Number(rawAmount)

    const bankCreditReference =
      typeof body.bankCreditReference === 'string'
        ? body.bankCreditReference.trim()
        : ''

    const creditChecked =
      body.creditChecked === true

    // The administrator must explicitly
    // confirm checking the real bank credit.

    if (!creditChecked) {
      return respond(
        {
          error:
            'Confirm that you have checked the actual bank credit.',
        },
        400
      )
    }

    if (
      rawAmount === null ||
      rawAmount === undefined ||
      String(rawAmount).trim() === '' ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isSafeInteger(
        Math.round(amount * 100)
      ) ||
      Math.abs(
        amount * 100 -
        Math.round(amount * 100)
      ) > 0.000001
    ) {
      return respond(
        {
          error:
            'Enter a valid verified payment amount.',
        },
        400
      )
    }

    if (
      bankCreditReference.length < 6 ||
      bankCreditReference.length > 120 ||
      /[\x00-\x1F\x7F]/.test(
        bankCreditReference
      )
    ) {
      return respond(
        {
          error:
            'Enter the unique transaction identifier shown on your bank statement.',
        },
        400
      )
    }

    // ---------------------------------------
    // 4. Call the protected atomic function.
    // ---------------------------------------

    const db = getSupabaseAdmin()

    const {
      data,
      error,
    } = await db.rpc(
      'confirm_vehicle_hire_bank_transfer',
      {
        p_report_id: reportId,
        p_verified_amount:
          Number(amount.toFixed(2)),
        p_bank_credit_reference:
          bankCreditReference,
      }
    )

    if (error) {
      console.error(
        'Bank transfer approval failed:',
        error
      )

      // Expected business-rule rejections.
      // Avoid exposing arbitrary database errors.

      const knownErrors = [
        'An online payment requires reconciliation before bank approval.',
        'Booking is not awaiting payment.',
        'Owner earnings already exist for this booking.',
        'Verified bank credit does not match the agreed amount.',
        'Booking agreement mismatch.',
        'This report cannot be approved.',
        'Bank transfer report not found.',
      ]

      const message = knownErrors.find(
        text => error.message.includes(text)
      )

      return respond(
        {
          error:
            message ||
            'Unable to approve the bank transfer. Check the booking and server logs.',
        },
        409
      )
    }

    return respond({
      ok: true,
      result: data,
      message:
        data?.alreadyVerified
          ? 'This payment was already verified.'
          : 'Bank transfer verified and booking confirmed.',
    })

  } catch (error) {
    console.error(
      'Bank transfer confirmation error:',
      error
    )

    return respond(
      {
        error:
          'Unable to confirm the bank transfer.',
      },
      500
    )
  }
}
