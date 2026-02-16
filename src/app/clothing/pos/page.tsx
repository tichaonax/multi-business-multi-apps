'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { BusinessTypeRedirect } from '@/components/business-type-redirect'
import { ContentLayout } from '@/components/layout/content-layout'
import {
  BusinessProvider,
  UniversalProductGrid,
  UniversalPOS
} from '@/components/universal'
import { ClothingAdvancedPOS } from './components/advanced-pos'
import { DailySalesWidget } from '@/components/pos/daily-sales-widget'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { SessionUser } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'
import { useOpenCustomerDisplay, useCustomerDisplaySync } from '@/hooks/useCustomerDisplaySync'
import { SyncMode } from '@/lib/customer-display/sync-manager'
import { useAlert } from '@/components/ui/confirm-modal'
import { ManualEntryTab } from '@/components/pos/manual-entry-tab'
import type { ManualCartItem } from '@/components/pos/manual-entry-tab'
import { ManualOrderSummary } from '@/components/pos/manual-order-summary'

// This would typically come from session/auth
// const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'clothing-demo-business'
// const EMPLOYEE_ID = process.env.NEXT_PUBLIC_DEMO_EMPLOYEE_ID || 'demo-employee'

export default function ClothingPOSPage() {
  const [showProductGrid, setShowProductGrid] = useState(true)
  const [useAdvancedPOS, setUseAdvancedPOS] = useState(true)
  const [posMode, setPosMode] = useState<'live' | 'manual'>('live')
  const [manualCart, setManualCart] = useState<ManualCartItem[]>([])
  const [manualProducts, setManualProducts] = useState<any[]>([])
  const [dailySales, setDailySales] = useState<any>(null)
  const { data: session, status} = useSession()
  const router = useRouter()
  const customAlert = useAlert()

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

  // Check if current business is a clothing business
  const isClothingBusiness = currentBusiness?.businessType === 'clothing'

  // Customer Display - generate terminal ID
  const [terminalId] = useState(() => {
    if (typeof window === 'undefined') return 'terminal-default'
    const stored = localStorage.getItem('pos-terminal-id')
    if (stored) return stored
    const newId = `terminal-${Date.now()}`
    localStorage.setItem('pos-terminal-id', newId)
    return newId
  })

  const { openDisplay } = useOpenCustomerDisplay(currentBusinessId || '', terminalId)

  // Customer Display Sync - broadcast updates to customer-facing display
  const { send: sendToDisplay } = useCustomerDisplaySync({
    businessId: currentBusinessId || '',
    terminalId,
    mode: SyncMode.BROADCAST, // Force BroadcastChannel for same-origin communication
    autoConnect: true,
    onError: (error) => console.error('[Customer Display] Sync error:', error)
  })

  // Load daily sales
  const loadDailySales = async () => {
    if (!currentBusinessId) return

    try {
      const response = await fetch(`/api/universal/daily-sales?businessId=${currentBusinessId}&businessType=clothing&timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`)
      if (response.ok) {
        const data = await response.json()
        setDailySales(data.data)
      }
    } catch (error) {
      console.error('Failed to load daily sales:', error)
    }
  }

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Load daily sales on mount
  useEffect(() => {
    if (currentBusinessId && isClothingBusiness) {
      loadDailySales()
    }
  }, [currentBusinessId, isClothingBusiness])

  // Periodic refresh of daily sales every 30s for multi-user accuracy
  useEffect(() => {
    if (!currentBusinessId || !isClothingBusiness) return
    const interval = setInterval(() => loadDailySales(), 30000)
    return () => clearInterval(interval)
  }, [currentBusinessId, isClothingBusiness])

  // Fetch products for manual entry mode
  const fetchManualProducts = useCallback(async () => {
    if (!currentBusinessId) return
    try {
      const response = await fetch(`/api/universal/products?businessId=${currentBusinessId}&businessType=clothing&includeVariants=true&isAvailable=true&isActive=true&limit=500`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const items = result.data
            .filter((p: any) => { const price = Number(p.basePrice); return price > 0 && !isNaN(price) })
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              price: Number(p.basePrice),
              category: p.category?.name || 'General',
              isAvailable: true,
              barcode: p.barcode || p.sku,
              variants: p.variants?.map((v: any) => ({ id: v.id, name: v.name, price: Number(v.price || p.basePrice) })) || [{ id: p.id, name: p.name, price: Number(p.basePrice) }],
            }))
          setManualProducts(items)
        }
      }
    } catch (error) {
      console.error('Failed to fetch products for manual entry:', error)
    }
  }, [currentBusinessId])

  useEffect(() => {
    if (currentBusinessId && isClothingBusiness) fetchManualProducts()
  }, [currentBusinessId, isClothingBusiness, fetchManualProducts])

  // Manual cart helpers
  const addToManualCart = (item: ManualCartItem) => {
    setManualCart(prev => {
      if (item.isCustom) return [...prev, item]
      const existing = prev.find(c => c.id === item.id)
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, item]
    })
  }
  const updateManualCartQuantity = (id: string, qty: number) => {
    if (qty <= 0) { setManualCart(prev => prev.filter(c => c.id !== id)); return }
    setManualCart(prev => prev.map(c => c.id === id ? { ...c, quantity: qty } : c))
  }
  const removeFromManualCart = (id: string) => setManualCart(prev => prev.filter(c => c.id !== id))
  const clearManualCart = () => setManualCart([])

  const manualCategories = ['all', ...Array.from(new Set(manualProducts.filter((p: any) => p.category).map((p: any) => p.category as string)))]

  // Auto-open customer display and send greeting/context on mount
  useEffect(() => {
    if (!currentBusinessId || !currentBusiness) {
      console.log('[Clothing POS] Waiting for business context...', { currentBusinessId, hasBusiness: !!currentBusiness })
      return
    }

    let isActive = true

    async function initializeDisplay() {
      try {
        console.log('[Clothing POS] Starting customer display initialization...')

        // Try to open display (may fail if already open or popup blocked - that's OK)
        try {
          await openDisplay()
          console.log('[Clothing POS] Customer display window opened')
        } catch (displayError) {
          }

        // Fetch full business details from API to get all fields
        console.log('[Clothing POS] Fetching business details for:', currentBusinessId)
        const response = await fetch(`/api/business/${currentBusinessId}`)
        if (!response.ok) {
          console.error('[Clothing POS] Failed to fetch business details, status:', response.status)
          return
        }
        const data = await response.json()
        const businessData = data.business // API returns { business: {...} }
        console.log('[Clothing POS] Business data fetched:', {
          name: businessData?.name,
          phone: businessData?.phone,
          receiptReturnPolicy: businessData?.receiptReturnPolicy
        })

        // Wait longer for BroadcastChannel to initialize on BOTH windows
        console.log('[Clothing POS] Waiting for BroadcastChannel to be ready...')
        await new Promise(resolve => setTimeout(resolve, 2000))

        if (!isActive) return

        console.log('[Clothing POS] Sending greeting message...')
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
        console.log('[Clothing POS] Greeting sent:', greetingData)

        // Set page context to POS
        sendToDisplay('SET_PAGE_CONTEXT', {
          pageContext: 'pos',
          subtotal: 0,
          tax: 0,
          total: 0
        })
        console.log('[Clothing POS] Page context set to POS')
      } catch (error) {
        console.error('[Clothing POS] Failed to initialize customer display:', error)
      }
    }

    initializeDisplay()

    // Cleanup: Set context back to marketing when leaving POS
    return () => {
      isActive = false
      console.log('[Clothing POS] Cleanup: Setting context back to marketing')
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

  // Check if user has any clothing businesses
  const clothingBusinesses = businesses.filter(b => b.businessType === 'clothing' && b.isActive)
  const hasClothingBusinesses = clothingBusinesses.length > 0

  // If no current business selected and user has clothing businesses, show selection prompt
  if (!currentBusiness && hasClothingBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Clothing Business</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You have access to {clothingBusinesses.length} clothing business{clothingBusinesses.length > 1 ? 'es' : ''}.
            Please select one from the sidebar to use the POS system.
          </p>
          <div className="space-y-2">
            {clothingBusinesses.slice(0, 3).map(business => (
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

  // If current business is not clothing, show error
  if (currentBusiness && !isClothingBusiness) {
    return <BusinessTypeRedirect />
  }

  // If no clothing businesses at all, show message
  if (!hasClothingBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Clothing Businesses</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don't have access to any clothing businesses. The Clothing POS system requires access to at least one clothing business.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Contact your administrator if you need access to clothing businesses.
          </p>
        </div>
      </div>
    )
  }

  // At this point, we have a valid clothing business selected
  const businessId = currentBusinessId!

  const handleAddToCart = (productId: string, variantId?: string, quantity = 1) => {
    // Use URL parameters to trigger UniversalPOS/AdvancedPOS auto-add feature
    const params = new URLSearchParams()
    params.set('addProduct', productId)
    if (variantId) params.set('variantId', variantId)
    params.set('businessId', businessId)
    params.set('autoAdd', 'true')  // Enable auto-add to cart

    // Navigate with query parameters to trigger auto-add
    router.push(`/clothing/pos?${params.toString()}`)
  }

  const handleOrderComplete = (orderId: string) => {
    // Could redirect to receipt or show success message
    // Reload daily sales after order completion
    setTimeout(() => loadDailySales(), 500)
  }

  return (
    <BusinessProvider businessId={businessId}>
      <BusinessTypeRoute requiredBusinessType="clothing">
        <ContentLayout
          title="Clothing Store POS"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Clothing', href: '/clothing' },
            { label: 'Point of Sale', isActive: true }
          ]}
        >
          <div className="space-y-6">
            {/* Header with Toggle */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-primary">
                  {useAdvancedPOS ? 'Advanced' : 'Basic'} Point of Sale System
                </h1>
                <p className="text-secondary mt-1">
                  {useAdvancedPOS
                    ? 'Advanced POS with returns, supervisor overrides, and enhanced features'
                    : 'Universal POS system that adapts to clothing business needs'
                  }
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      await openDisplay()
                    } catch (error) {
                      customAlert({
                        title: 'Failed to Open Display',
                        description: 'Failed to open customer display. Please allow popups for this site and ensure you have a secondary monitor connected.'
                      })
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  title="Open Customer Display"
                >
                  🖥️ Display
                </button>
                <button
                  onClick={() => setUseAdvancedPOS(!useAdvancedPOS)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {useAdvancedPOS ? 'Switch to Basic' : 'Switch to Advanced'}
                </button>
                {!useAdvancedPOS && (
                  <button
                    onClick={() => setShowProductGrid(!showProductGrid)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    {showProductGrid ? 'Hide Products' : 'Show Products'}
                  </button>
                )}
              </div>
            </div>

            {/* Live / Manual Entry Mode Toggle */}
            {hasPermission('canEnterManualOrders') && (
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

            {/* Manual Entry Mode */}
            {posMode === 'manual' && currentBusinessId && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-2">
                  <ManualEntryTab
                    businessId={currentBusinessId}
                    businessType="clothing"
                    menuItems={manualProducts}
                    categories={manualCategories}
                    onAddItem={addToManualCart}
                    manualCartItems={manualCart}
                  />
                </div>
                <ManualOrderSummary
                  businessId={currentBusinessId}
                  businessType="clothing"
                  items={manualCart}
                  onUpdateQuantity={updateManualCartQuantity}
                  onRemoveItem={removeFromManualCart}
                  onClearAll={clearManualCart}
                />
              </div>
            )}

            {/* POS System */}
            {posMode === 'live' && (useAdvancedPOS ? (
              <ClothingAdvancedPOS
                businessId={businessId}
                employeeId={employeeId!}
                terminalId={terminalId}
                onOrderComplete={handleOrderComplete}
              />
            ) : (
              <div className={`grid gap-6 ${showProductGrid ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
                {/* Basic POS System */}
                <div className={showProductGrid ? '' : 'max-w-3xl mx-auto w-full'}>
                  <UniversalPOS
                    businessId={businessId}
                    employeeId={employeeId!}
                    terminalId={terminalId}
                    onOrderComplete={handleOrderComplete}
                  />
                </div>

                {/* Product Grid (when visible) */}
                {showProductGrid && (
                  <div>
                    <div className="card p-4">
                      <h2 className="text-lg font-semibold text-primary mb-4">
                        Browse Products
                      </h2>

                      <UniversalProductGrid
                        businessId={businessId}
                        onAddToCart={handleAddToCart}
                        layout="grid"
                        itemsPerPage={8}
                        showCategories={true}
                        showSearch={true}
                        showFilters={true}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Reports Link */}
            <div className="mb-4">
              <Link
                href="/clothing/reports/dashboard"
                className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg font-medium"
              >
                📊 View Sales Reports & Analytics
              </Link>
            </div>

            {/* Daily Sales Widget */}
            <DailySalesWidget
              dailySales={dailySales}
              businessType="clothing"
              onRefresh={loadDailySales}
              businessId={currentBusinessId || undefined}
              canCloseBooks={hasPermission('canCloseBooks')}
              managerName={sessionUser?.name || sessionUser?.email || 'Manager'}
            />

            {/* Features Showcase */}
            <div className={`border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${
              useAdvancedPOS
                ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 dark:border-purple-800'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 dark:border-blue-800'
            }`}>
              <h2 className={`text-lg font-semibold mb-4 ${
                useAdvancedPOS ? 'text-purple-900 dark:text-purple-100 dark:text-purple-100' : 'text-blue-900 dark:text-blue-100 dark:text-blue-100'
              }`}>
                {useAdvancedPOS
                  ? '🚀 Advanced POS Features'
                  : '🎯 Universal Business System Features'
                }
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {useAdvancedPOS ? (
                  <>
                    <div className="card p-4 border border-purple-200 dark:border-purple-800">
                      <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">🔄 Returns & Exchanges</h3>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Full return processing with reason codes, refund calculations, and return receipt generation.
                      </p>
                    </div>

                    <div className="card p-4 border border-purple-200 dark:border-purple-800">
                      <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">👨‍💼 Supervisor Override</h3>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Secure supervisor authentication for discounts over 20%, large transactions, and returns.
                      </p>
                    </div>

                    <div className="card p-4 border border-purple-200 dark:border-purple-800">
                      <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">💳 Split Payments</h3>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Accept multiple payment methods in a single transaction (cash, card, store credit, gift cards).
                      </p>
                    </div>

                    <div className="card p-4 border border-purple-200 dark:border-purple-800">
                      <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">🎯 Smart Discounts</h3>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Apply percentage or fixed discounts with automatic supervisor approval for large discounts.
                      </p>
                    </div>

                    <div className="card p-4 border border-purple-200 dark:border-purple-800">
                      <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">🖨️ Receipt Management</h3>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Print or email receipts with detailed transaction information and return policy.
                      </p>
                    </div>

                    <div className="card p-4 border border-purple-200 dark:border-purple-800">
                      <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">👔 Clothing-Specific</h3>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Size/color variants, condition tracking, and clothing-specific return reasons built-in.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="card p-4 border border-blue-200 dark:border-blue-800">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🏷️ Business-Type Aware</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Components automatically adapt to clothing business with sizes, colors, seasons, and return policies.
                      </p>
                    </div>

                    <div className="card p-4 border border-blue-200 dark:border-blue-800">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📦 Flexible Products</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Support for variants (sizes/colors), conditions (new/used), and clothing-specific attributes.
                      </p>
                    </div>

                    <div className="card p-4 border border-blue-200 dark:border-blue-800">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🔄 Real-time Inventory</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Automatic stock tracking, low stock alerts, and inventory movement logging.
                      </p>
                    </div>

                    <div className="card p-4 border border-blue-200 dark:border-blue-800">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">💳 Smart POS</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Adapts terminology and features for retail (vs restaurant/consulting modes).
                      </p>
                    </div>

                    <div className="card p-4 border border-blue-200 dark:border-blue-800">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🎨 Category Navigation</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Business-specific categories with appropriate icons and organization.
                      </p>
                    </div>

                    <div className="card p-4 border border-blue-200 dark:border-blue-800">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">⚙️ Configurable</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Clothing-specific settings like sizing standards, return periods, and seasonal catalogs.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}