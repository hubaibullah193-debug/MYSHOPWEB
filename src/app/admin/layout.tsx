'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { signOutAdmin } from '@/lib/admin-account'
import { useState } from 'react'

const ADMIN_PUBLIC_PATHS = ['/admin/login', '/admin/forgot-password', '/admin/reset-password']

interface NavItem {
  label: string
  href: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', href: '/admin' }],
  },
  {
    title: 'Orders',
    items: [
      { label: 'Orders', href: '/admin/orders' },
      { label: 'Payments', href: '/admin/payments' },
      { label: 'Refunds / Returns', href: '/admin/refunds' },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { label: 'Products', href: '/admin/products' },
      { label: 'Categories', href: '/admin/categories' },
      { label: 'Inventory', href: '/admin/inventory' },
    ],
  },
  {
    title: 'Customers',
    items: [
      { label: 'Customers', href: '/admin/customers' },
      { label: 'Reviews', href: '/admin/reviews' },
    ],
  },
  {
    title: 'Requests',
    items: [
      { label: 'Printing Requests', href: '/admin/printing-requests' },
      { label: 'Bulk Orders', href: '/admin/bulk-orders' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Analytics', href: '/admin/analytics' },
      { label: 'Delivery Zones', href: '/admin/delivery-zones' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Website Content', href: '/admin/website-content' },
      { label: 'Settings', href: '/admin/settings' },
      { label: 'Activity Log', href: '/admin/activity' },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, isAdmin } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOutAdmin()
      router.push('/admin/login')
    } catch (error) {
      console.error('Sign out failed:', error)
    } finally {
      setSigningOut(false)
    }
  }

  if (ADMIN_PUBLIC_PATHS.includes(pathname ?? '')) {
    return <>{children}</>
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

  if (!user || !isAdmin) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold">Hubaib Admin</h1>
          <p className="text-sm text-gray-400 mt-1">Management Dashboard</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="px-4 mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active =
                    item.href === '/admin'
                      ? pathname === '/admin'
                      : pathname?.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-4 py-2 rounded text-sm transition ${
                        active
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-800">
          <div className="bg-gray-800 rounded p-4 mb-4">
            <p className="text-sm text-gray-400">Logged in as</p>
            <p className="text-white font-medium truncate">{user.email}</p>
            <p className="text-xs text-gray-400 capitalize">{user.role.replace('_', ' ')}</p>
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