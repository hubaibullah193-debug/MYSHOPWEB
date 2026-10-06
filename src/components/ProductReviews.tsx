'use client'

import { useCallback, useEffect, useState } from 'react'
import { getProductReviews, submitReview, type PublicReview } from '@/lib/reviews'

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5 stars`} className="text-amber-500 whitespace-nowrap">
      {'★'.repeat(rating)}
      <span className="text-gray-300">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

export default function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<PublicReview[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const [orderId, setOrderId] = useState('')
  const [phone, setPhone] = useState('')
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setReviewError(null)
      setReviews(await getProductReviews(productId))
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      await submitReview({ product_id: productId, order_id: orderId, phone, rating, review })
      setSubmitted(true)
      setOrderId('')
      setPhone('')
      setReview('')
      setRating(5)
      await refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Review submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>

      {reviewError && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <p className="text-sm font-medium text-red-800">{reviewError}</p>
        </div>
      )}

      {loading ? (
        <p className="text-gray-600">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-gray-600 mb-6">No reviews yet. Be the first to review this product.</p>
      ) : (
        <ul className="space-y-4 mb-8">
          {reviews.map((review) => (
            <li key={review.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <Stars rating={review.rating} />
                <span className="font-semibold text-gray-900">{review.customer_name}</span>
                <span className="text-sm text-gray-500">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
                {review.is_featured && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Featured
                  </span>
                )}
              </div>
              <p className="text-gray-700 leading-relaxed">{review.review}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Write a review</h3>
        <p className="text-sm text-gray-600 mb-4">
          Only customers who received this product can review it. Enter the order ID and WhatsApp
          number used at checkout.
        </p>

        {submitted && (
          <div className="rounded-md bg-green-50 p-4 mb-4">
            <p className="text-sm font-medium text-green-800">
              Thank you — your review is now live on this product page.
            </p>
          </div>
        )}
        {formError && (
          <div className="rounded-md bg-red-50 p-4 mb-4">
            <p className="text-sm font-medium text-red-800">{formError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="review-order-id" className="block text-sm font-medium text-gray-900 mb-1">
              Order ID
            </label>
            <input
              id="review-order-id"
              type="text"
              required
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              placeholder="Paste the full order ID from your confirmation"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label htmlFor="review-phone" className="block text-sm font-medium text-gray-900 mb-1">
              WhatsApp number
            </label>
            <input
              id="review-phone"
              type="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="03XX XXXXXXX"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="review-rating" className="block text-sm font-medium text-gray-900 mb-1">
              Rating
            </label>
            <select
              id="review-rating"
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} star{value === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="review-text" className="block text-sm font-medium text-gray-900 mb-1">
              Review
            </label>
            <textarea
              id="review-text"
              required
              rows={4}
              value={review}
              onChange={(event) => setReview(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-primary hover:bg-indigo-700 rounded-lg text-white font-semibold disabled:opacity-50 transition"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}