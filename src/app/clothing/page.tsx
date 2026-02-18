'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { HomeStatBadge, type OrderSummary } from '@/components/universal/home/HomeStatBadge'

export default function ClothingPage() {
  const { data: session } = useSession()
  const currentUser = session?.user as any
  const canManageLaybys = isSystemAdmin(currentUser) || hasPermission(currentUser, 'canManageLaybys')

  const { currentBusinessId, hasPermission: hasBizPermission, isSystemAdmin: isSysAdmin } = useBusinessPermissionsContext()
  const canViewOrders = isSysAdmin || hasBizPermission('canEnterManualOrders') || hasBizPermission('canAccessFinancialData')
  const canViewFinancials = isSysAdmin || hasBizPermission('canAccessFinancialData')

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
    <BusinessTypeRoute requiredBusinessType="clothing">
      <ContentLayout
        title="👕 Clothing Outlet Management"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clothing', isActive: true }
        ]}
      >

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/clothing/pos" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👕</div>
              <h3 className="text-lg font-semibold mb-1 text-primary">Point of Sale</h3>
              {canViewOrders && (
                <HomeStatBadge summary={homeStats} loading={loadingStats} variant="pos" canViewFinancials={canViewFinancials} />
              )}
              <p className="text-secondary">Fashion POS with size/color variants</p>
            </div>
          </Link>
          
          <Link href="/clothing/orders" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-semibold mb-1 text-primary">Orders</h3>
              {canViewOrders && (
                <HomeStatBadge summary={homeStats} loading={loadingStats} variant="orders" canViewFinancials={canViewFinancials} />
              )}
              <p className="text-secondary">Manage customer orders and fulfillment</p>
            </div>
          </Link>
          
          <Link href="/clothing/inventory" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👗</div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Inventory</h3>
              <p className="text-secondary">Size/color matrix inventory</p>
            </div>
          </Link>
          
          <Link href="/clothing/customers" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👤</div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Customers</h3>
              <p className="text-secondary">Customer accounts and loyalty</p>
            </div>
          </Link>

          {canManageLaybys && (
            <Link href="/business/laybys" className="block">
              <div className="card p-6 hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">🛍️</div>
                <h3 className="text-lg font-semibold mb-2 text-primary">Layby Management</h3>
                <p className="text-secondary">Customer layby agreements and payments</p>
              </div>
            </Link>
          )}

          <Link href="/business/suppliers" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🚚</div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Suppliers</h3>
              <p className="text-secondary">Manage vendors and suppliers</p>
            </div>
          </Link>

          <Link href="/business/locations" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Locations</h3>
              <p className="text-secondary">Storage locations and warehouses</p>
            </div>
          </Link>

          <Link href="/clothing/discounts" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🏷️</div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Discounts</h3>
              <p className="text-secondary">Manage pricing and promotions</p>
            </div>
          </Link>
          
          <Link href="/clothing/employees" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Employees</h3>
              <p className="text-secondary">Staff and commission tracking</p>
            </div>
          </Link>
          
          <Link href="/clothing/reports" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Reports</h3>
              <p className="text-secondary">Sales analytics and trends</p>
            </div>
          </Link>
        </div>
      </ContentLayout>
    </BusinessTypeRoute>
  )
}