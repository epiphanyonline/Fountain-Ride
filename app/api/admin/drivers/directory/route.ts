import { NextResponse } from 'next/server'
import { isAdminSession } from '../../../../../lib/server/adminSession'
import { getSupabaseAdmin } from '../../../../../lib/server/supabaseAdmin'

export const dynamic = 'force-dynamic'

const privateHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
}

// Contact information must never be exposed by the public driver APIs.
// This endpoint is restricted to authenticated Fountain Ride administrators.
export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json(
      { error: 'Administrator sign-in required.' },
      { status: 401, headers: privateHeaders }
    )
  }

  try {
    const db = getSupabaseAdmin()
    const { data, error, count } = await db
      .from('driver_applications')
      .select(
        [
          'id',
          'full_name',
          'phone',
          'email',
          'driver_type',
          'work_mode',
          'account_status',
          'verification_status',
          'driver_hire_status',
          'driver_hire_approved',
          'is_available',
          'passenger_trip_available',
          'driver_hire_available',
          'home_city',
          'home_state',
          'park_name',
          'vehicle_make',
          'vehicle_model',
          'vehicle_year',
          'vehicle_plate',
          'driving_experience_years',
          'drives_automatic',
          'drives_manual',
          'created_at',
        ].join(','),
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) throw error

    return NextResponse.json(
      {
        ok: true,
        drivers: data ?? [],
        total: count ?? (data ?? []).length,
        truncated: (count ?? 0) > (data ?? []).length,
      },
      { headers: privateHeaders }
    )
  } catch {
    return NextResponse.json(
      { error: 'Unable to load registered drivers. Please try again.' },
      { status: 500, headers: privateHeaders }
    )
  }
}
