import { supabase } from './supabase'

export type UserRole = 'customer' | 'admin_staff' | 'super_admin' | 'owner'

export interface User {
  id: string
  email: string
  full_name: string
  phone?: string
  role: UserRole
  created_at: string
}

/**
 * Get current session and user
 */
export async function getCurrentUser() {
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
export function isAdmin(role: UserRole | null) {
  return role && ['admin_staff', 'super_admin', 'owner'].includes(role)
}

/**
 * Check if user is owner or super admin
 */
export function isSuperAdmin(role: UserRole | null) {
  return role && ['super_admin', 'owner'].includes(role)
}

/**
 * Check if user is owner
 */
export function isOwner(role: UserRole | null) {
  return role === 'owner'
}

/**
 * Sign up customer
 */
export async function signUpCustomer(
  email: string,
  password: string,
  fullName: string,
  phone: string
) {
  // Create auth user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
      },
    },
  })

  if (authError || !authUser) {
    throw authError || new Error('Failed to create auth user')
  }

  // Create user profile in users table
  const { error: profileError } = await supabase.from('users').insert({
    id: authUser.id,
    email,
    full_name: fullName,
    phone,
    role: 'customer',
  })

  if (profileError) {
    throw profileError
  }

  return authUser
}

/**
 * Sign in user (customer or admin)
 */
export async function signIn(email: string, password: string) {
  const {
    data: { session },
    error,
  } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  return session
}

/**
 * Sign out user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}

/**
 * Get JWT token for API calls
 */
export async function getAuthToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token
}
