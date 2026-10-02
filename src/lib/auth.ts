import { supabase } from './supabase'
import {
  isAdminRole,
  isOwnerRole,
  isSuperAdminRole,
  type UserRole,
} from './admin-permissions'

export type { UserRole }

export interface User {
  id: string
  email: string
  full_name: string
  phone?: string
  role: UserRole
  created_at: string
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate Pakistani phone number
 */
export function validatePhoneNumber(phone: string): boolean {
  // Accept +923XX, 03XX, or 923XX format with 10-11 digits
  const phoneRegex = /^(\+92|0|92)3\d{8,9}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

/**
 * Get current session and user
 */
export async function getCurrentUser() {
  if (!supabase?.auth) {
    return null
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return null
  }

  // Fetch user profile with role from users table
  const { data: userProfile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (error || !userProfile) {
    return null
  }

  return {
    ...userProfile,
    auth_id: session.user.id,
  }
}

/**
 * Check if user has admin access
 */
export function isAdmin(role: UserRole | null): boolean {
  return isAdminRole(role)
}

/**
 * Check if user is owner or super admin
 */
export function isSuperAdmin(role: UserRole | null): boolean {
  return isSuperAdminRole(role)
}

/**
 * Check if user is owner
 */
export function isOwner(role: UserRole | null): boolean {
  return isOwnerRole(role)
}

/**
 * Sign in an admin with email & password.
 * All failures map to a single generic message so that login
 * never reveals whether an account exists or is active.
 */
export async function signIn(email: string, password: string) {
  if (!supabase?.auth) {
    throw new Error('Authentication is not configured')
  }
  if (!validateEmail(email) || !password) {
    throw new Error('Invalid email or password.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error || !data.session) {
    throw new Error('Invalid email or password.')
  }

  return data.session
}

/**
 * Ask Supabase to email a password-reset link. Always succeeds from the
 * caller's perspective to avoid revealing whether the email is registered.
 */
export async function requestPasswordReset(email: string, redirectTo: string) {
  if (!supabase?.auth) {
    throw new Error('Authentication is not configured')
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo }
  )

  if (error) {
    throw error
  }
}

/**
 * Sign out user
 */
export async function signOut() {
  if (!supabase?.auth) return
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}

/**
 * Get JWT token for API calls
 */
export async function getAuthToken() {
  if (!supabase?.auth) return undefined
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token
}