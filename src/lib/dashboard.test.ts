import { buildDashboardNotifications, type DashboardSummary } from '@/lib/dashboard'

function summary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    total_orders: 0,
    total_sales: 0,
    status_orders: {},
    low_stock_items: 0,
    out_of_stock_items: 0,
    pending_bulk_requests: 0,
    pending_product_requests: 0,
    new_orders_24h: 0,
    new_reviews_24h: 0,
    new_payments_24h: 0,
    new_cancellations_24h: 0,
    ...overrides,
  }
}

describe('buildDashboardNotifications', () => {
  it('returns no notifications for an empty summary', () => {
    expect(buildDashboardNotifications(summary())).toEqual([])
  })

  it('flags out-of-stock items as a danger notification', () => {
    const notifications = buildDashboardNotifications(summary({ out_of_stock_items: 2 }))
    expect(notifications).toContainEqual({
      id: 'out-of-stock',
      tone: 'danger',
      message: '2 items are out of stock',
      href: '/admin/inventory',
    })
  })

  it('uses the singular form for a single out-of-stock item', () => {
    const notifications = buildDashboardNotifications(summary({ out_of_stock_items: 1 }))
    expect(notifications[0].message).toBe('1 item is out of stock')
  })

  it('flags low stock as a warning notification', () => {
    const notifications = buildDashboardNotifications(summary({ low_stock_items: 3 }))
    expect(notifications).toContainEqual({
      id: 'low-stock',
      tone: 'warning',
      message: '3 items are low on stock',
      href: '/admin/inventory',
    })
  })

  it('warns about orders awaiting payment confirmation', () => {
    const notifications = buildDashboardNotifications(
      summary({ status_orders: { pending_payment: 4 } })
    )
    expect(notifications).toContainEqual({
      id: 'pending-payments',
      tone: 'warning',
      message: '4 orders awaiting payment confirmation',
      href: '/admin/payments',
    })
  })

  it('warns about pending product and bulk requests', () => {
    const notifications = buildDashboardNotifications(
      summary({ pending_product_requests: 1, pending_bulk_requests: 2 })
    )
    expect(notifications).toContainEqual({
      id: 'product-requests',
      tone: 'warning',
      message: '1 pending product request',
      href: '/admin/product-requests',
    })
    expect(notifications).toContainEqual({
      id: 'bulk-requests',
      tone: 'warning',
      message: '2 pending bulk requests',
      href: '/admin/bulk-orders',
    })
  })

  it('reports last-24h activity as informational notifications', () => {
    const notifications = buildDashboardNotifications(
      summary({
        new_orders_24h: 5,
        new_payments_24h: 3,
        new_reviews_24h: 2,
        new_cancellations_24h: 1,
      })
    )
    expect(notifications).toContainEqual({
      id: 'new-orders',
      tone: 'info',
      message: '5 new orders in the last 24 hours',
      href: '/admin/orders',
    })
    expect(notifications).toContainEqual({
      id: 'payments-received',
      tone: 'info',
      message: '3 payments received in the last 24 hours',
      href: '/admin/payments',
    })
    expect(notifications).toContainEqual({
      id: 'new-reviews',
      tone: 'info',
      message: '2 new reviews in the last 24 hours',
      href: '/admin/reviews',
    })
    expect(notifications).toContainEqual({
      id: 'cancellations',
      tone: 'info',
      message: '1 order cancelled in the last 24 hours',
      href: '/admin/orders',
    })
  })

  it('orders notifications from most to least severe', () => {
    const notifications = buildDashboardNotifications(
      summary({
        out_of_stock_items: 1,
        low_stock_items: 1,
        new_orders_24h: 1,
      })
    )
    expect(notifications.map((n) => n.tone)).toEqual(['danger', 'warning', 'info'])
  })

  it('ignores a zero-value pending_payment status', () => {
    const notifications = buildDashboardNotifications(
      summary({ status_orders: { pending_payment: 0 } })
    )
    expect(notifications).not.toContainEqual(expect.objectContaining({ id: 'pending-payments' }))
  })
})