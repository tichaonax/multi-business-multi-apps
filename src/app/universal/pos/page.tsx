'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useEffect, useRef, useState } from 'react'
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

  // Initialize cart
  const {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
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
      addToCart({
        id: item.id,
        name: item.name,
        sku: item.sku || '',
        quantity: item.quantity,
        unitPrice: item.price,
        productId: item.productId,
        variantId: item.variantId,
        imageUrl: item.imageUrl || undefined,
        isCombo: item.isCombo,
        comboItems: item.comboItems,
        isService: item.attributes?.isService || item.attributes?.businessService || false
      })
    })

    // Mark as imported first to prevent re-runs
    hasImportedGlobalCart.current = true

    // Clear global cart after importing to avoid duplicates
    globalCart.clearCart()

    toast.success(`Loaded ${itemCount} item(s) from cart`)
  }, [globalCart.cart, addToCart, globalCart.clearCart])

  // Handle checkout
  const handleCheckout = async (paymentMethod: 'cash' | 'card' | 'mobile' | 'snap' | 'loyalty', amountPaid?: number) => {
    await processCheckout(cart, totals, {
      paymentMethod,
      amountPaid,
      customerName: undefined,
      customerPhone: undefined,
      customerEmail: undefined,
      notes: undefined,
      attributes: {}
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
          onAddToCart={addToCart}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          onClearCart={clearCart}
          config={config}
          isProcessing={isProcessing}
          onCheckout={handleCheckout}
          businessId={currentBusinessId || undefined}
          onProductsReload={reloadProducts}
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
