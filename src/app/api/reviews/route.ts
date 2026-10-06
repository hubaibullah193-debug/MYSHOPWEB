import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, safeDatabaseError, ServerAuthError } from '@/lib/supabase-server'
import { parseReviewSubmission, ValidationError } from '@/lib/validation'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(`reviews:${requestAddress(request)}`, 20, 60 * 60 * 1000)
    const input = parseReviewSubmission(await request.json())
    const admin = getSupabaseAdmin()

    const { data: review, error } = await admin.rpc('submit_review', {
      p_order_id: input.order_id,
      p_product_id: input.product_id,
      p_phone: input.phone,
      p_rating: input.rating,
      p_review: input.review,
    })

    if (error || !review) {
      if (error) {
        console.error('Review submission rejected:', error)
        return NextResponse.json({ error: safeDatabaseError(error, 'Unable to submit review') }, { status: 400 })
      }
      return NextResponse.json({ error: 'Unable to submit review' }, { status: 500 })
    }

    return NextResponse.json({ review })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof ServerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof Error && error.message === 'Too many requests') {
      return NextResponse.json({ error: 'Too many review submissions. Please try again later.' }, { status: 429 })
    }
    console.error('Review submission failed:', error)
    return NextResponse.json({ error: 'Unable to submit review' }, { status: 500 })
  }
}