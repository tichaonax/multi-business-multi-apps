'use client'

/**
 * Customer Display Page
 *
 * Customer-facing display that shows:
 * 1. Real-time cart updates as items are added at POS
 * 2. Marketing content (ads) when cart is empty
 *
 * Query Parameters:
 * - businessId: The business ID for scoping
 * - terminalId: The terminal ID for scoping
 *
 * Example URL: /customer-display?businessId=biz_123&terminalId=terminal-1
 */

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useCustomerDisplaySync } from '@/hooks/useCustomerDisplaySync'
import { SyncMode } from '@/lib/customer-display/sync-manager'
import { CartMessage } from '@/lib/customer-display/broadcast-sync'
import { CartDisplay } from '@/components/customer-display/cart-display'
import { MarketingDisplay } from '@/components/customer-display/marketing-display'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function CustomerDisplayPage() {
  return (
    <Suspense fallback={<CustomerDisplayLoading />}>
      <CustomerDisplayContent />
    </Suspense>
  )
}

function CustomerDisplayLoading() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-2xl text-gray-600">Loading Display...</p>
      </div>
    </div>
  )
}

interface CartItem {
  id: string
  name: string
  quantity: number
  price: number
  variant?: string
  imageUrl?: string
}

interface CartState {
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
}

function CustomerDisplayContent() {
  const searchParams = useSearchParams()
  const initialBusinessId = searchParams.get('businessId') // Optional hint
  const terminalId = searchParams.get('terminalId')
  const autoFullscreen = searchParams.get('autoFullscreen') === 'true'

  // Active business tracking - can change dynamically when POS switches business
  // Start with initialBusinessId from URL if provided, otherwise null
  const [currentActiveBusinessId, setCurrentActiveBusinessId] = useState<string | null>(initialBusinessId)

  // Use initialBusinessId for display even if no active business signaled yet
  // This allows showing business info and marketing content immediately
  const displayBusinessId = currentActiveBusinessId || initialBusinessId

  // Debug: Log connection parameters
  console.log('🔍 [CustomerDisplay] Connection Info:', {
    initialBusinessId,
    currentActiveBusinessId,
    displayBusinessId,
    terminalId: terminalId || '(not used for channel)',
    channelName: 'customer-display',
    autoFullscreen,
    note: 'Universal channel - display can switch between businesses dynamically'
  })

  // Cart state
  const [cart, setCart] = useState<CartState>({
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0
  })

  // Greeting and business info
  const [employeeName, setEmployeeName] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState<string | null>(null)
  const [businessPhone, setBusinessPhone] = useState<string | null>(null)
  const [customMessage, setCustomMessage] = useState<string>('All sales are final')
  const [taxIncludedInPrice, setTaxIncludedInPrice] = useState<boolean>(false)
  const [taxRate, setTaxRate] = useState<number>(0)
  const [taxLabel, setTaxLabel] = useState<string>('Tax')
  const [ecocashEnabled, setEcocashEnabled] = useState<boolean>(false)

  // Payment state
  const [paymentState, setPaymentState] = useState<{
    inProgress: boolean
    amountTendered: number
    changeDue: number
    shortfall: number
    paymentMethod?: string
  }>({
    inProgress: false,
    amountTendered: 0,
    changeDue: 0,
    shortfall: 0
  })

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Page context tracking
  const [pageContext, setPageContext] = useState<'pos' | 'marketing'>('marketing')

  // Display mode: 'marketing' when cart is empty OR not in POS, 'cart' when in POS with items
  const [displayMode, setDisplayMode] = useState<'cart' | 'marketing'>('marketing')

  // Inactivity timer for auto-clearing cart (privacy)
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now())
  const INACTIVITY_TIMEOUT_MS = 30000 // 30 seconds

  // Handle incoming cart messages
  const handleCartMessage = useCallback((message: CartMessage) => {
    console.log('📨 [CustomerDisplay] Received message:', {
      type: message.type,
      businessId: message.businessId,
      terminalId: message.terminalId,
      currentActiveBusinessId,
      payload: message.payload
    })

    // Handle SET_ACTIVE_BUSINESS - always process to potentially switch businesses
    if (message.type === 'SET_ACTIVE_BUSINESS') {
      if (message.businessId !== currentActiveBusinessId) {
        console.log('🔄 [CustomerDisplay] Business switch detected:', {
          from: currentActiveBusinessId,
          to: message.businessId
        })
        setCurrentActiveBusinessId(message.businessId)
        // Clear cart when switching businesses
        setCart({
          items: [],
          subtotal: 0,
          tax: 0,
          total: 0
        })
      }
      return
    }

    // Filter messages by active business (ignore messages from other businesses)
    if (message.businessId !== currentActiveBusinessId) {
      console.log('⏭️ [CustomerDisplay] Ignoring message from different business:', {
        messageBusinessId: message.businessId,
        currentActiveBusinessId
      })
      return
    }

    setLastActivityTime(Date.now())

    switch (message.type) {
      case 'CART_STATE':
        // Full cart state update
        const newCart = {
          items: message.payload.items || [],
          subtotal: message.payload.subtotal,
          tax: message.payload.tax,
          total: message.payload.total
        }
        console.log('🛒 [CustomerDisplay] Setting cart state:', {
          itemCount: newCart.items.length,
          items: newCart.items,
          subtotal: newCart.subtotal,
          tax: newCart.tax,
          total: newCart.total
        })
        console.log('🛒 [CustomerDisplay] Current pageContext:', pageContext)
        console.log('🛒 [CustomerDisplay] Will show cart?', pageContext === 'pos' && newCart.items.length > 0)
        setCart(newCart)
        break

      case 'ADD_ITEM':
        // Add or update item
        if (message.payload.item) {
          setCart(prev => {
            const existingIndex = prev.items.findIndex(i => i.id === message.payload.item!.id)
            let newItems: CartItem[]

            if (existingIndex >= 0) {
              // Update existing item
              newItems = [...prev.items]
              newItems[existingIndex] = message.payload.item!
            } else {
              // Add new item
              newItems = [...prev.items, message.payload.item!]
            }

            return {
              items: newItems,
              subtotal: message.payload.subtotal,
              tax: message.payload.tax,
              total: message.payload.total
            }
          })
        }
        break

      case 'REMOVE_ITEM':
        // Remove item
        if (message.payload.itemId) {
          setCart(prev => ({
            items: prev.items.filter(i => i.id !== message.payload.itemId),
            subtotal: message.payload.subtotal,
            tax: message.payload.tax,
            total: message.payload.total
          }))
        }
        break

      case 'UPDATE_QUANTITY':
        // Update item quantity
        if (message.payload.itemId && message.payload.quantity !== undefined) {
          setCart(prev => {
            const newItems = prev.items.map(item => {
              if (item.id === message.payload.itemId) {
                return { ...item, quantity: message.payload.quantity! }
              }
              return item
            }).filter(item => item.quantity > 0)

            return {
              items: newItems,
              subtotal: message.payload.subtotal,
              tax: message.payload.tax,
              total: message.payload.total
            }
          })
        }
        break

      case 'CLEAR_CART':
        // Clear entire cart
        setCart({
          items: [],
          subtotal: 0,
          tax: 0,
          total: 0
        })
        break

      case 'SET_GREETING':
        // Set employee greeting from POS (business info comes from API only)
        console.log('[CustomerDisplay] SET_GREETING received:', {
          employeeName: message.payload.employeeName
        })
        if (message.payload.employeeName) {
          setEmployeeName(message.payload.employeeName)
        }
        // Business data (name, phone, customMessage) is ONLY set from API, not from POS broadcast
        break

      case 'SET_PAGE_CONTEXT':
        // Update page context (pos or marketing)
        if (message.payload.pageContext) {
          setPageContext(message.payload.pageContext)
        }
        break

      case 'PAYMENT_STARTED':
        // Payment started - show cart with "Payment in Progress"
        console.log('[CustomerDisplay] Payment started')
        setPaymentState({
          inProgress: true,
          amountTendered: 0,
          changeDue: 0,
          shortfall: message.payload.total,
          paymentMethod: message.payload.paymentMethod
        })
        break

      case 'PAYMENT_AMOUNT':
        // Amount tendered updated - calculate change or shortfall
        const tendered = message.payload.amountTendered || 0
        const total = message.payload.total
        const change = tendered - total
        console.log('[CustomerDisplay] Payment amount updated:', {
          tendered,
          total,
          change
        })
        setPaymentState({
          inProgress: true,
          amountTendered: tendered,
          changeDue: change > 0 ? change : 0,
          shortfall: change < 0 ? Math.abs(change) : 0,
          paymentMethod: message.payload.paymentMethod
        })
        break

      case 'PAYMENT_COMPLETE':
        // Payment complete - show "Sale Complete" then clear cart after 3 seconds
        console.log('[CustomerDisplay] Payment complete - sale finished')
        setPaymentState(prev => ({
          ...prev,
          inProgress: false
        }))

        // Clear cart and payment state after 3 seconds
        setTimeout(() => {
          console.log('[CustomerDisplay] Clearing cart after sale complete')
          setCart({
            items: [],
            subtotal: 0,
            tax: 0,
            total: 0
          })
          setPaymentState({
            inProgress: false,
            amountTendered: 0,
            changeDue: 0,
            shortfall: 0
          })
        }, 3000)
        break

      case 'PAYMENT_CANCELLED':
        // Payment cancelled - return to cart view
        console.log('[CustomerDisplay] Payment cancelled - returning to cart view')
        setPaymentState({
          inProgress: false,
          amountTendered: 0,
          changeDue: 0,
          shortfall: 0
        })
        break
    }
  }, [currentActiveBusinessId])

  // Initialize sync connection (businessId is optional - display works with any/all businesses)
  const { isConnected, syncMode, connectionStatus, error } = useCustomerDisplaySync({
    businessId: currentActiveBusinessId || undefined, // Optional - only for tagging outgoing messages
    terminalId: terminalId || `terminal-${Date.now()}`, // Generate terminalId if not provided
    mode: SyncMode.BROADCAST, // Force BroadcastChannel for same-origin communication
    autoConnect: true,
    onMessage: handleCartMessage,
    onError: (err) => {
      console.error('[CustomerDisplay] Sync error:', err)
    }
  })

  // Fetch business information when business changes (dynamic)
  useEffect(() => {
    // Skip if no business to display
    if (!displayBusinessId) {
      console.log('[CustomerDisplay] No business ID available yet')
      return
    }

    async function fetchBusinessData() {
      try {
        // Detect Electron environment - check multiple indicators
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : ''
        const isElectron = userAgent.includes('electron') ||
                          (typeof process !== 'undefined' && (process as any).versions?.electron) ||
                          (typeof window !== 'undefined' && (window as any).electronAPI !== undefined)

        // Use window.location.origin to get the current base URL (includes port from .env.local)
        // This works in both browser and Electron, using whatever port the app is running on
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

        // Fetch business information (using public customer display endpoint)
        console.log('[CustomerDisplay] Fetching business info:', {
          businessId: displayBusinessId,
          isElectron,
          baseUrl,
          locationOrigin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
          fullUrl: `${baseUrl}/api/customer-display/business/${displayBusinessId}`
        })

        let businessResponse
        try {
          businessResponse = await fetch(`${baseUrl}/api/customer-display/business/${displayBusinessId}`)
        } catch (fetchError) {
          console.error('[CustomerDisplay] Network error fetching business info:', {
            error: fetchError,
            message: (fetchError as Error).message,
            isElectron,
            baseUrl,
            url: `${baseUrl}/api/customer-display/business/${displayBusinessId}`
          })
          return
        }

        if (!businessResponse.ok) {
          console.error('[CustomerDisplay] Failed to fetch business info (HTTP error):', {
            status: businessResponse.status,
            statusText: businessResponse.statusText,
            url: businessResponse.url,
            isElectron,
            baseUrl
          })
          return
        }

        const businessData = await businessResponse.json()
        const business = businessData.business

        console.log('[CustomerDisplay] Business data received:', {
          hasData: !!business,
          name: business?.name,
          phone: business?.phone,
          umbrellaBusinessName: business?.umbrellaBusinessName,
          umbrellaBusinessPhone: business?.umbrellaBusinessPhone,
          ecocashEnabled: business?.ecocashEnabled,
          taxIncludedInPrice: business?.taxIncludedInPrice
        })

        // Set business information
        if (business) {
          setBusinessName(business.name || business.umbrellaBusinessName || 'Welcome')
          setBusinessPhone(business.phone || business.umbrellaBusinessPhone || null)
          setCustomMessage(business.receiptReturnPolicy || 'Thank you for your business')
          setEcocashEnabled(business.ecocashEnabled || false)

          // Set tax configuration
          setTaxIncludedInPrice(business.taxIncludedInPrice ?? true)
          setTaxRate(business.taxRate || 0)
          setTaxLabel(business.taxLabel || 'Tax')

          console.log('[CustomerDisplay] Business config applied:', {
            ecocashEnabled: business.ecocashEnabled,
            taxIncludedInPrice: business.taxIncludedInPrice,
            taxRate: business.taxRate,
            taxLabel: business.taxLabel
          })
        }

        // Fetch current session user (for same-device scenarios)
        try {
          console.log('[CustomerDisplay] Fetching session user from:', `${baseUrl}/api/auth/session`)
          const sessionResponse = await fetch(`${baseUrl}/api/auth/session`)

          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json()
            console.log('[CustomerDisplay] Session data:', sessionData)

            if (sessionData.user?.name) {
              setEmployeeName(sessionData.user.name)
              console.log('[CustomerDisplay] Employee name set to:', sessionData.user.name)
            } else {
              setEmployeeName('Our Staff')
              console.log('[CustomerDisplay] No user name in session, using default')
            }
          } else {
            console.log('[CustomerDisplay] No active session, using default employee name')
            setEmployeeName('Our Staff')
          }
        } catch (sessionErr) {
          console.warn('[CustomerDisplay] Could not fetch session, using default employee name:', sessionErr)
          setEmployeeName('Our Staff')
        }
      } catch (err) {
        console.error('[CustomerDisplay] Error fetching business data:', err)
      }
    }

    fetchBusinessData()
  }, [displayBusinessId])

  // Handle fullscreen mode
  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
        console.log('[CustomerDisplay] ✅ Entered fullscreen mode')
        setIsFullscreen(true)
        setShowFullscreenPrompt(false)
      }
    } catch (err: any) {
      console.error('[CustomerDisplay] ⚠️ Fullscreen failed:', err.message)
    }
  }

  // Monitor fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement
      setIsFullscreen(inFullscreen)

      if (!inFullscreen) {
        console.log('[CustomerDisplay] Exited fullscreen')
        // Auto re-enter after brief delay
        setTimeout(enterFullscreen, 500)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    // Check initial state
    setIsFullscreen(!!document.fullscreenElement)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Toggle between cart and marketing mode based on cart contents AND page context
  useEffect(() => {
    console.log('🎯 [CustomerDisplay] Display mode logic:', {
      pageContext,
      itemCount: cart.items.length,
      currentDisplayMode: displayMode
    })

    // If user is in POS and has items, show cart
    if (pageContext === 'pos' && cart.items.length > 0) {
      console.log('✅ [CustomerDisplay] Switching to CART mode')
      setDisplayMode('cart')
    } else {
      console.log('📺 [CustomerDisplay] Switching to MARKETING mode')
      // Otherwise show marketing (whether cart is empty OR user is not in POS)
      setDisplayMode('marketing')
    }
  }, [cart.items.length, pageContext, displayMode])

  // Auto-clear cart after inactivity (privacy feature)
  useEffect(() => {
    if (cart.items.length === 0) return

    const checkInactivity = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityTime
      if (timeSinceActivity >= INACTIVITY_TIMEOUT_MS) {
        console.log('[CustomerDisplay] Auto-clearing cart due to inactivity')
        setCart({
          items: [],
          subtotal: 0,
          tax: 0,
          total: 0
        })
      }
    }, 5000) // Check every 5 seconds

    return () => clearInterval(checkInactivity)
  }, [cart.items.length, lastActivityTime])

  return (
    <div className="h-screen w-screen overflow-hidden bg-white relative">
      {/* Business Info Banner - Only visible element */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-8 shadow-lg">
        <div className="max-w-7xl mx-auto">
          {/* Business Name */}
          {businessName && (
            <div className="text-center mb-2">
              <p className="text-3xl font-bold">{businessName}</p>
            </div>
          )}

          {/* Employee Greeting & Business Info */}
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              {employeeName && (
                <p className="text-xl font-medium">
                  🙋 {employeeName} is here to help you today
                </p>
              )}
            </div>

            {businessPhone && (
              <div className="text-right flex items-center gap-3">
                <p className="text-3xl font-bold">📞 {formatPhoneNumberForDisplay(businessPhone)}</p>
                {ecocashEnabled && (
                  <img
                    src="/images/ecocash-logo.png"
                    alt="Eco-Cash Accepted"
                    style={{ width: '90px', height: '90px' }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Custom Message */}
          {customMessage && (
            <div className="text-center mt-2 text-sm opacity-90">
              <p>{customMessage}</p>
            </div>
          )}
        </div>
      </div>

      {/* Display content with smooth transitions */}
      <div className="h-full w-full relative pt-32">
        {/* Marketing Display - fade in/out */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${
            displayMode === 'marketing' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <MarketingDisplay businessId={displayBusinessId} />
        </div>

        {/* Cart Display - fade in/out */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${
            displayMode === 'cart' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <CartDisplay
            items={cart.items}
            subtotal={cart.subtotal}
            tax={cart.tax}
            total={cart.total}
            taxIncludedInPrice={taxIncludedInPrice}
            taxRate={taxRate}
            taxLabel={taxLabel}
            paymentInProgress={paymentState.inProgress}
            amountTendered={paymentState.amountTendered}
            changeDue={paymentState.changeDue}
            shortfall={paymentState.shortfall}
            paymentMethod={paymentState.paymentMethod}
          />
        </div>
      </div>
    </div>
  )
}
