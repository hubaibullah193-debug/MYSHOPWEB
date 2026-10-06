import { apiFetch } from './api'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type PaymentStatusFilter = 'action' | PaymentStatus

export interface Payment {
  id: string
  order_id: string
  amount: number
  method: 'cod' | 'jazz_cash' | 'easypaisa'
  status: PaymentStatus
  transaction_id?: string | null
  refund_reference?: string | null
  failure_reason?: string | null
  payment_evidence_url?: string | null
  evidence_url?: string | null
  admin_notes?: string | null
  created_at: string
  updated_at: string
}

export interface PaymentWithOrder extends Payment {
  orders?: {
    id: string
    customer_name?: string
    customer_email: string
    customer_phone: string
    customer_address: string
    total_amount: number
    status: string
    items: Array<Record<string, unknown>>
  }
}

export interface PaymentListResponse {
  payments: PaymentWithOrder[]
  summary: Record<PaymentStatus, number>
}

export async function getPayments(status?: PaymentStatusFilter): Promise<PaymentListResponse> {
  const query = status ? `?status=${status}` : ''
  return apiFetch<PaymentListResponse>(`/api/admin/payments${query}`)
}

export async function getPaymentWithOrder(paymentId: string): Promise<PaymentWithOrder> {
  const result = await apiFetch<{ payment: PaymentWithOrder }>(`/api/admin/payments/${paymentId}`)
  return result.payment
}

export async function confirmPayment(paymentId: string, notes?: string, transactionId?: string) {
  const result = await apiFetch<{ payment: Payment }>(`/api/admin/payments/${paymentId}`, {
    method: 'POST',
    body: JSON.stringify({ action: 'confirm', notes, transaction_id: transactionId }),
  })
  return result.payment
}

export async function failPayment(paymentId: string, reason: string) {
  const result = await apiFetch<{ payment: Payment }>(`/api/admin/payments/${paymentId}`, {
    method: 'POST',
    body: JSON.stringify({ action: 'fail', notes: reason }),
  })
  return result.payment
}

export async function refundPayment(paymentId: string, refundReference: string, notes?: string) {
  const result = await apiFetch<{ payment: Payment }>(`/api/admin/payments/${paymentId}`, {
    method: 'POST',
    body: JSON.stringify({ action: 'refund', transaction_id: refundReference, notes }),
  })
  return result.payment
}
