import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ServerAuthError } from '@/lib/supabase-server'
import { parsePositiveInteger, ValidationError } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    const searchParams = request.nextUrl.searchParams
    const limit = parsePositiveInteger(searchParams.get('limit'), 200, 200)

    const { data, error } = await admin.client
      .from('reviews')
      .select('id,product_id,products(name),customer_name,rating,review,is_featured,is_removed,order_id,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Admin review list failed:', error)
      return NextResponse.json({ error: 'Unable to load reviews' }, { status: 503 })
    }

    const reviews = (data ?? []).map((row: Record<string, unknown>) => {
      const products = row.products as { name: string | null } | null
      return {
        id: row.id as string,
        product_id: row.product_id as string | null,
        product_name: products?.name ?? null,
        customer_name: row.customer_name as string,
        rating: row.rating as number,
        review: row.review as string,
        is_featured: row.is_featured as boolean,
        is_removed: row.is_removed as boolean,
        order_id: row.order_id as string | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      }
    })

    return NextResponse.json({ reviews })
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