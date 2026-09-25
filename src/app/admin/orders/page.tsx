'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getOrders, getOrderStatusSummary } from '@/lib/orders'
import type { Order } from '@/lib/orders'

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [summary, setSummary] = useState<Record<string, number>>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch orders
        const orderData = await getOrders({ status: statusFilter || undefined })
        setOrders(orderData)

        // Fetch summary
        const summaryData = await getOrderStatusSummary()
        setSummary(summaryData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [statusFilter])

  const statuses = [
    { value: '', label: 'All Orders' },
    { value: 'pending_payment', label: 'Pending Payment' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-600 mt-2">Manage customer orders and fulfillment</p>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { key: 'pending_payment', label: 'Pending Payment', color: 'bg-yellow-50 border-yellow-200' },
          { key: 'confirmed', label: 'Confirmed', color: 'bg-blue-50 border-blue-200' },
          { key: 'processing', label: 'Processing', color: 'bg-purple-50 border-purple-200' },
          { key: 'shipped', label: 'Shipped', color: 'bg-green-50 border-green-200' },
        ].map((stat) => (
          <div key={stat.key} className={`${stat.color} border rounded-lg p-4`}>
            <p className="text-sm font-medium text-gray-700">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {summary[stat.key] || 0}
            </p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="text-sm font-medium text-gray-700">Filter by Status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
        >
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-gray-600">Loading orders...</p>
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg">No orders found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{order.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.customer_email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.customer_phone}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    PKR {order.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        order.status === 'pending_payment'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.status === 'confirmed'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'processing'
                              ? 'bg-purple-100 text-purple-800'
                              : order.status === 'shipped'
                                ? 'bg-green-100 text-green-800'
                                : order.status === 'delivered'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        order.payment_status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : order.payment_status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {order.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-primary hover:text-indigo-700 font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
