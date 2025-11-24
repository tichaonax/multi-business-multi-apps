'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import {
  BusinessProvider,
  UniversalProductGrid,
  UniversalPOS
} from '@/components/universal'
import { ClothingAdvancedPOS } from './components/advanced-pos'
import { DailySalesWidget } from '@/components/pos/daily-sales-widget'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { SessionUser } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'

// This would typically come from session/auth
// const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'clothing-demo-business'
// const EMPLOYEE_ID = process.env.NEXT_PUBLIC_DEMO_EMPLOYEE_ID || 'demo-employee'

export default function ClothingPOSPage() {
  const [showProductGrid, setShowProductGrid] = useState(true)
  const [useAdvancedPOS, setUseAdvancedPOS] = useState(true)
  const [dailySales, setDailySales] = useState<any>(null)
  const { data: session, status} = useSession()
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

  // Check if current business is a clothing business
  const isClothingBusiness = currentBusiness?.businessType === 'clothing'

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Wrong Business Type</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The Clothing POS is only available for clothing businesses. Your current business "{currentBusiness.businessName}" is a {currentBusiness.businessType} business.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Please select a clothing business from the sidebar to use this POS system.
          </p>
        </div>
      </div>
    )
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

    // Navigate with query parameters to trigger auto-add
    router.push(`/clothing/pos?${params.toString()}`)
  }

  const handleOrderComplete = (orderId: string) => {
    // Could redirect to receipt or show success message
    // Reload daily sales after order completion
    setTimeout(() => loadDailySales(), 500)
  }

  // Load daily sales
  const loadDailySales = async () => {
    if (!currentBusinessId) return

    try {
      const response = await fetch(`/api/universal/daily-sales?businessId=${currentBusinessId}&businessType=clothing`)
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
    if (currentBusinessId && isClothingBusiness) {
      loadDailySales()
    }
  }, [currentBusinessId, isClothingBusiness])

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

            {/* POS System */}
            {useAdvancedPOS ? (
              <ClothingAdvancedPOS
                businessId={businessId}
                employeeId={employeeId!}
                onOrderComplete={handleOrderComplete}
              />
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Basic POS System */}
                <div>
                  <UniversalPOS
                    businessId={businessId}
                    employeeId={employeeId!}
                    onOrderComplete={handleOrderComplete}
                  />
                </div>

                {/* Product Grid (when visible) */}
                {showProductGrid && (
                  <div className="xl:col-span-1">
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
            )}

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