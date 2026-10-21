import { NextResponse } from 'next/server'
import { isAdminSession } from '../../../../../lib/server/adminSession'
import { getSupabaseAdmin } from '../../../../../lib/server/supabaseAdmin'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { id } = await params

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return NextResponse.json(
      { error: 'Invalid withdrawal ID' },
      { status: 400 }
    )
  }

  const body = await req.json().catch(() => null)
  const status = String(body?.status || '')
  const db = getSupabaseAdmin()

if (status === 'test_paid') {
  if (body?.confirmSimulation !== true) {
    return NextResponse.json(
      { error: 'Confirm that this is a TEST simulation with no bank transfer.' },
      { status: 400 }
    )
  }

  const { data, error } = await db.rpc(
    'confirm_test_driver_withdrawal',
    {
      p_withdrawal_id: id,
      p_admin_identifier: 'fountain_ride_admin',
    }
  )

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 409 }
    )
  }

  return NextResponse.json(data)
}

if (status === 'paid') {
    const reference = String(body?.reference || '').trim()

    if (reference.length < 5 || reference.length > 150) {
      return NextResponse.json(
        { error: 'A valid bank transfer reference is required' },
        { status: 400 }
      )
    }

    if (body?.confirmTransferred !== true) {
      return NextResponse.json(
        {
          error:
            'You must confirm that the bank transfer has already been completed.',
        },
        { status: 400 }
      )
    }

    const { data, error } = await db.rpc(
      'confirm_manual_driver_withdrawal',
      {
        p_withdrawal_id: id,
        p_bank_reference: reference,
        p_admin_identifier: 'fountain_ride_admin',
      }
    )

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }

    return NextResponse.json(data)
  }

  if (status !== 'rejected') {
    return NextResponse.json(
      { error: 'Unsupported withdrawal status' },
      { status: 400 }
    )
  }

  const { data: current, error: fetchError } = await db
    .from('driver_withdrawals')
    .select('id,status,transfer_code,transfer_initiated_at')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message },
      { status: 500 }
    )
  }

  if (!current) {
    return NextResponse.json(
      { error: 'Withdrawal not found' },
      { status: 404 }
    )
  }

  if (
    current.status !== 'requested' ||
    current.transfer_code ||
    current.transfer_initiated_at
  ) {
    return NextResponse.json(
      {
        error:
          'Only withdrawals that have not entered transfer processing can be rejected.',
      },
      { status: 409 }
    )
  }

  const now = new Date().toISOString()

  const { data: updated, error } = await db
    .from('driver_withdrawals')
    .update({
      status: 'rejected',
      rejection_reason: String(
        body?.reason || 'Rejected by admin'
      ).slice(0, 500),
      admin_note: body?.adminNote
        ? String(body.adminNote).slice(0, 1000)
        : null,
      processed_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .eq('status', 'requested')
    .is('transfer_code', null)
    .is('transfer_initiated_at', null)
    .select('id')
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  if (!updated) {
    return NextResponse.json(
      {
        error: 'Withdrawal state changed. Please refresh.',
      },
      { status: 409 }
    )
  }

  return NextResponse.json({ ok: true })
}
