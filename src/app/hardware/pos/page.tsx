'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import {
  BusinessProvider,
  UniversalProductGrid,
  UniversalPOS
} from '@/components/universal'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { SessionUser } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

export default function HardwarePOSPage() {
  const [showProductGrid, setShowProductGrid] = useState(true)
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

  // Check if current business is a hardware business
  const isHardwareBusiness = currentBusiness?.businessType === 'hardware'

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

  // Check if user has any hardware businesses
  const hardwareBusinesses = businesses.filter(b => b.businessType === 'hardware' && b.isActive)
  const hasHardwareBusinesses = hardwareBusinesses.length > 0

  // If no current business selected and user has hardware businesses, show selection prompt
  if (!currentBusiness && hasHardwareBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Hardware Business</h2>
          <p className="text-gray-600 mb-4">
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Wrong Business Type</h2>
          <p className="text-gray-600 mb-4">
            The Hardware POS is only available for hardware businesses. Your current business "{currentBusiness.businessName}" is a {currentBusiness.businessType} business.
          </p>
          <p className="text-sm text-gray-500">
            Please select a hardware business from the sidebar to use this POS system.
          </p>
        </div>
      </div>
    )
  }

  // If no hardware businesses at all, show message
  if (!hasHardwareBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Hardware Businesses</h2>
          <p className="text-gray-600 mb-4">
            You don't have access to any hardware businesses. The Hardware POS system requires access to at least one hardware business.
          </p>
          <p className="text-sm text-gray-500">
            Contact your administrator if you need access to hardware businesses.
          </p>
        </div>
      </div>
    )
  }

  // At this point, we have a valid hardware business selected
  const businessId = currentBusinessId!

  const handleAddToCart = (productId: string, variantId?: string, quantity = 1) => {
    console.log('Add to cart:', { productId, variantId, quantity })
  }

  const handleOrderComplete = (orderId: string) => {
    console.log('Order completed:', orderId)
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

              <button
                onClick={() => setShowProductGrid(!showProductGrid)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {showProductGrid ? 'Hide Products' : 'Show Products'}
              </button>
            </div>

            {/* POS System */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Universal POS */}
              <div>
                <UniversalPOS
                  businessId={businessId}
                  employeeId={employeeId!}
                  onOrderComplete={handleOrderComplete}
                />
              </div>

              {/* Product Grid */}
              {showProductGrid && (
                <div className="xl:col-span-1">
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
