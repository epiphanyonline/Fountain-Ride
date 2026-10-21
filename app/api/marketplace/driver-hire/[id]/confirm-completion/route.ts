import crypto from 'node:crypto'
import { NextResponse } from 'next/server'

import { getSupabaseAdmin } from '../../../../../../lib/server/supabaseAdmin'

function safeTokenEqual(
  supplied: string,
  stored: string
) {
  const suppliedBuffer =
    Buffer.from(supplied)

  const storedBuffer =
    Buffer.from(stored)

  if (
    suppliedBuffer.length !==
    storedBuffer.length
  ) {
    return false
  }

  return crypto.timingSafeEqual(
    suppliedBuffer,
    storedBuffer
  )
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } =
      await context.params

    if (!id) {
      return NextResponse.json(
        {
          error:
            'Driver Hire request ID is required.',
        },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Customer access token
    // ---------------------------------------------------------

    const suppliedToken =
      req.headers.get(
        'x-driver-hire-access-token'
      )?.trim() || ''

    if (!suppliedToken) {
      return NextResponse.json(
        {
          error:
            'Customer access token is required.',
        },
        { status: 401 }
      )
    }

    const db =
      getSupabaseAdmin()

    // ---------------------------------------------------------
    // Load active access record
    // ---------------------------------------------------------

    const {
      data: access,
      error: accessError,
    } = await db
      .from(
        'driver_hire_customer_access'
      )
      .select(
        `
          id,
          driver_hire_request_id,
          access_token,
          revoked_at
        `
      )
      .eq(
        'driver_hire_request_id',
        id
      )
      .is('revoked_at', null)
      .maybeSingle()

    if (accessError) {
      console.error(
        'Driver Hire completion access lookup error:',
        accessError
      )

      return NextResponse.json(
        {
          error:
            'Unable to verify customer access.',
        },
        { status: 500 }
      )
    }

    if (
      !access ||
      !access.access_token ||
      !safeTokenEqual(
        suppliedToken,
        access.access_token
      )
    ) {
      return NextResponse.json(
        {
          error:
            'You do not have access to this Driver Hire request.',
        },
        { status: 401 }
      )
    }

    // ---------------------------------------------------------
    // Load current booking state before RPC
    //
    // We deliberately do NOT need the Job Start PIN here.
    // ---------------------------------------------------------

    const {
      data: booking,
      error: bookingError,
    } = await db
      .from(
        'driver_hire_requests'
      )
      .select(
        `
          id,
          booking_ref,
          status,
          selected_driver_application_id,
          driver_finished_at,
          customer_confirmed_at
        `
      )
      .eq('id', id)
      .maybeSingle()

    if (bookingError) {
      console.error(
        'Driver Hire completion booking lookup error:',
        bookingError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load this Driver Hire booking.',
        },
        { status: 500 }
      )
    }

    if (!booking) {
      return NextResponse.json(
        {
          error:
            'Driver Hire booking not found.',
        },
        { status: 404 }
      )
    }

    // ---------------------------------------------------------
    // Friendly validation
    //
    // The PostgreSQL function performs the authoritative
    // validation again inside the transaction.
    // ---------------------------------------------------------

    if (
      booking.status !==
        'awaiting_customer_confirmation' &&
      booking.status !== 'completed'
    ) {
      return NextResponse.json(
        {
          error:
            'This booking is not ready for customer completion confirmation.',
        },
        { status: 409 }
      )
    }

    if (
      booking.status ===
        'awaiting_customer_confirmation' &&
      !booking.driver_finished_at
    ) {
      return NextResponse.json(
        {
          error:
            'The driver has not yet recorded completion of this job.',
        },
        { status: 409 }
      )
    }

    // ---------------------------------------------------------
    // Atomic completion + earning release
    // ---------------------------------------------------------

    const {
      data: result,
      error: rpcError,
    } = await db.rpc(
      'confirm_driver_hire_completion',
      {
        p_request_id: id,
      }
    )

    if (rpcError) {
      console.error(
        'Driver Hire completion RPC error:',
        rpcError
      )

      const message =
        String(
          rpcError.message || ''
        )

      if (
        message.includes(
          'not awaiting customer confirmation'
        ) ||
        message.includes(
          'Driver has not recorded'
        ) ||
        message.includes(
          'verified job start'
        ) ||
        message.includes(
          'Protected driver earning not found'
        ) ||
        message.includes(
          'Driver earning is not pending'
        )
      ) {
        return NextResponse.json(
          {
            error: message,
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        {
          error:
            'Unable to confirm completion of this Driver Hire job.',
        },
        { status: 500 }
      )
    }

    // ---------------------------------------------------------
    // Update customer access activity
    // ---------------------------------------------------------

    const now =
      new Date().toISOString()

    const {
      error: accessUpdateError,
    } = await db
      .from(
        'driver_hire_customer_access'
      )
      .update({
        last_used_at: now,
      })
      .eq('id', access.id)

    if (accessUpdateError) {
      console.error(
        'Driver Hire customer access timestamp update error:',
        accessUpdateError
      )
    }

    // ---------------------------------------------------------
    // Safe response
    // ---------------------------------------------------------

    return NextResponse.json({
      ok: true,

      status:
        result?.status ||
        'completed',

      alreadyCompleted:
        result?.already_completed ===
        true,

      customerConfirmedAt:
        result?.customer_confirmed_at ||
        null,

      earningStatus:
        result?.earning_status ||
        null,

      availableAt:
        result?.available_at ||
        null,
    })
  } catch (error) {
    console.error(
      'Driver Hire customer completion API error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to confirm completion of this Driver Hire job.',
      },
      { status: 500 }
    )
  }
}
