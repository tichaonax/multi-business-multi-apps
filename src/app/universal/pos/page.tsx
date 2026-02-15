'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useCallback, useEffect, useRef, useState } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useGlobalCart } from '@/contexts/global-cart-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { UniversalPOSLayout } from './components/UniversalPOSLayout'
import { UnifiedReceiptPreviewModal } from '@/components/receipts/unified-receipt-preview-modal'
import { ReceiptPrintManager } from '@/lib/receipts/receipt-print-manager'
import { useUniversalCart } from './hooks/useUniversalCart'
import { useProductLoader } from './hooks/useProductLoader'
import { usePaymentProcessor } from './hooks/usePaymentProcessor'
import { useWiFiTokenSync } from './hooks/useWiFiTokenSync'
import { useCoupon } from './hooks/useCoupon'
import { useConfirm } from '@/components/ui/confirm-modal'
import { getBusinessTypeConfig, getSupportedBusinessTypes } from './config/business-type-config'
import { toast } from 'sonner'
import type { ReceiptData } from '@/types/printing'

/**
 * Universal POS Page
 * Adapts to all 10 business types: grocery, restaurant, clothing, hardware,
 * construction, vehicles, consulting, retail, services, other
 */
export default function UniversalPOS() {
  const { currentBusiness, currentBusinessId } = useBusinessPermissionsContext()
  const globalCart = useGlobalCart()
  const hasImportedGlobalCart = useRef(false)

  // Get business type and configuration
  const businessType = currentBusiness?.businessType || 'other'
  const config = getBusinessTypeConfig(businessType)

  // Receipt preview modal state (modal handles its own printer selection)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [pendingReceiptData, setPendingReceiptData] = useState<ReceiptData | null>(null)
  const printInFlightRef = useRef(false)

  // BOGO promotion state
  const [bogoPromotion, setBogoPromotion] = useState<{ isActive: boolean; value: number } | null>(null)

  // Initialize cart
  const {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    setDiscount,
    totals
  } = useUniversalCart()

  // Load products for current business
  const {
    products,
    loading: productsLoading,
    error: productsError,
    reloadProducts
  } = useProductLoader(currentBusinessId, businessType)

  // WiFi token sync (if business supports WiFi tokens)
  const { syncESP32TokenQuantities } = useWiFiTokenSync()

  // Coupon support
  const confirm = useConfirm()
  const {
    appliedCoupon,
    isValidating: isValidatingCoupon,
    couponError,
    applyCoupon,
    removeCoupon,
    clearError: clearCouponError
  } = useCoupon(currentBusinessId || undefined)

  // Sync discount when a coupon is loaded from localStorage (e.g. applied in mini-cart)
  useEffect(() => {
    if (appliedCoupon) {
      setDiscount(appliedCoupon.discountAmount)
    }
  }, [appliedCoupon, setDiscount])

  // Payment processor with business info - no auto-print, show preview instead
  const { processCheckout, isProcessing, lastReceipt } = usePaymentProcessor(
    currentBusiness && currentBusinessId
      ? {
          businessId: currentBusinessId,
          businessName: currentBusiness.businessName,
          businessType: currentBusiness.businessType,
          address: currentBusiness.address,
          phone: currentBusiness.phone
        }
      : null,
    {
      autoPrint: false, // Don't auto-print - show preview modal instead
      onSuccess: (orderId, receiptData) => {
        console.log('✅ Order completed:', orderId)
        clearCart()
        globalCart.clearCart()
        removeCoupon()
        reloadProducts()
        // Show receipt preview modal
        setPendingReceiptData(receiptData)
        setShowReceiptPreview(true)
      },
      onError: (error) => {
        console.error('❌ Checkout error:', error)
      }
    }
  )

  // Fetch BOGO promotion status (only for businesses with bogoPromotion feature)
  useEffect(() => {
    if (!currentBusinessId || !config.features.bogoPromotion) return

    const fetchBogo = async () => {
      try {
        const response = await fetch(`/api/promotions/bogo?businessId=${currentBusinessId}`)
        const data = await response.json()
        if (data.success && data.data) {
          setBogoPromotion({ isActive: data.data.isActive, value: Number(data.data.value) })
        }
      } catch (error) {
        console.error('Failed to fetch BOGO status:', error)
      }
    }
    fetchBogo()
  }, [currentBusinessId, businessType])

  // BOGO-aware addToCart wrapper
  const handleAddToCart = useCallback((item: Omit<import('./hooks/useUniversalCart').UniversalCartItem, 'totalPrice'>) => {
    addToCart(item)

    // Per-bale BOGO: use bale's own bogoActive/bogoRatio
    if (item.baleId && item.bogoActive && !item.isBOGOFree) {
      const freeCount = item.bogoRatio || 1 // 1 = buy1get1, 2 = buy1get2
      for (let i = 0; i < freeCount; i++) {
        addToCart({
          ...item,
          id: `${item.id}_bogo_${Date.now()}_${i}`,
          name: `${item.name} (BOGO Free)`,
          unitPrice: 0,
          quantity: item.quantity,
          isBOGOFree: true,
        })
      }
    }
    // Fallback: global BOGO for non-bale used items
    else if (bogoPromotion?.isActive && item.condition === 'USED' && !item.baleId && !item.isBOGOFree) {
      const freeCount = bogoPromotion.value || 1
      for (let i = 0; i < freeCount; i++) {
        addToCart({
          ...item,
          id: `${item.id}_bogo_${Date.now()}_${i}`,
          name: `${item.name} (BOGO Free)`,
          unitPrice: 0,
          quantity: item.quantity,
          isBOGOFree: true,
        })
      }
    }
  }, [addToCart, bogoPromotion])

  // Sync ESP32 WiFi tokens on mount (only for ESP32 tokens, not R710)
  useEffect(() => {
    if (!currentBusinessId || !config.features.wifiTokens) return

    const syncTokens = async () => {
      try {
        // Only sync ESP32 tokens (id starts with 'wifi_'), not R710 tokens (id starts with 'r710_')
        const esp32TokenConfigIds = products
          .filter((p) => p.isWiFiToken && p.tokenConfigId && p.id.startsWith('wifi_'))
          .map((p) => p.tokenConfigId!)

        if (esp32TokenConfigIds.length > 0) {
          console.log('🔄 Syncing ESP32 WiFi token quantities...')
          await syncESP32TokenQuantities(currentBusinessId, esp32TokenConfigIds)
        }
      } catch (error) {
        console.error('Failed to sync ESP32 WiFi tokens:', error)
      }
    }

    // Sync after a short delay to allow products to load
    const timer = setTimeout(syncTokens, 2000)
    return () => clearTimeout(timer)
  }, [currentBusinessId, products, config.features.wifiTokens, syncESP32TokenQuantities])

  // Show products error if any
  useEffect(() => {
    if (productsError) {
      toast.error(`Failed to load products: ${productsError}`)
    }
  }, [productsError])

  // Import global cart items when POS page loads
  // This handles the case when user adds items via mini-cart from another page
  // then navigates to POS
  useEffect(() => {
    if (hasImportedGlobalCart.current) return
    if (globalCart.cart.length === 0) return

    const itemCount = globalCart.cart.length
    console.log('🛒 [UniversalPOS] Importing global cart items:', itemCount)

    // Import each item from global cart to local cart
    globalCart.cart.forEach(item => {
      const attrs = item.attributes || {}
      addToCart({
        id: item.id,
        name: item.name,
        sku: item.sku || '',
        quantity: item.quantity,
        unitPrice: item.price,
        productId: item.productId,
        variantId: attrs.baleId ? undefined : item.variantId,
        imageUrl: item.imageUrl || undefined,
        isCombo: item.isCombo,
        comboItems: item.comboItems,
        isService: attrs.isService || attrs.businessService || false,
        // Bale-specific fields
        baleId: attrs.baleId,
        condition: attrs.condition,
        bogoActive: attrs.bogoActive,
        bogoRatio: attrs.bogoRatio
      })
    })

    // Mark as imported first to prevent re-runs
    hasImportedGlobalCart.current = true

    // Clear global cart after importing to avoid duplicates
    globalCart.clearCart()

    toast.success(`Loaded ${itemCount} item(s) from cart`)
  }, [globalCart.cart, addToCart, globalCart.clearCart])

  // Handle coupon apply with manager approval for >$5
  const handleApplyCoupon = async (input: string, customerPhone: string) => {
    const coupon = await applyCoupon(input, customerPhone)
    if (coupon) {
      // Manager approval for coupons requiring approval (>$5)
      if (coupon.requiresApproval) {
        const approved = await confirm({
          title: 'Manager Approval Required',
          description: `Coupon ${coupon.code} for $${coupon.discountAmount.toFixed(2)} requires manager approval. Approve this coupon?`,
          confirmText: 'Approve',
          cancelText: 'Deny'
        })
        if (!approved) {
          removeCoupon()
          setDiscount(0)
          return null
        }
      }
      setDiscount(coupon.discountAmount)
      return coupon
    }
    return null
  }

  // Handle coupon removal
  const handleRemoveCoupon = () => {
    removeCoupon()
    setDiscount(0)
  }

  // Handle checkout
  const handleCheckout = async (paymentMethod: 'cash' | 'card' | 'mobile' | 'snap' | 'loyalty', amountPaid?: number) => {
    await processCheckout(cart, totals, {
      paymentMethod,
      amountPaid,
      customerName: undefined,
      customerPhone: undefined,
      customerEmail: undefined,
      notes: undefined,
      attributes: {
        ...(appliedCoupon ? {
          couponId: appliedCoupon.id,
          couponCode: appliedCoupon.code,
          couponDiscount: appliedCoupon.discountAmount,
          couponCustomerPhone: appliedCoupon.customerPhone
        } : {})
      }
    })
  }

  return (
    <BusinessTypeRoute allowedTypes={getSupportedBusinessTypes()}>
      <ContentLayout
        title={`${config.displayName} POS`}
        description={`Point of Sale system for ${config.displayName.toLowerCase()}`}
      >
        <UniversalPOSLayout
          products={products}
          productsLoading={productsLoading}
          cart={cart}
          totals={totals}
          onAddToCart={handleAddToCart}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          onClearCart={clearCart}
          config={config}
          isProcessing={isProcessing}
          onCheckout={handleCheckout}
          businessId={currentBusinessId || undefined}
          onProductsReload={reloadProducts}
          {...(config.features.coupons && currentBusiness?.couponsEnabled ? {
            appliedCoupon,
            isValidatingCoupon,
            couponError,
            onApplyCoupon: handleApplyCoupon,
            onRemoveCoupon: handleRemoveCoupon,
            onClearCouponError: clearCouponError
          } : {})}
        />

        {/* Receipt Preview Modal - same pattern as restaurant POS */}
        <UnifiedReceiptPreviewModal
          isOpen={showReceiptPreview}
          onClose={() => {
            setShowReceiptPreview(false)
            setPendingReceiptData(null)
          }}
          receiptData={pendingReceiptData}
          businessType={businessType as any}
          onPrintConfirm={async (options) => {
            if (!pendingReceiptData) return

            if (printInFlightRef.current) {
              console.log('⚠️ [UniversalPOS] Print already in progress, ignoring')
              return
            }

            printInFlightRef.current = true

            try {
              await ReceiptPrintManager.printReceipt(pendingReceiptData, businessType as any, {
                ...options,
                autoPrint: true,
                onSuccess: (jobId, receiptType) => {
                  console.log(`🖨️ [UniversalPOS] ${receiptType} copy printed:`, jobId)
                },
                onError: (err, receiptType) => {
                  console.error(`❌ [UniversalPOS] ${receiptType} copy failed:`, err)
                }
              })

              setShowReceiptPreview(false)
              setPendingReceiptData(null)
            } catch (error: any) {
              toast.error(`Print error: ${error.message}`)
            } finally {
              printInFlightRef.current = false
            }
          }}
        />
      </ContentLayout>
    </BusinessTypeRoute>
  )
}
