import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, safeDatabaseError, ServerAuthError } from '@/lib/supabase-server'
import {
  isValidUuid,
  parseDeliveryDate,
  parseDeliveryTimeSlot,
  parseOptionalUuid,
  ValidationError,
} from '@/lib/validation'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    enforceRateLimit(`admin-delivery:${requestAddress(request)}`, 60, 60 * 60 * 1000)
    if (!isValidUuid(params.id)) {
      throw new ValidationError('Invalid order ID')
    }

    const admin = await requireAdmin(request)
    const body = await request.json()
    const deliveryMethod = body?.delivery_method
    if (deliveryMethod !== 'courier' && deliveryMethod !== 'self') {
      throw new ValidationError('Invalid delivery method')
    }

    const { data: order, error } = await admin.client.rpc('assign_order_delivery', {
      p_order_id: params.id,
      p_admin_id: admin.profile.id,
      p_delivery_method: deliveryMethod,
      p_delivery_date: parseDeliveryDate(body?.delivery_date),
      p_delivery_time_slot: parseDeliveryTimeSlot(body?.delivery_time_slot),
      p_assigned_to: parseOptionalUuid(body?.assigned_to, 'Assignee ID'),
    })

    if (error || !order) {
      if (error) {
        console.error('Delivery assignment rejected:', error)
        return NextResponse.json({ error: safeDatabaseError(error, 'Unable to assign delivery') }, { status: 400 })
      }
      return NextResponse.json({ error: 'Unable to assign delivery' }, { status: 500 })
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
    console.error('Delivery assignment failed:', error)
    return NextResponse.json({ error: 'Unable to assign delivery' }, { status: 500 })
  }
}
