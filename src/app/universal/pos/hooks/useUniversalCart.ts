'use client'

import { useState, useCallback, useMemo } from 'react'

/**
 * Universal Cart Item Interface
 * Supports all business types with optional business-specific fields
 */
export interface UniversalCartItem {
  id: string
  name: string
  sku?: string
  quantity: number
  unitPrice: number
  totalPrice: number

  // Business-specific fields (optional)
  weight?: number          // grocery
  spiceLevel?: number      // restaurant
  size?: string            // clothing
  color?: string           // clothing
  projectRef?: string      // construction
  vin?: string             // vehicles
  hours?: number           // consulting/services
  isCombo?: boolean        // restaurant
  comboItems?: any[]       // restaurant

  // Product metadata
  productId?: string
  variantId?: string
  categoryId?: string
  imageUrl?: string

  // Service item
  isService?: boolean

  // BOGO
  isBOGOFree?: boolean
  condition?: string
  baleId?: string
  bogoActive?: boolean
  bogoRatio?: number

  // WiFi Token specific
  isWiFiToken?: boolean
  tokenConfigId?: string
  packageName?: string
  duration?: number
  bandwidthDownMb?: number
  bandwidthUpMb?: number
}

export interface CartTotals {
  subtotal: number
  tax: number
  discount: number
  total: number
  itemCount: number
}

const TAX_RATE = 0 // 0% default tax rate - businesses configure their own tax rate

/**
 * Universal Cart Hook
 * Manages shopping cart state for all business types
 */
export function useUniversalCart() {
  const [cart, setCart] = useState<UniversalCartItem[]>([])
  const [discount, setDiscount] = useState<number>(0)

  /**
   * Add item to cart or update quantity if it exists
   */
  const addToCart = useCallback((item: Omit<UniversalCartItem, 'totalPrice'>) => {
    setCart((prevCart) => {
      // Check if item already exists in cart
      const existingIndex = prevCart.findIndex((cartItem) => {
        // For WiFi tokens, match by tokenConfigId
        if (item.isWiFiToken && cartItem.isWiFiToken) {
          return cartItem.tokenConfigId === item.tokenConfigId
        }

        // For regular products, match by variantId or productId
        if (item.variantId) {
          return cartItem.variantId === item.variantId
        }

        return cartItem.productId === item.productId || cartItem.id === item.id
      })

      if (existingIndex >= 0) {
        // Update quantity of existing item
        const updatedCart = [...prevCart]
        const existingItem = updatedCart[existingIndex]
        const newQuantity = existingItem.quantity + item.quantity
        const newTotalPrice = newQuantity * existingItem.unitPrice

        updatedCart[existingIndex] = {
          ...existingItem,
          quantity: newQuantity,
          totalPrice: newTotalPrice
        }

        return updatedCart
      } else {
        // Add new item to cart
        const totalPrice = item.quantity * item.unitPrice
        return [...prevCart, { ...item, totalPrice }]
      }
    })
  }, [])

  /**
   * Update quantity of item in cart
   */
  const updateQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or negative
      setCart((prevCart) => prevCart.filter((item) => item.id !== itemId))
    } else {
      setCart((prevCart) =>
        prevCart.map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: newQuantity,
                totalPrice: newQuantity * item.unitPrice
              }
            : item
        )
      )
    }
  }, [])

  /**
   * Remove item from cart
   */
  const removeFromCart = useCallback((itemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId))
  }, [])

  /**
   * Clear entire cart
   */
  const clearCart = useCallback(() => {
    setCart([])
    setDiscount(0)
  }, [])

  /**
   * Update business-specific field for an item
   */
  const updateItemField = useCallback((
    itemId: string,
    field: keyof UniversalCartItem,
    value: any
  ) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === itemId
          ? { ...item, [field]: value }
          : item
      )
    )
  }, [])

  /**
   * Calculate cart totals
   */
  const totals: CartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0)
    const tax = subtotal * TAX_RATE
    // Cap discount so it never exceeds the order value (prevents negative totals)
    const effectiveDiscount = Math.min(discount, subtotal + tax)
    const total = subtotal + tax - effectiveDiscount
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

    return {
      subtotal,
      tax,
      discount: effectiveDiscount,
      total,
      itemCount
    }
  }, [cart, discount])

  return {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    updateItemField,
    setDiscount,
    totals
  }
}
