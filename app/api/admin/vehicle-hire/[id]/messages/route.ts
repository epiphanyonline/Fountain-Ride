import {
  NextRequest,
  NextResponse,
} from 'next/server'

import { getSupabaseAdmin } from '../../../../../../lib/server/supabaseAdmin'
import { isAdminSession } from '../../../../../../lib/server/adminSession'

function cleanText(value: unknown) {
  return typeof value === 'string'
    ? value.trim()
    : ''
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    // ---------------------------------------------------------
    // ADMIN AUTHENTICATION
    // ---------------------------------------------------------

    const authenticated =
      await isAdminSession()

    if (!authenticated) {
      return NextResponse.json(
        {
          error:
            'Admin authentication required.',
        },
        { status: 401 }
      )
    }

    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        {
          error:
            'Vehicle Hire request is required.',
        },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // MESSAGE
    // ---------------------------------------------------------

    const body = await request.json()

    const message = cleanText(
      body?.message
    )

    if (!message) {
      return NextResponse.json(
        {
          error:
            'Enter a message before sending.',
        },
        { status: 400 }
      )
    }

    if (message.length > 2000) {
      return NextResponse.json(
        {
          error:
            'Messages cannot exceed 2,000 characters.',
        },
        { status: 400 }
      )
    }

    const supabase =
      getSupabaseAdmin()

    // ---------------------------------------------------------
    // REQUEST
    // ---------------------------------------------------------

    const {
      data: hireRequest,
      error: requestError,
    } = await supabase
      .from('vehicle_hire_requests')
      .select(
        'id, car_id, status'
      )
      .eq('id', id)
      .maybeSingle()

    if (requestError) {
      console.error(
        'Admin Vehicle Hire message request lookup failed:',
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
          error:
            'Vehicle Hire request not found.',
        },
        { status: 404 }
      )
    }

    // ---------------------------------------------------------
    // NEGOTIATION MUST STILL BE OPEN
    // ---------------------------------------------------------

    const allowedStatuses = [
      'requested',
      'negotiating',
    ]

    if (
      !allowedStatuses.includes(
        hireRequest.status
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Negotiation is closed for this Vehicle Hire request.',
        },
        { status: 409 }
      )
    }

    // ---------------------------------------------------------
    // REQUIRE A CURRENT FORMAL QUOTATION
    //
    // Chat is for negotiating an actual quotation.
    // Price changes themselves must still be issued as a new
    // formal quotation version.
    // ---------------------------------------------------------

    const {
      data: currentOffer,
      error: offerError,
    } = await supabase
      .from('vehicle_hire_offers')
      .select('id')
      .eq(
        'vehicle_hire_request_id',
        id
      )
      .eq('is_current', true)
      .maybeSingle()

    if (offerError) {
      console.error(
        'Admin Vehicle Hire current offer lookup failed:',
        offerError
      )

      return NextResponse.json(
        {
          error:
            'Unable to verify the current quotation.',
        },
        { status: 500 }
      )
    }

    if (!currentOffer) {
      return NextResponse.json(
        {
          error:
            'Send a quotation before starting negotiation.',
        },
        { status: 409 }
      )
    }

    // ---------------------------------------------------------
    // SAVE ADMIN / OWNER MESSAGE
    //
    // We use "admin" because the existing schema allows:
    // customer / owner / admin.
    //
    // owner_read_at is set immediately because this message
    // originates from the Fountain Ride admin side.
    // customer_read_at stays null until the customer opens it.
    // ---------------------------------------------------------

    const {
      data: createdMessage,
      error: messageError,
    } = await supabase
      .from('vehicle_hire_messages')
      .insert({
        vehicle_hire_request_id:
          hireRequest.id,

        car_id:
          hireRequest.car_id,

        sender_role: 'admin',

        body: message,

        owner_read_at:
          new Date().toISOString(),

        customer_read_at: null,
      })
      .select('*')
      .single()

    if (messageError) {
      console.error(
        'Admin Vehicle Hire message insert failed:',
        messageError
      )

      return NextResponse.json(
        {
          error:
            'Unable to send negotiation message.',
        },
        { status: 500 }
      )
    }

    // ---------------------------------------------------------
    // NORMALISE STATUS
    // ---------------------------------------------------------

    if (
      hireRequest.status ===
      'requested'
    ) {
      const {
        error: statusError,
      } = await supabase
        .from(
          'vehicle_hire_requests'
        )
        .update({
          status: 'negotiating',
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', hireRequest.id)

      if (statusError) {
        console.error(
          'Unable to update Vehicle Hire negotiation status:',
          statusError
        )
      }
    }

    // ---------------------------------------------------------
    // AUDIT EVENT
    //
    // Deliberately do not copy the private chat body into the
    // event log. The message already exists in the messages
    // table.
    // ---------------------------------------------------------

    const {
      error: eventError,
    } = await supabase
      .from('vehicle_hire_events')
      .insert({
        vehicle_hire_request_id:
          hireRequest.id,

        event_type:
          'admin_message_sent',

        actor_role: 'admin',

        metadata: {
          message_id:
            createdMessage.id,
        },
      })

    if (eventError) {
      console.error(
        'Unable to create Vehicle Hire message event:',
        eventError
      )
    }

    return NextResponse.json({
      ok: true,
      message: createdMessage,
    })
  } catch (error) {
    console.error(
      'Admin Vehicle Hire messages API error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to send negotiation message.',
      },
      { status: 500 }
    )
  }
}
