'use client'

import { useState } from 'react'
import { X, Tag, Loader2 } from 'lucide-react'
import type { AppliedCoupon } from '../hooks/useCoupon'

interface CouponInputProps {
  appliedCoupon: AppliedCoupon | null
  isValidating: boolean
  couponError: string | null
  onApplyCoupon: (input: string) => Promise<AppliedCoupon | null>
  onRemoveCoupon: () => void
  onClearError: () => void
}

/**
 * Coupon Input Component for POS
 * Allows barcode scan or manual code entry
 */
export function CouponInput({
  appliedCoupon,
  isValidating,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
  onClearError
}: CouponInputProps) {
  const [inputValue, setInputValue] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isValidating) return

    const result = await onApplyCoupon(inputValue.trim())
    if (result) {
      setInputValue('')
    }
  }

  // If coupon is applied, show it as a badge
  if (appliedCoupon) {
    return (
      <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <Tag className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-green-800 dark:text-green-200">
            {appliedCoupon.code}
          </span>
          <span className="text-sm text-green-600 dark:text-green-400 ml-2">
            -${appliedCoupon.discountAmount.toFixed(2)}
          </span>
          {appliedCoupon.description && (
            <p className="text-xs text-green-600 dark:text-green-400 truncate">
              {appliedCoupon.description}
            </p>
          )}
        </div>
        <button
          onClick={onRemoveCoupon}
          className="text-green-600 dark:text-green-400 hover:text-red-500 p-1"
          title="Remove coupon"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  // Input form
  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              if (couponError) onClearError()
            }}
            placeholder="Coupon code or scan..."
            className={`w-full pl-8 pr-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-700 dark:text-white ${
              couponError
                ? 'border-red-300 dark:border-red-600'
                : 'border-gray-300 dark:border-gray-600'
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            disabled={isValidating}
          />
        </div>
        <button
          type="submit"
          disabled={isValidating || !inputValue.trim()}
          className="px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          {isValidating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Apply'
          )}
        </button>
      </form>
      {couponError && (
        <p className="text-xs text-red-500 mt-1">{couponError}</p>
      )}
    </div>
  )
}
