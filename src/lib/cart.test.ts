import {
  calculateCartTotal,
  addToCart,
  removeFromCart,
  updateCartItemQuantity,
  clearCart,
  type Cart,
  type CartItem,
} from '@/lib/cart'

describe('Cart Utilities', () => {
  describe('calculateCartTotal', () => {
    it('should calculate total for empty cart', () => {
      expect(calculateCartTotal([])).toBe(0)
    })

    it('should calculate total with single item', () => {
      const items: CartItem[] = [
        {
          product_id: '1',
          product_name: 'Product 1',
          quantity: 2,
          price: 100,
        },
      ]
      expect(calculateCartTotal(items)).toBe(200)
    })

    it('should calculate total with multiple items', () => {
      const items: CartItem[] = [
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
      expect(calculateCartTotal(items)).toBe(350)
    })
  })

  describe('addToCart', () => {
    it('should add new item to empty cart', () => {
      const cart: Cart = { items: [], total: 0 }
      const newItem = {
        product_id: '1',
        product_name: 'Product 1',
        price: 100,
      }
      const result = addToCart(cart, newItem, 1)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].product_id).toBe('1')
      expect(result.items[0].quantity).toBe(1)
    })

    it('should increment quantity if item already in cart', () => {
      const cart: Cart = {
        items: [
          {
            product_id: '1',
            product_name: 'Product 1',
            quantity: 1,
            price: 100,
          },
        ],
        total: 100,
      }
      const newItem = {
        product_id: '1',
        product_name: 'Product 1',
        price: 100,
      }
      const result = addToCart(cart, newItem, 2)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].quantity).toBe(3)
      expect(result.total).toBe(300)
    })

    it('should add new item to existing cart', () => {
      const cart: Cart = {
        items: [
          {
            product_id: '1',
            product_name: 'Product 1',
            quantity: 1,
            price: 100,
          },
        ],
        total: 100,
      }
      const newItem = {
        product_id: '2',
        product_name: 'Product 2',
        price: 50,
      }
      const result = addToCart(cart, newItem, 1)
      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(150)
    })
  })

  describe('removeFromCart', () => {
    it('should remove item from cart', () => {
      const cart: Cart = {
        items: [
          {
            product_id: '1',
            product_name: 'Product 1',
            quantity: 1,
            price: 100,
          },
          {
            product_id: '2',
            product_name: 'Product 2',
            quantity: 1,
            price: 50,
          },
        ],
        total: 150,
      }
      const result = removeFromCart(cart, '1')
      expect(result.items).toHaveLength(1)
      expect(result.items[0].product_id).toBe('2')
      expect(result.total).toBe(50)
    })

    it('should return unchanged cart if item not found', () => {
      const cart: Cart = {
        items: [
          {
            product_id: '1',
            product_name: 'Product 1',
            quantity: 1,
            price: 100,
          },
        ],
        total: 100,
      }
      const result = removeFromCart(cart, '999')
      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(100)
    })
  })

  describe('updateCartItemQuantity', () => {
    it('should update item quantity', () => {
      const cart: Cart = {
        items: [
          {
            product_id: '1',
            product_name: 'Product 1',
            quantity: 1,
            price: 100,
          },
        ],
        total: 100,
      }
      const result = updateCartItemQuantity(cart, '1', 5)
      expect(result.items[0].quantity).toBe(5)
      expect(result.total).toBe(500)
    })

    it('should remove item if quantity is 0', () => {
      const cart: Cart = {
        items: [
          {
            product_id: '1',
            product_name: 'Product 1',
            quantity: 1,
            price: 100,
          },
        ],
        total: 100,
      }
      const result = updateCartItemQuantity(cart, '1', 0)
      expect(result.items).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should return unchanged cart if item not found', () => {
      const cart: Cart = {
        items: [
          {
            product_id: '1',
            product_name: 'Product 1',
            quantity: 1,
            price: 100,
          },
        ],
        total: 100,
      }
      const result = updateCartItemQuantity(cart, '999', 5)
      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(100)
    })
  })

  describe('clearCart', () => {
    it('should return empty cart', () => {
      const result = clearCart()
      expect(result.items).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })
})
