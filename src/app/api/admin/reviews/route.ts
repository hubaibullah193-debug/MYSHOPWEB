import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ServerAuthError } from '@/lib/supabase-server'
import { parsePositiveInteger, ValidationError } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    const searchParams = request.nextUrl.searchParams
    const limit = parsePositiveInteger(searchParams.get('limit'), 200, 200)

    const { data: reviews, error } = await admin.client
      .from('reviews')
      .select('id,product_id,products(name),customer_name,rating,review,is_featured,is_removed,order_id,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Admin review list failed:', error)
      return NextResponse.json({ error: 'Unable to load reviews' }, { status: 503 })
    }

    return NextResponse.json({ reviews: reviews ?? [] })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof ServerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Admin review list failed:', error)
    return NextResponse.json({ error: 'Unable to load reviews' }, { status: 500 })
  }
}