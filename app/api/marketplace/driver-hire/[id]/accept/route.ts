import { NextResponse } from 'next/server'
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
  req: Request,
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
            'Driver Hire request ID is required.',
        },
        {
          status: 400,
        }
      )
    }

    /*
     * Customer possession of this private token
     * proves access to this Driver Hire request.
     */
    const accessToken =
      req.headers.get(
        'x-driver-hire-access-token'
      )?.trim() || ''

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

    /*
     * Verify that this private token belongs
     * specifically to this request and has
     * not been revoked.
     */
    const {
      data: access,
      error: accessError,
    } = await supabase
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
        String(access.access_token || '')
      )
    ) {
      return NextResponse.json(
        {
          error:
            'You do not have access to this Driver Hire request.',
        },
        {
          status: 403,
        }
      )
    }

    /*
     * Before invoking the transaction, verify
     * that the requested quotation really
     * belongs to this request.
     *
     * The database function performs the
     * authoritative checks again while holding
     * the relevant locks.
     */
    const {
      data: offer,
      error: offerError,
    } = await supabase
      .from('driver_hire_offers')
      .select(
        `
          id,
          driver_hire_request_id,
          driver_application_id,
          amount,
          status,
          version_number,
          is_current,
          marketplace_terms_accepted
        `
      )
      .eq('id', offerId)
      .eq(
        'driver_hire_request_id',
        id
      )
      .maybeSingle()

    if (offerError) {
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
            'Quotation was not found for this request.',
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

    if (
      offer.marketplace_terms_accepted !==
      true
    ) {
      return NextResponse.json(
        {
          error:
            'This quotation cannot yet be accepted because the driver has not accepted the Driver Hire marketplace terms.',
        },
        {
          status: 409,
        }
      )
    }

    /*
     * Atomic acceptance.
     *
     * The PostgreSQL function:
     * - locks the request
     * - validates the exact current offer
     * - creates the agreement snapshot
     * - accepts this offer
     * - closes competing offers
     * - moves the request to awaiting_payment
     * - records the audit event
     */
    const {
      data: result,
      error: acceptError,
    } = await supabase.rpc(
      'accept_driver_hire_offer',
      {
        p_request_id: id,
        p_offer_id: offerId,
      }
    )

    if (acceptError) {
      console.error(
        'Driver Hire offer acceptance failed:',
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

    /*
     * Best-effort access audit.
     * This is deliberately outside the
     * acceptance transaction because failure
     * to update last_used_at must not undo an
     * otherwise valid agreement.
     */
    await supabase
      .from(
        'driver_hire_customer_access'
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
      'Driver Hire accept route error:',
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
