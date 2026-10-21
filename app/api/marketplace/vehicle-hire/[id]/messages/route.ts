import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../../lib/server/supabaseAdmin'

function text(value: unknown) {
  return typeof value === 'string'
    ? value.trim()
    : ''
}

async function getCustomerAccess(
  requestId: string,
  req: Request
) {
  const accessToken = text(
    req.headers.get(
      'x-vehicle-hire-access-token'
    )
  )

  if (!accessToken) {
    return {
      ok: false as const,
      status: 401,
      error:
        'Vehicle Hire access token is required.',
    }
  }

  const supabase = getSupabaseAdmin()

  const {
    data: access,
    error: accessError,
  } = await supabase
    .from('vehicle_hire_customer_access')
    .select(
      `
        id,
        vehicle_hire_request_id,
        revoked_at
      `
    )
    .eq(
      'vehicle_hire_request_id',
      requestId
    )
    .eq('access_token', accessToken)
    .is('revoked_at', null)
    .maybeSingle()

  if (accessError) {
    console.error(
      'Vehicle Hire customer access lookup failed:',
      accessError
    )

    return {
      ok: false as const,
      status: 500,
      error:
        'Unable to verify access to this request.',
    }
  }

  if (!access) {
    return {
      ok: false as const,
      status: 403,
      error:
        'You do not have access to this Vehicle Hire request.',
    }
  }

  await supabase
    .from('vehicle_hire_customer_access')
    .update({
      last_used_at:
        new Date().toISOString(),
    })
    .eq('id', access.id)

  return {
    ok: true as const,
    supabase,
  }
}

/*
 * GET
 *
 * Customer loads the negotiation conversation.
 *
 * Reading the conversation marks OWNER messages
 * as read by the customer.
 */
export async function GET(
  req: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { error: 'Request ID is required.' },
        { status: 400 }
      )
    }

    const access =
      await getCustomerAccess(id, req)

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const { supabase } = access

    /*
     * Confirm the request still exists.
     */
    const {
      data: hireRequest,
      error: requestError,
    } = await supabase
      .from('vehicle_hire_requests')
      .select(
        `
          id,
          car_id,
          status
        `
      )
      .eq('id', id)
      .maybeSingle()

    if (requestError) {
      console.error(
        'Vehicle Hire request lookup failed:',
        requestError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load this Vehicle Hire conversation.',
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

    const {
      data: messages,
      error: messagesError,
    } = await supabase
      .from('vehicle_hire_messages')
      .select(
        `
          id,
          vehicle_hire_request_id,
          car_id,
          sender_role,
          body,
          customer_read_at,
          owner_read_at,
          created_at
        `
      )
      .eq(
        'vehicle_hire_request_id',
        id
      )
      .order('created_at', {
        ascending: true,
      })

    if (messagesError) {
      console.error(
        'Vehicle Hire messages lookup failed:',
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

    const now = new Date().toISOString()

    /*
     * Customer has now seen all owner/admin
     * messages in this conversation.
     */
    const {
      error: readError,
    } = await supabase
      .from('vehicle_hire_messages')
      .update({
        customer_read_at: now,
      })
      .eq(
        'vehicle_hire_request_id',
        id
      )
      .in(
        'sender_role',
        ['owner', 'admin']
      )
      .is('customer_read_at', null)

    if (readError) {
      console.error(
        'Vehicle Hire customer read update failed:',
        readError
      )
    }

    return NextResponse.json({
      ok: true,
      requestStatus:
        hireRequest.status,
      messages: messages || [],
    })
  } catch (error) {
    console.error(
      'Vehicle Hire customer messages GET error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to load the Vehicle Hire conversation.',
      },
      { status: 500 }
    )
  }
}

/*
 * POST
 *
 * Customer sends a negotiation message.
 *
 * A message does NOT change the quotation.
 * Price changes must still happen through a
 * new quotation version from the owner/admin.
 */
export async function POST(
  req: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { error: 'Request ID is required.' },
        { status: 400 }
      )
    }

    const access =
      await getCustomerAccess(id, req)

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const { supabase } = access

    const body = await req.json()

    const message = text(body.message)

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

    const {
      data: hireRequest,
      error: requestError,
    } = await supabase
      .from('vehicle_hire_requests')
      .select(
        `
          id,
          car_id,
          status
        `
      )
      .eq('id', id)
      .maybeSingle()

    if (requestError) {
      console.error(
        'Vehicle Hire request lookup failed:',
        requestError
      )

      return NextResponse.json(
        {
          error:
            'Unable to verify this Vehicle Hire request.',
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

    /*
     * Customer negotiation is only available
     * while the quotation is still open.
     *
     * Once accepted/payment/operations begin,
     * this negotiation thread becomes read-only.
     */
    if (
      ![
        'requested',
        'negotiating',
      ].includes(hireRequest.status)
    ) {
      return NextResponse.json(
        {
          error:
            'Quotation negotiation is closed for this request.',
        },
        { status: 409 }
      )
    }

    /*
     * Do not allow a negotiation message before
     * the owner has actually issued a quotation.
     */
    const {
      data: currentOffer,
      error: offerError,
    } = await supabase
      .from('vehicle_hire_offers')
      .select(
        `
          id,
          status,
          is_current
        `
      )
      .eq(
        'vehicle_hire_request_id',
        id
      )
      .eq('is_current', true)
      .maybeSingle()

    if (offerError) {
      console.error(
        'Vehicle Hire current offer lookup failed:',
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
            'Please wait for the vehicle owner to send a quotation before starting negotiation.',
        },
        { status: 409 }
      )
    }

    const {
      data: createdMessage,
      error: messageError,
    } = await supabase
      .from('vehicle_hire_messages')
      .insert({
        vehicle_hire_request_id: id,
        car_id: hireRequest.car_id,
        sender_role: 'customer',
        body: message,

        /*
         * The customer obviously has already
         * seen their own message.
         */
        customer_read_at:
          new Date().toISOString(),

        owner_read_at: null,
      })
      .select(
        `
          id,
          vehicle_hire_request_id,
          car_id,
          sender_role,
          body,
          customer_read_at,
          owner_read_at,
          created_at
        `
      )
      .single()

    if (
      messageError ||
      !createdMessage
    ) {
      console.error(
        'Vehicle Hire customer message creation failed:',
        messageError
      )

      return NextResponse.json(
        {
          error:
            'Unable to send your message.',
        },
        { status: 500 }
      )
    }

    /*
     * A quotation can technically have been sent
     * while the request still says "requested".
     * Normalise it to negotiating once the customer
     * begins the conversation.
     */
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
        .eq('id', id)
        .eq('status', 'requested')

      if (statusError) {
        console.error(
          'Vehicle Hire negotiation status update failed:',
          statusError
        )
      }
    }

    /*
     * Audit trail.
     *
     * We deliberately do not duplicate the
     * actual private message body into event
     * metadata.
     */
    const {
      error: eventError,
    } = await supabase
      .from('vehicle_hire_events')
      .insert({
        vehicle_hire_request_id:
          id,
        event_type:
          'customer_message_sent',
        actor_role: 'customer',
        metadata: {
          message_id:
            createdMessage.id,
        },
      })

    if (eventError) {
      console.error(
        'Vehicle Hire message event creation failed:',
        eventError
      )
    }

    return NextResponse.json({
      ok: true,
      message: createdMessage,
    })
  } catch (error) {
    console.error(
      'Vehicle Hire customer messages POST error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to send your Vehicle Hire message.',
      },
      { status: 500 }
    )
  }
}
