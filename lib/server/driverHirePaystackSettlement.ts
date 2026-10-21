
import 'server-only'
import { randomInt } from 'node:crypto'
import { getSupabaseAdmin } from './supabaseAdmin'

export type DriverHireSettlementResult = {
  alreadyPaid: boolean
  requestId: string
  paymentId: string
  driverApplicationId: string
  amount: number
  platformFee: number
  driverNet: number
}

export async function settleVerifiedDriverHirePaystackPayment({
  reference,
  amount,
  expectedRequestId,
  paymentMode,
}: {
  reference: string
  amount: number
  expectedRequestId?: string
  paymentMode: 'test' | 'live'
}): Promise<DriverHireSettlementResult> {
  if (!reference || !Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid Driver Hire settlement parameters.')
  }

  if (paymentMode !== 'test' && paymentMode !== 'live') {
    throw new Error('Invalid Paystack payment mode.')
  }

  const db = getSupabaseAdmin()

  // Webhooks do not supply a booking ID.
  // Resolve it using the Paystack reference stored by Fountain Ride.
  let requestId = expectedRequestId

  if (!requestId) {
    const { data: payment, error } = await db
      .from('driver_hire_payments')
      .select('driver_hire_request_id')
      .eq('provider', 'paystack')
      .eq('provider_reference', reference)
      .maybeSingle()

    if (error || !payment?.driver_hire_request_id) {
      throw new Error('Driver Hire payment reference not found.')
    }

    requestId = payment.driver_hire_request_id
  }

  const { data, error } = await db.rpc(
    'settle_driver_hire_payment_atomic',
    {
      p_reference: reference,
      p_amount: amount,
      p_expected_request_id: requestId,
      p_job_start_pin: randomInt(0, 10000).toString().padStart(4, '0'),
      p_payment_mode: paymentMode,
    }
  )

  if (error) {
    throw new Error(
      error.message || 'Atomic Driver Hire settlement failed.'
    )
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid atomic settlement response.')
  }

  const result = data as DriverHireSettlementResult

  if (
    !result.paymentId ||
    !result.requestId ||
    !result.driverApplicationId
  ) {
    throw new Error('Incomplete atomic settlement response.')
  }

  return result
}
