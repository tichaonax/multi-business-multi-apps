'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { Suspense } from 'react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
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
import { usePrintPreferences } from '@/hooks/use-print-preferences'
import { buildReceiptWithBusinessInfo } from '@/lib/printing/receipt-builder'
import { ReceiptPrintManager } from '@/lib/receipts/receipt-print-manager'
import { CustomerLookup } from '@/components/pos/customer-lookup'
import { AddCustomerModal } from '@/components/customers/add-customer-modal'
import { DailySalesWidget } from '@/components/pos/daily-sales-widget'
import { useToastContext } from '@/components/ui/toast'
import { formatDuration, formatDataAmount } from '@/lib/printing/format-utils'
import { useCustomerDisplaySync, useOpenCustomerDisplay } from '@/hooks/useCustomerDisplaySync'
import { SyncMode } from '@/lib/customer-display/sync-manager'

interface POSItem {
  id: string
  name: string
  barcode?: string
  pluCode?: string
  category: string
  unitType: 'each' | 'weight' | 'volume'
  price: number
  unit: string
  taxable: boolean
  weightRequired: boolean
  ageRestricted?: boolean
  snapEligible?: boolean
  organicCertified?: boolean
  loyaltyPoints?: number
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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'snap' | 'loyalty'>('cash')
  const [isScaleConnected, setIsScaleConnected] = useState(true)
  const [currentWeight, setCurrentWeight] = useState(0)
  const [showCustomerLookup, setShowCustomerLookup] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [products, setProducts] = useState<POSItem[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [pendingReceiptData, setPendingReceiptData] = useState<ReceiptData | null>(null)
  const [completedOrder, setCompletedOrder] = useState<any>(null)
  const [showCashTenderModal, setShowCashTenderModal] = useState(false)
  const [cashTendered, setCashTendered] = useState('')
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [dailySales, setDailySales] = useState<any>(null)
  const [businessDetails, setBusinessDetails] = useState<any>(null)
  const [isAutoAdding, setIsAutoAdding] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string
    customerNumber: string
    name: string
    email?: string
    phone?: string
    customerType: string
  } | null>(null)

