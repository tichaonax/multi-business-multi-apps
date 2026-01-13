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
  stock?: number // Available stock quantity
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
  replaceCart: (items: Omit<CartItem, 'id'>[]) => void
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
      } else {
        setCart([])
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
      // NOTE: We do NOT broadcast to customer display from global cart
      // Only POS broadcasts to customer display (with correct tax/totals)
      // Global cart is just for browsing/shopping, not checkout
    } catch (error) {
      console.error('❌ [GlobalCart] Failed to save cart:', error)
    }
  }, [cart, currentBusinessId, cartLoaded])

  // Push cart updates to customer display
  const broadcastCartUpdate = useCallback(async () => {
    if (typeof window === 'undefined' || !currentBusinessId) return

    try {
      // Calculate totals
      const subtotal = cart.reduce((sum, item) => {
        const itemPrice = item.price - (item.discount || 0)
        return sum + (itemPrice * item.quantity)
      }, 0)

      // Map cart items to customer display format
      const displayItems = cart.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        variant: item.attributes?.size || item.attributes?.color ?
          `${item.attributes.size || ''} ${item.attributes.color || ''}`.trim() : undefined,
        imageUrl: item.imageUrl || undefined
      }))

      // BroadcastChannel for same-origin displays
      try {
        const channel = new BroadcastChannel('customer-display-sync')

        // CRITICAL: Signal which business is active FIRST
        const setActiveMessage = {
          type: 'SET_ACTIVE_BUSINESS',
          businessId: currentBusinessId,
          payload: {
            subtotal: 0,
            tax: 0,
            total: 0
          },
          timestamp: Date.now()
        }
        channel.postMessage(setActiveMessage)

        // Then send the cart state
        const cartMessage = {
          type: 'CART_STATE',
          businessId: currentBusinessId,
          payload: {
            items: displayItems,
            subtotal: subtotal,
            tax: 0,
            total: subtotal
          },
          timestamp: Date.now()
        }
        channel.postMessage(cartMessage)
        channel.close()
        console.log('📡 [GlobalCart] Broadcasted SET_ACTIVE_BUSINESS and CART_STATE to customer display:', {
          businessId: currentBusinessId,
          itemCount: displayItems.length,
          subtotal: subtotal
        })
      } catch (bcError) {
        console.error('❌ [GlobalCart] BroadcastChannel failed:', bcError)
      }

      // API fallback for cross-origin displays
      try {
        await fetch('/api/customer-display/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: currentBusinessId,
            cart: cart
          })
        })
      } catch (apiError) {
        // Silent fail - API is just a fallback
      }
    } catch (error) {
      console.error('❌ [GlobalCart] Failed to broadcast cart:', error)
    }
  }, [cart, currentBusinessId])

  // Add item to cart
  const addToCart = useCallback((item: Omit<CartItem, 'id' | 'quantity'> & { quantity?: number }) => {
    // Validation guards
    if (item.price <= 0) {
      console.error('❌ [GlobalCart] Cannot add item with price <= 0')
      return
    }

    const quantityToAdd = item.quantity || 1
    if (quantityToAdd <= 0) {
      console.error('❌ [GlobalCart] Cannot add item with quantity <= 0')
      return
    }

    setCart(currentCart => {
      // Check if item already exists in cart
      const existingItemIndex = currentCart.findIndex(
        cartItem => cartItem.variantId === item.variantId
      )

      if (existingItemIndex > -1) {
        // Update quantity of existing item
        const existingItem = currentCart[existingItemIndex]
        const newQuantity = existingItem.quantity + quantityToAdd

        // Check stock limit if available
        if (item.stock !== undefined && newQuantity > item.stock) {
          console.warn(`⚠️ [GlobalCart] Cannot add more than ${item.stock} items (stock limit)`)
          return currentCart // Don't add, return unchanged cart
        }

        const updatedCart = [...currentCart]
        updatedCart[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity
        }
        return updatedCart
      } else {
        // Check stock limit for new item
        if (item.stock !== undefined && quantityToAdd > item.stock) {
          console.warn(`⚠️ [GlobalCart] Cannot add ${quantityToAdd} items, only ${item.stock} in stock`)
          return currentCart // Don't add, return unchanged cart
        }

        // Add new item to cart
        const newItem: CartItem = {
          ...item,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          quantity: quantityToAdd
        }
        console.log('➕ [GlobalCart addToCart] Adding item:', {
          name: newItem.name,
          sku: newItem.sku,
          variantId: newItem.variantId,
          id: newItem.id
        })
        return [...currentCart, newItem]
      }
    })
  }, [])

  // Remove item from cart
  const removeFromCart = useCallback((itemId: string) => {
    setCart(currentCart => currentCart.filter(item => item.id !== itemId))
  }, [])

  // Update item quantity
  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }

    setCart(currentCart => {
      const updatedCart = currentCart.map(item => {
        if (item.id === itemId) {
          // Check stock limit if available
          if (item.stock !== undefined && quantity > item.stock) {
            console.warn(`⚠️ [GlobalCart] Cannot set quantity to ${quantity}, only ${item.stock} in stock`)
            return item // Don't update, return unchanged item
          }
          return { ...item, quantity }
        }
        return item
      })
      return updatedCart
    })
  }, [removeFromCart])

  // Update item discount
  const updateDiscount = useCallback((itemId: string, discount: number) => {
    setCart(currentCart =>
      currentCart.map(item =>
        item.id === itemId ? { ...item, discount } : item
      )
    )
  }, [])

  // Clear entire cart
  const clearCart = useCallback(() => {
    setCart([])
  }, [])

  // Replace entire cart with new items (used for syncing from POS)
  const replaceCart = useCallback((items: Omit<CartItem, 'id'>[]) => {
    const newCart: CartItem[] = items.map(item => {
      const cartItem = {
        ...item,
        id: (item as any).id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
      console.log('💾 [GlobalCart replaceCart] Creating item:', {
        name: cartItem.name,
        sku: cartItem.sku,
        id: cartItem.id,
        inputHadId: !!(item as any).id
      })
      return cartItem
    })
    setCart(newCart)
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
    replaceCart,
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
