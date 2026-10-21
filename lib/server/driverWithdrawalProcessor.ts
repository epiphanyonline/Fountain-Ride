import 'server-only'

import { getSupabaseAdmin } from './supabaseAdmin'
import {
  createTestTransferRecipient,
  initiateTestDriverWithdrawalTransfer,
  verifyTestTransferRecipient,
  verifyTestTransfer,
  validateSuccessfulTestTransfer,
  validateFailedTestTransfer,
} from './driverWithdrawalPaystack'

export async function previewTestDriverWithdrawals() {
  const key = process.env.PAYSTACK_SECRET_KEY || ''

  if (!key.startsWith('sk_test_')) {
    throw new Error('TEST Paystack configuration required.')
  }

  const db = getSupabaseAdmin()

  const { data, error } = await db
    .from('driver_withdrawals')
    .select(`
      id,
      driver_application_id,
      amount,
      status,
      payout_mode,
      payout_reference,
      transfer_code,
      transfer_initiated_at,
      created_at
    `)
    .eq('status', 'requested')
    .eq('payout_mode', 'test')
    .is('payout_reference', null)
    .is('transfer_code', null)
    .is('transfer_initiated_at', null)
    .order('created_at', { ascending: true })
    .limit(10)

  if (error) {
    throw new Error('Unable to inspect pending TEST withdrawals.')
  }

  return {
    mode: 'test',
    dryRun: true,
    count: data?.length || 0,
    withdrawals: (data || []).map((withdrawal) => ({
      id: withdrawal.id,
      amount: withdrawal.amount,
      status: withdrawal.status,
    })),
  }
}

export function assertTestPayoutTransfersEnabled(): void {
  const paystackKey = process.env.PAYSTACK_SECRET_KEY || ''

  if (!paystackKey.startsWith('sk_test_')) {
    throw new Error(
      'Driver payouts require Paystack TEST mode.'
    )
  }

  if (process.env.DRIVER_PAYOUT_TRANSFERS_ENABLED !== 'true') {
    throw new Error(
      'Automatic driver payout transfers are disabled.'
    )
  }
}

export function assertTestRecipientRegistrationEnabled(): void {
  if (!process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_test_')) {
    throw new Error('Recipient registration requires Paystack TEST mode.')
  }

  if (
    process.env.DRIVER_PAYOUT_RECIPIENT_REGISTRATION_ENABLED !== 'true'
  ) {
    throw new Error('TEST recipient registration is disabled.')
  }
}
export async function claimTestDriverWithdrawal(
  withdrawalId: string
) {
  assertTestPayoutTransfersEnabled()

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      .test(withdrawalId)
  ) {
    throw new Error('Invalid withdrawal ID.')
  }

  const db = getSupabaseAdmin()

  const { data, error } = await db.rpc(
    'claim_driver_withdrawal_for_transfer',
    { p_withdrawal_id: withdrawalId }
  )

  if (error) {
    throw new Error('Unable to claim TEST withdrawal.')
  }

  if (
    data?.ok !== true ||
    data?.withdrawal_id !== withdrawalId ||
    data?.payout_mode !== 'test' ||
    !/^FRWD-TEST-[a-f0-9]{32}$/.test(
      String(data?.payout_reference || '')
    )
  ) {
    throw new Error('Unexpected withdrawal claim result.')
  }

  return {
    withdrawalId: data.withdrawal_id as string,
    amount: Number(data.amount),
    reference: data.payout_reference as string,
  }
}

