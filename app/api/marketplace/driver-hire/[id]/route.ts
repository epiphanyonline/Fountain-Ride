import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../lib/server/supabaseAdmin'

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const supabase = getSupabaseAdmin()
    const { id } = await context.params

    const accessToken =
      request.headers
        .get('x-driver-hire-access-token')
        ?.trim()

    if (!id || !accessToken) {
      return NextResponse.json(
        {
          error:
            'Driver Hire request access is required.',
        },
        { status: 401 }
      )
    }

    // ---------------------------------------------------------
    // Verify private customer access
    // ---------------------------------------------------------

    const {
      data: access,
      error: accessError,
    } = await supabase
      .from('driver_hire_customer_access')
      .select(`
        id,
        driver_hire_request_id,
        revoked_at
      `)
      .eq(
        'driver_hire_request_id',
        id
      )
      .eq(
        'access_token',
        accessToken
      )
      .is(
        'revoked_at',
        null
      )
      .maybeSingle()

    if (accessError) {
      console.error(
        'Driver Hire access lookup error:',
        accessError
      )

      return NextResponse.json(
        {
          error:
            'Unable to verify request access.',
        },
        { status: 500 }
      )
    }

    if (!access) {
      return NextResponse.json(
        {
          error:
            'You do not have access to this Driver Hire request.',
        },
        { status: 403 }
      )
    }

    // ---------------------------------------------------------
    // Load customer-private RFQ
    // ---------------------------------------------------------

    const {
      data: hireRequest,
      error: requestError,
    } = await supabase
      .from('driver_hire_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (requestError) {
      console.error(
        'Driver Hire request lookup error:',
        requestError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load the Driver Hire request.',
        },
        { status: 500 }
      )
    }

    if (!hireRequest) {
      return NextResponse.json(
        {
          error:
            'Driver Hire request not found.',
        },
        { status: 404 }
      )
    }

    // ---------------------------------------------------------
    // Load current offers
    // ---------------------------------------------------------

    const {
      data: offers,
      error: offersError,
    } = await supabase
      .from('driver_hire_offers')
      .select(`
        id,
        driver_hire_request_id,
        driver_application_id,
        amount,
        base_amount,
        included_hours,
        overtime_rate,
        additional_charges,
        additional_charges_note,
        fuel_terms,
        toll_parking_terms,
        accommodation_terms,
        offer_conditions,
        message,
        status,
        version_number,
        previous_offer_id,
        is_current,
        accepted_at,
        created_at,
        updated_at
      `)
      .eq(
        'driver_hire_request_id',
        id
      )
      .eq(
        'is_current',
        true
      )
      .order(
        'created_at',
        {
          ascending: false,
        }
      )

    if (offersError) {
      console.error(
        'Driver Hire offers lookup error:',
        offersError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load Driver Hire offers.',
        },
        { status: 500 }
      )
    }

    // ---------------------------------------------------------
    // Load safe driver profile information
    // ---------------------------------------------------------

    const driverIds =
      Array.from(
        new Set(
          (offers || [])
            .map(
              offer =>
                offer.driver_application_id
            )
            .filter(Boolean)
        )
      )

    let drivers: any[] = []

    if (driverIds.length > 0) {
      const {
        data: driverRows,
        error: driversError,
      } = await supabase
        .from('driver_applications')
        .select(`
          id,
          full_name,
          home_city,
          home_state,
          work_mode,
          driving_experience_years,
          drives_automatic,
          drives_manual,
          driver_hire_job_types,
          driver_hire_status
        `)
        .in(
          'id',
          driverIds
        )

      if (driversError) {
        console.error(
          'Driver Hire driver profile lookup error:',
          driversError
        )

        return NextResponse.json(
          {
            error:
              'Unable to load driver profiles.',
          },
          { status: 500 }
        )
      }

      drivers =
        driverRows || []
    }

    const driverMap =
      new Map(
        drivers.map(
          driver => [
            driver.id,
            driver,
          ]
        )
      )

    // ---------------------------------------------------------
    // Load unread DRIVER messages for this customer
    //
    // IMPORTANT:
    // This does NOT mark anything as read.
    //
    // Merely visiting the request page should show the
    // customer that a driver has replied.
    //
    // Messages are marked read only when the customer
    // actually opens that driver's conversation.
    // ---------------------------------------------------------

    let unreadMessages: any[] = []

    if (driverIds.length > 0) {
      const {
        data: messageRows,
        error: messagesError,
      } = await supabase
        .from('driver_hire_messages')
        .select(`
          id,
          driver_hire_request_id,
          driver_application_id,
          body,
          created_at
        `)
        .eq(
          'driver_hire_request_id',
          id
        )
        .eq(
          'sender_role',
          'driver'
        )
        .is(
          'customer_read_at',
          null
        )
        .in(
          'driver_application_id',
          driverIds
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )

      if (messagesError) {
        console.error(
          'Driver Hire customer unread messages lookup error:',
          messagesError
        )

        return NextResponse.json(
          {
            error:
              'Unable to load message notifications.',
          },
          { status: 500 }
        )
      }

      unreadMessages =
        messageRows || []
    }

    // ---------------------------------------------------------
    // Build unread information per driver
    //
    // Because unreadMessages is newest-first, the first
    // message encountered for each driver is the latest
    // unread message.
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
      const driverId =
        messageRow.driver_application_id

      if (!driverId) {
        continue
      }

      const current =
        unreadMap.get(driverId)

      if (!current) {
        unreadMap.set(
          driverId,
          {
            count: 1,

            latest: {
              id:
                messageRow.id,

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
    // Merge safe driver + unread notification into each offer
    // ---------------------------------------------------------

    const safeOffers =
      (offers || []).map(
        offer => {
          const unread =
            unreadMap.get(
              offer.driver_application_id
            )

          return {
            ...offer,

            driver:
              driverMap.get(
                offer.driver_application_id
              ) || null,

            unread_message_count:
              unread?.count || 0,

            latest_driver_message:
              unread?.latest || null,
          }
        }
      )

    // ---------------------------------------------------------
    // Load accepted agreement if one exists
    // ---------------------------------------------------------

    const {
      data: agreement,
      error: agreementError,
    } = await supabase
      .from('driver_hire_agreements')
      .select(`
        id,
        driver_hire_request_id,
        accepted_offer_id,
        driver_application_id,
        agreed_amount,
        included_hours,
        overtime_rate,
        additional_charges,
        fuel_terms,
        toll_parking_terms,
        accommodation_terms,
        offer_conditions,
        accepted_at,
        created_at
      `)
      .eq(
        'driver_hire_request_id',
        id
      )
      .maybeSingle()

    if (agreementError) {
      console.error(
        'Driver Hire agreement lookup error:',
        agreementError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load the Driver Hire agreement.',
        },
        { status: 500 }
      )
    }

    // ---------------------------------------------------------
    // Update access-token activity
    //
    // This is NOT message-read activity.
    // ---------------------------------------------------------

    await supabase
      .from(
        'driver_hire_customer_access'
      )
      .update({
        last_used_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        access.id
      )

    // ---------------------------------------------------------
    // Customer response
    // ---------------------------------------------------------

    // Load negotiation state for this customer's booking.
    // Authentication has already been verified above.
    const { data: negotiations, error: negotiationsError } =
      await supabase
        .from('hire_negotiation_state')
        .select(`
          offer_id,
          current_amount,
          last_actor,
          status,
          revision,
          updated_at
        `)
        .eq('service_type', 'driver_hire')
        .eq('request_id', id)

    if (negotiationsError) {
      console.error(
        'Driver Hire negotiation lookup error:',
        negotiationsError
      )

      return NextResponse.json(
        { error: 'Unable to load negotiation status.' },
        { status: 500 }
      )
    }
    return NextResponse.json({
      ok: true,

      request:
        hireRequest,

      offers:
        safeOffers,

      agreement:
        agreement || null,

      negotiations:
        negotiations || [],

      /*
       * Overall unread count can later be used for
       * a request-level Messages badge.
       */
      unread_message_count:
        unreadMessages.length,
    })
  } catch (error) {
    console.error(
      'Driver Hire customer request API error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to load the Driver Hire request.',
      },
      { status: 500 }
    )
  }
}
