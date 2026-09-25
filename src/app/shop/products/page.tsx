'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getProducts } from '@/lib/products'
import type { ProductWithInventory } from '@/lib/products'
import ProductCard from '@/components/ProductCard'
import ProductFilters from '@/components/ProductFilters'

export default function ShopPage() {
  const { t } = useTranslation()
  const [products, setProducts] = useState<ProductWithInventory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<{
    category?: string
    minPrice?: number
    maxPrice?: number
  }>({
    category: undefined,
    minPrice: undefined,
    maxPrice: undefined,
  })

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getProducts(filters)
        setProducts(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [filters])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Filters */}
      <aside>
        <ProductFilters onFilterChange={setFilters} />
      </aside>

      {/* Products */}
      <div className="lg:col-span-3">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('products.title')} {products.length > 0 && `(${products.length})`}
          </h2>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-gray-600">{t('common.loading')}</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 text-lg">{t('products.noProducts')}</p>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
