import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ServerAuthError } from '@/lib/supabase-server'
import {
  parsePaymentStatusFilter,
  parsePositiveInteger,
  ValidationError,
} from '@/lib/validation'
import { signedEvidenceUrl } from '@/lib/evidence-storage'

export const dynamic = 'force-dynamic'

const STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    const limit = parsePositiveInteger(request.nextUrl.searchParams.get('limit'), 100, 200)
    const status = parsePaymentStatusFilter(request.nextUrl.searchParams.get('status'))

    let query = admin.client
      .from('payments')
      .select('id,order_id,amount,method,status,transaction_id,refund_reference,failure_reason,payment_evidence_url,admin_notes,created_at,updated_at,orders:order_id(id,customer_name,customer_email,customer_phone,customer_address,total_amount,status,items)')

    if (status === 'action') {
      query = query.in('status', ['pending', 'failed'])
    } else if (status) {
      query = query.eq('status', status)
    }

    const paymentsResult = await query.order('created_at', { ascending: false }).limit(limit)
    if (paymentsResult.error) {
      console.error('Admin payment list failed:', paymentsResult.error)
      return NextResponse.json({ error: 'Unable to load payments' }, { status: 503 })
    }

    const summaryResults = await Promise.all(
      STATUSES.map((item) =>
        admin.client
          .from('payments')
          .select('id', { count: 'exact', head: true })
          .eq('status', item)
      )
    )

    const summary: Record<string, number> = {}
    STATUSES.forEach((item, index) => {
      summary[item] = summaryResults[index]?.count ?? 0
    })

    const evidenceUrls = await Promise.all(
      (paymentsResult.data ?? []).map(async (payment) => {
        const url = payment.payment_evidence_url
          ? await signedEvidenceUrl(payment.payment_evidence_url)
          : null
        return { ...payment, evidence_url: url }
      })
    )

    return NextResponse.json({ payments: evidenceUrls, summary })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof ServerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Admin payment list failed:', error)
    return NextResponse.json({ error: 'Unable to load payments' }, { status: 500 })
  }
}
