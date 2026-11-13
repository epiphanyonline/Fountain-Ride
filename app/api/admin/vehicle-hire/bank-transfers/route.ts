
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../lib/server/supabaseAdmin'
import { isAdminSession } from '../../../../../lib/server/adminSession'

export async function GET() {
  try {
    // Only authenticated administrators can access reports.
    const authenticated = await isAdminSession()

    if (!authenticated) {
      return NextResponse.json(
        { error: 'Admin authentication required.' },
        { status: 401 }
      )
    }

    const db = getSupabaseAdmin()

    // Get customer-reported transfers awaiting verification.
    const { data: reports, error: reportsError } =
      await db
        .from('vehicle_hire_bank_transfer_reports')
        .select(`
          id,
          vehicle_hire_request_id,
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

    // Get the bookings linked to these payment reports.
    const requestIds = [
      ...new Set(
        rows.map(row => row.vehicle_hire_request_id)
      ),
    ]

    const { data: bookings, error: bookingsError } =
      await db
        .from('vehicle_hire_requests')
        .select(`
          id,
          booking_ref,
          agreed_amount,
          currency,
          status
        `)
        .in('id', requestIds)

    if (bookingsError) {
      throw bookingsError
    }

    const bookingMap = new Map(
      (bookings || []).map(booking => [
        booking.id,
        booking,
      ])
    )

    const results = rows.map(report => ({
      ...report,
      booking:
        bookingMap.get(report.vehicle_hire_request_id) ||
        null,
    }))

    return NextResponse.json(
      {
        ok: true,
        reports: results,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error(
      'Admin bank transfer lookup failed:',
      error
    )

    return NextResponse.json(
      {
        error: 'Unable to load bank transfer reports.',
      },
      { status: 500 }
    )
  }
}
