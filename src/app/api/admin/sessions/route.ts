import { NextRequest, NextResponse } from 'next/server'
import { logActivity, requireAdmin } from '@/lib/supabase-server'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'
import { handleRouteError } from '@/lib/admin-api-utils'

/**
 * Starts an admin session. Called by the client immediately after a successful
 * login; failure here (403) means the account is not an active admin and the
 * login page will sign it back out.
 */
export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(`admin_session_start:${requestAddress(request)}`, 60, 10 * 60 * 1000)
    const admin = await requireAdmin(request)
    const ip = requestAddress(request)
    const userAgent = request.headers.get('user-agent')?.slice(0, 300) ?? null

    await admin.client.from('admin_sessions').insert({
      admin_id: admin.profile.id,
      ip_address: ip,
      user_agent: userAgent,
    })

    await logActivity(admin.client, {
      admin_id: admin.profile.id,
      action: 'admin_login',
      entity_type: 'user',
      entity_id: admin.profile.id,
      changes: { ip_address: ip },
      ip_address: ip,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}