import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, safeDatabaseError, ServerAuthError } from '@/lib/supabase-server'
import { isValidUuid, parseAdminNotes, parsePaymentAction, ValidationError } from '@/lib/validation'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'
import { signedEvidenceUrl } from '@/lib/evidence-storage'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidUuid(params.id)) {
      throw new ValidationError('Invalid payment ID')
    }

    const admin = await requireAdmin(request)
    const { data: payment, error } = await admin.client
      .from('payments')
      .select('id,order_id,amount,method,status,transaction_id,refund_reference,failure_reason,payment_evidence_url,admin_notes,created_at,updated_at,orders:order_id(id,customer_name,customer_email,customer_phone,customer_address,total_amount,status,items)')
      .eq('id', params.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Unable to load payment' }, { status: 503 })
    }
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const evidenceUrl = payment.payment_evidence_url
      ? await signedEvidenceUrl(payment.payment_evidence_url)
      : null

    return NextResponse.json({ payment: { ...payment, evidence_url: evidenceUrl } })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof ServerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Admin payment lookup failed:', error)
    return NextResponse.json({ error: 'Unable to load payment' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    enforceRateLimit(`admin-payment:${requestAddress(request)}`, 60, 60 * 60 * 1000)
    if (!isValidUuid(params.id)) {
      throw new ValidationError('Invalid payment ID')
    }

    const admin = await requireAdmin(request)
    const body = await request.json()
    const action = parsePaymentAction(body?.action)
    const notes = parseAdminNotes(body?.notes)
    const transactionId = typeof body?.transaction_id === 'string'
      ? body.transaction_id.trim()
      : undefined

    const { data: payment, error: lookupError } = await admin.client
      .from('payments')
       .select('id,method,status,transaction_id')
      .eq('id', params.id)
      .single()

    if (lookupError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (action === 'fail' && !notes) {
      throw new ValidationError('A failure reason is required')
    }
    if (action === 'confirm' && payment.method !== 'cod' && !transactionId && !payment.transaction_id) {
      throw new ValidationError('A transaction reference is required')
    }
    if (action === 'refund' && !transactionId) {
      throw new ValidationError('A refund reference is required')
    }

    const { data: updatedPayment, error } = await admin.client.rpc('verify_payment', {
      p_payment_id: params.id,
      p_admin_id: admin.profile.id,
      p_action: action,
      p_notes: notes,
      p_transaction_id: transactionId ?? null,
    })

    if (error || !updatedPayment) {
      if (error) {
        console.error('Payment update rejected:', error)
        return NextResponse.json({ error: safeDatabaseError(error, 'Unable to update payment') }, { status: 400 })
      }
      return NextResponse.json({ error: 'Unable to update payment' }, { status: 500 })
    }

    return NextResponse.json({ payment: updatedPayment })
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
    console.error('Payment update failed:', error)
    return NextResponse.json({ error: 'Unable to update payment' }, { status: 500 })
  }
}
