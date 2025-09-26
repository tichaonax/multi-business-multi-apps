'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import {
  BusinessProvider,
  UniversalProductGrid,
  UniversalPOS
} from '@/components/universal'
import { useState } from 'react'

const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'hardware-demo-business'
const EMPLOYEE_ID = process.env.NEXT_PUBLIC_DEMO_EMPLOYEE_ID || 'demo-employee'

export default function HardwarePOSPage() {
  const [showProductGrid, setShowProductGrid] = useState(true)

  const handleAddToCart = (productId: string, variantId?: string, quantity = 1) => {
    console.log('Add to cart:', { productId, variantId, quantity })
  }

  const handleOrderComplete = (orderId: string) => {
    console.log('Order completed:', orderId)
  }

  return (
    <BusinessProvider businessId={BUSINESS_ID}>
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
                  businessId={BUSINESS_ID}
                  employeeId={EMPLOYEE_ID}
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
                      businessId={BUSINESS_ID}
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
