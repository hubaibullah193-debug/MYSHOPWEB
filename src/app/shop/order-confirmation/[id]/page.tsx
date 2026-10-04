'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Order {
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
  status: string
  payment_method: string
  payment_status: string
  delivery_method?: string
  delivery_date?: string | null
  delivery_time_slot?: string | null
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

export default function OrderConfirmationPage() {
  const params = useParams()
  const orderId = params.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const phone = sessionStorage.getItem('hubaib_last_order_phone')
    if (!phone || !orderId) {
      setLoading(false)
      return
    }

    const fetchOrder = async () => {
      try {
        const response = await fetch('/api/orders/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId, phone }),
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || 'Unable to load order')
        }
        setOrder(payload.order)
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load order')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  if (loading) {
    return <p className="text-gray-600">Loading order...</p>
  }

  const paymentMethodLabel: Record<string, string> = {
    cod: 'Cash on Delivery',
    jazz_cash: 'JazzCash',
    easypaisa: 'Easypaisa',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <h1 className="text-2xl font-bold text-green-900 mb-2">Order placed successfully</h1>
        <p className="text-green-800">Order ID: {orderId.slice(0, 8)}</p>
      </div>

      {error && (
        <div className="rounded-md bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">{error}</p>
          <Link href="/shop/track" className="inline-block mt-2 text-sm font-medium text-primary hover:underline">
            Track with your WhatsApp number instead
          </Link>
        </div>
      )}

      {order ? (
        <>
          <div className="bg-white rounded-lg shadow p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6 border-b border-gray-200 pb-6">
              <div>
                <p className="text-sm text-gray-600">Order status</p>
                <p className="text-lg font-semibold text-gray-900">{statusLabels[order.status] || order.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">{order.payment_status}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-medium text-gray-900">Name:</span> {order.customer_name}
              </p>
              <p>
                <span className="font-medium text-gray-900">Phone:</span> {order.customer_phone}
              </p>
              <p>
                <span className="font-medium text-gray-900">Address:</span> {order.customer_address || 'Shop pickup'}
              </p>
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-3">
              {order.items.map((item) => (
                <div key={item.product_id} className="flex justify-between text-sm text-gray-700">
                  <span>
                    {item.product_name} x {item.quantity}
                  </span>
                  <span>PKR {(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-gray-200 pt-3 font-bold text-gray-900">
                <span>Total</span>
                <span>PKR {order.total_amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {order.payment_method !== 'cod' && order.payment_status === 'pending' && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
              <h2 className="font-semibold text-blue-900 mb-1">
                {paymentMethodLabel[order.payment_method] || order.payment_method} payment being verified
              </h2>
              <p className="text-sm text-blue-800">
                Your screenshot and transaction reference are being checked. The shop will WhatsApp you
                once your payment is confirmed and the order is being processed.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">Use the tracking form to view this order securely.</p>
          <Link href="/shop/track" className="inline-block px-5 py-2 bg-primary text-white rounded">
            Track order
          </Link>
        </div>
      )}

      <div className="flex gap-4">
        <Link href="/shop/products" className="flex-1 text-center px-5 py-3 bg-gray-200 rounded-lg text-gray-900 font-medium">
          Continue shopping
        </Link>
        <Link href="/shop/track" className="flex-1 text-center px-5 py-3 bg-primary rounded-lg text-white font-medium">
          Track another order
        </Link>
      </div>
    </div>
  )
}