export async function registerTestWithdrawalRecipient(
  withdrawalId: string,
  reference: string
) {
  assertTestRecipientRegistrationEnabled()

  const db = getSupabaseAdmin()

  const { data: withdrawal, error } = await db
    .from('driver_withdrawals')
    .select(`
      id,
      status,
      payout_mode,
      payout_reference,
      account_name,
      account_number,
      bank_code,
      transfer_recipient_code,
      transfer_initiated_at
    `)
    .eq('id', withdrawalId)
    .single()

  if (error || !withdrawal) {
    throw new Error('Withdrawal not found.')
  }

  if (
    withdrawal.status !== 'processing' ||
    withdrawal.payout_mode !== 'test' ||
    withdrawal.payout_reference !== reference ||
    withdrawal.transfer_initiated_at !== null
  ) {
    throw new Error('Withdrawal is not eligible for recipient registration.')
  }

  if (withdrawal.transfer_recipient_code) {
    return withdrawal.transfer_recipient_code as string
  }

  if (
    !withdrawal.account_name ||
    !withdrawal.account_number ||
    !withdrawal.bank_code
  ) {
    throw new Error('Verified bank details are missing.')
  }

  const paystackResponse = await createTestTransferRecipient({
    accountName: withdrawal.account_name,
    accountNumber: withdrawal.account_number,
    bankCode: withdrawal.bank_code,
  })

  const recipientData =
    'data' in paystackResponse &&
    paystackResponse.data &&
    typeof paystackResponse.data === 'object'
      ? paystackResponse.data as Record<string, unknown>
      : null

  const recipientCode = recipientData?.recipient_code

  if (
    typeof recipientCode !== 'string' ||
    !/^RCP_[A-Za-z0-9]+$/.test(recipientCode)
  ) {
    throw new Error('Paystack did not return a valid recipient code.')
  }

  const { error: recordError } = await db.rpc(
    'record_driver_withdrawal_recipient',
    {
      p_withdrawal_id: withdrawalId,
      p_payout_reference: reference,
      p_recipient_code: recipientCode,
    }
  )

  if (recordError) {
    throw new Error('Unable to save Paystack recipient.')
  }

  return recipientCode
}


