import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../lib/server/supabaseAdmin'
import {
  getDriverForToken,
  driverToken,
  driverApplicationId,
} from '../../../../../lib/server/marketplaceAuth'
import { walletPinMatches } from '../../../../../lib/server/driverSecurity'

async function payoutState(db: any, driverId: string) {
  const now = new Date()

  const { data: pending, error: pendingError } = await db
    .from('driver_payout_accounts')
    .select('*')
    .eq('driver_application_id', driverId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (pendingError) throw pendingError

  if (pending && new Date(pending.available_from) <= now) {
    const { error: promotionError } = await db.rpc(
      'promote_driver_payout_account_atomic',
      { p_driver_application_id: driverId }
    )

    if (promotionError) throw promotionError
  }
  const { data: accounts, error: accountsError } = await db
    .from('driver_payout_accounts')
    .select('*')
    .eq('driver_application_id', driverId)
    .in('status', ['active', 'pending'])
    .order('created_at', { ascending: false })

  if (accountsError) throw accountsError

  return {
    active: (accounts || []).find((a: any) => a.status === 'active') || null,
    pending: (accounts || []).find((a: any) => a.status === 'pending') || null,
  }
}

async function getAvailableBalance(db: any, driverId: string) {
  const paystackKey = process.env.PAYSTACK_SECRET_KEY || ''

  const payoutMode =
    paystackKey.startsWith('sk_test_') ? 'test' :
    paystackKey.startsWith('sk_live_') ? 'live' :
    null

  if (!payoutMode) {
    throw new Error('Paystack payout mode is not configured')
  }

  const [hireResult, withdrawalsResult] = await Promise.all([
    db.from('driver_hire_earnings')
      .select(`
        net_amount,
        driver_hire_request_id,
        driver_hire_requests!inner(status,customer_confirmed_at),
        driver_hire_payments!inner(
          status,
          payment_mode,
          driver_application_id,
          driver_hire_request_id
        )
      `)
      .eq('driver_application_id', driverId)
      .eq('status', 'available')
      .eq('driver_hire_requests.status', 'completed')
      .not('driver_hire_requests.customer_confirmed_at', 'is', null)
      .eq('driver_hire_payments.status', 'paid')
      .eq('driver_hire_payments.payment_mode', payoutMode)
      .eq('driver_hire_payments.driver_application_id', driverId),

    db.from('driver_withdrawals')
      .select('amount,status')
      .eq('driver_application_id', driverId)
      .eq('payout_mode', payoutMode),
  ])

  if (hireResult.error) throw hireResult.error
  if (withdrawalsResult.error) throw withdrawalsResult.error

  const hire = (hireResult.data || [])
    .filter((e: any) => {
      const payment = Array.isArray(e.driver_hire_payments)
        ? e.driver_hire_payments[0]
        : e.driver_hire_payments

      return payment?.driver_hire_request_id === e.driver_hire_request_id &&
        payment?.driver_application_id === driverId &&
        payment?.status === 'paid' &&
        payment?.payment_mode === payoutMode
    })
    .reduce(
      (sum: number, e: any) => sum + Number(e.net_amount || 0), 0
    )

  const used = (withdrawalsResult.data || [])
    .filter((w: any) => ['requested', 'processing', 'paid'].includes(w.status))
    .reduce((sum: number, w: any) => sum + Number(w.amount || 0), 0)

  const reserved = (withdrawalsResult.data || [])
    .filter((w: any) => ['requested', 'processing'].includes(w.status))
    .reduce((sum: number, w: any) => sum + Number(w.amount || 0), 0)

  return {
    availableBalance: Math.max(0, hire - used),
    withdrawalPending: reserved,
    payoutMode,
  }
}
export async function GET(req: Request) {
  try {
    const driver = await getDriverForToken(
      driverApplicationId(req),
      driverToken(req)
    )

    if (!driver) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getSupabaseAdmin()

    const [balance, withdrawalsResult, payout] = await Promise.all([
      getAvailableBalance(db, driver.id),
      db.from('driver_withdrawals')
        .select('id,amount,bank_name,account_name,account_number_masked,status,created_at,processed_at,rejection_reason,payout_reference,account_verified_at')
        .eq('driver_application_id', driver.id)
        .order('created_at', { ascending: false })
        .limit(50),
      payoutState(db, driver.id),
    ])

    if (withdrawalsResult.error) throw withdrawalsResult.error

    return NextResponse.json({
      ...balance,
      withdrawals: withdrawalsResult.data || [],
      payoutAccount: payout.active
        ? {
            bank_name: payout.active.bank_name,
            account_name: payout.active.account_name,
            account_number_masked: payout.active.account_number_masked,
          }
        : null,
      payoutChangePending: payout.pending
        ? {
            bank_name: payout.pending.bank_name,
            account_name: payout.pending.account_name,
            account_number_masked: payout.pending.account_number_masked,
            available_from: payout.pending.available_from,
          }
        : null,
    })
  } catch (error) {
    console.error('Driver wallet GET error:', error)
    return NextResponse.json(
      { error: 'Unable to load driver wallet.' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const driver = await getDriverForToken(
      driverApplicationId(req),
      driverToken(req)
    )

    if (!driver) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const amount = Number(body?.amount)
    const pin = String(body?.pin || '')

    if (!Number.isFinite(amount) || amount <= 0 ||
        Math.round(amount * 100) !== amount * 100) {
      return NextResponse.json(
        { error: 'Enter a valid withdrawal amount.' },
        { status: 400 }
      )
    }

    if (!driver.wallet_pin_hash) {
      return NextResponse.json(
        { error: 'Create your Wallet PIN first.' },
        { status: 409 }
      )
    }

    if (!walletPinMatches(pin, driver.wallet_pin_hash)) {
      return NextResponse.json(
        { error: 'Wallet PIN is incorrect.' },
        { status: 403 }
      )
    }

    const paystackKey = process.env.PAYSTACK_SECRET_KEY || ''

    const payoutMode =
      paystackKey.startsWith('sk_test_') ? 'test' :
      paystackKey.startsWith('sk_live_') ? 'live' :
      null

    if (!payoutMode) {
      return NextResponse.json(
        { error: 'Withdrawal service is not configured.' },
        { status: 503 }
      )
    }

    // LIVE manual withdrawal requests are independently controlled.
    // This does not enable automatic Paystack transfers.
    if (
      payoutMode === 'live' &&
      process.env.DRIVER_MANUAL_WITHDRAWALS_ENABLED !== 'true'
    ) {
      return NextResponse.json(
        { error: 'Live manual withdrawals are not yet enabled.' },
        { status: 503 }
      )
    }

    const db = getSupabaseAdmin()

    const { data: result, error: rpcError } = await db.rpc(
      'request_driver_withdrawal',
      {
        p_driver_application_id: driver.id,
        p_amount: amount,
        p_payout_mode: payoutMode,
      }
    )

    if (rpcError) {
      console.error('Driver withdrawal RPC error:', rpcError)

      const message = String(rpcError.message || '')

      if (
        message.includes('Insufficient available balance') ||
        message.includes('Verified payout account not available') ||
        message.includes('Payout account change is pending') ||
        message.includes('Invalid withdrawal amount')
      ) {
        return NextResponse.json({ error: message }, { status: 409 })
      }

      return NextResponse.json(
        { error: 'Unable to request withdrawal.' },
        { status: 500 }
      )
    }

    const { error: eventError } = await db
      .from('driver_security_events')
      .insert({
        driver_application_id: driver.id,
        event_type: 'cashout_requested',
        actor_type: 'driver',
        metadata: {
          amount,
          withdrawal_id: result?.withdrawal_id,
        },
      })

    if (eventError) {
      console.error('Withdrawal audit event error:', eventError)
    }

    return NextResponse.json({
      ok: true,
      withdrawal: {
        id: result?.withdrawal_id,
        amount: result?.amount,
        status: result?.status,
      },
      availableBalance: result?.available_balance_after,
    })
  } catch (error) {
    console.error('Driver wallet POST error:', error)
    return NextResponse.json(
      { error: 'Unable to request withdrawal.' },
      { status: 500 }
    )
  }
}
