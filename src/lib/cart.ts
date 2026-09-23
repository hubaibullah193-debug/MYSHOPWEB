export interface CartItem {
  product_id: string
  product_name: string
  price: number
  quantity: number
  image_url?: string
}

export interface Cart {
  items: CartItem[]
  total: number
}

const CART_STORAGE_KEY = 'hubaib_cart'

/**
 * Get cart from localStorage
 */
export function getCartFromStorage(): Cart {
  if (typeof window === 'undefined') {
    return { items: [], total: 0 }
  }

  try {
    const cart = localStorage.getItem(CART_STORAGE_KEY)
    return cart ? JSON.parse(cart) : { items: [], total: 0 }
  } catch {
    return { items: [], total: 0 }
  }
}

/**
 * Save cart to localStorage
 */
export function saveCartToStorage(cart: Cart): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
  } catch (error) {
    console.error('Failed to save cart:', error)
  }
}

/**
 * Calculate cart total
 */
export function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

/**
 * Add item to cart
 */
export function addToCart(
  cart: Cart,
  item: Omit<CartItem, 'quantity'>,
  quantity: number = 1
): Cart {
  const existingItem = cart.items.find((i) => i.product_id === item.product_id)

  if (existingItem) {
    existingItem.quantity += quantity
  } else {
    cart.items.push({ ...item, quantity })
  }

  cart.total = calculateCartTotal(cart.items)
  return cart
}

/**
 * Update item quantity
 */
export function updateCartItemQuantity(
  cart: Cart,
  productId: string,
  quantity: number
): Cart {
  const item = cart.items.find((i) => i.product_id === productId)

  if (!item) return cart

  if (quantity <= 0) {
    // Remove item if quantity is 0
    cart.items = cart.items.filter((i) => i.product_id !== productId)
  } else {
    item.quantity = quantity
  }

  cart.total = calculateCartTotal(cart.items)
  return cart
}

/**
 * Remove item from cart
 */
export function removeFromCart(cart: Cart, productId: string): Cart {
  cart.items = cart.items.filter((i) => i.product_id !== productId)
  cart.total = calculateCartTotal(cart.items)
  return cart
}

/**
 * Clear cart
 */
export function clearCart(): Cart {
  return { items: [], total: 0 }
}
