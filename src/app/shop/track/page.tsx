'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import WhatsAppContactLink from '@/components/WhatsAppContactLink'

interface TrackedOrder {
  id: string
  customer_name: string
  customer_phone: string
  customer_address: string
  items: Array<{
    product_id: string
    product_name: string
    price: number
    quantity: number
  }>
  total_amount: number
  delivery_fee?: number | string | null
  delivery_zones?: { name: string } | { name: string }[] | null
  status: string
  payment_method: string
  payment_status: string
  delivery_method?: string
  delivery_date?: string
  delivery_time_slot?: string
  created_at: string
}

const statusLabels: Record<string, string> = {
  pending_payment: 'Pending payment',
  received: 'Order received',
  processing: 'Processing',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const paymentLabels: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
}

function zoneNameOf(order: TrackedOrder): string | null {
  const zone = order.delivery_zones
  if (!zone) return null
  return Array.isArray(zone) ? (zone[0]?.name ?? null) : zone.name
}

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('')
  const [phone, setPhone] = useState('')
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setOrder(null)

    try {
      const response = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, phone }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to find order')
      }
      setOrder(payload.order)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to find order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Track Your Order</h1>
        <p className="text-gray-600 mt-2">Enter the order ID and WhatsApp number used at checkout.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="order_id" className="block text-sm font-medium text-gray-900 mb-1">Order ID</label>
          <input
            id="order_id"
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            required
            placeholder="Paste the full order ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-1">WhatsApp number</label>
          <input
            id="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
            placeholder="03XX XXXXXXX"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-primary hover:bg-indigo-700 rounded text-white font-medium disabled:opacity-50"
          >
            {loading ? 'Tracking...' : 'Track Order'}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {order && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <p className="text-sm text-green-700">Order {order.id.slice(0, 8)}</p>
            <div className="mt-2 flex flex-wrap gap-4">
              <span className="text-xl font-bold text-green-900">
                {statusLabels[order.status] || order.status}
              </span>
              <span className="text-sm text-green-800">
                Payment: {paymentLabels[order.payment_status] || order.payment_status}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Name</p>
                <p className="font-medium text-gray-900">{order.customer_name}</p>
              </div>
              <div>
                <p className="text-gray-600">Delivery method</p>
                <p className="font-medium text-gray-900 capitalize">{order.delivery_method || 'Not assigned'}</p>
                {order.delivery_method === 'courier' && zoneNameOf(order) && (
                  <p className="mt-1 text-xs text-gray-500">Zone: {zoneNameOf(order)}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <p className="text-gray-600">Address</p>
                <p className="font-medium text-gray-900">{order.customer_address || 'Shop pickup'}</p>
              </div>
              {order.delivery_date && (
                <div>
                  <p className="text-gray-600">Assigned date</p>
                  <p className="font-medium text-gray-900">{order.delivery_date}</p>
                </div>
              )}
              {order.delivery_time_slot && (
                <div>
                  <p className="text-gray-600">Assigned time</p>
                  <p className="font-medium text-gray-900">{order.delivery_time_slot}</p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-3">
              {order.items.map((item) => (
                <div key={item.product_id} className="flex justify-between text-sm text-gray-700">
                  <span>{item.product_name} x {item.quantity}</span>
                  <span>PKR {(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Delivery fee</span>
                <span>PKR {Number(order.delivery_fee ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-3 font-bold text-gray-900">
                <span>Total</span>
                <span>PKR {order.total_amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Questions about this order?</h2>
            <p className="text-sm text-gray-600 mb-4">
              Tell us your order ID and we&apos;ll help with delivery, payment, or returns.
            </p>
            <WhatsAppContactLink
              message={`Asalaam-o-Alaikum, I have a question about order ${order.id.slice(0, 8)}.`}
              className="inline-block px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold transition"
            >
              Chat on WhatsApp
            </WhatsAppContactLink>
          </div>
        </div>
      )}

      <Link href="/shop/products" className="inline-block text-primary hover:underline font-medium">
        Continue shopping
      </Link>
    </div>
  )
}