export async function initiateReservedTestWithdrawalTransfer(
  withdrawalId: string,
  reference: string
) {
  assertTestPayoutTransfersEnabled()

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(withdrawalId) ||
    !/^FRWD-TEST-[a-f0-9]{32}$/.test(reference)
  ) {
    throw new Error('Invalid withdrawal transfer identifiers.')
  }

  const db = getSupabaseAdmin()

  const { data: withdrawal, error } = await db
    .from('driver_withdrawals')
    .select(`
      id,
      status,
      payout_mode,
      payout_reference,
      bank_code,
      account_number,
      transfer_recipient_code,
      transfer_initiated_at
    `)
    .eq('id', withdrawalId)
    .single()

  if (error || !withdrawal) {
    throw new Error('Withdrawal not found.')
  }

  if (
    withdrawal.status !== 'processing' ||
    withdrawal.payout_mode !== 'test' ||
    withdrawal.payout_reference !== reference ||
    withdrawal.transfer_initiated_at !== null ||
    !withdrawal.transfer_recipient_code
  ) {
    throw new Error('Withdrawal is not ready for transfer.')
  }

  // Verify that Paystack's recipient belongs to the
  // bank account saved when the withdrawal was requested.
  await verifyTestTransferRecipient(
    withdrawal.transfer_recipient_code,
    {
      bankCode: withdrawal.bank_code,
      accountNumber: withdrawal.account_number,
    }
  )

  // Recheck account eligibility after the external API call.
  const eligibility =
    await checkTestWithdrawalRecoveryEligibility(withdrawalId)

  if (!eligibility.eligible) {
    throw new Error('Withdrawal account is no longer eligible.')
  }

  // The database performs the final atomic eligibility check.
  const { data: reservation, error: reserveError } =
    await db.rpc('reserve_driver_withdrawal_transfer', {
      p_withdrawal_id: withdrawalId,
      p_payout_reference: reference,
    })

  if (reserveError || reservation?.ok !== true) {
    throw new Error('Transfer attempt could not be reserved.')
  }

  if (
    reservation.withdrawal_id !== withdrawalId ||
    reservation.payout_reference !== reference ||
    reservation.recipient_code !== withdrawal.transfer_recipient_code ||
    !Number.isSafeInteger(Number(reservation.amount_kobo)) ||
    Number(reservation.amount_kobo) <= 0
  ) {
    // Reservation may already exist. Never retry automatically.
    throw new Error('Reserved transfer details do not match.')
  }

  // Exactly one transfer attempt is permitted.
  // Uncertain responses must be reconciled by reference.
  return initiateTestDriverWithdrawalTransfer({
    reference,
    recipientCode: reservation.recipient_code,
    amountKobo: Number(reservation.amount_kobo),
  })
}
export async function reconcileSuccessfulTestWithdrawal(
  withdrawalId: string
) {
  const key = process.env.PAYSTACK_SECRET_KEY || ''

  if (!key.startsWith('sk_test_')) {
    throw new Error('TEST Paystack configuration required.')
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(withdrawalId)
  ) {
    throw new Error('Invalid withdrawal ID.')
  }

  const db = getSupabaseAdmin()

  const { data: withdrawal, error } = await db
    .from('driver_withdrawals')
    .select(`
      id,
      amount,
      status,
      payout_mode,
      payout_reference,
      transfer_recipient_code,
      transfer_initiated_at
    `)
    .eq('id', withdrawalId)
    .single()

  if (error || !withdrawal) {
    throw new Error('Withdrawal not found.')
  }

  if (
    withdrawal.status !== 'processing' ||
    withdrawal.payout_mode !== 'test' ||
    withdrawal.transfer_initiated_at === null
  ) {
    return {
      verified: false,
      reason: 'not_awaiting_verification',
    }
  }

  const reference = withdrawal.payout_reference
  const recipientCode = withdrawal.transfer_recipient_code
  const amountKobo = Number(withdrawal.amount) * 100

  if (
    typeof reference !== 'string' ||
    !/^FRWD-TEST-[a-f0-9]{32}$/.test(reference) ||
    typeof recipientCode !== 'string' ||
    !/^RCP_[A-Za-z0-9]+$/.test(recipientCode) ||
    !Number.isSafeInteger(amountKobo) ||
    amountKobo <= 0
  ) {
    throw new Error('Invalid withdrawal verification details.')
  }

  const paystackResult = await verifyTestTransfer(reference)

  const transferCode = validateSuccessfulTestTransfer(
    paystackResult,
    {
      reference,
      recipientCode,
      amountKobo,
    }
  )

  const { data: settlement, error: settlementError } =
    await db.rpc(
      'record_driver_withdrawal_transfer_success',
      {
        p_withdrawal_id: withdrawalId,
        p_reference: reference,
        p_transfer_code: transferCode,
        p_recipient_code: recipientCode,
        p_amount_kobo: amountKobo,
      }
    )

  if (settlementError || settlement?.ok !== true) {
    throw new Error('Unable to record verified transfer settlement.')
  }

  return {
    verified: true,
    withdrawalId,
    status: 'paid',
    alreadyPaid: settlement.already_paid === true,
  }
}


export async function reconcileFailedTestWithdrawal(
  withdrawalId: string
) {
  const key = process.env.PAYSTACK_SECRET_KEY || ''

  if (!key.startsWith('sk_test_')) {
    throw new Error('TEST Paystack configuration required.')
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(withdrawalId)
  ) {
    throw new Error('Invalid withdrawal ID.')
  }

  const db = getSupabaseAdmin()

  const { data: withdrawal, error } = await db
    .from('driver_withdrawals')
    .select(`
      id,
      amount,
      status,
      payout_mode,
      payout_reference,
      transfer_recipient_code,
      transfer_initiated_at
    `)
    .eq('id', withdrawalId)
    .single()

  if (error || !withdrawal) {
    throw new Error('Withdrawal not found.')
  }

  if (
    withdrawal.status !== 'processing' ||
    withdrawal.payout_mode !== 'test' ||
    withdrawal.transfer_initiated_at === null
  ) {
    return {
      verified: false,
      reason: 'not_awaiting_verification',
    }
  }

  const reference = withdrawal.payout_reference
  const recipientCode = withdrawal.transfer_recipient_code
  const amountKobo = Number(withdrawal.amount) * 100

  if (
    typeof reference !== 'string' ||
    !/^FRWD-TEST-[a-f0-9]{32}$/.test(reference) ||
    typeof recipientCode !== 'string' ||
    !/^RCP_[A-Za-z0-9]+$/.test(recipientCode) ||
    !Number.isSafeInteger(amountKobo) ||
    amountKobo <= 0
  ) {
    throw new Error('Invalid withdrawal verification details.')
  }

  const paystackResult = await verifyTestTransfer(reference)

  const transferCode = validateFailedTestTransfer(
    paystackResult,
    {
      reference,
      recipientCode,
      amountKobo,
    }
  )

  const { data: settlement, error: settlementError } =
    await db.rpc(
      'record_driver_withdrawal_transfer_failure',
      {
        p_withdrawal_id: withdrawalId,
        p_reference: reference,
        p_transfer_code: transferCode,
        p_recipient_code: recipientCode,
        p_amount_kobo: amountKobo,
      }
    )

  if (settlementError || settlement?.ok !== true) {
    throw new Error('Unable to record verified transfer failure.')
  }

  return {
    verified: true,
    withdrawalId,
    status: 'failed',
    alreadyFailed: settlement.already_failed === true,
  }
}


