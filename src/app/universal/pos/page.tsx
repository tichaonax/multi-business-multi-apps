'use client'

import { useEffect } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { UniversalPOSLayout } from './components/UniversalPOSLayout'
import { useUniversalCart } from './hooks/useUniversalCart'
import { useProductLoader } from './hooks/useProductLoader'
import { usePaymentProcessor } from './hooks/usePaymentProcessor'
import { useWiFiTokenSync } from './hooks/useWiFiTokenSync'
import { getBusinessTypeConfig, getSupportedBusinessTypes } from './config/business-type-config'
import { toast } from 'sonner'

/**
 * Universal POS Page
 * Adapts to all 10 business types: grocery, restaurant, clothing, hardware,
 * construction, vehicles, consulting, retail, services, other
 */
export default function UniversalPOS() {
  const { currentBusiness, currentBusinessId } = useBusinessPermissionsContext()

  // Get business type and configuration
  const businessType = currentBusiness?.businessType || 'other'
  const config = getBusinessTypeConfig(businessType)

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

  // Payment processor with business info
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
      autoPrint: true,
      printCopies: 1,
      onSuccess: (orderId, receiptData) => {
        console.log('✅ Order completed:', orderId)
        clearCart()
        reloadProducts()
      },
      onError: (error) => {
        console.error('❌ Checkout error:', error)
      }
    }
  )

  // Sync WiFi tokens on mount if business supports them
  useEffect(() => {
    if (!currentBusinessId || !config.features.wifiTokens) return

    const syncTokens = async () => {
      try {
        // Get WiFi token config IDs from products
        const tokenConfigIds = products
          .filter((p) => p.isWiFiToken && p.tokenConfigId)
          .map((p) => p.tokenConfigId!)

        if (tokenConfigIds.length > 0) {
          console.log('🔄 Syncing WiFi token quantities...')
          await syncESP32TokenQuantities(currentBusinessId, tokenConfigIds)
        }
      } catch (error) {
        console.error('Failed to sync WiFi tokens:', error)
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
        />
      </ContentLayout>
    </BusinessTypeRoute>
  )
}
