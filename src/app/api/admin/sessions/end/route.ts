import { NextRequest, NextResponse } from 'next/server'
import { logActivity, requireAdmin } from '@/lib/supabase-server'
import { requestAddress } from '@/lib/rate-limit'
import { handleRouteError } from '@/lib/admin-api-utils'

/**
 * Marks the current admin's most recent open session as ended and logs logout.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)

    const { data: open } = await admin.client
      .from('admin_sessions')
      .select('id')
      .eq('admin_id', admin.profile.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (open) {
      await admin.client
        .from('admin_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', open.id)
    }

    await logActivity(admin.client, {
      admin_id: admin.profile.id,
      action: 'admin_logout',
      entity_type: 'user',
      entity_id: admin.profile.id,
      ip_address: requestAddress(request),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}