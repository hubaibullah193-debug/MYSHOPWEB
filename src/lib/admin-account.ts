import { apiFetch } from './api'
import { supabase } from './supabase'
import {
  parseAdminEmail,
  parseAdminName,
  parseAdminPhone,
  parseAdminRole,
  parsePassword,
} from './admin-validation'

export interface AdminUser {
  id: string
  email: string
  full_name: string
  phone?: string | null
  role: 'admin_staff' | 'super_admin' | 'owner'
  is_active: boolean
  admin_notes?: string | null
  created_at: string
  updated_at?: string | null
  last_sign_in_at?: string | null
}

export interface CreateAdminInput {
  email: string
  full_name: string
  phone?: string
  role: 'admin_staff' | 'super_admin'
}

export interface CreateAdminResult {
  id: string
  email: string
  full_name: string
  role: 'admin_staff' | 'super_admin'
  temp_password?: string
}

export interface UpdateAdminInput {
  role?: 'admin_staff' | 'super_admin'
  is_active?: boolean
  full_name?: string
  phone?: string
  admin_notes?: string
}

export async function listAdmins(): Promise<AdminUser[]> {
  const data = await apiFetch<{ users: AdminUser[] }>('/api/admin/users')
  return data.users
}

export async function createAdmin(input: CreateAdminInput): Promise<CreateAdminResult> {
  const email = parseAdminEmail(input.email)
  const fullName = parseAdminName(input.full_name)
  const role = parseAdminRole(input.role)
  const phone = parseAdminPhone(input.phone)
  return apiFetch<CreateAdminResult>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, full_name: fullName, role, phone }),
  })
}

export async function updateAdmin(
  id: string,
  patch: UpdateAdminInput
): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function generateAdminResetLink(
  id: string
): Promise<{ action_link: string }> {
  return apiFetch<{ action_link: string }>(`/api/admin/users/${id}/password`, {
    method: 'POST',
    body: JSON.stringify({ mode: 'link' }),
  })
}

export async function setAdminTempPassword(
  id: string
): Promise<{ temp_password: string }> {
  return apiFetch<{ temp_password: string }>(`/api/admin/users/${id}/password`, {
    method: 'POST',
    body: JSON.stringify({ mode: 'temp' }),
  })
}

export async function removeAdmin(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/admin/users/${id}`, { method: 'DELETE' })
}

export async function revokeAdminSessions(
  userId: string
): Promise<{ temp_password: string }> {
  return apiFetch<{ temp_password: string }>('/api/admin/sessions/revoke', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

/**
 * Record the start of an admin session. This is the server-side check that
 * runs right after a successful login: if the account is not an active admin
 * it throws and the login page signs the user back out.
 */
export async function recordAdminSessionStart(): Promise<void> {
  await apiFetch<{ ok: boolean }>('/api/admin/sessions', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function recordAdminSessionEnd(): Promise<void> {
  try {
    await apiFetch<{ ok: boolean }>('/api/admin/sessions/end', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  } catch {
    // session may already be gone; best-effort
  }
}

/**
 * Change the password for the signed-in admin via the server (which also
 * revokes all of the user's other sessions on hosted Supabase).
 */
export async function resetAdminPassword(
  password: string,
  context: 'change' | 'reset' = 'reset'
): Promise<void> {
  parsePassword(password)
  await apiFetch<{ ok: boolean }>('/api/admin/auth/password', {
    method: 'POST',
    body: JSON.stringify({ password, context }),
  })
}

/**
 * Verify the current password, then let the server rotate it. Throws
 * "Your current password is incorrect." when verification fails.
 */
export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (!supabase?.auth) {
    throw new Error('Authentication is not configured')
  }
  parsePassword(newPassword)
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()
  if (sessionError || !session?.user?.email) {
    throw new Error('Session not found. Please sign in again.')
  }
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: session.user.email,
    password: currentPassword,
  })
  if (verifyError) {
    throw new Error('Your current password is incorrect.')
  }
  await resetAdminPassword(newPassword, 'change')
}

export async function signOutAdmin(): Promise<void> {
  await recordAdminSessionEnd()
  try {
    await supabase?.auth?.signOut()
  } catch {
    // ignore
  }
}

/** Sign the current admin out on every device. */
export async function signOutAllDevices(): Promise<void> {
  await recordAdminSessionEnd()
  try {
    const { error } = await supabase?.auth?.signOut({ scope: 'global' }) ?? { error: null }
    if (error) {
      throw error
    }
  } catch {
    // the session may already be invalid on all devices; cookies still cleared below
  }
}