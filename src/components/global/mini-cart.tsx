'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useGlobalCart } from '@/contexts/global-cart-context'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useRouter } from 'next/navigation'
import { Tag, X, Loader2, ChevronDown, Search } from 'lucide-react'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'

interface CouponOption {
  id: string
  code: string
  barcode: string | null
  description: string | null
  discountAmount: number
  isActive: boolean
}

export function MiniCart() {
  const { cart, removeFromCart, updateQuantity, clearCart, getCartItemCount, getCartSubtotal, isCartEmpty } = useGlobalCart()
  const { currentBusiness, currentBusinessId } = useBusinessPermissionsContext()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  // Coupon state
  const [couponPhone, setCouponPhone] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discountAmount: number; customerPhone: string } | null>(null)
  const [showCouponForm, setShowCouponForm] = useState(false)

  // Searchable coupon dropdown state
  const [couponSearch, setCouponSearch] = useState('')
  const [couponOptions, setCouponOptions] = useState<CouponOption[]>([])
  const [couponDropdownOpen, setCouponDropdownOpen] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<CouponOption | null>(null)
  const [couponsLoaded, setCouponsLoaded] = useState(false)
  const couponDropdownRef = useRef<HTMLDivElement>(null)

  const couponsEnabled = currentBusiness?.couponsEnabled

  // Fetch available coupons when form is shown
  useEffect(() => {
    if (showCouponForm && currentBusinessId && !couponsLoaded) {
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
                  discountAmount: Number(c.discountAmount),
                  isActive: c.isActive
                }))
            )
          }
          setCouponsLoaded(true)
        })
        .catch(() => setCouponsLoaded(true))
    }
  }, [showCouponForm, currentBusinessId, couponsLoaded])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (couponDropdownRef.current && !couponDropdownRef.current.contains(e.target as Node)) {
        setCouponDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter coupons based on search (match code, barcode, or description)
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
    setCouponDropdownOpen(false)
    setCouponError(null)
  }

  const handleApplyCoupon = useCallback(async () => {
    const codeToValidate = selectedCoupon?.code || couponSearch.trim()
    if (!codeToValidate || !couponPhone.trim() || !currentBusinessId) return
    setCouponLoading(true)
    setCouponError(null)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusinessId,
          code: codeToValidate,
          barcode: codeToValidate,
          customerPhone: couponPhone.trim()
        })
      })
      const data = await res.json()
      if (!data.success) {
        setCouponError(data.error || 'Invalid coupon')
      } else {
        const couponData = {
          id: data.data.id,
          code: data.data.code,
          description: data.data.description || null,
          discountAmount: Number(data.data.discountAmount),
          requiresApproval: data.data.requiresApproval || false,
          customerPhone: couponPhone.trim()
        }
        setAppliedCoupon(couponData)
        // Persist and notify POS page in real-time
        try { localStorage.setItem(`applied-coupon-${currentBusinessId}`, JSON.stringify(couponData)) } catch {}
        window.dispatchEvent(new CustomEvent('coupon-applied', { detail: couponData }))
        setCouponSearch('')
        setCouponPhone('')
        setSelectedCoupon(null)
        setShowCouponForm(false)
      }
    } catch {
      setCouponError('Failed to validate coupon')
    } finally {
      setCouponLoading(false)
    }
  }, [selectedCoupon, couponSearch, couponPhone, currentBusinessId])

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponError(null)
    if (currentBusinessId) {
      try { localStorage.removeItem(`applied-coupon-${currentBusinessId}`) } catch {}
    }
    window.dispatchEvent(new Event('coupon-removed'))
  }

  // Clear cart from both global context and POS-specific localStorage
  const handleClearCart = () => {
    clearCart()
    // Also clear any applied coupon
    setAppliedCoupon(null)
    if (currentBusinessId) {
      // Also clear POS-specific localStorage keys so POS pages pick up the empty state
      try {
        localStorage.removeItem(`cart-${currentBusinessId}`)
        localStorage.removeItem(`global-cart-${currentBusinessId}`)
        localStorage.removeItem(`applied-coupon-${currentBusinessId}`)
      } catch {}
    }
    window.dispatchEvent(new Event('coupon-removed'))
  }

  const handleRemoveItem = (itemId: string) => {
    removeFromCart(itemId)
  }

  const itemCount = getCartItemCount()
  const subtotal = getCartSubtotal()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const handleGoToPOS = () => {
    setIsOpen(false)
    // Always navigate to universal POS — it adapts to all business types
    // and supports coupons, unlike the business-specific POS pages
    router.push('/universal/pos')
  }

  if (!currentBusiness) {
    return null
  }

  return (
    <div className="relative">
      {/* Cart Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        title="Shopping Cart"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        {/* Item Count Badge */}
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {itemCount}
          </span>
        )}
      </button>

      {/* Mini Cart Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Panel */}
          <div
            className="fixed left-1 right-1 top-14 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[60] max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Shopping Cart
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {currentBusiness.businessName}
              </p>
              {!isCartEmpty && (
                <button
                  onClick={handleClearCart}
                  className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Clear All Items
                </button>
              )}
            </div>

            {/* Cart Items */}
            {isCartEmpty ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="text-6xl mb-4">🛒</div>
                <p className="text-gray-500 dark:text-gray-400 mb-2">Your cart is empty</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Add items to get started</p>
              </div>
            ) : (
              <>
                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      {/* Item Image */}
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center text-2xl">
                          {(item as any).isCombo ? '🍽️' : '📦'}
                        </div>
                      )}

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {item.name}
                        </h4>
                        {item.sku && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {item.sku}
                          </p>
                        )}
                        {item.attributes && Object.keys(item.attributes).length > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {Object.entries(item.attributes)
                              .filter(([key]) => ['size', 'color'].includes(key))
                              .map(([_, value]) => value)
                              .join(' • ')}
                          </p>
                        )}
                        {/* Combo Contents */}
                        {(item as any).isCombo && (item as any).comboItems && (
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600/50 rounded p-1.5">
                            <div className="font-medium text-gray-600 dark:text-gray-300 mb-0.5">Includes:</div>
                            {(item as any).comboItems.map((ci: any, idx: number) => {
                              const isWiFiToken = ci.tokenConfigId || ci.wifiToken
                              const itemName = ci.wifiToken?.name || ci.product?.name || ci.name || 'Item'
                              return (
                                <div key={idx} className="flex items-center gap-1 ml-1">
                                  {isWiFiToken ? (
                                    <>
                                      <span>📶</span>
                                      <span className="text-blue-600 dark:text-blue-400">{itemName}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>•</span>
                                      <span>{itemName}</span>
                                      {ci.quantity > 1 && <span className="text-gray-400">x{ci.quantity}</span>}
                                    </>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, item.quantity - 1) }}
                              className="px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-bold text-lg leading-none"
                            >
                              −
                            </button>
                            <span className="px-2 text-sm font-medium text-gray-900 dark:text-white min-w-[24px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, item.quantity + 1) }}
                              className="px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-bold text-lg leading-none"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.id) }}
                            className="ml-auto text-red-500 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-3">
                  {/* Coupon Section */}
                  {couponsEnabled && (
                    <div>
                      {appliedCoupon ? (
                        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <Tag className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-green-800 dark:text-green-200">
                              {appliedCoupon.code}
                            </span>
                            <span className="text-sm text-green-600 dark:text-green-400 ml-2">
                              -{formatCurrency(appliedCoupon.discountAmount)}
                            </span>
                          </div>
                          <button onClick={handleRemoveCoupon} className="text-green-600 hover:text-red-500 p-1">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : showCouponForm ? (
                        <div className="space-y-2">
                          {/* Customer Phone - using PhoneNumberInput */}
                          <PhoneNumberInput
                            value={couponPhone}
                            onChange={(full) => { setCouponPhone(full); setCouponError(null) }}
                            label=""
                            placeholder="Customer phone"
                            className="w-full [&_button]:!h-8 [&_input]:!py-1 [&_input]:!text-sm [&_button]:!px-2 [&_button]:!text-xs [&_.text-lg]:!text-sm [&_p]:!hidden"
                          />

                          {/* Searchable Coupon Dropdown */}
                          <div className="flex gap-2">
                            <div className="relative flex-1" ref={couponDropdownRef}>
                              <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                <input
                                  type="text"
                                  value={couponSearch}
                                  onChange={(e) => {
                                    setCouponSearch(e.target.value)
                                    setSelectedCoupon(null)
                                    setCouponDropdownOpen(true)
                                    setCouponError(null)
                                  }}
                                  onFocus={() => setCouponDropdownOpen(true)}
                                  placeholder="Search or scan coupon"
                                  className={`w-full pl-8 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                    selectedCoupon ? 'pr-24 border-purple-400 dark:border-purple-600' : 'pr-7 border-gray-300 dark:border-gray-600'
                                  }`}
                                />
                                {selectedCoupon ? (
                                  <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs font-bold text-green-500 dark:text-green-400">
                                    -{formatCurrency(selectedCoupon.discountAmount)}
                                  </span>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => setCouponDropdownOpen(!couponDropdownOpen)}
                                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Dropdown list */}
                              {couponDropdownOpen && (
                                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                  {!couponsLoaded ? (
                                    <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                                      <Loader2 className="w-3 h-3 animate-spin" /> Loading...
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
                                            -{formatCurrency(coupon.discountAmount)}
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
                              onClick={handleApplyCoupon}
                              disabled={couponLoading || (!selectedCoupon && !couponSearch.trim()) || !couponPhone.trim()}
                              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                            >
                              {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                            </button>
                          </div>
                          {couponError && <p className="text-xs text-red-500">{couponError}</p>}
                          <button
                            onClick={() => {
                              setShowCouponForm(false)
                              setCouponError(null)
                              setCouponSearch('')
                              setSelectedCoupon(null)
                              setCouponsLoaded(false)
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowCouponForm(true)}
                          className="flex items-center gap-1.5 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                        >
                          <Tag className="w-3.5 h-3.5" />
                          Apply Coupon
                        </button>
                      )}
                    </div>
                  )}

                  {/* Totals */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Subtotal
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  {appliedCoupon && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-600 dark:text-green-400">Coupon ({appliedCoupon.code})</span>
                        <span className="text-green-600 dark:text-green-400">-{formatCurrency(appliedCoupon.discountAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(Math.max(0, subtotal - appliedCoupon.discountAmount))}
                        </span>
                      </div>
                    </>
                  )}
                  <button
                    onClick={handleGoToPOS}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Go to Checkout
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
