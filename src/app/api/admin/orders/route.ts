import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ServerAuthError } from '@/lib/supabase-server'
import { parseOrderStatus, parsePositiveInteger, ValidationError } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    const searchParams = request.nextUrl.searchParams
    const statusValue = searchParams.get('status')
    const status = statusValue ? parseOrderStatus(statusValue) : undefined
    const limit = parsePositiveInteger(searchParams.get('limit'), 50, 200)

    let query = admin.client
      .from('orders')
      .select('id,customer_id,customer_name,customer_email,customer_phone,customer_address,items,total_amount,status,payment_method,payment_status,delivery_method,delivery_date,delivery_time_slot,assigned_to,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) query = query.eq('status', status)

    const { data: orders, error } = await query
    if (error) {
      console.error('Admin order list failed:', error)
      return NextResponse.json({ error: 'Unable to load orders' }, { status: 503 })
    }

    return NextResponse.json({ orders: orders ?? [] })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof ServerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Admin order list failed:', error)
    return NextResponse.json({ error: 'Unable to load orders' }, { status: 500 })
  }
}
