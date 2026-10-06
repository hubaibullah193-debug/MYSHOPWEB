import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ServerAuthError } from '@/lib/supabase-server'
import { ValidationError } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)

    const { data: summaryRows, error: summaryError } = await admin.client.rpc(
      'admin_dashboard_summary',
      { p_admin_id: admin.profile.id }
    )
    if (summaryError) {
      console.error('Admin dashboard summary failed:', summaryError)
      return NextResponse.json({ error: 'Unable to load dashboard summary' }, { status: 503 })
    }
    const summary = (summaryRows ?? [])[0] ?? null
    if (!summary) {
      return NextResponse.json({ error: 'Unable to load dashboard summary' }, { status: 503 })
    }

    const { data: recentOrders, error: recentOrdersError } = await admin.client
      .from('orders')
      .select('id,customer_name,customer_phone,total_amount,status,payment_status,created_at')
      .order('created_at', { ascending: false })
      .limit(8)
    if (recentOrdersError) {
      console.error('Admin recent orders failed:', recentOrdersError)
      return NextResponse.json({ error: 'Unable to load recent orders' }, { status: 503 })
    }

    const { data: reviewRows, error: reviewError } = await admin.client
      .from('reviews')
      .select('id,product_id,products(name),customer_name,rating,is_removed,created_at')
      .order('created_at', { ascending: false })
      .limit(6)
    if (reviewError) {
      console.error('Admin recent reviews failed:', reviewError)
      return NextResponse.json({ error: 'Unable to load recent reviews' }, { status: 503 })
    }

    const recentReviews = (reviewRows ?? []).map((row: Record<string, unknown>) => {
      const products = row.products as { name: string | null } | null
      return {
        id: row.id as string,
        product_id: row.product_id as string | null,
        product_name: products?.name ?? null,
        customer_name: row.customer_name as string,
        rating: row.rating as number,
        is_removed: row.is_removed as boolean,
        created_at: row.created_at as string,
      }
    })

    return NextResponse.json({
      summary: {
        total_orders: Number(summary.total_orders ?? 0),
        total_sales: Number(summary.total_sales ?? 0),
        status_orders: summary.status_orders ?? {},
        low_stock_items: Number(summary.low_stock_items ?? 0),
        out_of_stock_items: Number(summary.out_of_stock_items ?? 0),
        pending_bulk_requests: Number(summary.pending_bulk_requests ?? 0),
        pending_product_requests: Number(summary.pending_product_requests ?? 0),
        new_orders_24h: Number(summary.new_orders_24h ?? 0),
        new_reviews_24h: Number(summary.new_reviews_24h ?? 0),
        new_payments_24h: Number(summary.new_payments_24h ?? 0),
        new_cancellations_24h: Number(summary.new_cancellations_24h ?? 0),
      },
      recent_orders: recentOrders ?? [],
      recent_reviews: recentReviews,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof ServerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Admin dashboard failed:', error)
    return NextResponse.json({ error: 'Unable to load dashboard' }, { status: 500 })
  }
}