import { apiFetch } from './api'
import type { OrderStatus } from './validation'

export interface DashboardSummary {
  total_orders: number
  total_sales: number
  status_orders: Partial<Record<OrderStatus, number>>
  low_stock_items: number
  out_of_stock_items: number
  pending_bulk_requests: number
  pending_product_requests: number
  new_orders_24h: number
  new_reviews_24h: number
  new_payments_24h: number
  new_cancellations_24h: number
}

export interface RecentOrder {
  id: string
  customer_name: string
  customer_phone: string
  total_amount: number
  status: OrderStatus
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  created_at: string
}

export interface RecentReview {
  id: string
  product_id: string | null
  product_name: string | null
  customer_name: string
  rating: number
  is_removed: boolean
  created_at: string
}

export interface DashboardData {
  summary: DashboardSummary
  recent_orders: RecentOrder[]
  recent_reviews: RecentReview[]
}

export async function getAdminDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>('/api/admin/dashboard')
}

export function summaryStatus(summary: DashboardSummary, status: OrderStatus): number {
  return summary.status_orders[status] ?? 0
}

export interface DashboardNotification {
  id: string
  tone: 'danger' | 'warning' | 'info'
  message: string
  href: string
}

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm
}

/**
 * Synthesises the §20.1 dashboard notifications panel from the summary counts.
 * Pure and deterministic: danger first, then warnings, then informational.
 */
export function buildDashboardNotifications(summary: DashboardSummary): DashboardNotification[] {
  const notifications: DashboardNotification[] = []

  if (summary.out_of_stock_items > 0) {
    notifications.push({
      id: 'out-of-stock',
      tone: 'danger',
      message: `${summary.out_of_stock_items} ${plural(summary.out_of_stock_items, 'item is', 'items are')} out of stock`,
      href: '/admin/inventory',
    })
  }

  if (summary.low_stock_items > 0) {
    notifications.push({
      id: 'low-stock',
      tone: 'warning',
      message: `${summary.low_stock_items} ${plural(summary.low_stock_items, 'item is', 'items are')} low on stock`,
      href: '/admin/inventory',
    })
  }

  const pendingPayments = summaryStatus(summary, 'pending_payment')
  if (pendingPayments > 0) {
    notifications.push({
      id: 'pending-payments',
      tone: 'warning',
      message: `${pendingPayments} order${pendingPayments === 1 ? '' : 's'} awaiting payment confirmation`,
      href: '/admin/payments',
    })
  }

  if (summary.pending_product_requests > 0) {
    notifications.push({
      id: 'product-requests',
      tone: 'warning',
      message: `${summary.pending_product_requests} pending product request${summary.pending_product_requests === 1 ? '' : 's'}`,
      href: '/admin/product-requests',
    })
  }

  if (summary.pending_bulk_requests > 0) {
    notifications.push({
      id: 'bulk-requests',
      tone: 'warning',
      message: `${summary.pending_bulk_requests} pending bulk request${summary.pending_bulk_requests === 1 ? '' : 's'}`,
      href: '/admin/bulk-orders',
    })
  }

  if (summary.new_orders_24h > 0) {
    notifications.push({
      id: 'new-orders',
      tone: 'info',
      message: `${summary.new_orders_24h} new order${summary.new_orders_24h === 1 ? '' : 's'} in the last 24 hours`,
      href: '/admin/orders',
    })
  }

  if (summary.new_payments_24h > 0) {
    notifications.push({
      id: 'payments-received',
      tone: 'info',
      message: `${summary.new_payments_24h} payment${summary.new_payments_24h === 1 ? '' : 's'} received in the last 24 hours`,
      href: '/admin/payments',
    })
  }

  if (summary.new_reviews_24h > 0) {
    notifications.push({
      id: 'new-reviews',
      tone: 'info',
      message: `${summary.new_reviews_24h} new review${summary.new_reviews_24h === 1 ? '' : 's'} in the last 24 hours`,
      href: '/admin/reviews',
    })
  }

  if (summary.new_cancellations_24h > 0) {
    notifications.push({
      id: 'cancellations',
      tone: 'info',
      message: `${summary.new_cancellations_24h} order${summary.new_cancellations_24h === 1 ? '' : 's'} cancelled in the last 24 hours`,
      href: '/admin/orders',
    })
  }

  return notifications
}