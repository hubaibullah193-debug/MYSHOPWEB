import { supabase } from './supabase'

export interface Order {
  id: string
  customer_id: string | null
  customer_email: string
  customer_phone: string
  customer_address: string
  items: any[]
  total_amount: number
  status: 'pending_payment' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  payment_method: string
  payment_status: string
  delivery_method?: 'self' | 'courier'
  delivery_date?: string
  delivery_time_slot?: string
  assigned_to?: string
  created_at: string
  updated_at: string
}

/**
 * Get all orders with optional filtering
 */
export async function getOrders(filters?: {
  status?: string
  paymentStatus?: string
  limit?: number
}) {
  let query = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.paymentStatus) {
    query = query.eq('payment_status', filters.paymentStatus)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Get single order by ID
 */
export async function getOrderById(id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  status: Order['status']
) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Assign delivery details to order
 */
export async function assignDelivery(
  orderId: string,
  deliveryMethod: 'self' | 'courier',
  deliveryDate: string,
  deliveryTimeSlot: string,
  assignedTo?: string
) {
  const { data, error } = await supabase
    .from('orders')
    .update({
      delivery_method: deliveryMethod,
      delivery_date: deliveryDate,
      delivery_time_slot: deliveryTimeSlot,
      assigned_to: assignedTo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Get order status count summary
 */
export async function getOrderStatusSummary() {
  const statuses = ['pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

  const summary: Record<string, number> = {}

  for (const status of statuses) {
    const { data, error } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', status)

    if (!error) {
      summary[status] = data?.length || 0
    }
  }

  return summary
}
