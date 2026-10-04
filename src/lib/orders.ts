import { apiFetch } from './api'
import type { OrderStatus } from './validation'

export type { OrderStatus }

export interface OrderItem {
  product_id: string
  product_name: string
  price: number
  quantity: number
  image_url?: string | null
}

export interface Order {
  id: string
  customer_id: string | null
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_address: string
  items: OrderItem[]
  total_amount: number
  status: OrderStatus
  payment_method: 'cod' | 'jazz_cash' | 'easypaisa'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  delivery_method?: 'self' | 'courier'
  delivery_date?: string | null
  delivery_time_slot?: string | null
  assigned_to?: string | null
  admin_notes?: string | null
  created_at: string
  updated_at: string
}

export function calculateOrderTotal(items: Array<{ price: number; quantity: number }>): number {
  return items.reduce((total, item) => total + item.price * item.quantity, 0)
}

export function getOrderStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    pending_payment: 'bg-yellow-100 text-yellow-800',
    received: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    ready: 'bg-indigo-100 text-indigo-800',
    out_for_delivery: 'bg-green-100 text-green-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export async function getOrders(filters?: { status?: string; paymentStatus?: string; limit?: number }) {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.paymentStatus) params.set('paymentStatus', filters.paymentStatus)
  if (filters?.limit) params.set('limit', String(filters.limit))
  const query = params.toString() ? `?${params.toString()}` : ''
  const result = await apiFetch<{ orders: Order[] }>(`/api/admin/orders${query}`)
  return result.orders
}

export async function getOrderById(id: string) {
  const result = await apiFetch<{ order: Order }>(`/api/admin/orders/${id}`)
  return result.order
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, notes?: string) {
  const result = await apiFetch<{ order: Order }>(`/api/admin/orders/${orderId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, notes }),
  })
  return result.order
}

export async function assignDelivery(
  orderId: string,
  deliveryMethod: 'self' | 'courier',
  deliveryDate: string,
  deliveryTimeSlot: string,
  assignedTo?: string
) {
  const result = await apiFetch<{ order: Order }>(`/api/admin/orders/${orderId}/delivery`, {
    method: 'POST',
    body: JSON.stringify({
      delivery_method: deliveryMethod,
      delivery_date: deliveryDate,
      delivery_time_slot: deliveryTimeSlot,
      assigned_to: assignedTo,
    }),
  })
  return result.order
}

export async function getOrderStatusSummary(): Promise<Record<string, number>> {
  const orders = await getOrders({ limit: 200 })
  const summary: Record<string, number> = {
    pending_payment: 0,
    received: 0,
    processing: 0,
    ready: 0,
    out_for_delivery: 0,
    delivered: 0,
    cancelled: 0,
  }
  orders.forEach((order) => {
    summary[order.status] = (summary[order.status] ?? 0) + 1
  })
  return summary
}
