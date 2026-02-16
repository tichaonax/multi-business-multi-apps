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
import { DailySalesWidget } from '@/components/pos/daily-sales-widget'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { SessionUser } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'
import { useOpenCustomerDisplay, useCustomerDisplaySync } from '@/hooks/useCustomerDisplaySync'
import { SyncMode } from '@/lib/customer-display/sync-manager'
import { useAlert } from '@/components/ui/confirm-modal'

export default function HardwarePOSPage() {
  const [showProductGrid, setShowProductGrid] = useState(true)
  const [dailySales, setDailySales] = useState<any>(null)
  const { data: session, status } = useSession()
  const router = useRouter()
  const customAlert = useAlert()

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

  // Check if current business is a hardware business
  const isHardwareBusiness = currentBusiness?.businessType === 'hardware'

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
      const response = await fetch(`/api/universal/daily-sales?businessId=${currentBusinessId}&businessType=hardware&timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`)
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
    if (currentBusinessId && isHardwareBusiness) {
      loadDailySales()
    }
  }, [currentBusinessId, isHardwareBusiness])

  // Periodic refresh of daily sales every 30s for multi-user accuracy
  useEffect(() => {
    if (!currentBusinessId || !isHardwareBusiness) return
    const interval = setInterval(() => loadDailySales(), 30000)
    return () => clearInterval(interval)
  }, [currentBusinessId, isHardwareBusiness])

  // Auto-open customer display and send greeting/context on mount
  useEffect(() => {
    if (!currentBusinessId || !currentBusiness) {
      console.log('[Hardware POS] Waiting for business context...', { currentBusinessId, hasBusiness: !!currentBusiness })
      return
    }

    let isActive = true

    async function initializeDisplay() {
      try {
        console.log('[Hardware POS] Starting customer display initialization...')

        // Try to open display (may fail if already open or popup blocked - that's OK)
        try {
          await openDisplay()
          console.log('[Hardware POS] Customer display window opened')
        } catch (displayError) {
          }

        // Fetch full business details from API to get all fields
        console.log('[Hardware POS] Fetching business details for:', currentBusinessId)
        const response = await fetch(`/api/business/${currentBusinessId}`)
        if (!response.ok) {
          console.error('[Hardware POS] Failed to fetch business details, status:', response.status)
          return
        }
        const data = await response.json()
        const businessData = data.business // API returns { business: {...} }
        console.log('[Hardware POS] Business data fetched:', {
          name: businessData?.name,
          phone: businessData?.phone,
          receiptReturnPolicy: businessData?.receiptReturnPolicy
        })

        // Wait longer for BroadcastChannel to initialize on BOTH windows
        console.log('[Hardware POS] Waiting for BroadcastChannel to be ready...')
        await new Promise(resolve => setTimeout(resolve, 2000))

        if (!isActive) return

        console.log('[Hardware POS] Sending greeting message...')
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
        console.log('[Hardware POS] Greeting sent:', greetingData)

        // Set page context to POS
        sendToDisplay('SET_PAGE_CONTEXT', {
          pageContext: 'pos',
          subtotal: 0,
          tax: 0,
          total: 0
        })
        console.log('[Hardware POS] Page context set to POS')
      } catch (error) {
        console.error('[Hardware POS] Failed to initialize customer display:', error)
      }
    }

    initializeDisplay()

    // Cleanup: Set context back to marketing when leaving POS
    return () => {
      isActive = false
      console.log('[Hardware POS] Cleanup: Setting context back to marketing')
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

  // Check if user has any hardware businesses
  const hardwareBusinesses = businesses.filter(b => b.businessType === 'hardware' && b.isActive)
  const hasHardwareBusinesses = hardwareBusinesses.length > 0

  // If no current business selected and user has hardware businesses, show selection prompt
  if (!currentBusiness && hasHardwareBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Hardware Business</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You have access to {hardwareBusinesses.length} hardware business{hardwareBusinesses.length > 1 ? 'es' : ''}.
            Please select one from the sidebar to use the POS system.
          </p>
          <div className="space-y-2">
            {hardwareBusinesses.slice(0, 3).map(business => (
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

  // If current business is not hardware, show error
  if (currentBusiness && !isHardwareBusiness) {
    return <BusinessTypeRedirect />
  }

  // If no hardware businesses at all, show message
  if (!hasHardwareBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Hardware Businesses</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don't have access to any hardware businesses. The Hardware POS system requires access to at least one hardware business.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Contact your administrator if you need access to hardware businesses.
          </p>
        </div>
      </div>
    )
  }

  // At this point, we have a valid hardware business selected
  const businessId = currentBusinessId!

  const handleAddToCart = (productId: string, variantId?: string, quantity = 1) => {
    // Use URL parameters to trigger UniversalPOS auto-add feature
    const params = new URLSearchParams()
    params.set('addProduct', productId)
    if (variantId) params.set('variantId', variantId)
    params.set('businessId', businessId)
    params.set('autoAdd', 'true')  // Enable auto-add to cart

    // Navigate with query parameters to trigger auto-add
    router.push(`/hardware/pos?${params.toString()}`)
  }

  const handleOrderComplete = (orderId: string) => {
    console.log('Order completed:', orderId)
    // Reload daily sales after order completion
    setTimeout(() => loadDailySales(), 500)
  }

  return (
    <BusinessProvider businessId={businessId}>
      <BusinessTypeRoute requiredBusinessType="hardware">
        <ContentLayout
          title="Hardware Store POS"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Hardware', href: '/hardware' },
            { label: 'Point of Sale', isActive: true }
          ]}
        >
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-primary">Hardware Store Point of Sale</h1>
                <p className="text-secondary mt-1">
                  Universal POS system with barcode scanner, bulk ordering, and contractor pricing
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
                  onClick={() => setShowProductGrid(!showProductGrid)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {showProductGrid ? 'Hide Products' : 'Show Products'}
                </button>
              </div>
            </div>

            {/* POS System */}
            <div className={`grid gap-6 ${showProductGrid ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
              {/* Universal POS */}
              <div className={showProductGrid ? '' : 'max-w-3xl mx-auto w-full'}>
                <UniversalPOS
                  businessId={businessId}
                  employeeId={employeeId!}
                  terminalId={terminalId}
                  onOrderComplete={handleOrderComplete}
                />
              </div>

              {/* Product Grid */}
              {showProductGrid && (
                <div>
                  <div className="card p-4">
                    <h2 className="text-lg font-semibold text-primary mb-4">
                      Browse Hardware Items
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

            {/* Reports Link */}
            <div className="mb-4">
              <Link
                href="/hardware/reports/dashboard"
                className="inline-block px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg hover:from-orange-700 hover:to-amber-700 transition-all shadow-md hover:shadow-lg font-medium"
              >
                📊 View Sales Reports & Analytics
              </Link>
            </div>

            {/* Daily Sales Widget */}
            <DailySalesWidget
              dailySales={dailySales}
              businessType="hardware"
              onRefresh={loadDailySales}
            />

            {/* Hardware-Specific Features */}
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-orange-900 dark:text-orange-100 dark:text-orange-100 mb-4">
                🔧 Hardware POS Features
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="card p-4 border border-orange-200 dark:border-orange-800">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">📱 Barcode Scanner</h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Scan product barcodes, SKUs, and bulk item codes for fast checkout with hardware-specific items.
                  </p>
                </div>

                <div className="card p-4 border border-orange-200 dark:border-orange-800">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">✂️ Cut-to-Size Orders</h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Process custom cutting orders with measurements, waste calculations, and material optimization.
                  </p>
                </div>

                <div className="card p-4 border border-orange-200 dark:border-orange-800">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">🏗️ Contractor Pricing</h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Automatic bulk discounts, contractor accounts, and project-based pricing for professionals.
                  </p>
                </div>

                <div className="card p-4 border border-orange-200 dark:border-orange-800">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">📦 Bulk Orders</h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Handle large quantity orders with volume discounts and special handling requirements.
                  </p>
                </div>

                <div className="card p-4 border border-orange-200 dark:border-orange-800">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">🔧 Tool Rentals</h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Process tool and equipment rentals with damage deposits and return tracking.
                  </p>
                </div>

                <div className="card p-4 border border-orange-200 dark:border-orange-800">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">📏 By-the-Foot Pricing</h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Handle materials sold by length, weight, or custom measurements with accurate pricing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}
