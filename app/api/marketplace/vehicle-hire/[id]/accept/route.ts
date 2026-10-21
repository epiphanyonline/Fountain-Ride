import {
  NextRequest,
  NextResponse,
} from 'next/server'

import crypto from 'crypto'

import { getSupabaseAdmin } from '../../../../../../lib/server/supabaseAdmin'

function safeEqual(
  supplied: string,
  stored: string
) {
  try {
    const a = Buffer.from(supplied)
    const b = Buffer.from(stored)

    if (a.length !== b.length) {
      return false
    }

    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(
  req: NextRequest,
  context: {
    params: Promise<{
      id: string
    }>
  }
) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        {
          error:
            'Vehicle Hire request ID is required.',
        },
        {
          status: 400,
        }
      )
    }

    // ---------------------------------------------------------
    // CUSTOMER ACCESS TOKEN
    // ---------------------------------------------------------

    const accessToken =
      req.headers
        .get(
          'x-vehicle-hire-access-token'
        )
        ?.trim() || ''

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            'Customer access token is required.',
        },
        {
          status: 401,
        }
      )
    }

    const body = await req
      .json()
      .catch(() => ({}))

    const offerId =
      typeof body?.offerId === 'string'
        ? body.offerId.trim()
        : ''

    if (!offerId) {
      return NextResponse.json(
        {
          error:
            'Quotation ID is required.',
        },
        {
          status: 400,
        }
      )
    }

    const supabase =
      getSupabaseAdmin()

    // ---------------------------------------------------------
    // VERIFY PRIVATE CUSTOMER ACCESS
    // ---------------------------------------------------------

    const {
      data: access,
      error: accessError,
    } = await supabase
      .from(
        'vehicle_hire_customer_access'
      )
      .select(
        `
          id,
          vehicle_hire_request_id,
          access_token,
          revoked_at
        `
      )
      .eq(
        'vehicle_hire_request_id',
        id
      )
      .is(
        'revoked_at',
        null
      )
      .maybeSingle()

    if (
      accessError ||
      !access ||
      !safeEqual(
        accessToken,
        String(
          access.access_token || ''
        )
      )
    ) {
      return NextResponse.json(
        {
          error:
            'You do not have access to this Vehicle Hire request.',
        },
        {
          status: 403,
        }
      )
    }

    // ---------------------------------------------------------
    // VERIFY QUOTATION
    //
    // The RPC repeats the authoritative checks while
    // holding the necessary database locks.
    // ---------------------------------------------------------

    const {
      data: offer,
      error: offerError,
    } = await supabase
      .from('vehicle_hire_offers')
      .select(
        `
          id,
          vehicle_hire_request_id,
          car_id,
          amount,
          status,
          version_number,
          is_current
        `
      )
      .eq('id', offerId)
      .eq(
        'vehicle_hire_request_id',
        id
      )
      .maybeSingle()

    if (offerError) {
      console.error(
        'Vehicle Hire quotation verification failed:',
        offerError
      )

      return NextResponse.json(
        {
          error:
            'Unable to verify quotation.',
        },
        {
          status: 500,
        }
      )
    }

    if (!offer) {
      return NextResponse.json(
        {
          error:
            'Quotation was not found for this Vehicle Hire request.',
        },
        {
          status: 404,
        }
      )
    }

    if (
      offer.is_current !== true ||
      ![
        'submitted',
        'countered',
      ].includes(offer.status)
    ) {
      return NextResponse.json(
        {
          error:
            'This quotation is no longer available for acceptance. Refresh the request to see the latest quotation.',
        },
        {
          status: 409,
        }
      )
    }

    // ---------------------------------------------------------
    // ATOMIC ACCEPTANCE
    //
    // PostgreSQL now:
    //
    // - locks this request
    // - serializes acceptance for this exact vehicle
    // - locks the exact current quotation
    // - checks legacy bookings
    // - checks other accepted Vehicle Hire requests
    // - creates the permanent agreement snapshot
    // - accepts this quotation
    // - closes competing quotation versions
    // - records agreed amount
    // - moves request to awaiting_payment
    // - creates the audit event
    // ---------------------------------------------------------

    const {
      data: result,
      error: acceptError,
    } = await supabase.rpc(
      'accept_vehicle_hire_offer',
      {
        p_request_id: id,
        p_offer_id: offerId,
      }
    )

    if (acceptError) {
      console.error(
        'Vehicle Hire offer acceptance failed:',
        acceptError
      )

      const message =
        acceptError.message || ''

      const conflict =
        message.includes(
          'can no longer accept'
        ) ||
        message.includes(
          'newer version'
        ) ||
        message.includes(
          'no longer available'
        ) ||
        message.includes(
          'vehicle is no longer available'
        ) ||
        message.includes(
          'Vehicle is no longer available'
        )

      return NextResponse.json(
        {
          error: conflict
            ? `${message}. Refresh the request before trying again.`
            : 'Unable to accept this quotation.',
        },
        {
          status: conflict
            ? 409
            : 500,
        }
      )
    }

    // ---------------------------------------------------------
    // BEST-EFFORT ACCESS AUDIT
    //
    // Failure here must not undo a valid acceptance.
    // ---------------------------------------------------------

    await supabase
      .from(
        'vehicle_hire_customer_access'
      )
      .update({
        last_used_at:
          new Date().toISOString(),
      })
      .eq('id', access.id)

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error(
      'Vehicle Hire accept route error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to accept this quotation.',
      },
      {
        status: 500,
      }
    )
  }
}
