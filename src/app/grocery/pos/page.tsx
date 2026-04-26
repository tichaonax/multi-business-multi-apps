'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { Suspense } from 'react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { BusinessTypeRedirect } from '@/components/business-type-redirect'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider, useBusinessContext, BarcodeScanner } from '@/components/universal'
import { useAlert } from '@/components/ui/confirm-modal'
import { useSession } from 'next-auth/react'

import { useRouter, useSearchParams } from 'next/navigation'
import { SessionUser } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { printReceipt } from '@/lib/printing/print-receipt'
import type { ReceiptData } from '@/types/printing'
import { UnifiedReceiptPreviewModal } from '@/components/receipts/unified-receipt-preview-modal'
import { calcEcocashFeeFromBusiness, getEcocashSummary } from '@/lib/ecocash-utils'
import { usePrintPreferences } from '@/hooks/use-print-preferences'
import { buildReceiptWithBusinessInfo } from '@/lib/printing/receipt-builder'
import { ReceiptPrintManager } from '@/lib/receipts/receipt-print-manager'
import { CustomerLookup } from '@/components/pos/customer-lookup'
import { SalespersonSelector, type SelectedSalesperson } from '@/components/pos/salesperson-selector'
import { useCustomerRewards } from '@/app/universal/pos/hooks/useCustomerRewards'
import type { CustomerReward } from '@/app/universal/pos/hooks/useCustomerRewards'
import { AddCustomerModal } from '@/components/customers/add-customer-modal'
import { DailySalesWidget } from '@/components/pos/daily-sales-widget'
import { TodayExpensesWidget } from '@/components/pos/TodayExpensesWidget'
import { useToastContext } from '@/components/ui/toast'
import { formatDuration, formatDataAmount } from '@/lib/printing/format-utils'
import { useCustomerDisplaySync, useOpenCustomerDisplay } from '@/hooks/useCustomerDisplaySync'
import { SyncMode } from '@/lib/customer-display/sync-manager'
import { useGlobalCart } from '@/contexts/global-cart-context'
import { ManualEntryTab } from '@/components/pos/manual-entry-tab'
import type { ManualCartItem } from '@/components/pos/manual-entry-tab'
import { ManualOrderSummary } from '@/components/pos/manual-order-summary'
import { AddStockPanel } from '@/components/clothing/add-stock-panel'
import { BulkStockPanel } from '@/components/inventory/bulk-stock-panel'
import { SalespersonEodModal } from '@/components/eod/salesperson-eod-modal'
import { ManagerOverrideModal, type OrderSummary as CancelOrderSummary } from '@/components/manager-override/manager-override-modal'

interface POSItem {
  id: string
  name: string
  barcode?: string
  pluCode?: string
  sku?: string
  category: string
  categoryId?: string  // for desk mode category filtering
  unitType: 'each' | 'weight' | 'volume'
  price: number
  unit: string
  taxable: boolean
  weightRequired: boolean
  ageRestricted?: boolean
  snapEligible?: boolean
  organicCertified?: boolean
  loyaltyPoints?: number
  imageUrl?: string  // Product image for customer display
  baleId?: string       // set for bale items transferred from clothing
  customBulkId?: string // set for custom bulk product items
  stockQuantity?: number  // from desk-products API
  categoryEmoji?: string  // from desk-products API
  categoryColor?: string  // hex color from business_category.color
  subcategoryEmoji?: string
  domainEmoji?: string
  isExpiryDiscount?: boolean
}

interface CartItem extends POSItem {
  quantity: number
  weight?: number
  subtotal: number
  discountAmount?: number
}

interface Customer {
  id: string
  name: string
  phone: string
  loyaltyNumber: string
  loyaltyTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  pointsBalance: number
  snapBalance?: number
  preferredPaymentMethod?: string
}

// Main POS content component that uses the business context
/** Returns a best-match emoji for a product based on subcategory → category → domain → name keyword. */
function getGenericEmoji(name: string): string {
  const n = name.toLowerCase()
  if (/apple|mango|orange|grape|lemon|lime|pear|plum|peach|banana|pineapple|melon|berry|fruit/.test(n)) return '🍎'
  if (/carrot|tomato|onion|potato|spinach|cabbage|broccoli|pepper|cucumber|garlic|vegetable|veg|lettuce|mushroom/.test(n)) return '🥕'
  if (/chicken|breast|thigh|drumstick|wing/.test(n)) return '🍗'
  if (/beef|pork|lamb|goat|steak|chop|sausage|bacon|ham|mince|meat/.test(n)) return '🥩'
  if (/fish|tuna|salmon|sardine|tilapia|seafood|prawn|shrimp/.test(n)) return '🐟'
  if (/egg|eggs/.test(n)) return '🥚'
  if (/milk|cheese|yogurt|butter|cream|dairy/.test(n)) return '🥛'
  if (/bread|bun|roll|loaf|pastry|cake|biscuit|cookie|scone/.test(n)) return '🍞'
  if (/rice|sadza|ugali|posho|porridge|meal|maize|flour|wheat|pasta|spaghetti|noodle/.test(n)) return '🌾'
  if (/water|juice|drink|soda|cola|beer|wine|spirit|beverage|tea|coffee/.test(n)) return '🥤'
  if (/oil|cooking|margarine|fat/.test(n)) return '🫙'
  if (/sugar|salt|spice|sauce|ketchup|mayo|condiment|vinegar/.test(n)) return '🧂'
  if (/soap|detergent|wash|clean|bleach|sanitizer/.test(n)) return '🧼'
  if (/snack|chip|crisp|popcorn|nut|peanut|chocolate|sweet|candy/.test(n)) return '🍿'
  if (/sanitary|tissue|toilet|nappy|diaper|pad/.test(n)) return '🧻'
  return '🛒'
}
function resolveProductEmoji(product: Pick<POSItem, 'subcategoryEmoji' | 'categoryEmoji' | 'domainEmoji' | 'name'>): string {
  return product.subcategoryEmoji || product.categoryEmoji || product.domainEmoji || getGenericEmoji(product.name)
}

