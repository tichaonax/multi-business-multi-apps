'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';

// IMMEDIATE LOG - This will show as soon as the file is loaded
console.log('🔥🔥🔥 [Restaurant POS] MODULE LOADED 🔥🔥🔥')

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { BusinessTypeRedirect } from '@/components/business-type-redirect'
import { BarcodeScanner } from '@/components/universal/barcode-scanner'
import { UniversalProduct } from '@/components/universal/product-card'
import { useState, useEffect, useRef } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { useSession } from 'next-auth/react'

import { useRouter } from 'next/navigation'
import { SessionUser } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { usePrintPreferences } from '@/hooks/use-print-preferences'
import Link from 'next/link'
import { formatDateTime, formatDate } from '@/lib/date-format'
import { ReceiptPrintManager } from '@/lib/receipts/receipt-print-manager'
import { UnifiedReceiptPreviewModal } from '@/components/receipts/unified-receipt-preview-modal'
import { buildReceiptWithBusinessInfo } from '@/lib/printing/receipt-builder'
import type { ReceiptData } from '@/types/printing'
import { formatDuration, formatDataAmount } from '@/lib/printing/format-utils'
import { useCustomerDisplaySync, useOpenCustomerDisplay } from '@/hooks/useCustomerDisplaySync'
import { SyncMode } from '@/lib/customer-display/sync-manager'
import { useGlobalCart } from '@/contexts/global-cart-context'
import { ManualEntryTab } from '@/components/pos/manual-entry-tab'
import type { ManualCartItem } from '@/components/pos/manual-entry-tab'
import { ManualOrderSummary } from '@/components/pos/manual-order-summary'
import { CloseBooksBanner } from '@/components/pos/close-books-banner'
import { QuickStockFromScanModal } from '@/components/inventory/quick-stock-from-scan-modal'
import { MealProgramPanel } from '@/components/restaurant/meal-program/MealProgramPanel'
import { MealProgramDetailsModal } from '@/components/restaurant/meal-program/MealProgramDetailsModal'
import { CustomerLookup } from '@/components/pos/customer-lookup'
import { CustomerQuickRegister } from '@/components/pos/customer-quick-register'
import { useCustomerRewards } from '@/app/universal/pos/hooks/useCustomerRewards'
import type { CustomerReward } from '@/app/universal/pos/hooks/useCustomerRewards'
import { useCoupon } from '@/app/universal/pos/hooks/useCoupon'
import { SalesPerfBadge, DEFAULT_SALES_PERF_THRESHOLDS } from '@/components/pos/SalesPerfBadge'
import type { SalesPerfThresholds } from '@/components/pos/SalesPerfBadge'
import { useTimeDisplay } from '@/hooks/use-time-display'

interface MenuItem {
  id: string
  name: string
  price: number
  category: string
  // optional/extended fields mapped from UniversalProduct
  isAvailable?: boolean
  isCombo?: boolean
  comboItems?: any[]  // Combo contents for display (products, WiFi tokens, etc.)
  requiresCompanionItem?: boolean
  originalPrice?: number | null
  discountPercent?: number | null
  spiceLevel?: number | null
  preparationTime?: number | null
  imageUrl?: string  // Product image for customer display
  variants?: Array<{ id: string; name?: string; price?: number; isAvailable?: boolean }>
  soldToday?: number
  soldYesterday?: number
  firstSoldTodayAt?: string | null
  isInventoryTracked?: boolean
  stockQuantity?: number
  reorderLevel?: number
}

interface CartItem extends MenuItem {
  quantity: number
}

