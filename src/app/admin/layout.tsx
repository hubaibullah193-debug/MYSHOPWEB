'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/auth'
import { useState } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
      router.push('/admin/login')
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

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold">Hubaib Admin</h1>
          <p className="text-sm text-gray-400 mt-1">Management Dashboard</p>
        </div>

        <nav className="p-6 space-y-4">
          <a
            href="/admin"
            className="block px-4 py-2 rounded hover:bg-gray-800 transition"
          >
            Dashboard
          </a>
          <a
            href="/admin/orders"
            className="block px-4 py-2 rounded hover:bg-gray-800 transition"
          >
            Orders
          </a>
          <a
            href="/admin/products"
            className="block px-4 py-2 rounded hover:bg-gray-800 transition"
          >
            Products
          </a>
          <a
            href="/admin/payments"
            className="block px-4 py-2 rounded hover:bg-gray-800 transition"
          >
            Payments
          </a>
          <a
            href="/admin/activity"
            className="block px-4 py-2 rounded hover:bg-gray-800 transition"
          >
            Activity Log
          </a>
        </nav>

        <div className="absolute bottom-0 left-0 w-64 p-6 border-t border-gray-800">
          <div className="bg-gray-800 rounded p-4 mb-4">
            <p className="text-sm text-gray-400">Logged in as</p>
            <p className="text-white font-medium truncate">{user.email}</p>
            <p className="text-xs text-gray-400 capitalize">{user.role}</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {signingOut ? 'Signing Out...' : 'Sign Out'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm">
          <h2 className="text-gray-900 font-semibold">Admin Panel</h2>
        </div>
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  )
}