function GroceryPOSContent() {
  const { formatCurrency } = useBusinessContext()
  const customAlert = useAlert()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cart, setCart] = useState<CartItem[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [pluInput, setPluInput] = useState('')
  const [weightInput, setWeightInput] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'snap' | 'loyalty' | 'ecocash'>('cash')
  const [ecocashTxCode, setEcocashTxCode] = useState('')
  const [isScaleConnected, setIsScaleConnected] = useState(true)
  const [currentWeight, setCurrentWeight] = useState(0)
  const [showCustomerLookup, setShowCustomerLookup] = useState(false)
  const [posMode, setPosMode] = useState<'live' | 'manual'>('live')
  const [scaleVisible, setScaleVisible] = useState(false)
  const [deskMode, setDeskMode] = useState(true)
  // EOD gate state (Phase 4 / Phase 8)
  const [eodGate, setEodGate] = useState<{
    hasPending: boolean
    pendingDate: string | null
    deadlinePassed: boolean
    deadlineTime: string | null
    todayStatus: string | null
  } | null>(null)
  const [eodGateLoading, setEodGateLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [productStatsMap, setProductStatsMap] = useState<Map<string, { soldToday: number; soldYesterday: number; soldDayBefore: number; firstSoldTodayAt: string | null }>>(new Map())
  const [deskSearchTerm, setDeskSearchTerm] = useState('')
  const [deskProducts, setDeskProducts] = useState<POSItem[]>([])
  const [deskCategories, setDeskCategories] = useState<{ key: string; label: string; emoji: string; stockTotal: number }[]>([])
  const [deskProductsLoading, setDeskProductsLoading] = useState(true)
  const [pinnedCategoryKeys, setPinnedCategoryKeys] = useState<Set<string>>(new Set())
  const [showMoreCategories, setShowMoreCategories] = useState(false)
  const VISIBLE_CATEGORY_LIMIT = 10
  const [manualCart, setManualCart] = useState<ManualCartItem[]>([])
  const [showScanner, setShowScanner] = useState(false)
  const [quickStockBarcode, setQuickStockBarcode] = useState<string | null>(null)
  const [quickStockExistingProduct, setQuickStockExistingProduct] = useState<{ id: string; name: string; variantId?: string } | null>(null)
  const [showBulkStockPanel, setShowBulkStockPanel] = useState(false)
  const [products, setProducts] = useState<POSItem[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [pendingReceiptData, setPendingReceiptData] = useState<ReceiptData | null>(null)
  const [completedOrder, setCompletedOrder] = useState<any>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<CancelOrderSummary | null>(null)
  const [showCashTenderModal, setShowCashTenderModal] = useState(false)
  const [cashTendered, setCashTendered] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [dailySales, setDailySales] = useState<any>(null)
  const [yesterdaySales, setYesterdaySales] = useState<any>(null)
  const [dayBeforeYesterdaySales, setDayBeforeYesterdaySales] = useState<any>(null)
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [loadingRecent, setLoadingRecent] = useState(false)
  const [financialRefreshKey, setFinancialRefreshKey] = useState(0)
  const [businessDetails, setBusinessDetails] = useState<any>(null)
  const [isAutoAdding, setIsAutoAdding] = useState(false)
  const autoAddProductIdRef = useRef<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string
    customerNumber: string
    name: string
    email?: string
    phone?: string
    customerType: string
  } | null>(null)
  const [appliedReward, setAppliedReward] = useState<CustomerReward | null>(null)
  const [skipRewardThisTime, setSkipRewardThisTime] = useState(false)
  const autoAppliedForRef = useRef<string | null>(null)
  const [showRecentTransactions, setShowRecentTransactions] = useState(false)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

  // Close "more categories" dropdown on click outside
  useEffect(() => {
    if (!showMoreCategories) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-more-categories]')) setShowMoreCategories(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMoreCategories])

  // Pre-select customer from URL params (barcode scan navigation) or pos:select-customer event
  useEffect(() => {
    const customerId = searchParams.get('customerId')
    const customerNumber = searchParams.get('customerNumber')
    const customerName = searchParams.get('customerName')
    if (customerId && customerNumber && customerName) {
      setSelectedCustomer({ id: customerId, customerNumber, name: customerName, phone: searchParams.get('customerPhone') ?? undefined, customerType: 'INDIVIDUAL' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const c = (e as CustomEvent).detail
      if (c?.id) { setSelectedCustomer(c); setAppliedReward(null); setSkipRewardThisTime(true) }
    }
    window.addEventListener('pos:select-customer', handler)
    return () => window.removeEventListener('pos:select-customer', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // WiFi integration states
  const [esp32IntegrationEnabled, setEsp32IntegrationEnabled] = useState(false)
  const [r710IntegrationEnabled, setR710IntegrationEnabled] = useState(false)
  const [activeWiFiTab, setActiveWiFiTab] = useState<'esp32' | 'r710'>('esp32')
  const [requestingMore, setRequestingMore] = useState<Set<string>>(new Set())

  // Business tax configuration
  const [businessConfig, setBusinessConfig] = useState<{
    taxIncludedInPrice: boolean
    taxRate: number
    taxLabel: string
  }>({
    taxIncludedInPrice: true,
    taxRate: 0,
    taxLabel: 'Tax'
  })

  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const pluInputRef = useRef<HTMLInputElement>(null)
  const cashTenderInputRef = useRef<HTMLInputElement>(null)

  // Load print preferences
  const { preferences: printPreferences } = usePrintPreferences()

  // Use the business permissions context for proper business management
  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
    loading: businessLoading,
    hasPermission
  } = useBusinessPermissionsContext()

  // Customer rewards hook — must be after currentBusinessId is available
  const { rewards: customerRewards, usedRewards: customerUsedRewards } = useCustomerRewards(
    selectedCustomer?.id ?? null,
    currentBusinessId ?? null
  )

  // Toast context for notifications
  const toast = useToastContext()

  // Global cart context for mini cart sync
  const { cart: globalCart, clearCart: clearGlobalCart, replaceCart: replaceGlobalCart } = useGlobalCart()
  // Only clear global cart when POS cart goes from non-empty → empty (order completed).
  const posHadItemsRef = useRef(false)
  const syncingFromPOS = useRef(false)
  // Capture globalCart at mount so load effect can read in-memory items (avoids localStorage race condition)
  const globalCartAtMountRef = useRef(globalCart)

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

  // Fetch business configuration on mount
  useEffect(() => {
    async function fetchBusinessConfig() {
      if (!currentBusinessId) return

      try {
        const response = await fetch(`/api/universal/business-config?businessId=${currentBusinessId}`)
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setBusinessConfig({
              taxIncludedInPrice: result.data.taxIncludedInPrice ?? true,
              taxRate: result.data.taxRate ?? 0,
              taxLabel: result.data.taxLabel || 'Tax'
            })
            console.log('✅ Business config loaded:', {
              taxIncludedInPrice: result.data.taxIncludedInPrice,
              taxRate: result.data.taxRate
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch business config:', error)
      }
    }

    fetchBusinessConfig()
  }, [currentBusinessId])

  // Track if cart has been loaded from localStorage to prevent overwriting on mount
  const [cartLoaded, setCartLoaded] = useState(false)

  // Load cart from localStorage on mount (per-business persistence)
  // Always merges global-cart items added from inventory so they aren't lost
  // when the POS → global sync fires on load.
  useEffect(() => {
    if (!currentBusinessId) return

    try {
      const savedCart = localStorage.getItem(`cart-${currentBusinessId}`)
      const parsedCart: CartItem[] = savedCart ? JSON.parse(savedCart) : []

      // Use in-memory global cart (from context) — more reliable than localStorage which may lag behind
      // due to async save effects not having flushed yet at navigation time.
      const globalItems: any[] = globalCartAtMountRef.current

      const toCartItem = (g: any): CartItem => ({
        id: g.productId,
        name: g.name,
        price: Number(g.price) || 0,
        quantity: g.quantity || 1,
        subtotal: (Number(g.price) || 0) * (g.quantity || 1),
        pluCode: g.sku || undefined,
        barcode: g.sku || undefined,
        sku: g.sku || undefined,
        category: g.attributes?.category || 'General',
        unitType: 'each' as const,
        unit: g.attributes?.unit || 'each',
        taxable: false,
        weightRequired: false,
      } as CartItem)

      if (parsedCart.length > 0) {
        // Rehydrate POS cart
        const rehydrated = parsedCart.map((item: CartItem) => ({
          ...item,
          price: Number(item.price) || 0,
          subtotal: (Number(item.price) || 0) * (item.quantity || 1),
        }))

        // Find global-cart items that aren't in the POS cart (added from inventory)
        const posIds = new Set(rehydrated.map((item: CartItem) => item.id))
        const inventoryOnly = globalItems.filter((g: any) => !posIds.has(g.productId))

        if (inventoryOnly.length > 0) {
          setCart([...rehydrated, ...inventoryOnly.map(toCartItem)])
          console.log(`✅ Cart merged: ${rehydrated.length} POS + ${inventoryOnly.length} inventory items`)
        } else {
          setCart(rehydrated)
          console.log('✅ Cart restored from localStorage:', rehydrated.length, 'items')
        }
      } else if (globalItems.length > 0) {
        // POS cart empty — import everything from global cart
        setCart(globalItems.map(toCartItem))
        console.log('✅ Cart imported from mini cart:', globalItems.length, 'items')
      } else {
        setCart([])
        console.log('🔄 No saved cart for this business')
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error)
      setCart([])
    } finally {
      setCartLoaded(true)
    }
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

  // Restore + persist pinned categories per business
  useEffect(() => {
    if (!currentBusinessId) return
    try {
      const stored = localStorage.getItem(`grocery-pos-pinned-cats-${currentBusinessId}`)
      if (stored) setPinnedCategoryKeys(new Set(JSON.parse(stored)))
    } catch { /* non-critical */ }
  }, [currentBusinessId])

  useEffect(() => {
    if (!currentBusinessId) return
    try {
      localStorage.setItem(`grocery-pos-pinned-cats-${currentBusinessId}`, JSON.stringify([...pinnedCategoryKeys]))
    } catch { /* non-critical */ }
  }, [pinnedCategoryKeys, currentBusinessId])

  // Restore + persist scaleVisible preference per business
  useEffect(() => {
    if (!currentBusinessId) return
    const stored = localStorage.getItem(`grocery-pos-scale-${currentBusinessId}`)
    if (stored !== null) setScaleVisible(stored === 'true')
  }, [currentBusinessId])

  useEffect(() => {
    if (!currentBusinessId) return
    localStorage.setItem(`grocery-pos-scale-${currentBusinessId}`, String(scaleVisible))
  }, [scaleVisible, currentBusinessId])

  // Restore + persist deskMode preference per business (defaults to true)
  useEffect(() => {
    if (!currentBusinessId) return
    const stored = localStorage.getItem(`grocery-pos-deskmode-${currentBusinessId}`)
    setDeskMode(stored !== null ? stored === 'true' : true)
  }, [currentBusinessId])

  // EOD gate check — runs when business loads for salesperson role
  useEffect(() => {
    if (!currentBusinessId || !currentBusiness?.requireSalespersonEod) return
    if (currentBusiness?.role !== 'salesperson') return
    setEodGateLoading(true)
    fetch(`/api/eod/salesperson/pending?businessId=${currentBusinessId}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setEodGate(json)
      })
      .catch(() => {})
      .finally(() => setEodGateLoading(false))
  }, [currentBusinessId, currentBusiness?.requireSalespersonEod, currentBusiness?.role])

  useEffect(() => {
    if (!currentBusinessId) return
    localStorage.setItem(`grocery-pos-deskmode-${currentBusinessId}`, String(deskMode))
  }, [deskMode, currentBusinessId])

  // Notify customer display when selected customer changes
  useEffect(() => {
    sendToDisplay('SET_CUSTOMER', {
      customerName: selectedCustomer?.name || null,
      rewardMessage: null,
      rewardApplied: false,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer])

  // Auto-apply first available reward when customer rewards load
  useEffect(() => {
    if (!selectedCustomer || appliedReward || customerRewards.length === 0) return
    if (autoAppliedForRef.current === selectedCustomer.id) return
    autoAppliedForRef.current = selectedCustomer.id
    setAppliedReward(customerRewards[0])
    toast.push(`Reward applied: ${customerRewards[0].couponCode}`, { type: 'success' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerRewards])

  // Clear EcoCash transaction code whenever cart empties (payment complete, void, or mini-cart clear)
  useEffect(() => {
    if (cart.length === 0) setEcocashTxCode('')
  }, [cart.length])

  // Sync POS cart to global cart to keep mini cart in sync
  useEffect(() => {
    if (!currentBusinessId || !cartLoaded) return

    try {
      syncingFromPOS.current = true
      if (cart.length > 0) {
        posHadItemsRef.current = true
        const globalCartItems = cart.map(item => ({
          productId: item.id,
          variantId: item.id, // Grocery items don't have variants
          name: item.name,
          sku: item.barcode || item.pluCode || item.id,
          price: Number(item.price) || 0,
          quantity: item.quantity,
          attributes: {}
        }))
        replaceGlobalCart(globalCartItems)
      } else if (posHadItemsRef.current) {
        // Cart went from non-empty → empty (order completed) — clear mini cart too
        replaceGlobalCart([])
      }
      // else: POS mounted with empty cart — leave mini cart untouched
    } catch (error) {
      console.error('❌ [Grocery POS] Failed to sync to global cart:', error)
    } finally {
      syncingFromPOS.current = false
    }
  }, [cart, currentBusinessId, cartLoaded, replaceGlobalCart])

  // Reverse sync: reflect mini cart quantity changes (and clears) back to POS cart
  useEffect(() => {
    if (!currentBusinessId || !cartLoaded || syncingFromPOS.current) return
    if (globalCart.length === 0 && cart.length > 0) {
      // Mini cart cleared externally — clear POS cart too
      setCart([])
      return
    }
    if (globalCart.length > 0 && cart.length > 0) {
      // Sync quantity changes made in the mini cart back to the POS cart
      let changed = false
      const updatedCart = cart.map(item => {
        const globalItem = globalCart.find(g => g.productId === item.id)
        if (globalItem && globalItem.quantity !== item.quantity) {
          changed = true
          return { ...item, quantity: globalItem.quantity, subtotal: item.price * globalItem.quantity }
        }
        return item
      }).filter(item => {
        // Remove items deleted from mini cart
        const stillInGlobal = globalCart.some(g => g.productId === item.id)
        if (!stillInGlobal) changed = true
        return stillInGlobal
      })
      if (changed) setCart(updatedCart)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalCart, currentBusinessId, cartLoaded])

  // Broadcast cart state to customer display after cart is loaded
  useEffect(() => {
    if (!currentBusinessId || !cartLoaded || !terminalId) return

    // Broadcast the current cart state to customer display
    broadcastCartState(cart)
  }, [cartLoaded, currentBusinessId, terminalId])

  // Broadcast cart state to customer display
  const broadcastCartState = (cartItems: CartItem[]) => {
    console.log('[Grocery POS] Broadcasting cart state, items:', cartItems.length)
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    // Calculate tax based on business config
    let tax: number
    let total: number

    if (businessConfig.taxIncludedInPrice) {
      // Tax is embedded in prices - calculate for display
      tax = subtotal * (businessConfig.taxRate / (100 + businessConfig.taxRate))
      total = subtotal // Total equals subtotal (tax already included)
    } else {
      // Tax is NOT included, add it to subtotal
      tax = subtotal * (businessConfig.taxRate / 100)
      total = subtotal + tax
    }

    const cartMessage = {
      items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        variant: item.unit || '',
        imageUrl: item.imageUrl  // Include product image for customer display
      })),
      subtotal,
      tax,
      total,
      rewardPending: !!appliedReward && !skipRewardThisTime,
      rewardAmount: (appliedReward && !skipRewardThisTime) ? Number(appliedReward.rewardAmount) : undefined
    }

    console.log('[Grocery POS] Sending CART_STATE:', cartMessage)

    // Signal active business, page context, then cart state
    sendToDisplay('SET_ACTIVE_BUSINESS', { subtotal: 0, tax: 0, total: 0 })
    sendToDisplay('SET_PAGE_CONTEXT', { pageContext: 'pos', subtotal: 0, tax: 0, total: 0 })
    sendToDisplay('CART_STATE', cartMessage)

    console.log('[Grocery POS] CART_STATE sent')
  }

  // Broadcast EcoCash payment prompt to customer display when EcoCash is selected
  useEffect(() => {
    if (!currentBusinessId || cart.length === 0) return
    const totals = calculateTotals()
    if (paymentMethod === 'ecocash') {
      const { fee, total: ecocashTotal } = getEcocashSummary(totals.total, currentBusiness)
      sendToDisplay('PAYMENT_STARTED', {
        subtotal: totals.total,
        tax: 0,
        total: ecocashTotal,
        ecocashFee: fee,
        paymentMethod: 'ECOCASH'
      })
    } else {
      // Reset payment state on customer display when switching away from EcoCash
      sendToDisplay('PAYMENT_CANCELLED', { subtotal: 0, tax: 0, total: 0 })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, currentBusinessId])

  // Get user info
  const { data: session, status } = useSession()
  const sessionUser = session?.user as SessionUser
  const employeeId = sessionUser?.id
  const isAdmin = sessionUser?.role === 'admin'
  const [selectedSalesperson, setSelectedSalesperson] = useState<SelectedSalesperson | null>(null)
  const selectedSalespersonRef = useRef<SelectedSalesperson | null>(null)
  // Check if current business is a grocery business
  const isGroceryBusiness = currentBusiness?.businessType === 'grocery'

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

      // Update products state with accurate ESP32 counts
      setProducts(prev => prev.map(product => {
        if ((product as any).wifiToken) {
          const tokenConfigId = (product as any).tokenConfigId
          const esp32Count = esp32QuantityMap[tokenConfigId]
          if (esp32Count !== undefined) {
            console.log(`🔄 Updating ${product.name} quantity: ${(product as any).availableQuantity} → ${esp32Count}`)
            return {
              ...product,
              availableQuantity: esp32Count
            }
          }
        }
        return product
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

  // Extract fetchProducts as a callable function for reuse
  const fetchProducts = useCallback(async () => {
    if (!currentBusinessId) return

    setProductsLoading(true)
    try {
      // Fetch products, ESP32 WiFi tokens, and R710 WiFi tokens
      const [response, wifiTokensResponse, r710IntegrationResponse] = await Promise.all([
        fetch(`/api/universal/products?businessId=${currentBusinessId}&businessType=grocery&includeVariants=true&includeImages=true`),
        fetch(`/api/business/${currentBusinessId}/wifi-tokens`),
        fetch(`/api/r710/integration?businessId=${currentBusinessId}`)
      ])

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            // Map API products to POSItem format
            const posItems: POSItem[] = []

            // Filter out products with invalid prices (null, 0, negative, NaN)
            const validProducts = result.data.filter((product: any) => {
              // Only show available, active items with a valid price > 0
              if (!product.isAvailable || !product.isActive) return false
              const price = Number(product.basePrice)
              return price > 0 && !isNaN(price)
            })

            validProducts.forEach((product: any) => {
              // Get primary image or first image for customer display
              const primaryImage = product.images?.find((img: any) => img.isPrimary) || product.images?.[0]
              const imageUrl = primaryImage?.imageUrl || primaryImage?.url

              if (product.variants && product.variants.length > 0) {
                // Add each variant as a separate POS item
                product.variants.forEach((variant: any) => {
                  posItems.push({
                    id: variant.id,
                    name: variant.name || product.name,
                    barcode: variant.barcode || product.barcode || product.sku,
                    pluCode: variant.sku || product.sku,
                    category: product.category?.name || 'General',
                    unitType: product.attributes?.unitType === 'weight' ? 'weight' : 'each',
                    price: parseFloat(variant.price || product.basePrice || 0),
                    unit: product.attributes?.unit || (product.attributes?.unitType === 'weight' ? 'lb' : 'each'),
                    taxable: product.attributes?.taxable || false,
                    weightRequired: product.attributes?.unitType === 'weight',
                    ageRestricted: product.attributes?.ageRestricted || false,
                    snapEligible: product.attributes?.snapEligible || false,
                    organicCertified: product.attributes?.organicCertified || false,
                    loyaltyPoints: product.attributes?.loyaltyPoints || 0,
                    imageUrl: imageUrl  // Product image for customer display
                  })
                })
              } else {
                // Product without variants
                posItems.push({
                  id: product.id,
                  name: product.name,
                  barcode: product.barcode || product.sku,
                  pluCode: product.sku,
                  category: product.category?.name || 'General',
                  unitType: product.attributes?.unitType === 'weight' ? 'weight' : 'each',
                  price: parseFloat(product.basePrice || 0),
                  unit: product.attributes?.unit || (product.attributes?.unitType === 'weight' ? 'lb' : 'each'),
                  taxable: product.attributes?.taxable || false,
                  weightRequired: product.attributes?.unitType === 'weight',
                  ageRestricted: product.attributes?.ageRestricted || false,
                  snapEligible: product.attributes?.snapEligible || false,
                  organicCertified: product.attributes?.organicCertified || false,
                  loyaltyPoints: product.attributes?.loyaltyPoints || 0,
                  imageUrl: imageUrl  // Product image for customer display
                })
              }
            })

            // Add WiFi tokens if available
            if (wifiTokensResponse.ok) {
              const wifiData = await wifiTokensResponse.json()
              if (wifiData.success && wifiData.menuItems) {
                console.log('🔍 [WiFi Menu Items]:', wifiData.menuItems)
                const tokenConfigIds = wifiData.menuItems.map((item: any) => item.tokenConfigId)

                // STEP 1: Get database counts IMMEDIATELY (non-blocking)
                let quantityMap: Record<string, number> = {}

                if (tokenConfigIds.length > 0) {
                  try {
                    console.log('📊 [Step 1] Fetching database counts for immediate display...')
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

                      console.log('✅ [Step 1] Database counts displayed:', quantityMap)
                    }
                  } catch (error) {
                    console.error('❌ Database fetch error:', error)
                  }
                }

                const wifiTokenItems = wifiData.menuItems
                  .filter((item: any) => item.isActive)
                  .map((item: any) => ({
                    id: `wifi-token-${item.id}`,
                    name: `📡 ${item.tokenConfig.name}`,
                    barcode: `WIFI-${item.id}`,
                    pluCode: `WIFI-${item.id}`,
                    category: 'ESP32 WiFi',
                    unitType: 'each' as const,
                    price: item.businessPrice,
                    unit: 'each',
                    taxable: false,
                    weightRequired: false,
                    wifiToken: true, // Flag to identify WiFi tokens
                    businessTokenMenuItemId: item.id,
                    tokenConfigId: item.tokenConfigId,
                    tokenConfig: item.tokenConfig,
                    availableQuantity: quantityMap[item.tokenConfigId] || 0,
                  }))
                posItems.push(...wifiTokenItems)

                // Set ESP32 integration as enabled
                if (wifiTokenItems.length > 0) {
                  setEsp32IntegrationEnabled(true)
                }

                // STEP 2: Start background ESP32 sync (non-blocking, progressive updates)
                if (tokenConfigIds.length > 0) {
                  console.log('🔄 [Step 2] Starting background ESP32 sync...')
                  syncESP32TokenQuantities(currentBusinessId, tokenConfigIds).catch(err => {
                    console.error('❌ Background ESP32 sync failed:', err)
                  })
                }
              }
            }

            // Add R710 WiFi tokens if integration exists
            if (r710IntegrationResponse.ok) {
              try {
                const r710Integration = await r710IntegrationResponse.json()

                if (r710Integration.hasIntegration) {
                  // Set R710 integration as enabled (show tab even if no menu items yet)
                  setR710IntegrationEnabled(true)

                  // Start background R710 WLAN sync (non-blocking)
                  if (currentBusinessId) {
                    syncR710Wlan(currentBusinessId).catch(() => {
                      // Silently ignore - already handled in function
                    })
                  }

                  // Fetch R710 token menu items for this business
                  const r710MenuResponse = await fetch(`/api/business/${currentBusinessId}/r710-tokens`)

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
                            `/api/r710/tokens?businessId=${currentBusinessId}&tokenConfigId=${menuItem.tokenConfigId}&status=AVAILABLE`
                          )

                          if (tokensResponse.ok) {
                            const tokensData = await tokensResponse.json()
                            // Filter out tokens that have been sold (have sale records)
                            const availableTokens = (tokensData.tokens || []).filter((token: any) => {
                              // Token must be AVAILABLE and not have any sales
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

                      const r710TokenPOSItems = r710MenuItems
                        .filter((item: any) => item.isActive)
                        .map((item: any) => ({
                          id: `r710-token-${item.id}`,
                          name: `📶 ${item.tokenConfig.name}`,
                          barcode: `R710-${item.id}`,
                          pluCode: `R710-${item.id}`,
                          category: 'R710 WiFi',
                          unitType: 'each' as const,
                          price: item.businessPrice,
                          unit: 'each',
                          taxable: false,
                          weightRequired: false,
                          r710Token: true, // Flag to identify R710 tokens
                          businessTokenMenuItemId: item.id,
                          tokenConfigId: item.tokenConfigId,
                          tokenConfig: item.tokenConfig,
                          availableQuantity: r710AvailabilityMap[item.tokenConfigId] || 0,
                        }))

                      posItems.push(...r710TokenPOSItems)

                      console.log(`✅ Added ${r710TokenPOSItems.length} R710 token menu items`)
                    }
                  }
                }
              } catch (r710Error) {
                console.error('❌ Error loading R710 tokens:', r710Error)
                // Don't fail if R710 fails to load
              }
            }

            // Add custom bulk products so they appear in search and product grid
            try {
              const bulkRes = await fetch(`/api/custom-bulk?businessId=${currentBusinessId}`)
              const bulkData = await bulkRes.json()
              if (bulkData.success && Array.isArray(bulkData.data)) {
                const bulkItems: POSItem[] = bulkData.data
                  .filter((b: any) => b.remainingCount > 0)
                  .map((b: any) => ({
                    id: `cbulk_${b.id}`,
                    name: b.name,
                    barcode: b.barcode,
                    pluCode: b.sku,
                    category: b.category?.name || 'Bulk Products',
                    unitType: 'each' as const,
                    price: Number(b.unitPrice),
                    unit: 'each',
                    taxable: false,
                    weightRequired: false,
                    customBulkId: b.id,
                    stockQuantity: b.remainingCount,
                  }))
                posItems.push(...bulkItems)
              }
            } catch (bulkErr) {
              console.error('❌ Error loading custom bulk products:', bulkErr)
            }

            setProducts(posItems)
          }
        }
      } catch (error) {
        console.error('Failed to fetch products:', error)
      } finally {
        setProductsLoading(false)
      }
  }, [currentBusinessId])

  // Fetch products when business changes
  useEffect(() => {
    fetchProducts()
  }, [currentBusinessId, fetchProducts])

  // Fetch per-product stats for desk mode performance bars
  const fetchProductStats = useCallback(async () => {
    if (!currentBusinessId) return
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const res = await fetch(`/api/grocery/product-stats?businessId=${currentBusinessId}&timezone=${encodeURIComponent(tz)}`)
      if (!res.ok) return
      const result = await res.json()
      if (result.success && Array.isArray(result.data)) {
        const map = new Map<string, { soldToday: number; soldYesterday: number; soldDayBefore: number; firstSoldTodayAt: string | null }>()
        result.data.forEach((s: any) => map.set(s.productId, s))
        setProductStatsMap(map)
      }
    } catch (e) {
      console.error('[grocery-pos] fetchProductStats error:', e)
    }
  }, [currentBusinessId])

  // Fetch desk products (BarcodeInventoryItems) for desk mode grid
  const fetchDeskProducts = useCallback(async () => {
    if (!currentBusinessId) return
    setDeskProductsLoading(true)
    try {
      const res = await fetch(`/api/grocery/desk-products?businessId=${currentBusinessId}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.success) {
        setDeskProducts(data.items)
        setDeskCategories(data.categories)
      }
    } catch (e) {
      console.error('[grocery-pos] fetchDeskProducts error:', e)
    } finally {
      setDeskProductsLoading(false)
    }
  }, [currentBusinessId])

  // Fetch stats + desk products when desk mode activates
  useEffect(() => {
    if (deskMode && currentBusinessId) {
      fetchProductStats()
      fetchDeskProducts()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deskMode, currentBusinessId])

  // Manual cart helpers
  const addToManualCart = (item: ManualCartItem) => {
    setManualCart(prev => {
      if (item.isCustom) return [...prev, item]
      const existing = prev.find(c => c.id === item.id)
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, item]
    })
  }
  const updateManualCartQuantity = (id: string, qty: number) => {
    if (qty <= 0) { setManualCart(prev => prev.filter(c => c.id !== id)); return }
    setManualCart(prev => prev.map(c => c.id === id ? { ...c, quantity: qty } : c))
  }
  const removeFromManualCart = (id: string) => setManualCart(prev => prev.filter(c => c.id !== id))
  const clearManualCart = () => setManualCart([])

  // Derive categories from loaded products for manual entry
  // Convert POSItem[] to MenuItemLike[] for ManualEntryTab (exclude WiFi tokens and zero-price items)
  const manualMenuItems = products
    .filter(p => p.category !== 'ESP32 WiFi' && p.category !== 'R710 WiFi' && p.price > 0)
    .map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      category: p.category,
      isAvailable: true,
      barcode: p.barcode,
      variants: [{ id: p.id, name: p.name, price: p.price }],
    }))

  const manualCategories = ['all', ...Array.from(new Set(manualMenuItems.filter(p => p.category).map(p => p.category)))]

  // Set default active WiFi tab based on enabled integrations
  useEffect(() => {
    if (esp32IntegrationEnabled && !r710IntegrationEnabled) {
      setActiveWiFiTab('esp32')
    } else if (r710IntegrationEnabled && !esp32IntegrationEnabled) {
      setActiveWiFiTab('r710')
    } else if (esp32IntegrationEnabled && r710IntegrationEnabled) {
      // Both enabled, default to ESP32
      setActiveWiFiTab('esp32')
    }
  }, [esp32IntegrationEnabled, r710IntegrationEnabled])

  // Fetch business details for receipts
  useEffect(() => {
    if (!currentBusinessId) return

    const fetchBusinessDetails = async () => {
      try {
        const response = await fetch(`/api/business/${currentBusinessId}`)
        if (response.ok) {
          const data = await response.json()
          setBusinessDetails(data.business)  // Extract business object from response
        }
      } catch (error) {
        console.error('Failed to fetch business details:', error)
      }
    }

    fetchBusinessDetails()
  }, [currentBusinessId])

  // Auto-open customer display and send greeting/context on mount
  useEffect(() => {
    if (!currentBusinessId || !currentBusiness) {
      console.log('[Grocery POS] Waiting for business context...', { currentBusinessId, hasBusiness: !!currentBusiness })
      return
    }

    let isActive = true

    async function initializeDisplay() {
      try {
        console.log('[Grocery POS] Starting customer display initialization...')

        // Try to open display (may fail if already open or popup blocked - that's OK)
        try {
          await openDisplay()
          console.log('[Grocery POS] Customer display window opened')
        } catch (displayError) {
          }

        // Fetch full business details from API to get all fields
        console.log('[Grocery POS] Fetching business details for:', currentBusinessId)
        const response = await fetch(`/api/business/${currentBusinessId}`)
        if (!response.ok) {
          console.error('[Grocery POS] Failed to fetch business details, status:', response.status)
          return
        }
        const data = await response.json()
        const businessData = data.business // API returns { business: {...} }
        console.log('[Grocery POS] Business data fetched:', {
          name: businessData?.name,
          phone: businessData?.phone,
          receiptReturnPolicy: businessData?.receiptReturnPolicy
        })

        // Fetch employee photo before the delay so it's ready when greeting is sent
        const photoData = await fetch('/api/employees/my-photo').then(r => r.json()).catch(() => ({}))

        // Wait longer for BroadcastChannel to initialize on BOTH windows
        console.log('[Grocery POS] Waiting for BroadcastChannel to be ready...')
        await new Promise(resolve => setTimeout(resolve, 2000))

        if (!isActive) return

        console.log('[Grocery POS] Sending greeting message...')
        // Send greeting and business info
        // Use selected salesperson if already set from localStorage restore (SalespersonSelector fires before this 2000ms delay)
        const sp = selectedSalespersonRef.current
        const greetingData = {
          employeeName: sp?.name || sessionUser?.name || 'Staff',
          employeePhotoUrl: sp?.photoUrl || photoData?.profilePhotoUrl || undefined,
          businessName: businessData?.name || businessData?.umbrellaBusinessName || currentBusiness.businessName || '',
          businessPhone: businessData?.phone || businessData?.umbrellaBusinessPhone || '',
          customMessage: businessData?.receiptReturnPolicy || 'All sales are final',
          subtotal: 0,
          tax: 0,
          total: 0
        }

        sendToDisplay('SET_GREETING', greetingData)
        console.log('[Grocery POS] Greeting sent:', greetingData)

        // Set page context to POS
        sendToDisplay('SET_PAGE_CONTEXT', {
          pageContext: 'pos',
          subtotal: 0,
          tax: 0,
          total: 0
        })
        console.log('[Grocery POS] Page context set to POS')
      } catch (error) {
        console.error('[Grocery POS] Failed to initialize customer display:', error)
      }
    }

    initializeDisplay()

    // Cleanup: Set context back to marketing when leaving POS
    return () => {
      isActive = false
      console.log('[Grocery POS] Cleanup: Setting context back to marketing')
      sendToDisplay('SET_PAGE_CONTEXT', {
        pageContext: 'marketing',
        subtotal: 0,
        tax: 0,
        total: 0
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
    // IMPORTANT: Only depend on currentBusinessId (string) to avoid infinite loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusinessId])

  const sampleCustomer: Customer = {
    id: 'c1',
    name: 'Sarah Johnson',
    phone: '(555) 123-4567',
    loyaltyNumber: 'LOY123456',
    loyaltyTier: 'Gold',
    pointsBalance: 2450,
    snapBalance: 150.00,
    preferredPaymentMethod: 'card'
  }

  // Simulate scale weight updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (isScaleConnected) {
        // Simulate slight weight fluctuations
        setCurrentWeight(prev => prev + (Math.random() - 0.5) * 0.1)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isScaleConnected])

  // Load daily sales (today + yesterday + day before for comparison)
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

      const [todayRes, yRes, dbRes] = await Promise.allSettled([
        fetch(`/api/universal/daily-sales?businessId=${currentBusinessId}&businessType=grocery&timezone=${tz}`),
        fetch(`/api/universal/daily-sales?businessId=${currentBusinessId}&businessType=grocery&timezone=${tz}&date=${yStr}`),
        fetch(`/api/universal/daily-sales?businessId=${currentBusinessId}&businessType=grocery&timezone=${tz}&date=${dbStr}`)
      ])
      if (todayRes.status === 'fulfilled' && todayRes.value.ok) {
        const data = await todayRes.value.json()
        setDailySales(data.data)
      }
      if (yRes.status === 'fulfilled' && yRes.value.ok) {
        const yData = await yRes.value.json()
        setYesterdaySales(yData.data)
      }
      if (dbRes.status === 'fulfilled' && dbRes.value.ok) {
        const dbData = await dbRes.value.json()
        setDayBeforeYesterdaySales(dbData.data)
      }
    } catch (error) {
      console.error('Failed to load daily sales:', error)
    }
  }

  // Load last 5 transactions for today
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
        if (data.success) setRecentTransactions(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load recent transactions:', error)
    } finally {
      setLoadingRecent(false)
    }
  }

  // Load daily sales and recent transactions on mount
  useEffect(() => {
    if (currentBusinessId) {
      loadDailySales()
      loadRecentTransactions()
    }
  }, [currentBusinessId])

  // Periodic refresh of daily sales every 30s for multi-user accuracy
  useEffect(() => {
    if (!currentBusinessId) return
    const interval = setInterval(() => loadDailySales(), 30000)
    return () => clearInterval(interval)
  }, [currentBusinessId])

  const findProductByBarcode = (barcode: string) => {
    return products.find(p => p.barcode === barcode)
  }

  const findProductByPLU = (plu: string) => {
    return products.find(p => p.pluCode === plu)
  }

  const addToCart = async (product: POSItem, quantity = 1, weight?: number) => {
    // Prevent adding $0 items to cart (except WiFi tokens)
    const isWiFiToken = (product as any).wifiToken === true
    const isR710Token = (product as any).r710Token === true
    const isAnyToken = isWiFiToken || isR710Token

    if (!isAnyToken && (!product.price || product.price <= 0)) {
      void customAlert({
        title: 'Invalid Price',
        description: `Cannot add "${product.name}" with $0 price to cart. Please set a price first or use discounts for price reductions.`
      })
      return
    }

    // Check portal health and availability before adding WiFi tokens (ESP32)
    if (isWiFiToken) {
      // Check available quantity
      const availableQuantity = (product as any).availableQuantity || 0
      const currentCartQuantity = cart.find(c => c.id === product.id)?.quantity || 0

      if (availableQuantity <= currentCartQuantity) {
        if (availableQuantity === 0) {
          void customAlert({
            title: '⚠️ No WiFi Tokens Available',
            description: `No WiFi tokens available for "${product.name}". Please create more tokens in the WiFi Portal.`
          })
        } else {
          void customAlert({
            title: '⚠️ Insufficient Tokens',
            description: `Only ${availableQuantity} WiFi token(s) available for "${product.name}". You already have ${currentCartQuantity} in cart.`
          })
        }
        return
      }

      try {
        const healthResponse = await fetch(`/api/wifi-portal/integration/health?businessId=${currentBusinessId}`)
        const healthData = await healthResponse.json()

        if (!healthData.success || healthData.health?.status !== 'healthy') {
          void customAlert({ title: 'WiFi Portal Unavailable', description: 'WiFi Portal is currently unavailable. Cannot add WiFi tokens to cart.' })
          return
        }
      } catch (error) {
        void customAlert({ title: 'Connection Error', description: 'Failed to verify WiFi Portal status. Please try again.' })
        return
      }
    }

    // Check availability before adding R710 tokens
    if (isR710Token) {
      const availableQuantity = (product as any).availableQuantity || 0
      const currentCartQuantity = cart.find(c => c.id === product.id)?.quantity || 0

      if (availableQuantity <= currentCartQuantity) {
        if (availableQuantity === 0) {
          void customAlert({
            title: '⚠️ No R710 WiFi Tokens Available',
            description: `No R710 WiFi tokens available for "${product.name}". Please create more tokens in the R710 Portal.`
          })
        } else {
          void customAlert({
            title: '⚠️ Insufficient R710 Tokens',
            description: `Only ${availableQuantity} R710 WiFi token(s) available for "${product.name}". You already have ${currentCartQuantity} in cart.`
          })
        }
        return
      }
    }

    const actualQuantity = product.weightRequired ? (weight || currentWeight) : quantity
    const subtotal = product.price * actualQuantity

    // Use setCart with functional updater to always read latest cart state
    // (avoids stale closure when called after awaits or from event handlers)
    setCart(prev => {
      const existingItem = prev.find(item => item.id === product.id)
      let newCart: CartItem[]
      if (existingItem) {
        newCart = prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + actualQuantity, subtotal: item.subtotal + subtotal }
            : item
        )
      } else {
        const cartItem: CartItem = {
          ...product,
          quantity: actualQuantity,
          weight: product.weightRequired ? actualQuantity : undefined,
          subtotal
        }
        newCart = [...prev, cartItem]
      }
      broadcastCartState(newCart)
      return newCart
    })

    // Clear inputs
    setBarcodeInput('')
    setPluInput('')
    setWeightInput('')
    setCurrentWeight(0)
  }

  // Add inventory item (BarcodeInventoryItem from Add Stock) to cart
  const addInventoryItemToCart = useCallback((item: any) => {
    if (!item?.inventoryItemId) return
    const price = parseFloat(item.sellingPrice ?? item.price ?? 0)
    if (price <= 0) return
    const posItem: POSItem = {
      id: `inv_${item.inventoryItemId}`,
      name: item.productName ?? item.name ?? 'Unknown Item',
      barcode: item.barcodeData || item.barcode || undefined,
      category: 'General',
      unitType: 'each',
      price,
      unit: 'each',
      taxable: false,
      weightRequired: false,
    }
    setCart(prev => {
      const existing = prev.find(ci => ci.id === posItem.id)
      if (existing) {
        return prev.map(ci => ci.id === posItem.id
          ? { ...ci, quantity: ci.quantity + 1, subtotal: ci.subtotal + price }
          : ci)
      }
      return [...prev, { ...posItem, quantity: 1, subtotal: price }]
    })
  }, [])

  // Listen for inventory items dispatched by global barcode modal
  useEffect(() => {
    const handler = (e: Event) => {
      const item = (e as CustomEvent).detail
      if (item?.inventoryItemId) addInventoryItemToCart(item)
    }
    window.addEventListener('pos:add-inventory-item-to-cart', handler)
    return () => window.removeEventListener('pos:add-inventory-item-to-cart', handler)
  }, [addInventoryItemToCart])

  // Listen for custom bulk products dispatched by global barcode modal
  useEffect(() => {
    const handler = (e: Event) => {
      const bulk = (e as CustomEvent).detail
      if (!bulk?.id) return
      const price = parseFloat(bulk.unitPrice ?? 0)
      if (price <= 0) return
      const posItem: POSItem = {
        id: `cbulk_${bulk.id}`,
        name: bulk.name || `Bulk - ${bulk.batchNumber}`,
        barcode: bulk.sku || undefined,
        category: bulk.categoryName || 'General',
        unitType: 'each',
        price,
        unit: 'each',
        taxable: false,
        weightRequired: false,
      }
      setCart(prev => {
        const existing = prev.find(ci => ci.id === posItem.id)
        if (existing) {
          return prev.map(ci => ci.id === posItem.id
            ? { ...ci, quantity: ci.quantity + 1, subtotal: ci.subtotal + price }
            : ci)
        }
        return [...prev, { ...posItem, quantity: 1, subtotal: price }]
      })
    }
    window.addEventListener('pos:add-custom-bulk-to-cart', handler)
    return () => window.removeEventListener('pos:add-custom-bulk-to-cart', handler)
  }, [])

  // Step 1: Capture addProduct from URL ONCE on mount.
  // Use window.history.replaceState (synchronous) so React Strict Mode's second
  // mount sees a clean URL and doesn't re-capture the same product twice.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const addProductId = params.get('addProduct')
    const autoAdd = params.get('autoAdd')
    if (!addProductId || autoAdd !== 'true') return
    autoAddProductIdRef.current = addProductId
    window.history.replaceState({}, '', window.location.pathname + `?businessId=${currentBusinessId}`)
  }, [])

  // Step 2: Once cart is loaded, add the captured product exactly once.
  // For inv_ items (barcodeInventoryItems) fetch directly — they are not in the products list.
  // For regular products, wait for products list to load then find by ID.
  useEffect(() => {
    if (!autoAddProductIdRef.current || !cartLoaded) return
    const productId = autoAddProductIdRef.current

    // inv_ items live in barcodeInventoryItems, not in the universal products list.
    // Fetch directly from the inventory API and add to cart.
    if (productId.startsWith('inv_')) {
      autoAddProductIdRef.current = null
      ;(async () => {
        try {
          const res = await fetch(`/api/inventory/${currentBusinessId}/items/${productId}`)
          if (!res.ok) return
          const data = await res.json()
          const item = data.data
          if (!item) return
          const price = item.sellPrice || 0
          if (price <= 0) return
          setCart(prev => {
            if (prev.some(i => i.id === productId)) return prev
            return [...prev, {
              id: productId,
              name: item.name,
              barcode: item.barcodeData || undefined,
              category: item.category || 'General',
              unitType: 'each',
              price,
              unit: item.unit || 'units',
              taxable: false,
              weightRequired: false,
              quantity: 1,
              subtotal: price,
            }]
          })
        } catch (e) {
          console.error('❌ Auto-add inv_ item failed:', e)
        }
      })()
      return
    }

    // Regular BusinessProducts — wait for products list to load
    if (products.length === 0 || productsLoading) return
    autoAddProductIdRef.current = null

    const product = products.find(p => p.id === productId)
    if (!product) {
      console.error('❌ Auto-add: product not found:', productId)
      return
    }
    // Skip if item is already in the cart (may have been restored from localStorage)
    setCart(prev => {
      if (prev.some(i => i.id === product.id)) return prev
      const subtotal = product.price * 1
      return [...prev, { ...product, quantity: 1, subtotal }]
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, productsLoading, cartLoaded])

  // Handle addBale URL param — navigated here from GlobalBarcodeModal "Add to Cart"
  useEffect(() => {
    const addBaleId = searchParams?.get('addBale')
    if (!addBaleId || !currentBusinessId) return
    fetch(`/api/clothing/bales/${addBaleId}?businessId=${currentBusinessId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          const bale = data.data
          addToCart({
            id: bale.id,
            name: `${bale.category?.name || bale.categoryName || 'Bale'} - ${bale.batchNumber}`,
            category: bale.category?.name || bale.categoryName || 'Bale',
            unitType: 'each',
            price: parseFloat(bale.unitPrice),
            unit: 'each',
            taxable: false,
            weightRequired: false,
            baleId: bale.id,
          })
          router.replace(`/grocery/pos?businessId=${currentBusinessId}`, { scroll: false })
        }
      })
      .catch(() => {})
  }, [searchParams, currentBusinessId])

  // Handle addCustomBulk URL param — navigated here from GlobalBarcodeModal "Add to Cart" on another business
  useEffect(() => {
    const addCustomBulkId = searchParams?.get('addCustomBulk')
    if (!addCustomBulkId || !currentBusinessId) return
    ;(async () => {
      try {
        const res = await fetch(`/api/custom-bulk/${addCustomBulkId}`)
        if (!res.ok) return
        const d = await res.json()
        if (d.success && d.data) {
          const bulk = d.data
          const price = parseFloat(bulk.unitPrice ?? 0)
          if (price <= 0) return
          addToCart({
            id: `cbulk_${bulk.id}`,
            name: bulk.name,
            barcode: bulk.sku || undefined,
            category: bulk.category?.name || 'General',
            unitType: 'each',
            price,
            unit: 'each',
            taxable: false,
            weightRequired: false,
          })
        }
        router.replace(`/grocery/pos?businessId=${currentBusinessId}`, { scroll: false })
      } catch (err) {
        console.error('Error fetching custom bulk for grocery POS:', err)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, currentBusinessId])

  // Handle pos:add-bale-to-cart event — dispatched by GlobalBarcodeModal when already on POS
  // Uses functional setCart updater to avoid stale closure over `cart`
  useEffect(() => {
    const handler = (e: Event) => {
      const bale = (e as CustomEvent).detail
      if (!bale?.id) return
      const price = parseFloat(bale.unitPrice)
      const name = `${bale.category?.name || bale.categoryName || 'Bale'} - ${bale.batchNumber}`
      const category = bale.category?.name || bale.categoryName || 'Bale'
      setCart(prev => {
        const existing = prev.find(item => item.id === bale.id)
        if (existing) {
          return prev.map(item => item.id === bale.id
            ? { ...item, quantity: item.quantity + 1, subtotal: item.subtotal + price }
            : item
          )
        }
        return [...prev, {
          id: bale.id, name, category, unitType: 'each' as const, price,
          unit: 'each', taxable: false, weightRequired: false, baleId: bale.id,
          quantity: 1, subtotal: price,
        }]
      })
    }
    window.addEventListener('pos:add-bale-to-cart', handler)
    return () => window.removeEventListener('pos:add-bale-to-cart', handler)
  }, [])

  const removeFromCart = (productId: string) => {
    const newCart = cart.filter(item => item.id !== productId)
    setCart(newCart)
    broadcastCartState(newCart)
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    const newCart = cart.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity, subtotal: item.price * newQuantity }
        : item
    )
    setCart(newCart)
    broadcastCartState(newCart)
  }

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcodeInput) return
    const product = findProductByBarcode(barcodeInput)
    if (product) {
      if (product.weightRequired) {
        void customAlert({ title: 'Weight required', description: 'Please place item on scale and confirm weight' })
      } else {
        addToCart(product)
      }
      setBarcodeInput('')
      return
    }
    // Fall back to scan API — handles transferred bales
    try {
      const res = await fetch('/api/universal/barcode-management/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: barcodeInput.trim(), businessId: currentBusinessId })
      })
      const data = await res.json()
      if (data.type === 'bale') {
        const bale = data.data.bale
        if (bale.remainingCount <= 0) {
          void customAlert({ title: 'Out of stock', description: `Bale ${bale.batchNumber} has no remaining items.` })
        } else {
          addToCart({
            id: bale.id,
            name: `${bale.categoryName} - ${bale.batchNumber}`,
            category: bale.categoryName,
            unitType: 'each',
            price: bale.unitPrice,
            unit: 'each',
            taxable: false,
            weightRequired: false,
            baleId: bale.id,
          })
        }
      } else {
        // Try custom bulk product lookup
        try {
          const bulkRes = await fetch(`/api/custom-bulk?businessId=${currentBusinessId}&barcode=${encodeURIComponent(barcodeInput.trim())}`)
          const bulkData = await bulkRes.json()
          const bulk = bulkData.data?.[0]
          if (bulk && bulk.remainingCount > 0) {
            addToCart({
              id: `cbulk_${bulk.id}`,
              name: bulk.name,
              category: bulk.category?.name || 'Bulk',
              unitType: 'each',
              price: Number(bulk.unitPrice),
              unit: 'each',
              taxable: false,
              weightRequired: false,
              customBulkId: bulk.id,
            })
          } else if (bulk && bulk.remainingCount <= 0) {
            void customAlert({ title: 'Out of stock', description: `${bulk.name} has no remaining items.` })
          } else {
            void customAlert({ title: 'Not found', description: 'Product not found' })
          }
        } catch {
          void customAlert({ title: 'Not found', description: 'Product not found' })
        }
      }
    } catch {
      void customAlert({ title: 'Not found', description: 'Product not found' })
    }
    setBarcodeInput('')
  }

  const handlePLUSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pluInput) {
      const product = findProductByPLU(pluInput)
      if (product) {
        if (product.weightRequired && currentWeight === 0) {
          void customAlert({ title: 'Weight required', description: 'Please place item on scale to get weight' })
        } else {
          addToCart(product, 1, currentWeight)
        }
      } else {
        void customAlert({ title: 'Not found', description: 'PLU code not found' })
      }
    }
  }

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0)
    const taxableAmount = cart.filter(item => item.taxable).reduce((sum, item) => sum + item.subtotal, 0)

    // Calculate tax based on business config
    let tax: number
    let total: number

    if (businessConfig.taxIncludedInPrice) {
      // Tax is embedded - calculate embedded tax amount for taxable items
      tax = taxableAmount * (businessConfig.taxRate / (100 + businessConfig.taxRate))
      total = subtotal // Total equals subtotal (tax already included)
    } else {
      // Tax not included - add tax to taxable items
      tax = taxableAmount * (businessConfig.taxRate / 100)
      total = subtotal + tax
    }

    const snapEligibleAmount = cart.filter(item => item.snapEligible).reduce((sum, item) => sum + item.subtotal, 0)
    const loyaltyPoints = cart.reduce((sum, item) => sum + (item.loyaltyPoints || 0) * Math.ceil(item.quantity), 0)
    const rewardCredit = (appliedReward && !skipRewardThisTime) ? Math.min(Number(appliedReward.rewardAmount), total) : 0
    const finalTotal = Math.max(0, total - rewardCredit)

    return { subtotal, tax, total: finalTotal, rewardCredit, snapEligibleAmount, loyaltyPoints }
  }

  const handlePayment = async () => {
    const totals = calculateTotals()

    if (cart.length === 0) {
      void customAlert({ title: 'Cart empty', description: 'Cart is empty!' })
      return
    }

    if (paymentMethod === 'snap' && customer?.snapBalance) {
      if (customer.snapBalance < totals.snapEligibleAmount) {
        void customAlert({ title: 'Insufficient SNAP', description: 'Insufficient SNAP balance. Please use another payment method for remaining amount.' })
        return
      }
    }

    // For EcoCash, validate transaction code is present
    if (paymentMethod === 'ecocash' && !ecocashTxCode.trim()) {
      void customAlert({ title: 'EcoCash code required', description: 'Please enter the EcoCash transaction code.' })
      return
    }

    // For cash payments, show tender modal
    if (paymentMethod === 'cash') {
      setCashTendered('')
      setShowCashTenderModal(true)
      // Focus on cash input after modal opens
      setTimeout(() => cashTenderInputRef.current?.focus(), 100)
      return
    }

    // For non-cash payments, process immediately
    await processPayment()
  }

  const processPayment = async () => {
    if (processingPayment) return
    setProcessingPayment(true)
    const totals = calculateTotals()

    // Compute EcoCash fee upfront so it's available for both the order and the receipt
    const computedEcocashFee = paymentMethod === 'ecocash'
      ? calcEcocashFeeFromBusiness(totals.total, currentBusiness)
      : 0

    try {
      // Create order using universal orders API
      const orderData = {
        businessId: currentBusinessId,
        businessType: 'grocery',
        employeeId: selectedSalesperson?.employeeId ?? employeeId,
        customerId: selectedCustomer?.id || null,
        orderType: 'SALE',
        paymentMethod: paymentMethod.toUpperCase(),
        discountAmount: totals.rewardCredit || 0,
        taxAmount: totals.tax,
        rewardId: (appliedReward && !skipRewardThisTime) ? appliedReward.id : undefined,
        ...(paymentMethod === 'ecocash' ? {
          ecocashTransactionCode: ecocashTxCode.trim(),
          ecocashFeeType: (currentBusiness as any)?.ecocashFeeType ?? 'FIXED',
          ecocashFeeValue: Number((currentBusiness as any)?.ecocashFeeValue ?? 0),
          ecocashFeeAmount: computedEcocashFee,
        } : {}),
        attributes: {
          posOrder: true,
          paymentMethod: paymentMethod,
          loyaltyPointsEarned: totals.loyaltyPoints,
          snapEligibleAmount: totals.snapEligibleAmount,
          customerInfo: selectedCustomer ? {
            name: selectedCustomer.name,
            phone: selectedCustomer.phone
          } : customer ? {
            name: customer.name,
            phone: customer.phone,
            loyaltyNumber: customer.loyaltyNumber,
            tier: customer.loyaltyTier
          } : null
        },
        notes: selectedCustomer ? `Customer: ${selectedCustomer.name}` : customer ? `Loyalty member: ${customer.loyaltyNumber}` : 'Walk-in customer',
        items: cart.map(item => {
          const isInventoryItem = item.id.startsWith('inv_')
          const isBale = !!item.baleId
          // Detect custom bulk by flag OR by cbulk_-prefixed id (fallback for stale cart items)
          const isCustomBulkById = item.id.startsWith('cbulk_')
          const isCustomBulk = !!item.customBulkId || isCustomBulkById
          const resolvedBulkId = item.customBulkId || (isCustomBulkById ? item.id.replace('cbulk_', '') : undefined)
          return {
            productVariantId: (item.wifiToken || item.r710Token || isInventoryItem || isBale || isCustomBulk) ? null : item.id,
            quantity: item.quantity,
            unitPrice: item.price,
            discountAmount: item.discountAmount || 0,
            attributes: {
              weight: item.weight,
              unitType: item.unitType,
              category: item.category,
              barcode: item.barcode,
              pluCode: item.pluCode,
              organicCertified: item.organicCertified,
              snapEligible: item.snapEligible,
              // WiFi token specific attributes (ESP32)
              wifiToken: item.wifiToken || false,
              // R710 token specific attributes
              r710Token: item.r710Token || false,
              tokenConfigId: item.tokenConfigId,
              businessTokenMenuItemId: item.businessTokenMenuItemId,
              productName: item.name,
              packageName: item.tokenConfig?.name,
              duration: item.tokenConfig?.durationMinutes || item.tokenConfig?.durationValue,
              // Inventory item (BarcodeInventoryItem) flag — tells orders API to skip variant lookup
              isInventoryItem: isInventoryItem || undefined,
              inventoryItemId: isInventoryItem ? item.id.replace('inv_', '') : undefined,
              // Bale item — triggers ClothingBales.remainingCount decrement in orders API
              baleId: item.baleId || undefined,
              isBale: isBale || undefined,
              // Custom bulk product — triggers customBulkProducts.remainingCount decrement in orders API
              customBulkId: resolvedBulkId || undefined,
              isCustomBulk: isCustomBulk || undefined,
            }
          }
        })
      }

      const response = await fetch('/api/universal/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create order')
      }

      const result = await response.json()

      if (result.success) {
        // Set completed order for display
        const orderSummary = {
          orderId: result.data.id,
          orderNumber: result.data.orderNumber,
          total: totals.total,
          paymentMethod: paymentMethod.toUpperCase(),
          amountReceived: paymentMethod === 'cash' ? parseFloat(cashTendered)
            : paymentMethod === 'ecocash' ? totals.total + computedEcocashFee
            : totals.total,
          change: paymentMethod === 'cash' ? (parseFloat(cashTendered) - totals.total) : 0,
          ecocashFeeAmount: paymentMethod === 'ecocash' ? computedEcocashFee : undefined,
          ecocashTransactionCode: paymentMethod === 'ecocash' ? ecocashTxCode.trim() : undefined,
          items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price
          })),
          wifiTokens: result.data.wifiTokens || [],
          r710Tokens: result.data.r710Tokens || []
        }

        setCompletedOrder(orderSummary)

        // Clear cart after successful payment and broadcast to customer display
        setCart([])
        clearGlobalCart()
        sendToDisplay('CLEAR_CART', {
          subtotal: 0,
          tax: 0,
          total: 0
        })
        setCustomer(null)
        setSelectedCustomer(null)
        setAppliedReward(null)
        setSkipRewardThisTime(false)
        autoAppliedForRef.current = null
        setShowCashTenderModal(false)
        setCashTendered('')
        setEcocashTxCode('')
        setPaymentMethod('cash')

        // Immediately decrement stockQuantity for custom bulk items in local state
        // so badges reflect the sale before fetchProducts() reloads from the DB
        const soldCart = cart
        setProducts(prev => prev.map(p => {
          if (!p.customBulkId) return p
          const sold = soldCart.filter(c => c.customBulkId === p.customBulkId).reduce((sum, c) => sum + c.quantity, 0)
          if (sold === 0) return p
          return { ...p, stockQuantity: Math.max(0, (p.stockQuantity ?? 0) - sold) }
        }))

        // Show receipt modal
        setShowReceiptModal(true)
        // Reload daily sales, recent transactions, and products after order completion
        setTimeout(() => {
          loadDailySales()
          loadRecentTransactions()
          fetchProducts() // Refresh WiFi token availability badges
          setFinancialRefreshKey(k => k + 1)
          if (deskMode) { fetchProductStats(); fetchDeskProducts() } // Refresh desk mode performance bars + stock counts
        }, 500)
      } else {
        throw new Error(result.error || 'Failed to process order')
      }
    } catch (error) {
      console.error('Payment processing error:', error)
      await customAlert({ title: 'Payment failed', description: `${error instanceof Error ? error.message : 'Unknown error'}` })
    } finally {
      setProcessingPayment(false)
    }
  }

  // Build receipt data from completed order
  const buildReceiptDataFromCompletedOrder = (order: any, business: any): ReceiptData => {
    // Use businessInfo from order (API response), fallback to businessDetails or business (membership)
    const actualBusiness = order.businessInfo || businessDetails || business
    const businessName = actualBusiness?.name || actualBusiness?.businessName || 'Grocery Store'
    const businessAddress = actualBusiness?.address || actualBusiness?.umbrellaBusinessAddress || ''
    const businessPhone = actualBusiness?.phone || actualBusiness?.umbrellaBusinessPhone || ''

    return {
      receiptNumber: {
        globalId: order.orderNumber,
        dailySequence: order.orderNumber.split('-').pop() || '001',
        formattedNumber: order.orderNumber
      },
      businessId: currentBusinessId || '',
      businessType: 'grocery',
      businessName: businessName,
      businessAddress: businessAddress,
      businessPhone: businessPhone,
      businessEmail: actualBusiness?.email || actualBusiness?.settings?.email,
      transactionId: order.orderNumber,
      transactionDate: new Date(),
      salespersonName: selectedSalesperson?.name ?? sessionUser?.name ?? 'Staff',
      salespersonId: selectedSalesperson?.employeeId ?? sessionUser?.id ?? '',
      items: order.items.map((item: any) => ({
        name: item.name,
        sku: item.sku, // Only grocery items have SKU, tokens don't
        quantity: item.quantity,
        unitPrice: Number(item.price),
        totalPrice: Number(item.price) * item.quantity
      })),
      subtotal: order.total,
      tax: 0,
      discount: Number(order.discountAmount) > 0 ? Number(order.discountAmount) : undefined,
      discountLabel: Number(order.discountAmount) > 0 ? 'Reward Applied' : undefined,
      total: order.total,
      paymentMethod: order.paymentMethod?.toLowerCase() || 'cash',
      amountPaid: order.paymentMethod?.toUpperCase() === 'ECOCASH'
        ? order.total + (order.ecocashFeeAmount || 0)
        : order.amountReceived || order.total,
      changeDue: order.change || 0,
      ecocashFeeAmount: order.ecocashFeeAmount,
      ecocashTransactionCode: order.ecocashTransactionCode,
      wifiTokens: order.wifiTokens?.map((token: any) => {
        console.log('📡 [Grocery] Mapping ESP32 WiFi token:', token)
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
        console.log('📡 [Grocery] Mapped ESP32 token:', mapped)
        return mapped
      }),
      r710Tokens: order.r710Tokens?.map((token: any) => {
        console.log('📶 [Grocery] Mapping R710 WiFi token:', token)

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
        console.log('📶 [Grocery] Mapped R710 token:', mapped)
        return mapped
      }),
      footerMessage: 'Thank you for shopping with us!'
    }
  }

  // Handle printing receipt to configured printer
  const handlePrintReceipt = async (receiptData: ReceiptData) => {
    try {
      setPendingReceiptData(receiptData)
      setShowReceiptPreview(true)
    } catch (error) {
      console.error('Print error:', error)
      toast.error('Failed to open receipt preview')
    }
  }

  const totals = calculateTotals()
  const tenderedAmount = parseFloat(cashTendered) || 0
  const changeAmount = tenderedAmount - totals.total

  return (
    <>
      {/* Cash Tender Modal */}
      {showCashTenderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-primary mb-4">Cash Payment</h2>

            <div className="space-y-4">
              {/* Total Due */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="text-sm text-secondary mb-1">Total Due:</div>
                <div className="text-3xl font-bold text-primary">{formatCurrency(totals.total)}</div>
              </div>

              {/* Cash Tendered Input */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Amount Tendered:
                </label>
                <input
                  ref={cashTenderInputRef}
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tenderedAmount >= totals.total) {
                      setShowCashTenderModal(false)
                      processPayment()
                    }
                  }}
                  placeholder="0.00"
                  className="w-full text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 20, 50].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setCashTendered(amount.toString())}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCashTendered(Math.ceil(totals.total).toString())}
                className="w-full px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800"
              >
                Exact Amount
              </button>

              {/* Change Display */}
              {tenderedAmount > 0 && (
                <div className={`rounded-lg p-4 ${
                  changeAmount >= 0
                    ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500'
                    : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500'
                }`}>
                  <div className="text-sm font-medium mb-1">
                    {changeAmount >= 0 ? 'Change Due:' : 'Insufficient:'}
                  </div>
                  <div className={`text-3xl font-bold ${
                    changeAmount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(Math.abs(changeAmount))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCashTenderModal(false)
                    setCashTendered('')
                  }}
                  className="flex-1 px-4 py-3 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowCashTenderModal(false)
                    processPayment()
                  }}
                  disabled={processingPayment || tenderedAmount < totals.total}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
                >
                  {processingPayment ? 'Processing...' : 'Complete Sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completed Order Receipt Modal */}
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
                        <span className="text-gray-600 dark:text-gray-400">
                          {item.quantity}x {item.name}
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
                      const isError = token.success === false || token.error

                      if (isError) {
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
                      const isError = token.success === false || token.error

                      if (isError) {
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
                  {completedOrder.paymentMethod === 'ECOCASH' && completedOrder.ecocashFeeAmount > 0 && (
                    <>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                        <span className="text-gray-900 dark:text-gray-100">${completedOrder.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-1 text-orange-600 dark:text-orange-400">
                        <span>EcoCash Fee:</span>
                        <span>+${completedOrder.ecocashFeeAmount.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-700 dark:text-gray-300">Total:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      ${(completedOrder.total + (completedOrder.ecocashFeeAmount || 0)).toFixed(2)}
                    </span>
                  </div>
                  {completedOrder.paymentMethod === 'ECOCASH' && completedOrder.ecocashTransactionCode && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600 dark:text-gray-400">EcoCash Ref:</span>
                      <span className="font-mono text-gray-900 dark:text-gray-100">{completedOrder.ecocashTransactionCode}</span>
                    </div>
                  )}
                  {completedOrder.paymentMethod === 'CASH' && (
                    <>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600 dark:text-gray-400">Received:</span>
                        <span className="text-gray-900 dark:text-gray-100">${completedOrder.amountReceived.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-gray-600 dark:text-gray-400">Change:</span>
                        <span className="text-green-600 dark:text-green-400">${completedOrder.change.toFixed(2)}</span>
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

                {/* Cancel Order Button */}
                <button
                  onClick={() => {
                    if (!completedOrder?.orderId) return
                    setCancelTarget({
                      orderId: completedOrder.orderId,
                      orderNumber: completedOrder.orderNumber,
                      totalAmount: completedOrder.total,
                      paymentMethod: completedOrder.paymentMethod,
                      createdAt: new Date().toISOString(),
                    })
                    setShowCancelModal(true)
                  }}
                  className="w-full py-2 text-red-600 border border-red-300 font-medium rounded-lg hover:bg-red-50 transition-colors"
                >
                  Cancel Order
                </button>

                {/* Close Button */}
                <button
                  onClick={() => {
                    setShowReceiptModal(false)
                    setCompletedOrder(null)
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

      {/* Manager Override Modal — order cancellation */}
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
              if (!res.ok) {
                await customAlert({ title: 'Cancellation failed', description: data.error || 'Could not cancel order' })
                return
              }
              setShowCancelModal(false)
              setShowReceiptModal(false)
              setCompletedOrder(null)
              setCancelTarget(null)
              sendToDisplay('ORDER_CANCELLED', {
                orderNumber: data.orderNumber,
                grossAmount: data.grossAmount,
                feeDeducted: data.feeDeducted,
                refundAmount: data.refundAmount,
                isEcocash: data.isEcocash,
                subtotal: 0, tax: 0, total: 0,
              })
            } catch {
              await customAlert({ title: 'Cancellation failed', description: 'Connection error — please try again' })
            }
          }}
          onAborted={() => setShowCancelModal(false)}
        />
      )}

      {/* Unified Receipt Preview Modal */}
      <UnifiedReceiptPreviewModal
        isOpen={showReceiptPreview}
        onClose={() => {
          setShowReceiptPreview(false)
          setPendingReceiptData(null)
        }}
        receiptData={pendingReceiptData}
        businessType="grocery"
        onPrintConfirm={async (options) => {
          if (!pendingReceiptData) return

          try {
            await ReceiptPrintManager.printReceipt(pendingReceiptData, 'grocery', {
              ...options,
              autoPrint: true,
              onSuccess: (jobId, receiptType) => {
                toast.push(`${receiptType} receipt sent to printer`)
              },
              onError: (error, receiptType) => {
                toast.error(`Error: ${error.message}`)
              }
            })

            // Close preview and completed order modal
            setShowReceiptPreview(false)
            setPendingReceiptData(null)
            setShowReceiptModal(false)
            setCompletedOrder(null)

          } catch (error: any) {
            toast.error(`Print error: ${error.message}`)
          }
        }}
      />

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <AddCustomerModal
          onClose={() => setShowAddCustomerModal(false)}
          onCustomerCreated={(newCustomer) => {
            setShowAddCustomerModal(false)
            if (newCustomer?.id) {
              const displayName =
                newCustomer.fullName ||
                newCustomer.name ||
                `${newCustomer.firstName || ''} ${newCustomer.lastName || ''}`.trim() ||
                'New Customer'
              setSelectedCustomer({
                id: newCustomer.id,
                customerNumber: newCustomer.customerNumber || '',
                name: displayName,
                email: newCustomer.email,
                phone: newCustomer.phone,
                customerType: newCustomer.customerType || 'INDIVIDUAL',
              })
            } else {
              customAlert({ title: 'Success', description: 'Customer created! You can now search for them.' })
            }
          }}
        />
      )}

      {/* EOD blocking overlay — salesperson must submit prior-day report before selling */}
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
              onClose={() => {}} // cannot dismiss — no close button shown
              onSuccess={() => {
                // Re-check — if no more pending days, clear the gate
                fetch(`/api/eod/salesperson/pending?businessId=${currentBusinessId}`)
                  .then(r => r.json())
                  .then(json => { if (json.success) setEodGate(json) })
                  .catch(() => {})
              }}
            />
          </div>
        </div>
      )}

      {/* EOD deadline warning banner — shown after deadline passes but today not yet submitted */}
      {!eodGate?.hasPending && eodGate?.deadlinePassed && eodGate?.todayStatus === 'PENDING' && currentBusinessId && (
        <div className="mb-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg flex items-center justify-between gap-3">
          <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
            ⚠️ EOD submission overdue — please submit your end-of-day report before leaving.
          </p>
          <button
            onClick={() => {
              // Open modal by triggering a state that shows modal inline
              const today = new Date().toISOString().split('T')[0]
              // Reuse gate by creating a fake pending so modal shows — refresh after submit
              setEodGate(prev => prev ? { ...prev, hasPending: true, pendingDate: today } : prev)
            }}
            className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-md bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            Submit Now
          </button>
        </div>
      )}

      <ContentLayout
      title="Grocery Point of Sale"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Grocery', href: '/grocery' },
        { label: 'Point of Sale', isActive: true }
      ]}
    >
      {/* Financial Summary — only for users with canAccessFinancialData */}
      {(isAdmin || hasPermission('canAccessFinancialData')) && (
        <div className="mb-6 space-y-3">
          <DailySalesWidget
            dailySales={dailySales}
            yesterdaySales={yesterdaySales}
            dayBeforeYesterdaySales={dayBeforeYesterdaySales}
            recentTransactions={recentTransactions}
            loadingRecent={loadingRecent}
            businessType="grocery"
            onRefresh={() => { loadDailySales(); loadRecentTransactions() }}
            businessId={currentBusinessId || undefined}
            canCloseBooks={isAdmin || hasPermission('canCloseBooks')}
            managerName={sessionUser?.name || sessionUser?.email || 'Manager'}
            onReorder={(orderItems) => {
              setCart(prev => {
                const next = [...prev]
                for (const item of orderItems) {
                  const name = item.product_variants?.business_products?.name || item.attributes?.productName || item.notes || 'Item'
                  const variantId = item.productVariantId || item.id
                  const price = Number(item.unitPrice) || 0
                  const qty = Number(item.quantity) || 1
                  const idx = next.findIndex(c => c.id === variantId)
                  if (idx >= 0) {
                    next[idx] = { ...next[idx], quantity: next[idx].quantity + qty, subtotal: (next[idx].quantity + qty) * price }
                  } else {
                    next.push({ id: variantId, name, price, quantity: qty, subtotal: qty * price } as any)
                  }
                }
                return next
              })
              toast.push('Items added to cart', { type: 'success' })
            }}
          />
          {currentBusinessId && (
            <TodayExpensesWidget
              businessId={currentBusinessId}
              refreshKey={financialRefreshKey}
            />
          )}
        </div>
      )}

      {/* Recent Orders — for non-financial users (salespeople) */}
      {!isAdmin && !hasPermission('canAccessFinancialData') && recentTransactions.length > 0 && (
        <div className="mb-4 card bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
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
                            return fn ? <span className="text-xs text-gray-400 dark:text-gray-500 truncate">· {fi.quantity}× {fn}</span> : null
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
                            const name = item.product_variants?.business_products?.name || item.attributes?.productName || item.notes || 'Item'
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
                          <div className="pt-2">
                            <button
                              onClick={() => {
                                setCart(prev => {
                                  const next = [...prev]
                                  for (const item of items) {
                                    const name = item.product_variants?.business_products?.name || item.attributes?.productName || item.notes || 'Item'
                                    const variantId = item.productVariantId || item.id
                                    const price = Number(item.unitPrice) || 0
                                    const qty = Number(item.quantity) || 1
                                    const idx = next.findIndex(c => c.id === variantId)
                                    if (idx >= 0) {
                                      next[idx] = { ...next[idx], quantity: next[idx].quantity + qty, subtotal: (next[idx].quantity + qty) * price }
                                    } else {
                                      next.push({ id: variantId, name, price, quantity: qty, subtotal: qty * price } as any)
                                    }
                                  }
                                  return next
                                })
                                toast.push('Items added to cart', { type: 'success' })
                              }}
                              className="w-full py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            >
                              + Re-order
                            </button>
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

      {/* Quick Actions */}
      <div className="mb-4 flex gap-3">
        <button
          onClick={async () => {
            try {
              await openDisplay()
            } catch (error) {
              toast.error('Failed to open customer display. Please allow popups for this site.')
            }
          }}
          className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-medium"
        >
          🖥️ Open Customer Display
        </button>
        {/* Reports - Only for users with report access */}
        {(isAdmin || hasPermission('canViewWifiReports') || hasPermission('canAccessFinancialData')) && (
          <a
            href="/grocery/reports"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg font-medium"
          >
            📊 View Sales Reports & Analytics
          </a>
        )}
      </div>

      {/* Toolbar — mode toggle | view toggles */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* POS mode toggle (Live / Manual) */}
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
          </div>
        )}

        {/* Divider */}
        {(isAdmin || hasPermission('canEnterManualOrders')) && (
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
        )}

        {/* Scale toggle */}
        <button
          onClick={() => setScaleVisible(v => !v)}
          title={scaleVisible ? 'Hide digital scale' : 'Show digital scale'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            scaleVisible
              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
              : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
        >
          ⚖️ Scale
        </button>

        {/* Desk mode toggle */}
        <button
          onClick={() => setDeskMode(v => !v)}
          title={deskMode ? 'Switch to scan mode' : 'Switch to desk mode (product badges)'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            deskMode
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
        >
          🖥️ {deskMode ? 'Desk Mode ON' : 'Desk Mode'}
        </button>
      </div>
    </ContentLayout>

    {/* Grids rendered outside ContentLayout so sticky right panel works (matches restaurant/clothing POS pattern) */}
    <div className="px-2 sm:px-0 pb-6">

      {/* Manual Entry Mode */}
      {posMode === 'manual' && currentBusinessId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <ManualEntryTab
              businessId={currentBusinessId}
              businessType="grocery"
              menuItems={manualMenuItems}
              categories={manualCategories}
              onAddItem={addToManualCart}
              manualCartItems={manualCart}
            />
          </div>
          <ManualOrderSummary
            businessId={currentBusinessId}
            businessType="grocery"
            items={manualCart}
            onUpdateQuantity={updateManualCartQuantity}
            onRemoveItem={removeFromManualCart}
            onClearAll={clearManualCart}
          />
        </div>
      )}

      {posMode === 'live' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main POS Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Product Entry */}
          <div className={`card ${deskMode ? 'pt-0 px-4 sm:px-6 pb-4' : 'p-4 sm:p-6'}`}>
            {!deskMode && <h3 className="text-lg font-semibold mb-4">Product Entry</h3>}

            {/* Barcode + PLU entry — hidden in desk mode (use search + product badges instead) */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 ${deskMode ? 'hidden' : ''}`}>
              {/* Barcode Scanner */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  📷 Barcode Scanner
                </label>
                    <div>
                      <form onSubmit={handleBarcodeSubmit} className="flex flex-col sm:flex-row gap-2">
                        <input
                          ref={barcodeInputRef}
                          type="text"
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          placeholder="Scan or enter barcode"
                          className="w-full sm:flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="submit"
                          className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Add
                        </button>
                      </form>

                      {/* Scanner placed below the manual input to avoid layout squish.
                          On small screens it will be full-width; on larger screens it will
                          naturally size to its content. */}
                      <div className="mt-4">
                        <div className="flex gap-2 mb-2 flex-wrap">
                          <button
                            onClick={() => setShowScanner(!showScanner)}
                            className="px-3 py-2 bg-blue-100 text-blue-800 rounded text-sm"
                          >
                            {showScanner ? 'Hide Scanner' : 'Show Scanner'}
                          </button>
                          <button
                            onClick={() => setShowBulkStockPanel(true)}
                            className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded text-sm font-medium"
                          >
                            📦 Bulk Stock
                          </button>
                        </div>

                        {showScanner && (
                          <div className="w-full md:w-80 max-w-full">
                            <BarcodeScanner
                              onProductScanned={(product: any, variantId?: string) => {
                                // Map UniversalProduct -> POSItem shape expected by addToCart
                                const price = variantId && product?.variants?.length
                                  ? parseFloat((product.variants.find((v: any) => v.id === variantId)?.price ?? product.basePrice) || 0)
                                  : parseFloat(product.basePrice || 0)

                                // Get primary barcode from barcodes array, not SKU
                                const primaryBarcode = product.barcodes?.find((b: any) => b.isPrimary)?.code

                                const posItem: POSItem = {
                                  id: product.isCustomBulk ? `cbulk_${product.customBulkId || product.id}` : (variantId || product.id),
                                  name: product.name,
                                  barcode: primaryBarcode, // Use primary barcode, not SKU
                                  category: product.businessType || 'General',
                                  unitType: 'each',
                                  price,
                                  unit: 'each',
                                  taxable: false,
                                  weightRequired: false,
                                  customBulkId: product.customBulkId || undefined,
                                }
                                addToCart(posItem)
                              }}
                              onNotFound={(barcode) => setQuickStockBarcode(barcode)}
                              onProductNeedsActivation={(product, barcode, variantId) => {
                                setQuickStockExistingProduct({ id: product.id, name: product.name, variantId })
                                setQuickStockBarcode(barcode)
                              }}
                              businessId={currentBusinessId!}
                              showScanner={showScanner}
                              onToggleScanner={() => setShowScanner(!showScanner)}
                              minBarcodeLength={6}
                            />
                          </div>
                        )}
                      </div>
                    </div>
              </div>

              {/* Add Stock Modal */}
              {quickStockBarcode && (
                <AddStockPanel
                  businessId={currentBusinessId!}
                  prefillBarcode={quickStockBarcode}
                  isPosRoute={true}
                  hideBaleTab={true}
                  disablePrint={true}
                  onClose={() => {
                    setQuickStockBarcode(null)
                    setQuickStockExistingProduct(null)
                  }}
                  onItemAdded={() => {
                    setQuickStockBarcode(null)
                    setQuickStockExistingProduct(null)
                  }}
                />
              )}

              {/* PLU Entry */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  🏷️ PLU Code
                </label>
                <form onSubmit={handlePLUSubmit} className="flex flex-col sm:flex-row gap-2">
                  <input
                    ref={pluInputRef}
                    type="text"
                    value={pluInput}
                    onChange={(e) => setPluInput(e.target.value)}
                    placeholder="Enter PLU code"
                    className="w-full sm:flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Add
                  </button>
                </form>
              </div>
            </div>

            {/* Scale Display — shown only when toggled on and not in desk mode */}
            {!deskMode && scaleVisible && (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚖️</span>
                    <span className="font-medium">Digital Scale</span>
                    <span className={`inline-block w-2 h-2 rounded-full ${isScaleConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  </div>
                  <div className="text-2xl font-mono font-bold min-w-[80px] text-right">
                    {currentWeight.toFixed(2)} lbs
                  </div>
                </div>
                <div className="mt-2 flex flex-col xs:flex-row gap-2">
                  <button
                    onClick={() => setCurrentWeight(0)}
                    className="w-full xs:w-auto px-3 py-2 bg-gray-600 text-white rounded text-sm"
                  >
                    Tare
                  </button>
                  <button
                    onClick={() => setCurrentWeight(Math.random() * 5 + 0.1)}
                    className="w-full xs:w-auto px-3 py-2 bg-blue-600 text-white rounded text-sm"
                  >
                    Simulate Weight
                  </button>
                </div>
              </div>
            )}

            {/* Quick Add Buttons for Common Items */}
            {/* WiFi Token Tabs - Only show in normal (non-desk) mode when integration is enabled */}
            {!deskMode && (esp32IntegrationEnabled || r710IntegrationEnabled) && (
              <div className="mb-3 flex gap-2 border-b border-gray-200 dark:border-gray-700">
                {esp32IntegrationEnabled && (
                  <button
                    onClick={() => setActiveWiFiTab('esp32')}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${
                      activeWiFiTab === 'esp32'
                        ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    📡 ESP32 WiFi
                  </button>
                )}
                {r710IntegrationEnabled && (
                  <button
                    onClick={() => setActiveWiFiTab('r710')}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${
                      activeWiFiTab === 'r710'
                        ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    📶 R710 WiFi
                  </button>
                )}
              </div>
            )}

            {/* Desk mode: sticky category tabs + search — edge-to-edge with product grid */}
            {deskMode && (() => {
              // Score categories: stock weight + sales weight (higher sales bumps category up even if low stock)
              const scoredCategories = deskCategories.map(cat => {
                let salesScore = 0
                for (const [productId, stats] of productStatsMap.entries()) {
                  const p = deskProducts.find(dp => dp.id === productId)
                  if (p?.categoryId === cat.key) {
                    salesScore += (stats.soldToday * 3) + (stats.soldYesterday * 1) + (stats.soldDayBefore * 0.5)
                  }
                }
                return { ...cat, score: cat.stockTotal + salesScore }
              }).sort((a, b) => b.score - a.score)

              // Pinned first, then remaining top categories up to VISIBLE_CATEGORY_LIMIT
              const pinned = scoredCategories.filter(c => pinnedCategoryKeys.has(c.key))
              const unpinned = scoredCategories.filter(c => !pinnedCategoryKeys.has(c.key))
              const slotsLeft = Math.max(0, VISIBLE_CATEGORY_LIMIT - pinned.length)
              const visibleCategories = [...pinned, ...unpinned.slice(0, slotsLeft)]
              const hiddenCategories = unpinned.slice(slotsLeft)

              const visibleTabs: { key: string; label: string; pinned?: boolean }[] = [
                { key: '__all__', label: 'All' },
                ...visibleCategories.map(c => ({ key: c.key, label: `${c.emoji} ${c.label}`, pinned: pinnedCategoryKeys.has(c.key) })),
                ...(esp32IntegrationEnabled || r710IntegrationEnabled ? [{ key: '__wifi__', label: '📶 WiFi' }] : []),
              ]
              const activeTab = selectedCategory ?? '__all__'

              return (
                <div className="sticky top-20 z-20 bg-white dark:bg-gray-800 pt-3 pb-3 border-b border-gray-200 dark:border-gray-700 mb-3">
                  {/* Category tabs + More button */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {visibleTabs.map(tab => (
                      <div key={tab.key} className="relative flex-shrink-0">
                        <button
                          onClick={() => { setSelectedCategory(tab.key === '__all__' ? null : tab.key); setDeskSearchTerm(''); setShowMoreCategories(false) }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === tab.key
                              ? 'bg-blue-600 text-white'
                              : 'card text-primary dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {tab.label}
                        </button>
                        {/* Unpin button for pinned categories */}
                        {tab.pinned && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setPinnedCategoryKeys(prev => { const s = new Set(prev); s.delete(tab.key); return s }) }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-gray-500 hover:bg-red-500 text-white rounded-full text-xs flex items-center justify-center leading-none"
                            title="Unpin"
                          >×</button>
                        )}
                      </div>
                    ))}

                    {/* More button — shows hidden categories */}
                    {hiddenCategories.length > 0 && (
                      <div className="relative flex-shrink-0" data-more-categories="true">
                        <button
                          onClick={() => setShowMoreCategories(v => !v)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border-2 border-dashed ${
                            showMoreCategories
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                              : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500'
                          }`}
                          title={`${hiddenCategories.length} more categories`}
                        >
                          + {hiddenCategories.length} more
                        </button>

                        {/* Hidden categories dropdown */}
                        {showMoreCategories && (
                          <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 min-w-[220px] max-h-72 overflow-y-auto">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Click to pin & filter</p>
                            <div className="space-y-1">
                              {hiddenCategories.map(cat => (
                                <button
                                  key={cat.key}
                                  onClick={() => {
                                    setPinnedCategoryKeys(prev => new Set([...prev, cat.key]))
                                    setSelectedCategory(cat.key)
                                    setDeskSearchTerm('')
                                    setShowMoreCategories(false)
                                  }}
                                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-colors"
                                >
                                  <span className="font-medium">{cat.emoji} {cat.label}</span>
                                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{cat.stockTotal} in stock</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <input
                      type="text"
                      value={deskSearchTerm}
                      onChange={e => { setDeskSearchTerm(e.target.value); setShowMoreCategories(false) }}
                      placeholder="Search products..."
                      className="w-full border rounded-lg px-3 py-2 pl-8 text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                    />
                    <span className="absolute left-2.5 top-2.5 text-gray-400 text-sm">🔍</span>
                    {deskSearchTerm && (
                      <button onClick={() => setDeskSearchTerm('')} className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 text-xs">✕</button>
                    )}
                  </div>
                </div>
              )
            })()}

            <div className={deskMode ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3' : 'grid grid-cols-2 sm:grid-cols-4 gap-2'}>
              {deskMode && deskProductsLoading ? (
                <div className="col-span-full text-center py-4 text-secondary">
                  Loading products...
                </div>
              ) : !deskMode && productsLoading ? (
                <div className="col-span-full text-center py-4 text-secondary">
                  Loading products...
                </div>
              ) : deskMode && deskProducts.length === 0 ? (
                <div className="col-span-full text-center py-4 text-secondary">
                  No products available
                </div>
              ) : !deskMode && products.length === 0 ? (
                <div className="col-span-full text-center py-4 text-secondary">
                  No products available
                </div>
              ) : (
                (() => {
                  // Desk mode: use BarcodeInventoryItems; normal mode: use BusinessProducts
                  let filteredProducts: POSItem[] = deskMode ? [...deskProducts] : [...products]

                  // Normal mode: if WiFi integration is enabled, filter by active tab only
                  if (!deskMode && (esp32IntegrationEnabled || r710IntegrationEnabled)) {
                    filteredProducts = products.filter((product) => {
                      const isESP32Token = (product as any).wifiToken === true
                      const isR710Token = (product as any).r710Token === true
                      const isCustomBulk = !!product.customBulkId
                      if (activeWiFiTab === 'esp32') return isESP32Token || isCustomBulk
                      else if (activeWiFiTab === 'r710') return isR710Token || isCustomBulk
                      return isCustomBulk
                    })
                  }

                  // Desk mode: filter by category tab or search
                  if (deskMode) {
                    if (selectedCategory === '__wifi__') {
                      // WiFi tab: show WiFi products from the regular products list
                      filteredProducts = products.filter(p => (p as any).wifiToken || (p as any).r710Token)
                    } else if (selectedCategory) {
                      // Specific inventory category
                      filteredProducts = filteredProducts.filter(p => p.categoryId === selectedCategory)
                    }
                    // Apply search — also include custom bulk products from products[] list
                    if (deskSearchTerm.trim()) {
                      const term = deskSearchTerm.toLowerCase()
                      filteredProducts = filteredProducts.filter(p =>
                        p.name.toLowerCase().includes(term) ||
                        (p.barcode && p.barcode.toLowerCase().includes(term)) ||
                        (p.sku && p.sku.toLowerCase().includes(term)) ||
                        (p.pluCode && p.pluCode.toLowerCase().includes(term))
                      )
                      // Merge matching custom bulk products (they live in products[], not deskProducts[])
                      const bulkMatches = products.filter(p =>
                        p.customBulkId &&
                        (p.name.toLowerCase().includes(term) ||
                         (p.barcode && p.barcode.toLowerCase().includes(term)) ||
                         (p.pluCode && p.pluCode.toLowerCase().includes(term))) &&
                        !filteredProducts.find(fp => fp.id === p.id)
                      )
                      filteredProducts = [...filteredProducts, ...bulkMatches]
                    }
                  }

                  // Exclude zero-stock items (desk mode has stockQuantity; normal mode skips this)
                  if (deskMode) {
                    filteredProducts = filteredProducts.filter(p => p.stockQuantity === undefined || p.stockQuantity > 0)
                  }

                  // Desk mode: sort by performance (soldToday desc, then firstSoldTodayAt asc, then unsold)
                  if (deskMode && productStatsMap.size > 0) {
                    filteredProducts = [...filteredProducts].sort((a, b) => {
                      const sa = productStatsMap.get(a.id)
                      const sb = productStatsMap.get(b.id)
                      const aToday = sa?.soldToday ?? 0
                      const bToday = sb?.soldToday ?? 0
                      if (aToday > 0 && bToday === 0) return -1
                      if (bToday > 0 && aToday === 0) return 1
                      if (aToday > 0 && bToday > 0) {
                        const aFirst = sa?.firstSoldTodayAt ? new Date(sa.firstSoldTodayAt).getTime() : Infinity
                        const bFirst = sb?.firstSoldTodayAt ? new Date(sb.firstSoldTodayAt).getTime() : Infinity
                        return aFirst - bFirst
                      }
                      return 0
                    })
                  }

                  // Normal mode: show first 4; desk mode: show all
                  const displayProducts = deskMode ? filteredProducts : filteredProducts.slice(0, 4)

                  return displayProducts.map((product) => {
                    const cartQty = cart.filter(c => c.id === product.id).reduce((s, c) => s + c.quantity, 0)
                    return (
                  <div
                    key={product.id}
                    onClick={() => product.weightRequired ?
                      (currentWeight > 0 ? addToCart(product, 1, currentWeight) : void customAlert({ title: 'Weigh item', description: 'Please weigh item first' })) :
                      addToCart(product)
                    }
                    className={`relative bg-gray-100 dark:bg-gray-800 border rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm text-primary min-w-0 cursor-pointer select-none ${
                      deskMode
                        ? `p-4 border-2 ${cartQty > 0 ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`
                        : 'p-3 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    {/* Cart quantity badge (desk mode only) */}
                    {deskMode && cartQty > 0 && (
                      <span className="absolute top-1.5 right-1.5 min-w-[1.25rem] h-5 flex items-center justify-center bg-blue-600 text-white text-xs font-bold rounded-full px-1">
                        {cartQty}
                      </span>
                    )}
                    <div className={`font-medium ${deskMode ? 'text-base leading-snug mb-1' : ''}`}>
                      {deskMode && <span className="mr-1 text-lg" title={product.category}>{resolveProductEmoji(product)}</span>}
                      {(product.name === 'Default' || product.name === 'default' || !product.name)
                        ? (product.barcode && !product.barcode.startsWith('inv_') ? product.barcode : product.pluCode || product.barcode || 'Item')
                        : product.name}
                      {product.isExpiryDiscount && (
                        <span className="ml-1 inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700 align-middle">
                          🏷️ Deal
                        </span>
                      )}
                    </div>
                    {/* Only show PLU/Barcode for non-WiFi products (compact mode only) */}
                    {!deskMode && !(product as any).wifiToken && !(product as any).r710Token && (
                      <div className="text-secondary">
                        {product.pluCode && `PLU: ${product.pluCode}`}
                        {product.barcode && !product.pluCode && `Barcode`}
                      </div>
                    )}

                    {/* Desk mode: price row + sold count badge + revenue */}
                    {deskMode && !((product as any).wifiToken) && !((product as any).r710Token) && (() => {
                      const canSeeFinancials = isAdmin || hasPermission('canAccessFinancialData')
                      const canSeeSoldCount = canSeeFinancials || hasPermission('canViewPOSSoldCount')
                      const canSeeStockCount = canSeeFinancials || hasPermission('canViewPOSStockCount')
                      const stats = productStatsMap.get(product.id)
                      const soldToday = stats?.soldToday ?? 0
                      const soldYesterday = stats?.soldYesterday ?? 0
                      const soldDayBefore = stats?.soldDayBefore ?? 0
                      const showBar = soldToday > 0

                      let barColorClass = 'bg-red-500'
                      let barTextColorClass = 'text-red-500 dark:text-red-400'
                      let barFill = 0
                      let barLabel = 'Low'

                      if (showBar) {
                        if (soldYesterday > 0) {
                          const ratio = soldToday / soldYesterday
                          if (ratio >= 1.0) {
                            barColorClass = 'bg-green-500'; barTextColorClass = 'text-green-600 dark:text-green-400'
                            barFill = 100; barLabel = 'Good'
                          } else if (ratio >= 0.5) {
                            barColorClass = 'bg-amber-400'; barTextColorClass = 'text-amber-600 dark:text-amber-400'
                            barFill = ratio * 100; barLabel = 'Fair'
                          } else {
                            barColorClass = 'bg-red-500'; barTextColorClass = 'text-red-500 dark:text-red-400'
                            barFill = ratio * 100; barLabel = 'Low'
                          }
                        } else {
                          barColorClass = 'bg-green-500'; barTextColorClass = 'text-green-600 dark:text-green-400'
                          barFill = 60; barLabel = 'New'
                        }
                      }

                      return (
                        <div className="mt-1 space-y-1">
                          {/* Price + sold badge + revenue */}
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="font-semibold text-green-700 dark:text-green-300 text-sm bg-green-100 dark:bg-green-950/60 px-1.5 py-0.5 rounded-md">{formatCurrency(product.price)}/{product.unit}</span>
                            {showBar && canSeeSoldCount && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300">
                                  {soldToday} sold
                                </span>
                                {canSeeFinancials && (
                                  <span className={`text-xs font-semibold ${barTextColorClass}`}>
                                    {formatCurrency(product.price * soldToday)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {/* Performance bar — visible to all; numbers stay gated */}
                          {showBar && (
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${barColorClass}`}
                                style={{ width: `${Math.max(barFill, 4)}%` }}
                              />
                            </div>
                          )}
                          {/* Yesterday context (financials only) + stock count (permissioned) */}
                          <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
                            {canSeeSoldCount && showBar && soldYesterday > 0 ? (
                              <span>yesterday: {soldYesterday}{soldDayBefore > 0 ? ` · 2d: ${soldDayBefore}` : ''}</span>
                            ) : <span />}
                            {canSeeStockCount && product.stockQuantity !== undefined && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                product.stockQuantity === 0
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-white'
                                  : product.stockQuantity < 5
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-white'
                                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-100'
                              }`}>
                                {product.stockQuantity === 0 ? 'Out of stock' : `${product.stockQuantity} left`}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })()}

                    {/* Compact mode price — also shown for WiFi tokens in desk mode (they skip the stats block) */}
                    {(!deskMode || (product as any).wifiToken || (product as any).r710Token) && (
                      <div className="font-semibold text-green-600">
                        {formatCurrency(product.price)}/{product.unit}
                      </div>
                    )}
                    {/* WiFi token details - Duration and Bandwidth (ESP32 only) */}
                    {(product as any).wifiToken && (product as any).tokenConfig && (
                      <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400 space-y-0.5">
                        <div>⏱️ {formatDuration((product as any).tokenConfig.durationMinutes || 0)}</div>
                        {((product as any).tokenConfig.bandwidthDownMb || (product as any).tokenConfig.bandwidthUpMb) && (
                          <div>
                            📊 ↓{formatDataAmount((product as any).tokenConfig.bandwidthDownMb || 0)} / ↑{formatDataAmount((product as any).tokenConfig.bandwidthUpMb || 0)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* R710 token details - Duration only */}
                    {(product as any).r710Token && (product as any).tokenConfig && (
                      <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                        ⏱️ {(product as any).tokenConfig.durationValue} {(product as any).tokenConfig.durationUnit?.split('_')[1] || (product as any).tokenConfig.durationUnit}
                      </div>
                    )}
                    {/* WiFi token quantity indicator */}
                    {(product as any).wifiToken && (
                      <div className="mt-1 space-y-1">
                        <span className={`text-xs font-medium block ${
                          (product as any).availableQuantity === 0 ? 'text-red-500' :
                          (product as any).availableQuantity < 5 ? 'text-orange-500' :
                          'text-green-600'}`}>
                          📦 {(product as any).availableQuantity || 0} available
                        </span>
                        {/* Request more tokens button - only show when quantity < 5 and user has permission */}
                        {(product as any).availableQuantity < 5 && isAdmin && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation(); // Prevent adding to cart
                              const tokenConfigId = (product as any).tokenConfigId;

                              // Add to requesting set to disable button
                              setRequestingMore(prev => new Set(prev).add(tokenConfigId));

                              try {
                                const response = await fetch('/api/wifi-portal/tokens/bulk', {
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
                                  const tokensCreated = result.tokensCreated || 0;
                                  setProducts(prev => prev.map(prod => {
                                    if ((prod as any).tokenConfigId === tokenConfigId) {
                                      return {
                                        ...prod,
                                        availableQuantity: ((prod as any).availableQuantity || 0) + tokensCreated
                                      };
                                    }
                                    return prod;
                                  }));

                                  toast.push(`✅ Successfully created ${tokensCreated} ${(product as any).tokenConfig.name} token${tokensCreated !== 1 ? 's' : ''}!`, {
                                    type: 'success',
                                    duration: 5000
                                  });

                                  // Background refresh to confirm quantities
                                  fetchProducts();
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
                            disabled={requestingMore.has((product as any).tokenConfigId)}
                            className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-2 py-1 rounded w-full transition-colors"
                          >
                            {requestingMore.has((product as any).tokenConfigId) ? '⏳ Requesting...' : '+ Request 5 More'}
                          </button>
                        )}
                      </div>
                    )}
                    {/* R710 token quantity indicator */}
                    {(product as any).r710Token && (
                      <div className="mt-1 space-y-1">
                        <span className={`text-xs font-medium block ${
                          (product as any).availableQuantity === 0 ? 'text-red-500' :
                          (product as any).availableQuantity < 5 ? 'text-orange-500' :
                          'text-green-600'}`}>
                          📦 {(product as any).availableQuantity || 0} available
                        </span>
                        {/* Request more tokens button - only show when quantity < 5 and user has permission */}
                        {(product as any).availableQuantity < 5 && isAdmin && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation(); // Prevent adding to cart
                              const tokenConfigId = (product as any).tokenConfigId;

                              // Add to requesting set to disable button
                              setRequestingMore(prev => new Set(prev).add(tokenConfigId));

                              try {
                                const response = await fetch('/api/r710/tokens', {
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
                                  setProducts(prev => prev.map(prod => {
                                    if ((prod as any).tokenConfigId === tokenConfigId) {
                                      return {
                                        ...prod,
                                        availableQuantity: ((prod as any).availableQuantity || 0) + tokensCreated
                                      };
                                    }
                                    return prod;
                                  }));

                                  toast.push(`✅ Successfully created ${tokensCreated} R710 ${(product as any).tokenConfig.name} token${tokensCreated !== 1 ? 's' : ''}!`, {
                                    type: 'success',
                                    duration: 5000
                                  });

                                  // Background refresh to confirm quantities
                                  fetchProducts();
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
                            disabled={requestingMore.has((product as any).tokenConfigId)}
                            className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-2 py-1 rounded w-full transition-colors"
                          >
                            {requestingMore.has((product as any).tokenConfigId) ? '⏳ Requesting...' : '+ Request 5 More'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  )
                  })
                })()
              )}
            </div>
          </div>

        </div>

        {/* Sidebar - Customer & Payment */}
        <div className="space-y-4 mt-4 lg:mt-0 sticky top-20 self-start">
          {/* Customer Info */}
          <div className="card p-4 sm:p-6">
            <CustomerLookup
              businessId={currentBusinessId || ''}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={(c) => {
                setSelectedCustomer(c)
                setAppliedReward(null)
                setSkipRewardThisTime(false)
                autoAppliedForRef.current = null
              }}
              onCreateCustomer={() => setShowAddCustomerModal(true)}
              allowWalkIn={true}
            />

            {/* Salesperson selector */}
            {currentBusinessId && sessionUser?.id && (
              <div className="mt-3">
                <SalespersonSelector
                  businessId={currentBusinessId}
                  currentUserId={sessionUser.id}
                  currentUserName={sessionUser.name || 'Staff'}
                  onSalespersonChange={(sp) => {
                    setSelectedSalesperson(sp)
                    selectedSalespersonRef.current = sp
                    sendToDisplay('SET_GREETING', { employeeName: sp.name, employeePhotoUrl: sp.photoUrl ?? undefined })
                  }}
                />
              </div>
            )}

            {/* Applied Reward */}
            {appliedReward && (
              <div className="mt-2 space-y-1">
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
                    checked={skipRewardThisTime}
                    onChange={e => setSkipRewardThisTime(e.target.checked)}
                    className="rounded w-3.5 h-3.5"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Don&apos;t apply reward this time</span>
                </label>
              </div>
            )}

            {/* Used Rewards — no active reward but recently used */}
            {selectedCustomer && !appliedReward && customerRewards.length === 0 && customerUsedRewards.length > 0 && (
              <div className="mt-2 space-y-1">
                {customerUsedRewards.map(r => (
                  <div key={r.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex-1">
                      <span className="font-medium">{r.promo_campaigns.name}</span> —{' '}
                      {r.status === 'REDEEMED' ? 'Reward already used' : r.status === 'DEACTIVATED' ? 'Reward deactivated' : 'Reward expired'}
                      {r.redeemedAt && ` on ${new Date(r.redeemedAt).toLocaleDateString()}`}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Show additional loyalty/SNAP info if available from full customer data */}
            {customer && selectedCustomer && customer.id === selectedCustomer.id && (
              <div className="mt-4 space-y-3 border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded text-xs ${
                    customer.loyaltyTier === 'Platinum' ? 'bg-gray-100 text-gray-800' :
                    customer.loyaltyTier === 'Gold' ? 'bg-yellow-100 text-yellow-800' :
                    customer.loyaltyTier === 'Silver' ? 'bg-gray-100 text-secondary' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {customer.loyaltyTier} Member
                  </span>
                  <span className="text-sm font-medium text-green-600">
                    {customer.pointsBalance} pts
                  </span>
                </div>
                {customer.snapBalance && (
                  <div className="text-sm">
                    <span className="text-secondary">SNAP Balance:</span>
                    <span className="font-medium ml-1">{formatCurrency(customer.snapBalance)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Order Summary</h3>
              {cart.length > 0 && (
                <span className="text-sm font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} item{cart.reduce((sum, item) => sum + item.quantity, 0) !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-secondary text-center py-8 text-sm">
                Cart is empty
              </div>
            ) : (
              <>
                {/* Cart Items */}
                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                  {cart.map((item, index) => (
                    <div key={`summary-${item.id}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {(item.name === 'Default' || item.name === 'default' || !item.name)
                            ? ((item.barcode && !item.barcode.startsWith('inv_')) ? item.barcode : item.id)
                            : item.name}
                        </div>
                        <div className="text-xs text-secondary">
                          {(item as any).sku ? `${(item as any).sku} · ` : ''}{formatCurrency(item.price)}/{item.unit}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!item.weightRequired && (
                          <>
                            <button
                              onClick={() => item.quantity <= 1 ? removeFromCart(item.id) : updateQuantity(item.id, item.quantity - 1)}
                              className="w-6 h-6 flex items-center justify-center rounded bg-gray-200 dark:bg-gray-600 hover:bg-red-100 dark:hover:bg-red-900/40 text-xs font-bold"
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-6 h-6 flex items-center justify-center rounded bg-gray-200 dark:bg-gray-600 hover:bg-green-100 dark:hover:bg-green-900/40 text-xs font-bold"
                            >
                              +
                            </button>
                          </>
                        )}
                        {item.weightRequired && (
                          <span className="text-xs text-secondary">{item.quantity.toFixed(2)} {item.unit}</span>
                        )}
                        <span className="font-semibold text-sm whitespace-nowrap w-14 text-right">{formatCurrency(item.subtotal)}</span>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-xs"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-2 border-t pt-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>{formatCurrency(totals.tax)}</span>
                  </div>
                  {totals.snapEligibleAmount > 0 && (
                    <div className="flex justify-between text-sm text-blue-600">
                      <span>SNAP Eligible:</span>
                      <span>{formatCurrency(totals.snapEligibleAmount)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2">
                    {(() => {
                      const { fee: _fee, total: _displayTotal } = paymentMethod === 'ecocash'
                        ? getEcocashSummary(totals.total, currentBusiness)
                        : { fee: 0, total: totals.total }
                      return (
                        <div className={`flex justify-between font-bold text-lg ${paymentMethod === 'ecocash' ? 'text-green-700 dark:text-green-400' : ''}`}>
                          <span>Total{paymentMethod === 'ecocash' && _fee > 0 ? ' (incl. EcoCash fee):' : ':'}</span>
                          <span>{formatCurrency(_displayTotal)}</span>
                        </div>
                      )
                    })()}
                  </div>
                  {customer && totals.loyaltyPoints > 0 && (
                    <div className="text-sm text-green-600">
                      Earning {totals.loyaltyPoints} loyalty points
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Payment Methods */}
          <div className="card p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Payment Method</h3>

            <div className="space-y-2 mb-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="mr-2"
                />
                💳 Credit/Debit Card
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="mr-2"
                />
                💵 Cash
              </label>
              {totals.snapEligibleAmount > 0 && (
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="snap"
                    checked={paymentMethod === 'snap'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="mr-2"
                    disabled={!customer?.snapBalance}
                  />
                  🍎 SNAP/EBT {!customer?.snapBalance && '(Customer Required)'}
                </label>
              )}
              {customer && customer.pointsBalance >= totals.total * 100 && (
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="loyalty"
                    checked={paymentMethod === 'loyalty'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="mr-2"
                  />
                  ⭐ Loyalty Points ({Math.ceil(totals.total * 100)} pts needed)
                </label>
              )}
              {(currentBusiness as any)?.ecocashEnabled && (
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="ecocash"
                    checked={paymentMethod === 'ecocash'}
                    onChange={(e) => { setPaymentMethod(e.target.value as any); setCashTendered('') }}
                    className="mr-2"
                  />
                  <img src="/images/ecocash-logo.png" alt="" className="h-4 w-auto inline-block mr-1" />EcoCash
                </label>
              )}
            </div>

            {/* EcoCash Transaction Code input */}
            {paymentMethod === 'ecocash' && (() => {
              const { fee, total: ecocashTotal, feeLabel } = getEcocashSummary(totals.total, currentBusiness)
              return (
                <div className="space-y-2 mb-4">
                  <label className="block text-sm font-medium text-primary">EcoCash Transaction Code</label>
                  <input
                    type="text"
                    value={ecocashTxCode}
                    onChange={(e) => setEcocashTxCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white text-lg font-semibold"
                    placeholder="Enter EcoCash transaction code"
                    autoComplete="off"
                    autoFocus
                  />
                  {fee > 0 && (
                    <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm text-yellow-800 dark:text-yellow-200 space-y-0.5">
                      <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(totals.total)}</span></div>
                      <div className="flex justify-between"><span>EcoCash fee ({feeLabel}):</span><span>{formatCurrency(fee)}</span></div>
                      <div className="flex justify-between font-bold"><span>Total to charge:</span><span>{formatCurrency(ecocashTotal)}</span></div>
                    </div>
                  )}
                </div>
              )
            })()}

            <button
              onClick={handlePayment}
              disabled={cart.length === 0 || processingPayment || (paymentMethod === 'ecocash' && !ecocashTxCode.trim())}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-base"
            >
              {processingPayment ? 'Processing...' : (() => {
                const { total: buttonTotal } = paymentMethod === 'ecocash'
                  ? getEcocashSummary(totals.total, currentBusiness)
                  : { total: totals.total }
                return `Process Payment - ${formatCurrency(buttonTotal)}`
              })()}
            </button>
          </div>
        </div>
      </div>
      )}
    </div>{/* end grids outer wrapper */}

    {/* Loading Overlay for Auto-Add Product */}
    {isAutoAdding && (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70]">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-sm w-full mx-4">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 dark:border-green-400 mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Adding to Cart...
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Please wait while we add the item to your cart
            </p>
          </div>
        </div>
      </div>
    )}

    {/* Bulk Stock Panel */}
    {showBulkStockPanel && currentBusiness && currentBusinessId && (
      <BulkStockPanel
        businessId={currentBusinessId}
        businessName={currentBusiness.businessName}
        businessType={currentBusiness.businessType}
        onClose={() => setShowBulkStockPanel(false)}
      />
    )}
    </>
  )
}

// Main export component that wraps everything with providers
function GroceryPOSPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Use the business permissions context for proper business management
  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
    loading: businessLoading,
    businesses
  } = useBusinessPermissionsContext()

  // Get user info
  const sessionUser = session?.user as SessionUser
  const employeeId = sessionUser?.id

  // Check if current business is a grocery business
  const isGroceryBusiness = currentBusiness?.businessType === 'grocery'

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

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

  // Check if user has any grocery businesses
  const groceryBusinesses = businesses.filter(b => b.businessType === 'grocery' && b.isActive)
  const hasGroceryBusinesses = groceryBusinesses.length > 0

  // If no current business selected and user has grocery businesses, show selection prompt
  if (!currentBusiness && hasGroceryBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Grocery Business</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You have access to {groceryBusinesses.length} grocery business{groceryBusinesses.length > 1 ? 'es' : ''}.
            Please select one from the sidebar to use the POS system.
          </p>
          <div className="space-y-2">
            {groceryBusinesses.slice(0, 3).map(business => (
              <div key={business.businessId} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{business.businessName}</p>
                <p className="text-sm text-gray-600">Role: {business.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // If current business is not grocery, show error
  if (currentBusiness && !isGroceryBusiness) {
    return <BusinessTypeRedirect />
  }

  // If no grocery businesses at all, show message
  if (!hasGroceryBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Grocery Businesses</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don't have access to any grocery businesses. The Grocery POS system requires access to at least one grocery business.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Contact your administrator if you need access to grocery businesses.
          </p>
        </div>
      </div>
    )
  }

  // At this point, we have a valid grocery business selected
  const businessId = currentBusinessId!

  return (
    <BusinessProvider businessId={businessId}>
      <BusinessTypeRoute requiredBusinessType="grocery">
        <GroceryPOSContent />
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}

// Wrapper component with Suspense boundary
export default function GroceryPOSPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-600 dark:text-gray-400">Loading...</div>
    </div>}>
      <GroceryPOSPageContent />
    </Suspense>
  )
}