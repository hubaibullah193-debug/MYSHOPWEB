import { NextRequest, NextResponse } from 'next/server'
import { logActivity, requireSuperAdmin } from '@/lib/supabase-server'
import { requestAddress } from '@/lib/rate-limit'
import {
  parseAdminActive,
  parseAdminName,
  parseAdminPhone,
  parseAdminRole,
  ValidationError,
} from '@/lib/admin-validation'
import { canManageRole } from '@/lib/admin-permissions'
import { assertUuid, handleRouteError } from '@/lib/admin-api-utils'

/**
 * Updates an admin account (role, activation, name, phone, notes).
 * Only super admins / owners may manage staff, and never their own account
 * or accounts at equal/higher rank.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireSuperAdmin(request)
    const userId = assertUuid(params?.id, 'user')
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const { data: target } = await admin.client
      .from('users')
      .select('id,email,full_name,phone,role,is_active,admin_notes')
      .eq('id', userId)
      .single()

    if (!target) {
      throw new ValidationError('Account not found.')
    }
    if (target.role === 'customer') {
      throw new ValidationError('This account is not an admin.')
    }
    if (admin.profile.id === target.id) {
      throw new ValidationError('You cannot modify your own account from this screen.')
    }
    if (!canManageRole(admin.profile.role, target.role)) {
      throw new ValidationError('You do not have permission to manage this account.')
    }

    const patch: Record<string, unknown> = {}
    const changes: Record<string, unknown> = {}

    if (body.role !== undefined) {
      const nextRole = parseAdminRole(typeof body.role === 'string' ? body.role : '')
      if (nextRole !== target.role && !canManageRole(admin.profile.role, nextRole)) {
        throw new ValidationError('You cannot assign this role.')
      }
      if (nextRole !== target.role) {
        patch.role = nextRole
        changes.role = { from: target.role, to: nextRole }
      }
    }

    if (body.is_active !== undefined) {
      const active = parseAdminActive(body.is_active)
      if (active !== target.is_active) {
        patch.is_active = active
        changes.is_active = { from: target.is_active, to: active }
      }
    }

    if (body.full_name !== undefined) {
      const name = parseAdminName(typeof body.full_name === 'string' ? body.full_name : '')
      if (name !== target.full_name) {
        patch.full_name = name
        changes.full_name = { from: target.full_name, to: name }
      }
    }

    if (body.phone !== undefined) {
      const phone = parseAdminPhone(typeof body.phone === 'string' ? body.phone : '')
      if (phone !== target.phone) {
        patch.phone = phone
        changes.phone = { from: target.phone ?? null, to: phone }
      }
    }

    if (body.admin_notes !== undefined) {
      const notes = typeof body.admin_notes === 'string' ? body.admin_notes.slice(0, 500) : ''
      if (notes !== (target.admin_notes ?? '')) {
        patch.admin_notes = notes
        changes.admin_notes = true
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(target, { status: 200 })
    }

    const { data: updated, error: updateError } = await admin.client
      .from('users')
      .update(patch)
      .eq('id', target.id)
      .select('id,email,full_name,phone,role,is_active,admin_notes,created_at,updated_at')
      .single()

    if (updateError || !updated) {
      throw new ValidationError('Unable to update the account.')
    }

    if (patch.is_active === false) {
      const discard = crypto.randomUUID().replace(/-/g, '') + Math.random().toString(36).slice(2, 12)
      await admin.client.auth.admin.updateUserById(target.id, { password: discard })
    }

    const isActiveChange = changes.is_active as { from: boolean; to: boolean } | undefined
    const action = isActiveChange
      ? isActiveChange.to
        ? 'admin_activated'
        : 'admin_deactivated'
      : changes.role
        ? 'admin_role_changed'
        : 'admin_account_updated'

    await logActivity(admin.client, {
      admin_id: admin.profile.id,
      action,
      entity_type: 'user',
      entity_id: target.id,
      changes,
      ip_address: requestAddress(request),
    })

    return NextResponse.json(updated)
  } catch (err) {
    return handleRouteError(err)
  }
}

/**
 * Permanently removes an admin account (auth user + profile row).
 * Audit rows keep the actor and the target id, but the target's own prior
 * admin_id attribution is nulled by the FK's ON DELETE SET NULL.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireSuperAdmin(request)
    const userId = assertUuid(params?.id, 'user')

    const { data: target } = await admin.client
      .from('users')
      .select('id,role,email,full_name')
      .eq('id', userId)
      .single()

    if (!target) {
      throw new ValidationError('Account not found.')
    }
    if (target.role === 'customer') {
      throw new ValidationError('This account is not an admin.')
    }
    if (admin.profile.id === target.id) {
      throw new ValidationError('You cannot remove your own account.')
    }
    if (!canManageRole(admin.profile.role, target.role)) {
      throw new ValidationError('You do not have permission to manage this account.')
    }

    const { error: authError } = await admin.client.auth.admin.deleteUser(target.id)
    if (authError) {
      throw new ValidationError('Unable to remove this account.')
    }

    await admin.client.from('users').delete().eq('id', target.id)

    await logActivity(admin.client, {
      admin_id: admin.profile.id,
      action: 'admin_account_removed',
      entity_type: 'user',
      entity_id: target.id,
      changes: { email: target.email, role: target.role, removed_by: admin.profile.email },
      ip_address: requestAddress(request),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}