import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../lib/server/supabaseAdmin'
import { isAdminSession } from '../../../../../lib/server/adminSession'

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const authenticated = await isAdminSession()

    if (!authenticated) {
      return NextResponse.json(
        { error: 'Admin authentication required.' },
        { status: 401 }
      )
    }

    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { error: 'Vehicle Hire request is required.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // ---------------------------------------------------------
    // REQUEST
    // ---------------------------------------------------------

    const {
      data: hireRequest,
      error: requestError,
    } = await supabase
      .from('vehicle_hire_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (requestError) {
      console.error(
        'Admin Vehicle Hire request lookup failed:',
        requestError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load Vehicle Hire request.',
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
    // VEHICLE
    // ---------------------------------------------------------

    const {
      data: vehicle,
      error: vehicleError,
    } = await supabase
      .from('cars')
      .select('*')
      .eq('id', hireRequest.car_id)
      .maybeSingle()

    if (vehicleError) {
      console.error(
        'Admin Vehicle Hire vehicle lookup failed:',
        vehicleError
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
    // OFFER HISTORY
    //
    // We return all versions so the admin can later see
    // how a quotation changed during negotiation.
    // ---------------------------------------------------------

    const {
      data: offers,
      error: offersError,
    } = await supabase
      .from('vehicle_hire_offers')
      .select('*')
      .eq('vehicle_hire_request_id', id)
      .order('version_number', {
        ascending: false,
      })

    if (offersError) {
      console.error(
        'Admin Vehicle Hire offer lookup failed:',
        offersError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load quotation history.',
        },
        { status: 500 }
      )
    }

    // ---------------------------------------------------------
    // MESSAGES
    // ---------------------------------------------------------

    const {
      data: messages,
      error: messagesError,
    } = await supabase
      .from('vehicle_hire_messages')
      .select('*')
      .eq('vehicle_hire_request_id', id)
      .order('created_at', {
        ascending: true,
      })

    if (messagesError) {
      console.error(
        'Admin Vehicle Hire messages lookup failed:',
        messagesError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load negotiation messages.',
        },
        { status: 500 }
      )
    }

    // Mark customer messages as read now that admin opened request.
    const unreadCustomerMessageIds = (
      messages || []
    )
      .filter(
        (message) =>
          message.sender_role === 'customer' &&
          !message.owner_read_at
      )
      .map((message) => message.id)

    if (unreadCustomerMessageIds.length > 0) {
      const { error: readError } =
        await supabase
          .from('vehicle_hire_messages')
          .update({
            owner_read_at:
              new Date().toISOString(),
          })
          .in(
            'id',
            unreadCustomerMessageIds
          )

      if (readError) {
        console.error(
          'Unable to mark Vehicle Hire messages as read:',
          readError
        )
      }
    }

    // ---------------------------------------------------------
    // AGREEMENT
    // ---------------------------------------------------------

    const {
      data: agreement,
      error: agreementError,
    } = await supabase
      .from('vehicle_hire_agreements')
      .select('*')
      .eq('vehicle_hire_request_id', id)
      .maybeSingle()

    if (agreementError) {
      console.error(
        'Admin Vehicle Hire agreement lookup failed:',
        agreementError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load Vehicle Hire agreement.',
        },
        { status: 500 }
      )
    }

    // ---------------------------------------------------------
    // PAYMENT
    // ---------------------------------------------------------

    const {
      data: payments,
      error: paymentsError,
    } = await supabase
      .from('vehicle_hire_payments')
      .select('*')
      .eq('vehicle_hire_request_id', id)
      .order('created_at', {
        ascending: false,
      })

    if (paymentsError) {
      console.error(
        'Admin Vehicle Hire payment lookup failed:',
        paymentsError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load payment information.',
        },
        { status: 500 }
      )
    }

    // ---------------------------------------------------------
    // EARNING
    // ---------------------------------------------------------

    const {
      data: earning,
      error: earningError,
    } = await supabase
      .from('vehicle_hire_earnings')
      .select('*')
      .eq('vehicle_hire_request_id', id)
      .maybeSingle()

    if (earningError) {
      console.error(
        'Admin Vehicle Hire earning lookup failed:',
        earningError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load earning information.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,

      request: hireRequest,

      vehicle: vehicle || null,

      offers: offers || [],

      currentOffer:
        (offers || []).find(
          (offer) => offer.is_current
        ) || null,

      messages: messages || [],

      agreement: agreement || null,

      payments: payments || [],

      earning: earning || null,
    })
  } catch (error) {
    console.error(
      'Admin Vehicle Hire detail API error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to load Vehicle Hire request.',
      },
      { status: 500 }
    )
  }
}
