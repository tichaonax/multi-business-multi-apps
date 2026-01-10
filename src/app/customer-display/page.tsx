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
  const businessId = searchParams.get('businessId')
  const terminalId = searchParams.get('terminalId')

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
  const [ecocashEnabled, setEcocashEnabled] = useState<boolean>(false)

  // Page context tracking
  const [pageContext, setPageContext] = useState<'pos' | 'marketing'>('marketing')

  // Display mode: 'marketing' when cart is empty OR not in POS, 'cart' when in POS with items
  const [displayMode, setDisplayMode] = useState<'cart' | 'marketing'>('marketing')

  // Inactivity timer for auto-clearing cart (privacy)
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now())
  const INACTIVITY_TIMEOUT_MS = 30000 // 30 seconds

  // Validate required params
  if (!businessId || !terminalId) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Invalid Display Configuration
          </h1>
          <p className="text-2xl text-gray-600 mb-4">
            Missing required parameters: businessId and terminalId
          </p>
          <p className="text-xl text-gray-500">
            Please open this display from your POS system.
          </p>
        </div>
      </div>
    )
  }

  // Handle incoming cart messages
  const handleCartMessage = useCallback((message: CartMessage) => {
    console.log('📨 [CustomerDisplay] Received message:', {
      type: message.type,
      businessId: message.businessId,
      terminalId: message.terminalId,
      payload: message.payload
    })
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
        // Set greeting and business info from POS
        console.log('[CustomerDisplay] SET_GREETING received:', {
          employeeName: message.payload.employeeName,
          businessName: message.payload.businessName,
          businessPhone: message.payload.businessPhone,
          customMessage: message.payload.customMessage
        })
        if (message.payload.employeeName) {
          setEmployeeName(message.payload.employeeName)
        }
        if (message.payload.businessName) {
          setBusinessName(message.payload.businessName)
        }
        if (message.payload.businessPhone) {
          setBusinessPhone(message.payload.businessPhone)
        }
        if (message.payload.customMessage) {
          setCustomMessage(message.payload.customMessage)
        }
        break

      case 'SET_PAGE_CONTEXT':
        // Update page context (pos or marketing)
        if (message.payload.pageContext) {
          setPageContext(message.payload.pageContext)
        }
        break
    }
  }, [])

  // Initialize sync connection
  const { isConnected, syncMode, connectionStatus, error } = useCustomerDisplaySync({
    businessId,
    terminalId,
    mode: SyncMode.BROADCAST, // Force BroadcastChannel for same-origin communication
    autoConnect: true,
    onMessage: handleCartMessage,
    onError: (err) => {
      console.error('[CustomerDisplay] Sync error:', err)
    }
  })

  // Fetch business information and session user on mount (independent of POS)
  useEffect(() => {
    async function fetchInitialData() {
      try {
        // Fetch business information
        console.log('[CustomerDisplay] Fetching business info for:', businessId)
        const businessResponse = await fetch(`/api/business/${businessId}`)

        if (!businessResponse.ok) {
          console.error('[CustomerDisplay] Failed to fetch business info:', businessResponse.status)
          return
        }

        const businessData = await businessResponse.json()
        const business = businessData.business

        console.log('[CustomerDisplay] Business info fetched:', {
          name: business?.name,
          phone: business?.phone,
          umbrellaBusinessName: business?.umbrellaBusinessName,
          umbrellaBusinessPhone: business?.umbrellaBusinessPhone
        })

        // Set business information
        if (business) {
          setBusinessName(business.name || business.umbrellaBusinessName || 'Welcome')
          setBusinessPhone(business.phone || business.umbrellaBusinessPhone || null)
          setCustomMessage(business.receiptReturnPolicy || 'Thank you for your business')
          setEcocashEnabled(business.ecocashEnabled || false)
          console.log('[CustomerDisplay] Eco-cash enabled:', business.ecocashEnabled)

          // Extract tax setting from business settings
          if (business.settings && typeof business.settings === 'object') {
            const settings = business.settings as any
            if (settings.taxIncludedInPrice !== undefined) {
              setTaxIncludedInPrice(settings.taxIncludedInPrice)
              console.log('[CustomerDisplay] Tax included in price:', settings.taxIncludedInPrice)
            }
          }
        }

        // Fetch current session user (for same-device scenarios)
        try {
          console.log('[CustomerDisplay] Fetching session user...')
          const sessionResponse = await fetch('/api/auth/session')

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
        console.error('[CustomerDisplay] Error fetching initial data:', err)
      }
    }

    fetchInitialData()
  }, [businessId])

  // Auto-enter fullscreen/kiosk mode on mount
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen()
          console.log('[CustomerDisplay] Entered fullscreen mode')
        }
      } catch (err) {
        console.log('[CustomerDisplay] Fullscreen request failed:', err)
      }
    }

    // Small delay to ensure page is loaded
    const timer = setTimeout(enterFullscreen, 500)
    return () => clearTimeout(timer)
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
                <p className="text-2xl font-bold">📞 {businessPhone}</p>
                {ecocashEnabled && (
                  <img
                    src="/images/ecocash-logo.png"
                    alt="Eco-Cash Accepted"
                    className="h-12 w-auto object-contain"
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
          <MarketingDisplay businessId={businessId} />
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
          />
        </div>
      </div>
    </div>
  )
}
