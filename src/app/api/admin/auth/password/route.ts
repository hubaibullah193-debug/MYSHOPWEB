import { NextRequest, NextResponse } from 'next/server'
import { logActivity, requireAdmin } from '@/lib/supabase-server'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'
import { parsePassword, ValidationError } from '@/lib/admin-validation'
import { handleRouteError } from '@/lib/admin-api-utils'

/**
 * Rotates the signed-in admin's password via the service role. On hosted
 * Supabase this invalidates every other session for that user, so it serves
 * both "change password" and "finish password reset" flows.
 */
export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(`admin_password_update:${requestAddress(request)}`, 10, 10 * 60 * 1000)
    const admin = await requireAdmin(request)

    const body = (await request.json().catch(() => ({}))) as {
      password?: unknown
      context?: unknown
    }
    const password = parsePassword(typeof body.password === 'string' ? body.password : '')
    const context = body.context === 'change' ? 'change' : 'reset'

    const { error } = await admin.client.auth.admin.updateUserById(admin.profile.id, {
      password,
    })
    if (error) {
      throw new ValidationError('Unable to update the password. Please try again later.')
    }

    await logActivity(admin.client, {
      admin_id: admin.profile.id,
      action: context === 'change' ? 'admin_password_changed' : 'admin_password_reset_completed',
      entity_type: 'user',
      entity_id: admin.profile.id,
      ip_address: requestAddress(request),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}