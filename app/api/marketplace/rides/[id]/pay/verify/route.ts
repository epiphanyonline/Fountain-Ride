import { NextResponse } from 'next/server'
import { getRideForToken, rideToken } from '../../../../../../../lib/server/marketplaceAuth'
import { settleVerifiedPaystackPayment } from '../../../../../../../lib/server/paystackSettlement'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ride = await getRideForToken(id, rideToken(req))
  if (!ride) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return NextResponse.json({ error: 'Payment provider is not configured.' }, { status: 503 })

  const body = await req.json().catch(() => null)
  const reference = String(body?.reference || '').trim()
  if (!reference) return NextResponse.json({ error: 'Payment reference is required.' }, { status: 400 })

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: 'no-store',
  })
  const data = await response.json().catch(() => null)

  if (!response.ok || !data?.status || !data?.data) {
    return NextResponse.json({ error: data?.message || 'Unable to verify payment with Paystack.' }, { status: 502 })
  }

  if (data.data.status !== 'success') {
    return NextResponse.json({ error: `Payment is ${data.data.status || 'not successful'}.` }, { status: 409 })
  }
  if (String(data.data.currency || '').toUpperCase() !== 'NGN') {
    return NextResponse.json({ error: 'Unexpected payment currency.' }, { status: 400 })
  }

  const amount = Number(data.data.amount || 0) / 100

  try {
    const settlement = await settleVerifiedPaystackPayment({ reference, amount, expectedRideId: id })
    return NextResponse.json({ ok: true, settlement })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unable to settle verified payment.' }, { status: 409 })
  }
}
