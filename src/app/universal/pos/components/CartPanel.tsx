'use client'

import { Trash2 } from 'lucide-react'
import type { UniversalCartItem, CartTotals } from '../hooks/useUniversalCart'
import type { AppliedCoupon } from '../hooks/useCoupon'
import { CouponInput } from './CouponInput'

interface CartPanelProps {
  cart: UniversalCartItem[]
  totals: CartTotals
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onRemoveItem: (itemId: string) => void
  onClearCart: () => void
  // Coupon props (optional - only passed when coupons feature is enabled)
  appliedCoupon?: AppliedCoupon | null
  isValidatingCoupon?: boolean
  couponError?: string | null
  onApplyCoupon?: (input: string, customerPhone: string) => Promise<AppliedCoupon | null>
  onRemoveCoupon?: () => void
  onClearCouponError?: () => void
}

/**
 * Universal Cart Panel
 * Displays cart items with quantity controls
 */
export function CartPanel({
  cart,
  totals,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  appliedCoupon,
  isValidatingCoupon,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
  onClearCouponError
}: CartPanelProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cart
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'}
          </p>
        </div>
        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Cart Items */}
      <div className="max-h-[400px] overflow-y-auto">
        {cart.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p>Cart is empty</p>
            <p className="text-sm mt-2">Add items to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {cart.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Item Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {item.name}
                    </h3>
                    {item.sku && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        SKU: {item.sku}
                      </p>
                    )}

                    {/* Business-specific fields */}
                    {item.size && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Size: {item.size}
                      </p>
                    )}
                    {item.color && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Color: {item.color}
                      </p>
                    )}
                    {item.weight && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Weight: {item.weight} lbs
                      </p>
                    )}
                    {item.hours && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Hours: {item.hours}
                      </p>
                    )}
                    {item.projectRef && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Project: {item.projectRef}
                      </p>
                    )}
                    {item.vin && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        VIN: {item.vin}
                      </p>
                    )}

                    {/* BOGO Free Badge */}
                    {item.isBOGOFree && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                        BOGO FREE
                      </span>
                    )}

                    {/* WiFi Token Info */}
                    {item.isWiFiToken && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {item.packageName && <p>{item.packageName}</p>}
                        {item.duration && (
                          <p>
                            {Math.floor(item.duration / 60)}h {item.duration % 60}m
                          </p>
                        )}
                      </div>
                    )}

                    {/* Price */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        ${item.unitPrice.toFixed(2)} × {item.quantity}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        = ${item.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-md">
                      <button
                        onClick={() =>
                          onUpdateQuantity(item.id, item.quantity - 1)
                        }
                        className="w-8 h-8 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-l-md"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const qty = parseInt(e.target.value) || 1
                          onUpdateQuantity(item.id, qty)
                        }}
                        className="w-12 text-center bg-transparent border-0 text-gray-900 dark:text-white focus:outline-none"
                      />
                      <button
                        onClick={() =>
                          onUpdateQuantity(item.id, item.quantity + 1)
                        }
                        className="w-8 h-8 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-r-md"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Coupon Input */}
      {cart.length > 0 && onApplyCoupon && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <CouponInput
            appliedCoupon={appliedCoupon || null}
            isValidating={isValidatingCoupon || false}
            couponError={couponError || null}
            onApplyCoupon={onApplyCoupon}
            onRemoveCoupon={onRemoveCoupon || (() => {})}
            onClearError={onClearCouponError || (() => {})}
          />
        </div>
      )}

      {/* Totals */}
      {cart.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
            <span className="text-gray-900 dark:text-white">
              ${totals.subtotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Tax (8%)</span>
            <span className="text-gray-900 dark:text-white">
              ${totals.tax.toFixed(2)}
            </span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600 dark:text-green-400">
                {appliedCoupon ? `Coupon (${appliedCoupon.code})` : 'Discount'}
              </span>
              <span className="text-green-600 dark:text-green-400">
                -${totals.discount.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-900 dark:text-white">Total</span>
            <span className="text-gray-900 dark:text-white">
              ${totals.total.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