export async function reconcileTestDriverWithdrawal(
  withdrawalId: string
) {
  const key = process.env.PAYSTACK_SECRET_KEY || ''

  if (!key.startsWith('sk_test_')) {
    throw new Error('TEST Paystack configuration required.')
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(withdrawalId)
  ) {
    throw new Error('Invalid withdrawal ID.')
  }

  const db = getSupabaseAdmin()

  const { data: withdrawal, error } = await db
    .from('driver_withdrawals')
    .select(`
      id,
      amount,
      status,
      payout_mode,
      payout_reference,
      transfer_recipient_code,
      transfer_initiated_at
    `)
    .eq('id', withdrawalId)
    .single()

  if (error || !withdrawal) {
    throw new Error('Withdrawal not found.')
  }

  if (
    withdrawal.status !== 'processing' ||
    withdrawal.payout_mode !== 'test' ||
    !withdrawal.transfer_initiated_at
  ) {
    return { outcome: 'not_applicable', withdrawalId }
  }

  const reference = withdrawal.payout_reference
  const recipientCode = withdrawal.transfer_recipient_code
  const amountKobo = Number(withdrawal.amount) * 100

  if (
    typeof reference !== 'string' ||
    !/^FRWD-TEST-[a-f0-9]{32}$/.test(reference) ||
    typeof recipientCode !== 'string' ||
    !/^RCP_[A-Za-z0-9]+$/.test(recipientCode) ||
    !Number.isSafeInteger(amountKobo) ||
    amountKobo <= 0
  ) {
    throw new Error('Invalid withdrawal verification details.')
  }

  // One independent Paystack verification per reconciliation attempt.
  const result = await verifyTestTransfer(reference)

  const data =
    result &&
    typeof result === 'object' &&
    'data' in result &&
    result.data &&
    typeof result.data === 'object'
      ? result.data as Record<string, unknown>
      : null

  const providerStatus = data?.status

  if (providerStatus === 'success') {
    const transferCode = validateSuccessfulTestTransfer(
      result,
      { reference, recipientCode, amountKobo }
    )

    const { data: settlement, error: settlementError } =
      await db.rpc(
        'record_driver_withdrawal_transfer_success',
        {
          p_withdrawal_id: withdrawalId,
          p_reference: reference,
          p_transfer_code: transferCode,
          p_recipient_code: recipientCode,
          p_amount_kobo: amountKobo,
        }
      )

    if (settlementError || settlement?.ok !== true) {
      throw new Error('Unable to settle verified transfer.')
    }

    return {
      outcome: 'paid',
      withdrawalId,
      alreadyPaid: settlement.already_paid === true,
    }
  }

  // Do not release reserved funds automatically.
  if (
    providerStatus === 'failed' ||
    providerStatus === 'reversed'
  ) {
    return {
      outcome: 'requires_review',
      withdrawalId,
      providerStatus,
    }
  }

  return {
    outcome: 'pending',
    withdrawalId,
    providerStatus:
      typeof providerStatus === 'string'
        ? providerStatus
        : 'unknown',
  }
}

