'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { getProductById } from '@/lib/products'
import { useCart } from '@/lib/cart-context'
import type { ProductWithInventory } from '@/lib/products'

export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  const { addToCart } = useCart()

  const [product, setProduct] = useState<ProductWithInventory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)
  const [cartMessage, setCartMessage] = useState<string | null>(null)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getProductById(productId)
        setProduct(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product')
      } finally {
        setLoading(false)
      }
    }

    if (productId) {
      fetchProduct()
    }
  }, [productId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-red-600 text-lg font-medium mb-4">{error || 'Product not found'}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white font-medium"
        >
          Go Back
        </button>
      </div>
    )
  }

  const inStock = product.quantity > 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Product Image */}
      <div>
        <div className="bg-gray-200 rounded-lg overflow-hidden">
          {product.image_url ? (
            <div className="relative w-full h-96">
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-96 flex items-center justify-center bg-gray-300 text-gray-400">
              No image available
            </div>
          )}
        </div>
      </div>

      {/* Product Details */}
      <div className="space-y-6">
        {/* Header */}
        <div>
          {product.category && (
            <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">{product.category}</p>
          )}
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
        </div>

        {/* Price */}
        <div className="border-t border-b border-gray-200 py-6">
          <div className="text-4xl font-bold text-primary mb-2">
            PKR {product.price.toLocaleString()}
          </div>
          <p className="text-sm text-gray-600">Price in Pakistani Rupees</p>
        </div>

        {/* Stock Status */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Availability</p>
          <p
            className={`text-lg font-semibold ${inStock ? 'text-green-600' : 'text-red-600'}`}
          >
            {inStock ? (
              <>
                ✓ In Stock ({product.quantity} {product.quantity === 1 ? 'item' : 'items'} available)
              </>
            ) : (
              <>✗ Out of Stock</>
            )}
          </p>
        </div>

        {/* Description */}
        {product.description && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">About this product</h3>
            <p className="text-gray-600 leading-relaxed">{product.description}</p>
          </div>
        )}

        {/* Quantity and Add to Cart */}
        {inStock && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max={product.quantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(product.quantity, parseInt(e.target.value) || 1)))}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-md text-center"
                />
                <button
                  onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  +
                </button>
              </div>
            </div>

            <button
              disabled={addingToCart}
              onClick={async () => {
                setAddingToCart(true)
                try {
                  addToCart(
                    {
                      product_id: product.id,
                      product_name: product.name,
                      price: product.price,
                      image_url: product.image_url,
                    },
                    quantity
                  )
                  setCartMessage(`Added ${quantity} item(s) to cart`)
                  setTimeout(() => setCartMessage(null), 3000)
                  setQuantity(1)
                } finally {
                  setAddingToCart(false)
                }
              }}
              className="w-full py-3 px-6 rounded-lg font-semibold text-white transition bg-primary hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingToCart ? 'Adding to Cart...' : 'Add to Cart'}
            </button>

            {cartMessage && (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-sm text-green-800">{cartMessage}</p>
              </div>
            )}
          </div>
        )}

        {/* Product Info */}
        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-200">
          <div>
            <p className="text-sm text-gray-600">Product ID</p>
            <p className="text-sm font-mono text-gray-900">{product.id.slice(0, 8)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Category</p>
            <p className="text-sm text-gray-900">{product.category || 'General'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
