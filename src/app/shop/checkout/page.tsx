'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/hooks/useAuth'

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, clearCart, itemCount } = useCart()
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    email: user?.email || '',
    phone: user?.phone || '',
    full_name: user?.full_name || '',
    address: '',
    paymentMethod: 'cod' as 'cod' | 'jazz_cash' | 'easypaisa',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate form
      if (!formData.email || !formData.phone || !formData.full_name || !formData.address) {
        throw new Error('All fields are required')
      }

      if (itemCount === 0) {
        throw new Error('Your cart is empty')
      }

      // Create order
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_email: formData.email,
          customer_phone: formData.phone,
          customer_address: formData.address,
          items: cart.items,
          total_amount: cart.total,
          payment_method: formData.paymentMethod,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create order')
      }

      const { order_id } = await response.json()

      // Clear cart and redirect to confirmation
      clearCart()
      router.push(`/shop/order-confirmation/${order_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setLoading(false)
    }
  }

  if (itemCount === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-600 text-lg mb-4">Your cart is empty</p>
        <button
          onClick={() => router.push('/shop/products')}
          className="px-6 py-2 bg-primary hover:bg-indigo-700 rounded text-white font-medium"
        >
          Continue Shopping
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Checkout Form */}
      <div className="lg:col-span-2">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h2>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-1">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-900 mb-1">
                  Full Name
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Address</h3>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-900 mb-1">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                required
                rows={3}
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="Enter your complete delivery address"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>

            <div className="space-y-3">
              {[
                { value: 'cod', label: 'Cash on Delivery (COD)' },
                { value: 'jazz_cash', label: 'JazzCash' },
                { value: 'easypaisa', label: 'Easypaisa' },
              ].map((method) => (
                <label key={method.value} className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.value}
                    checked={formData.paymentMethod === method.value}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="ml-3 text-gray-900">{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-indigo-700 rounded-lg text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Placing Order...' : 'Place Order'}
          </button>
        </form>
      </div>

      {/* Order Summary */}
      <div>
        <div className="bg-white rounded-lg shadow p-6 sticky top-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h3>

          <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
            {cart.items.map((item) => (
              <div key={item.product_id} className="flex justify-between text-sm text-gray-600">
                <span>
                  {item.product_name} x {item.quantity}
                </span>
                <span>PKR {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>PKR {cart.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>TBD</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>PKR {cart.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
