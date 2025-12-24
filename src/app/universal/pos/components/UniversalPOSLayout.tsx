'use client'

import { ProductPanel } from './ProductPanel'
import { CartPanel } from './CartPanel'
import { PaymentPanel } from './PaymentPanel'
import type { Product } from '../hooks/useProductLoader'
import type { UniversalCartItem, CartTotals } from '../hooks/useUniversalCart'
import type { BusinessTypeConfig, PaymentMethod } from '../config/business-type-config'

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
  onCheckout
}: UniversalPOSLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-200px)]">
      {/* Left Column - Products */}
      <div className="lg:col-span-7 h-full">
        <ProductPanel
          products={products}
          config={config}
          loading={productsLoading}
          onAddToCart={onAddToCart}
        />
      </div>

      {/* Right Column - Cart + Payment */}
      <div className="lg:col-span-5 h-full flex flex-col gap-4">
        <div className="flex-1 overflow-hidden">
          <CartPanel
            cart={cart}
            totals={totals}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveItem={onRemoveItem}
            onClearCart={onClearCart}
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
