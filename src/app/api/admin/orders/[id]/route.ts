import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ServerAuthError } from '@/lib/supabase-server'
import { isValidUuid, ValidationError } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidUuid(params.id)) {
      throw new ValidationError('Invalid order ID')
    }

    const admin = await requireAdmin(request)
    const { data: order, error } = await admin.client
      .from('orders')
      .select('id,customer_id,customer_name,customer_email,customer_phone,customer_address,items,total_amount,delivery_fee,delivery_zone_id,delivery_zones(name),status,payment_method,payment_status,delivery_method,delivery_date,delivery_time_slot,assigned_to,admin_notes,created_at,updated_at')
      .eq('id', params.id)
      .maybeSingle()

    if (error) {
      console.error('Admin order lookup failed:', error)
      return NextResponse.json({ error: 'Unable to load order' }, { status: 503 })
    }
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof ServerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Admin order lookup failed:', error)
    return NextResponse.json({ error: 'Unable to load order' }, { status: 500 })
  }
}
