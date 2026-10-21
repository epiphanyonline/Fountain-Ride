import 'server-only'
import { getSupabaseAdmin } from './supabaseAdmin'

type SettlementResult = {
  alreadyPaid: boolean
  rideId: string
  amount: number
  platformFee: number
  driverNet: number
}

export async function settleVerifiedPaystackPayment({
  reference,
  amount,
  expectedRideId,
}: {
  reference: string
  amount: number
  expectedRideId?: string
}): Promise<SettlementResult> {
  const db = getSupabaseAdmin()

  const { data: payment, error: paymentError } = await db
    .from('marketplace_payments')
    .select('*')
    .eq('provider', 'paystack')
    .eq('provider_reference', reference)
    .maybeSingle()

  if (paymentError) throw new Error(paymentError.message)
  if (!payment) throw new Error('Payment reference was not created by Fountain Ride.')
  if (expectedRideId && payment.ride_request_id !== expectedRideId) {
    throw new Error('Payment reference does not belong to this trip.')
  }

  if (Math.abs(Number(amount) - Number(payment.gross_amount)) > 0.01) {
    throw new Error('Payment amount does not match the agreed fare.')
  }

  if (payment.status === 'paid') {
    return {
      alreadyPaid: true,
      rideId: payment.ride_request_id,
      amount: Number(payment.gross_amount),
      platformFee: Number(payment.platform_fee || 0),
      driverNet: Number(payment.driver_net || 0),
    }
  }

  const { data: ride, error: rideError } = await db
    .from('ride_requests')
    .select('*')
    .eq('id', payment.ride_request_id)
    .single()

  if (rideError || !ride) throw new Error(rideError?.message || 'Ride not found.')
  if (!ride.accepted_offer_id) throw new Error('No accepted driver offer is attached to this trip.')

  const { data: offer, error: offerError } = await db
    .from('ride_offers')
    .select('driver_application_id')
    .eq('id', ride.accepted_offer_id)
    .single()

  if (offerError || !offer?.driver_application_id) {
    throw new Error(offerError?.message || 'Selected driver not found.')
  }

  const { data: driver, error: driverError } = await db
    .from('driver_applications')
    .select('commission_rate')
    .eq('id', offer.driver_application_id)
    .single()

  if (driverError) throw new Error(driverError.message)

  const commissionRate = Number(driver?.commission_rate ?? 10)
  const platformFee = Number((Number(amount) * commissionRate / 100).toFixed(2))
  const driverNet = Number((Number(amount) - platformFee).toFixed(2))
  const now = new Date().toISOString()

  const { error: paymentUpdateError } = await db
    .from('marketplace_payments')
    .update({ status: 'paid', paid_at: now, platform_fee: platformFee, driver_net: driverNet })
    .eq('id', payment.id)
    .neq('status', 'paid')

  if (paymentUpdateError) throw new Error(paymentUpdateError.message)

  const { error: rideUpdateError } = await db
    .from('ride_requests')
    .update({ status: 'confirmed', trip_start_pin: String(Math.floor(1000 + Math.random() * 9000)), updated_at: now })
    .eq('id', ride.id)
    .eq('status', 'awaiting_payment')

  if (rideUpdateError) throw new Error(rideUpdateError.message)

  const { data: existing, error: existingError } = await db
    .from('driver_earnings')
    .select('id')
    .eq('ride_request_id', ride.id)
    .eq('driver_application_id', offer.driver_application_id)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)

  if (!existing) {
    const { error: earningError } = await db.from('driver_earnings').insert({
      ride_request_id: ride.id,
      driver_application_id: offer.driver_application_id,
      gross_amount: Number(amount),
      commission_amount: platformFee,
      net_amount: driverNet,
      status: 'pending',
    })
    if (earningError) throw new Error(earningError.message)
  }

  const { data: priorEvent } = await db
    .from('trip_events')
    .select('id')
    .eq('ride_request_id', ride.id)
    .eq('event_type', 'payment_confirmed')
    .contains('metadata', { reference })
    .maybeSingle()

  if (!priorEvent) {
    await db.from('trip_events').insert({
      ride_request_id: ride.id,
      event_type: 'payment_confirmed',
      metadata: { reference, amount: Number(amount), platform_fee: platformFee, driver_net: driverNet },
    })
  }

  return { alreadyPaid: false, rideId: ride.id, amount: Number(amount), platformFee, driverNet }
}