export default function RestaurantPOS() {
  // IMMEDIATE LOG - This will show when component renders
  console.log('🚀🚀🚀 [Restaurant POS] COMPONENT RENDERING 🚀🚀🚀')

  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  // Ref so the pos:add-to-cart event handler always reads the latest menu items
  const menuItemsRef = useRef<MenuItem[]>([])
  useEffect(() => { menuItemsRef.current = menuItems }, [menuItems])
  // Ref so the pos:add-to-cart event handler can call addToCart without capturing
  // a TDZ reference (addToCart is declared later in the component body)
  const addToCartRef = useRef<((item: MenuItem) => void) | null>(null)
  const submitInFlightRef = useRef<{ current: boolean } | any>({ current: false })
  const menuSectionRef = useRef<HTMLDivElement>(null)
  const [orderSubmitting, setOrderSubmitting] = useState(false)
  // Ref-based guard to prevent duplicate print calls (more reliable than state)
  const printInFlightRef = useRef(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; customerNumber: string; name: string; email?: string; phone?: string; customerType: string } | null>(null)
  const [appliedReward, setAppliedReward] = useState<CustomerReward | null>(null)
  const [skipRewardThisTime, setSkipRewardThisTime] = useState(true)
  const autoAppliedForRef = useRef<string | null>(null)
  const [showQuickRegister, setShowQuickRegister] = useState(false)
  const [showRewardHistory, setShowRewardHistory] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [posMode, setPosMode] = useState<'live' | 'manual' | 'meal_program'>('live')
  const [manualCart, setManualCart] = useState<ManualCartItem[]>([])
  const [manualSuccessActive, setManualSuccessActive] = useState(false)
  const [manualResetTrigger, setManualResetTrigger] = useState(0)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [quickStockBarcode, setQuickStockBarcode] = useState<string | null>(null)
  const [quickStockExistingProduct, setQuickStockExistingProduct] = useState<{ id: string; name: string; variantId?: string } | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'MOBILE'>('CASH')
  const [amountReceived, setAmountReceived] = useState('')
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [pendingReceiptData, setPendingReceiptData] = useState<ReceiptData | null>(null)
  const [completedOrder, setCompletedOrder] = useState<any>(null)
  // When non-null: cash amount to collect for a meal program order
  const [mealProgramCashDue, setMealProgramCashDue] = useState<number | null>(null)
  // Pending meal program transaction data (held until payment is confirmed, then submitted to API)
  const [pendingMealTransaction, setPendingMealTransaction] = useState<any>(null)
  // Increment to force-remount MealProgramPanel (resets its internal state)
  const [mealPanelKey, setMealPanelKey] = useState(0)
  const [businessDetails, setBusinessDetails] = useState<any>(null)
  const [taxIncludedInPrice, setTaxIncludedInPrice] = useState(true) // Default: tax included
  const [taxRate, setTaxRate] = useState(0) // Default: 0% - businesses configure their own tax rate
  const [printerId, setPrinterId] = useState<string | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [dailySales, setDailySales] = useState<any>(null)
  const [yesterdaySales, setYesterdaySales] = useState<any>(null)
  const [dayBeforeYesterdaySales, setDayBeforeYesterdaySales] = useState<any>(null)
  const [showDailySales, setShowDailySales] = useState(false)
  const [perfThresholds, setPerfThresholds] = useState<SalesPerfThresholds>(DEFAULT_SALES_PERF_THRESHOLDS)
  const [showMealProgramDetails, setShowMealProgramDetails] = useState(false)
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [showRecentTransactions, setShowRecentTransactions] = useState(false)
  const [lastOrderExpanded, setLastOrderExpanded] = useState(false)
  const [loadingRecent, setLoadingRecent] = useState(false)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [requestingMore, setRequestingMore] = useState<Set<string>>(new Set())
  const { data: session, status } = useSession()
  const router = useRouter()
  const { preferences, isLoaded: preferencesLoaded, setAutoPrint, setDefaultPrinter } = usePrintPreferences()

  // Use the business permissions context for proper business management
  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
    loading: businessLoading,
    businesses,
    hasPermission
  } = useBusinessPermissionsContext()

  // Get user info
  const sessionUser = session?.user as SessionUser
  const employeeId = sessionUser?.id
  const isAdmin = sessionUser?.role === 'admin'
  // Customer rewards hook — must be after currentBusinessId is available
  const { rewards: customerRewards, usedRewards: customerUsedRewards } = useCustomerRewards(
    selectedCustomer?.id ?? null,
    currentBusinessId ?? null
  )

  // Coupon hook — reads coupon applied via mini-cart (shared localStorage)
  const { appliedCoupon, removeCoupon } = useCoupon(currentBusinessId ?? undefined)
  const appliedCouponRef = useRef(appliedCoupon)
  useEffect(() => { appliedCouponRef.current = appliedCoupon }, [appliedCoupon])

  // Global UTC/Local time toggle — determines "today" window for sold-today badge counts
  const { useServerTime } = useTimeDisplay()
  const statsTimezone = useServerTime ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone

  // Toast context (hook) must be called unconditionally to preserve hooks order
  const toast = useToastContext()

  // Global cart context for mini cart sync
  const { cart: globalCart, clearCart: clearGlobalCart, replaceCart: replaceGlobalCart } = useGlobalCart()
  const syncingFromPOS = useRef(false)

  // Get or create terminal ID for this POS instance
  const [terminalId] = useState(() => {
    if (typeof window === 'undefined') return 'terminal-default'
    const stored = localStorage.getItem('pos-terminal-id')
    if (stored) return stored
    const newId = `terminal-${Date.now()}`
    localStorage.setItem('pos-terminal-id', newId)
    return newId
  })

  // Customer Display Sync - broadcast cart updates to customer-facing display
  const { send: sendToDisplay } = useCustomerDisplaySync({
    businessId: currentBusinessId || '',
    terminalId,
    mode: SyncMode.BROADCAST, // Force BroadcastChannel for same-origin communication
    autoConnect: true,
    onError: (error) => console.error('[Customer Display] Sync error:', error)
  })

  // Open Customer Display utility
  const { openDisplay } = useOpenCustomerDisplay(currentBusinessId || '', terminalId)

  // Track if cart has been loaded from localStorage to prevent overwriting on mount
  const [cartLoaded, setCartLoaded] = useState(false)

  // Cart validation warning — populated when stale/invalid items are found on load
  const [cartValidationWarnings, setCartValidationWarnings] = useState<Array<{ name: string; reason: string }>>([])
  const [showCartWarning, setShowCartWarning] = useState(false)

  // Load cart from localStorage on mount (per-business persistence)
  useEffect(() => {
    if (!currentBusinessId) return

    const doLoad = async () => {
      try {
        const savedCart = localStorage.getItem(`cart-${currentBusinessId}`)
        if (savedCart) {
          let parsedCart: CartItem[] = JSON.parse(savedCart)
          console.log('✅ Cart restored from localStorage:', parsedCart.length, 'items')

          // ── Validate cart against DB ──────────────────────────────────────
          if (parsedCart.length > 0) {
            try {
              const res = await fetch('/api/pos/validate-cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  businessId: currentBusinessId,
                  items: parsedCart.map(item => ({
                    id: item.id,
                    productId: item.id, // restaurant cart uses menuItem.id as productId
                    variantId: undefined,
                    name: item.name,
                    quantity: item.quantity,
                    attributes: (item as any).attributes,
                  })),
                }),
              })
              if (res.ok) {
                const { valid, invalid } = await res.json()
                if (invalid && invalid.length > 0) {
                  const validIds = new Set((valid as Array<{ id: string }>).map(v => v.id))
                  parsedCart = parsedCart.filter(item => validIds.has(item.id))
                  setCartValidationWarnings(
                    (invalid as Array<{ item: { id: string; name: string }; reason: string }>).map(({ item, reason }) => ({
                      name: item.name,
                      reason,
                    }))
                  )
                  setShowCartWarning(true)
                }
              }
            } catch (valErr) {
              console.warn('[Cart Validate] Validation request failed, loading cart as-is:', valErr)
            }
          }

          setCart(parsedCart)
        } else {
          // CRITICAL: Clear cart when switching to a business with no saved cart
          setCart([])
          console.log('🔄 Switched to business with no saved cart - cart cleared')
        }
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error)
        setCart([]) // Clear cart on error
      } finally {
        setCartLoaded(true)
      }
    }

    doLoad()
  }, [currentBusinessId])

  // Save cart to localStorage whenever it changes (but only after initial load)
  useEffect(() => {
    if (!currentBusinessId || !cartLoaded) return

    try {
      localStorage.setItem(`cart-${currentBusinessId}`, JSON.stringify(cart))
      console.log('💾 Cart saved to localStorage:', cart.length, 'items')
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error)
    }
  }, [cart, currentBusinessId, cartLoaded])

  // Listen for pos:add-to-cart dispatched by GlobalBarcodeModal when a product
  // is found in this business while on a POS page.
  useEffect(() => {
    const handler = (e: Event) => {
      const { productId, variantId, productName, price } = (e as CustomEvent).detail
      if (!productId) return
      // Try to find the already-loaded menu item first (preserves stock, WiFi token flags, etc.)
      const itemId = variantId ? `${productId}-${variantId}` : productId
      const found = menuItemsRef.current.find(m => m.id === itemId || m.id === productId)
      if (found) {
        addToCartRef.current?.(found)
      } else {
        // Fallback: construct a minimal item from the scan data
        const scannedItem: MenuItem = {
          id: itemId,
          name: productName || 'Scanned Item',
          price: price || 0,
          category: 'scanned',
          isAvailable: true,
        }
        addToCartRef.current?.(scannedItem)
      }
    }
    window.addEventListener('pos:add-to-cart', handler)
    return () => window.removeEventListener('pos:add-to-cart', handler)
  }, [])

  // Auto-apply first available ISSUED reward when customer rewards load (skip if coupon active)
  useEffect(() => {
    if (!selectedCustomer || appliedReward || customerRewards.length === 0) return
    if (autoAppliedForRef.current === selectedCustomer.id) return
    if (appliedCouponRef.current) return // Cannot combine coupon + reward
    autoAppliedForRef.current = selectedCustomer.id
    setAppliedReward(customerRewards[0])
    setSkipRewardThisTime(true) // Loaded but not applied — customer must opt in
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerRewards])

  // Sync POS cart to global cart to keep mini cart in sync
  useEffect(() => {
    if (!currentBusinessId || !cartLoaded) return

    try {
      syncingFromPOS.current = true
      // Replace global cart to match POS cart exactly
      const globalCartItems = cart.map(item => ({
        productId: item.id,
        variantId: item.variants?.[0]?.id || item.id, // Use first variant or item id
        name: item.name,
        sku: item.variants?.[0]?.sku || item.barcode || item.id, // Use variant SKU, barcode, or fallback to ID
        price: item.price,
        quantity: item.quantity,
        attributes: {},

        imageUrl: item.imageUrl,
        // Include combo data for mini cart display
        isCombo: (item as any).isCombo || false,
        comboItems: (item as any).comboItems || null
      }))
      replaceGlobalCart(globalCartItems)
    } catch (error) {
      console.error('❌ [Restaurant POS] Failed to sync to global cart:', error)
    } finally {
      setTimeout(() => { syncingFromPOS.current = false }, 50)
    }
  }, [cart, currentBusinessId, cartLoaded, replaceGlobalCart])

  // Sync global cart → POS cart when mini cart removes or clears items
  useEffect(() => {
    if (!currentBusinessId || !cartLoaded || syncingFromPOS.current) return

    if (globalCart.length === 0) {
      setCart([])
    } else {
      setCart(prev => prev.filter(item => {
        const variantId = item.variants?.[0]?.id || item.id
        return globalCart.some(g => g.variantId === variantId)
      }))
    }
  }, [globalCart, currentBusinessId, cartLoaded])

  // Broadcast cart state to customer display after cart is loaded
  useEffect(() => {
    if (!currentBusinessId || !cartLoaded || !terminalId) return

    // Broadcast the current cart state to customer display
    broadcastCartState(cart)
  }, [cartLoaded, currentBusinessId, terminalId])

  // Signal active business to customer display when business changes
  useEffect(() => {
    if (!currentBusinessId) {
      return
    }

    let isActive = true

    async function initializeDisplay() {
      try {
        // CRITICAL: Signal which business is active FIRST
        // This allows customer display to work with multiple businesses
        console.log('[POS] Signaling active business:', currentBusinessId)
        sendToDisplay('SET_ACTIVE_BUSINESS', {
          subtotal: 0,
          tax: 0,
          total: 0
        })

        // Try to open display (may fail if already open or popup blocked - that's OK)
        try {
          await openDisplay()
        } catch (displayError) {
          // Display may already be open from home page
        }

        // Fetch full business details from API to get all fields
        const response = await fetch(`/api/business/${currentBusinessId}`)
        if (!response.ok) {
          return
        }
        const data = await response.json()
        const businessData = data.business

        // Store tax settings from business data
        if (businessData) {
          setTaxIncludedInPrice(businessData.taxIncludedInPrice ?? true)
          setTaxRate(businessData.taxRate ? Number(businessData.taxRate) : 0) // Default to 0, let admin configure
          console.log('[POS] Tax settings:', {
            taxIncludedInPrice: businessData.taxIncludedInPrice,
            taxRate: businessData.taxRate
          })
        }

        // Fetch employee photo before the delay so it's ready when greeting is sent
        const photoData = await fetch('/api/employees/my-photo').then(r => r.json()).catch(() => ({}))

        // Wait for BroadcastChannel to initialize on BOTH windows
        await new Promise(resolve => setTimeout(resolve, 2000))

        if (!isActive) return

        // Send employee greeting only (business info comes from customer display API)
        const greetingData = {
          employeeName: sessionUser?.name || 'Staff',
          employeePhotoUrl: photoData?.profilePhotoUrl || undefined,
          subtotal: 0,
          tax: 0,
          total: 0
        }

        sendToDisplay('SET_GREETING', greetingData)

        // Set page context to POS
        sendToDisplay('SET_PAGE_CONTEXT', {
          pageContext: 'pos',
          subtotal: 0,
          tax: 0,
          total: 0
        })
      } catch (error) {
        console.error('[POS] Failed to initialize customer display:', error)
      }
    }

    initializeDisplay()

    // Cleanup: Set context back to marketing when unmounting
    return () => {
      isActive = false
      sendToDisplay('SET_PAGE_CONTEXT', {
        pageContext: 'marketing',
        subtotal: 0,
        tax: 0,
        total: 0
      })
    }
  // IMPORTANT: Re-run when currentBusinessId changes to signal business switch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusinessId])

  // Notify customer display when selected customer, reward, or reward opt-in changes
  useEffect(() => {
    let rewardMessage: string | null = null
    let rewardApplied = false
    if (appliedReward) {
      const parts = [
        Number(appliedReward.rewardAmount) > 0 && `$${Number(appliedReward.rewardAmount).toFixed(2)} reward`,
        appliedReward.rewardProduct && `Free ${appliedReward.rewardProduct.name}`,
        appliedReward.wifiConfig && `Free WiFi (${appliedReward.wifiConfig.name})`,
      ].filter(Boolean).join(' + ')
      if (!skipRewardThisTime) {
        rewardMessage = `✅ ${parts} applied to this order!`
        rewardApplied = true
      } else {
        rewardMessage = `🎁 You have a ${parts} waiting — ask your cashier!`
      }
    }
    sendToDisplay('SET_CUSTOMER', {
      customerName: selectedCustomer?.name || null,
      rewardMessage,
      rewardApplied,
    })
  }, [selectedCustomer, appliedReward, skipRewardThisTime])


  // Broadcast cart state to customer display
  const broadcastCartState = (cartItems: CartItem[]) => {
    console.log('[POS] Broadcasting cart state, items:', cartItems.length)
    const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0)

    // Calculate tax and total based on business settings
    let tax: number
    let total: number

    if (taxIncludedInPrice) {
      // Tax is embedded in prices - calculate for display
      // Formula: embedded tax = subtotal * (rate / (100 + rate))
      tax = subtotal * (taxRate / (100 + taxRate))
      total = subtotal // Total equals subtotal (tax already included)
    } else {
      // Tax is NOT included, add it to subtotal
      tax = subtotal * (taxRate / 100)
      total = subtotal + tax
    }

    const rewardCredit = (appliedReward && !skipRewardThisTime)
      ? Math.min(Number(appliedReward.rewardAmount), subtotal)
      : 0
    const discountedTotal = Math.max(0, total - rewardCredit)

    // Build reward available hint (shown in cart when reward exists but not yet applied and payment not started)
    let rewardAvailableMessage: string | undefined
    if (appliedReward && skipRewardThisTime && !showPaymentModal) {
      const parts = [
        Number(appliedReward.rewardAmount) > 0 && `$${Number(appliedReward.rewardAmount).toFixed(2)} reward`,
        appliedReward.rewardProduct && `Free ${appliedReward.rewardProduct.name}`,
        appliedReward.wifiConfig && `Free WiFi (${appliedReward.wifiConfig.name})`,
      ].filter(Boolean).join(' + ')
      rewardAvailableMessage = `🎁 You have a ${parts} — ask cashier to apply!`
    }

    const cartMessage = {
      items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: Number(item.price),
        variant: item.category,
        imageUrl: item.imageUrl,
        isCombo: (item as any).isCombo || false,
        comboItems: (item as any).comboItems || null
      })),
      subtotal,
      tax,
      total: discountedTotal,
      discountAmount: rewardCredit > 0 ? rewardCredit : undefined,
      discountLabel: rewardCredit > 0 ? `Reward (${appliedReward!.couponCode})` : undefined,
      rewardAvailableMessage,
    }

    console.log('[POS] Sending CART_STATE:', {
      subtotal,
      tax,
      total,
      taxIncludedInPrice,
      taxRate
    })

    // CRITICAL: Signal active business, page context, then cart state
    // This ensures customer display shows the correct business even if it opens after POS
    sendToDisplay('SET_ACTIVE_BUSINESS', {
      subtotal: 0,
      tax: 0,
      total: 0
    })

    sendToDisplay('SET_PAGE_CONTEXT', {
      pageContext: 'pos',
      subtotal: 0,
      tax: 0,
      total: 0
    })

    sendToDisplay('CART_STATE', cartMessage)
  }

  // Sync cart state whenever cart changes AND periodically for reliability
  useEffect(() => {
    if (!currentBusinessId) return

    // Immediate sync when cart changes
    broadcastCartState(cart)

    // Periodic sync every 3 seconds to ensure customer display stays in sync
    // This handles cases where messages might be lost or pages refreshed
    const syncInterval = setInterval(() => {
      broadcastCartState(cart)
    }, 3000)

    return () => clearInterval(syncInterval)
  }, [cart, currentBusinessId, taxIncludedInPrice, taxRate, appliedReward, skipRewardThisTime, showPaymentModal])

  // Broadcast payment amount updates to customer display
  useEffect(() => {
    if (!showPaymentModal || !amountReceived) return

    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0)
    const tax = taxIncludedInPrice
      ? subtotal * (taxRate / (100 + taxRate))
      : subtotal * (taxRate / 100)
    const baseTotal = taxIncludedInPrice ? subtotal : subtotal + tax
    const total = Math.max(0, baseTotal - rewardCredit - couponDiscount)
    const tendered = parseFloat(amountReceived) || 0

    sendToDisplay('PAYMENT_AMOUNT', {
      subtotal,
      tax,
      total,
      amountTendered: tendered,
      paymentMethod: paymentMethod
    })
  }, [amountReceived, showPaymentModal, cart, taxRate, taxIncludedInPrice, paymentMethod])

  // Check if current business is a restaurant business
  const isRestaurantBusiness = currentBusiness?.businessType === 'restaurant'

  const categories = ['all', 'combos', 'appetizers', 'mains', 'desserts', 'beverages', 'esp32-wifi', 'r710-wifi']

  // Category label formatter
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'all': 'All',
      'combos': 'Combos',
      'appetizers': 'Appetizers',
      'mains': 'Mains',
      'desserts': 'Desserts',
      'beverages': 'Beverages',
      'esp32-wifi': '📡 ESP32 WiFi',
      'r710-wifi': '📶 R710 WiFi'
    }
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1)
  }

  // Background ESP32 sync function (non-blocking, progressive updates)
  const syncESP32TokenQuantities = async (businessId: string, tokenConfigIds: string[]) => {
    try {
      console.log('🔄 Starting batched ESP32 sync in background...')

      const BATCH_SIZE = 20
      let offset = 0
      let hasMore = true
      const esp32TokenSet = new Set<string>()

      // Fetch ESP32 tokens in batches
      while (hasMore && offset < 1000) {
        try {
          const batchUrl = `/api/wifi-portal/esp32-tokens?businessId=${businessId}&status=unused&limit=${BATCH_SIZE}&offset=${offset}`
          const batchResponse = await fetch(batchUrl)

          if (!batchResponse.ok) {
            console.warn(`⚠️ ESP32 batch ${Math.floor(offset / BATCH_SIZE) + 1} failed`)
            break
          }

          const batchData = await batchResponse.json()
          const batchTokens = batchData.tokens || []

          batchTokens.forEach((t: any) => {
            if (t.token) esp32TokenSet.add(t.token)
          })

          hasMore = batchData.hasMore === true
          offset += BATCH_SIZE
        } catch (batchError) {
          console.error(`❌ ESP32 batch ${Math.floor(offset / BATCH_SIZE) + 1} error:`, batchError)
          break
        }
      }

      console.log(`✅ ESP32 sync complete. Total: ${esp32TokenSet.size}`)

      // Get database tokens
      const dbResponse = await fetch(`/api/wifi-portal/tokens?businessId=${businessId}&status=UNUSED&excludeSold=true&limit=1000`)
      if (!dbResponse.ok) return

      const dbData = await dbResponse.json()
      const dbTokens = dbData.tokens || []

      // Cross-reference
      const esp32QuantityMap: Record<string, number> = {}
      dbTokens.forEach((dbToken: any) => {
        if (esp32TokenSet.has(dbToken.token)) {
          const configId = dbToken.tokenConfigId
          if (configId && tokenConfigIds.includes(configId)) {
            esp32QuantityMap[configId] = (esp32QuantityMap[configId] || 0) + 1
          }
        }
      })

      console.log('✅ ESP32 quantity map:', esp32QuantityMap)

      // Update menu items state with accurate ESP32 counts
      setMenuItems(prev => prev.map(item => {
        if ((item as any).esp32Token) {
          const tokenConfigId = (item as any).tokenConfigId
          const esp32Count = esp32QuantityMap[tokenConfigId]
          if (esp32Count !== undefined) {
            console.log(`🔄 Updating ${item.name} quantity: ${(item as any).availableQuantity} → ${esp32Count}`)
            return {
              ...item,
              availableQuantity: esp32Count
            }
          }
        }
        return item
      }))
    } catch (error) {
      console.error('❌ Background ESP32 sync error:', error)
    }
  }

  // Background R710 WLAN sync function (non-blocking)
  const syncR710Wlan = async (businessId: string) => {
    try {
      console.log('🔄 Starting R710 WLAN sync in background...')

      const response = await fetch('/api/r710/integration/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.changed) {
          console.log(`✅ R710 WLAN synced: ${data.previousSsid} → ${data.currentSsid}`)
        } else {
          console.log('✅ R710 WLAN already up to date')
        }
      } else {
        const errorData = await response.json()
        // Silently log errors - don't disrupt POS operation
        console.log('ℹ️ R710 WLAN sync skipped:', errorData.error)
      }
    } catch (error) {
      // Silently catch errors - sync is non-critical for POS operation
      console.log('ℹ️ R710 WLAN sync not available')
    }
  }

  // Load menu items (defined early so hooks order is stable).
  const loadMenuItems = async () => {
    try {
      // Use currentBusinessId if available, otherwise use businessType filter
      const queryParams = new URLSearchParams({
        businessType: 'restaurant',
        isAvailable: 'true',
        isActive: 'true',
        includeVariants: 'true', // Include variants to get stock quantities
        includeImages: 'true', // Include product images for customer display
        limit: '500' // High limit to get all products
      })

      // If specific business selected, filter by that business
      if (currentBusinessId) {
        queryParams.set('businessId', currentBusinessId)
      }

      // Fetch products, purchase statistics, WiFi tokens, and menu combos in parallel
      const [productsResponse, statsResponse, wifiTokensResponse, combosResponse] = await Promise.all([
        fetch(`/api/universal/products?${queryParams.toString()}`),
        fetch(`/api/restaurant/product-stats?businessId=${currentBusinessId || ''}&timezone=${encodeURIComponent(statsTimezone)}`),
        currentBusinessId ? fetch(`/api/business/${currentBusinessId}/wifi-tokens`) : Promise.resolve({ ok: false }),
        currentBusinessId ? fetch(`/api/universal/menu-combos?businessId=${currentBusinessId}`) : Promise.resolve({ ok: false })
      ])

      if (productsResponse.ok) {
        const data = await productsResponse.json()
        if (data.success) {
          // Get purchase counts if available
          let purchaseCounts: Record<string, number> = {}
          let soldTodayCounts: Record<string, number> = {}
          let soldYesterdayCounts: Record<string, number> = {}
          let firstSoldTodayAtMap: Record<string, string | null> = {}
          if (statsResponse.ok) {
            const statsData = await statsResponse.json()
            console.log('[POS] Stats API response:', { success: statsData.success, dataCount: statsData.data?.length, sample: statsData.data?.slice(0, 3) })
            if (statsData.success && statsData.data) {
              statsData.data.forEach((item: any) => {
                purchaseCounts[item.productId] = item.totalSold || 0
                soldTodayCounts[item.productId] = item.soldToday || 0
                soldYesterdayCounts[item.productId] = item.soldYesterday || 0
                firstSoldTodayAtMap[item.productId] = item.firstSoldTodayAt || null
              })
            }
          } else {
            console.warn('[POS] Stats API failed:', statsResponse.status, statsResponse.statusText)
          }

          // Transform universal products to menu items format
          const items = data.data
            .filter((product: any) => {
              // Only show available, active items with a valid price > 0
              if (!product.isAvailable || !product.isActive) return false
              const price = Number(product.basePrice)
              return price > 0 && !isNaN(price)
            })
            .map((product: any) => {
              // Get primary image or first image for customer display
              const primaryImage = product.images?.find((img: any) => img.isPrimary) || product.images?.[0]
              const imageUrl = primaryImage?.imageUrl || primaryImage?.url

              return {
                id: product.id,
                name: product.name,
                price: product.basePrice,
                category: product.category?.name || 'uncategorized',
                isAvailable: product.isAvailable,
                isCombo: product.isCombo,
                requiresCompanionItem: product.requiresCompanionItem,
                originalPrice: product.originalPrice,
                discountPercent: product.discountPercent,
                spiceLevel: product.spiceLevel,
                preparationTime: product.preparationTime,
                imageUrl: imageUrl, // Product image for customer display
                variants: product.variants,
                purchaseCount: purchaseCounts[product.id] || 0,
                soldToday: soldTodayCounts[product.id] || 0,
                soldYesterday: soldYesterdayCounts[product.id] || 0,
                firstSoldTodayAt: firstSoldTodayAtMap[product.id] || null,
                isInventoryTracked: product.isInventoryTracked ?? false,
                stockQuantity: product.variants?.[0]?.stockQuantity ?? 0,
                reorderLevel: product.variants?.[0]?.reorderLevel ?? 0
              }
            })


          // Debug: log mapping results
          const itemsWithSoldToday = items.filter((i: any) => i.soldToday > 0)
          console.log(`[POS] Menu items: ${items.length}, with soldToday > 0: ${itemsWithSoldToday.length}`)
          if (items.length > 0) {
            console.log('[POS] Sample product IDs:', items.slice(0, 3).map((i: any) => i.id))
            console.log('[POS] soldTodayCounts keys:', Object.keys(soldTodayCounts).slice(0, 3))
          }

          items
            // Sort by:
            // (1) Items sold today come before unsold items (position locked by first-sale time)
            // (2) Among sold-today items: sort by firstSoldTodayAt ASC (earliest sold = first position, locked for the day)
            // (3) Among unsold items: sort by purchase history then name
            .sort((a: any, b: any) => {
              const aSoldToday = (a.soldToday || 0) > 0
              const bSoldToday = (b.soldToday || 0) > 0

              // Sold-today items always come first
              if (aSoldToday !== bSoldToday) return aSoldToday ? -1 : 1

              if (aSoldToday && bSoldToday) {
                // Both sold today — sort by when they were first sold (earliest = leftmost, position locked)
                const aTime = a.firstSoldTodayAt ? new Date(a.firstSoldTodayAt).getTime() : Infinity
                const bTime = b.firstSoldTodayAt ? new Date(b.firstSoldTodayAt).getTime() : Infinity
                return aTime - bTime
              }

              // Both unsold — keep default order: purchase history then name
              if (b.purchaseCount !== a.purchaseCount) return b.purchaseCount - a.purchaseCount
              return a.name.localeCompare(b.name)
            })

          // Add WiFi tokens to menu if available
          let wifiTokenItems: any[] = []
          if (wifiTokensResponse.ok) {
            const wifiData = await wifiTokensResponse.json()
            if (wifiData.success && wifiData.menuItems) {
              // Fetch available quantities for all token configs
              const tokenConfigIds = wifiData.menuItems.map((item: any) => item.tokenConfigId)
              let quantityMap: Record<string, number> = {}
              
              if (tokenConfigIds.length > 0) {
                try {
                  // STEP 1: Get database counts IMMEDIATELY (non-blocking)
                  const dbUrl = `/api/wifi-portal/tokens?businessId=${currentBusinessId}&status=UNUSED&excludeSold=true&limit=1000`
                  const dbResponse = await fetch(dbUrl)

                  if (dbResponse.ok) {
                    const dbData = await dbResponse.json()
                    const dbTokens = dbData.tokens || []

                    // Count by tokenConfigId (quick estimate)
                    quantityMap = dbTokens.reduce((acc: Record<string, number>, token: any) => {
                      const configId = token.tokenConfigId
                      if (configId && tokenConfigIds.includes(configId)) {
                        acc[configId] = (acc[configId] || 0) + 1
                      }
                      return acc
                    }, {})
                  }
                } catch (error) {
                  console.error('❌ Database fetch error:', error)
                }
              }

              wifiTokenItems = wifiData.menuItems
                .filter((item: any) => item.isActive)
                .map((item: any) => ({
                  id: `wifi-token-${item.id}`,
                  name: `📡 ${item.tokenConfig.name}`,
                  price: item.businessPrice,
                  category: 'esp32-wifi',
                  isAvailable: true,
                  wifiToken: true, // Flag to identify ESP32 WiFi tokens
                  esp32Token: true, // Flag for ESP32 tokens
                  businessTokenMenuItemId: item.id,
                  tokenConfigId: item.tokenConfigId,
                  tokenConfig: item.tokenConfig,
                  availableQuantity: quantityMap[item.tokenConfigId] || 0,
                }))

              // STEP 2: Start background ESP32 sync (non-blocking, progressive updates)
              if (tokenConfigIds.length > 0 && currentBusinessId) {
                console.log('🔄 [Step 2] Starting background ESP32 sync...')
                syncESP32TokenQuantities(currentBusinessId, tokenConfigIds).catch(err => {
                  console.error('❌ Background ESP32 sync failed:', err)
                })
              }
            }
          }

          // Add R710 WiFi tokens to menu if integration exists
          let r710TokenItems: any[] = []
          try {
            const r710IntegrationResponse = await fetch(`/api/r710/integration?businessId=${currentBusinessId}`, {
              credentials: 'include'
            })

            if (r710IntegrationResponse.ok) {
              const r710Integration = await r710IntegrationResponse.json()

              if (r710Integration.hasIntegration) {
                // Start background R710 WLAN sync (non-blocking)
                if (currentBusinessId) {
                  syncR710Wlan(currentBusinessId).catch(() => {
                    // Silently ignore - already handled in function
                  })
                }

                // Fetch R710 token menu items for this business (only enabled items)
                const r710MenuResponse = await fetch(`/api/business/${currentBusinessId}/r710-tokens`, {
                  credentials: 'include'
                })

                if (r710MenuResponse.ok) {
                  const r710MenuData = await r710MenuResponse.json()
                  const r710MenuItems = r710MenuData.menuItems || []

                  if (r710MenuItems.length > 0) {
                    console.log('🔍 [R710 Menu Items]:', r710MenuItems)

                    // For each menu item, count truly available tokens
                    let r710AvailabilityMap: Record<string, number> = {}

                    for (const menuItem of r710MenuItems) {
                      try {
                        // Fetch available tokens for this specific config
                        const tokensResponse = await fetch(
                          `/api/r710/tokens?businessId=${currentBusinessId}&tokenConfigId=${menuItem.tokenConfigId}&status=AVAILABLE`,
                          { credentials: 'include' }
                        )

                        if (tokensResponse.ok) {
                          const tokensData = await tokensResponse.json()
                          // Filter out tokens that have been sold
                          const availableTokens = (tokensData.tokens || []).filter((token: any) => {
                            return token.status === 'AVAILABLE'
                          })
                          r710AvailabilityMap[menuItem.tokenConfigId] = availableTokens.length
                        }
                      } catch (err) {
                        console.error(`Error fetching tokens for config ${menuItem.tokenConfigId}:`, err)
                        r710AvailabilityMap[menuItem.tokenConfigId] = 0
                      }
                    }

                    console.log('✅ R710 availability map:', r710AvailabilityMap)

                    r710TokenItems = r710MenuItems
                      .filter((item: any) => item.isActive)
                      .map((item: any) => ({
                        id: `r710-token-${item.id}`,
                        name: `📶 ${item.tokenConfig.name}`,
                        price: item.businessPrice, // Use business price, not base price
                        category: 'r710-wifi',
                        isAvailable: true,
                        r710Token: true, // Flag to identify R710 WiFi tokens
                        businessTokenMenuItemId: item.id,
                        tokenConfigId: item.tokenConfigId,
                        tokenConfig: item.tokenConfig,
                        availableQuantity: r710AvailabilityMap[item.tokenConfigId] || 0,
                      }))

                    console.log(`✅ Loaded ${r710TokenItems.length} R710 token menu items`)
                  }
                }
              }
            }
          } catch (r710Error) {
            console.error('Error loading R710 tokens:', r710Error)
            // Don't fail if R710 tokens fail to load
          }

          // Process menu combos
          let comboItems: any[] = []
          if (combosResponse.ok) {
            try {
              const combosData = await combosResponse.json()
              if (combosData.success && combosData.data) {
                comboItems = combosData.data
                  .filter((combo: any) => combo.isActive && combo.isAvailable && Number(combo.totalPrice) > 0)
                  .map((combo: any) => ({
                    id: `combo-${combo.id}`,
                    name: `🍽️ ${combo.name}`,
                    price: Number(combo.totalPrice),
                    category: 'combos',
                    isAvailable: true,
                    isCombo: true,
                    comboId: combo.id,
                    comboData: combo, // Store full combo data for order processing
                    originalPrice: combo.originalTotalPrice && Number(combo.originalTotalPrice) > 0 ? Number(combo.originalTotalPrice) : null,
                    discountPercent: combo.discountPercent ? Number(combo.discountPercent) : null,
                    preparationTime: combo.preparationTime,
                    comboItems: combo.comboItems, // Include combo items for display
                    soldToday: soldTodayCounts[`combo-${combo.id}`] || 0,
                    soldYesterday: soldYesterdayCounts[`combo-${combo.id}`] || 0,
                    firstSoldTodayAt: firstSoldTodayAtMap[`combo-${combo.id}`] || null,
                  }))
                console.log(`✅ Loaded ${comboItems.length} menu combos`)
              }
            } catch (comboError) {
              console.error('Error processing combos:', comboError)
            }
          }

          // Merge regular items, combos, ESP32 WiFi tokens, and R710 WiFi tokens
          setMenuItems([...items, ...comboItems, ...wifiTokenItems, ...r710TokenItems])
        }
      }
    } catch (error) {
      console.error('Failed to load menu items:', error)
      toast.error('Failed to load menu items')
    }
  }

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Fetch actual business details (with address/phone from businesses table)
  useEffect(() => {
    if (!currentBusinessId) return

    const fetchBusinessDetails = async () => {
      try {
        const response = await fetch(`/api/business/${currentBusinessId}`)
        if (response.ok) {
          const data = await response.json()
          console.log('📍 [Business Details] Fetched:', data.business)
          setBusinessDetails(data.business)  // Extract business object from response
        }
      } catch (error) {
        console.error('❌ Failed to fetch business details:', error)
      }
    }

    fetchBusinessDetails()
  }, [currentBusinessId])

  // Reset submit ref on mount to prevent stuck state
  useEffect(() => {
    submitInFlightRef.current = false
    console.log('✅ Submit ref reset on mount')
  }, [])

  // Trigger loading of menu items when authenticated
  useEffect(() => {
    if (status === 'loading' || businessLoading) return
    if (!isAuthenticated) return

    // Load items if:
    // 1) User is admin (can access without business selection)
    // 2) Restaurant business is selected
    if (isAdmin || isRestaurantBusiness) {
      loadMenuItems()
    }
  }, [currentBusinessId, isRestaurantBusiness, status, businessLoading, isAuthenticated, isAdmin, useServerTime])

  // Debug: Log cart changes
  useEffect(() => {
    console.log('🛒 Cart updated:', cart.length, 'items')
    cart.forEach(item => {
      console.log(`  - ${item.name} x${item.quantity} @ $${item.price}`)
    })
  }, [cart])

  // Load printer ID from preferences or API
  useEffect(() => {
    const loadPrinter = async () => {
      // First try to use default printer from preferences
      if (preferencesLoaded && preferences.defaultPrinterId) {
        setPrinterId(preferences.defaultPrinterId)
        console.log('🖨️ Using default printer from preferences:', preferences.defaultPrinterId)
        return
      }

      // Otherwise, query for EPSON TM-T20III receipt printer
      try {
        const response = await fetch('/api/printers?printerType=receipt&isOnline=true')
        if (response.ok) {
          const data = await response.json()
          const epsonPrinter = data.printers?.find((p: any) =>
            p.printerName?.includes('EPSON TM-T20III') ||
            p.printerName?.includes('TM-T20III')
          )

          if (epsonPrinter) {
            setPrinterId(epsonPrinter.id)
            console.log('🖨️ Found EPSON TM-T20III printer:', epsonPrinter.printerName)
          } else if (data.printers?.length > 0) {
            // Fallback to first available receipt printer
            setPrinterId(data.printers[0].id)
            console.log('🖨️ Using first available printer:', data.printers[0].printerName)
          } else {
            console.warn('⚠️ No receipt printers found')
          }
        }
      } catch (error) {
        console.error('Failed to load printer:', error)
      }
    }

    if (preferencesLoaded) {
      loadPrinter()
    }
  }, [preferencesLoaded, preferences.defaultPrinterId])

  // Handle receipt printing with unified system
  const handlePrintReceipt = async (receiptData: ReceiptData) => {
    // Ref-based guard to prevent duplicate print calls
    if (printInFlightRef.current) {
      console.log('⚠️ [Restaurant POS] Print already in progress (ref guard), ignoring duplicate call')
      return
    }

    // Also check state for consistency
    if (isPrinting) {
      console.log('⚠️ [Restaurant POS] Print already in progress (state guard), ignoring duplicate call')
      return
    }

    // Set ref immediately (synchronous) to block subsequent calls
    printInFlightRef.current = true

    try {
      setIsPrinting(true)
      console.log('🖨️ [Restaurant POS] Starting print job at:', new Date().toISOString())

      await ReceiptPrintManager.printReceipt(receiptData, 'restaurant', {
        autoPrint: preferences.autoPrintReceipt,
        printerId: printerId || undefined,
        printCustomerCopy: false, // Default: only business copy. Set to true to print customer copy
        onSuccess: (jobId, receiptType) => {
          console.log(`✅ ${receiptType} copy printed:`, jobId)
          toast.push(`${receiptType} receipt sent to printer`)
        },
        onError: (error, receiptType) => {
          console.error(`❌ ${receiptType} receipt print failed:`, error)
          toast.error(`Error printing ${receiptType} receipt: ${error.message}`)
        },
        onShowPreview: (data, options) => {
          // Show unified preview modal
          setPendingReceiptData(data)
          setShowReceiptPreview(true)
        }
      })

      // Close completed order modal after successful print
      if (preferences.autoPrintReceipt) {
        setTimeout(() => {
          setShowReceiptModal(false)
          setCompletedOrder(null)
        }, 1500)
      }

    } catch (error: any) {
      console.error('❌ Receipt print error:', error)
      toast.error(`Print error: ${error.message}`)
    } finally {
      printInFlightRef.current = false
      setIsPrinting(false)
      console.log('🖨️ [Restaurant POS] Print job finished at:', new Date().toISOString())
    }
  }

  // Auto-print receipt when order completes (if preference enabled)
  // Track if we've already auto-printed for the current order to prevent duplicates
  const autoPrintedOrderRef = useRef<string | null>(null)

  useEffect(() => {
    if (showReceiptModal && completedOrder && preferences.autoPrintReceipt && currentBusiness) {
      // Prevent duplicate auto-prints for the same order
      const orderNumber = completedOrder.orderNumber
      if (autoPrintedOrderRef.current === orderNumber) {
        console.log('⚠️ [Restaurant POS] Already auto-printed for order:', orderNumber)
        return
      }

      // Also check if a print is already in progress
      if (printInFlightRef.current) {
        console.log('⚠️ [Restaurant POS] Print already in progress, skipping auto-print')
        return
      }

      console.log('🖨️ [Restaurant POS] Auto-printing receipt for order:', orderNumber)
      autoPrintedOrderRef.current = orderNumber

      // Build receipt data from completed order
      const receiptData = buildReceiptDataFromCompletedOrder(completedOrder, businessDetails || currentBusiness)
      handlePrintReceipt(receiptData)
    }
  }, [showReceiptModal, completedOrder])

  // Helper function to convert completedOrder to ReceiptData
  const buildReceiptDataFromCompletedOrder = (order: any, business: any): ReceiptData => {
    // Use businessInfo from order (API response), fallback to businessDetails or business (membership)
    const actualBusiness = order.businessInfo || businessDetails || business
    const businessName = actualBusiness?.name || actualBusiness?.businessName || 'Restaurant'
    const businessAddress = actualBusiness?.address || actualBusiness?.umbrellaBusinessAddress || ''
    const businessPhone = actualBusiness?.phone || actualBusiness?.umbrellaBusinessPhone || ''

    return {
      receiptNumber: {
        globalId: order.orderNumber,
        dailySequence: order.orderNumber.split('-').pop() || '001',
        formattedNumber: order.orderNumber
      },
      businessId: currentBusinessId || '',
      businessType: 'restaurant',
      businessName: businessName,
      businessAddress: businessAddress,
      businessPhone: businessPhone,
      businessEmail: actualBusiness?.email || actualBusiness?.settings?.email,
      transactionId: order.orderNumber,
      transactionDate: new Date(),
      salespersonName: session?.user?.name || 'Staff',
      salespersonId: session?.user?.id || '',
      items: order.items.map((item: any, index: number) => ({
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
        isCombo: !!item.isCombo,
        // Mark the first item as the subsidized meal program item
        notes: order.attributes?.mealProgram && index === 0
          ? `[Meals Program] Subsidy: $${Number(order.attributes.expenseAmount || 0.50).toFixed(2)}`
          : undefined,
      })),
      subtotal: order.subtotal,
      tax: 0,
      total: order.total,
      paymentMethod: order.paymentMethod?.toLowerCase() || 'cash',
      amountPaid: order.amountReceived,
      changeDue: order.change,
      wifiTokens: order.wifiTokens?.map((token: any) => {
        console.log('📡 [Restaurant] Mapping ESP32 WiFi token:', token)
        const mapped = {
          tokenCode: token.tokenCode,
          packageName: token.packageName || token.itemName || 'WiFi Access',
          duration: token.duration || 0,
          bandwidthDownMb: token.bandwidthDownMb || 0,
          bandwidthUpMb: token.bandwidthUpMb || 0,
          ssid: token.ssid,
          portalUrl: token.portalUrl,
          instructions: token.instructions,
          success: token.success,
          error: token.error
        }
        console.log('📡 [Restaurant] Mapped ESP32 token:', mapped)
        return mapped
      }),
      r710Tokens: order.r710Tokens?.map((token: any) => {
        console.log('📶 [Restaurant] Mapping R710 WiFi token:', token)

        // Calculate expiration date if not provided
        let expiresAt = token.expiresAt
        if (!expiresAt && token.durationValue && token.durationUnit) {
          const now = new Date()
          const expirationDate = new Date(now)
          const unit = token.durationUnit.toLowerCase()

          if (unit.includes('hour')) {
            expirationDate.setHours(expirationDate.getHours() + token.durationValue)
          } else if (unit.includes('day')) {
            expirationDate.setDate(expirationDate.getDate() + token.durationValue)
          } else if (unit.includes('week')) {
            expirationDate.setDate(expirationDate.getDate() + (token.durationValue * 7))
          } else if (unit.includes('month')) {
            expirationDate.setMonth(expirationDate.getMonth() + token.durationValue)
          } else if (unit.includes('year')) {
            expirationDate.setFullYear(expirationDate.getFullYear() + token.durationValue)
          }

          expiresAt = expirationDate.toISOString()
        }

        const mapped = {
          password: token.password,
          packageName: token.packageName || token.itemName || 'R710 WiFi Access',
          durationValue: token.durationValue || 0,
          durationUnit: token.durationUnit || 'hour_Hours',
          expiresAt: expiresAt,
          ssid: token.ssid,
          success: token.success,
          error: token.error
        }
        console.log('📶 [Restaurant] Mapped R710 token:', mapped)
        return mapped
      }),
      discount: Number(order.discountAmount) > 0 ? Number(order.discountAmount) : undefined,
      discountLabel: Number(order.discountAmount) > 0
        ? (order.rewardCouponCode ? `Reward (${order.rewardCouponCode})` : 'Reward Applied')
        : undefined,
      footerMessage: order.footerMessage || 'Thank you for dining with us!',
      customerName: order.customerName || (order.attributes?.mealProgram ? order.attributes?.participantName : undefined),
      customerPhone: order.customerPhone,
      mealProgram: order.attributes?.mealProgram
        ? {
            participantName: order.attributes.participantName || '',
            subsidyAmount: String(order.attributes.expenseAmount || '0.50'),
            cashAmount: String(order.attributes.cashAmount || '0.00'),
          }
        : undefined,
    }
  }

  // Load daily sales summary (today + yesterday + day before yesterday for comparison)
  const loadDailySales = async () => {
    if (!currentBusinessId) return

    try {
      const tz = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yStr = yesterday.toISOString().split('T')[0]
      const dayBefore = new Date()
      dayBefore.setDate(dayBefore.getDate() - 2)
      const dbStr = dayBefore.toISOString().split('T')[0]

      const [todayRes, yRes, dbRes] = await Promise.all([
        fetch(`/api/restaurant/daily-sales?businessId=${currentBusinessId}&timezone=${tz}`),
        fetch(`/api/restaurant/daily-sales?businessId=${currentBusinessId}&timezone=${tz}&date=${yStr}`),
        fetch(`/api/restaurant/daily-sales?businessId=${currentBusinessId}&timezone=${tz}&date=${dbStr}`)
      ])
      if (todayRes.ok) {
        const data = await todayRes.json()
        setDailySales(data.data)
      }
      if (yRes.ok) {
        const yData = await yRes.json()
        setYesterdaySales(yData.data)
      }
      if (dbRes.ok) {
        const dbData = await dbRes.json()
        setDayBeforeYesterdaySales(dbData.data)
      }
    } catch (error) {
      console.error('Failed to load daily sales:', error)
    }
  }

  // Load last 5 transactions for today only
  const loadRecentTransactions = async () => {
    if (!currentBusinessId) return
    setLoadingRecent(true)
    try {
      const params = new URLSearchParams({
        businessId: currentBusinessId,
        includeItems: 'true',
        limit: '5',
        page: '1',
        dateRange: 'today',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      const response = await fetch(`/api/universal/orders?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const txns = data.data || []
          setRecentTransactions(txns)
        }
      }
    } catch (error) {
      console.error('Failed to load recent transactions:', error)
    } finally {
      setLoadingRecent(false)
    }
  }

  // Load daily sales and recent transactions on mount
  useEffect(() => {
    if (currentBusinessId && isRestaurantBusiness) {
      loadDailySales()
      loadRecentTransactions()
      // Load configurable sales performance thresholds
      fetch(`/api/universal/business-config?businessId=${currentBusinessId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((cfg) => {
          const t = cfg?.data?.pos?.salesPerformanceThresholds
          if (t?.fairMin && t?.goodMin && t?.maxBar) setPerfThresholds(t)
        })
        .catch(() => { /* keep defaults on error */ })
    }
  }, [currentBusinessId, isRestaurantBusiness])

  // Periodic refresh of stats (daily sales + sold today counts) every 30s for multi-user accuracy
  useEffect(() => {
    if (!currentBusinessId || !isRestaurantBusiness) return

    const interval = setInterval(async () => {
      // Refresh daily sales summary and recent transactions together
      loadDailySales()
      loadRecentTransactions()

      // Lightweight refresh of product sold-today counts (without reloading full product list)
      try {
        const tz = encodeURIComponent(statsTimezone)
        const statsResponse = await fetch(`/api/restaurant/product-stats?businessId=${currentBusinessId}&timezone=${tz}`)
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          if (statsData.success && statsData.data) {
          const soldTodayCounts: Record<string, number> = {}
            const soldYesterdayCounts: Record<string, number> = {}
            const firstSoldTodayAtMap: Record<string, string | null> = {}
            statsData.data.forEach((item: any) => {
              soldTodayCounts[item.productId] = item.soldToday || 0
              soldYesterdayCounts[item.productId] = item.soldYesterday || 0
              firstSoldTodayAtMap[item.productId] = item.firstSoldTodayAt || null
            })
            setMenuItems(prev => {
              const updated = prev.map(item => ({
                ...item,
                soldToday: soldTodayCounts[item.id] || 0,
                soldYesterday: soldYesterdayCounts[item.id] || 0,
                // Only set firstSoldTodayAt if not already locked in (preserve position)
                firstSoldTodayAt: item.firstSoldTodayAt || firstSoldTodayAtMap[item.id] || null,
              }))
              // Re-sort: sold-today items by firstSoldTodayAt ASC, then unsold by purchase history
              return [...updated].sort((a, b) => {
                const aSold = (a.soldToday || 0) > 0
                const bSold = (b.soldToday || 0) > 0
                if (aSold !== bSold) return aSold ? -1 : 1
                if (aSold && bSold) {
                  const aTime = a.firstSoldTodayAt ? new Date(a.firstSoldTodayAt).getTime() : Infinity
                  const bTime = b.firstSoldTodayAt ? new Date(b.firstSoldTodayAt).getTime() : Infinity
                  return aTime - bTime
                }
                if ((b as any).purchaseCount !== (a as any).purchaseCount) return (b as any).purchaseCount - (a as any).purchaseCount
                return a.name.localeCompare(b.name)
              })
            })
          }
        }
      } catch (error) {
        console.error('[POS] Stats refresh failed:', error)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [currentBusinessId, isRestaurantBusiness, useServerTime])

  // Reload daily sales and menu items after completing an order
  useEffect(() => {
    if (completedOrder && currentBusinessId) {
      // Reload sales data and menu (WiFi token counts) after a short delay to allow order to be processed
      setTimeout(() => {
        loadDailySales()
        loadMenuItems() // Refresh WiFi token availability badges
        loadRecentTransactions()

        // Desktop only: scroll so menu items align with the top of the sticky Order Summary panel
        if (typeof window !== 'undefined' && window.innerWidth >= 1024 && menuSectionRef.current) {
          const top = menuSectionRef.current.getBoundingClientRect().top + window.scrollY - 80
          window.scrollTo({ top, behavior: 'smooth' })
        }
      }, 500)
    }
  }, [completedOrder])

  // Show loading while session or business context is loading
  if (status === 'loading' || businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Don't render if no session or no business access
  if (!session || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need to be logged in to use the POS system.</p>
        </div>
      </div>
    )
  }

  // Check if user has any restaurant businesses
  const restaurantBusinesses = businesses.filter(b => b.businessType === 'restaurant' && b.isActive)
  const hasRestaurantBusinesses = restaurantBusinesses.length > 0

  // For non-admin users: require restaurant business selection
  if (!isAdmin) {
    // If current business is not restaurant (and one is selected), show error
    if (currentBusiness && !isRestaurantBusiness) {
      return <BusinessTypeRedirect />
    }

    // If no restaurant business selected, show prompt
    if (!currentBusinessId || !isRestaurantBusiness) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Select a Restaurant Business</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please select a restaurant business from the sidebar to access the POS system.
            </p>
            {hasRestaurantBusinesses && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Available restaurant businesses:</p>
                {restaurantBusinesses.slice(0, 3).map(business => (
                  <div key={business.businessId} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="font-medium">{business.businessName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Role: {business.role}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    }
  }

  // Get businessId for order processing - use current business or first restaurant business
  const businessId = currentBusinessId || restaurantBusinesses[0]?.businessId || ''

  

  const addToCart = async (item: MenuItem) => {
    console.log('➕ Adding to cart:', item.name, 'Price:', item.price)

    const isESP32Token = (item as any).esp32Token === true
    const isR710Token = (item as any).r710Token === true
    const isAnyWiFiToken = isESP32Token || isR710Token

    // Block out-of-stock inventory-tracked items
    if (item.isInventoryTracked && (item.stockQuantity ?? 0) === 0) {
      toast.push(`"${item.name}" is out of stock.`, { type: 'warning', duration: 4000 })
      return
    }

    // Check portal health before adding ESP32 WiFi tokens
    if (isESP32Token) {
      try {
        const healthResponse = await fetch(`/api/wifi-portal/integration/health?businessId=${currentBusinessId}`)
        const healthData = await healthResponse.json()

        if (!healthData.success || healthData.health?.status !== 'healthy') {
          toast.push(`ESP32 WiFi Portal is currently unavailable. Cannot add ESP32 WiFi tokens to cart.`, {
            type: 'warning',
            duration: 6000
          })
          return
        }
      } catch (error) {
        toast.push(`Failed to verify ESP32 WiFi Portal status. Please try again.`, {
          type: 'warning',
          duration: 6000
        })
        return
      }
    }

    // Check available quantity for WiFi tokens (both ESP32 and R710)
    if (isAnyWiFiToken) {
      const availableQuantity = (item as any).availableQuantity || 0
      const currentCartQuantity = cart.find(c => c.id === item.id)?.quantity || 0

      if (availableQuantity <= currentCartQuantity) {
        const tokenType = isR710Token ? 'R710 WiFi' : 'ESP32 WiFi'
        if (availableQuantity === 0) {
          toast.push(`No ${tokenType} tokens available for "${item.name}".\n\nPlease create more tokens in the portal.`, {
            type: 'warning',
            duration: 7000
          })
        } else {
          toast.push(`Only ${availableQuantity} ${tokenType} token${availableQuantity === 1 ? '' : 's'} available for "${item.name}".`, {
            type: 'warning',
            duration: 6000
          })
        }
        return
      }
    }

    // Prevent adding $0 items to cart (except WiFi tokens)
    const isWiFiToken = isAnyWiFiToken
    if (!isWiFiToken && (!item.price || item.price <= 0)) {
      toast.push(`Cannot add "${item.name}" with $0 price to cart. Please set a price first or use discounts for price reductions.`, {
        type: 'warning',
        duration: 6000
      })
      return
    }

    // Check if item requires a companion item (e.g., side dish that needs a main)
    if (item.requiresCompanionItem) {
      // Check if cart has any items from the same category
      const hasCompanionInCart = cart.some(cartItem =>
        cartItem.category === item.category && !cartItem.requiresCompanionItem
      )

      if (!hasCompanionInCart) {
        console.log('⚠️ Companion item required, blocking add')
        toast.error(`"${item.name}" cannot be sold alone. Please add a main item from ${item.category} first.`)
        return
      }
    }

    setCart(prev => {
      const existing = prev.find(i => i.id === item.id)
      let newCart: CartItem[]
      if (existing) {
        console.log('✅ Item already in cart, incrementing quantity')
        newCart = prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      } else {
        console.log('✅ Adding new item to cart')
        newCart = [...prev, { ...item, quantity: 1 }]
      }
      // Broadcast updated cart to customer display
      broadcastCartState(newCart)
      return newCart
    })
  }
  // Keep ref current on every render so pos:add-to-cart event handler is never null
  addToCartRef.current = addToCart

  const handleProductScanned = (product: any, variantId?: string) => {
    // Check if product is available
    if (!(product as any).isAvailable) {
      toast.push(`${product.name} is currently unavailable`)
      return
    }

    // If variant is specified, check variant availability
    const variant = variantId ? (product.variants || []).find((v: any) => v.id === variantId) : undefined
    if (variant && !(variant as any).isAvailable) {
      toast.push(`${product.name} (${variant.name}) is currently unavailable`)
      return
    }

    // Convert UniversalProduct to MenuItem format
    const menuItem: MenuItem = {
      id: variantId ? `${product.id}-${variantId}` : product.id,
      name: product.name + (variant?.name ? ` (${variant.name})` : ''),
      price: variant?.price || product.basePrice,
      category: 'scanned',
      isAvailable: true, // We've already checked availability
      originalPrice: (product as any).originalPrice,
      discountPercent: (product as any).discountPercent,
      spiceLevel: (product as any).spiceLevel,
      preparationTime: (product as any).preparationTime
    }

    addToCart(menuItem)
  }

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const newCart = prev.filter(i => i.id !== itemId)
      // Broadcast updated cart to customer display
      broadcastCartState(newCart)
      return newCart
    })
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }
    // Cap WiFi token items at available quantity
    const cartItem = cart.find(i => i.id === itemId)
    if (cartItem && ((cartItem as any).esp32Token || (cartItem as any).r710Token)) {
      const available = (cartItem as any).availableQuantity || 0
      if (quantity > available) {
        toast.push(`Only ${available} token${available === 1 ? '' : 's'} available for "${cartItem.name}".`, {
          type: 'warning',
          duration: 4000
        })
        return
      }
    }
    setCart(prev => {
      const newCart = prev.map(i => i.id === itemId ? { ...i, quantity } : i)
      // Broadcast updated cart to customer display
      broadcastCartState(newCart)
      return newCart
    })
  }

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0)
  const rewardCredit = (appliedReward && !skipRewardThisTime) ? Math.min(Number(appliedReward.rewardAmount), subtotal) : 0
  const couponDiscount = appliedCoupon ? Math.min(appliedCoupon.discountAmount, Math.max(0, subtotal - rewardCredit)) : 0
  const total = Math.max(0, subtotal - rewardCredit - couponDiscount)

  // Manual cart helpers
  const addToManualCart = (item: ManualCartItem) => {
    // If the success modal is showing, dismiss it and start fresh with this item
    if (manualSuccessActive) {
      setManualSuccessActive(false)
      setManualResetTrigger(n => n + 1)
      setManualCart([item])
      return
    }
    setManualCart(prev => {
      // For custom items, always add as new entry
      if (item.isCustom) return [...prev, item]
      // For menu items, increment quantity if already in cart
      const existing = prev.find(c => c.id === item.id)
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, item]
    })
  }

  const updateManualCartQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      setManualCart(prev => prev.filter(c => c.id !== id))
    } else {
      setManualCart(prev => prev.map(c => c.id === id ? { ...c, quantity: qty } : c))
    }
  }

  const removeFromManualCart = (id: string) => {
    setManualCart(prev => prev.filter(c => c.id !== id))
  }

  const clearManualCart = () => setManualCart([])

  // Map category filter names to actual database category names
  const getCategoryFilter = (filterName: string): string => {
    const categoryMap: Record<string, string> = {
      'appetizers': 'Appetizers',
      'mains': 'Main Courses',
      'desserts': 'Desserts',
      'beverages': 'Beverages'
    }
    return categoryMap[filterName] || filterName
  }

  const categoryFiltered = selectedCategory === 'all'
    ? menuItems
    : selectedCategory === 'combos'
    ? menuItems.filter(item => item.isCombo === true)
    : menuItems.filter(item => item.category === getCategoryFilter(selectedCategory))

  const filteredItems = (searchTerm.trim()
    ? categoryFiltered.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : categoryFiltered
  ).sort((a, b) => {
    const aSold = (a.soldToday || 0) > 0
    const bSold = (b.soldToday || 0) > 0

    // Sold-today items always come first
    if (aSold !== bSold) return aSold ? -1 : 1

    if (aSold && bSold) {
      // Both sold today — preserve first-sale-time order (position locked for the day)
      const aTime = a.firstSoldTodayAt ? new Date(a.firstSoldTodayAt).getTime() : Infinity
      const bTime = b.firstSoldTodayAt ? new Date(b.firstSoldTodayAt).getTime() : Infinity
      return aTime - bTime
    }

    // Both unsold — sort by purchase history then name
    const aPurchase = (a as any).purchaseCount || 0
    const bPurchase = (b as any).purchaseCount || 0
    if (bPurchase !== aPurchase) return bPurchase - aPurchase
    return a.name.localeCompare(b.name)
  })

  const handleProcessOrderClick = () => {
    console.log('🔄 Process Order clicked')
    if (cart.length === 0) {
      console.log('❌ Cart is empty, not processing')
      return
    }

    // Calculate totals for payment broadcast (must match component-level total with discounts)
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const tax = taxIncludedInPrice
      ? subtotal * (taxRate / (100 + taxRate))
      : subtotal * (taxRate / 100)
    const baseTotal = taxIncludedInPrice ? subtotal : subtotal + tax
    const total = Math.max(0, baseTotal - rewardCredit - couponDiscount)

    // Broadcast payment started to customer display
    sendToDisplay('PAYMENT_STARTED', {
      subtotal,
      tax,
      total,
      paymentMethod: paymentMethod
    })

    // Open payment modal
    setAmountReceived('') // Start at zero so cashier can enter amount received
    setShowPaymentModal(true)
  }

  const completeOrderWithPayment = async () => {
    // Meal-program cash payment — create transaction now that payment is collected
    if (mealProgramCashDue !== null) {
      const received = parseFloat(amountReceived) || 0
      if (pendingMealTransaction) {
        // Submit the transaction to the API now (after payment confirmed)
        setOrderSubmitting(true)
        try {
          const res = await fetch('/api/restaurant/meal-program/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessId: currentBusinessId,
              ...(pendingMealTransaction.participantId
                ? { participantId: pendingMealTransaction.participantId }
                : { employeeId: pendingMealTransaction.employeeId }),
              subsidizedItem: pendingMealTransaction.subsidizedItem,
              cashItems: pendingMealTransaction.cashItems,
              soldByEmployeeId: employeeId,
            }),
          })
          const data = await res.json()
          if (!res.ok || !data.success) {
            toast.error(data.error || 'Transaction failed')
            setOrderSubmitting(false)
            return
          }
          setCompletedOrder((prev: any) => prev ? {
            ...prev,
            orderNumber: data.data.orderNumber,
            customerName: pendingMealTransaction.participantName,
            paymentMethod: 'CASH',
            amountReceived: received,
            change: Math.max(0, received - mealProgramCashDue),
          } : prev)
          setPendingMealTransaction(null)
          setMealPanelKey(k => k + 1)
        } catch {
          toast.error('Transaction failed')
          setOrderSubmitting(false)
          return
        }
        setOrderSubmitting(false)
      } else {
        // Transaction already saved (fully subsidised path shouldn't reach here, but handle gracefully)
        setCompletedOrder((prev: any) => prev ? {
          ...prev,
          paymentMethod: 'CASH',
          amountReceived: received,
          change: Math.max(0, received - mealProgramCashDue),
        } : prev)
      }
      setShowPaymentModal(false)
      setMealProgramCashDue(null)
      setAmountReceived('')
      setShowReceiptModal(true)
      return
    }

    console.log('💳 Completing order with payment')
    console.log('Cart items:', cart)
    console.log('Payment method:', paymentMethod)
    console.log('Amount received:', amountReceived)

    // Prevent duplicate concurrent submissions
    if (submitInFlightRef.current || orderSubmitting) {
      console.log('⏸️ Already processing an order, skipping')
      return
    }
    submitInFlightRef.current = true
    setOrderSubmitting(true)

    try {
      console.log('📤 Sending order request...')
      // Generate a simple idempotency key per submission
      const idempotencyKey = generateUuid()

      const requestBody = {
        items: cart,
        total,
        discountAmount: rewardCredit + couponDiscount,
        rewardId: (appliedReward && !skipRewardThisTime) ? appliedReward.id : undefined,
        ...(appliedCoupon ? {
          couponId: appliedCoupon.id,
          couponCode: appliedCoupon.code,
          couponDiscount: couponDiscount,
          couponCustomerPhone: appliedCoupon.customerPhone
        } : {}),
        businessId: businessId,
        paymentMethod: paymentMethod,
        amountReceived: paymentMethod === 'CASH' ? parseFloat(amountReceived) : total,
        idempotencyKey,
        customerId: selectedCustomer?.id || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }
      console.log('Request body:', requestBody)

      const response = await fetch('/api/restaurant/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (response.ok) {
        const result = await response.json()

        // DEBUG: Log API response to see token data
        console.log('🔍 [API Response - Full Result]:', result)
        console.log('📡 [ESP32 Tokens]:', result.wifiTokens)
        console.log('📶 [R710 Tokens]:', result.r710Tokens)
        console.log('🏢 [Business Info]:', result.businessInfo)

        // Store completed order with all details for receipt
        // Build items array — include free reward product if API returned one
        const receiptItems: CartItem[] = [...cart]
        if (result.rewardFreeItem) {
          receiptItems.push({ ...result.rewardFreeItem, id: 'reward-free', category: 'promo' })
        }

        const orderForReceipt: {
          orderNumber: any; items: any[]; subtotal: number; total: number;
          discountAmount?: number; rewardCouponCode?: string;
          paymentMethod: string; amountReceived: number; change: number; date: string;
          wifiTokens: any; r710Tokens: any; businessInfo: any; footerMessage?: string;
          customerName?: string; customerPhone?: string
        } = {
          orderNumber: result.orderNumber,
          items: receiptItems,
          subtotal: total + rewardCredit, // show pre-discount subtotal
          total: total,
          discountAmount: rewardCredit > 0 ? rewardCredit : undefined,
          rewardCouponCode: (appliedReward && !skipRewardThisTime) ? appliedReward.couponCode : undefined,
          paymentMethod: paymentMethod,
          amountReceived: paymentMethod === 'CASH' ? parseFloat(amountReceived) : total,
          change: paymentMethod === 'CASH' ? parseFloat(amountReceived) - total : 0,
          date: formatDateTime(new Date()),
          wifiTokens: result.wifiTokens || [], // ESP32 tokens
          r710Tokens: result.r710Tokens || [],  // R710 tokens
          businessInfo: result.businessInfo,    // Business details (address, phone)
          customerName: selectedCustomer?.name,
          customerPhone: selectedCustomer?.phone
        }

        // Post-checkout: run campaign eligibility for attached customer
        const customerForReward = selectedCustomer
        if (customerForReward && businessId) {
          try {
            const runRes = await fetch(`/api/business/${businessId}/promo-campaigns/run`, { method: 'POST' })
            const runData = await runRes.json()
            if (runData.success && runData.data.newRewardsCount > 0) {
              toast.push(`${customerForReward.name} earned a new reward!`, { type: 'success', duration: 5000 })
              // Fetch earned reward code to print on receipt
              try {
                const rewardRes = await fetch(`/api/customers/${customerForReward.id}/rewards?businessId=${businessId}`)
                const rewardData = await rewardRes.json()
                if (rewardData.success && rewardData.data.length > 0) {
                  const earned = rewardData.data[0]
                  const expiryDate = new Date(earned.expiresAt).toLocaleDateString()
                  const rewardLabel = earned.rewardType === 'CREDIT'
                    ? `$${Number(earned.rewardAmount).toFixed(2)} credit`
                    : 'Free WiFi'
                  orderForReceipt.footerMessage = `NEW REWARD EARNED: ${rewardLabel}! Code: ${earned.couponCode} (valid until ${expiryDate})\nThank you for dining with us!`
                }
              } catch { /* non-critical */ }
            }
          } catch { /* non-critical */ }
        }

        setCompletedOrder(orderForReceipt)

        // Close payment modal
        setShowPaymentModal(false)

        // Show receipt modal
        setShowReceiptModal(true)

        // Broadcast payment complete to customer display (cart will clear after 4 seconds on display)
        sendToDisplay('PAYMENT_COMPLETE', {
          subtotal: total,
          tax: 0,
          total: total,
          customerName: selectedCustomer?.name || null
        })

        // Optimistic stock update: decrement stockQuantity for sold inventory-tracked items
        // (cart is still the pre-clear snapshot here — React async closure)
        const inventorySold = cart.filter(i => i.isInventoryTracked)
        if (inventorySold.length > 0) {
          setMenuItems(prev => prev.map(menuItem => {
            const sold = inventorySold.find(c => c.id === menuItem.id)
            if (sold) {
              return { ...menuItem, stockQuantity: Math.max(0, (menuItem.stockQuantity ?? 0) - sold.quantity) }
            }
            return menuItem
          }))
        }

        // Clear cart on POS and global cart
        setCart([])
        clearGlobalCart()
        // Clear any coupon applied via mini-cart
        removeCoupon()
        window.dispatchEvent(new Event('coupon-removed'))

        // Reset customer for next sale
        setSelectedCustomer(null)
        setAppliedReward(null)
        setSkipRewardThisTime(false)
        setShowRewardHistory(false)
        autoAppliedForRef.current = null
        setShowQuickRegister(false)

        // Reset payment fields
        setPaymentMethod('CASH')
        setAmountReceived('')

        console.log('✅ Order created:', result.orderNumber)

      } else {
        // Handle error response
        const errorData = await response.json().catch(() => null)
        const errorMessage = errorData?.error || errorData?.message || 'Failed to process order'
        console.error('Order processing failed:', errorMessage, errorData)

        // Use error toast with longer duration for critical errors
        toast.error(`Order Failed:\n\n${errorMessage}`)
      }
    } catch (error: any) {
      console.error('Order processing error:', error)
      toast.error(`Order Failed:\n\n${error.message || 'Network error occurred. Please try again.'}`)
    }
    finally {
      submitInFlightRef.current = false
      setOrderSubmitting(false)
    }
  }

  // Simple UUID generator (v4-like). Good enough for client-side idempotency keys.
  const generateUuid = () => {
    // Return a RFC4122 v4 compliant UUID via simple random approach
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }
  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      {/* ── Cart validation warning dialog ────────────────────────────────── */}
      {showCartWarning && cartValidationWarnings.length > 0 && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="px-5 py-4 bg-amber-500 dark:bg-amber-600 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="text-base font-bold text-white">Stale cart items removed</h3>
                <p className="text-xs text-amber-100">
                  {cartValidationWarnings.length} item{cartValidationWarnings.length !== 1 ? 's' : ''} from your saved cart
                  {cartValidationWarnings.length !== 1 ? ' were' : ' was'} no longer valid and{' '}
                  {cartValidationWarnings.length !== 1 ? 'have' : 'has'} been removed automatically.
                </p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-2 max-h-64 overflow-y-auto">
              {cartValidationWarnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <span className="text-red-500 mt-0.5 shrink-0">✕</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{w.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{w.reason}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 pb-4 pt-2">
              <button
                onClick={() => {
                  setShowCartWarning(false)
                  setCartValidationWarnings([])
                }}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold text-sm"
              >
                OK — Continue with valid items
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen page-background bg-white dark:bg-gray-900">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 p-2 lg:p-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="space-y-2">
              <h1 className="text-lg sm:text-2xl font-bold text-primary">Point of Sale</h1>
              <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                <button
                  onClick={async () => {
                    try {
                      await openDisplay()
                    } catch (error) {
                      toast.error('Failed to open customer display. Please allow popups for this site.')
                    }
                  }}
                  className="px-2 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs sm:text-sm font-medium"
                  title="Open Customer Display"
                >
                  🖥️ <span className="hidden sm:inline">Display</span>
                </button>
                <Link
                  href="/restaurant/settings/pos"
                  className="px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium"
                  title="POS Settings"
                >
                  ⚙️ <span className="hidden sm:inline">Settings</span>
                </Link>
                {/* Menu Management - Only for users with canManageMenu permission */}
                {(isAdmin || hasPermission('canManageMenu')) && (
                  <Link
                    href="/restaurant/menu"
                    className="px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium"
                  >
                    📋 <span className="hidden sm:inline">Menu</span>
                  </Link>
                )}
                <Link
                  href="/restaurant/orders"
                  className="px-2 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-sm font-medium"
                >
                  📦 <span className="hidden sm:inline">Orders</span>
                </Link>
                {/* Reports - Only for users with report access */}
                {(isAdmin || hasPermission('canViewWifiReports') || hasPermission('canAccessFinancialData')) && (
                  <>
                    <Link
                      href="/restaurant/reports"
                      className="px-2 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm font-medium"
                    >
                      📊 <span className="hidden sm:inline">Reports</span>
                    </Link>
                    <Link
                      href="/restaurant/reports/end-of-day"
                      className="px-2 sm:px-4 py-1.5 sm:py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors text-xs sm:text-sm font-medium"
                    >
                      🌙 <span className="hidden sm:inline">End of Day</span>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Live / Manual Entry Mode Toggle */}
            {(isAdmin || hasPermission('canEnterManualOrders')) && (
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
                <button
                  onClick={() => setPosMode('live')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    posMode === 'live'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Live POS
                </button>
                <button
                  onClick={() => setPosMode('manual')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    posMode === 'manual'
                      ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Manual Entry
                </button>
                <button
                  onClick={() => setPosMode('meal_program')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    posMode === 'meal_program'
                      ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  🍱 Meal Program
                </button>
              </div>
            )}

            {/* Daily Sales Summary Widget - Only for users with financial access */}
            {dailySales && (isAdmin || hasPermission('canAccessFinancialData') || hasPermission('canViewWifiReports')) && (
              <div className="card bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-4 rounded-lg shadow">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                    📈 Today's Sales
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                      ({formatDate(dailySales.businessDay.start)} - {formatDate(dailySales.businessDay.end)})
                    </span>
                  </h2>
                  <div className="flex items-center gap-3">
                    <SalesPerfBadge sales={dailySales.summary.totalSales} thresholds={perfThresholds} />
                    <button
                      onClick={() => setShowDailySales(!showDailySales)}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                    >
                      {showDailySales ? '▼ Hide Details' : '▶ Show Details'}
                    </button>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Sales</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      ${dailySales.summary.totalSales.toFixed(2)}
                    </div>
                    {yesterdaySales && (() => {
                      const yVal = yesterdaySales.summary?.totalSales ?? 0
                      const diff = dailySales.summary.totalSales - yVal
                      const pct = yVal > 0 ? (diff / yVal) * 100 : null
                      return (
                        <div className="text-xs mt-0.5 flex items-center justify-between gap-1">
                          <span className={diff >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {diff >= 0 ? '↑' : '↓'} vs yesterday ${yVal.toFixed(2)}
                            {pct !== null && ` (${Math.abs(pct).toFixed(0)}%)`}
                          </span>
                          <SalesPerfBadge sales={yVal} size="sm" thresholds={perfThresholds} />
                        </div>
                      )
                    })()}
                    {dayBeforeYesterdaySales && (() => {
                      const dbVal = dayBeforeYesterdaySales.summary?.totalSales ?? 0
                      const diff = dailySales.summary.totalSales - dbVal
                      const pct = dbVal > 0 ? (diff / dbVal) * 100 : null
                      return (
                        <div className="text-xs mt-0.5 flex items-center justify-between gap-1">
                          <span className={diff >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {diff >= 0 ? '↑' : '↓'} vs 2 days ago ${dbVal.toFixed(2)}
                            {pct !== null && ` (${Math.abs(pct).toFixed(0)}%)`}
                          </span>
                          <SalesPerfBadge sales={dbVal} size="sm" thresholds={perfThresholds} />
                        </div>
                      )
                    })()}
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Orders</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {dailySales.summary.totalOrders}
                    </div>
                    {yesterdaySales && (() => {
                      const yOrders = yesterdaySales.summary?.totalOrders ?? 0
                      const diff = dailySales.summary.totalOrders - yOrders
                      return (
                        <div className={`text-xs mt-0.5 ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {diff >= 0 ? '↑' : '↓'} {Math.abs(diff)} vs yesterday ({yOrders})
                        </div>
                      )
                    })()}
                    {dayBeforeYesterdaySales && (() => {
                      const dbOrders = dayBeforeYesterdaySales.summary?.totalOrders ?? 0
                      const diff = dailySales.summary.totalOrders - dbOrders
                      return (
                        <div className={`text-xs mt-0.5 ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {diff >= 0 ? '↑' : '↓'} {Math.abs(diff)} vs 2 days ago ({dbOrders})
                        </div>
                      )
                    })()}
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Order</div>
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      ${dailySales.summary.averageOrderValue.toFixed(2)}
                    </div>
                    {recentTransactions.length > 0 && (() => {
                      const last = recentTransactions[0]
                      const items = (last?.business_order_items || []).filter((item: any) => {
                        const name = item?.product_variants?.business_products?.name || item?.attributes?.productName || item?.notes
                        return !!name
                      })
                      const visibleItems = lastOrderExpanded ? items : items.slice(0, 2)
                      const hasMore = items.length > 2
                      return (
                        <div className="mt-1.5 border-t border-gray-100 dark:border-gray-700 pt-1.5">
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="text-[10px] text-gray-400 dark:text-gray-500">Last Order Total</div>
                            <div className="text-xs font-bold text-blue-600 dark:text-blue-400">${Number(last?.totalAmount || 0).toFixed(2)}</div>
                          </div>
                          <div className="space-y-0.5">
                            {visibleItems.map((item: any, i: number) => {
                              const name = item?.product_variants?.business_products?.name || item?.attributes?.productName || item?.notes
                              const isComboItem = !!(item?.attributes?.isCombo)
                              return (
                                <div key={i} className="text-[10px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                                  {isComboItem && <span className="text-[8px] font-bold bg-purple-600 text-white px-0.5 rounded leading-none flex-shrink-0">✦</span>}
                                  {item.quantity}× {name}
                                </div>
                              )
                            })}
                          </div>
                          {hasMore && (
                            <button
                              type="button"
                              onClick={() => setLastOrderExpanded(prev => !prev)}
                              className="text-[10px] text-blue-400 dark:text-blue-500 hover:text-blue-600 dark:hover:text-blue-300 mt-0.5"
                            >
                              {lastOrderExpanded ? '▲ less' : `▼ +${items.length - 2} more`}
                            </button>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Receipts</div>
                    <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                      {dailySales.summary.receiptsIssued}
                    </div>
                  </div>
                </div>

                {/* Meal Program Mini-Bar — always visible when there are transactions today */}
                {dailySales.expenseAccountSales?.count > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowMealProgramDetails(true)}
                    className="mt-3 w-full flex items-center justify-between px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                  >
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      🍱 Meal Program
                      <span className="text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-full font-semibold">
                        {dailySales.expenseAccountSales.count}
                      </span>
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-green-600 dark:text-green-400">Sub ${dailySales.expenseAccountSales.subsidyTotal.toFixed(2)}</span>
                      <span className="text-blue-600 dark:text-blue-400">Cash ${dailySales.expenseAccountSales.cashTotal.toFixed(2)}</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">= ${dailySales.expenseAccountSales.total.toFixed(2)}</span>
                      <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                )}

                {/* Recent Transactions Toggle */}
                <div className="mt-3">
                  <button
                    onClick={() => {
                      const next = !showRecentTransactions
                      setShowRecentTransactions(next)
                      if (next && recentTransactions.length === 0) loadRecentTransactions()
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Last 5 Transactions</span>
                    <div className="flex items-center gap-2">
                      {recentTransactions.length > 0 && (
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          ${recentTransactions.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0).toFixed(2)}
                        </span>
                      )}
                      <span className={`text-xs text-gray-400 transition-transform ${showRecentTransactions ? 'rotate-180' : ''}`}>
                        &#9660;
                      </span>
                    </div>
                  </button>

                  {showRecentTransactions && (
                    <div className="mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                      {loadingRecent ? (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        </div>
                      ) : recentTransactions.length === 0 ? (
                        <div className="text-center py-4 text-sm text-gray-400">No transactions yet</div>
                      ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                          {recentTransactions.map((order: any) => {
                            const isExpanded = expandedOrderId === order.id
                            const items = order.business_order_items || []
                            return (
                              <div key={order.id}>
                                <button
                                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                                  className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={`flex-shrink-0 text-xs text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>&#9654;</span>
                                      <span className="flex-shrink-0 text-sm font-medium text-gray-900 dark:text-white">#{order.orderNumber}</span>
                                      <span className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                                        order.status === 'COMPLETED'
                                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                          : order.status === 'REFUNDED'
                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                      }`}>{order.status}</span>
                                      {!isExpanded && items.length > 0 && (() => {
                                        const fi = items[0]
                                        const fn = fi?.product_variants?.business_products?.name || fi?.attributes?.productName || fi?.notes
                                        return fn ? (
                                          <span className="text-xs text-gray-400 dark:text-gray-500 truncate">· {fi.quantity}× {fn}</span>
                                        ) : null
                                      })()}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 pl-5">
                                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      {order.paymentMethod && <span className="ml-2">{order.paymentMethod}</span>}
                                      {items.length > 0 && (
                                        <span className="ml-2">{items.length} item{items.length > 1 ? 's' : ''}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-sm font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
                                    ${Number(order.totalAmount || 0).toFixed(2)}
                                  </div>
                                </button>

                                {isExpanded && items.length > 0 && (
                                  <div className="px-3 pb-3 pl-8">
                                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2 space-y-1">
                                      {items.map((item: any, idx: number) => {
                                        const name = item.product_variants?.business_products?.name
                                          || item.attributes?.productName
                                          || item.notes
                                          || 'Item'
                                        return (
                                          <div key={item.id || idx} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                              <span className="text-gray-400">{item.quantity}x</span>
                                              <span>{name}</span>
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                              ${Number(item.totalPrice || item.unitPrice * item.quantity || 0).toFixed(2)}
                                            </span>
                                          </div>
                                        )
                                      })}
                                      {(Number(order.discountAmount) > 0 || Number(order.taxAmount) > 0) && (
                                        <div className="border-t border-gray-200 dark:border-gray-600 pt-1 mt-1 space-y-0.5">
                                          {Number(order.discountAmount) > 0 && (
                                            <div className="flex justify-between text-xs text-red-500">
                                              <span>Discount</span>
                                              <span>-${Number(order.discountAmount).toFixed(2)}</span>
                                            </div>
                                          )}
                                          {Number(order.taxAmount) > 0 && (
                                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                              <span>Tax</span>
                                              <span>${Number(order.taxAmount).toFixed(2)}</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      <div className="border-t border-gray-200 dark:border-gray-600 pt-1 mt-1 flex justify-between text-xs font-bold text-gray-900 dark:text-white">
                                        <span>Total</span>
                                        <span>${Number(order.totalAmount || 0).toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Detailed Breakdown (Collapsible) */}
                {showDailySales && (
                  <div className="mt-4 space-y-3">
                    {/* Payment Methods */}
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Payment Methods</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(dailySales.paymentMethods).map(([method, data]: [string, any]) => (
                          <div key={method} className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            <div className="text-xs text-gray-500 dark:text-gray-400">{method}</div>
                            <div className="text-sm font-bold text-primary">${data.total.toFixed(2)}</div>
                            <div className="text-xs text-gray-400">({data.count} orders)</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Expense Account (Meal Program) Breakdown */}
                    {dailySales.expenseAccountSales && dailySales.expenseAccountSales.count > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowMealProgramDetails(true)}
                        className="w-full text-left bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">🍱 Meal Program</h3>
                          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            View details
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Transactions</div>
                            <div className="font-bold text-primary">{dailySales.expenseAccountSales.count}</div>
                          </div>
                          <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Subsidy</div>
                            <div className="font-bold text-green-600 dark:text-green-400">${dailySales.expenseAccountSales.subsidyTotal.toFixed(2)}</div>
                          </div>
                          <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Cash</div>
                            <div className="font-bold text-blue-600 dark:text-blue-400">${dailySales.expenseAccountSales.cashTotal.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-2 pt-2 border-t border-amber-200 dark:border-amber-700">
                          <span>Total meal program revenue:</span>
                          <span className="font-semibold text-primary">${dailySales.expenseAccountSales.total.toFixed(2)}</span>
                        </div>
                      </button>
                    )}

                    {/* Top Items */}
                    {dailySales.topItems && dailySales.topItems.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Top Items</h3>
                        <div className="space-y-1">
                          {dailySales.topItems.slice(0, 5).map((item: any) => {
                            const unitPrice = item.quantity > 0 ? item.totalSales / item.quantity : 0
                            return (
                              <div key={item.name} className="flex justify-between items-center text-sm">
                                <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                                <div className="text-right">
                                  <span className="font-semibold text-primary">${unitPrice.toFixed(2)}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">×{item.quantity}</span>
                                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-1.5">=&nbsp;${item.totalSales.toFixed(2)}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  {/* Close Books Button */}
                  {(isAdmin || hasPermission('canCloseBooks')) && currentBusinessId && (
                    <div className="pt-2">
                      <CloseBooksBanner
                        businessId={currentBusinessId}
                        date={dailySales.businessDay.date}
                        managerName={sessionUser?.name || sessionUser?.email || 'Manager'}
                      />
                    </div>
                  )}
                  </div>
                )}
              </div>
            )}

            {/* POS Performance Indicator — minimal badge for POS-role users */}
            {dailySales && !isAdmin && !hasPermission('canAccessFinancialData') && !hasPermission('canViewWifiReports') && (
              <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <span className="text-xs text-gray-500 dark:text-gray-400">Today's Performance</span>
                <SalesPerfBadge sales={dailySales.summary.totalSales} thresholds={perfThresholds} />
              </div>
            )}

            {/* POS User Widget — Last order banner + collapsible recent orders */}
            {recentTransactions.length > 0 && !isAdmin && !hasPermission('canAccessFinancialData') && !hasPermission('canViewWifiReports') && (() => {
              const lastOrder = recentTransactions[0]
              const lastItems = lastOrder?.business_order_items || []
              return (
                <>
                  {/* ── Always-visible Last Order banner ── */}
                  <div className="card bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    {/* Header */}
                    <div className={`px-4 py-3 flex items-center justify-between ${
                      lastOrder.status === 'COMPLETED'
                        ? 'bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-700'
                        : lastOrder.status === 'REFUNDED'
                          ? 'bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-700'
                          : 'bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-700'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Last Order</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">#{lastOrder.orderNumber}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          lastOrder.status === 'COMPLETED'
                            ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                            : lastOrder.status === 'REFUNDED'
                              ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                              : 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
                        }`}>{lastOrder.status}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(lastOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {lastOrder.paymentMethod && <span className="ml-2">{lastOrder.paymentMethod}</span>}
                        </p>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="px-4 py-3 space-y-1.5">
                      {lastItems.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-2">No item details</p>
                      ) : lastItems.map((item: any, idx: number) => {
                        const name = item.product_variants?.business_products?.name
                          || item.attributes?.productName
                          || item.notes
                          || 'Item'
                        const isComboItem = !!(item?.attributes?.isCombo)
                        return (
                          <div key={item.id || idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                              <span className="text-xs text-gray-400 w-5 text-right">{item.quantity}×</span>
                              {isComboItem && <span className="text-[9px] font-bold bg-purple-600 text-white px-1 py-0.5 rounded leading-none">✦</span>}
                              <span>{name}</span>
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              ${Number(item.totalPrice || 0).toFixed(2)}
                            </span>
                          </div>
                        )
                      })}

                      {(Number(lastOrder.discountAmount) > 0 || Number(lastOrder.taxAmount) > 0) && (
                        <div className="border-t border-gray-100 dark:border-gray-700 pt-1 mt-1 space-y-1">
                          {Number(lastOrder.discountAmount) > 0 && (
                            <div className="flex justify-between text-xs text-red-500">
                              <span>Discount</span>
                              <span>-${Number(lastOrder.discountAmount).toFixed(2)}</span>
                            </div>
                          )}
                          {Number(lastOrder.taxAmount) > 0 && (
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                              <span>Tax</span>
                              <span>${Number(lastOrder.taxAmount).toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-1 flex justify-between text-sm font-bold text-gray-900 dark:text-white">
                        <span>Total</span>
                        <span>${Number(lastOrder.totalAmount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Collapsible Recent Orders (last 5) ── */}
                  <div className="card bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <button
                      onClick={() => setShowRecentTransactions(v => !v)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">📋 Recent Orders</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{recentTransactions.length} orders</span>
                        <span className={`text-xs text-gray-400 transition-transform duration-200 ${showRecentTransactions ? 'rotate-180' : ''}`}>▼</span>
                      </div>
                    </button>

                    {showRecentTransactions && (
                      <div className="divide-y divide-gray-100 dark:divide-gray-700 border-t border-gray-100 dark:border-gray-700">
                        {recentTransactions.map((order: any, index: number) => {
                          const isExpanded = expandedOrderId === order.id
                          const items = order.business_order_items || []
                          return (
                            <div key={order.id}>
                              <button
                                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`flex-shrink-0 text-xs text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>&#9654;</span>
                                    <span className="flex-shrink-0 text-sm font-medium text-gray-900 dark:text-white">#{order.orderNumber}</span>
                                    <span className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                                      order.status === 'COMPLETED'
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : order.status === 'REFUNDED'
                                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    }`}>{order.status}</span>
                                    {index === 0 && <span className="flex-shrink-0 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">latest</span>}
                                    {!isExpanded && items.length > 0 && (() => {
                                      const fi = items[0]
                                      const fn = fi?.product_variants?.business_products?.name || fi?.attributes?.productName || fi?.notes
                                      return fn ? (
                                        <span className="text-xs text-gray-400 dark:text-gray-500 truncate">· {fi.quantity}× {fn}</span>
                                      ) : null
                                    })()}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 pl-5">
                                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {order.paymentMethod && <span className="ml-2">{order.paymentMethod}</span>}
                                    {items.length > 0 && <span className="ml-2">{items.length} item{items.length > 1 ? 's' : ''}</span>}
                                  </div>
                                </div>
                                <div className="text-sm font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
                                  ${Number(order.totalAmount || 0).toFixed(2)}
                                </div>
                              </button>

                              {isExpanded && items.length > 0 && (
                                <div className="px-4 pb-3 pl-9">
                                  <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2 space-y-1">
                                    {items.map((item: any, idx: number) => {
                                      const name = item.product_variants?.business_products?.name
                                        || item.attributes?.productName
                                        || item.notes
                                        || 'Item'
                                      return (
                                        <div key={item.id || idx} className="flex items-center justify-between text-xs">
                                          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                            <span className="text-gray-400">{item.quantity}×</span>
                                            <span>{name}</span>
                                          </div>
                                          <span className="font-medium text-gray-900 dark:text-white">
                                            ${Number(item.totalPrice || 0).toFixed(2)}
                                          </span>
                                        </div>
                                      )
                                    })}
                                    <div className="border-t border-gray-200 dark:border-gray-600 pt-1 mt-1 flex justify-between text-xs font-bold text-gray-900 dark:text-white">
                                      <span>Total</span>
                                      <span>${Number(order.totalAmount || 0).toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              )
            })()}

            {/* Manual Entry Mode */}
            {posMode === 'manual' && currentBusinessId && (
              <ManualEntryTab
                businessId={currentBusinessId}
                businessType="restaurant"
                menuItems={menuItems}
                categories={categories}
                getCategoryLabel={getCategoryLabel}
                getCategoryFilter={getCategoryFilter}
                onAddItem={addToManualCart}
                manualCartItems={manualCart}
              />
            )}

            {/* Live POS Mode */}
            {posMode === 'live' && (<>
            <div ref={menuSectionRef} className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-primary dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  🔍
                </span>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
              <BarcodeScanner
                onProductScanned={handleProductScanned}
                onNotFound={(barcode) => setQuickStockBarcode(barcode)}
                onProductNeedsActivation={(product, barcode, variantId) => {
                  setQuickStockExistingProduct({ id: product.id, name: product.name, variantId })
                  setQuickStockBarcode(barcode)
                }}
                businessId={businessId}
                showScanner={showBarcodeScanner}
                onToggleScanner={() => setShowBarcodeScanner(!showBarcodeScanner)}
              />
              {quickStockBarcode && (
                <QuickStockFromScanModal
                  isOpen={true}
                  barcode={quickStockBarcode}
                  businessId={businessId}
                  businessType="restaurant"
                  existingProduct={quickStockExistingProduct ?? undefined}
                  suggestedName={quickStockExistingProduct?.name}
                  onSuccess={async (productId, variantId, productName) => {
                    setQuickStockBarcode(null)
                    setQuickStockExistingProduct(null)
                    try {
                      const res = await fetch(`/api/universal/products/${productId}`)
                      if (res.ok) {
                        const product = await res.json()
                        const variant = variantId ? product.variants?.find((v: any) => v.id === variantId) : undefined
                        const menuItem: MenuItem = {
                          id: variantId ? `${productId}-${variantId}` : productId,
                          name: productName + (variant?.name ? ` (${variant.name})` : ''),
                          price: variant?.price || product.basePrice || 0,
                          category: 'stocked',
                          isAvailable: true,
                        }
                        addToCart(menuItem)
                      }
                    } catch {
                      // Product stocked — user can scan again to add to cart
                    }
                  }}
                  onClose={() => {
                    setQuickStockBarcode(null)
                    setQuickStockExistingProduct(null)
                  }}
                />
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => { setSelectedCategory(category); setSearchTerm('') }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'card text-primary dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {getCategoryLabel(category)}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-4">
              {filteredItems.map(item => {
                const hasDiscount = !!(item.originalPrice) && Number(item.originalPrice) > 0 && Number(item.originalPrice) > Number(item.price)
                const isOutOfStock = item.isInventoryTracked === true && (item.stockQuantity ?? 0) === 0
                const isUnavailable = item.isAvailable === false || isOutOfStock
                const cartItem = cart.find(c => c.id === item.id)
                const cartQuantity = cartItem?.quantity || 0
                const canSeeFinancials = isAdmin || hasPermission('canAccessFinancialData')

                // Performance bar metrics — computed once, shared by badge color and bar
                const soldToday = item.soldToday || 0
                const soldYesterday = item.soldYesterday || 0
                let barFill = 0
                let barColorClass = 'bg-red-500'
                let barTextColorClass = 'text-red-500 dark:text-red-400'
                let barLabel = 'Low'
                const showBar = soldToday > 0
                if (showBar) {
                  if (soldYesterday > 0) {
                    // Ratio-based: today vs yesterday for this specific item
                    // ratio=1.0 means matched yesterday → full bar (100%)
                    // ratio>1 is capped at 100%; ratio<1 fills proportionally
                    const ratio = soldToday / soldYesterday
                    barFill = Math.min(100, ratio * 100)
                    if (ratio >= 1.0) {
                      barColorClass = 'bg-green-500'
                      barTextColorClass = 'text-green-500 dark:text-green-400'
                      barLabel = 'Good'
                    } else if (ratio >= 0.5) {
                      barColorClass = 'bg-amber-400'
                      barTextColorClass = 'text-amber-500 dark:text-amber-400'
                      barLabel = 'Fair'
                    }
                    // else: stays Red / "Low" (ratio < 0.5)
                  } else {
                    // No yesterday baseline — any sale today is a new win
                    barFill = 60
                    barColorClass = 'bg-green-500'
                    barTextColorClass = 'text-green-500 dark:text-green-400'
                    barLabel = 'New'
                  }
                }

                return (
                  <div
                    key={item.id}
                    onClick={() => !isUnavailable && addToCart(item)}
                      className={`card bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow hover:shadow-lg transition-shadow text-left min-h-[80px] touch-manipulation relative ${
                      isUnavailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {/* Unavailable indicator */}
                    {isUnavailable && (
                      <div className="absolute top-1 right-1">
                        <span className="text-red-500 text-xs">❌</span>
                      </div>
                    )}

                    {/* Discount indicator */}
                    {hasDiscount && !isUnavailable && (
                      <div className="absolute top-1 right-1">
                        <span className="bg-red-500 text-white text-xs px-1 rounded">
                          {item.discountPercent ? `-${item.discountPercent}%` : 'SALE'}
                        </span>
                      </div>
                    )}

                    {/* Spice level indicator */}
                    {item.spiceLevel != null && item.spiceLevel > 0 && (
                      <div className="absolute top-1 left-1">
                        <span className="text-xs">{'🌶️'.repeat(Math.min(item.spiceLevel, 3))}</span>
                      </div>
                    )}

                    {/* Combo indicator with hover tooltip listing combo contents */}
                    {(item as any).isCombo && (
                      <div className={`absolute left-1 ${item.spiceLevel != null && item.spiceLevel > 0 ? 'top-5' : 'top-1'} group z-10`}>
                        <span className="text-[9px] font-bold bg-purple-600 dark:bg-purple-700 text-white px-1 py-0.5 rounded leading-none tracking-wide cursor-default">
                          ✦ COMBO
                        </span>
                        {/* Hover popup */}
                        {(item as any).comboItems && (item as any).comboItems.length > 0 && (
                          <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-44 bg-gray-900 dark:bg-gray-950 border border-purple-500/40 rounded-lg shadow-xl p-2 pointer-events-none">
                            <p className="text-[10px] font-semibold text-purple-300 mb-1 uppercase tracking-wide">Includes</p>
                            {(item as any).comboItems.map((ci: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-1 text-[11px] text-gray-200 py-0.5">
                                {ci.tokenConfigId || ci.wifiToken ? (
                                  <><span>📶</span><span className="truncate">{ci.wifiToken?.name || ci.product?.name || 'WiFi Access'}</span></>
                                ) : (
                                  <><span className="text-purple-400">•</span><span className="truncate">{ci.product?.name || ci.name || 'Item'}</span>{ci.quantity > 1 && <span className="text-gray-400 flex-shrink-0">×{ci.quantity}</span>}</>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <h3 className="font-semibold text-[10px] sm:text-xs line-clamp-2 mt-2">
                      {item.name}
                      {item.requiresCompanionItem && (
                        <span className="ml-1 text-xs bg-orange-500 text-white px-1 rounded" title="Requires main item">+</span>
                      )}
                    </h3>

                    {/* Price row + revenue — two-column when financial user has sold items */}
                    {canSeeFinancials && soldToday > 0 ? (
                      <div className="flex items-stretch gap-2 mt-1">
                        {/* Left column: price on top, sold badge below */}
                        <div className="flex flex-col justify-between">
                          <p className={`text-sm sm:text-base font-bold leading-tight ${hasDiscount ? 'text-red-500' : 'text-sky-400 dark:text-sky-300'}`}>
                            ${Number(item.price).toFixed(2)}
                            {hasDiscount && (
                              <span className="ml-1 text-xs text-secondary line-through font-normal">
                                ${Number(item.originalPrice || 0).toFixed(2)}
                              </span>
                            )}
                          </p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/50 whitespace-nowrap self-start mt-0.5">
                            <span className="text-yellow-400 font-bold">{soldToday}</span> sold
                          </span>
                        </div>
                        {/* Right column: large revenue in bar color, vertically centered */}
                        <div className="flex items-center justify-end flex-1">
                          <span className={`text-lg sm:text-xl font-black leading-none ${barTextColorClass}`}>
                            ${(Number(item.price) * soldToday).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-1">
                        <p className={`text-sm sm:text-base font-bold ${hasDiscount ? 'text-red-500' : 'text-sky-400 dark:text-sky-300'}`}>
                          ${Number(item.price).toFixed(2)}
                        </p>
                        {hasDiscount && (
                          <p className="text-xs text-secondary line-through">
                            ${Number(item.originalPrice || 0).toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Sold count hidden from non-financial users */}

                    {/* WiFi token details - Duration and Bandwidth (ESP32 only) */}
                    {(item as any).esp32Token && (item as any).tokenConfig && (
                      <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400 space-y-0.5">
                        <div>⏱️ {formatDuration((item as any).tokenConfig.durationMinutes || 0)}</div>
                        {((item as any).tokenConfig.bandwidthDownMb || (item as any).tokenConfig.bandwidthUpMb) && (
                          <div>
                            📊 ↓{formatDataAmount((item as any).tokenConfig.bandwidthDownMb || 0)} / ↑{formatDataAmount((item as any).tokenConfig.bandwidthUpMb || 0)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* R710 token details - Duration only */}
                    {(item as any).r710Token && (item as any).tokenConfig && (
                      <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                        ⏱️ {(item as any).tokenConfig.durationValue} {(item as any).tokenConfig.durationUnit?.split('_')[1] || (item as any).tokenConfig.durationUnit}
                      </div>
                    )}

                    {/* Combo with WiFi indicator */}
                    {(item as any).isCombo && (item as any).comboItems?.some((ci: any) => ci.tokenConfigId || ci.wifiToken) && (
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          📶 Includes WiFi
                        </span>
                      </div>
                    )}

                    {/* WiFi token quantity indicator */}
                    {((item as any).esp32Token || (item as any).r710Token) && (() => {
                      const remaining = (item.availableQuantity || 0) - cartQuantity;
                      return (
                      <div className="mt-1 space-y-1">
                        <span className={`text-xs font-medium block ${remaining <= 0 ? 'text-red-500' : remaining < 5 ? 'text-orange-500' : 'text-green-600'}`}>
                          📦 {remaining} available
                        </span>
                        {/* Request more tokens button - only show when quantity < 5 and user has permission */}
                        {item.availableQuantity < 5 && (isAdmin || hasPermission('canSellWifiTokens')) && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation(); // Prevent adding to cart
                              const tokenConfigId = (item as any).tokenConfigId;
                              const isR710 = (item as any).r710Token === true;

                              // Add to requesting set to disable button
                              setRequestingMore(prev => new Set(prev).add(tokenConfigId));

                              try {
                                const apiUrl = isR710
                                  ? '/api/r710/tokens'
                                  : '/api/wifi-portal/tokens/bulk';

                                const response = await fetch(apiUrl, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    businessId: currentBusinessId,
                                    tokenConfigId: tokenConfigId,
                                    quantity: 5
                                  })
                                });

                                const result = await response.json();

                                if (response.ok) {
                                  // Optimistic UI update - immediately increment the quantity
                                  const tokensCreated = result.tokensCreated || result.tokensGenerated || 5;
                                  setMenuItems(prev => prev.map(menuItem => {
                                    if ((menuItem as any).tokenConfigId === tokenConfigId) {
                                      return {
                                        ...menuItem,
                                        availableQuantity: ((menuItem as any).availableQuantity || 0) + tokensCreated
                                      };
                                    }
                                    return menuItem;
                                  }));

                                  const tokenType = isR710 ? 'R710' : 'ESP32';
                                  toast.push(`✅ Successfully created ${tokensCreated} ${tokenType} ${item.tokenConfig?.name || item.name} token${tokensCreated !== 1 ? 's' : ''}!`, {
                                    type: 'success',
                                    duration: 5000
                                  });

                                  // Background refresh to confirm quantities
                                  loadMenuItems();
                                } else {
                                  toast.error(`❌ Failed to create tokens: ${result.error || 'Unknown error'}`);
                                }
                              } catch (error) {
                                console.error('Error creating tokens:', error);
                                toast.error('❌ Error creating tokens. Please try again.');
                              } finally {
                                // Remove from requesting set to re-enable button
                                setRequestingMore(prev => {
                                  const next = new Set(prev);
                                  next.delete(tokenConfigId);
                                  return next;
                                });
                              }
                            }}
                            disabled={requestingMore.has((item as any).tokenConfigId)}
                            className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-2 py-1 rounded w-full transition-colors"
                          >
                            {requestingMore.has((item as any).tokenConfigId) ? '⏳ Requesting...' : '+ Request 5 More'}
                          </button>
                        )}
                      </div>
                      );
                    })()}

                    {/* Preparation time */}
                    {item.preparationTime != null && item.preparationTime > 0 && (
                      <p className="text-xs text-secondary mt-1">
                        ⏱️ {item.preparationTime}min
                      </p>
                    )}

                    {isUnavailable && !isOutOfStock && (
                      <p className="text-xs text-red-500 mt-1 font-medium">Unavailable</p>
                    )}

                    {/* Stock badge — only for inventory-tracked items */}
                    {item.isInventoryTracked && (() => {
                      const stock = item.stockQuantity ?? 0
                      const reorder = item.reorderLevel ?? 0
                      if (stock === 0) {
                        return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 mt-1 block">Out of Stock</span>
                      } else if (stock <= reorder) {
                        return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 mt-1 block">{stock} left</span>
                      } else {
                        return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 mt-1 block">{stock} in stock</span>
                      }
                    })()}

                    {/* Performance comparison bar — all users, whenever soldToday > 0 */}
                    {showBar && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 shadow ${barColorClass}`} />
                        <div className="flex-1 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${barColorClass} opacity-70`} style={{ width: `${barFill}%` }} />
                        </div>
                        <span className={`text-[10px] font-semibold flex-shrink-0 ${barTextColorClass}`}>{barLabel}</span>
                      </div>
                    )}

                    {/* Yesterday sold count — shown below bar whenever there's a yesterday baseline */}
                    {showBar && soldYesterday > 0 && (
                      <div className="mt-0.5 flex items-center gap-1">
                        <span className="text-[9px] text-gray-400 dark:text-gray-500">yesterday:</span>
                        <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500">{soldYesterday}</span>
                      </div>
                    )}

                    {/* Cart quantity badge - bottom right, only show when in cart */}
                    {cartQuantity > 0 && (
                      <div className="absolute bottom-1 right-1">
                        <span className="inline-flex items-center justify-center bg-blue-600 text-white text-sm font-bold rounded-full w-6 h-6">
                          {cartQuantity}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            </>)}
          </div>

          {/* Manual Order Summary (right panel) */}
          {posMode === 'manual' && currentBusinessId && (
            <ManualOrderSummary
              businessId={currentBusinessId}
              businessType="restaurant"
              items={manualCart}
              onUpdateQuantity={updateManualCartQuantity}
              onRemoveItem={removeFromManualCart}
              onClearAll={clearManualCart}
              onSuccess={() => setManualSuccessActive(true)}
              resetTrigger={manualResetTrigger}
            />
          )}

          {/* Meal Program Panel (right panel) */}
          {posMode === 'meal_program' && currentBusinessId && (
            <div className="card overflow-hidden sticky top-20 self-start" style={{ minHeight: '480px' }}>
              <MealProgramPanel
                key={mealPanelKey}
                businessId={currentBusinessId}
                soldByEmployeeId={employeeId}
                allMenuItems={menuItems.map((m) => ({
                  id: m.id,
                  name: m.name,
                  price: Number(m.price),
                  category: m.category,
                }))}
                onTransactionComplete={(result) => {
                  // Fully subsidised path — transaction already created, go straight to receipt
                  const orderForReceipt = {
                    orderNumber: result.orderNumber,
                    customerName: result.participantName,
                    items: result.items.map((i) => ({
                      ...i,
                      sku: undefined,
                    })),
                    subtotal: Number(result.totalAmount),
                    total: Number(result.totalAmount),
                    paymentMethod: 'EXPENSE_ACCOUNT',
                    amountReceived: Number(result.totalAmount),
                    change: 0,
                    wifiTokens: [],
                    r710Tokens: [],
                    businessInfo: businessDetails || currentBusiness,
                    attributes: {
                      mealProgram: true,
                      participantName: result.participantName,
                      expenseAmount: result.subsidyAmount,
                      cashAmount: result.cashAmount,
                    },
                  }
                  setCompletedOrder(orderForReceipt)
                  setShowReceiptModal(true)
                  // Refresh daily sales so meal program count/totals appear immediately
                  setTimeout(() => loadDailySales(), 800)
                }}
                onCashPaymentRequired={(pending) => {
                  // Cash-due path — hold transaction data, collect payment first
                  const orderForReceipt = {
                    orderNumber: 'PENDING',
                    customerName: pending.participantName,
                    items: pending.items.map((i) => ({ ...i, sku: undefined })),
                    subtotal: Number((0.50 + pending.cashAmount).toFixed(2)),
                    total: Number((0.50 + pending.cashAmount).toFixed(2)),
                    paymentMethod: 'CASH',
                    amountReceived: 0,
                    change: 0,
                    wifiTokens: [],
                    r710Tokens: [],
                    businessInfo: businessDetails || currentBusiness,
                    attributes: {
                      mealProgram: true,
                      participantName: pending.participantName,
                      expenseAmount: '0.50',
                      cashAmount: pending.cashAmount.toFixed(2),
                    },
                  }
                  setPendingMealTransaction(pending)
                  setCompletedOrder(orderForReceipt)
                  setMealProgramCashDue(pending.cashAmount)
                  setAmountReceived('')
                  setPaymentMethod('CASH')
                  setShowPaymentModal(true)
                  // Transaction already saved — refresh daily sales
                  setTimeout(() => loadDailySales(), 800)
                }}
                onCancel={() => setPosMode('live')}
              />
            </div>
          )}

          {/* Live Order Summary (right panel) */}
          {posMode === 'live' && (
          <div className="card bg-white dark:bg-gray-900 p-4 rounded-lg shadow sticky top-20 self-start">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-primary">Order Summary</h2>
              {dailySales && (isAdmin || hasPermission('canAccessFinancialData') || hasPermission('canViewWifiReports')) && (
                <SalesPerfBadge sales={dailySales.summary.totalSales} thresholds={perfThresholds} />
              )}
            </div>

            {/* Customer Section */}
            {currentBusinessId && (
              <div className="mb-4 space-y-2">
                {showQuickRegister ? (
                  <CustomerQuickRegister
                    businessId={currentBusinessId}
                    onCreated={(c) => { setSelectedCustomer(c); setShowQuickRegister(false) }}
                    onCancel={() => setShowQuickRegister(false)}
                  />
                ) : (
                  <CustomerLookup
                    businessId={currentBusinessId}
                    selectedCustomer={selectedCustomer}
                    onSelectCustomer={(c) => {
                      setSelectedCustomer(c)
                      setAppliedReward(null)
                      setSkipRewardThisTime(true)
                      setShowRewardHistory(false)
                      autoAppliedForRef.current = null
                    }}
                    onCreateCustomer={() => setShowQuickRegister(true)}
                    allowWalkIn={false}
                  />
                )}

                {/* Applied Reward */}
                {appliedReward && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                      <div className="text-xs">
                        <div className="font-medium text-green-800 dark:text-green-300">
                          🎁 {[
                            Number(appliedReward.rewardAmount) > 0 && `$${Number(appliedReward.rewardAmount).toFixed(2)} credit`,
                            appliedReward.rewardProduct && `Free ${appliedReward.rewardProduct.name}`,
                            appliedReward.wifiConfig && `Free WiFi (${appliedReward.wifiConfig.name})`
                          ].filter(Boolean).join(' + ') || 'Reward'} available
                        </div>
                        <div className="text-green-600 dark:text-green-500 font-mono">{appliedReward.couponCode}</div>
                      </div>
                      <button onClick={() => setAppliedReward(null)} className="text-green-500 hover:text-green-700 ml-2 text-xs">✕</button>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer px-1">
                      <input
                        type="checkbox"
                        checked={!skipRewardThisTime}
                        onChange={e => setSkipRewardThisTime(!e.target.checked)}
                        className="rounded w-3.5 h-3.5"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Apply reward to this order</span>
                    </label>
                  </div>
                )}

                {/* Reward history icon — click to view used/expired rewards */}
                {selectedCustomer && customerUsedRewards.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowRewardHistory(h => !h)}
                      className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      🕐 {showRewardHistory ? 'Hide' : 'View'} reward history ({customerUsedRewards.length})
                    </button>
                    {showRewardHistory && (
                      <div className="mt-1 space-y-1">
                        {customerUsedRewards.map(r => (
                          <div key={r.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2">
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex-1">
                              <span className="font-medium">{r.promo_campaigns.name}</span> —{' '}
                              {r.status === 'REDEEMED' ? 'Used' : r.status === 'DEACTIVATED' ? 'Deactivated' : 'Expired'}
                              {' '}<span className="font-mono text-[10px]">{r.couponCode}</span>
                              {r.redeemedAt && ` · ${new Date(r.redeemedAt).toLocaleDateString()}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {cart.map(item => (
                <div key={item.id} className="border-b border-gray-100 dark:border-gray-700 pb-2 last:border-b-0">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        {(item as any).isCombo && <span className="text-[9px] font-bold bg-purple-600 text-white px-1 py-0.5 rounded leading-none flex-shrink-0">✦</span>}
                        {item.name}
                      </div>
                      <div className="text-green-600">${Number(item.price).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-10 h-10 sm:w-8 sm:h-8 bg-gray-200 dark:bg-gray-600 rounded text-center hover:bg-gray-300 dark:hover:bg-gray-500 text-primary dark:text-gray-100 touch-manipulation"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-10 h-10 sm:w-8 sm:h-8 bg-gray-200 dark:bg-gray-600 rounded text-center hover:bg-gray-300 dark:hover:bg-gray-500 text-primary dark:text-gray-100 touch-manipulation"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {/* Show combo contents including WiFi tokens */}
                  {(item as any).isCombo && (item as any).comboItems && (
                    <div className="mt-1 ml-2 text-xs text-gray-500 dark:text-gray-400">
                      <div className="font-medium text-gray-600 dark:text-gray-300">Includes:</div>
                      {(item as any).comboItems.map((ci: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-1 ml-2">
                          {ci.tokenConfigId || ci.wifiToken ? (
                            <>
                              <span className="text-blue-500">📶</span>
                              <span>{ci.wifiToken?.name || ci.product?.name || 'WiFi Access'}</span>
                              <span className="text-blue-400">(WiFi)</span>
                            </>
                          ) : (
                            <>
                              <span>•</span>
                              <span>{ci.product?.name || ci.name || 'Item'}</span>
                              {ci.quantity > 1 && <span className="text-gray-400">x{ci.quantity}</span>}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {cart.length === 0 && (
              <p className="text-secondary text-center py-8">No items in cart</p>
            )}
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              {rewardCredit > 0 && (
                <div className="flex justify-between items-center mb-1 text-sm text-green-600 dark:text-green-400">
                  <span>🎁 Reward credit</span>
                  <span>-${rewardCredit.toFixed(2)}</span>
                </div>
              )}
              {couponDiscount > 0 && appliedCoupon && (
                <div className="flex justify-between items-center mb-1 text-sm text-green-600 dark:text-green-400">
                  <span className="flex items-center gap-1">
                    🏷 Coupon ({appliedCoupon.code})
                    <button
                      onClick={() => { removeCoupon(); window.dispatchEvent(new Event('coupon-removed')) }}
                      className="ml-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 leading-none"
                      title="Remove coupon"
                    >
                      ✕
                    </button>
                  </span>
                  <span>-${couponDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-lg">Total:</span>
                <span className="font-bold text-xl text-green-600">${total.toFixed(2)}</span>
              </div>
              
              <button
                onClick={handleProcessOrderClick}
                disabled={cart.length === 0}
                className="w-full py-4 sm:py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-lg sm:text-base"
              >
                Process Order
              </button>

              <button
                onClick={() => {
                  setCart([])
                  clearGlobalCart()
                  setSelectedCustomer(null)
                  setAppliedReward(null)
                  setSkipRewardThisTime(false)
                  setShowRewardHistory(false)
                  autoAppliedForRef.current = null
                  // Clear any coupon applied via mini-cart
                  removeCoupon()
                  window.dispatchEvent(new Event('coupon-removed'))
                }}
                disabled={cart.length === 0}
                className="w-full py-3 sm:py-2 mt-2 bg-gray-500 dark:bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                Cancel Order
              </button>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-primary mb-4">
              {mealProgramCashDue !== null ? '🍱 Collect Cash Payment' : '💳 Payment'}
            </h2>

            <div className="space-y-4">
              {/* Order Total / Cash Due */}
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                {mealProgramCashDue !== null ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium">Cash Due:</span>
                      <span className="text-2xl font-bold text-green-600">${mealProgramCashDue.toFixed(2)}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Expense account covers ${completedOrder?.attributes?.expenseAmount !== undefined
                        ? Number(completedOrder.attributes.expenseAmount).toFixed(2)
                        : '0.50'} subsidy
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium">Total Amount:</span>
                      <span className="text-2xl font-bold text-green-600">${total.toFixed(2)}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {cart.length} item{cart.length !== 1 ? 's' : ''}
                    </div>
                  </>
                )}
              </div>

              {/* Payment Method — hidden for meal-program tender (always cash) */}
              {mealProgramCashDue === null && <div>
                <label className="block text-sm font-medium text-primary mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('CASH')}
                    className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                      paymentMethod === 'CASH'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-primary hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    💵 Cash
                  </button>
                  <button
                    onClick={() => setPaymentMethod('CARD')}
                    className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                      paymentMethod === 'CARD'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-primary hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    💳 Card
                  </button>
                  <button
                    onClick={() => setPaymentMethod('MOBILE')}
                    className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                      paymentMethod === 'MOBILE'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-primary hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    📱 Mobile
                  </button>
                </div>
              </div>}

              {/* Amount Received — shown for cash (regular or meal-program tender) */}
              {(mealProgramCashDue !== null || (paymentMethod === 'CASH' && total > 0)) && (() => {
                const cashRef = mealProgramCashDue ?? total
                return (
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Amount Received</label>
                    <input
                      type="number"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white text-lg font-semibold"
                      placeholder="Enter amount received"
                      autoFocus
                    />
                    {amountReceived && parseFloat(amountReceived) >= cashRef && (
                      <div className="mt-2 p-2 bg-green-100 dark:bg-green-900 rounded text-green-800 dark:text-green-200 font-medium">
                        💵 Change: ${(parseFloat(amountReceived) - cashRef).toFixed(2)}
                      </div>
                    )}
                    {amountReceived && parseFloat(amountReceived) < cashRef && (
                      <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded text-red-800 dark:text-red-200 text-sm">
                        ⚠️ Amount received is less than total (${cashRef.toFixed(2)})
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Free item notice */}
              {mealProgramCashDue === null && paymentMethod === 'CASH' && total === 0 && (
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-800 dark:text-green-200">
                  ✅ Free item - no payment required
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    // Broadcast payment cancelled to customer display
                    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0)
                    const tax = taxIncludedInPrice
                      ? subtotal * (taxRate / (100 + taxRate))
                      : subtotal * (taxRate / 100)
                    const total = taxIncludedInPrice ? subtotal : subtotal + tax
                    sendToDisplay('PAYMENT_CANCELLED', {
                      subtotal,
                      tax,
                      total
                    })

                    setShowPaymentModal(false)
                    setMealProgramCashDue(null)
                    setPendingMealTransaction(null)
                    setAmountReceived('')
                    setMealPanelKey(k => k + 1)
                  }}
                  disabled={orderSubmitting}
                  className="flex-1 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={completeOrderWithPayment}
                  disabled={orderSubmitting || (
                    mealProgramCashDue !== null
                      ? (mealProgramCashDue > 0 && (!amountReceived || parseFloat(amountReceived) < mealProgramCashDue))
                      : (paymentMethod === 'CASH' && total > 0 && (!amountReceived || parseFloat(amountReceived) < total))
                  )}
                  className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {orderSubmitting ? 'Processing...' : mealProgramCashDue !== null ? 'Confirm & Print Receipt' : 'Complete Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completed Order Receipt Modal */}
      {showReceiptModal && completedOrder && (() => {
        // DEBUG: Log what's actually in completedOrder when modal opens
        console.log('🔍 [Order Complete Modal] completedOrder:', completedOrder)
        console.log('🔍 [Order Complete Modal] wifiTokens:', completedOrder.wifiTokens)
        console.log('🔍 [Order Complete Modal] r710Tokens:', completedOrder.r710Tokens)
        return null;
      })()}
      {showReceiptModal && completedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">✅ Order Complete!</h2>
                <button
                  onClick={() => {
                    setShowReceiptModal(false)
                    setCompletedOrder(null)
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Order Number */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Order Number</div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{completedOrder.orderNumber}</div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Items:</h3>
                  <div className="space-y-2">
                    {completedOrder.items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                          {item.quantity}x
                          {item.isCombo && <span className="text-[9px] font-bold bg-purple-600 text-white px-1 py-0.5 rounded leading-none">✦</span>}
                          {item.name}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* WiFi Tokens (if any) */}
                {completedOrder.wifiTokens && completedOrder.wifiTokens.length > 0 && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-700">
                    <h3 className="font-semibold mb-3 text-purple-700 dark:text-purple-300 flex items-center gap-2">
                      📶 WiFi Access Tokens
                    </h3>
                    {completedOrder.wifiTokens.map((token: any, index: number) => {
                      // Check if this token failed
                      const isError = token.success === false || token.error

                      if (isError) {
                        // Show error state
                        return (
                          <div key={index} className="mb-3 last:mb-0 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                            <div className="text-sm font-medium text-red-700 dark:text-red-300">
                              {token.itemName || token.packageName || 'WiFi Token'}
                            </div>
                            <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                              ⚠️ {token.error || 'Token unavailable'}
                            </div>
                          </div>
                        )
                      }

                      // Show success state
                      return (
                        <div key={index} className="mb-3 last:mb-0 bg-white dark:bg-gray-800 p-3 rounded">
                          <div className="text-sm text-gray-600 dark:text-gray-400">{token.packageName}</div>
                          <div className="text-lg font-mono font-bold text-purple-600 dark:text-purple-400">
                            {token.tokenCode}
                          </div>
                          {token.duration && (
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Duration: {formatDuration(token.duration)}
                            </div>
                          )}
                          {token.instructions && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                              {token.instructions}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* R710 WiFi Tokens (if any) */}
                {completedOrder.r710Tokens && completedOrder.r710Tokens.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                    <h3 className="font-semibold mb-3 text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      📶 R710 WiFi Access
                    </h3>
                    {completedOrder.r710Tokens.map((token: any, index: number) => {
                      // Check if this token failed
                      const isError = token.success === false || token.error

                      if (isError) {
                        // Show error state
                        return (
                          <div key={index} className="mb-3 last:mb-0 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                            <div className="text-sm font-medium text-red-700 dark:text-red-300">
                              {token.itemName || token.packageName || 'R710 WiFi Token'}
                            </div>
                            <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                              ⚠️ {token.error || 'Token unavailable'}
                            </div>
                          </div>
                        )
                      }

                      // Show success state
                      return (
                        <div key={index} className="mb-3 last:mb-0 bg-white dark:bg-gray-800 p-3 rounded">
                          <div className="text-sm text-gray-600 dark:text-gray-400">{token.packageName}</div>
                          <div className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
                            {token.password}
                          </div>
                          {token.durationValue && token.durationUnit && (
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Duration: {token.durationValue} {token.durationUnit.split('_')[1] || token.durationUnit}
                            </div>
                          )}
                          {token.ssid && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                              Connect to WiFi "{token.ssid}" and use password above to log in
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Total */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  {/* Meal program payment breakdown */}
                  {completedOrder.attributes?.mealProgram && (
                    <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700 text-sm space-y-1">
                      <div className="font-semibold text-amber-700 dark:text-amber-400 text-xs uppercase tracking-wide mb-1">🍱 Meal Program Payment</div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Expense account (subsidy):</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">−${Number(completedOrder.attributes.expenseAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Cash collected:</span>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">${Number(completedOrder.attributes.cashAmount).toFixed(2)}</span>
                      </div>
                      {completedOrder.attributes.participantName && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-amber-200 dark:border-amber-700">
                          Participant: {completedOrder.attributes.participantName}
                        </div>
                      )}
                    </div>
                  )}
                  {completedOrder.discountAmount && Number(completedOrder.discountAmount) > 0 && (
                    <>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                        <span className="text-gray-900 dark:text-gray-100">${Number(completedOrder.subtotal).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-700 dark:text-green-400 mb-1">
                        <span>🎁 Reward Applied:</span>
                        <span>-${Number(completedOrder.discountAmount).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-700 dark:text-gray-300">Total:</span>
                    <span className="text-gray-900 dark:text-gray-100">${Number(completedOrder.total).toFixed(2)}</span>
                  </div>
                  {(completedOrder.paymentMethod === 'CASH' || completedOrder.paymentMethod === 'EXPENSE_ACCOUNT') && completedOrder.amountReceived > 0 && (
                    <>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600 dark:text-gray-400">Received:</span>
                        <span className="text-gray-900 dark:text-gray-100">${Number(completedOrder.amountReceived).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-gray-600 dark:text-gray-400">Change:</span>
                        <span className="text-green-600 dark:text-green-400">${Number(completedOrder.change).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Print Button */}
                <button
                  onClick={() => {
                    if (currentBusiness || businessDetails) {
                      const receiptData = buildReceiptDataFromCompletedOrder(completedOrder, businessDetails || currentBusiness)
                      handlePrintReceipt(receiptData)
                    }
                  }}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  🖨️ Print Receipt
                </button>

                {/* Close Button */}
                <button
                  onClick={() => {
                    setShowReceiptModal(false)
                    setCompletedOrder(null)
                    // Reset auto-print tracker for next order
                    autoPrintedOrderRef.current = null
                  }}
                  className="w-full py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Receipt Preview Modal */}
      <UnifiedReceiptPreviewModal
        isOpen={showReceiptPreview}
        onClose={() => {
          setShowReceiptPreview(false)
          setPendingReceiptData(null)
        }}
        receiptData={pendingReceiptData}
        businessType="restaurant"
        onPrintConfirm={async (options) => {
          if (!pendingReceiptData) return

          // Guard against duplicate calls
          if (printInFlightRef.current) {
            console.log('⚠️ [Restaurant POS] onPrintConfirm: Print already in progress, ignoring')
            return
          }

          printInFlightRef.current = true
          console.log('🖨️ [Restaurant POS] onPrintConfirm starting at:', new Date().toISOString())
          console.log('   Options:', JSON.stringify(options))

          try {
            await ReceiptPrintManager.printReceipt(pendingReceiptData, 'restaurant', {
              ...options,
              autoPrint: true,
              onSuccess: (jobId, receiptType) => {
                toast.push(`${receiptType} receipt sent to printer`)
              },
              onError: (error, receiptType) => {
                toast.error(`Error: ${error.message}`)
              }
            })

            console.log('✅ [Restaurant POS] onPrintConfirm completed successfully')

            // Close preview and completed order modal
            setShowReceiptPreview(false)
            setPendingReceiptData(null)
            setShowReceiptModal(false)
            setCompletedOrder(null)
            // Reset auto-print tracker for next order
            autoPrintedOrderRef.current = null

          } catch (error: any) {
            toast.error(`Print error: ${error.message}`)
          } finally {
            printInFlightRef.current = false
          }
        }}
      />

      {/* Meal Program Details Modal */}
      {showMealProgramDetails && currentBusinessId && dailySales?.expenseAccountSales && (
        <MealProgramDetailsModal
          businessId={currentBusinessId}
          businessDayStart={dailySales.businessDay.start}
          businessDayEnd={dailySales.businessDay.end}
          date={dailySales.businessDay.date}
          summary={dailySales.expenseAccountSales}
          onClose={() => setShowMealProgramDetails(false)}
        />
      )}
      </div>
    </BusinessTypeRoute>
  )
}