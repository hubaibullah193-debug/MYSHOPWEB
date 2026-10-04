'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { ProductWithInventory } from '@/lib/products'

interface ProductCardProps {
  product: ProductWithInventory
}

export default function ProductCard({ product }: ProductCardProps) {
  const inStock = product.quantity > 0

  return (
    <Link href={`/shop/products/${product.id}`}>
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden h-full flex flex-col">
        {/* Image */}
        <div className="relative w-full h-48 bg-gray-200">
          {product.image_url || (product.images && product.images[0]) ? (
            <Image
              src={product.image_url || (product.images as string[])[0]}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-400">
              No image
            </div>
          )}
          {product.is_on_sale && (
            <span className="absolute top-2 left-2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
              SALE
            </span>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white font-semibold">Out of Stock</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-gray-900 text-lg line-clamp-2">
            {product.name}
          </h3>

          {product.category && (
            <p className="text-sm text-gray-500 mt-1">{product.category}</p>
          )}

          <p className="text-gray-600 text-sm mt-2 line-clamp-2 flex-1">
            {product.description}
          </p>

          {/* Price and Stock */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <span className="flex flex-col">
              <span className="text-xl font-bold text-primary">
                PKR {product.current_price.toLocaleString()}
              </span>
              {product.is_on_sale && (
                <span className="text-sm text-gray-400 line-through">
                  PKR {product.price.toLocaleString()}
                </span>
              )}
            </span>
            <span className={`text-sm font-medium ${inStock ? 'text-green-600' : 'text-red-600'}`}>
              {inStock ? `${product.quantity} in stock` : 'Out of stock'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
