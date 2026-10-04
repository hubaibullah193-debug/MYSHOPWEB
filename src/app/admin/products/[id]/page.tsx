'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ProductForm from '@/components/admin/ProductForm'
import { getProduct, listCategories, type CategoryClient, type ProductClient } from '@/lib/catalog-client'
import { EmptyState, ErrorBanner, Spinner } from '@/components/admin/fields'

export default function EditProductPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const [categories, setCategories] = useState<CategoryClient[]>([])
  const [product, setProduct] = useState<ProductClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([listCategories(), getProduct(id)])
      .then(([categoryList, productDetail]) => {
        if (!active) return
        setCategories(categoryList)
        setProduct(productDetail)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load the product.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  const handleSaved = (_product: ProductClient) => {
    router.push('/admin/products')
  }

  if (loading) return <Spinner label="Loading product…" />

  if (error) {
    return (
      <EmptyState
        message="Unable to load this product."
        action={
          <Link href="/admin/products" className="font-medium text-indigo-600 hover:text-indigo-700">
            Back to products
          </Link>
        }
      />
    )
  }

  if (!product) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="truncate text-3xl font-bold text-gray-900">Edit: {product.name}</h1>
        <p className="mt-2 text-gray-600">Update details, sale pricing, images or variants.</p>
      </div>
      <ErrorBanner message={error} />
      <ProductForm mode="edit" product={product} categories={categories} onSaved={handleSaved} />
    </div>
  )
}