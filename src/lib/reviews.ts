import { supabase } from './supabase'
import { apiFetch } from './api'
import type { ReviewSubmission } from './validation'

export interface PublicReview {
  id: string
  product_id: string | null
  customer_name: string
  rating: number
  review: string
  is_featured: boolean
  created_at: string
}

/** Admin view — includes moderation fields hidden from the public view. */
export interface AdminReview extends PublicReview {
  order_id: string | null
  is_removed: boolean
  product_name: string | null
  updated_at: string
}

/**
 * Public review reads come from the public_reviews view (RLS column-pruned;
 * removed or unverified reviews never appear).
 */
export async function getProductReviews(productId: string): Promise<PublicReview[]> {
  const { data, error } = await supabase
    .from('public_reviews')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    throw error
  }

  return (data as unknown as PublicReview[] | null) ?? []
}

export async function submitReview(input: ReviewSubmission): Promise<AdminReview> {
  const result = await apiFetch<{ review: AdminReview }>('/api/reviews', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return result.review
}

export async function listAdminReviews(): Promise<AdminReview[]> {
  const result = await apiFetch<{ reviews: AdminReview[] }>('/api/admin/reviews')
  return result.reviews
}

export async function removeAdminReview(reviewId: string): Promise<AdminReview> {
  const result = await apiFetch<{ review: AdminReview }>(`/api/admin/reviews/${reviewId}`, {
    method: 'POST',
    body: JSON.stringify({ action: 'remove' }),
  })
  return result.review
}