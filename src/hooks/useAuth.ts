'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/lib/auth'
import type { Session } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  full_name: string
  phone?: string
  role: UserRole
  created_at: string
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const client = supabase
    if (!client?.auth || !client.from) {
      setError('Authentication is not configured')
      setLoading(false)
      return
    }

    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await client.auth.getSession()

        if (session?.user) {
          // Fetch full user profile
          const { data: userProfile, error: userError } = await client
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (userError) {
            setError('Failed to load user profile')
          } else {
            setUser(userProfile)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Auth error')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (_event: string, session: Session | null) => {
      if (session?.user) {
        const { data: userProfile } = await client
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        setUser(userProfile)
      } else {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user && ['admin_staff', 'super_admin', 'owner'].includes(user.role),
    isSuperAdmin: user && ['super_admin', 'owner'].includes(user.role),
  }
}
