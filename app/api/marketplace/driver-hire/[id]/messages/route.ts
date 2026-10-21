import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../../lib/server/supabaseAdmin'

async function verifyCustomerAccess(
  request: NextRequest,
  requestId: string
) {
  const supabase = getSupabaseAdmin()

  const accessToken =
    request.headers
      .get('x-driver-hire-access-token')
      ?.trim()

  if (!accessToken) {
    return {
      ok: false as const,
      status: 401,
      error: 'Driver Hire request access is required.',
    }
  }

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
    .eq('driver_hire_request_id', requestId)
    .eq('access_token', accessToken)
    .is('revoked_at', null)
    .maybeSingle()

  if (accessError) {
    console.error(
      'Driver Hire chat access lookup error:',
      accessError
    )

    return {
      ok: false as const,
      status: 500,
      error: 'Unable to verify request access.',
    }
  }

  if (!access) {
    return {
      ok: false as const,
      status: 403,
      error:
        'You do not have access to this Driver Hire request.',
    }
  }

  return {
    ok: true as const,
    access,
  }
}

async function verifyDriverConversation(
  requestId: string,
  driverApplicationId: string
) {
  const supabase = getSupabaseAdmin()

  const {
    data: offer,
    error: offerError,
  } = await supabase
    .from('driver_hire_offers')
    .select(`
      id,
      status,
      is_current
    `)
    .eq('driver_hire_request_id', requestId)
    .eq(
      'driver_application_id',
      driverApplicationId
    )
    .eq('is_current', true)
    .maybeSingle()

  if (offerError) {
    console.error(
      'Driver Hire chat offer lookup error:',
      offerError
    )

    return {
      ok: false as const,
      status: 500,
      error:
        'Unable to verify this driver conversation.',
    }
  }

  if (!offer) {
    return {
      ok: false as const,
      status: 403,
      error:
        'Chat is only available with drivers who have submitted a quotation.',
    }
  }

  const allowedStatuses = [
    'submitted',
    'countered',
    'accepted',
  ]

  if (!allowedStatuses.includes(offer.status)) {
    return {
      ok: false as const,
      status: 409,
      error:
        'This driver conversation is no longer active.',
    }
  }

  return {
    ok: true as const,
    offer,
  }
}

// ---------------------------------------------------------
// GET conversation
//
// Opening the conversation marks DRIVER messages as read
// by the customer.
// ---------------------------------------------------------

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const { id } = await context.params

    const driverApplicationId =
      request.nextUrl.searchParams
        .get('driverApplicationId')
        ?.trim()

    if (!id || !driverApplicationId) {
      return NextResponse.json(
        {
          error:
            'Request and driver are required.',
        },
        { status: 400 }
      )
    }

    const access =
      await verifyCustomerAccess(
        request,
        id
      )

    if (!access.ok) {
      return NextResponse.json(
        {
          error: access.error,
        },
        {
          status: access.status,
        }
      )
    }

    const conversation =
      await verifyDriverConversation(
        id,
        driverApplicationId
      )

    if (!conversation.ok) {
      return NextResponse.json(
        {
          error: conversation.error,
        },
        {
          status: conversation.status,
        }
      )
    }

    const supabase =
      getSupabaseAdmin()

    const now =
      new Date().toISOString()

    /*
     * The authenticated customer is opening this
     * specific conversation.
     *
     * Mark only DRIVER messages in this exact
     * request + driver conversation as read.
     */
    const {
      error: markReadError,
    } = await supabase
      .from('driver_hire_messages')
      .update({
        customer_read_at: now,
      })
      .eq(
        'driver_hire_request_id',
        id
      )
      .eq(
        'driver_application_id',
        driverApplicationId
      )
      .eq(
        'sender_role',
        'driver'
      )
      .is(
        'customer_read_at',
        null
      )

    if (markReadError) {
      console.error(
        'Unable to mark Driver Hire messages read by customer:',
        markReadError
      )

      return NextResponse.json(
        {
          error:
            'Unable to open conversation.',
        },
        { status: 500 }
      )
    }

    const {
      data: messages,
      error: messagesError,
    } = await supabase
      .from('driver_hire_messages')
      .select(`
        id,
        driver_hire_request_id,
        driver_application_id,
        sender_role,
        body,
        created_at,
        customer_read_at,
        driver_read_at
      `)
      .eq(
        'driver_hire_request_id',
        id
      )
      .eq(
        'driver_application_id',
        driverApplicationId
      )
      .order(
        'created_at',
        {
          ascending: true,
        }
      )

    if (messagesError) {
      console.error(
        'Driver Hire customer chat lookup error:',
        messagesError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load messages.',
        },
        { status: 500 }
      )
    }

    await supabase
      .from(
        'driver_hire_customer_access'
      )
      .update({
        last_used_at: now,
      })
      .eq(
        'id',
        access.access.id
      )

    return NextResponse.json({
      ok: true,
      messages: messages || [],
    })
  } catch (error) {
    console.error(
      'Driver Hire customer chat API error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to load messages.',
      },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------
// POST customer message
//
// Customer has already read their own message.
// Driver has NOT read it yet.
// ---------------------------------------------------------

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const { id } =
      await context.params

    if (!id) {
      return NextResponse.json(
        {
          error:
            'Driver Hire request is required.',
        },
        { status: 400 }
      )
    }

    const access =
      await verifyCustomerAccess(
        request,
        id
      )

    if (!access.ok) {
      return NextResponse.json(
        {
          error: access.error,
        },
        {
          status: access.status,
        }
      )
    }

    const body =
      await request.json()

    const driverApplicationId =
      String(
        body.driverApplicationId ||
          ''
      ).trim()

    const message =
      String(
        body.message || ''
      ).trim()

    if (!driverApplicationId) {
      return NextResponse.json(
        {
          error:
            'Driver is required.',
        },
        { status: 400 }
      )
    }

    if (!message) {
      return NextResponse.json(
        {
          error:
            'Enter a message.',
        },
        { status: 400 }
      )
    }

    if (message.length > 2000) {
      return NextResponse.json(
        {
          error:
            'Message is too long.',
        },
        { status: 400 }
      )
    }

    const conversation =
      await verifyDriverConversation(
        id,
        driverApplicationId
      )

    if (!conversation.ok) {
      return NextResponse.json(
        {
          error: conversation.error,
        },
        {
          status: conversation.status,
        }
      )
    }

    const supabase =
      getSupabaseAdmin()

    const now =
      new Date().toISOString()

    const {
      data: savedMessage,
      error: insertError,
    } = await supabase
      .from('driver_hire_messages')
      .insert({
        driver_hire_request_id:
          id,

        driver_application_id:
          driverApplicationId,

        sender_role:
          'customer',

        body: message,

        /*
         * Sender has read their own message.
         * Recipient has not.
         */
        customer_read_at:
          now,

        driver_read_at:
          null,
      })
      .select(`
        id,
        driver_hire_request_id,
        driver_application_id,
        sender_role,
        body,
        created_at,
        customer_read_at,
        driver_read_at
      `)
      .single()

    if (insertError) {
      console.error(
        'Driver Hire customer message insert error:',
        insertError
      )

      return NextResponse.json(
        {
          error:
            'Unable to send message.',
        },
        { status: 500 }
      )
    }

    await supabase
      .from(
        'driver_hire_customer_access'
      )
      .update({
        last_used_at: now,
      })
      .eq(
        'id',
        access.access.id
      )

    return NextResponse.json({
      ok: true,
      message: savedMessage,
    })
  } catch (error) {
    console.error(
      'Driver Hire customer message API error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to send message.',
      },
      { status: 500 }
    )
  }
}
