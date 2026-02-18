'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ProtectedRoute } from '@/components/auth/protected-route'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { InventoryDashboardWidget } from '@/components/universal/inventory/inventory-dashboard-widget'
import { useState, useEffect } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { HomeStatBadge, type OrderSummary } from '@/components/universal/home/HomeStatBadge'

export default function RestaurantPage() {
  const { currentBusinessId, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const canViewOrders = isSystemAdmin || hasPermission('canEnterManualOrders') || hasPermission('canAccessFinancialData')
  const canViewFinancials = isSystemAdmin || hasPermission('canAccessFinancialData')

  const [homeStats, setHomeStats] = useState<OrderSummary | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  useEffect(() => {
    if (!currentBusinessId || !canViewOrders) return
    let cancelled = false
    setLoadingStats(true)
    fetch(`/api/universal/orders?businessId=${currentBusinessId}&dateRange=today&page=1&limit=1`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data?.meta?.summary) setHomeStats(data.meta.summary)
        if (!cancelled) setLoadingStats(false)
      })
      .catch(() => { if (!cancelled) setLoadingStats(false) })
    return () => { cancelled = true }
  }, [currentBusinessId, canViewOrders])

  return (
    <ProtectedRoute>
      <BusinessTypeRoute requiredBusinessType="restaurant">
      <ContentLayout
        title="🍽️ Restaurant Management"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Restaurant', isActive: true }
        ]}
      >
        {/* Inventory Overview Widget */}
        <div className="mb-8">
          <InventoryDashboardWidget
            businessId="restaurant-demo"
            businessType="restaurant"
            showDetails={true}
            maxAlerts={3}
          />
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/restaurant/pos" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🍽️</div>
              <h3 className="text-lg font-semibold mb-1 text-primary">Point of Sale</h3>
              {canViewOrders && (
                <HomeStatBadge summary={homeStats} loading={loadingStats} variant="pos" canViewFinancials={canViewFinancials} />
              )}
              <p className="text-secondary">Process orders and payments</p>
            </div>
          </Link>
          
          <Link href="/restaurant/menu" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Menu Management</h3>
              <p className="text-secondary">Manage menu items and pricing</p>
            </div>
          </Link>
          
          <Link href="/restaurant/orders" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-lg font-semibold mb-1 text-primary">Orders</h3>
              {canViewOrders && (
                <HomeStatBadge summary={homeStats} loading={loadingStats} variant="orders" canViewFinancials={canViewFinancials} />
              )}
              <p className="text-secondary">View and manage orders</p>
            </div>
          </Link>
          
          <Link href="/restaurant/inventory" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🥬</div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Inventory Management</h3>
              <p className="text-secondary">Ingredients, recipes, prep tracking, and food costs</p>
            </div>
          </Link>
          
          <Link href="/restaurant/employees" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Employees</h3>
              <p className="text-secondary">Staff management</p>
            </div>
          </Link>
          
          <Link href="/restaurant/reports" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Reports</h3>
              <p className="text-secondary">Sales and financial reports</p>
            </div>
          </Link>
        </div>
      </ContentLayout>
      </BusinessTypeRoute>
    </ProtectedRoute>
  )
}