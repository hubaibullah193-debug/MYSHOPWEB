'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProductForm from '@/components/admin/ProductForm'
import { listCategories, type CategoryClient, type ProductClient } from '@/lib/catalog-client'
import { ErrorBanner, Spinner } from '@/components/admin/fields'

export default function NewProductPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<CategoryClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    listCategories()
      .then((result) => {
        if (active) setCategories(result)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load categories')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleSaved = (_product: ProductClient) => {
    router.push('/admin/products')
  }

  if (loading) return <Spinner label="Loading categories…" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">New product</h1>
        <p className="mt-2 text-gray-600">
          Create a product and set its stock through the Inventory section.
        </p>
      </div>
      <ErrorBanner message={error} />
      {!error && <ProductForm mode="create" categories={categories} onSaved={handleSaved} />}
    </div>
  )
}