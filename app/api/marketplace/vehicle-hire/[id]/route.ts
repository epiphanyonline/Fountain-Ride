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

    const accessToken = request.headers
      .get('x-vehicle-hire-access-token')
      ?.trim()

    if (!id || !accessToken) {
      return NextResponse.json(
        {
          error: 'Vehicle Hire request access is required.',
        },
        { status: 401 }
      )
    }

    // ---------------------------------------------------------
    // Verify private customer access
    // ---------------------------------------------------------

    const { data: access, error: accessError } =
      await supabase
        .from('vehicle_hire_customer_access')
        .select(`
          id,
          vehicle_hire_request_id,
          revoked_at
        `)
        .eq('vehicle_hire_request_id', id)
        .eq('access_token', accessToken)
        .is('revoked_at', null)
        .maybeSingle()

    if (accessError) {
      console.error(
        'Vehicle Hire access lookup error:',
        accessError
      )

      return NextResponse.json(
        {
          error: 'Unable to verify request access.',
        },
        { status: 500 }
      )
    }

    if (!access) {
      return NextResponse.json(
        {
          error:
            'You do not have access to this Vehicle Hire request.',
        },
        { status: 403 }
      )
    }

    // ---------------------------------------------------------
    // Load customer-private request
    // ---------------------------------------------------------

    const { data: hireRequest, error: requestError } =
      await supabase
        .from('vehicle_hire_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle()

    if (requestError) {
      console.error(
        'Vehicle Hire request lookup error:',
        requestError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load the Vehicle Hire request.',
        },
        { status: 500 }
      )
    }

    if (!hireRequest) {
      return NextResponse.json(
        {
          error: 'Vehicle Hire request not found.',
        },
        { status: 404 }
      )
    }

    // ---------------------------------------------------------
    // Load selected vehicle
    // ---------------------------------------------------------

    const { data: car, error: carError } =
      await supabase
        .from('cars')
        .select(`
          id,
          name,
          daily_rate,
          transmission,
          fuel_type,
          seats,
          image_url,
          image_urls,
          description,
          status
        `)
        .eq('id', hireRequest.car_id)
        .maybeSingle()

    if (carError) {
      console.error(
        'Vehicle Hire car lookup error:',
        carError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load the selected vehicle.',
        },
        { status: 500 }
      )
    }

    // ---------------------------------------------------------
    // Load current owner quotation
    //
    // One vehicle is selected for this request, so unlike
    // Driver Hire we are not comparing multiple drivers.
    // ---------------------------------------------------------

    const { data: offers, error: offersError } =
      await supabase
        .from('vehicle_hire_offers')
        .select(`
          id,
          vehicle_hire_request_id,
          car_id,
          amount,
          included_days,
          included_hours,
          overtime_rate,
          extra_day_rate,
          additional_charges,
          additional_charges_note,
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
        .eq('vehicle_hire_request_id', id)
        .eq('is_current', true)
        .order('created_at', {
          ascending: false,
        })

    if (offersError) {
      console.error(
        'Vehicle Hire offers lookup error:',
        offersError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load the vehicle quotation.',
        },
        { status: 500 }
      )
    }

    // ---------------------------------------------------------
    // Unread owner messages
    // ---------------------------------------------------------

    const { data: unreadMessages, error: messagesError } =
      await supabase
        .from('vehicle_hire_messages')
        .select(`
          id,
          body,
          created_at
        `)
        .eq('vehicle_hire_request_id', id)
        .eq('sender_role', 'owner')
        .is('customer_read_at', null)
        .order('created_at', {
          ascending: false,
        })

    if (messagesError) {
      console.error(
        'Vehicle Hire unread message lookup error:',
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

    const currentOffers = (offers || []).map(
      (offer, index) => ({
        ...offer,

        unread_message_count:
          index === 0
            ? (unreadMessages || []).length
            : 0,

        latest_owner_message:
          index === 0
            ? (unreadMessages || [])[0] || null
            : null,
      })
    )

    // ---------------------------------------------------------
    // Load agreement if quotation has been accepted
    // ---------------------------------------------------------

    const { data: agreement, error: agreementError } =
      await supabase
        .from('vehicle_hire_agreements')
        .select(`
          id,
          vehicle_hire_request_id,
          accepted_offer_id,
          car_id,
          agreed_amount,
          included_days,
          included_hours,
          overtime_rate,
          extra_day_rate,
          additional_charges,
          offer_conditions,
          accepted_at,
          created_at
        `)
        .eq('vehicle_hire_request_id', id)
        .maybeSingle()

    if (agreementError) {
      console.error(
        'Vehicle Hire agreement lookup error:',
        agreementError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load the Vehicle Hire agreement.',
        },
        { status: 500 }
      )
    }

    // ---------------------------------------------------------
    // Update access activity
    // ---------------------------------------------------------

    await supabase
      .from('vehicle_hire_customer_access')
      .update({
        last_used_at: new Date().toISOString(),
      })
      .eq('id', access.id)

    return NextResponse.json({
      ok: true,

      request: hireRequest,

      vehicle: car || null,

      offers: currentOffers,

      agreement: agreement || null,

      unread_message_count:
        (unreadMessages || []).length,
    })
  } catch (error) {
    console.error(
      'Vehicle Hire customer request API error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to load the Vehicle Hire request.',
      },
      { status: 500 }
    )
  }
}
