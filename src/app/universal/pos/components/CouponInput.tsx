'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Tag, Loader2, Search, ChevronDown } from 'lucide-react'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import type { AppliedCoupon } from '../hooks/useCoupon'

interface CouponOption {
  id: string
  code: string
  barcode: string | null
  description: string | null
  discountAmount: number
}

interface CouponInputProps {
  appliedCoupon: AppliedCoupon | null
  isValidating: boolean
  couponError: string | null
  onApplyCoupon: (input: string, customerPhone: string) => Promise<AppliedCoupon | null>
  onRemoveCoupon: () => void
  onClearError: () => void
}

/**
 * Coupon Input Component for POS
 * Searchable dropdown with barcode scan support + formatted phone input
 */
export function CouponInput({
  appliedCoupon,
  isValidating,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
  onClearError
}: CouponInputProps) {
  const { currentBusinessId } = useBusinessPermissionsContext()
  const [phoneValue, setPhoneValue] = useState('')
  const [couponSearch, setCouponSearch] = useState('')
  const [selectedCoupon, setSelectedCoupon] = useState<CouponOption | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [couponOptions, setCouponOptions] = useState<CouponOption[]>([])
  const [couponsLoaded, setCouponsLoaded] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch active coupons on mount
  useEffect(() => {
    if (currentBusinessId && !couponsLoaded) {
      fetch(`/api/coupons?businessId=${encodeURIComponent(currentBusinessId)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.data)) {
            setCouponOptions(
              data.data
                .filter((c: any) => c.isActive)
                .map((c: any) => ({
                  id: c.id,
                  code: c.code,
                  barcode: c.barcode || null,
                  description: c.description || null,
                  discountAmount: Number(c.discountAmount)
                }))
            )
          }
          setCouponsLoaded(true)
        })
        .catch(() => setCouponsLoaded(true))
    }
  }, [currentBusinessId, couponsLoaded])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredCoupons = couponOptions.filter(c => {
    const q = couponSearch.toLowerCase()
    if (!q) return true
    return (
      c.code.toLowerCase().includes(q) ||
      (c.barcode && c.barcode.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    )
  })

  const handleSelectCoupon = (coupon: CouponOption) => {
    setSelectedCoupon(coupon)
    setCouponSearch(coupon.code)
    setDropdownOpen(false)
    if (couponError) onClearError()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const codeToValidate = selectedCoupon?.code || couponSearch.trim()
    if (!codeToValidate || !phoneValue.trim() || isValidating) return

    const result = await onApplyCoupon(codeToValidate, phoneValue.trim())
    if (result) {
      setCouponSearch('')
      setPhoneValue('')
      setSelectedCoupon(null)
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
          {appliedCoupon.customerPhone && (
            <span className="text-xs text-green-600 dark:text-green-400 ml-2">
              ({appliedCoupon.customerPhone})
            </span>
          )}
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
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Customer Phone */}
        <PhoneNumberInput
          value={phoneValue}
          onChange={(full) => {
            setPhoneValue(full)
            if (couponError) onClearError()
          }}
          label=""
          placeholder="Customer phone number"
          className="w-full"
          disabled={isValidating}
        />

        {/* Searchable Coupon Dropdown */}
        <div className="flex gap-2">
          <div className="relative flex-1" ref={dropdownRef}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={couponSearch}
                onChange={(e) => {
                  setCouponSearch(e.target.value)
                  setSelectedCoupon(null)
                  setDropdownOpen(true)
                  if (couponError) onClearError()
                }}
                onFocus={() => setDropdownOpen(true)}
                placeholder="Search or scan coupon..."
                className={`w-full pl-8 pr-7 py-2 text-sm border rounded-md bg-white dark:bg-gray-700 dark:text-white ${
                  couponError
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
                } focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                disabled={isValidating}
              />
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Dropdown list */}
            {dropdownOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {!couponsLoaded ? (
                  <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading coupons...
                  </div>
                ) : filteredCoupons.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    {couponSearch ? 'No matching coupons' : 'No active coupons'}
                  </div>
                ) : (
                  filteredCoupons.map(coupon => (
                    <button
                      key={coupon.id}
                      type="button"
                      onClick={() => handleSelectCoupon(coupon)}
                      className={`w-full text-left px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-sm border-b border-gray-100 dark:border-gray-600 last:border-0 ${
                        selectedCoupon?.id === coupon.id ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-white">{coupon.code}</span>
                        <span className="text-purple-600 dark:text-purple-400 font-medium">
                          -${coupon.discountAmount.toFixed(2)}
                        </span>
                      </div>
                      {coupon.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{coupon.description}</p>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={isValidating || (!selectedCoupon && !couponSearch.trim()) || !phoneValue.trim()}
            className="px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {isValidating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Apply'
            )}
          </button>
        </div>
      </form>
      {couponError && (
        <p className="text-xs text-red-500 mt-1">{couponError}</p>
      )}
    </div>
  )
}
