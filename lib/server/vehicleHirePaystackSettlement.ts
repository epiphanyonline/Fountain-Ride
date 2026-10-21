import 'server-only'

import crypto from 'node:crypto'

import { getSupabaseAdmin } from './supabaseAdmin'

type VehicleHireSettlementResult = {
  alreadyPaid: boolean
  requestId: string
  paymentId: string
  carId: string
  amount: number
  commissionPercent: number
  commissionAmount: number
  ownerNetAmount: number
}

async function ensureVehicleHireStartPin(
  requestId: string
) {
  const db = getSupabaseAdmin()

  const {
    data: hireRequest,
    error: lookupError,
  } = await db
    .from('vehicle_hire_requests')
    .select('id, hire_start_pin')
    .eq('id', requestId)
    .single()

  if (lookupError || !hireRequest) {
    throw new Error(
      lookupError?.message ||
        'Unable to prepare Vehicle Hire start PIN.'
    )
  }

  // A PIN already exists.
  // Never replace it during webhook/callback retries.
  if (hireRequest.hire_start_pin) {
    return
  }

  const pin = String(
    crypto.randomInt(1000, 10000)
  )

  const {
    error: updateError,
  } = await db
    .from('vehicle_hire_requests')
    .update({
      hire_start_pin: pin,
    })
    .eq('id', requestId)
    .is('hire_start_pin', null)

  if (updateError) {
    throw new Error(
      updateError.message
    )
  }
}

