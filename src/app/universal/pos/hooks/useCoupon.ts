'use client'

import { useState, useCallback, useEffect } from 'react'

export interface AppliedCoupon {
  id: string
  code: string
  description: string | null
  discountAmount: number
  requiresApproval: boolean
  customerPhone?: string
}

const COUPON_STORAGE_KEY = (bizId: string) => `applied-coupon-${bizId}`

/**
 * Coupon Hook for POS
 * Handles coupon validation, application, and removal.
 * Persists to localStorage so mini-cart ↔ POS share state.
 */
export function useCoupon(businessId: string | undefined) {
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)

  // Load persisted coupon on mount / business change
  useEffect(() => {
    if (!businessId) return
    try {
      const stored = localStorage.getItem(COUPON_STORAGE_KEY(businessId))
      if (stored) {
        const parsed = JSON.parse(stored) as AppliedCoupon
        setAppliedCoupon(parsed)
      }
    } catch {}
  }, [businessId])

  // Listen for coupon events from mini-cart (same tab, real-time sync)
  useEffect(() => {
    const onApplied = (e: Event) => {
      const detail = (e as CustomEvent<AppliedCoupon>).detail
      if (detail) setAppliedCoupon(detail)
    }
    const onRemoved = () => {
      setAppliedCoupon(null)
    }
    window.addEventListener('coupon-applied', onApplied)
    window.addEventListener('coupon-removed', onRemoved)
    return () => {
      window.removeEventListener('coupon-applied', onApplied)
      window.removeEventListener('coupon-removed', onRemoved)
    }
  }, [])

  /**
   * Validate and apply a coupon by code or barcode
   */
  const applyCoupon = useCallback(async (input: string, customerPhone?: string): Promise<AppliedCoupon | null> => {
    if (!businessId || !input.trim()) {
      setCouponError('Please enter a coupon code')
      return null
    }

    if (!customerPhone?.trim()) {
      setCouponError('Customer phone number is required to apply a coupon')
      return null
    }

    if (appliedCoupon) {
      setCouponError('A coupon is already applied. Remove it first.')
      return null
    }

    setIsValidating(true)
    setCouponError(null)

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          code: input.trim(),
          barcode: input.trim(),
          customerPhone: customerPhone?.trim()
        })
      })

      const data = await response.json()

      if (!data.success) {
        setCouponError(data.error || 'Invalid coupon')
        return null
      }

      const coupon: AppliedCoupon = {
        id: data.data.id,
        code: data.data.code,
        description: data.data.description,
        discountAmount: Number(data.data.discountAmount),
        requiresApproval: data.data.requiresApproval,
        customerPhone: customerPhone?.trim()
      }

      setAppliedCoupon(coupon)
      if (businessId) {
        try { localStorage.setItem(COUPON_STORAGE_KEY(businessId), JSON.stringify(coupon)) } catch {}
      }
      return coupon
    } catch (error) {
      setCouponError('Failed to validate coupon')
      return null
    } finally {
      setIsValidating(false)
    }
  }, [businessId, appliedCoupon])

  /**
   * Remove the applied coupon
   */
  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null)
    setCouponError(null)
    if (businessId) {
      try { localStorage.removeItem(COUPON_STORAGE_KEY(businessId)) } catch {}
    }
  }, [businessId])

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setCouponError(null)
  }, [])

  return {
    appliedCoupon,
    isValidating,
    couponError,
    applyCoupon,
    removeCoupon,
    clearError
  }
}
