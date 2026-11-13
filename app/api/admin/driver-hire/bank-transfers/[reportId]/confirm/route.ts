
import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'node:crypto'

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
    // 1. Admin authentication.
    const authenticated = await isAdminSession()

    if (!authenticated) {
      return respond(
        { error: 'Admin authentication required.' },
        401
      )
    }

    // 2. Reject requests from other origins.
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

    // 3. Validate report ID.
    const { reportId } = await context.params

    if (!isUuid(reportId)) {
      return respond(
        { error: 'Invalid payment report ID.' },
        400
      )
    }

    // 4. Read admin verification details.
    const body = await req.json().catch(() => null)

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      return respond(
        {
          error:
            'Payment verification details are required.',
        },
        400
      )
    }

    if (body.creditChecked !== true) {
      return respond(
        {
          error:
            'You must confirm checking the actual bank credit.',
        },
        400
      )
    }

    const amountInput =
      typeof body.verifiedAmount === 'number' ||
      typeof body.verifiedAmount === 'string'
        ? String(body.verifiedAmount).trim()
        : ''

    // Positive amounts, maximum two decimal places.
    if (
      !/^[0-9]{1,12}(\.[0-9]{1,2})?$/.test(
        amountInput
      )
    ) {
      return respond(
        { error: 'Enter a valid verified amount.' },
        400
      )
    }

    const verifiedAmount = Number(amountInput)

    if (
      !Number.isFinite(verifiedAmount) ||
      verifiedAmount <= 0
    ) {
      return respond(
        { error: 'Invalid verified amount.' },
        400
      )
    }

    const bankCreditReference =
      typeof body.bankCreditReference === 'string'
        ? body.bankCreditReference.trim()
        : ''

    if (
      bankCreditReference.length < 4 ||
      bankCreditReference.length > 160
    ) {
      return respond(
        {
          error:
            'Enter the unique bank statement transaction reference.',
        },
        400
      )
    }

    // 5. Generate a secure four-digit PIN.
    const jobStartPin = randomInt(0, 10000)
      .toString()
      .padStart(4, '0')

    // 6. Call the protected atomic settlement function.
    const db = getSupabaseAdmin()

    const { data, error } = await db.rpc(
      'confirm_driver_hire_bank_transfer',
      {
        p_report_id: reportId,
        p_verified_amount: verifiedAmount,
        p_bank_credit_reference:
          bankCreditReference,
        p_job_start_pin: jobStartPin,
      }
    )

    if (error) {
      console.error(
        'Driver Hire bank settlement rejected:',
        error
      )

      if (error.code === '23505') {
        return respond(
          {
            error:
              'This bank credit reference is already associated with another payment.',
          },
          409
        )
      }

      return respond(
        {
          error:
            'Payment could not be confirmed. Check the booking amount, existing payments and bank reference.',
        },
        409
      )
    }

    if (!data || data.ok !== true) {
      return respond(
        { error: 'Unexpected settlement result.' },
        500
      )
    }

    return respond({
      ok: true,
      message:
        'Bank payment verified and Driver Hire booking confirmed.',
      settlement: data,
    })
  } catch (error) {
    console.error(
      'Driver Hire admin confirmation failed:',
      error
    )

    return respond(
      {
        error:
          'Unable to confirm Driver Hire bank payment.',
      },
      500
    )
  }
}
