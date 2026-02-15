'use client'

import { useState, useCallback } from 'react'

export interface AppliedCoupon {
  id: string
  code: string
  description: string | null
  discountAmount: number
  requiresApproval: boolean
}

/**
 * Coupon Hook for POS
 * Handles coupon validation, application, and removal
 */
export function useCoupon(businessId: string | undefined) {
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)

  /**
   * Validate and apply a coupon by code or barcode
   */
  const applyCoupon = useCallback(async (input: string): Promise<AppliedCoupon | null> => {
    if (!businessId || !input.trim()) {
      setCouponError('Please enter a coupon code')
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
          barcode: input.trim()
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
        requiresApproval: data.data.requiresApproval
      }

      setAppliedCoupon(coupon)
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
  }, [])

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
