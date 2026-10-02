import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { isAdminRole, isSuperAdminRole, type UserRole } from './admin-permissions'

export interface ServerUserProfile {
  id: string
  email: string
  full_name: string
  phone?: string | null
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface AuthenticatedAdmin {
  user: User
  profile: ServerUserProfile
  client: SupabaseClient
  accessToken: string
}

export class ServerAuthError extends Error {
  status: number

  constructor(message: string, status = 401) {
    super(message)
    this.name = 'ServerAuthError'
    this.status = status
  }
}

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new ServerAuthError('Server configuration is incomplete', 503)
  }
  return url
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new ServerAuthError('Server configuration is incomplete', 503)
  }
  return key
}

export function getSupabaseAdmin(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new ServerAuthError('Server configuration is incomplete', 503)
  }

  return createClient(getSupabaseUrl(), key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function getSupabaseUserClient(accessToken: string): SupabaseClient {
  return createClient(getSupabaseUrl(), getAnonKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

export function getBearerToken(request: NextRequest): string {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    throw new ServerAuthError('Authentication required')
  }
  const token = authorization.slice('Bearer '.length).trim()
  if (!token) {
    throw new ServerAuthError('Authentication required')
  }
  return token
}

export async function getRequestUser(request: NextRequest): Promise<{ user: User; client: SupabaseClient } | null> {
  const authorization = request.headers.get('authorization')
  if (!authorization) return null

  const accessToken = getBearerToken(request)
  const client = getSupabaseUserClient(accessToken)
  const { data, error } = await client.auth.getUser(accessToken)
  if (error || !data.user) {
    throw new ServerAuthError('Invalid or expired session')
  }

  return { user: data.user, client }
}

export function safeDatabaseError(error: { message?: string } | null | undefined, fallback: string): string {
  const message = error?.message
  const safeMessages = new Set([
    'Admin access required',
    'Invalid order status',
    'Order not found',
    'Invalid order transition',
    'Order cannot be cancelled after processing',
    'Paid orders cannot be cancelled',
    'Payment must be verified first',
    'Order has no inventory items',
    'Invalid inventory item',
    'Invalid inventory quantity',
    'Payment not found',
    'Order cannot have payment changes',
    'Cancelled orders cannot have payment changes',
    'Online payment must be verified before the order is received',
    'Payment transaction reference is required',
    'Payment cannot be confirmed from its current status',
    'Only pending payments can be failed',
    'Only paid payments can be refunded',
    'A failure reason is required',
    'A refund reference is required',
    'Invalid delivery assignment',
  ])
  return message && safeMessages.has(message) ? message : fallback
}

export interface ActivityLogEntry {
  admin_id?: string | null
  action: string
  entity_type: string
  entity_id?: string | null
  changes?: Record<string, unknown> | null
  ip_address?: string | null
}

/** Append a row to activity_logs using a service-role client. Never throws. */
export async function logActivity(
  client: SupabaseClient,
  entry: ActivityLogEntry
): Promise<boolean> {
  const { error } = await client.from('activity_logs').insert({
    admin_id: entry.admin_id ?? null,
    action: entry.action,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id ?? null,
    changes: entry.changes ?? null,
    ip_address: entry.ip_address ?? null,
  })
  return !error
}

export async function requireAdmin(request: NextRequest): Promise<AuthenticatedAdmin> {
  const authorization = request.headers.get('authorization')
  if (!authorization) {
    throw new ServerAuthError('Authentication required')
  }

  const accessToken = getBearerToken(request)
  const client = getSupabaseUserClient(accessToken)
  const { data, error } = await client.auth.getUser(accessToken)
  if (error || !data.user) {
    throw new ServerAuthError('Invalid or expired session')
  }

  const admin = getSupabaseAdmin()
  const { data: profile, error: profileError } = await admin
    .from('users')
    .select('id,email,full_name,phone,role,is_active,created_at')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile || !profile.is_active || !isAdminRole(profile.role)) {
    throw new ServerAuthError('Admin access required', 403)
  }

  return {
    user: data.user,
    profile: profile as ServerUserProfile,
    client: admin,
    accessToken,
  }
}

export async function requireSuperAdmin(request: NextRequest): Promise<AuthenticatedAdmin> {
  const admin = await requireAdmin(request)
  if (!isSuperAdminRole(admin.profile.role)) {
    throw new ServerAuthError('Super admin access required', 403)
  }
  return admin
}
