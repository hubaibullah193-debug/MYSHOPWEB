'use client'

import { useEffect, useState } from 'react'
import { getCustomers, type CustomerDirectoryEntry } from '@/lib/customers'
import { buttonPrimary, EmptyState, ErrorBanner, formatMoney, inputClassName, Spinner } from '@/components/admin/fields'

export default function AdminCustomersPage() {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [customers, setCustomers] = useState<CustomerDirectoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await getCustomers({ q: submittedQuery || undefined })
        if (!cancelled) setCustomers(result)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load customers')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [submittedQuery])

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    setSubmittedQuery(query.trim())
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-600 mt-2">
          Search by WhatsApp number, name or email. Customers are grouped from order history.
        </p>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-lg shadow p-4 flex gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. 92300..., name, or email"
          className={`${inputClassName} mt-0 flex-1`}
          aria-label="Search customers"
        />
        <button type="submit" className={buttonPrimary}>
          Search
        </button>
      </form>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <Spinner label="Loading customers..." />
      ) : customers.length === 0 ? (
        <EmptyState message={submittedQuery ? 'No customers match your search.' : 'No customers yet.'} />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">WhatsApp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Total Spent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">First Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.phone} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{customer.phone}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span className="block">{customer.customer_name}</span>
                    <span className="text-gray-500">{customer.customer_email}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{customer.total_orders}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatMoney(customer.total_spent)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {customer.first_order_at ? new Date(customer.first_order_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {customer.last_order_at ? new Date(customer.last_order_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}