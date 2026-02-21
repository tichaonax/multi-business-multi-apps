'use client'

import { useState } from 'react'
import { Gift, X, Tag } from 'lucide-react'
import { ProductPanel } from './ProductPanel'
import { CartPanel } from './CartPanel'
import { PaymentPanel } from './PaymentPanel'
import { CustomerLookup } from '@/components/pos/customer-lookup'
import { CustomerQuickRegister } from '@/components/pos/customer-quick-register'
import type { Product } from '../hooks/useProductLoader'
import type { UniversalCartItem, CartTotals } from '../hooks/useUniversalCart'
import type { AppliedCoupon } from '../hooks/useCoupon'
import type { CustomerReward } from '../hooks/useCustomerRewards'
import type { BusinessTypeConfig, PaymentMethod } from '../config/business-type-config'

interface SelectedCustomer {
  id: string
  customerNumber: string
  name: string
  email?: string
  phone?: string
  customerType: string
}

interface UniversalPOSLayoutProps {
  // Products
  products: Product[]
  productsLoading: boolean

  // Cart
  cart: UniversalCartItem[]
  totals: CartTotals
  onAddToCart: (item: Omit<UniversalCartItem, 'totalPrice'>) => void
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onRemoveItem: (itemId: string) => void
  onClearCart: () => void

  // Payment
  config: BusinessTypeConfig
  isProcessing: boolean
  onCheckout: (paymentMethod: PaymentMethod, amountPaid?: number) => void

  // Business info
  businessId?: string
  onProductsReload?: () => void

  // Coupon (optional)
  appliedCoupon?: AppliedCoupon | null
  isValidatingCoupon?: boolean
  couponError?: string | null
  onApplyCoupon?: (input: string, customerPhone: string) => Promise<AppliedCoupon | null>
  onRemoveCoupon?: () => void
  onClearCouponError?: () => void

  // Customer (optional)
  selectedCustomer?: SelectedCustomer | null
  customerRewards?: CustomerReward[]
  customerUsedRewards?: CustomerReward[]
  appliedReward?: CustomerReward | null
  onSelectCustomer?: (customer: SelectedCustomer | null) => void
  onApplyReward?: (reward: CustomerReward) => void
  onRemoveReward?: () => void
}

/**
 * Universal POS Layout
 * Two-column layout: Products (left) | Cart + Payment (right)
 */
export function UniversalPOSLayout({
  products,
  productsLoading,
  cart,
  totals,
  onAddToCart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  config,
  isProcessing,
  onCheckout,
  businessId,
  onProductsReload,
  appliedCoupon,
  isValidatingCoupon,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
  onClearCouponError,
  selectedCustomer,
  customerRewards = [],
  customerUsedRewards = [],
  appliedReward,
  onSelectCustomer,
  onApplyReward,
  onRemoveReward
}: UniversalPOSLayoutProps) {
  const [showQuickRegister, setShowQuickRegister] = useState(false)

  const showCustomerSection = !!businessId && !!onSelectCustomer

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-200px)]">
      {/* Left Column - Products */}
      <div className="lg:col-span-7 h-full">
        <ProductPanel
          products={products}
          config={config}
          loading={productsLoading}
          cart={cart}
          businessId={businessId}
          onAddToCart={onAddToCart}
          onProductsReload={onProductsReload}
        />
      </div>

      {/* Right Column - Customer + Cart + Payment */}
      <div className="lg:col-span-5 h-full flex flex-col gap-4">

        {/* Customer Section */}
        {showCustomerSection && (
          <div className="flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            {showQuickRegister ? (
              <CustomerQuickRegister
                businessId={businessId!}
                onCreated={(c) => { onSelectCustomer?.(c); setShowQuickRegister(false) }}
                onCancel={() => setShowQuickRegister(false)}
              />
            ) : (
              <CustomerLookup
                businessId={businessId!}
                selectedCustomer={selectedCustomer || null}
                onSelectCustomer={onSelectCustomer}
                onCreateCustomer={() => setShowQuickRegister(true)}
                allowWalkIn={false}
              />
            )}

            {/* Applied Reward */}
            {appliedReward && onRemoveReward && (
              <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <div>
                    <div className="text-sm font-medium text-green-800 dark:text-green-300">
                      {[
                        Number(appliedReward.rewardAmount) > 0 && `$${Number(appliedReward.rewardAmount).toFixed(2)} credit`,
                        appliedReward.rewardProduct && `Free ${appliedReward.rewardProduct.name}`,
                        appliedReward.wifiConfig && `Free WiFi (${appliedReward.wifiConfig.name})`
                      ].filter(Boolean).join(' + ') || 'Reward'} applied
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-500 font-mono">{appliedReward.couponCode}</div>
                  </div>
                </div>
                <button onClick={onRemoveReward} className="text-green-500 hover:text-green-700 dark:hover:text-green-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Available Rewards — show when customer selected, no reward applied yet */}
            {selectedCustomer && !appliedReward && customerRewards.length > 0 && onApplyReward && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-secondary">Available Rewards</p>
                {customerRewards.map(r => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-amber-600" />
                      <div>
                        <div className="text-xs font-medium text-amber-800 dark:text-amber-300">
                          {[
                            Number(r.rewardAmount) > 0 && `$${Number(r.rewardAmount).toFixed(2)} Credit`,
                            r.rewardProduct && `Free ${r.rewardProduct.name}`,
                            r.wifiConfig && `Free WiFi (${r.wifiConfig.name})`
                          ].filter(Boolean).join(' + ') || 'Reward'} — {r.promo_campaigns.name}
                        </div>
                        <div className="text-xs text-amber-600 dark:text-amber-500 font-mono">{r.couponCode}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => onApplyReward(r)}
                      className="text-xs px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700"
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Used Rewards — show if customer has no active reward but has used ones recently */}
            {selectedCustomer && !appliedReward && customerRewards.length === 0 && customerUsedRewards.length > 0 && (
              <div className="space-y-1">
                {customerUsedRewards.map(r => (
                  <div
                    key={r.id}
                    className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2"
                  >
                    <Tag className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {r.promo_campaigns.name} —{' '}
                        {r.status === 'REDEEMED' ? 'Reward already used' :
                         r.status === 'DEACTIVATED' ? 'Reward deactivated' : 'Reward expired'}
                      </div>
                      {r.redeemedAt && (
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">
                          Redeemed {new Date(r.redeemedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          <CartPanel
            cart={cart}
            totals={totals}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveItem={onRemoveItem}
            onClearCart={onClearCart}
            appliedCoupon={appliedCoupon}
            isValidatingCoupon={isValidatingCoupon}
            couponError={couponError}
            onApplyCoupon={onApplyCoupon}
            onRemoveCoupon={onRemoveCoupon}
            onClearCouponError={onClearCouponError}
          />
        </div>

        <div className="flex-shrink-0">
          <PaymentPanel
            config={config}
            totals={totals}
            isProcessing={isProcessing}
            onCheckout={onCheckout}
            disabled={cart.length === 0}
          />
        </div>
      </div>
    </div>
  )
}
