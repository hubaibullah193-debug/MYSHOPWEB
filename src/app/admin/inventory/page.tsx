'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  adjustInventory,
  listInventory,
  type InventoryEntry,
  type InventoryUnit,
} from '@/lib/catalog-client'
import {
  buttonDanger,
  buttonSecondary,
  EmptyState,
  ErrorBanner,
  Field,
  formatMoney,
  inputClassName,
  Spinner,
} from '@/components/admin/fields'

interface AdjustTarget {
  entry: InventoryEntry
  unit: InventoryUnit
}

function computeTotal(entry: InventoryEntry): number {
  return entry.units.reduce((sum, unit) => sum + unit.quantity, 0)
}

function stockLabel(quantity: number): { text: string; className: string } {
  if (quantity <= 0) return { text: 'Out of stock', className: 'bg-red-100 text-red-800' }
  if (quantity <= 5) return { text: 'Low stock', className: 'bg-amber-100 text-amber-800' }
  return { text: 'In stock', className: 'bg-green-100 text-green-800' }
}

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<InventoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [adjustTarget, setAdjustTarget] = useState<AdjustTarget | null>(null)
  const [change, setChange] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setInventory(await listInventory())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openAdjust = (entry: InventoryEntry, unit: InventoryUnit) => {
    setAdjustTarget({ entry, unit })
    setChange('')
    setReason('')
    setError(null)
  }

  const handleAdjust = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!adjustTarget) return
    setBusy(true)
    setError(null)
    try {
      const delta = Math.round(Number(change))
      if (!Number.isFinite(delta) || delta === 0) {
        throw new Error('Enter a whole number other than 0.')
      }
      await adjustInventory({
        productId: adjustTarget.entry.product_id,
        variantId: adjustTarget.unit.variant_id,
        quantityChange: delta,
        reason: reason.trim(),
      })
      setAdjustTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to adjust stock.')
    } finally {
      setBusy(false)
    }
  }

  const filterTerm = search.trim().toLowerCase()
  const visible = inventory.filter(
    (entry) =>
      !filterTerm ||
      entry.name.toLowerCase().includes(filterTerm) ||
      (entry.category_name ?? '').toLowerCase().includes(filterTerm)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
        <p className="mt-2 text-gray-600">Track stock per variant or product and record adjustments.</p>
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
        <Spinner label="Loading inventory…" />
      ) : visible.length === 0 ? (
        <EmptyState
          message={inventory.length === 0 ? 'No stock recorded yet.' : 'No products match your search.'}
          action={
            inventory.length === 0 ? (
              <Link href="/admin/products" className={buttonSecondary}>
                Manage products
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Variant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Current price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Last updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visible.map((entry) =>
                entry.units.map((unit, index) => {
                  const label = stockLabel(unit.quantity)
                  return (
                    <tr key={`${entry.product_id}-${unit.variant_id ?? 'base'}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">
                          {index === 0 ? (
                            <Link href={`/admin/products/${entry.product_id}`} className="hover:text-indigo-600">
                              {entry.name}
                            </Link>
                          ) : (
                            entry.name
                          )}
                        </p>
                        {index === 0 && (
                          <p className="text-xs text-gray-500">{entry.category_name ?? 'Uncategorised'}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{unit.variant_name ?? 'Product level'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="font-semibold text-gray-900">{formatMoney(entry.current_price)}</span>
                        {entry.is_on_sale && (
                          <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                            Sale
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{unit.quantity}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${label.className}`}>
                          {label.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {unit.last_updated ? new Date(unit.last_updated).toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          className="font-medium text-indigo-600 hover:text-indigo-700"
                          onClick={() => openAdjust(entry, unit)}
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {visible.length > 0 && (
              <tfoot className="border-t border-gray-200 bg-gray-50">
                <tr>
                  <td colSpan={7} className="px-6 py-3 text-sm text-gray-600">
                    {visible.length} product{visible.length === 1 ? '' : 's'} ·{' '}
                    {visible.reduce((sum, entry) => sum + computeTotal(entry), 0)} units in stock
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleAdjust} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Adjust stock</h2>
            <p className="mt-1 text-sm text-gray-600">
              {adjustTarget.entry.name}
              {adjustTarget.unit.variant_name ? ` — ${adjustTarget.unit.variant_name}` : ''}
            </p>
            <div className="mt-4 space-y-4">
              <div className="rounded-md bg-gray-50 px-4 py-3">
                <p className="text-sm text-gray-500">Current stock</p>
                <p className="text-2xl font-bold text-gray-900">{adjustTarget.unit.quantity}</p>
              </div>
              <Field label="Quantity change" required hint="Positive to add stock, negative to deduct.">
                <input
                  className={inputClassName}
                  type="number"
                  value={change}
                  onChange={(event) => setChange(event.target.value)}
                  placeholder="e.g. 10 or -2"
                  required
                />
              </Field>
              <Field label="Reason" required hint="Saved in the audit trail for stock changes.">
                <input
                  className={inputClassName}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="e.g. delivery received, damaged item"
                  maxLength={500}
                  required
                />
              </Field>
            </div>
            <ErrorBanner message={error} />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className={buttonSecondary}
                onClick={() => setAdjustTarget(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button className={buttonDanger} disabled={busy}>
                {busy ? 'Saving…' : 'Apply change'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}