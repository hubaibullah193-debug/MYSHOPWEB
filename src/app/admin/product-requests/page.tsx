'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  listProductRequests,
  updateProductRequest,
  type ProductRequest,
  type ProductRequestStatus,
} from '@/lib/product-requests'
import { whatsappLink } from '@/lib/business-config'

const STATUS_OPTIONS: ProductRequestStatus[] = ['pending', 'contacted', 'completed', 'cancelled']

const STATUS_BADGES: Record<ProductRequestStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
  contacted: { label: 'Contacted', className: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-700' },
}

export default function AdminProductRequestsPage() {
  const [requests, setRequests] = useState<ProductRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | ProductRequestStatus>('pending')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { status: ProductRequestStatus; notes: string }>>({})

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setRequests(await listProductRequests())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleSave = async (request: ProductRequest) => {
    const draft = drafts[request.id]
    if (!draft) return
    setSavingId(request.id)
    setError(null)
    setNotice(null)
    try {
      const updated = await updateProductRequest(request.id, draft.status, draft.notes || undefined)
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[request.id]
        return next
      })
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setNotice(`Request marked as ${updated.status}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update request')
    } finally {
      setSavingId(null)
    }
  }

  const visible = requests.filter((request) => statusFilter === 'all' || request.status === statusFilter)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Product Requests</h1>
        <p className="text-gray-600 mt-2">
          Requests for out-of-stock or unlisted products. Follow up reachable customers and keep the
          status in sync: Pending → Contacted → Completed or Cancelled.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['pending', 'contacted', 'completed', 'cancelled', 'all'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              statusFilter === status
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {status === 'all' ? 'All' : STATUS_BADGES[status].label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}
      {notice && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">{notice}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-gray-600">Loading requests...</p>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg">No requests in this view</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {visible.map((request) => {
            const badge = STATUS_BADGES[request.status]
            const contactLink = whatsappLink(
              `Asalaam-o-Alaikum ${request.customer_name}, regarding your request for ${request.product_name}`
            )
            return (
              <div key={request.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {request.product_name} <span className="text-gray-500">× {request.quantity}</span>
                      </h2>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-gray-700">
                      <p>
                        <span className="font-medium">Customer:</span> {request.customer_name}
                      </p>
                      <p>
                        <span className="font-medium">WhatsApp:</span> {request.whatsapp}
                        {contactLink && (
                          <a
                            href={contactLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-3 font-medium text-primary hover:underline"
                          >
                            Chat on WhatsApp
                          </a>
                        )}
                      </p>
                      {request.message && (
                        <p>
                          <span className="font-medium">Message:</span> {request.message}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Requested:</span>{' '}
                        {new Date(request.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="w-full max-w-sm">
                    <div className="space-y-2">
                      <label htmlFor={`status-${request.id}`} className="sr-only">
                        Status
                      </label>
                      <select
                        id={`status-${request.id}`}
                        value={drafts[request.id]?.status ?? request.status}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [request.id]: {
                              status: e.target.value as ProductRequestStatus,
                              notes: prev[request.id]?.notes ?? request.admin_notes ?? '',
                            },
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {STATUS_BADGES[option].label}
                          </option>
                        ))}
                      </select>
                      <label htmlFor={`notes-${request.id}`} className="sr-only">
                        Admin notes
                      </label>
                      <input
                        id={`notes-${request.id}`}
                        type="text"
                        placeholder="Admin notes (visible to staff only)"
                        value={drafts[request.id]?.notes ?? request.admin_notes ?? ''}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [request.id]: {
                              status: prev[request.id]?.status ?? request.status,
                              notes: e.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                      />
                      <button
                        onClick={() => handleSave(request)}
                        disabled={savingId === request.id}
                        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition"
                      >
                        {savingId === request.id ? 'Saving...' : 'Save status & notes'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}