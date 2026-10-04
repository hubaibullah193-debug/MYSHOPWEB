import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, ServerAuthError } from '@/lib/supabase-server'
import { parseOrderTrackingInput, ValidationError } from '@/lib/validation'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(`tracking:${requestAddress(request)}`, 30, 60 * 60 * 1000)
    const input = parseOrderTrackingInput(await request.json())
    const admin = getSupabaseAdmin()
    const { data: order, error } = await admin
      .from('orders')
      .select('id,customer_name,customer_phone,customer_address,items,total_amount,status,payment_method,payment_status,delivery_method,delivery_date,delivery_time_slot,created_at')
      .eq('id', input.orderId)
      .eq('customer_phone', input.phone)
      .maybeSingle()

    if (error) {
      console.error('Order tracking query failed:', error)
      return NextResponse.json({ error: 'Unable to retrieve order' }, { status: 503 })
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found. Check the order ID and WhatsApp number.' }, { status: 404 })
    }

    return NextResponse.json(
      { order },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof ServerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof Error && error.message === 'Too many requests') {
      return NextResponse.json({ error: 'Too many tracking requests. Please try again later.' }, { status: 429 })
    }
    console.error('Order tracking failed:', error)
    return NextResponse.json({ error: 'Unable to retrieve order' }, { status: 500 })
  }
}
