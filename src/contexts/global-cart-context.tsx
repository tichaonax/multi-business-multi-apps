'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useBusinessPermissionsContext } from './business-permissions-context'

export interface CartItem {
  id: string
  productId: string
  variantId: string
  name: string
  sku: string
  price: number
  quantity: number
  imageUrl?: string | null
  attributes?: Record<string, any>
  discount?: number
  notes?: string
  isReturn?: boolean
  returnReason?: string
}

interface CartContextType {
  cart: CartItem[]
  addToCart: (item: Omit<CartItem, 'id' | 'quantity'> & { quantity?: number }) => void
  removeFromCart: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  updateDiscount: (itemId: string, discount: number) => void
  clearCart: () => void
  getCartTotal: () => number
  getCartSubtotal: () => number
  getCartItemCount: () => number
  isCartEmpty: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const { currentBusiness, currentBusinessId } = useBusinessPermissionsContext()
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartLoaded, setCartLoaded] = useState(false)

  // Load cart from localStorage when business changes
  useEffect(() => {
    if (!currentBusinessId) {
      setCart([])
      setCartLoaded(false)
      return
    }

    try {
      const savedCart = localStorage.getItem(`global-cart-${currentBusinessId}`)
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart)
        setCart(parsedCart)
        console.log('✅ [GlobalCart] Restored cart:', parsedCart.length, 'items for business', currentBusinessId)
      } else {
        setCart([])
        console.log('🔄 [GlobalCart] No saved cart for business', currentBusinessId)
      }
    } catch (error) {
      console.error('❌ [GlobalCart] Failed to load cart:', error)
      setCart([])
    } finally {
      setCartLoaded(true)
    }
  }, [currentBusinessId])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!currentBusinessId || !cartLoaded) return

    try {
      localStorage.setItem(`global-cart-${currentBusinessId}`, JSON.stringify(cart))
      console.log('💾 [GlobalCart] Saved cart:', cart.length, 'items')

      // Broadcast cart update to customer display
      broadcastCartUpdate()
    } catch (error) {
      console.error('❌ [GlobalCart] Failed to save cart:', error)
    }
  }, [cart, currentBusinessId, cartLoaded])

  // Broadcast cart updates to customer display
  const broadcastCartUpdate = useCallback(() => {
    if (typeof window === 'undefined' || !currentBusinessId) return

    try {
      const channel = new BroadcastChannel('customer-display-sync')
      channel.postMessage({
        type: 'CART_UPDATE',
        businessId: currentBusinessId,
        cart: cart,
        timestamp: Date.now()
      })
      channel.close()
      console.log('📡 [GlobalCart] Broadcasted cart to customer display')
    } catch (error) {
      console.error('❌ [GlobalCart] Failed to broadcast cart:', error)
    }
  }, [cart, currentBusinessId])

  // Add item to cart
  const addToCart = useCallback((item: Omit<CartItem, 'id' | 'quantity'> & { quantity?: number }) => {
    setCart(currentCart => {
      // Check if item already exists in cart
      const existingItemIndex = currentCart.findIndex(
        cartItem => cartItem.variantId === item.variantId
      )

      if (existingItemIndex > -1) {
        // Update quantity of existing item
        const updatedCart = [...currentCart]
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + (item.quantity || 1)
        }
        console.log('✅ [GlobalCart] Updated existing item quantity')
        return updatedCart
      } else {
        // Add new item to cart
        const newItem: CartItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          quantity: item.quantity || 1,
          ...item
        }
        console.log('✅ [GlobalCart] Added new item to cart')
        return [...currentCart, newItem]
      }
    })
  }, [])

  // Remove item from cart
  const removeFromCart = useCallback((itemId: string) => {
    setCart(currentCart => {
      const updatedCart = currentCart.filter(item => item.id !== itemId)
      console.log('🗑️ [GlobalCart] Removed item from cart')
      return updatedCart
    })
  }, [])

  // Update item quantity
  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }

    setCart(currentCart => {
      const updatedCart = currentCart.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
      console.log('✅ [GlobalCart] Updated item quantity')
      return updatedCart
    })
  }, [removeFromCart])

  // Update item discount
  const updateDiscount = useCallback((itemId: string, discount: number) => {
    setCart(currentCart => {
      const updatedCart = currentCart.map(item =>
        item.id === itemId ? { ...item, discount } : item
      )
      console.log('✅ [GlobalCart] Updated item discount')
      return updatedCart
    })
  }, [])

  // Clear entire cart
  const clearCart = useCallback(() => {
    setCart([])
    console.log('🗑️ [GlobalCart] Cleared entire cart')
  }, [])

  // Calculate cart subtotal (before tax)
  const getCartSubtotal = useCallback(() => {
    return cart.reduce((sum, item) => {
      const itemPrice = item.price - (item.discount || 0)
      return sum + (itemPrice * item.quantity)
    }, 0)
  }, [cart])

  // Calculate cart total (after discounts, before tax)
  const getCartTotal = useCallback(() => {
    return getCartSubtotal()
  }, [getCartSubtotal])

  // Get total number of items in cart
  const getCartItemCount = useCallback(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }, [cart])

  const isCartEmpty = cart.length === 0

  const value: CartContextType = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateDiscount,
    clearCart,
    getCartTotal,
    getCartSubtotal,
    getCartItemCount,
    isCartEmpty
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useGlobalCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useGlobalCart must be used within a CartProvider')
  }
  return context
}
