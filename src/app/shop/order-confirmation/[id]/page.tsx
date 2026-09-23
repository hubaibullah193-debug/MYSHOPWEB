'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Order {
  id: string
  customer_email: string
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
  created_at: string
}

export default function OrderConfirmationPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: queryError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()

        if (queryError || !data) {
          throw new Error('Order not found')
        }

        setOrder(data)
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

  if (error || !order) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-red-600 text-lg font-medium mb-4">{error || 'Order not found'}</p>
        <Link
          href="/shop/products"
          className="inline-block px-6 py-2 bg-primary hover:bg-indigo-700 rounded text-white font-medium"
        >
          Back to Shop
        </Link>
      </div>
    )
  }

  const paymentMethodLabel: Record<string, string> = {
    cod: 'Cash on Delivery',
    jazz_cash: 'JazzCash',
    easypaisa: 'Easypaisa',
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Success Message */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-center">
        <div className="text-4xl mb-2">✓</div>
        <h1 className="text-2xl font-bold text-green-900 mb-2">Order Placed Successfully!</h1>
        <p className="text-green-800">Your order is pending payment confirmation</p>
      </div>

      {/* Order Details */}
      <div className="bg-white rounded-lg shadow p-8 space-y-8">
        {/* Order ID and Status */}
        <div className="border-b border-gray-200 pb-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Order ID</p>
              <p className="text-lg font-mono font-semibold text-gray-900">{order.id.slice(0, 8)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Order Status</p>
              <p className="text-lg font-semibold text-yellow-600 capitalize">{order.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Payment Status</p>
              <p className="text-lg font-semibold text-orange-600 capitalize">{order.payment_status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Payment Method</p>
              <p className="text-lg font-semibold text-gray-900">
                {paymentMethodLabel[order.payment_method] || order.payment_method}
              </p>
            </div>
          </div>
        </div>

        {/* Delivery Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Information</h2>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p className="text-gray-600">
              <span className="font-medium">Name:</span> (Will be assigned by admin)
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Phone:</span> {order.customer_phone}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Email:</span> {order.customer_email}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Address:</span> {order.customer_address}
            </p>
          </div>
        </div>

        {/* Order Items */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
          <div className="space-y-3">
            {(order.items as Array<any>).map((item, idx) => (
              <div key={idx} className="flex justify-between text-gray-600 py-2 border-b border-gray-100">
                <span>
                  {item.product_name} x {item.quantity}
                </span>
                <span className="font-medium">PKR {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Total */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Total Amount</span>
            <span className="text-2xl font-bold text-primary">
              PKR {order.total_amount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Next Steps</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Your order has been created with ID: {order.id.slice(0, 8)}</li>
            <li>⏳ Admin will verify your payment shortly</li>
            <li>📦 Once confirmed, you'll receive shipping details</li>
            <li>📧 Check your email for order updates</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <Link
            href="/shop/products"
            className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-900 font-medium text-center transition"
          >
            Continue Shopping
          </Link>
          <button
            onClick={() => router.push('/shop/products')}
            className="flex-1 px-6 py-3 bg-primary hover:bg-indigo-700 rounded-lg text-white font-medium transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
