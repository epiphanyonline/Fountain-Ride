import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../../../lib/server/supabaseAdmin'
import {
  getDriverForToken,
  driverToken,
  driverApplicationId,
} from '../../../../../../../lib/server/marketplaceAuth'

async function authenticateDriver(
  req: Request
) {
  const driver =
    await getDriverForToken(
      driverApplicationId(req),
      driverToken(req)
    )

  if (!driver) {
    return {
      ok: false as const,
      status: 401,
      error: 'Unauthorized',
    }
  }

  const supportsDriverHire =
    driver.work_mode ===
      'driver_hire' ||
    driver.work_mode === 'both'

  if (
    !supportsDriverHire ||
    driver.verification_status !==
      'approved' ||
    driver.driver_hire_status !==
      'approved' ||
    driver.driver_hire_approved !==
      true
  ) {
    return {
      ok: false as const,
      status: 403,
      error:
        'Your account is not approved for Driver Hire.',
    }
  }

  return {
    ok: true as const,
    driver,
  }
}

async function verifyConversation(
  requestId: string,
  driverId: string
) {
  const db =
    getSupabaseAdmin()

  const {
    data: offer,
    error: offerError,
  } = await db
    .from('driver_hire_offers')
    .select(`
      id,
      status,
      is_current
    `)
    .eq(
      'driver_hire_request_id',
      requestId
    )
    .eq(
      'driver_application_id',
      driverId
    )
    .eq(
      'is_current',
      true
    )
    .maybeSingle()

  if (offerError) {
    console.error(
      'Driver Hire driver chat offer lookup error:',
      offerError
    )

    return {
      ok: false as const,
      status: 500,
      error:
        'Unable to verify this conversation.',
    }
  }

  if (!offer) {
    return {
      ok: false as const,
      status: 403,
      error:
        'Submit a quotation before starting a conversation.',
    }
  }

  const allowedStatuses = [
    'submitted',
    'countered',
    'accepted',
  ]

  if (
    !allowedStatuses.includes(
      offer.status
    )
  ) {
    return {
      ok: false as const,
      status: 409,
      error:
        'This conversation is no longer active.',
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
// Opening the conversation marks CUSTOMER messages as
// read by this authenticated driver.
// ---------------------------------------------------------

export async function GET(
  req: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const auth =
      await authenticateDriver(req)

    if (!auth.ok) {
      return NextResponse.json(
        {
          error: auth.error,
        },
        {
          status: auth.status,
        }
      )
    }

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

    const conversation =
      await verifyConversation(
        id,
        auth.driver.id
      )

    if (!conversation.ok) {
      return NextResponse.json(
        {
          error:
            conversation.error,
        },
        {
          status:
            conversation.status,
        }
      )
    }

    const db =
      getSupabaseAdmin()

    const now =
      new Date().toISOString()

    /*
     * Mark only CUSTOMER messages in this
     * authenticated driver's conversation
     * as read.
     */
    const {
      error: markReadError,
    } = await db
      .from(
        'driver_hire_messages'
      )
      .update({
        driver_read_at:
          now,
      })
      .eq(
        'driver_hire_request_id',
        id
      )
      .eq(
        'driver_application_id',
        auth.driver.id
      )
      .eq(
        'sender_role',
        'customer'
      )
      .is(
        'driver_read_at',
        null
      )

    if (markReadError) {
      console.error(
        'Unable to mark Driver Hire messages read by driver:',
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
    } = await db
      .from(
        'driver_hire_messages'
      )
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
        auth.driver.id
      )
      .order(
        'created_at',
        {
          ascending: true,
        }
      )

    if (messagesError) {
      console.error(
        'Driver Hire driver chat lookup error:',
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

    return NextResponse.json({
      ok: true,
      messages:
        messages || [],
    })
  } catch (error) {
    console.error(
      'Driver Hire driver chat API error:',
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
// POST driver reply
//
// Driver has read their own message.
// Customer has NOT read it yet.
// ---------------------------------------------------------

export async function POST(
  req: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const auth =
      await authenticateDriver(req)

    if (!auth.ok) {
      return NextResponse.json(
        {
          error: auth.error,
        },
        {
          status: auth.status,
        }
      )
    }

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

    const conversation =
      await verifyConversation(
        id,
        auth.driver.id
      )

    if (!conversation.ok) {
      return NextResponse.json(
        {
          error:
            conversation.error,
        },
        {
          status:
            conversation.status,
        }
      )
    }

    const body =
      await req.json()

    const message =
      String(
        body.message || ''
      ).trim()

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

    const db =
      getSupabaseAdmin()

    const now =
      new Date().toISOString()

    const {
      data: savedMessage,
      error: insertError,
    } = await db
      .from(
        'driver_hire_messages'
      )
      .insert({
        driver_hire_request_id:
          id,

        driver_application_id:
          auth.driver.id,

        sender_role:
          'driver',

        body:
          message,

        /*
         * Sender has read their own message.
         * Customer has not.
         */
        driver_read_at:
          now,

        customer_read_at:
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
        'Driver Hire driver message insert error:',
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

    return NextResponse.json({
      ok: true,
      message:
        savedMessage,
    })
  } catch (error) {
    console.error(
      'Driver Hire driver message API error:',
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
