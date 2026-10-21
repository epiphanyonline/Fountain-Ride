import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import {
  previewTestDriverWithdrawals,
  inspectTestWithdrawalRecovery,
  checkTestWithdrawalRecoveryEligibility,
  recoverPendingTestDriverTransfers,
  processOneTestDriverWithdrawal,
  prepareTestDriverWithdrawal,
  assertTestPayoutTransfersEnabled,
} from '../../../../lib/server/driverWithdrawalProcessor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const secret = process.env.DRIVER_PAYOUT_CRON_SECRET

  if (!secret || secret.length < 32) {
    return NextResponse.json(
      { error: 'Payout preview is not configured.' },
      { status: 503 }
    )
  }

  const authorization = req.headers.get('authorization') || ''
  const expected = `Bearer ${secret}`

  const suppliedBuffer = Buffer.from(authorization)
  const expectedBuffer = Buffer.from(expected)

  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const url = new URL(req.url)
    const view = url.searchParams.get('view')

    const result =
      view === 'eligibility'
        ? await (async () => {
            const withdrawalId = url.searchParams.get('withdrawalId') || ''

            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(withdrawalId)) {
              return { eligible: false, reason: 'invalid_withdrawal_id' }
            }

            return checkTestWithdrawalRecoveryEligibility(withdrawalId)
          })()
        : view === 'recovery'
          ? await inspectTestWithdrawalRecovery()
          : await previewTestDriverWithdrawals()

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Payout preview error:', error)

    return NextResponse.json(
      { error: 'Unable to preview driver payouts.' },
      { status: 500 }
    )
  }
}


export async function POST(req: Request) {
  const secret = process.env.DRIVER_PAYOUT_CRON_SECRET

  if (!secret || secret.length < 32) {
    return NextResponse.json(
      { error: 'Payout processing is not configured.' },
      { status: 503 }
    )
  }

  const authorization = req.headers.get('authorization') || ''
  const expected = `Bearer ${secret}`

  const suppliedBuffer = Buffer.from(authorization)
  const expectedBuffer = Buffer.from(expected)

  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // All payout actions require bearer authentication.
  // New TEST transfers additionally require explicit
  // confirmation and the TEST-only execution switch.
  try {
    const body = await req.json().catch(() => null)

    if (!body || typeof body !== 'object') {
  return NextResponse.json(
    { error: 'Invalid request body.' },
    { status: 400 }
  )
}

if (body.action === 'recover-test-transfers') {
  if (body.confirm !== 'RECOVER_TEST_ONLY') {
    return NextResponse.json(
      { error: 'Recovery confirmation required.' },
      { status: 400 }
    )
  }

  const result = await recoverPendingTestDriverTransfers()

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

    if (body.action === 'register-one-test-recipient') {
      if (
        body.confirm !== 'REGISTER_TEST_RECIPIENT_ONLY' ||
        body.mode !== 'test' ||
        typeof body.withdrawalId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.withdrawalId)
      ) {
        return NextResponse.json(
          { error: 'Valid TEST withdrawal and recipient-only confirmation required.' },
          { status: 400 }
        )
      }

      if (
        !process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_test_') ||
        process.env.DRIVER_PAYOUT_RECIPIENT_REGISTRATION_ENABLED !== 'true'
      ) {
        return NextResponse.json(
          { error: 'TEST recipient registration is disabled.' },
          { status: 503 }
        )
      }

      const result = await prepareTestDriverWithdrawal(body.withdrawalId)

      return NextResponse.json(
        {
          ...result,
          transferSubmitted: false,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }
    if (body.action === 'execute-one-test-withdrawal') {
      if (
        body.confirm !== 'EXECUTE_ONE_TEST_WITHDRAWAL' ||
        body.mode !== 'test' ||
        typeof body.withdrawalId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          body.withdrawalId
        )
      ) {
        return NextResponse.json(
          { error: 'Valid TEST withdrawal and explicit confirmation required.' },
          { status: 400 }
        )
      }

      // No Paystack call or database mutation unless
      // the TEST-only payout safety switch is enabled.
      if (
        !process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_test_') ||
        process.env.DRIVER_PAYOUT_TRANSFERS_ENABLED !== 'true'
      ) {
        return NextResponse.json(
          { error: 'TEST payout execution is disabled.' },
          { status: 503 }
        )
      }

      assertTestPayoutTransfersEnabled()

      const result = await processOneTestDriverWithdrawal(
        body.withdrawalId
      )

      return NextResponse.json(result, {
        headers: { 'Cache-Control': 'no-store' },
      })
    }

if (body.dryRun !== true) {
  return NextResponse.json(
    { error: 'Only dry-run requests are permitted.' },
    { status: 400 }
  )
}

const result = await previewTestDriverWithdrawals()

    return NextResponse.json(
      {
        ...result,
        executionEnabled: false,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch {
    return NextResponse.json(
      { error: 'Unable to preview payout processing.' },
      { status: 500 }
    )
  }
}
