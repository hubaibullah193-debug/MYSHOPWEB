import { calculateOrderTotal, getOrderStatusBadgeColor } from '@/lib/orders'

describe('Orders Utilities', () => {
  describe('calculateOrderTotal', () => {
    it('should calculate total for single item order', () => {
      const items = [
        {
          product_id: '1',
          product_name: 'Product 1',
          quantity: 2,
          price: 100,
        },
      ]
      expect(calculateOrderTotal(items)).toBe(200)
    })

    it('should calculate total for multiple items order', () => {
      const items = [
        {
          product_id: '1',
          product_name: 'Product 1',
          quantity: 2,
          price: 100,
        },
        {
          product_id: '2',
          product_name: 'Product 2',
          quantity: 3,
          price: 50,
        },
      ]
      expect(calculateOrderTotal(items)).toBe(350)
    })

    it('should return 0 for empty items', () => {
      expect(calculateOrderTotal([])).toBe(0)
    })
  })

  describe('getOrderStatusBadgeColor', () => {
    it('should return correct color for pending_payment status', () => {
      expect(getOrderStatusBadgeColor('pending_payment')).toBe('bg-yellow-100 text-yellow-800')
    })

    it('should return correct color for received status', () => {
      expect(getOrderStatusBadgeColor('received')).toBe('bg-blue-100 text-blue-800')
    })

    it('should return correct color for processing status', () => {
      expect(getOrderStatusBadgeColor('processing')).toBe('bg-purple-100 text-purple-800')
    })

    it('should return correct color for out for delivery status', () => {
      expect(getOrderStatusBadgeColor('out_for_delivery')).toBe('bg-green-100 text-green-800')
    })

    it('should return correct color for delivered status', () => {
      expect(getOrderStatusBadgeColor('delivered')).toBe('bg-green-100 text-green-800')
    })

    it('should return default color for unknown status', () => {
      expect(getOrderStatusBadgeColor('unknown')).toBe('bg-gray-100 text-gray-800')
    })
  })
})