export async function inspectTestWithdrawalRecovery() {
  const key = process.env.PAYSTACK_SECRET_KEY || ''

  if (!key.startsWith('sk_test_')) {
    throw new Error('TEST Paystack configuration required.')
  }

  const db = getSupabaseAdmin()

  const { data, error } = await db
    .from('driver_withdrawals')
    .select(`
      id,
      status,
      payout_mode,
      payout_reference,
      transfer_recipient_code,
      transfer_initiated_at,
      transfer_code,
      updated_at
    `)
    .eq('status', 'processing')
    .eq('payout_mode', 'test')
    .order('updated_at', { ascending: true })
    .limit(50)

  if (error) {
    throw new Error('Unable to inspect processing withdrawals.')
  }

  const withdrawals = (data || []).map((w) => {
    let recoveryState: string

    if (w.transfer_initiated_at) {
      recoveryState = 'verify_with_paystack'
    } else if (w.transfer_code) {
      recoveryState = 'manual_review'
    } else if (w.transfer_recipient_code) {
      recoveryState = 'recipient_registered'
    } else if (w.payout_reference) {
      recoveryState = 'recipient_registration_required'
    } else {
      recoveryState = 'manual_review'
    }

    return {
      id: w.id,
      recoveryState,
      updatedAt: w.updated_at,
    }
  })

  return {
    mode: 'test',
    dryRun: true,
    count: withdrawals.length,
    withdrawals,
  }
}

export async function checkTestWithdrawalRecoveryEligibility(
  withdrawalId: string
) {
  const key = process.env.PAYSTACK_SECRET_KEY || ''

  if (!key.startsWith('sk_test_')) {
    throw new Error('TEST Paystack configuration required.')
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(withdrawalId)
  ) {
    throw new Error('Invalid withdrawal ID.')
  }

  const db = getSupabaseAdmin()

  const { data: w, error } = await db
    .from('driver_withdrawals')
    .select(`
      id,
      driver_application_id,
      status,
      payout_mode,
      payout_reference,
      bank_code,
      account_number,
      account_verified_at,
      transfer_recipient_code,
      transfer_initiated_at,
      transfer_code
    `)
    .eq('id', withdrawalId)
    .single()

  if (error || !w) {
    throw new Error('Withdrawal not found.')
  }

  if (
    w.status !== 'processing' ||
    w.payout_mode !== 'test' ||
    !w.payout_reference ||
    w.transfer_initiated_at !== null ||
    w.transfer_code !== null
  ) {
    return {
      eligible: false,
      reason: 'withdrawal_not_safe_to_resume',
    }
  }

  const { data: accounts, error: accountError } = await db
    .from('driver_payout_accounts')
    .select(`
      bank_code,
      account_number,
      verified_at,
      available_from
    `)
    .eq('driver_application_id', w.driver_application_id)
    .eq('status', 'active')

  if (accountError) {
    throw new Error('Unable to verify active payout account.')
  }

  const activeAccount = (accounts || []).find(
    (a) =>
      a.bank_code === w.bank_code &&
      a.account_number === w.account_number &&
      a.verified_at === w.account_verified_at &&
      a.available_from &&
      new Date(a.available_from).getTime() <= Date.now()
  )

  if (!activeAccount) {
    return {
      eligible: false,
      reason: 'active_verified_account_mismatch',
    }
  }

  return {
    eligible: true,
    withdrawalId,
    nextStep: w.transfer_recipient_code
      ? 'transfer_reservation'
      : 'recipient_registration',
  }
}

