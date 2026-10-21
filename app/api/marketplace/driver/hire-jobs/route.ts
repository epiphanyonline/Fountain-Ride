import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../lib/server/supabaseAdmin'
import {
  getDriverForToken,
  driverToken,
  driverApplicationId,
} from '../../../../../lib/server/marketplaceAuth'

export async function GET(req: Request) {
  try {
    // ---------------------------------------------------------
    // Authenticate using the SAME method as driver dashboard
    // ---------------------------------------------------------

    const driver = await getDriverForToken(
      driverApplicationId(req),
      driverToken(req)
    )

    if (!driver) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const db = getSupabaseAdmin()

    // ---------------------------------------------------------
    // Driver Hire eligibility
    // ---------------------------------------------------------

    const workMode =
      driver.work_mode === 'driver_hire'
        ? 'driver_hire'
        : driver.work_mode === 'both'
          ? 'both'
          : 'passenger_trips'

    const supportsDriverHire =
      workMode === 'driver_hire' ||
      workMode === 'both'

    if (!supportsDriverHire) {
      return NextResponse.json({
        ok: true,
        eligible: false,
        available: false,
        reason: 'driver_hire_not_enabled',
        jobs: [],
      })
    }

    /*
     * General driver approval and Driver Hire approval
     * remain independent.
     */
    if (
      driver.verification_status !== 'approved'
    ) {
      return NextResponse.json({
        ok: true,
        eligible: false,
        available: false,
        reason: 'driver_not_approved',
        jobs: [],
      })
    }

    if (
      driver.driver_hire_status !== 'approved' ||
      driver.driver_hire_approved !== true
    ) {
      return NextResponse.json({
        ok: true,
        eligible: false,
        available: false,
        reason: 'driver_hire_not_approved',
        jobs: [],
      })
    }

    /*
     * Approval means eligible.
     * Availability is still controlled by the driver.
     */
    if (
      driver.driver_hire_available !== true
    ) {
      return NextResponse.json({
        ok: true,
        eligible: true,
        available: false,
        reason: 'driver_hire_paused',
        jobs: [],
      })
    }

    // ---------------------------------------------------------
    // Load open Driver Hire RFQs
    //
    // PRIVACY:
    // Do not select:
    // - customer_name
    // - customer_phone
    // - customer_email
    // - pickup_address
    // - destination_address
    //
    // The driver only receives marketplace-safe information.
    // ---------------------------------------------------------

    const {
      data: requests,
      error: requestsError,
    } = await db
      .from('driver_hire_requests')
      .select(
        `
          id,
          booking_ref,
          status,
          driver_need_type,
          job_type,
          job_description,
          public_work_area,
          pickup_city,
          pickup_state,
          destination_pattern,
          destination_city,
          destination_state,
          start_date,
          start_time,
          end_date,
          end_time,
          duration_hours,
          finish_time_uncertain,
          estimated_min_hours,
          estimated_max_hours,
          service_frequency,
          recurring_pattern,
          recurring_days,
          custom_schedule,
          recurring_end_date,
          recurring_duration_note,
          duties,
          vehicle_type,
          vehicle_make,
          vehicle_model,
          vehicle_year,
          vehicle_transmission,
          vehicle_notes,
          passenger_count,
          interstate_required,
          overnight_required,
          accommodation_arrangement,
          waiting_expected,
          estimated_waiting_hours,
          luggage_notes,
          special_requirements,
          created_at
        `
      )
      .in('status', [
        'requested',
        'negotiating',
      ])
      .order('created_at', {
        ascending: false,
      })
      .limit(100)

    if (requestsError) {
      console.error(
        'Driver Hire jobs lookup error:',
        requestsError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load Driver Hire jobs.',
        },
        { status: 500 }
      )
    }

    // ---------------------------------------------------------
    // Load this driver's current quotations
    // ---------------------------------------------------------

    const requestIds = (requests || []).map(
      (job: any) => job.id
    )

    let ownOffers: any[] = []

    if (requestIds.length > 0) {
      const {
        data: offerRows,
        error: offersError,
      } = await db
        .from('driver_hire_offers')
        .select(
          `
            id,
            driver_hire_request_id,
            amount,
            base_amount,
            included_hours,
            overtime_rate,
            additional_charges,
            status,
            version_number,
            is_current,
            created_at,
            updated_at
          `
        )
        .eq(
          'driver_application_id',
          driver.id
        )
        .eq('is_current', true)
        .in(
          'driver_hire_request_id',
          requestIds
        )

      if (offersError) {
        console.error(
          'Driver Hire quotations lookup error:',
          offersError
        )

        return NextResponse.json(
          {
            error:
              'Unable to load your Driver Hire quotations.',
          },
          { status: 500 }
        )
      }

      ownOffers = offerRows || []
    }

    const offerMap = new Map(
      ownOffers.map((offer: any) => [
        offer.driver_hire_request_id,
        offer,
      ])
    )

    // ---------------------------------------------------------
    // Load unread CUSTOMER messages for this driver
    //
    // Only customer messages with driver_read_at = NULL are
    // unread for the driver.
    //
    // We also retain the latest unread message for each RFQ
    // so the Driver Centre can show a useful preview.
    // ---------------------------------------------------------

    const quotedRequestIds =
      ownOffers.map(
        (offer: any) =>
          offer.driver_hire_request_id
      )

    let unreadMessages: any[] = []

    if (quotedRequestIds.length > 0) {
      const {
        data: messageRows,
        error: messagesError,
      } = await db
        .from('driver_hire_messages')
        .select(
          `
            id,
            driver_hire_request_id,
            body,
            created_at
          `
        )
        .eq(
          'driver_application_id',
          driver.id
        )
        .eq(
          'sender_role',
          'customer'
        )
        .is(
          'driver_read_at',
          null
        )
        .in(
          'driver_hire_request_id',
          quotedRequestIds
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )

      if (messagesError) {
        console.error(
          'Driver Hire unread messages lookup error:',
          messagesError
        )

        return NextResponse.json(
          {
            error:
              'Unable to load Driver Hire message notifications.',
          },
          { status: 500 }
        )
      }

      unreadMessages =
        messageRows || []
    }

    // ---------------------------------------------------------
    // Build unread message information by request
    // ---------------------------------------------------------

    const unreadMap =
      new Map<
        string,
        {
          count: number
          latest: {
            id: string
            body: string
            created_at: string
          } | null
        }
      >()

    for (
      const messageRow of unreadMessages
    ) {
      const requestId =
        messageRow.driver_hire_request_id

      const current =
        unreadMap.get(requestId)

      if (!current) {
        /*
         * Rows are ordered newest first,
         * so the first message encountered
         * is the latest unread message.
         */
        unreadMap.set(
          requestId,
          {
            count: 1,
            latest: {
              id: messageRow.id,
              body:
                messageRow.body,
              created_at:
                messageRow.created_at,
            },
          }
        )

        continue
      }

      current.count += 1
    }

    // ---------------------------------------------------------
    // Driver preferences
    // ---------------------------------------------------------

    const interests = Array.isArray(
      driver.driver_hire_job_types
    )
      ? driver.driver_hire_job_types
      : []

    // ---------------------------------------------------------
    // Capability filtering
    //
    // Transmission is a genuine capability requirement.
    // Job interests are preferences, not hard exclusions.
    // ---------------------------------------------------------

    const now = new Date()

    const isCurrentOpportunity = (job: any) => {
      if (!job.start_date) return true

      const start = new Date(
        `${job.start_date}T${job.start_time || '00:00:00'}+01:00`
      )

      if (Number.isNaN(start.getTime())) return true

      if (start >= now) return true

      const recurring =
        job.service_frequency &&
        !['one_time', 'one-off', 'one_time_only'].includes(
          String(job.service_frequency).toLowerCase()
        )

      if (!recurring) return false

      const endDate =
        job.recurring_end_date || job.end_date

      if (!endDate) return true

      const end = new Date(`${endDate}T23:59:59+01:00`)

      return Number.isNaN(end.getTime()) || end >= now
    }
    const jobs = (requests || [])
      .filter(isCurrentOpportunity)
      .filter((job: any) => {
        if (
          job.vehicle_transmission ===
            'manual' &&
          driver.drives_manual !== true
        ) {
          return false
        }

        if (
          job.vehicle_transmission ===
            'automatic' &&
          driver.drives_automatic !== true
        ) {
          return false
        }

        return true
      })
      .map((job: any) => {
        const unread =
          unreadMap.get(job.id)

        return {
          ...job,

          matches_interest:
            interests.length === 0 ||
            interests.includes(
              job.job_type
            ),

          my_offer:
            offerMap.get(job.id) ||
            null,

          unread_message_count:
            unread?.count || 0,

          latest_customer_message:
            unread?.latest || null,
        }
      })

    // ---------------------------------------------------------
    // Total unread Driver Hire messages
    //
    // Useful later for a global Driver Centre badge.
    // ---------------------------------------------------------

    const unreadMessageCount =
      unreadMessages.length

    // ---------------------------------------------------------
    // Response
    // ---------------------------------------------------------

    return NextResponse.json({
      ok: true,

      eligible: true,
      available: true,

      unread_message_count:
        unreadMessageCount,

      capabilities: {
        workMode,

        driverHire: true,

        driverHireApproved: true,

        driverHireAvailable: true,

        drivesAutomatic:
          driver.drives_automatic ===
          true,

        drivesManual:
          driver.drives_manual === true,

        interests,
      },

      jobs,
    })
  } catch (error) {
    console.error(
      'Driver Hire jobs API error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to load Driver Hire jobs.',
      },
      { status: 500 }
    )
  }
}
