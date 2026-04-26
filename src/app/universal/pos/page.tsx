'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useCallback, useEffect, useRef, useState } from 'react'
import { POSFinancialPanel } from '@/components/pos/POSFinancialPanel'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { SalespersonSelector, type SelectedSalesperson } from '@/components/pos/salesperson-selector'
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
import { useCustomerRewards } from './hooks/useCustomerRewards'
import type { CustomerReward } from './hooks/useCustomerRewards'
import { useConfirm } from '@/components/ui/confirm-modal'
import { getBusinessTypeConfig, getSupportedBusinessTypes } from './config/business-type-config'
import { toast } from 'sonner'
import type { ReceiptData } from '@/types/printing'
import { SalespersonEodModal } from '@/components/eod/salesperson-eod-modal'
import { ManagerOverrideModal, type OrderSummary as CancelOrderSummary } from '@/components/manager-override/manager-override-modal'

/**
 * Universal POS Page
 * Adapts to all 10 business types: grocery, restaurant, clothing, hardware,
 * construction, vehicles, consulting, retail, services, other
 */
export default function UniversalPOS() {
  const { data: session } = useSession()
  const { currentBusiness, currentBusinessId, hasPermission } = useBusinessPermissionsContext()
  const [selectedSalesperson, setSelectedSalesperson] = useState<SelectedSalesperson | null>(null)
  const [financialRefreshKey, setFinancialRefreshKey] = useState(0)
  const searchParams = useSearchParams()
  const globalCart = useGlobalCart()
  const hasImportedGlobalCart = useRef(false)

  // Get business type and configuration
  const businessType = currentBusiness?.businessType || 'other'
  const baseConfig = getBusinessTypeConfig(businessType)
  // Inject ecocash payment method dynamically when the business has it enabled
  const config = currentBusiness?.ecocashEnabled
    ? { ...baseConfig, paymentMethods: [...baseConfig.paymentMethods.filter(m => m !== 'ecocash'), 'ecocash' as const] }
    : baseConfig

  // POS badge visibility permissions
  const canSeeFinancials = hasPermission('canAccessFinancialData')
  const canSeeSoldCount = canSeeFinancials || hasPermission('canViewPOSSoldCount')
  const canSeeStockCount = canSeeFinancials || hasPermission('canViewPOSStockCount')

  // Receipt preview modal state (modal handles its own printer selection)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [pendingReceiptData, setPendingReceiptData] = useState<ReceiptData | null>(null)
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<CancelOrderSummary | null>(null)
  const printInFlightRef = useRef(false)

  // BOGO promotion state
  const [bogoPromotion, setBogoPromotion] = useState<{ isActive: boolean; value: number } | null>(null)

  // EOD gate state (Phase 4 / Phase 8)
  const [eodGate, setEodGate] = useState<{
    hasPending: boolean
    pendingDate: string | null
    deadlinePassed: boolean
    deadlineTime: string | null
    todayStatus: string | null
    todaySubmittedAt: string | null
  } | null>(null)

  useEffect(() => {
    if (!currentBusinessId || !currentBusiness?.requireSalespersonEod) return
    if (currentBusiness?.role !== 'salesperson') return
    fetch(`/api/eod/salesperson/pending?businessId=${currentBusinessId}`)
      .then(r => r.json())
      .then(json => { if (json.success) setEodGate(json) })
      .catch(() => {})
  }, [currentBusinessId, currentBusiness?.requireSalespersonEod, currentBusiness?.role])

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

  // Customer + reward state
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; customerNumber: string; name: string; email?: string; phone?: string; customerType: string } | null>(null)
  const [appliedReward, setAppliedReward] = useState<CustomerReward | null>(null)
  const autoAppliedForRef = useRef<string | null>(null)
  const appliedCouponRef = useRef(appliedCoupon)
  useEffect(() => { appliedCouponRef.current = appliedCoupon }, [appliedCoupon])
  const { rewards: customerRewards, usedRewards: customerUsedRewards, refetch: refetchRewards } = useCustomerRewards(
    selectedCustomer?.id ?? null,
    currentBusinessId ?? null
  )

  const handleSelectCustomer = (customer: { id: string; customerNumber: string; name: string; email?: string; phone?: string; customerType: string } | null) => {
    setSelectedCustomer(customer)
    autoAppliedForRef.current = null  // reset so new customer's reward auto-applies
    // Clear applied reward if customer changes
    if (appliedReward) {
      if (appliedReward.rewardProduct) removeFromCart(`reward_item_${appliedReward.id}`)
      if (appliedReward.wifiConfig) removeFromCart(`r710_reward_wifi_${appliedReward.id}`)
      setAppliedReward(null)
      setDiscount(appliedCoupon ? appliedCoupon.discountAmount : 0)
    }
  }

  // Pre-select customer from URL params (barcode scan navigation) or pos:select-customer event
  useEffect(() => {
    const customerId = searchParams.get('customerId')
    const customerNumber = searchParams.get('customerNumber')
    const customerName = searchParams.get('customerName')
    if (customerId && customerNumber && customerName) {
      handleSelectCustomer({
        id: customerId,
        customerNumber,
        name: customerName,
        phone: searchParams.get('customerPhone') ?? undefined,
        customerType: 'INDIVIDUAL',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const customer = (e as CustomEvent).detail
      if (customer?.id) handleSelectCustomer(customer)
    }
    window.addEventListener('pos:select-customer', handler)
    return () => window.removeEventListener('pos:select-customer', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for pos:add-custom-bulk-to-cart dispatched by GlobalBarcodeModal
  useEffect(() => {
    const handler = (e: Event) => {
      const bulk = (e as CustomEvent).detail
      if (!bulk?.id) return
      const bulkKey = `cbulk_${bulk.id}`
      addToCart({
        id: `cbulk_${bulk.id}_${Date.now()}`,
        name: bulk.name || `Bulk - ${bulk.batchNumber}`,
        sku: bulk.sku || bulk.batchNumber || '',
        quantity: 1,
        unitPrice: parseFloat(bulk.unitPrice),
        productId: bulkKey,
        variantId: bulkKey,
        customBulkId: bulk.id,
        isCustomBulk: true,
      })
    }
    window.addEventListener('pos:add-custom-bulk-to-cart', handler)
    return () => window.removeEventListener('pos:add-custom-bulk-to-cart', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addToCart])

  // Handle addCustomBulk URL param (navigated from non-POS barcode modal "Add to Cart")
  const autoAddCustomBulkProcessed = useRef(false)
  useEffect(() => {
    const addCustomBulkId = searchParams.get('addCustomBulk')
    if (!addCustomBulkId || autoAddCustomBulkProcessed.current) return
    autoAddCustomBulkProcessed.current = true
    fetch(`/api/custom-bulk/${addCustomBulkId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          const bulk = d.data
          const bulkKey = `cbulk_${bulk.id}`
          addToCart({
            id: `cbulk_${bulk.id}_${Date.now()}`,
            name: bulk.name,
            sku: bulk.sku || '',
            quantity: 1,
            unitPrice: Number(bulk.unitPrice),
            productId: bulkKey,
            variantId: bulkKey,
            customBulkId: bulk.id,
            isCustomBulk: true,
          })
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleApplyReward = (reward: CustomerReward) => {
    if (appliedCoupon) {
      toast.error('Cannot combine a reward with a coupon — remove the coupon first')
      return
    }
    setAppliedReward(reward)
    if (Number(reward.rewardAmount) > 0) {
      setDiscount(Number(reward.rewardAmount))
    }
    if (reward.rewardProduct) {
      addToCart({
        id: `reward_item_${reward.id}`,
        name: `${reward.rewardProduct.name} (Free Reward)`,
        quantity: 1,
        unitPrice: 0,
        productId: reward.rewardProductId!,
      })
    }
    if (reward.wifiConfig) {
      addToCart({
        id: `r710_reward_wifi_${reward.id}`,
        name: `${reward.wifiConfig.name} WiFi (Free Reward)`,
        quantity: 1,
        unitPrice: 0,
        isWiFiToken: true,
        isR710Token: true,
        tokenConfigId: reward.wifiTokenConfigId!,
        packageName: reward.wifiConfig.name,
        duration: reward.wifiConfig.durationValue,
        durationUnit: reward.wifiConfig.durationUnit.split('_')[0],
      })
    }
  }

  const handleRemoveReward = () => {
    if (appliedReward) {
      if (Number(appliedReward.rewardAmount) > 0) {
        setDiscount(appliedCoupon ? appliedCoupon.discountAmount : 0)
      }
      if (appliedReward.rewardProduct) removeFromCart(`reward_item_${appliedReward.id}`)
      if (appliedReward.wifiConfig) removeFromCart(`r710_reward_wifi_${appliedReward.id}`)
    }
    setAppliedReward(null)
  }

  // Auto-apply first available ISSUED reward when customer rewards load
  useEffect(() => {
    if (!selectedCustomer || appliedReward || customerRewards.length === 0) return
    if (autoAppliedForRef.current === selectedCustomer.id) return
    if (appliedCouponRef.current) return // Use ref to avoid stale closure — cannot combine coupon + reward
    autoAppliedForRef.current = selectedCustomer.id
    handleApplyReward(customerRewards[0])
    toast.success(`Reward applied: ${customerRewards[0].couponCode}`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerRewards])

  // Sync discount when a coupon is loaded from localStorage (e.g. applied in mini-cart)
  useEffect(() => {
    if (appliedCoupon) {
      setDiscount(appliedCoupon.discountAmount)
    }
  }, [appliedCoupon, setDiscount])

  // Payment processor with business info - no auto-print, show preview instead
  const { processCheckout, isProcessing, lastReceipt, showStockTakeWarning, setShowStockTakeWarning, proceedDespiteStockTake } = usePaymentProcessor(
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
      onSuccess: async (orderId, receiptData) => {
        console.log('✅ Order completed:', orderId)

        // Redeem the applied reward now that we have the orderId
        const rewardToRedeem = appliedReward
        const customerForReward = selectedCustomer

        clearCart()
        globalCart.clearCart()
        removeCoupon()
        reloadProducts()
        setFinancialRefreshKey(k => k + 1)

        // Reset customer reward state
        setAppliedReward(null)

        if (rewardToRedeem && customerForReward) {
          try {
            await fetch('/api/customer-rewards/redeem', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rewardId: rewardToRedeem.id, customerId: customerForReward.id, orderId })
            })
          } catch {
            // Non-critical — order already completed
          }
        }

        // Post-checkout: run campaign eligibility check if customer attached
        if (customerForReward && currentBusinessId) {
          try {
            const runRes = await fetch(`/api/business/${currentBusinessId}/promo-campaigns/run`, { method: 'POST' })
            const runData = await runRes.json()
            if (runData.success && runData.data.newRewardsCount > 0) {
              toast.success(`${customerForReward.name} earned a new reward!`, { duration: 5000 })
              // Fetch the earned reward code to print on receipt
              try {
                const rewardRes = await fetch(`/api/customers/${customerForReward.id}/rewards?businessId=${currentBusinessId}`)
                const rewardData = await rewardRes.json()
                if (rewardData.success && rewardData.data.length > 0) {
                  const earned = rewardData.data[0]
                  const expiryDate = new Date(earned.expiresAt).toLocaleDateString()
                  const rewardLabel = earned.rewardType === 'CREDIT'
                    ? `$${Number(earned.rewardAmount).toFixed(2)} credit`
                    : 'Free WiFi'
                  const earnedMsg = `NEW REWARD EARNED: ${rewardLabel}! Code: ${earned.couponCode} (valid until ${expiryDate})`
                  receiptData.footerMessage = `${earnedMsg}\n${receiptData.footerMessage || 'Thank you for your business!'}`
                }
              } catch { /* non-critical */ }
              refetchRewards()
            }
          } catch {
            // Non-critical
          }
        }

        // Show receipt preview modal
        setPendingReceiptData(receiptData)
        setPendingOrderId(orderId)
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
    // Mutual exclusion: remove active reward before applying coupon
    if (appliedReward) {
      handleRemoveReward()
      toast.info('Reward removed — a coupon and reward cannot be combined')
    }
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

  // Handle clear cart — also clears coupon and reward so POS is ready for next order
  const handleClearCart = () => {
    clearCart()
    removeCoupon()
    setDiscount(0)
    setAppliedReward(null)
    autoAppliedForRef.current = null
  }

  // Handle checkout
  const handleCheckout = async (
    paymentMethod: 'cash' | 'card' | 'mobile' | 'snap' | 'loyalty' | 'ecocash',
    amountPaid?: number,
    ecocashData?: { ecocashTransactionCode: string; ecocashFeeAmount: number; totalWithFee: number }
  ) => {
    await processCheckout(cart, totals, {
      paymentMethod,
      amountPaid,
      customerId: selectedCustomer?.id ?? null,
      customerName: selectedCustomer?.name,
      customerPhone: selectedCustomer?.phone ?? undefined,
      notes: undefined,
      ecocashTransactionCode: ecocashData?.ecocashTransactionCode,
      ecocashFeeAmount: ecocashData?.ecocashFeeAmount,
      salespersonEmployeeId: selectedSalesperson?.employeeId,
      salespersonName: selectedSalesperson?.name,
      attributes: {
        ...(appliedCoupon ? {
          couponId: appliedCoupon.id,
          couponCode: appliedCoupon.code,
          couponDiscount: appliedCoupon.discountAmount,
          couponCustomerPhone: appliedCoupon.customerPhone
        } : {}),
        ...(appliedReward ? {
          rewardId: appliedReward.id,
          rewardCode: appliedReward.couponCode,
          rewardDiscount: Number(appliedReward.rewardAmount)
        } : {})
      }
    })
  }

  return (
    <BusinessTypeRoute allowedTypes={getSupportedBusinessTypes()}>
      {/* EOD blocking overlay */}
      {eodGate?.hasPending && currentBusinessId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-neutral-700">
              <h2 className="text-base font-semibold text-red-700 dark:text-red-400">⛔ Action Required</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                You must submit your EOD report for{' '}
                <span className="font-medium">
                  {eodGate.pendingDate
                    ? new Date(eodGate.pendingDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' })
                    : 'a previous day'}
                </span>{' '}
                before you can process new sales.
              </p>
            </div>
            <SalespersonEodModal
              businessId={currentBusinessId}
              reportDate={eodGate.pendingDate ?? undefined}
              onClose={() => {}}
              onSuccess={() => {
                fetch(`/api/eod/salesperson/pending?businessId=${currentBusinessId}`)
                  .then(r => r.json())
                  .then(json => { if (json.success) setEodGate(json) })
                  .catch(() => {})
              }}
            />
          </div>
        </div>
      )}

      {/* EOD submitted today — non-blocking amber banner */}
      {eodGate?.todayStatus === 'SUBMITTED' && !eodGate?.hasPending && eodGate?.todaySubmittedAt && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-4 py-2 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
          <span>⚠️</span>
          <span>
            Today&apos;s EOD submitted at{' '}
            <span className="font-semibold">
              {new Date(eodGate.todaySubmittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {' '}— new sales are counting towards tomorrow&apos;s report.
          </span>
        </div>
      )}

      <ContentLayout
        title={`${config.displayName} POS`}
        description={`Point of Sale system for ${config.displayName.toLowerCase()}`}
      >
        {/* EOD deadline warning banner */}
        {!eodGate?.hasPending && eodGate?.deadlinePassed && eodGate?.todayStatus === 'PENDING' && currentBusinessId && (
          <div className="mb-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg flex items-center justify-between gap-3">
            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
              ⚠️ EOD submission overdue — please submit your end-of-day report before leaving.
            </p>
            <button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0]
                setEodGate(prev => prev ? { ...prev, hasPending: true, pendingDate: today } : prev)
              }}
              className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-md bg-amber-600 text-white hover:bg-amber-700 transition-colors"
            >
              Submit Now
            </button>
          </div>
        )}
        {/* Salesperson selector — persists across sales on shared terminals */}
        {currentBusinessId && session?.user?.id && (
          <div className="mb-3">
            <SalespersonSelector
              businessId={currentBusinessId}
              currentUserId={session.user.id}
              currentUserName={session.user.name || 'Staff'}
              onSalespersonChange={(sp) => setSelectedSalesperson(sp)}
            />
          </div>
        )}

        {/* Financial summary panel — only for users with canAccessFinancialData */}
        {currentBusinessId && hasPermission('canAccessFinancialData') && (
          <POSFinancialPanel
            businessId={currentBusinessId}
            refreshKey={financialRefreshKey}
          />
        )}

        <UniversalPOSLayout
          products={products}
          productsLoading={productsLoading}
          cart={cart}
          totals={totals}
          onAddToCart={handleAddToCart}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          onClearCart={handleClearCart}
          config={config}
          isProcessing={isProcessing}
          onCheckout={handleCheckout}
          ecocashFeeType={currentBusiness?.ecocashFeeType}
          ecocashFeeValue={currentBusiness?.ecocashFeeValue}
          ecocashMinimumFee={currentBusiness?.ecocashMinimumFee}
          businessId={currentBusinessId || undefined}
          businessType={businessType}
          businessName={currentBusiness?.businessName || undefined}
          businessPhone={currentBusiness?.phone || undefined}
          onProductsReload={reloadProducts}
          prepRefreshKey={financialRefreshKey}
          {...(config.features.coupons && currentBusiness?.couponsEnabled ? {
            appliedCoupon,
            isValidatingCoupon,
            couponError,
            onApplyCoupon: handleApplyCoupon,
            onRemoveCoupon: handleRemoveCoupon,
            onClearCouponError: clearCouponError
          } : {})}
          selectedCustomer={selectedCustomer}
          customerRewards={customerRewards}
          customerUsedRewards={customerUsedRewards}
          appliedReward={appliedReward}
          onSelectCustomer={handleSelectCustomer}
          onApplyReward={handleApplyReward}
          onRemoveReward={handleRemoveReward}
          canViewPOSSoldCount={canSeeSoldCount}
          canViewPOSStockCount={canSeeStockCount}
        />

        {/* Receipt Preview Modal - same pattern as restaurant POS */}
        {/* Stock Take Warning Dialog */}
        {showStockTakeWarning && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
              <div className="p-5">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">⚠️ Stock Take In Progress</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  A stock take is currently in progress for this business. Proceeding with this sale may affect stock count accuracy.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Do you want to proceed with this sale?</p>
              </div>
              <div className="flex border-t border-gray-200 dark:border-gray-700">
                <button onClick={() => setShowStockTakeWarning(false)} className="flex-1 py-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                <button onClick={proceedDespiteStockTake} className="flex-1 py-3 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700">Proceed Anyway</button>
              </div>
            </div>
          </div>
        )}

        {showCancelModal && cancelTarget && (
          <ManagerOverrideModal
            order={cancelTarget}
            businessId={currentBusinessId || ''}
            onApproved={async (managerId, _managerName, finalRefundAmount, staffReason) => {
              try {
                const res = await fetch(`/api/orders/${cancelTarget.orderId}/cancel`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ managerId, staffReason, finalRefundAmount, businessId: currentBusinessId }),
                })
                const data = await res.json()
                if (!res.ok) { toast.error(data.error || 'Could not cancel order'); return }
                setShowCancelModal(false)
                setShowReceiptPreview(false)
                setPendingReceiptData(null)
                setPendingOrderId(null)
                setCancelTarget(null)
              } catch { toast.error('Connection error — please try again') }
            }}
            onAborted={() => setShowCancelModal(false)}
          />
        )}

        <UnifiedReceiptPreviewModal
          isOpen={showReceiptPreview}
          onClose={() => {
            setShowReceiptPreview(false)
            setPendingReceiptData(null)
          }}
          receiptData={pendingReceiptData}
          businessType={businessType as any}
          onCancelOrder={pendingOrderId ? () => {
            if (!pendingReceiptData) return
            const paymentMethod = pendingReceiptData.paymentMethod || 'CASH'
            const isEcocash = paymentMethod.toUpperCase() === 'ECOCASH'
            setCancelTarget({
              orderId: pendingOrderId,
              orderNumber: pendingReceiptData.receiptNumber?.formattedNumber || pendingReceiptData.transactionId || '',
              totalAmount: pendingReceiptData.total,
              paymentMethod,
              createdAt: new Date().toISOString(),
              isEcocash,
              refundAmount: isEcocash ? pendingReceiptData.total - (pendingReceiptData.ecocashFeeAmount ?? 0) * 2 : pendingReceiptData.total,
            })
            setShowCancelModal(true)
          } : undefined}
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
