
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../lib/server/supabaseAdmin'
import { isAdminSession } from '../../../../lib/server/adminSession'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (!(await isAdminSession())) {
      return NextResponse.json(
        { error: 'Admin authentication required.' },
        { status: 401 }
      )
    }

    const db = getSupabaseAdmin()

    const { data: requests, error: requestError } =
      await db
        .from('driver_hire_requests')
        .select(`
          id,
          booking_ref,
          customer_name,
          customer_phone,
          job_type,
          driver_need_type,
          pickup_city,
          pickup_state,
          public_work_area,
          start_date,
          start_time,
          status,
          currency,
          agreed_fare,
          selected_driver_application_id,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(100)

    if (requestError) throw requestError

    const rows = requests || []

    if (rows.length === 0) {
      return NextResponse.json({
        ok: true,
        bookings: [],
      })
    }

    const ids = rows.map((row) => row.id)

    const [
      offersResult,
      agreementsResult,
      paymentsResult,
      reportsResult,
      earningsResult,
      eventsResult,
    ] = await Promise.all([
      db
        .from('driver_hire_offers')
        .select('id, driver_hire_request_id')
        .in('driver_hire_request_id', ids)
        .limit(1000),

      db
        .from('driver_hire_agreements')
        .select(`
          driver_hire_request_id,
          agreed_amount,
          driver_application_id
        `)
        .in('driver_hire_request_id', ids),

      db
        .from('driver_hire_payments')
        .select(`
          driver_hire_request_id,
          provider,
          status,
          gross_amount,
          paid_at,
          created_at
        `)
        .in('driver_hire_request_id', ids)
        .order('created_at', { ascending: false })
        .limit(1000),

      db
        .from('driver_hire_bank_transfer_reports')
        .select(`
          driver_hire_request_id,
          status,
          sender_name,
          created_at
        `)
        .in('driver_hire_request_id', ids)
        .order('created_at', { ascending: false })
        .limit(1000),

      db
        .from('driver_hire_earnings')
        .select(`
          driver_hire_request_id,
          gross_amount,
          commission_amount,
          net_amount,
          status,
          created_at
        `)
        .in('driver_hire_request_id', ids)
        .limit(1000),

      db
        .from('driver_hire_events')
        .select(`
          driver_hire_request_id,
          event_type,
          created_at
        `)
        .in('driver_hire_request_id', ids)
        .order('created_at', { ascending: false })
        .limit(1000),
    ])

    for (const result of [
      offersResult,
      agreementsResult,
      paymentsResult,
      reportsResult,
      earningsResult,
      eventsResult,
    ]) {
      if (result.error) throw result.error
    }

    const offerCount = new Map<string, number>()

    for (const offer of offersResult.data || []) {
      const key = offer.driver_hire_request_id

      offerCount.set(
        key,
        (offerCount.get(key) || 0) + 1
      )
    }

    const agreements = new Map(
      (agreementsResult.data || []).map((a) => [
        a.driver_hire_request_id,
        a,
      ])
    )

    const payments = new Map<
      string,
      NonNullable<typeof paymentsResult.data>[number]
    >()

    for (const payment of paymentsResult.data || []) {
      const key = payment.driver_hire_request_id
      const existing = payments.get(key)

      if (
        !existing ||
        (existing.status !== 'paid' &&
          payment.status === 'paid')
      ) {
        payments.set(key, payment)
      }
    }

    const bankReports = new Map<
      string,
      NonNullable<typeof reportsResult.data>[number]
    >()

    for (const report of reportsResult.data || []) {
      if (!bankReports.has(report.driver_hire_request_id)) {
        bankReports.set(report.driver_hire_request_id, report)
      }
    }

    const earnings = new Map<
      string,
      NonNullable<typeof earningsResult.data>[number]
    >()

    const earningCounts = new Map<string, number>()

    for (const earning of earningsResult.data || []) {
      const key = earning.driver_hire_request_id

      earningCounts.set(
        key,
        (earningCounts.get(key) || 0) + 1
      )

      if (!earnings.has(key)) {
        earnings.set(key, earning)
      }
    }

    const latestEvents = new Map<
      string,
      NonNullable<typeof eventsResult.data>[number]
    >()

    for (const event of eventsResult.data || []) {
      if (!latestEvents.has(event.driver_hire_request_id)) {
        latestEvents.set(
          event.driver_hire_request_id,
          event
        )
      }
    }

    const bookings = rows.map((request) => {
      const agreement = agreements.get(request.id)
      const payment = payments.get(request.id)
      const report = bankReports.get(request.id)
      const earning = earnings.get(request.id)
      const event = latestEvents.get(request.id)

      return {
        id: request.id,
        bookingRef: request.booking_ref,
        customerName: request.customer_name,
        customerPhone: request.customer_phone,
        jobType: request.job_type,
        driverNeedType: request.driver_need_type,
        workArea:
          request.public_work_area ||
          request.pickup_city ||
          request.pickup_state ||
          '',
        startDate: request.start_date,
        startTime: request.start_time,
        status: request.status,
        currency: request.currency,
        createdAt: request.created_at,

        offerCount: offerCount.get(request.id) || 0,

        selectedDriverId:
          agreement?.driver_application_id ||
          request.selected_driver_application_id,

        agreedAmount:
          agreement?.agreed_amount ??
          request.agreed_fare ??
          null,

        paymentStatus: payment?.status || null,
        paymentMethod: payment?.provider || null,
        paymentAmount: payment?.gross_amount ?? null,

        bankReportStatus: report?.status || null,
        bankSenderName: report?.sender_name || null,

        earningsStatus: earning?.status || null,
        commissionAmount:
          earning?.commission_amount ?? null,
        driverNet: earning?.net_amount ?? null,
        earningRecordsCount:
          earningCounts.get(request.id) || 0,

        latestEvent: event?.event_type || null,
        latestEventAt: event?.created_at || null,
      }
    })

    return NextResponse.json(
      {
        ok: true,
        bookings,
        limit: 100,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error(
      'Driver Hire operations lookup failed:',
      error
    )

    return NextResponse.json(
      {
        error: 'Unable to load Driver Hire operations.',
      },
      { status: 500 }
    )
  }
}
