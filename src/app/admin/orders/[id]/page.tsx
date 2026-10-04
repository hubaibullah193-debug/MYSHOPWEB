'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getOrderById, updateOrderStatus, assignDelivery, calculateOrderTotal, orderDeliveryFee, orderDeliveryZoneName } from '@/lib/orders'
import type { Order } from '@/lib/orders'

export default function AdminOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  // Form states
  const [newStatus, setNewStatus] = useState<string>('')
  const [deliveryMethod, setDeliveryMethod] = useState<'self' | 'courier'>('courier')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState('')

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getOrderById(orderId)
        setOrder(data)
        setNewStatus(data.status)
        setDeliveryMethod(data.delivery_method || 'courier')
        setDeliveryDate(data.delivery_date || '')
        setDeliveryTimeSlot(data.delivery_time_slot || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order')
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      fetchOrder()
    }
  }, [orderId])

  const handleStatusUpdate = async () => {
    if (!order || newStatus === order.status) return

    setUpdating(true)
    try {
      const updated = await updateOrderStatus(orderId, newStatus as Order['status'])
      setOrder(updated)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order status')
    } finally {
      setUpdating(false)
    }
  }

  const handleAssignDelivery = async () => {
    if (!order || !deliveryDate || !deliveryTimeSlot) {
      setError('Please fill in all delivery fields')
      return
    }

    setUpdating(true)
    try {
      const updated = await assignDelivery(
        orderId,
        deliveryMethod,
        deliveryDate,
        deliveryTimeSlot
      )
      setOrder(updated)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign delivery')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading order...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-red-600 text-lg font-medium mb-4">{error || 'Order not found'}</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white font-medium"
        >
          Go Back
        </button>
      </div>
    )
  }

  const statusOptions = [
    { value: 'pending_payment', label: 'Pending Payment' },
    { value: 'received', label: 'Order Received' },
    { value: 'processing', label: 'Processing' },
    { value: 'ready', label: 'Ready' },
    { value: 'out_for_delivery', label: 'Out for Delivery' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order {orderId.slice(0, 8)}</h1>
          <p className="text-gray-600 mt-1">
            Created {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
        >
          ← Back
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-gray-900 font-medium">{order.customer_email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="text-gray-900 font-medium">{order.customer_phone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Delivery Address</p>
                <p className="text-gray-900 font-medium">{order.customer_address}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center pb-3 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="font-medium text-gray-900">{item.product_name}</p>
                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    PKR {(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-1 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Items</span>
                <span className="text-gray-900 font-medium">
                  PKR {calculateOrderTotal(order.items).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Delivery fee</span>
                <span className="text-gray-900 font-medium">
                  PKR {orderDeliveryFee(order).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-xl font-bold text-primary">
                  PKR {order.total_amount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Assignment */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Assignment</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Delivery Method
                </label>
                <select
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value as 'self' | 'courier')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value="courier">Courier</option>
                  <option value="self">Customer Pickup</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Delivery Date
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Time Slot
                </label>
                <input
                  type="text"
                  value={deliveryTimeSlot}
                  onChange={(e) => setDeliveryTimeSlot(e.target.value)}
                  placeholder="e.g., 10:00-12:00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>

              <button
                onClick={handleAssignDelivery}
                disabled={updating}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium disabled:opacity-50"
              >
                {updating ? 'Assigning...' : 'Assign Delivery'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Status</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleStatusUpdate}
                disabled={updating || newStatus === order.status}
                className="w-full py-2 bg-primary hover:bg-indigo-700 rounded text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>

          {/* Payment Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Method</p>
                <p className="text-gray-900 font-medium capitalize">{order.payment_method}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Status</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    order.payment_status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : order.payment_status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {order.payment_status}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          {order.delivery_date && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Scheduled Delivery</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Method</p>
                  <p className="text-gray-900 font-medium capitalize">{order.delivery_method}</p>
                </div>
                {orderDeliveryZoneName(order) && (
                  <div>
                    <p className="text-sm text-gray-600">Zone</p>
                    <p className="text-gray-900 font-medium">{orderDeliveryZoneName(order)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="text-gray-900 font-medium">
                    {new Date(order.delivery_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Time</p>
                  <p className="text-gray-900 font-medium">{order.delivery_time_slot}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
