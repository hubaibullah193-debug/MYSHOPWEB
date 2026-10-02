import { NextRequest, NextResponse } from 'next/server'
import { logActivity, requireSuperAdmin } from '@/lib/supabase-server'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'
import { ValidationError } from '@/lib/admin-validation'
import { canManageRole, isAdminRole } from '@/lib/admin-permissions'
import { assertUuid, generateTempPassword, handleRouteError } from '@/lib/admin-api-utils'

/**
 * Super admin revokes a target admin's sessions. The password is rotated
 * server-side, which also invalidates the target's own logged-in sessions.
 * Returns the temporary password so the target can sign back in.
 */
export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(`admin_session_revoke:${requestAddress(request)}`, 20, 10 * 60 * 1000)
    const admin = await requireSuperAdmin(request)

    const body = (await request.json().catch(() => ({}))) as { userId?: unknown }
    const userId = assertUuid(body.userId, 'user')

    const { data: target } = await admin.client
      .from('users')
      .select('id,role,is_active,email,full_name')
      .eq('id', userId)
      .single()

    if (!target) {
      throw new ValidationError('Account not found.')
    }
    if (target.role === 'customer' || !isAdminRole(target.role)) {
      throw new ValidationError('This account is not an admin.')
    }
    if (!canManageRole(admin.profile.role, target.role)) {
      throw new ValidationError('You do not have permission to manage this account.')
    }

    await admin.client
      .from('admin_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('admin_id', target.id)
      .is('ended_at', null)

    const tempPassword = generateTempPassword()
    const { error: passwordError } = await admin.client.auth.admin.updateUserById(
      target.id,
      { password: tempPassword }
    )
    if (passwordError) {
      throw new ValidationError('Unable to revoke sessions for this account.')
    }

    await logActivity(admin.client, {
      admin_id: admin.profile.id,
      action: 'admin_sessions_revoked',
      entity_type: 'user',
      entity_id: target.id,
      changes: { revoked_by: admin.profile.email },
      ip_address: requestAddress(request),
    })

    return NextResponse.json({ temp_password: tempPassword })
  } catch (err) {
    return handleRouteError(err)
  }
}