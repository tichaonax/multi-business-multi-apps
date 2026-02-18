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
import { MealProgramPanel } from '@/components/restaurant/meal-program/MealProgramPanel'

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
  stockQuantity?: number
  imageUrl?: string  // Product image for customer display
  variants?: Array<{ id: string; name?: string; price?: number; isAvailable?: boolean; stockQuantity?: number }>
  soldToday?: number
}

interface CartItem extends MenuItem {
  quantity: number
}

export default function RestaurantPOS() {
  // IMMEDIATE LOG - This will show when component renders
  console.log('🚀🚀🚀 [Restaurant POS] COMPONENT RENDERING 🚀🚀🚀')

  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const submitInFlightRef = useRef<{ current: boolean } | any>({ current: false })
  const [orderSubmitting, setOrderSubmitting] = useState(false)
  // Ref-based guard to prevent duplicate print calls (more reliable than state)
  const printInFlightRef = useRef(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [posMode, setPosMode] = useState<'live' | 'manual' | 'meal_program'>('live')
  const [manualCart, setManualCart] = useState<ManualCartItem[]>([])
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'MOBILE'>('CASH')
  const [amountReceived, setAmountReceived] = useState('')
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [pendingReceiptData, setPendingReceiptData] = useState<ReceiptData | null>(null)
  const [completedOrder, setCompletedOrder] = useState<any>(null)
  // When non-null: meal program transaction is already saved; this is the cash amount the cashier must collect
  const [mealProgramCashDue, setMealProgramCashDue] = useState<number | null>(null)
  const [businessDetails, setBusinessDetails] = useState<any>(null)
  const [taxIncludedInPrice, setTaxIncludedInPrice] = useState(true) // Default: tax included
  const [taxRate, setTaxRate] = useState(0) // Default: 0% - businesses configure their own tax rate
  const [printerId, setPrinterId] = useState<string | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [dailySales, setDailySales] = useState<any>(null)
  const [showDailySales, setShowDailySales] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
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

  // Toast context (hook) must be called unconditionally to preserve hooks order
  const toast = useToastContext()

  // Global cart context for mini cart sync
  const { clearCart: clearGlobalCart, replaceCart: replaceGlobalCart } = useGlobalCart()

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

  // Load cart from localStorage on mount (per-business persistence)
  useEffect(() => {
    if (!currentBusinessId) return

    try {
      const savedCart = localStorage.getItem(`cart-${currentBusinessId}`)
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart)
        setCart(parsedCart)
        console.log('✅ Cart restored from localStorage:', parsedCart.length, 'items')
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

  // Sync POS cart to global cart to keep mini cart in sync
  useEffect(() => {
    if (!currentBusinessId || !cartLoaded) return

    try {
      // Replace global cart to match POS cart exactly
      const globalCartItems = cart.map(item => ({
        productId: item.id,
        variantId: item.variants?.[0]?.id || item.id, // Use first variant or item id
        name: item.name,
        sku: item.variants?.[0]?.sku || item.barcode || item.id, // Use variant SKU, barcode, or fallback to ID
        price: item.price,
        quantity: item.quantity,
        attributes: {},
        stock: item.stockQuantity || undefined,
        imageUrl: item.imageUrl,
        // Include combo data for mini cart display
        isCombo: (item as any).isCombo || false,
        comboItems: (item as any).comboItems || null
      }))
      replaceGlobalCart(globalCartItems)
    } catch (error) {
      console.error('❌ [Restaurant POS] Failed to sync to global cart:', error)
    }
  }, [cart, currentBusinessId, cartLoaded, replaceGlobalCart])

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

        // Wait for BroadcastChannel to initialize on BOTH windows
        await new Promise(resolve => setTimeout(resolve, 2000))

        if (!isActive) return

        // Send employee greeting only (business info comes from customer display API)
        const greetingData = {
          employeeName: sessionUser?.name || 'Staff',
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

    const cartMessage = {
      items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: Number(item.price),
        variant: item.category,
        imageUrl: item.imageUrl, // Include product image for customer display
        isCombo: (item as any).isCombo || false,
        comboItems: (item as any).comboItems || null // Include combo items for display
      })),
      subtotal,
      tax,
      total
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
  }, [cart, currentBusinessId, taxIncludedInPrice, taxRate])

  // Broadcast payment amount updates to customer display
  useEffect(() => {
    if (!showPaymentModal || !amountReceived) return

    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0)
    const tax = taxIncludedInPrice
      ? subtotal * (taxRate / (100 + taxRate))
      : subtotal * (taxRate / 100)
    const total = taxIncludedInPrice ? subtotal : subtotal + tax
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
        fetch(`/api/restaurant/product-stats?businessId=${currentBusinessId || ''}&timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`),
        currentBusinessId ? fetch(`/api/business/${currentBusinessId}/wifi-tokens`) : Promise.resolve({ ok: false }),
        currentBusinessId ? fetch(`/api/universal/menu-combos?businessId=${currentBusinessId}`) : Promise.resolve({ ok: false })
      ])

      if (productsResponse.ok) {
        const data = await productsResponse.json()
        if (data.success) {
          // Get purchase counts if available
          let purchaseCounts: Record<string, number> = {}
          let soldTodayCounts: Record<string, number> = {}
          if (statsResponse.ok) {
            const statsData = await statsResponse.json()
            console.log('[POS] Stats API response:', { success: statsData.success, dataCount: statsData.data?.length, sample: statsData.data?.slice(0, 3) })
            if (statsData.success && statsData.data) {
              statsData.data.forEach((item: any) => {
                purchaseCounts[item.productId] = item.totalSold || 0
                soldTodayCounts[item.productId] = item.soldToday || 0
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
              // Calculate total stock from all variants
              const totalStock = (product.variants || []).reduce((sum: number, variant: any) => {
                return sum + (variant.stockQuantity || 0)
              }, 0)

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
                stockQuantity: totalStock,
                imageUrl: imageUrl, // Product image for customer display
                variants: product.variants,
                purchaseCount: purchaseCounts[product.id] || 0,
                soldToday: soldTodayCounts[product.id] || 0
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
            // Sort by: (1) items with price > 0 first, (2) most purchased, (3) name
            .sort((a: any, b: any) => {
              const aHasPrice = Number(a.price) > 0
              const bHasPrice = Number(b.price) > 0

              // Items with price come before items without price
              if (aHasPrice !== bHasPrice) {
                return bHasPrice ? 1 : -1
              }

              // Both have same price status, sort by purchase count
              if (b.purchaseCount !== a.purchaseCount) {
                return b.purchaseCount - a.purchaseCount
              }

              // Same purchase count, sort alphabetically
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
                    originalPrice: combo.originalTotalPrice ? Number(combo.originalTotalPrice) : null,
                    discountPercent: combo.discountPercent ? Number(combo.discountPercent) : null,
                    preparationTime: combo.preparationTime,
                    comboItems: combo.comboItems, // Include combo items for display
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
      toast.push('Failed to load menu items')
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
  }, [currentBusinessId, isRestaurantBusiness, status, businessLoading, isAuthenticated, isAdmin])

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
          toast.push(`Error printing ${receiptType} receipt: ${error.message}`)
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
      toast.push(`Print error: ${error.message}`)
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
      items: order.items.map((item: any) => ({
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity
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
      footerMessage: 'Thank you for dining with us!'
    }
  }

  // Load daily sales summary
  const loadDailySales = async () => {
    if (!currentBusinessId) return

    try {
      const response = await fetch(`/api/restaurant/daily-sales?businessId=${currentBusinessId}&timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`)
      if (response.ok) {
        const data = await response.json()
        setDailySales(data.data)
      }
    } catch (error) {
      console.error('Failed to load daily sales:', error)
    }
  }

  // Load daily sales on mount and after orders
  useEffect(() => {
    if (currentBusinessId && isRestaurantBusiness) {
      loadDailySales()
    }
  }, [currentBusinessId, isRestaurantBusiness])

  // Periodic refresh of stats (daily sales + sold today counts) every 30s for multi-user accuracy
  useEffect(() => {
    if (!currentBusinessId || !isRestaurantBusiness) return

    const interval = setInterval(async () => {
      // Refresh daily sales summary
      loadDailySales()

      // Lightweight refresh of product sold-today counts (without reloading full product list)
      try {
        const statsResponse = await fetch(`/api/restaurant/product-stats?businessId=${currentBusinessId}`)
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          if (statsData.success && statsData.data) {
            const soldTodayCounts: Record<string, number> = {}
            statsData.data.forEach((item: any) => {
              soldTodayCounts[item.productId] = item.soldToday || 0
            })
            setMenuItems(prev => prev.map(item => ({
              ...item,
              soldToday: soldTodayCounts[item.id] || 0
            })))
          }
        }
      } catch (error) {
        console.error('[POS] Stats refresh failed:', error)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [currentBusinessId, isRestaurantBusiness])

  // Reload daily sales and menu items after completing an order
  useEffect(() => {
    if (completedOrder && currentBusinessId) {
      // Reload sales data and menu (WiFi token counts) after a short delay to allow order to be processed
      setTimeout(() => {
        loadDailySales()
        loadMenuItems() // Refresh WiFi token availability badges
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
        toast.push(`"${item.name}" cannot be sold alone. Please add a main item from ${item.category} first.`)
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

  const total = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0)

  // Manual cart helpers
  const addToManualCart = (item: ManualCartItem) => {
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
    const aSold = a.soldToday || 0
    const bSold = b.soldToday || 0
    if (aSold > 0 && bSold > 0) return bSold - aSold
    if (aSold > 0) return -1
    if (bSold > 0) return 1
    return a.name.localeCompare(b.name)
  })

  const handleProcessOrderClick = () => {
    console.log('🔄 Process Order clicked')
    if (cart.length === 0) {
      console.log('❌ Cart is empty, not processing')
      return
    }

    // Calculate totals for payment broadcast
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const tax = taxIncludedInPrice
      ? subtotal * (taxRate / (100 + taxRate))
      : subtotal * (taxRate / 100)
    const total = taxIncludedInPrice ? subtotal : subtotal + tax

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
    // Meal-program orders are already saved — just close tender modal and show receipt
    if (mealProgramCashDue !== null) {
      const received = parseFloat(amountReceived) || 0
      // Patch the stored completedOrder with the actual change so the receipt shows it
      setCompletedOrder((prev: any) => prev ? {
        ...prev,
        paymentMethod: 'CASH',
        amountReceived: received,
        change: Math.max(0, received - mealProgramCashDue),
      } : prev)
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
        businessId: businessId,
        paymentMethod: paymentMethod,
        amountReceived: paymentMethod === 'CASH' ? parseFloat(amountReceived) : total,
        idempotencyKey
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
        const orderForReceipt = {
          orderNumber: result.orderNumber,
          items: cart,
          subtotal: total,
          total: total,
          paymentMethod: paymentMethod,
          amountReceived: paymentMethod === 'CASH' ? parseFloat(amountReceived) : total,
          change: paymentMethod === 'CASH' ? parseFloat(amountReceived) - total : 0,
          date: formatDateTime(new Date()),
          wifiTokens: result.wifiTokens || [], // ESP32 tokens
          r710Tokens: result.r710Tokens || [],  // R710 tokens
          businessInfo: result.businessInfo     // Business details (address, phone)
        }

        setCompletedOrder(orderForReceipt)

        // Close payment modal
        setShowPaymentModal(false)

        // Show receipt modal
        setShowReceiptModal(true)

        // Broadcast payment complete to customer display (cart will clear after 3 seconds on display)
        sendToDisplay('PAYMENT_COMPLETE', {
          subtotal: total,
          tax: 0,
          total: total
        })

        // Clear cart on POS and global cart
        setCart([])
        clearGlobalCart()

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
        const isWiFiError = errorData?.rollback === true || errorMessage.includes('WiFi Token')
        toast.push(`Order Failed:\n\n${errorMessage}`, {
          type: 'error',
          duration: isWiFiError ? 0 : 8000, // WiFi errors require dismissal, others 8s
          requireDismiss: isWiFiError
        })
      }
    } catch (error: any) {
      console.error('Order processing error:', error)
      toast.push(`Order Failed:\n\n${error.message || 'Network error occurred. Please try again.'}`, {
        type: 'error',
        duration: 8000
      })
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
                      toast.push('Failed to open customer display. Please allow popups for this site.', { type: 'error', duration: 5000 })
                    }
                  }}
                  className="px-2 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs sm:text-sm font-medium"
                  title="Open Customer Display"
                >
                  🖥️ <span className="hidden sm:inline">Display</span>
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium"
                  title="POS Settings"
                >
                  ⚙️ <span className="hidden sm:inline">Settings</span>
                </button>
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
                  <Link
                    href="/restaurant/reports/end-of-day"
                    className="px-2 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm font-medium"
                  >
                    📊 <span className="hidden sm:inline">Reports</span>
                  </Link>
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
                  <button
                    onClick={() => setShowDailySales(!showDailySales)}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                  >
                    {showDailySales ? '▼ Hide Details' : '▶ Show Details'}
                  </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Sales</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      ${dailySales.summary.totalSales.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Orders</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {dailySales.summary.totalOrders}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Order</div>
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      ${dailySales.summary.averageOrderValue.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Receipts</div>
                    <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                      {dailySales.summary.receiptsIssued}
                    </div>
                  </div>
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
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-700">
                        <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">🍱 Meal Program (Expense Accounts)</h3>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Transactions</div>
                            <div className="font-bold text-primary">{dailySales.expenseAccountSales.count}</div>
                          </div>
                          <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Subsidy Paid</div>
                            <div className="font-bold text-green-600 dark:text-green-400">${dailySales.expenseAccountSales.subsidyTotal.toFixed(2)}</div>
                          </div>
                          <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Cash Collected</div>
                            <div className="font-bold text-blue-600 dark:text-blue-400">${dailySales.expenseAccountSales.cashTotal.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-2 pt-2 border-t border-amber-200 dark:border-amber-700">
                          <span>Total meal program revenue:</span>
                          <span className="font-semibold text-primary">${dailySales.expenseAccountSales.total.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* Top Categories */}
                    {dailySales.categoryBreakdown && dailySales.categoryBreakdown.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Top Categories</h3>
                        <div className="space-y-1">
                          {dailySales.categoryBreakdown.slice(0, 5).map((cat: any) => (
                            <div key={cat.name} className="flex justify-between items-center text-sm">
                              <span className="text-gray-700 dark:text-gray-300">{cat.name}</span>
                              <span className="font-semibold text-primary">${cat.totalSales.toFixed(2)}</span>
                            </div>
                          ))}
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
            <div className="flex items-center gap-2 mb-2">
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
                businessId={businessId}
                showScanner={showBarcodeScanner}
                onToggleScanner={() => setShowBarcodeScanner(!showBarcodeScanner)}
              />
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
                const hasDiscount = item.originalPrice && Number(item.originalPrice) > Number(item.price)
                const isUnavailable = item.isAvailable === false
                const cartItem = cart.find(c => c.id === item.id)
                const cartQuantity = cartItem?.quantity || 0
                const stockQuantity = item.stockQuantity || 0

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

                    <h3 className="font-semibold text-[10px] sm:text-xs line-clamp-2 mt-2">
                      {item.name}
                      {item.requiresCompanionItem && (
                        <span className="ml-1 text-xs bg-orange-500 text-white px-1 rounded" title="Requires main item">+</span>
                      )}
                    </h3>

                    <div className="flex items-center gap-1 mt-1">
                      <p className={`text-sm sm:text-base font-bold ${hasDiscount ? 'text-red-600' : 'text-green-600'}`}>
                        ${Number(item.price).toFixed(2)}
                      </p>
                      {hasDiscount && (
                        <p className="text-xs text-secondary line-through">
                          ${Number(item.originalPrice || 0).toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Sold today badge - always visible */}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${
                      (item.soldToday || 0) > 0
                        ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/50'
                        : 'text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800'
                    }`}>
                      <span className={(item.soldToday || 0) > 0 ? 'text-yellow-300 font-bold' : ''}>{item.soldToday || 0}</span> sold today
                    </span>

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
                                  toast.push(`❌ Failed to create tokens: ${result.error || 'Unknown error'}`, {
                                    type: 'error',
                                    duration: 0  // Require manual dismissal for errors
                                  });
                                }
                              } catch (error) {
                                console.error('Error creating tokens:', error);
                                toast.push('❌ Error creating tokens. Please try again.', {
                                  type: 'error',
                                  duration: 0  // Require manual dismissal for errors
                                });
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

                    {isUnavailable && (
                      <p className="text-xs text-red-500 mt-1 font-medium">Unavailable</p>
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
            />
          )}

          {/* Meal Program Panel (right panel) */}
          {posMode === 'meal_program' && currentBusinessId && (
            <div className="card overflow-hidden sticky top-20 self-start" style={{ minHeight: '480px' }}>
              <MealProgramPanel
                businessId={currentBusinessId}
                soldByEmployeeId={employeeId}
                allMenuItems={menuItems.map((m) => ({
                  id: m.id,
                  name: m.name,
                  price: Number(m.price),
                  category: m.category,
                }))}
                onTransactionComplete={(result) => {
                  const cashDue = Number(result.cashAmount)
                  const orderForReceipt = {
                    orderNumber: result.orderNumber,
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
                  if (cashDue > 0) {
                    // Reuse existing payment modal as cash-tender step (transaction already saved)
                    setMealProgramCashDue(cashDue)
                    setAmountReceived('')
                    setPaymentMethod('CASH')
                    setShowPaymentModal(true)
                  } else {
                    // Fully subsidised — skip tender, go straight to receipt
                    setShowReceiptModal(true)
                  }
                }}
                onCancel={() => setPosMode('live')}
              />
            </div>
          )}

          {/* Live Order Summary (right panel) */}
          {posMode === 'live' && (
          <div className="card bg-white dark:bg-gray-900 p-4 rounded-lg shadow sticky top-20 self-start">
            <h2 className="text-xl font-bold text-primary mb-4">Order Summary</h2>
            
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {cart.map(item => (
                <div key={item.id} className="border-b border-gray-100 dark:border-gray-700 pb-2 last:border-b-0">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.name}</div>
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
                    setAmountReceived('')
                  }}
                  className="flex-1 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600"
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
                toast.push(`Error: ${error.message}`)
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
            toast.push(`Print error: ${error.message}`)
          } finally {
            printInFlightRef.current = false
          }
        }}
      />

      {/* POS Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">⚙️ POS Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Auto-Print Receipt Setting */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Auto-Print Receipts
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Automatically print receipts after completing an order
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setAutoPrint(!preferences.autoPrintReceipt)
                        toast.push(`Auto-print ${!preferences.autoPrintReceipt ? 'enabled' : 'disabled'}`)
                      }}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        preferences.autoPrintReceipt ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          preferences.autoPrintReceipt ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {preferences.autoPrintReceipt ? (
                      <span className="text-green-600 dark:text-green-400">✅ Enabled - Receipts will print automatically</span>
                    ) : (
                      <span className="text-gray-500">❌ Disabled - Click "Print Receipt" button to print</span>
                    )}
                  </div>
                </div>

                {/* Default Printer Setting */}
                <div className="pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Default Printer
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Select the default printer for receipts
                  </p>
                  <select
                    value={preferences.defaultPrinterId || printerId || ''}
                    onChange={(e) => {
                      const newPrinterId = e.target.value || undefined
                      setDefaultPrinter(newPrinterId)
                      if (newPrinterId) {
                        setPrinterId(newPrinterId)
                        toast.push('Default printer updated')
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">No default printer</option>
                    {printerId && (
                      <option value={printerId}>Current Printer (EPSON TM-T20III)</option>
                    )}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    If no printer is selected, you'll be prompted each time
                  </p>
                </div>

                {/* Current Settings Summary */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Current Settings:</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                    <li>• Auto-print: <strong>{preferences.autoPrintReceipt ? 'ON' : 'OFF'}</strong></li>
                    <li>• Default printer: <strong>{preferences.defaultPrinterId ? 'Set' : 'Not set'}</strong></li>
                  </ul>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </BusinessTypeRoute>
  )
}