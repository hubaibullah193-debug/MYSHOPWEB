import { NextRequest, NextResponse } from 'next/server'
import { logActivity, requireSuperAdmin } from '@/lib/supabase-server'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'
import { parseResetMode, ValidationError } from '@/lib/admin-validation'
import { canManageRole } from '@/lib/admin-permissions'
import { assertUuid, generateTempPassword, handleRouteError, requestOrigin } from '@/lib/admin-api-utils'

/**
 * Super admin password tools for a target admin account:
 *  - mode "link": generate a recovery link (works without SMTP configured)
 *  - mode "temp": rotate to a fresh temporary password (revokes all sessions)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    enforceRateLimit(`admin_password_tools:${requestAddress(request)}`, 30, 60 * 60 * 1000)
    const admin = await requireSuperAdmin(request)
    const userId = assertUuid(params?.id, 'user')

    const body = (await request.json().catch(() => ({}))) as { mode?: unknown }
    const mode = parseResetMode(typeof body.mode === 'string' ? body.mode : '')

    const { data: target } = await admin.client
      .from('users')
      .select('id,role,email,full_name,is_active')
      .eq('id', userId)
      .single()

    if (!target) {
      throw new ValidationError('Account not found.')
    }
    if (target.role === 'customer') {
      throw new ValidationError('This account is not an admin.')
    }
    if (admin.profile.id === target.id) {
      throw new ValidationError('You cannot reset your own password from this screen.')
    }
    if (!canManageRole(admin.profile.role, target.role)) {
      throw new ValidationError('You do not have permission to manage this account.')
    }

    if (mode === 'link') {
      const redirectTo = `${requestOrigin(request)}/admin/reset-password`
      const { data, error } = await admin.client.auth.admin.generateLink({
        type: 'recovery',
        email: target.email,
        options: { redirectTo },
      })
      const actionLink = data?.properties?.action_link
      if (error || !actionLink) {
        throw new ValidationError('Unable to generate a reset link for this account.')
      }
      await logActivity(admin.client, {
        admin_id: admin.profile.id,
        action: 'admin_password_reset_link_generated',
        entity_type: 'user',
        entity_id: target.id,
        changes: { email: target.email },
        ip_address: requestAddress(request),
      })
      return NextResponse.json({ action_link: actionLink })
    }

    const tempPassword = generateTempPassword()
    const { error: passwordError } = await admin.client.auth.admin.updateUserById(
      target.id,
      { password: tempPassword }
    )
    if (passwordError) {
      throw new ValidationError('Unable to issue a temporary password for this account.')
    }
    await logActivity(admin.client, {
      admin_id: admin.profile.id,
      action: 'admin_password_reissued',
      entity_type: 'user',
      entity_id: target.id,
      changes: { email: target.email },
      ip_address: requestAddress(request),
    })

    return NextResponse.json({ temp_password: tempPassword })
  } catch (err) {
    return handleRouteError(err)
  }
}