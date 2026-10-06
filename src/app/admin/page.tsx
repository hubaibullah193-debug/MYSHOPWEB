'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import {
  buildDashboardNotifications,
  getAdminDashboard,
  summaryStatus,
  type DashboardData,
} from '@/lib/dashboard'
import { getOrderStatusBadgeColor } from '@/lib/orders'
import { EmptyState, ErrorBanner, formatMoney, Spinner } from '@/components/admin/fields'

const STATUS_ROWS: Array<{ key: Parameters<typeof summaryStatus>[1]; label: string }> = [
  { key: 'pending_payment', label: 'Pending Payment' },
  { key: 'received', label: 'Received' },
  { key: 'processing', label: 'Processing' },
  { key: 'ready', label: 'Ready' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
]

const NOTIFICATION_TONE = {
  danger: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

export default function AdminDashboard() {
  const { user, isSuperAdmin } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await getAdminDashboard()
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  const summary = data?.summary
  const notifications = summary ? buildDashboardNotifications(summary) : []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, {user?.full_name}</p>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <Spinner label="Loading dashboard..." />
      ) : !summary ? (
        <EmptyState message="No dashboard data available yet." />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-gray-500 text-sm font-medium">Total Orders</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{summary.total_orders}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-gray-500 text-sm font-medium">Pending Payments</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {summaryStatus(summary, 'pending_payment')}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-gray-500 text-sm font-medium">Processing Orders</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {summaryStatus(summary, 'processing')}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-gray-500 text-sm font-medium">Total Sales</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{formatMoney(summary.total_sales)}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-gray-500 text-sm font-medium">Low Stock Items</div>
              <div className="mt-2 text-3xl font-bold text-yellow-600">{summary.low_stock_items}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-gray-500 text-sm font-medium">Out of Stock Items</div>
              <div className="mt-2 text-3xl font-bold text-red-600">{summary.out_of_stock_items}</div>
            </div>
          </div>

          {notifications.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Notifications</h2>
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.href}
                    className={`block border rounded-lg p-4 transition hover:opacity-80 ${NOTIFICATION_TONE[notification.tone]}`}
                  >
                    <p className="text-sm font-medium">{notification.message}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Orders by Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
              {STATUS_ROWS.map((row) => (
                <div key={row.key} className="bg-white rounded-lg shadow p-4">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getOrderStatusBadgeColor(row.key)}`}
                  >
                    {row.label}
                  </span>
                  <p className="mt-3 text-2xl font-bold text-gray-900">{summaryStatus(summary, row.key)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                <Link href="/admin/orders" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  View all
                </Link>
              </div>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {data.recent_orders.length === 0 ? (
                  <p className="text-gray-600 p-8 text-center">No orders yet.</p>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Order</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data.recent_orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono text-gray-900">{order.id.slice(0, 8)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <span className="block">{order.customer_name}</span>
                            <span className="text-gray-500">{order.customer_phone}</span>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            {formatMoney(order.total_amount)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${getOrderStatusBadgeColor(order.status)}`}
                            >
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">Recent Reviews</h2>
                <Link href="/admin/reviews" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  View all
                </Link>
              </div>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {data.recent_reviews.length === 0 ? (
                  <p className="text-gray-600 p-8 text-center">No reviews yet.</p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {data.recent_reviews.map((review) => (
                      <li key={review.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {review.product_name ?? 'Product'}
                            {review.is_removed && (
                              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">removed</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">{'★'.repeat(review.rating)}</p>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {review.customer_name} · {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {isSuperAdmin && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-blue-900">Super Admin Shortcuts</h2>
              <ul className="mt-3 space-y-2 text-blue-800">
                <li>• Manage products, categories and inventory</li>
                <li>• Configure delivery zones and website content</li>
                <li>• Manage admin accounts under Settings</li>
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}