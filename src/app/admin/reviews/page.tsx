'use client'

import { useCallback, useEffect, useState } from 'react'
import { listAdminReviews, removeAdminReview, type AdminReview } from '@/lib/reviews'

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5 stars`} className="text-amber-500">
      {'★'.repeat(rating)}
      <span className="text-gray-300">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'visible' | 'removed'>('visible')

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setReviews(await listAdminReviews())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleRemove = async (review: AdminReview) => {
    if (review.is_removed) return
    setProcessingId(review.id)
    setError(null)
    setNotice(null)
    try {
      await removeAdminReview(review.id)
      setNotice('Review removed from the product page.')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove review')
    } finally {
      setProcessingId(null)
    }
  }

  const visible = reviews.filter((review) =>
    filter === 'all' ? true : filter === 'removed' ? review.is_removed : !review.is_removed
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reviews</h1>
        <p className="text-gray-600 mt-2">
          Customer reviews appear on product pages immediately. Remove a review to hide it — customer
          content can never be edited.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'visible' as const, label: 'Visible' },
          { key: 'removed' as const, label: 'Removed' },
          { key: 'all' as const, label: 'All' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              filter === tab.key
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tab.label}
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
            <p className="mt-4 text-gray-600">Loading reviews...</p>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg">No reviews in this view</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Review</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visible.map((review) => (
                <tr key={review.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">{review.product_name || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <span>{review.customer_name}</span>
                    {review.order_id && (
                      <span className="ml-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Verified
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm"><Stars rating={review.rating} /></td>
                  <td className="px-6 py-4 text-sm text-gray-700 max-w-md">
                    <p className="leading-relaxed line-clamp-3">{review.review}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(review.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {review.is_removed ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        Removed
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        Visible
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <button
                      onClick={() => handleRemove(review)}
                      disabled={review.is_removed || processingId === review.id}
                      className="px-3 py-1.5 rounded bg-red-50 text-red-700 border border-red-200 text-xs font-semibold hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {processingId === review.id ? 'Removing...' : 'Remove'}
                    </button>
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