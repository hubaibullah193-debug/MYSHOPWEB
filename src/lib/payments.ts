import { supabase } from './supabase'

export interface Payment {
  id: string
  order_id: string
  amount: number
  method: 'cod' | 'jazz_cash' | 'easypaisa'
  status: 'pending' | 'confirmed' | 'failed'
  transaction_id?: string
  verified_by_admin_id?: string
  verified_at?: string
  admin_notes?: string
  created_at: string
  updated_at: string
}

/**
 * Get all pending payments
 */
export async function getPendingPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Get payment with order details
 */
export async function getPaymentWithOrder(paymentId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select(
      `
      *,
      orders:order_id(
        id,
        customer_email,
        customer_phone,
        customer_address,
        total_amount,
        status,
        items
      )
    `
    )
    .eq('id', paymentId)
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Confirm payment (manual admin verification)
 */
export async function confirmPayment(
  paymentId: string,
  adminId: string,
  adminNotes?: string
) {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'confirmed',
      verified_by_admin_id: adminId,
      verified_at: now,
      admin_notes: adminNotes,
      updated_at: now,
    })
    .eq('id', paymentId)
    .select()
    .single()

  if (error) {
    throw error
  }

  // Also update order status to confirmed
  if (data.order_id) {
    await supabase
      .from('orders')
      .update({ status: 'confirmed', updated_at: now })
      .eq('id', data.order_id)
  }

  return data
}

/**
 * Fail payment (mark as failed)
 */
export async function failPayment(
  paymentId: string,
  adminId: string,
  reason: string
) {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'failed',
      verified_by_admin_id: adminId,
      verified_at: now,
      admin_notes: reason,
      updated_at: now,
    })
    .eq('id', paymentId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Get payments by status
 */
export async function getPaymentsByStatus(status: 'pending' | 'confirmed' | 'failed') {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Get payment summary (counts by status)
 */
export async function getPaymentSummary() {
  const statuses = ['pending', 'confirmed', 'failed']
  const summary: Record<string, number> = {}

  for (const status of statuses) {
    const { data, error } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('status', status)

    if (!error) {
      summary[status] = data?.length || 0
    }
  }

  return summary
}
