'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import {
  getCartFromStorage,
  saveCartToStorage,
  addToCart as addToCartUtil,
  updateCartItemQuantity as updateQuantityUtil,
  removeFromCart as removeFromCartUtil,
  clearCart as clearCartUtil,
  type Cart,
  type CartItem,
} from '@/lib/cart'

interface CartContextType {
  cart: Cart
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void
  updateQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clearCart: () => void
  itemCount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>({ items: [], total: 0 })
  const [isInitialized, setIsInitialized] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = getCartFromStorage()
    setCart(savedCart)
    setIsInitialized(true)
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      saveCartToStorage(cart)
    }
  }, [cart, isInitialized])

  const handleAddToCart = (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    setCart((prevCart) => addToCartUtil({ ...prevCart }, item, quantity))
  }

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    setCart((prevCart) => updateQuantityUtil({ ...prevCart }, productId, quantity))
  }

  const handleRemoveItem = (productId: string) => {
    setCart((prevCart) => removeFromCartUtil({ ...prevCart }, productId))
  }

  const handleClearCart = () => {
    setCart(clearCartUtil())
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart: handleAddToCart,
        updateQuantity: handleUpdateQuantity,
        removeItem: handleRemoveItem,
        clearCart: handleClearCart,
        itemCount: cart.items.length,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