export async function settleVerifiedVehicleHirePaystackPayment({
  reference,
  amount,
  expectedRequestId,
}: {
  reference: string
  amount: number
  expectedRequestId?: string
}): Promise<VehicleHireSettlementResult> {
  const db = getSupabaseAdmin()

  // ---------------------------------------------------------
  // 1. FIND PAYMENT CREATED BY FOUNTAIN RIDE
  // ---------------------------------------------------------

  const {
    data: payment,
    error: paymentError,
  } = await db
    .from('vehicle_hire_payments')
    .select('*')
    .eq('provider', 'paystack')
    .eq('reference', reference)
    .maybeSingle()

  if (paymentError) {
    throw new Error(
      paymentError.message
    )
  }

  if (!payment) {
    throw new Error(
      'Vehicle Hire payment reference was not created by Fountain Ride.'
    )
  }

  if (
    expectedRequestId &&
    payment.vehicle_hire_request_id !==
      expectedRequestId
  ) {
    throw new Error(
      'Payment reference does not belong to this Vehicle Hire request.'
    )
  }

  // ---------------------------------------------------------
  // 2. VERIFY AMOUNT AGAINST OUR PAYMENT RECORD
  // ---------------------------------------------------------

  if (
    Math.abs(
      Number(amount) -
        Number(payment.amount)
    ) > 0.01
  ) {
    throw new Error(
      'Payment amount does not match the agreed Vehicle Hire amount.'
    )
  }

  // ---------------------------------------------------------
  // 3. IDEMPOTENCY — ALREADY SETTLED
  // ---------------------------------------------------------

  if (payment.status === 'paid') {
  await ensureVehicleHireStartPin(
    payment.vehicle_hire_request_id
  )

  const {
    data: existingEarning,
  } = await db
      .from('vehicle_hire_earnings')
      .select('*')
      .eq(
        'vehicle_hire_request_id',
        payment.vehicle_hire_request_id
      )
      .maybeSingle()

    return {
      alreadyPaid: true,

      requestId:
        payment.vehicle_hire_request_id,

      paymentId:
        payment.id,

      carId:
        existingEarning?.car_id || '',

      amount:
        Number(payment.amount),

      commissionPercent:
        Number(
          existingEarning
            ?.commission_percent ?? 10
        ),

      commissionAmount:
        Number(
          existingEarning
            ?.commission_amount ?? 0
        ),

      ownerNetAmount:
        Number(
          existingEarning
            ?.owner_net_amount ?? 0
        ),
    }
  }

  // ---------------------------------------------------------
  // 4. LOAD VEHICLE HIRE REQUEST
  // ---------------------------------------------------------

  const {
    data: hireRequest,
    error: requestError,
  } = await db
    .from('vehicle_hire_requests')
    .select('*')
    .eq(
      'id',
      payment.vehicle_hire_request_id
    )
    .single()

  if (
    requestError ||
    !hireRequest
  ) {
    throw new Error(
      requestError?.message ||
        'Vehicle Hire request not found.'
    )
  }

  if (
    hireRequest.status !==
      'awaiting_payment' &&
    hireRequest.status !==
      'confirmed'
  ) {
    throw new Error(
      'This Vehicle Hire request is not awaiting payment.'
    )
  }

  if (
    !hireRequest.selected_offer_id ||
    !hireRequest.car_id
  ) {
    throw new Error(
      'No accepted Vehicle Hire quotation is attached to this request.'
    )
  }

  // ---------------------------------------------------------
  // 5. LOAD IMMUTABLE AGREEMENT
  // ---------------------------------------------------------

  const {
    data: agreement,
    error: agreementError,
  } = await db
    .from('vehicle_hire_agreements')
    .select('*')
    .eq(
      'vehicle_hire_request_id',
      hireRequest.id
    )
    .single()

  if (
    agreementError ||
    !agreement
  ) {
    throw new Error(
      agreementError?.message ||
        'Vehicle Hire agreement not found.'
    )
  }

  if (
    agreement.id !==
      payment.vehicle_hire_agreement_id
  ) {
    throw new Error(
      'Payment does not match the Vehicle Hire agreement.'
    )
  }

  if (
    agreement.accepted_offer_id !==
      hireRequest.selected_offer_id
  ) {
    throw new Error(
      'Accepted quotation does not match the Vehicle Hire agreement.'
    )
  }

  if (
    agreement.car_id !==
      hireRequest.car_id
  ) {
    throw new Error(
      'Selected vehicle does not match the Vehicle Hire agreement.'
    )
  }

  if (
    Math.abs(
      Number(
        agreement.agreed_amount
      ) -
        Number(amount)
    ) > 0.01
  ) {
    throw new Error(
      'Verified payment does not match the recorded Vehicle Hire agreement.'
    )
  }

  // ---------------------------------------------------------
  // 6. COMMISSION SNAPSHOT
  //
  // Vehicle Hire currently uses Fountain Ride's
  // standard 10% commission.
  // ---------------------------------------------------------

  const commissionPercent = 10

  const commissionAmount =
    Number(
      (
        Number(amount) *
        commissionPercent /
        100
      ).toFixed(2)
    )

  const ownerNetAmount =
    Number(
      (
        Number(amount) -
        commissionAmount
      ).toFixed(2)
    )

  const now =
    new Date().toISOString()

  // ---------------------------------------------------------
  // 7. MARK PAYMENT PAID
  // ---------------------------------------------------------

  const {
    error: paymentUpdateError,
  } = await db
    .from('vehicle_hire_payments')
    .update({
      status:
        'paid',

      paid_at:
        now,

      updated_at:
        now,
    })
    .eq(
      'id',
      payment.id
    )
    .neq(
      'status',
      'paid'
    )

  if (paymentUpdateError) {
    throw new Error(
      paymentUpdateError.message
    )
  }

  // ---------------------------------------------------------
  // 8. CONFIRM VEHICLE HIRE BOOKING
  // ---------------------------------------------------------

  const {
    error: requestUpdateError,
  } = await db
    .from('vehicle_hire_requests')
    .update({
      status:
        'confirmed',

      updated_at:
        now,
    })
    .eq(
      'id',
      hireRequest.id
    )
    .eq(
      'status',
      'awaiting_payment'
    )

  if (requestUpdateError) {
    throw new Error(
      requestUpdateError.message
    )
  }

  // ---------------------------------------------------------
// PREPARE SECURE HIRE START PIN
//
// The PIN is stored server-side and is never returned
// through the settlement response.
// ---------------------------------------------------------

await ensureVehicleHireStartPin(
  hireRequest.id
)

  // ---------------------------------------------------------
  // 9. CREATE PROTECTED OWNER EARNING
  //
  // Database unique index:
  // vehicle_hire_earnings(vehicle_hire_request_id)
  //
  // protects against duplicate earnings.
  // ---------------------------------------------------------

  const {
    data: existingEarning,
    error: existingEarningError,
  } = await db
    .from('vehicle_hire_earnings')
    .select('id')
    .eq(
      'vehicle_hire_request_id',
      hireRequest.id
    )
    .maybeSingle()

  if (existingEarningError) {
    throw new Error(
      existingEarningError.message
    )
  }

  if (!existingEarning) {
    const {
      error: earningError,
    } = await db
      .from('vehicle_hire_earnings')
      .insert({
        vehicle_hire_request_id:
          hireRequest.id,

        car_id:
          agreement.car_id,

        gross_amount:
          Number(amount),

        commission_percent:
          commissionPercent,

        commission_amount:
          commissionAmount,

        owner_net_amount:
          ownerNetAmount,

        status:
          'pending',
      })

    if (earningError) {
      /*
       * If another settlement process created
       * the same earning first, the unique
       * request index protects us.
       */
      if (
        !String(
          earningError.message || ''
        )
          .toLowerCase()
          .includes('duplicate')
      ) {
        throw new Error(
          earningError.message
        )
      }
    }
  }

  // ---------------------------------------------------------
  // 10. AUDIT EVENT
  // ---------------------------------------------------------

  const {
    data: priorEvent,
  } = await db
    .from('vehicle_hire_events')
    .select('id')
    .eq(
      'vehicle_hire_request_id',
      hireRequest.id
    )
    .eq(
      'event_type',
      'payment_confirmed'
    )
    .contains(
      'metadata',
      {
        reference,
      }
    )
    .maybeSingle()

  if (!priorEvent) {
    const {
      error: eventError,
    } = await db
      .from('vehicle_hire_events')
      .insert({
        vehicle_hire_request_id:
          hireRequest.id,

        event_type:
          'payment_confirmed',

        actor_role:
          'system',

        metadata: {
          reference,

          payment_id:
            payment.id,

          agreement_id:
            agreement.id,

          car_id:
            agreement.car_id,

          amount:
            Number(amount),

          commission_percent:
            commissionPercent,

          commission_amount:
            commissionAmount,

          owner_net_amount:
            ownerNetAmount,
        },
      })

    if (eventError) {
      console.error(
        'Unable to create Vehicle Hire payment event:',
        eventError
      )
    }
  }

  return {
    alreadyPaid:
      false,

    requestId:
      hireRequest.id,

    paymentId:
      payment.id,

    carId:
      agreement.car_id,

    amount:
      Number(amount),

    commissionPercent,

    commissionAmount,

    ownerNetAmount,
  }
}
