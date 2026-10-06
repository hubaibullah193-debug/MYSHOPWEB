import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ServerAuthError } from '@/lib/supabase-server'
import { parsePositiveInteger, parseSearch, ValidationError } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    const searchParams = request.nextUrl.searchParams
    const q = parseSearch(searchParams.get('q')) ?? null
    const limit = parsePositiveInteger(searchParams.get('limit'), 50, 200)

    const { data, error } = await admin.client.rpc('admin_customer_directory', {
      p_admin_id: admin.profile.id,
      p_search: q,
      p_limit: limit,
    })
    if (error) {
      console.error('Admin customer directory failed:', error)
      return NextResponse.json({ error: 'Unable to load customers' }, { status: 503 })
    }

    return NextResponse.json({ customers: data ?? [] })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof ServerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Admin customer directory failed:', error)
    return NextResponse.json({ error: 'Unable to load customers' }, { status: 500 })
  }
}