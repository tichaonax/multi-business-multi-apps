'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
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

interface MenuItem {
  id: string
  name: string
  price: number
  category: string
  // optional/extended fields mapped from UniversalProduct
  isAvailable?: boolean
  isCombo?: boolean
  requiresCompanionItem?: boolean
  originalPrice?: number | null
  discountPercent?: number | null
  spiceLevel?: number | null
  preparationTime?: number | null
  stockQuantity?: number
  variants?: Array<{ id: string; name?: string; price?: number; isAvailable?: boolean; stockQuantity?: number }>
}

interface CartItem extends MenuItem {
  quantity: number
}

export default function RestaurantPOS() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const submitInFlightRef = useRef<{ current: boolean } | any>({ current: false })
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'MOBILE'>('CASH')
  const [amountReceived, setAmountReceived] = useState('')
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [completedOrder, setCompletedOrder] = useState<any>(null)
  const [printerId, setPrinterId] = useState<string | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [dailySales, setDailySales] = useState<any>(null)
  const [showDailySales, setShowDailySales] = useState(false)
  const { data: session, status } = useSession()
  const router = useRouter()
  const { preferences, isLoaded: preferencesLoaded } = usePrintPreferences()

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
  const isAdmin = sessionUser?.role === 'admin'

  // Toast context (hook) must be called unconditionally to preserve hooks order
  const toast = useToastContext()

  // Check if current business is a restaurant business
  const isRestaurantBusiness = currentBusiness?.businessType === 'restaurant'

  const categories = ['all', 'combos', 'appetizers', 'mains', 'desserts', 'beverages', 'wifi-access']

  // Load menu items (defined early so hooks order is stable).
  const loadMenuItems = async () => {
    try {
      // Use currentBusinessId if available, otherwise use businessType filter
      const queryParams = new URLSearchParams({
        businessType: 'restaurant',
        isAvailable: 'true',
        isActive: 'true',
        includeVariants: 'true', // Include variants to get stock quantities
        limit: '500' // High limit to get all products
      })

      // If specific business selected, filter by that business
      if (currentBusinessId) {
        queryParams.set('businessId', currentBusinessId)
      }

      // Fetch products, purchase statistics, and WiFi tokens in parallel
      const [productsResponse, statsResponse, wifiTokensResponse] = await Promise.all([
        fetch(`/api/universal/products?${queryParams.toString()}`),
        fetch(`/api/restaurant/product-stats?businessId=${currentBusinessId || ''}`),
        currentBusinessId ? fetch(`/api/business/${currentBusinessId}/wifi-tokens`) : Promise.resolve({ ok: false })
      ])

      if (productsResponse.ok) {
        const data = await productsResponse.json()
        if (data.success) {
          // Get purchase counts if available
          let purchaseCounts: Record<string, number> = {}
          if (statsResponse.ok) {
            const statsData = await statsResponse.json()
            if (statsData.success && statsData.data) {
              purchaseCounts = statsData.data.reduce((acc: any, item: any) => {
                acc[item.productId] = item.totalSold || 0
                return acc
              }, {})
            }
          }

          // Transform universal products to menu items format
          const items = data.data
            .filter((product: any) => product.isAvailable && product.isActive)
            .map((product: any) => {
              // Calculate total stock from all variants
              const totalStock = (product.variants || []).reduce((sum: number, variant: any) => {
                return sum + (variant.stockQuantity || 0)
              }, 0)

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
                variants: product.variants,
                purchaseCount: purchaseCounts[product.id] || 0
              }
            })
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
                  const quantitiesResponse = await fetch(`/api/wifi-portal/tokens?businessId=${currentBusinessId}&status=ACTIVE&limit=1000`)
                  if (quantitiesResponse.ok) {
                    const quantitiesData = await quantitiesResponse.json()
                    const tokens = quantitiesData.tokens || []
                    
                    // Count tokens by tokenConfigId
                    quantityMap = tokens.reduce((acc: Record<string, number>, token: any) => {
                      const configId = token.tokenConfig?.id
                      if (configId && tokenConfigIds.includes(configId)) {
                        acc[configId] = (acc[configId] || 0) + 1
                      }
                      return acc
                    }, {})
                  }
                } catch (error) {
                  console.error('Failed to fetch token quantities:', error)
                }
              }

              wifiTokenItems = wifiData.menuItems
                .filter((item: any) => item.isActive)
                .map((item: any) => ({
                  id: `wifi-token-${item.id}`,
                  name: `📶 ${item.tokenConfig.name}`,
                  price: item.businessPrice,
                  category: 'wifi-access',
                  isAvailable: true,
                  wifiToken: true, // Flag to identify WiFi tokens
                  businessTokenMenuItemId: item.id,
                  tokenConfigId: item.tokenConfigId,
                  tokenConfig: item.tokenConfig,
                  availableQuantity: quantityMap[item.tokenConfigId] || 0,
                }))
            }
          }

          // Merge regular items and WiFi tokens
          setMenuItems([...items, ...wifiTokenItems])
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

  // Function to print receipt using browser print dialog
  const printReceipt = async () => {
    if (!completedOrder) {
      toast.push('No order to print')
      return
    }

    setIsPrinting(true)

    try {
      // Use browser's native print dialog
      // This works with EPSON driver in Windows Graphics mode
      window.print()

      // Small delay to let print dialog open
      await new Promise(resolve => setTimeout(resolve, 500))

      toast.push('✅ Print ready')

      // Auto-close modal after print dialog
      setTimeout(() => {
        setShowReceiptModal(false)
        setCompletedOrder(null)
      }, 1500)
    } catch (error: any) {
      console.error('❌ Print error:', error)
      toast.push(`❌ Print error: ${error.message || 'Unknown error'}`)
    } finally {
      setIsPrinting(false)
    }
  }

  // Auto-print receipt when modal opens (if preference enabled)
  useEffect(() => {
    if (showReceiptModal && completedOrder && preferences.autoPrintReceipt) {
      console.log('🖨️ Auto-printing receipt...')
      printReceipt()
    }
  }, [showReceiptModal, completedOrder])

  // Load daily sales summary
  const loadDailySales = async () => {
    if (!currentBusinessId) return

    try {
      const response = await fetch(`/api/restaurant/daily-sales?businessId=${currentBusinessId}`)
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

  // Reload daily sales after completing an order
  useEffect(() => {
    if (completedOrder && currentBusinessId) {
      // Reload sales data after a short delay to allow order to be processed
      setTimeout(() => loadDailySales(), 500)
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
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Wrong Business Type</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The Restaurant POS is only available for restaurant businesses. Your current business "{currentBusiness.businessName}" is a {currentBusiness.businessType} business.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Please select a restaurant business from the sidebar to use this POS system.
            </p>
          </div>
        </div>
      )
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

    // Check portal health before adding WiFi tokens
    if ((item as any).wifiToken) {
      try {
        const healthResponse = await fetch(`/api/wifi-portal/integration/health?businessId=${currentBusinessId}`)
        const healthData = await healthResponse.json()

        if (!healthData.success || healthData.health?.status !== 'healthy') {
          toast.push(`⚠️ WiFi Portal is currently unavailable. Cannot add WiFi tokens to cart.`)
          return
        }
      } catch (error) {
        toast.push(`⚠️ Failed to verify WiFi Portal status. Please try again.`)
        return
      }

      // Check available quantity for WiFi tokens
      const availableQuantity = (item as any).availableQuantity || 0
      const currentCartQuantity = cart.find(c => c.id === item.id)?.quantity || 0

      if (availableQuantity <= currentCartQuantity) {
        if (availableQuantity === 0) {
          toast.push(`⚠️ No WiFi tokens available for "${item.name}". Please create more tokens in the WiFi Portal.`)
        } else {
          toast.push(`⚠️ Only ${availableQuantity} WiFi token${availableQuantity === 1 ? '' : 's'} available for "${item.name}".`)
        }
        return
      }
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
      if (existing) {
        console.log('✅ Item already in cart, incrementing quantity')
        return prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      console.log('✅ Adding new item to cart')
      return [...prev, { ...item, quantity: 1 }]
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
    setCart(prev => prev.filter(i => i.id !== itemId))
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }
    setCart(prev => 
      prev.map(i => i.id === itemId ? { ...i, quantity } : i)
    )
  }

  const total = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0)

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

  const filteredItems = selectedCategory === 'all'
    ? menuItems
    : selectedCategory === 'combos'
    ? menuItems.filter(item => item.isCombo === true)
    : menuItems.filter(item => item.category === getCategoryFilter(selectedCategory))

  const handleProcessOrderClick = () => {
    console.log('🔄 Process Order clicked')
    if (cart.length === 0) {
      console.log('❌ Cart is empty, not processing')
      return
    }
    // Open payment modal
    setAmountReceived('') // Start at zero so cashier can enter amount received
    setShowPaymentModal(true)
  }

  const completeOrderWithPayment = async () => {
    console.log('💳 Completing order with payment')
    console.log('Cart items:', cart)
    console.log('Payment method:', paymentMethod)
    console.log('Amount received:', amountReceived)

    // Prevent duplicate concurrent submissions
    if (submitInFlightRef.current) {
      console.log('⏸️ Already processing an order, skipping')
      return
    }
    submitInFlightRef.current = true

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
          wifiTokens: result.wifiTokens || [] // Capture WiFi tokens from API response
        }

        setCompletedOrder(orderForReceipt)

        // Close payment modal
        setShowPaymentModal(false)

        // Show receipt modal
        setShowReceiptModal(true)

        // Clear cart
        setCart([])

        // Reset payment fields
        setPaymentMethod('CASH')
        setAmountReceived('')

        console.log('✅ Order created:', result.orderNumber)

      } else {
        // Handle error response
        const errorData = await response.json().catch(() => null)
        const errorMessage = errorData?.error || errorData?.message || 'Failed to process order'
        console.error('Order processing failed:', errorMessage, errorData)
        toast.push(`Failed to process order: ${errorMessage}`)
      }
    } catch (error: any) {
      console.error('Order processing error:', error)
      toast.push(`Failed to process order: ${error.message || 'Network error'}`)
    }
    finally {
      submitInFlightRef.current = false
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
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-primary">Point of Sale</h1>
              <div className="flex gap-2">
                <Link
                  href="/restaurant/menu"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  📋 Menu
                </Link>
                <Link
                  href="/restaurant/orders"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  📦 Orders
                </Link>
                <Link
                  href="/restaurant/reports/end-of-day"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  📊 Reports
                </Link>
              </div>
            </div>

            {/* Daily Sales Summary Widget */}
            {dailySales && (
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
                  </div>
                )}
              </div>
            )}

            <BarcodeScanner
              onProductScanned={handleProductScanned}
              businessId={businessId}
              showScanner={showBarcodeScanner}
              onToggleScanner={() => setShowBarcodeScanner(!showBarcodeScanner)}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'card text-primary dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
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
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    disabled={isUnavailable}
                      className={`card bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow hover:shadow-lg transition-shadow text-left min-h-[80px] touch-manipulation relative ${
                      isUnavailable ? 'opacity-50 cursor-not-allowed' : ''
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
                    {item.spiceLevel && item.spiceLevel > 0 && (
                      <div className="absolute top-1 left-1">
                        <span className="text-xs">{'🌶️'.repeat(Math.min(item.spiceLevel, 3))}</span>
                      </div>
                    )}

                    <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 mt-2">
                      {item.name}
                      {item.requiresCompanionItem && (
                        <span className="ml-1 text-xs bg-orange-500 text-white px-1 rounded" title="Requires main item">+</span>
                      )}
                    </h3>

                    <div className="flex items-center gap-1 mt-1">
                      <p className={`text-base sm:text-lg font-bold ${hasDiscount ? 'text-red-600' : 'text-green-600'}`}>
                        ${Number(item.price).toFixed(2)}
                      </p>
                      {hasDiscount && (
                        <p className="text-xs text-secondary line-through">
                          ${Number(item.originalPrice || 0).toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* WiFi token quantity indicator */}
                    {item.wifiToken && (
                      <div className="mt-1">
                        <span className={`text-xs font-medium ${item.availableQuantity === 0 ? 'text-red-500' : item.availableQuantity < 5 ? 'text-orange-500' : 'text-green-600'}`}>
                          📦 {item.availableQuantity || 0} available
                        </span>
                      </div>
                    )}

                    {/* Preparation time */}
                    {item.preparationTime && item.preparationTime > 0 && (
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
                  </button>
                )
              })}
            </div>
          </div>

          <div className="card bg-white dark:bg-gray-900 p-4 rounded-lg shadow sticky top-20 self-start">
            <h2 className="text-xl font-bold text-primary mb-4">Order Summary</h2>
            
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center">
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
                onClick={() => setCart([])}
                disabled={cart.length === 0}
                className="w-full py-3 sm:py-2 mt-2 bg-gray-500 dark:bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-primary mb-4">💳 Payment</h2>

            <div className="space-y-4">
              {/* Order Total */}
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Total Amount:</span>
                  <span className="text-2xl font-bold text-green-600">${total.toFixed(2)}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {cart.length} item{cart.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Payment Method */}
              <div>
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
              </div>

              {/* Amount Received (for Cash) */}
              {paymentMethod === 'CASH' && (
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
                  {amountReceived && parseFloat(amountReceived) >= total && (
                    <div className="mt-2 p-2 bg-green-100 dark:bg-green-900 rounded text-green-800 dark:text-green-200 font-medium">
                      💵 Change: ${(parseFloat(amountReceived) - total).toFixed(2)}
                    </div>
                  )}
                  {amountReceived && parseFloat(amountReceived) < total && (
                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded text-red-800 dark:text-red-200 text-sm">
                      ⚠️ Amount received is less than total (${total.toFixed(2)})
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowPaymentModal(false)
                    setAmountReceived('')
                  }}
                  className="flex-1 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={completeOrderWithPayment}
                  disabled={paymentMethod === 'CASH' && (!amountReceived || parseFloat(amountReceived) < total)}
                  className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Complete Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && completedOrder && (
        <>
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #receipt-content,
              #receipt-content * {
                visibility: visible;
              }
              #receipt-content {
                position: absolute;
                left: 0;
                top: 0;
                width: 80mm; /* Thermal printer width */
                max-width: 80mm;
                margin: 0;
                padding: 5mm;
                font-family: monospace;
                font-size: 12pt;
              }
              @page {
                size: 80mm auto; /* Thermal paper width */
                margin: 0;
              }
            }
          `}</style>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
              {/* Receipt Content - Printable */}
              <div id="receipt-content" className="p-8">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-primary mb-2">Restaurant Receipt</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">{currentBusiness?.businessName || 'Restaurant'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{completedOrder.date}</p>
              </div>

              <div className="border-t border-b border-gray-300 dark:border-gray-600 py-3 mb-4">
                <div className="text-center font-mono text-sm">
                  <p className="font-bold">Order #{completedOrder.orderNumber}</p>
                </div>
              </div>

              {/* Items */}
              <div className="mb-4 space-y-2">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Items:</h3>
                {completedOrder.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <span className="font-medium">{item.quantity}x</span> {item.name}
                    </div>
                    <span className="font-mono">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-300 dark:border-gray-600 pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-mono">${completedOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="font-mono">${completedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="border-t border-gray-300 dark:border-gray-600 mt-4 pt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="font-medium">{completedOrder.paymentMethod}</span>
                </div>
                {completedOrder.paymentMethod === 'CASH' && (
                  <>
                    <div className="flex justify-between">
                      <span>Amount Received:</span>
                      <span className="font-mono">${completedOrder.amountReceived.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-green-600">
                      <span>Change:</span>
                      <span className="font-mono">${completedOrder.change.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* WiFi Tokens Section */}
              {completedOrder.wifiTokens && completedOrder.wifiTokens.length > 0 && (
                <div className="border-t-2 border-dashed border-gray-300 dark:border-gray-600 pt-4 mt-4 mb-4">
                  <div className="text-center font-bold text-sm mb-3">📶 WiFi ACCESS TOKENS</div>
                  {completedOrder.wifiTokens.map((token: any, index: number) => (
                    <div key={index} className="mb-3 p-3 border-2 border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      {token.success ? (
                        <>
                          <div className="text-sm font-bold mb-2 text-center">{token.packageName}</div>
                          <div className="text-center my-3">
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg font-mono text-xl font-bold border-2 border-gray-300 dark:border-gray-600">
                              {token.tokenCode}
                            </div>
                          </div>
                          <div className="text-xs text-center space-y-1">
                            <div className="font-semibold">Duration: {Math.floor(token.duration / 60)}h {token.duration % 60}m</div>
                            <div className="text-gray-600 dark:text-gray-400 mt-2">
                              Connect to WiFi and enter this code at the login portal
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-red-600 dark:text-red-400 text-center font-semibold">
                          ❌ Token generation failed: {token.error || 'Unknown error'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="text-center mt-6 pt-4 border-t border-gray-300 dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-400">Thank you for your order!</p>
              </div>
            </div>

            {/* Action Buttons - Not printed */}
            <div className="flex gap-3 p-6 pt-0 print:hidden">
              <button
                onClick={() => {
                  setShowReceiptModal(false)
                  setCompletedOrder(null)
                }}
                className="flex-1 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600"
              >
                Close
              </button>
              <button
                onClick={printReceipt}
                disabled={isPrinting}
                className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPrinting ? '⏳ Printing...' : '🖨️ Print Receipt'}
              </button>
            </div>
          </div>
        </div>
        </>
      )}
    </BusinessTypeRoute>
  )
}