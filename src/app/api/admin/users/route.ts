import { NextRequest, NextResponse } from 'next/server'
import { logActivity, requireSuperAdmin } from '@/lib/supabase-server'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'
import {
  parseAdminEmail,
  parseAdminName,
  parseAdminPhone,
  parseAdminRole,
  ValidationError,
} from '@/lib/admin-validation'
import { canManageRole } from '@/lib/admin-permissions'
import { generateTempPassword, handleRouteError } from '@/lib/admin-api-utils'

export async function GET(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request)

    const { data: rows, error } = await admin.client
      .from('users')
      .select('id,email,full_name,phone,role,is_active,admin_notes,created_at,updated_at')
      .in('role', ['admin_staff', 'super_admin', 'owner'])
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      throw new ValidationError('Unable to load admin accounts.')
    }

    const users = await Promise.all(
      rows.map(async (row) => {
        const { data: authUser } = await admin.client.auth.admin.getUserById(row.id)
        return {
          ...row,
          last_sign_in_at: authUser?.user?.last_sign_in_at ?? null,
        }
      })
    )

    return NextResponse.json({ users })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(`admin_user_create:${requestAddress(request)}`, 20, 60 * 60 * 1000)
    const admin = await requireSuperAdmin(request)

    const body = (await request.json().catch(() => ({}))) as {
      email?: unknown
      full_name?: unknown
      phone?: unknown
      role?: unknown
    }
    const email = parseAdminEmail(typeof body.email === 'string' ? body.email : '')
    const fullName = parseAdminName(typeof body.full_name === 'string' ? body.full_name : '')
    const phone = parseAdminPhone(typeof body.phone === 'string' ? body.phone : '')
    const role = parseAdminRole(typeof body.role === 'string' ? body.role : '')

    if (!canManageRole(admin.profile.role, role)) {
      throw new ValidationError('You do not have permission to create accounts with this role.')
    }

    const tempPassword = generateTempPassword()
    const { data: created, error: createError } = await admin.client.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (createError || !created?.user) {
      throw new ValidationError('Unable to create the account. It may already exist.')
    }

    const createdUser = created.user

    const { error: upsertError } = await admin.client.from('users').upsert(
      {
        id: createdUser.id,
        email,
        full_name: fullName,
        phone,
        role,
        is_active: true,
      },
      { onConflict: 'id' }
    )
    if (upsertError) {
      throw new ValidationError('Account created but could not be synced. Please try again.')
    }

    await logActivity(admin.client, {
      admin_id: admin.profile.id,
      action: 'admin_account_created',
      entity_type: 'user',
      entity_id: createdUser.id,
      changes: { email, role, created_by: admin.profile.email },
      ip_address: requestAddress(request),
    })

    return NextResponse.json({
      id: createdUser.id,
      email,
      full_name: fullName,
      role,
      temp_password: tempPassword,
    })
  } catch (err) {
    return handleRouteError(err)
  }
}