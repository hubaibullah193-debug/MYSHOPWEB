import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, safeDatabaseError, ServerAuthError } from '@/lib/supabase-server'
import { isValidUuid, parseAdminNotes, parseProductRequestStatus, ValidationError } from '@/lib/validation'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    enforceRateLimit(`admin-product-requests:${requestAddress(request)}`, 120, 60 * 60 * 1000)
    if (!isValidUuid(params.id)) {
      throw new ValidationError('Invalid request ID')
    }

    const admin = await requireAdmin(request)
    const body = await request.json()
    const status = parseProductRequestStatus(body?.status)
    const notes = parseAdminNotes(body?.notes)

    const { data: updated, error } = await admin.client.rpc('admin_update_product_request', {
      p_request_id: params.id,
      p_admin_id: admin.profile.id,
      p_status: status,
      p_notes: notes,
    })

    if (error || !updated) {
      if (error) {
        console.error('Product request update rejected:', error)
        return NextResponse.json({ error: safeDatabaseError(error, 'Unable to update the request') }, { status: 400 })
      }
      return NextResponse.json({ error: 'Unable to update the request' }, { status: 500 })
    }

    return NextResponse.json({ request: updated })
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
    console.error('Product request update failed:', error)
    return NextResponse.json({ error: 'Unable to update the request' }, { status: 500 })
  }
}