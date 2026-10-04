'use client'

import { useCallback, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getCategories } from '@/lib/products'

interface ProductFiltersProps {
  onFilterChange: (filters: {
    category?: string
    minPrice?: number
    maxPrice?: number
  }) => void
}

export default function ProductFilters({ onFilterChange }: ProductFiltersProps) {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategories(await getCategories())
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }
    fetchCategories()
  }, [])

  const handleFilterChange = useCallback(() => {
    onFilterChange({
      category: selectedCategory || undefined,
      minPrice: minPrice ? parseInt(minPrice) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
    })
  }, [selectedCategory, minPrice, maxPrice, onFilterChange])

  useEffect(() => {
    handleFilterChange()
  }, [handleFilterChange])

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="font-semibold text-gray-900 mb-4">{t('products.filterByCategory')}</h3>

      {/* Category */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('products.category')}
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('products.filterByPrice')} (PKR)
        </label>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <input
              type="number"
              placeholder={t('products.minPrice')}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
          <span className="text-gray-400">—</span>
          <div className="flex-1">
            <input
              type="number"
              placeholder={t('products.maxPrice')}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Reset */}
      {(selectedCategory || minPrice || maxPrice) && (
        <button
          onClick={() => {
            setSelectedCategory('')
            setMinPrice('')
            setMaxPrice('')
          }}
          className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          {t('products.clearFilters')}
        </button>
      )}
    </div>
  )
}