  // WiFi integration states
  const [esp32IntegrationEnabled, setEsp32IntegrationEnabled] = useState(false)
  const [r710IntegrationEnabled, setR710IntegrationEnabled] = useState(false)
  const [activeWiFiTab, setActiveWiFiTab] = useState<'esp32' | 'r710'>('esp32')
  const [requestingMore, setRequestingMore] = useState<Set<string>>(new Set())

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
    loading: businessLoading
  } = useBusinessPermissionsContext()

  // Toast context for notifications
  const toast = useToastContext()

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

  // Broadcast cart state to customer display
  const broadcastCartState = (cartItems: CartItem[]) => {
    console.log('[Grocery POS] Broadcasting cart state, items:', cartItems.length)
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const tax = subtotal * 0.08 // 8% tax rate
    const total = subtotal + tax

    const cartMessage = {
      items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        variant: item.unit || ''
      })),
      subtotal,
      tax,
      total
    }

    console.log('[Grocery POS] Sending CART_STATE:', cartMessage)

    // Signal active business, page context, then cart state
    sendToDisplay('SET_ACTIVE_BUSINESS', { subtotal: 0, tax: 0, total: 0 })
    sendToDisplay('SET_PAGE_CONTEXT', { pageContext: 'pos', subtotal: 0, tax: 0, total: 0 })
    sendToDisplay('CART_STATE', cartMessage)

    console.log('[Grocery POS] CART_STATE sent')
  }

  // Get user info
  const { data: session, status } = useSession()
  const sessionUser = session?.user as SessionUser
  const employeeId = sessionUser?.id
  const isAdmin = sessionUser?.role === 'admin'

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
        fetch(`/api/universal/products?businessId=${currentBusinessId}&businessType=grocery&includeVariants=true`),
        fetch(`/api/business/${currentBusinessId}/wifi-tokens`),
        fetch(`/api/r710/integration?businessId=${currentBusinessId}`)
      ])

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            // Map API products to POSItem format
            const posItems: POSItem[] = []
            result.data.forEach((product: any) => {
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
                    loyaltyPoints: product.attributes?.loyaltyPoints || 0
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
                  loyaltyPoints: product.attributes?.loyaltyPoints || 0
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
          setBusinessDetails(data)
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

        // Wait longer for BroadcastChannel to initialize on BOTH windows
        console.log('[Grocery POS] Waiting for BroadcastChannel to be ready...')
        await new Promise(resolve => setTimeout(resolve, 2000))

        if (!isActive) return

        console.log('[Grocery POS] Sending greeting message...')
        // Send greeting and business info
        const greetingData = {
          employeeName: sessionUser?.name || 'Staff',
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

  // Load daily sales
  const loadDailySales = async () => {
    if (!currentBusinessId) return

    try {
      const response = await fetch(`/api/universal/daily-sales?businessId=${currentBusinessId}&businessType=grocery`)
      if (response.ok) {
        const data = await response.json()
        setDailySales(data.data)
      }
    } catch (error) {
      console.error('Failed to load daily sales:', error)
    }
  }

  // Load daily sales on mount
  useEffect(() => {
    if (currentBusinessId) {
      loadDailySales()
    }
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

    const existingItem = cart.find(item => item.id === product.id)
    const actualQuantity = product.weightRequired ? (weight || currentWeight) : quantity
    const subtotal = product.price * actualQuantity

    let newCart: CartItem[]
    if (existingItem) {
      newCart = cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + actualQuantity, subtotal: item.subtotal + subtotal }
          : item
      )
      setCart(newCart)
    } else {
      const cartItem: CartItem = {
        ...product,
        quantity: actualQuantity,
        weight: product.weightRequired ? actualQuantity : undefined,
        subtotal
      }
      newCart = [...cart, cartItem]
      setCart(newCart)
    }

    // Broadcast updated cart to customer display
    broadcastCartState(newCart)

    // Clear inputs
    setBarcodeInput('')
    setPluInput('')
    setWeightInput('')
    setCurrentWeight(0)
  }

  // Detect if we should auto-add on page load
  useEffect(() => {
    const addProductId = searchParams?.get('addProduct')
    const autoAdd = searchParams?.get('autoAdd')

    if (addProductId && autoAdd === 'true') {
      setIsAutoAdding(true)
    }
  }, [searchParams])

  // Handle auto-add product from URL parameters
  useEffect(() => {
    const addProductId = searchParams?.get('addProduct')
    const autoAdd = searchParams?.get('autoAdd')

    console.log('Auto-add check:', {
      addProductId,
      autoAdd,
      productsLength: products.length,
      productsLoading,
      isAutoAdding,
      hasProducts: products.length > 0
    })

    // Wait for products to be loaded and auto-add flag to be set
    if (addProductId && autoAdd === 'true' && products.length > 0 && !productsLoading && isAutoAdding) {
      console.log('Attempting auto-add for product:', addProductId)

      // Find the product in the loaded products list
      // The addProductId is an inventory item ID which maps to product.id or variant.id
      const product = products.find(p => p.id === addProductId)

      if (product) {
        console.log('✅ Auto-adding product to cart:', product.name, product)
        // Auto-add to cart with quantity 1
        addToCart(product, 1)

        // Clear URL parameters and loading state after adding
        setTimeout(() => {
          console.log('Cleaning up auto-add state')
          router.replace(`/grocery/pos?businessId=${currentBusinessId}`, { scroll: false })
          setIsAutoAdding(false)
        }, 500)
      } else {
        console.error('❌ Product not found in POS products list:', addProductId)
        console.log('Available products:', products.slice(0, 5).map(p => ({ id: p.id, name: p.name })))
        console.log('Total products loaded:', products.length)
        // Clear loading state even if product not found after a delay to show error
        setTimeout(() => {
          router.replace(`/grocery/pos?businessId=${currentBusinessId}`, { scroll: false })
          setIsAutoAdding(false)
        }, 1000)
      }
    }
  }, [searchParams, products, productsLoading, currentBusinessId, router, isAutoAdding])

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

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (barcodeInput) {
      const product = findProductByBarcode(barcodeInput)
      if (product) {
        if (product.weightRequired) {
          // Need to weigh the item
          void customAlert({ title: 'Weight required', description: 'Please place item on scale and confirm weight' })
        } else {
          addToCart(product)
        }
      } else {
        void customAlert({ title: 'Not found', description: 'Product not found' })
      }
    }
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
    const tax = taxableAmount * 0.08 // 8% tax rate
    const snapEligibleAmount = cart.filter(item => item.snapEligible).reduce((sum, item) => sum + item.subtotal, 0)
    const loyaltyPoints = cart.reduce((sum, item) => sum + (item.loyaltyPoints || 0) * Math.ceil(item.quantity), 0)
    const total = subtotal + tax

    return { subtotal, tax, total, snapEligibleAmount, loyaltyPoints }
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
    const totals = calculateTotals()

    try {
      // Create order using universal orders API
      const orderData = {
        businessId: currentBusinessId,
        businessType: 'grocery',
        customerId: selectedCustomer?.id || null,
        orderType: 'SALE',
        paymentMethod: paymentMethod.toUpperCase(),
        discountAmount: 0,
        taxAmount: totals.tax,
        attributes: {
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
        items: cart.map(item => ({
          productVariantId: (item.wifiToken || item.r710Token) ? null : item.id, // WiFi/R710 tokens don't have variants
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
            duration: item.tokenConfig?.durationMinutes || item.tokenConfig?.durationValue
          }
        }))
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
          orderNumber: result.data.orderNumber,
          total: totals.total,
          paymentMethod: paymentMethod.toUpperCase(),
          amountReceived: paymentMethod === 'cash' ? parseFloat(cashTendered) : totals.total,
          change: paymentMethod === 'cash' ? (parseFloat(cashTendered) - totals.total) : 0,
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
        sendToDisplay('CLEAR_CART', {
          subtotal: 0,
          tax: 0,
          total: 0
        })
        setCustomer(null)
        setSelectedCustomer(null)
        setShowCashTenderModal(false)
        setCashTendered('')

        // Show receipt modal
        setShowReceiptModal(true)
        // Reload daily sales and products (to update WiFi token counts) after order completion
        setTimeout(() => {
          loadDailySales()
          fetchProducts() // Refresh WiFi token availability badges
        }, 500)
      } else {
        throw new Error(result.error || 'Failed to process order')
      }
    } catch (error) {
      console.error('Payment processing error:', error)
      await customAlert({ title: 'Payment failed', description: `${error instanceof Error ? error.message : 'Unknown error'}` })
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
      salespersonName: sessionUser?.name || 'Staff',
      salespersonId: sessionUser?.id || '',
      items: order.items.map((item: any) => ({
        name: item.name,
        sku: item.sku, // Only grocery items have SKU, tokens don't
        quantity: item.quantity,
        unitPrice: Number(item.price),
        totalPrice: Number(item.price) * item.quantity
      })),
      subtotal: order.total,
      tax: 0,
      discount: 0,
      total: order.total,
      paymentMethod: order.paymentMethod?.toLowerCase() || 'cash',
      amountPaid: order.amountReceived || order.total,
      changeDue: order.change || 0,
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
      toast.push('Failed to open receipt preview')
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
                  disabled={tenderedAmount < totals.total}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
                >
                  Complete Sale
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
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-700 dark:text-gray-300">Total:</span>
                    <span className="text-gray-900 dark:text-gray-100">${completedOrder.total.toFixed(2)}</span>
                  </div>
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
                toast.push(`Error: ${error.message}`)
              }
            })

            // Close preview and completed order modal
            setShowReceiptPreview(false)
            setPendingReceiptData(null)
            setShowReceiptModal(false)
            setCompletedOrder(null)

          } catch (error: any) {
            toast.push(`Print error: ${error.message}`)
          }
        }}
      />

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <AddCustomerModal
          onClose={() => setShowAddCustomerModal(false)}
          onCustomerCreated={() => {
            setShowAddCustomerModal(false)
            customAlert({ title: 'Success', description: 'Customer created successfully! You can now search for them.' })
          }}
        />
      )}

      <ContentLayout
      title="Grocery Point of Sale"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Grocery', href: '/grocery' },
        { label: 'Point of Sale', isActive: true }
      ]}
    >
      {/* Daily Sales Widget */}
      <div className="mb-6">
        <DailySalesWidget
          dailySales={dailySales}
          businessType="grocery"
          onRefresh={loadDailySales}
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-4 flex gap-3">
        <button
          onClick={async () => {
            try {
              await openDisplay()
            } catch (error) {
              toast.push('Failed to open customer display. Please allow popups for this site.', { type: 'error', duration: 5000 })
            }
          }}
          className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-medium"
        >
          🖥️ Open Customer Display
        </button>
        <a
          href="/grocery/reports"
          className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg font-medium"
        >
          📊 View Sales Reports & Analytics
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main POS Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Product Entry */}
          <div className="card p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Product Entry</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                        <button
                          onClick={() => setShowScanner(!showScanner)}
                          className="mb-2 px-3 py-2 w-full sm:w-auto bg-blue-100 text-blue-800 rounded text-sm"
                        >
                          {showScanner ? 'Hide Scanner' : 'Show Scanner'}
                        </button>

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
                                  id: variantId || product.id,
                                  name: product.name,
                                  barcode: primaryBarcode, // Use primary barcode, not SKU
                                  category: product.businessType || 'General',
                                  unitType: 'each',
                                  price,
                                  unit: 'each',
                                  taxable: false,
                                  weightRequired: false
                                }
                                addToCart(posItem)
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

            {/* Scale Display */}
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

            {/* Quick Add Buttons for Common Items */}
            {/* WiFi Token Tabs - Only show if at least one integration is enabled */}
            {(esp32IntegrationEnabled || r710IntegrationEnabled) && (
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {productsLoading ? (
                <div className="col-span-full text-center py-4 text-secondary">
                  Loading products...
                </div>
              ) : products.length === 0 ? (
                <div className="col-span-full text-center py-4 text-secondary">
                  No products available
                </div>
              ) : (
                (() => {
                  // Filter products based on active WiFi tab
                  let filteredProducts = products

                  // If WiFi integration is enabled, filter by active tab
                  if (esp32IntegrationEnabled || r710IntegrationEnabled) {
                    filteredProducts = products.filter((product) => {
                      const isESP32Token = (product as any).wifiToken === true
                      const isR710Token = (product as any).r710Token === true

                      // Show WiFi tokens matching the active tab
                      if (activeWiFiTab === 'esp32') {
                        return isESP32Token
                      } else if (activeWiFiTab === 'r710') {
                        return isR710Token
                      }

                      return false
                    })
                  }

                  // Display first 4 filtered products
                  return filteredProducts.slice(0, 4).map((product) => (
                  <div
                    key={product.id}
                    onClick={() => product.weightRequired ?
                      (currentWeight > 0 ? addToCart(product, 1, currentWeight) : void customAlert({ title: 'Weigh item', description: 'Please weigh item first' })) :
                      addToCart(product)
                    }
                    className="p-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm text-primary min-w-0 cursor-pointer"
                  >
                    <div className="font-medium">{product.name}</div>
                    {/* Only show PLU/Barcode for non-WiFi products */}
                    {!(product as any).wifiToken && !(product as any).r710Token && (
                      <div className="text-secondary">
                        {product.pluCode && `PLU: ${product.pluCode}`}
                        {product.barcode && !product.pluCode && `Barcode`}
                      </div>
                    )}
                    <div className="font-semibold text-green-600">
                      {formatCurrency(product.price)}/{product.unit}
                    </div>
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
                            disabled={requestingMore.has((product as any).tokenConfigId)}
                            className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-2 py-1 rounded w-full transition-colors"
                          >
                            {requestingMore.has((product as any).tokenConfigId) ? '⏳ Requesting...' : '+ Request 5 More'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  ))
                })()
              )}
            </div>
          </div>

          {/* Shopping Cart */}
          <div className="card p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Shopping Cart</h3>

            {cart.length === 0 ? (
              <div className="text-secondary text-center py-8">
                Cart is empty. Scan or enter items to begin.
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg gap-2">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-secondary flex gap-4">
                        <span>{item.quantity.toFixed(item.weightRequired ? 2 : 0)} {item.unit}</span>
                        <span>{formatCurrency(item.price)}/{item.unit}</span>
                        {item.organicCertified && <span className="text-green-600">🌱 Organic</span>}
                        {item.snapEligible && <span className="text-blue-600">SNAP ✓</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                      <div className="font-semibold">{formatCurrency(item.subtotal)}</div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Customer & Payment */}
  <div className="space-y-4 mt-4 lg:mt-0">
          {/* Customer Info */}
          <div className="card p-4 sm:p-6">
            <CustomerLookup
              businessId={currentBusinessId || ''}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
              onCreateCustomer={() => setShowAddCustomerModal(true)}
              allowWalkIn={true}
            />

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
            <h3 className="text-lg font-semibold mb-4">Order Summary</h3>

            {cart.length === 0 ? (
              <div className="text-secondary text-center py-8 text-sm">
                Cart is empty
              </div>
            ) : (
              <>
                {/* Cart Items */}
                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                  {cart.map((item, index) => (
                    <div key={`summary-${item.id}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.name}</div>
                        <div className="text-xs text-secondary">
                          {item.quantity.toFixed(item.weightRequired ? 2 : 0)} × {formatCurrency(item.price)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="font-semibold text-sm whitespace-nowrap">
                          {formatCurrency(item.subtotal)}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-xs"
                          title="Remove item"
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
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>{formatCurrency(totals.total)}</span>
                    </div>
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
            </div>

            <button
              onClick={handlePayment}
              disabled={cart.length === 0}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-base"
            >
              Process Payment - {formatCurrency(totals.total)}
            </button>
          </div>
        </div>
      </div>
    </ContentLayout>

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Wrong Business Type</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The Grocery POS is only available for grocery businesses. Your current business "{currentBusiness.businessName}" is a {currentBusiness.businessType} business.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Please select a grocery business from the sidebar to use this POS system.
          </p>
        </div>
      </div>
    )
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