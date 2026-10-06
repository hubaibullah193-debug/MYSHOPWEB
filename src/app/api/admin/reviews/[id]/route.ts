import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, safeDatabaseError, ServerAuthError } from '@/lib/supabase-server'
import { isValidUuid, ValidationError } from '@/lib/validation'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    enforceRateLimit(`admin-reviews:${requestAddress(request)}`, 120, 60 * 60 * 1000)
    if (!isValidUuid(params.id)) {
      throw new ValidationError('Invalid review ID')
    }

    const admin = await requireAdmin(request)
    const body = await request.json()
    if (body?.action !== 'remove') {
      throw new ValidationError('Invalid review action')
    }

    const { data: review, error } = await admin.client.rpc('remove_review', {
      p_review_id: params.id,
      p_admin_id: admin.profile.id,
    })

    if (error || !review) {
      if (error) {
        console.error('Review removal rejected:', error)
        return NextResponse.json({ error: safeDatabaseError(error, 'Unable to remove review') }, { status: 400 })
      }
      return NextResponse.json({ error: 'Unable to remove review' }, { status: 500 })
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
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    console.error('Review removal failed:', error)
    return NextResponse.json({ error: 'Unable to remove review' }, { status: 500 })
  }
}