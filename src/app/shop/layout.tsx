'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/auth'
import { useState } from 'react'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Sign out failed:', error)
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'customer') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hubaib One Stop Shop</h1>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-gray-600">{user.email}</p>
              <p className="text-xs text-gray-500">{user.full_name}</p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {signingOut ? 'Signing Out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
