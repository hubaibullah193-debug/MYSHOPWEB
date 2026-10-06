import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, ServerAuthError } from '@/lib/supabase-server'
import { parseProductRequestInput, ValidationError } from '@/lib/validation'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(`product-requests:${requestAddress(request)}`, 20, 60 * 60 * 1000)
    const input = parseProductRequestInput(await request.json())
    const admin = getSupabaseAdmin()

    const { data: created, error } = await admin
      .from('product_requests')
      .insert({
        customer_name: input.customer_name,
        whatsapp: input.whatsapp,
        product_name: input.product_name,
        quantity: input.quantity,
        message: input.message ?? null,
      })
      .select('id')
      .single()

    if (error || !created) {
      if (error) {
        console.error('Product request creation rejected:', error)
      }
      return NextResponse.json({ error: 'Unable to submit the request' }, { status: 400 })
    }

    return NextResponse.json({ id: created.id })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof ServerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof Error && error.message === 'Too many requests') {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }
    console.error('Product request submission failed:', error)
    return NextResponse.json({ error: 'Unable to submit the request' }, { status: 500 })
  }
}