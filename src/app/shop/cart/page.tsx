'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCart } from '@/lib/cart-context'

export default function CartPage() {
  const router = useRouter()
  const { cart, updateQuantity, removeItem, itemCount } = useCart()

  if (itemCount === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
        <p className="text-gray-600 mb-6">Add some products to get started</p>
        <Link
          href="/shop/products"
          className="inline-block px-6 py-2 bg-primary hover:bg-indigo-700 rounded text-white font-medium"
        >
          Continue Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Cart Items */}
      <div className="lg:col-span-2">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart</h2>

        <div className="space-y-4">
          {cart.items.map((item) => (
            <div key={item.product_id} className="bg-white rounded-lg shadow p-4 flex gap-4">
              {/* Product Image */}
              {item.image_url && (
                <div className="w-20 h-20 flex-shrink-0 bg-gray-200 rounded overflow-hidden">
                  <Image
                    src={item.image_url}
                    alt={item.product_name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Product Details */}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{item.product_name}</h3>
                <p className="text-gray-600">PKR {item.price.toLocaleString()}</p>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.product_id, Math.max(1, item.quantity - 1))}
                  className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                >
                  −
                </button>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    updateQuantity(item.product_id, Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                />
                <button
                  onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                  className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                >
                  +
                </button>
              </div>

              {/* Item Total */}
              <div className="text-right min-w-24">
                <p className="font-semibold text-gray-900">
                  PKR {(item.price * item.quantity).toLocaleString()}
                </p>
                <button
                  onClick={() => removeItem(item.product_id)}
                  className="text-sm text-red-600 hover:text-red-700 mt-2"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Summary */}
      <div>
        <div className="bg-white rounded-lg shadow p-6 sticky top-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Order Summary</h3>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal ({itemCount} items)</span>
              <span>PKR {cart.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>TBD at checkout</span>
            </div>
            <div className="border-t border-gray-200 pt-4 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>PKR {cart.total.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={() => router.push('/shop/checkout')}
            className="w-full py-3 bg-primary hover:bg-indigo-700 rounded text-white font-semibold transition"
          >
            Proceed to Checkout
          </button>

          <Link
            href="/shop/products"
            className="block text-center mt-4 text-primary hover:text-indigo-700 font-medium"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