export async function prepareTestDriverWithdrawal(
  withdrawalId: string
) {
  assertTestRecipientRegistrationEnabled()

  const db = getSupabaseAdmin()

  const { data: withdrawal, error } = await db
    .from('driver_withdrawals')
    .select(`
      id,
      status,
      payout_mode,
      payout_reference,
      transfer_initiated_at
    `)
    .eq('id', withdrawalId)
    .single()

  if (error || !withdrawal) {
    throw new Error('Withdrawal not found.')
  }

  if (withdrawal.payout_mode !== 'test') {
    throw new Error('Only TEST withdrawals are supported.')
  }

  let reference: string

  if (withdrawal.status === 'requested') {
    const claim = await claimTestDriverWithdrawal(withdrawalId)
    reference = claim.reference
  } else if (
    withdrawal.status === 'processing' &&
    !withdrawal.transfer_initiated_at &&
    typeof withdrawal.payout_reference === 'string'
  ) {
    reference = withdrawal.payout_reference
  } else {
    throw new Error('Withdrawal cannot be prepared in its current state.')
  }

  // Recheck account eligibility before continuing.
  const eligibility =
    await checkTestWithdrawalRecoveryEligibility(withdrawalId)

  if (!eligibility.eligible) {
    throw new Error('Withdrawal bank account is no longer eligible.')
  }

  const recipientCode =
    await registerTestWithdrawalRecipient(
      withdrawalId,
      reference
    )

  return {
    prepared: true,
    withdrawalId,
    reference,
    recipientRegistered: Boolean(recipientCode),
    transferInitiated: false,
  }
}

export async function processOneTestDriverWithdrawal(
  withdrawalId: string
) {
  assertTestPayoutTransfersEnabled()

  const db = getSupabaseAdmin()

  const { data: existing, error } = await db
    .from('driver_withdrawals')
    .select(`
      id,
      status,
      payout_mode,
      transfer_initiated_at
    `)
    .eq('id', withdrawalId)
    .single()

  if (error || !existing) {
    throw new Error('Withdrawal not found.')
  }

  if (existing.payout_mode !== 'test') {
    throw new Error('Only TEST withdrawals are supported.')
  }

  // Never initiate another transfer for a previously
  // reserved attempt. Reconcile its original reference.
  if (existing.transfer_initiated_at) {
    return reconcileTestDriverWithdrawal(withdrawalId)
  }

  if (
    existing.status !== 'requested' &&
    existing.status !== 'processing'
  ) {
    return {
      outcome: 'not_applicable',
      withdrawalId,
    }
  }

  // Claim withdrawal and register its Paystack recipient.
  const prepared =
    await prepareTestDriverWithdrawal(withdrawalId)

  // Final bank-account and recipient checks occur
  // inside the protected initiation function.
  const transferResponse =
    await initiateReservedTestWithdrawalTransfer(
      withdrawalId,
      prepared.reference
    )

  // Do not assume that a successful HTTP response means
  // the bank transfer has settled.
  // Verify independently using the original reference.
  const reconciliation =
    await reconcileTestDriverWithdrawal(withdrawalId)

  return {
    outcome: reconciliation.outcome,
    withdrawalId,
    transferSubmitted: true,
    providerAcceptedRequest: Boolean(transferResponse),
    reconciliation,
  }
}

export async function recoverPendingTestDriverTransfers() {
  const key = process.env.PAYSTACK_SECRET_KEY || ''

  if (!key.startsWith('sk_test_')) {
    throw new Error('TEST Paystack configuration required.')
  }

  const db = getSupabaseAdmin()

  const { data, error } = await db
    .from('driver_withdrawals')
    .select('id')
    .eq('status', 'processing')
    .eq('payout_mode', 'test')
    .not('transfer_initiated_at', 'is', null)
    .order('transfer_initiated_at', { ascending: true })
    .limit(10)

  if (error) {
    throw new Error('Unable to retrieve transfers for recovery.')
  }

  const results: Array<{
    withdrawalId: string
    outcome: string
  }> = []

  for (const withdrawal of data || []) {
    try {
      // Read-only Paystack verification, followed by
      // settlement only when success is independently verified.
      const result =
        await reconcileTestDriverWithdrawal(withdrawal.id)

      results.push({
        withdrawalId: withdrawal.id,
        outcome: result.outcome,
      })
    } catch {
      // Never initiate a replacement transfer.
      // Keep the withdrawal reserved for later reconciliation.
      results.push({
        withdrawalId: withdrawal.id,
        outcome: 'verification_error',
      })
    }
  }

  return {
    mode: 'test',
    checked: results.length,
    results,
  }
}
