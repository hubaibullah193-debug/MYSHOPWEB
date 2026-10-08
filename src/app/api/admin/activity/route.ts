import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ServerAuthError } from '@/lib/supabase-server'
import { parsePositiveInteger, parseSearch, ValidationError } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    const params = request.nextUrl.searchParams
    const action = parseSearch(params.get('action'))
    const entityType = parseSearch(params.get('entityType'))
    const startDate = parseSearch(params.get('startDate'))
    const endDate = parseSearch(params.get('endDate'))
    const limit = parsePositiveInteger(params.get('limit'), 100, 200)

    let query = admin.client
      .from('activity_logs')
      .select('id,admin_id,action,entity_type,entity_id,changes,ip_address,created_at,admin:admin_id(id,email,full_name)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (action) query = query.eq('action', action)
    if (entityType) query = query.eq('entity_type', entityType)
    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)

    const summaryStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [logsResult, summaryResult] = await Promise.all([
      query,
      admin.client.from('activity_logs').select('action').gte('created_at', summaryStart),
    ])

    if (logsResult.error) {
      return NextResponse.json({ error: 'Unable to load activity logs' }, { status: 503 })
    }

    const summary: Record<string, number> = {}
    for (const row of summaryResult.data ?? []) {
      summary[row.action] = (summary[row.action] ?? 0) + 1
    }

    return NextResponse.json({ logs: logsResult.data ?? [], summary })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof ServerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Activity log request failed:', error)
    return NextResponse.json({ error: 'Unable to load activity logs' }, { status: 500 })
  }
}
