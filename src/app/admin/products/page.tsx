'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { deleteProduct, listProducts, type ProductClient } from '@/lib/catalog-client'
import { effectivePrice, isOnSale } from '@/lib/product-validation'
import { buttonPrimary, buttonSecondary, EmptyState, ErrorBanner, formatMoney, Spinner } from '@/components/admin/fields'

function productStock(product: ProductClient): number {
  return (product.product_inventory ?? []).reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setProducts(await listProducts())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = async (product: ProductClient) => {
    if (!window.confirm(`Delete "${product.name}" permanently? Orders keep their own snapshots.`)) return
    setBusyId(product.id)
    setError(null)
    try {
      await deleteProduct(product.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete the product.')
    } finally {
      setBusyId(null)
    }
  }

  const filterTerm = search.trim().toLowerCase()
  const visible = products.filter(
    (product) =>
      !filterTerm ||
      product.name.toLowerCase().includes(filterTerm) ||
      (product.cat?.name ?? '').toLowerCase().includes(filterTerm) ||
      (product.subcat?.name ?? '').toLowerCase().includes(filterTerm)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="mt-2 text-gray-600">Manage your catalogue — pricing, variants and availability</p>
        </div>
        <Link href="/admin/products/new" className={buttonPrimary}>
          New product
        </Link>
      </div>

      <div className="rounded-lg bg-white p-4 shadow">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products or categories…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <Spinner label="Loading products…" />
      ) : visible.length === 0 ? (
        <EmptyState
          message={products.length === 0 ? 'No products yet.' : 'No products match your search.'}
          action={
            products.length === 0 ? (
              <Link href="/admin/products/new" className={buttonPrimary}>
                Create your first product
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visible.map((product) => {
                const image = Array.isArray(product.images) ? product.images[0] : product.image_url
                const onSale = isOnSale({
                  price: Number(product.price),
                  sale: {
                    price: product.sale_price === null || product.sale_price === '' ? null : Number(product.sale_price),
                    startsAt: product.sale_starts_at,
                    endsAt: product.sale_ends_at,
                  },
                })
                const price = effectivePrice({
                  price: Number(product.price),
                  sale: {
                    price: product.sale_price === null || product.sale_price === '' ? null : Number(product.sale_price),
                    startsAt: product.sale_starts_at,
                    endsAt: product.sale_ends_at,
                  },
                })
                const stock = productStock(product)
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image} alt="" className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">
                            —
                          </div>
                        )}
                        <span className="font-medium text-gray-900">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {product.cat?.name ?? '—'}
                      {product.subcat?.name ? ` › ${product.subcat.name}` : ''}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="font-semibold text-gray-900">{formatMoney(price)}</span>
                      {onSale && (
                        <span className="ml-2 text-xs text-gray-400 line-through">
                          {formatMoney(product.price)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{stock}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {product.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(product.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          Edit
                        </Link>
                        <button
                          className="font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => void handleDelete(product)}
                          disabled={busyId === product.id}
                        >
                          {busyId === product.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {products.length} product{products.length === 1 ? '' : 's'}
        </p>
        <Link href="/admin/products/new" className={buttonSecondary}>
          Add another
        </Link>
      </div>
    </div>
  )
}