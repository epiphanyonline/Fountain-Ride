import { NextResponse } from 'next/server'

// Bank transfer is the only supported payment method for new bookings.
// Keep the endpoint present so previously shared Paystack checkout links
// cannot initialize a new payment after the bank-transfer-only launch.
// Historical Paystack transactions must be reconciled independently.
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Online checkout is no longer available. Please use bank transfer on your booking page or contact Fountain Ride support if you have already paid.',
    },
    {
      status: 410,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
