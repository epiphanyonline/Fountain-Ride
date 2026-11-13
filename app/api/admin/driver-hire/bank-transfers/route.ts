
import { NextResponse } from 'next/server'

import { getSupabaseAdmin } from '../../../../../lib/server/supabaseAdmin'
import { isAdminSession } from '../../../../../lib/server/adminSession'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const authenticated = await isAdminSession()

    if (!authenticated) {
      return NextResponse.json(
        { error: 'Admin authentication required.' },
        { status: 401 }
      )
    }

    const db = getSupabaseAdmin()

    // Find customer-reported bank transfers.
    const { data: reports, error: reportsError } =
      await db
        .from('driver_hire_bank_transfer_reports')
        .select(`
          id,
          driver_hire_request_id,
          sender_name,
          transfer_date,
          transfer_time_wat,
          status,
          created_at
        `)
        .eq('status', 'reported')
        .order('created_at', { ascending: false })
        .limit(100)

    if (reportsError) {
      throw reportsError
    }

    const rows = reports || []

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: true, reports: [] },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const requestIds = [
      ...new Set(
        rows.map(
          (row) => row.driver_hire_request_id
        )
      ),
    ]

    // Driver Hire bookings do not have an
    // agreed_amount column. Use agreements.
    const [
      bookingsResult,
      agreementsResult,
    ] = await Promise.all([
      db
        .from('driver_hire_requests')
        .select(`
          id,
          booking_ref,
          agreed_fare,
          currency,
          status,
          accepted_offer_id
        `)
        .in('id', requestIds),

      db
        .from('driver_hire_agreements')
        .select(`
          driver_hire_request_id,
          agreed_amount,
          driver_application_id
        `)
        .in('driver_hire_request_id', requestIds),
    ])

    if (bookingsResult.error) {
      throw bookingsResult.error
    }

    if (agreementsResult.error) {
      throw agreementsResult.error
    }

    const bookingMap = new Map(
      (bookingsResult.data || []).map(
        (booking) => [booking.id, booking]
      )
    )

    const agreementMap = new Map(
      (agreementsResult.data || []).map(
        (agreement) => [
          agreement.driver_hire_request_id,
          agreement,
        ]
      )
    )

    const results = rows.map((report) => {
      const booking = bookingMap.get(
        report.driver_hire_request_id
      )

      const agreement = agreementMap.get(
        report.driver_hire_request_id
      )

      return {
        ...report,
        booking: booking
          ? {
              id: booking.id,
              booking_ref: booking.booking_ref,
              status: booking.status,
              currency: booking.currency,
              agreed_amount:
                agreement?.agreed_amount ?? null,
            }
          : null,
      }
    })

    return NextResponse.json(
      { ok: true, reports: results },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error(
      'Driver Hire admin bank transfer lookup:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to load Driver Hire bank transfer reports.',
      },
      { status: 500 }
    )
  }
}
