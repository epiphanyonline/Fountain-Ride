import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../lib/server/supabaseAdmin'
import { isAdminSession } from '../../../../lib/server/adminSession'

export async function GET() {
  try {
    const authenticated = await isAdminSession()

    if (!authenticated) {
      return NextResponse.json(
        { error: 'Admin authentication required.' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseAdmin()

    // ---------------------------------------------------------
    // Load Vehicle Hire requests
    // ---------------------------------------------------------

    const {
      data: requests,
      error: requestsError,
    } = await supabase
      .from('vehicle_hire_requests')
      .select('*')
      .order('created_at', {
        ascending: false,
      })

    if (requestsError) {
      console.error(
        'Admin Vehicle Hire request lookup failed:',
        requestsError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load Vehicle Hire requests.',
        },
        { status: 500 }
      )
    }

    const requestRows = requests || []

    if (requestRows.length === 0) {
      return NextResponse.json({
        ok: true,
        requests: [],
      })
    }

    // ---------------------------------------------------------
    // Load vehicles used by those requests
    // ---------------------------------------------------------

    const carIds = Array.from(
      new Set(
        requestRows
          .map((row) => row.car_id)
          .filter(Boolean)
      )
    )

    const {
      data: cars,
      error: carsError,
    } = await supabase
      .from('cars')
      .select(`
        id,
        name,
        brand,
        model,
        year,
        transmission,
        fuel_type,
        seats,
        daily_rate,
        image_url,
        image_urls,
        status
      `)
      .in('id', carIds)

    if (carsError) {
      console.error(
        'Admin Vehicle Hire car lookup failed:',
        carsError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load vehicles for the requests.',
        },
        { status: 500 }
      )
    }

    // ---------------------------------------------------------
    // Load current quotations
    // ---------------------------------------------------------

    const requestIds =
      requestRows.map((row) => row.id)

    const {
      data: offers,
      error: offersError,
    } = await supabase
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
      .in(
        'vehicle_hire_request_id',
        requestIds
      )
      .eq('is_current', true)

    if (offersError) {
      console.error(
        'Admin Vehicle Hire offer lookup failed:',
        offersError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load Vehicle Hire quotations.',
        },
        { status: 500 }
      )
    }

    // ---------------------------------------------------------
    // Load unread customer messages
    // ---------------------------------------------------------

    const {
      data: messages,
      error: messagesError,
    } = await supabase
      .from('vehicle_hire_messages')
      .select(`
        id,
        vehicle_hire_request_id,
        sender_role,
        body,
        owner_read_at,
        created_at
      `)
      .in(
        'vehicle_hire_request_id',
        requestIds
      )
      .eq('sender_role', 'customer')
      .is('owner_read_at', null)
      .order('created_at', {
        ascending: false,
      })

    if (messagesError) {
      console.error(
        'Admin Vehicle Hire message lookup failed:',
        messagesError
      )

      return NextResponse.json(
        {
          error:
            'Unable to load Vehicle Hire message notifications.',
        },
        { status: 500 }
      )
    }

    // ---------------------------------------------------------
    // Join the information server-side
    // ---------------------------------------------------------

    const carMap = new Map(
      (cars || []).map((car) => [
        car.id,
        car,
      ])
    )

    const offerMap = new Map(
      (offers || []).map((offer) => [
        offer.vehicle_hire_request_id,
        offer,
      ])
    )

    const unreadCountMap =
      new Map<string, number>()

    for (const message of messages || []) {
      const current =
        unreadCountMap.get(
          message.vehicle_hire_request_id
        ) || 0

      unreadCountMap.set(
        message.vehicle_hire_request_id,
        current + 1
      )
    }

    const result = requestRows.map(
      (hireRequest) => ({
        ...hireRequest,

        vehicle:
          carMap.get(
            hireRequest.car_id
          ) || null,

        current_offer:
          offerMap.get(
            hireRequest.id
          ) || null,

        unread_customer_messages:
          unreadCountMap.get(
            hireRequest.id
          ) || 0,
      })
    )

    return NextResponse.json({
      ok: true,
      requests: result,
    })
  } catch (error) {
    console.error(
      'Admin Vehicle Hire API error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to load Vehicle Hire requests.',
      },
      { status: 500 }
    )
  }
}
