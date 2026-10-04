import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, safeDatabaseError, ServerAuthError } from '@/lib/supabase-server'
import { isValidUuid, parseAdminNotes, parseOrderStatus, ValidationError } from '@/lib/validation'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    enforceRateLimit(`admin-status:${requestAddress(request)}`, 60, 60 * 60 * 1000)
    if (!isValidUuid(params.id)) {
      throw new ValidationError('Invalid order ID')
    }

    const admin = await requireAdmin(request)
    const body = await request.json()
    const status = parseOrderStatus(body?.status)
    const notes = parseAdminNotes(body?.notes)

    const { data: order, error } = await admin.client.rpc('transition_order_status', {
      p_order_id: params.id,
      p_new_status: status,
      p_admin_id: admin.profile.id,
      p_notes: notes,
    })

    if (error || !order) {
      if (error) {
        console.error('Order status update rejected:', error)
        return NextResponse.json({ error: safeDatabaseError(error, 'Unable to update order status') }, { status: 400 })
      }
      return NextResponse.json({ error: 'Unable to update order status' }, { status: 500 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof ServerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof Error && error.message === 'Too many requests') {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    console.error('Order status update failed:', error)
    return NextResponse.json({ error: 'Unable to update order status' }, { status: 500 })
  }
}
