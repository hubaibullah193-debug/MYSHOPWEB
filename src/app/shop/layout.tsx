'use client'

import Link from 'next/link'
import { useState } from 'react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/auth'
import { useCart } from '@/lib/cart-context'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { itemCount } = useCart()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center gap-4">
          <Link href="/shop/products" className="text-xl font-bold text-gray-900">
            Hubaib One Stop Shop
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link href="/shop/track" className="hidden sm:inline text-sm font-medium text-gray-700 hover:text-primary">
              Track order
            </Link>
            <Link href="/shop/cart" className="text-sm font-medium text-gray-700 hover:text-primary">
              Cart ({itemCount})
            </Link>
            {user ? (
              <>
                <span className="hidden sm:inline text-sm text-gray-600">{user.email}</span>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm font-medium disabled:opacity-50"
                >
                  {signingOut ? 'Signing Out...' : 'Sign Out'}
                </button>
              </>
            ) : (
              <Link href="/admin/login" className="text-sm font-medium text-primary hover:underline">
                Staff Login
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
