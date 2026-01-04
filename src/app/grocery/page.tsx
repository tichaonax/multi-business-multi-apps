'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import Link from 'next/link'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'
import { InventoryDashboardWidget } from '@/components/universal/inventory/inventory-dashboard-widget'
import { useEffect } from 'react'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils'

const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'grocery-demo-business'

export default function GroceryStorePage() {
  const { data: session } = useSession()
  const currentUser = session?.user as any
  const canManageLaybys = isSystemAdmin(currentUser) || hasPermission(currentUser, 'canManageLaybys')

  const quickActions = [
    {
      title: 'Inventory Management',
      description: 'Track expiration dates, manage fresh produce, monitor cold chain',
      href: '/grocery/inventory',
      icon: '🛒',
      color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
      features: ['Expiration tracking', 'PLU codes', 'Batch management', 'Temperature logs']
    },
    {
      title: 'Fresh Produce',
      description: 'Weight-based pricing, quality control, seasonal management',
      href: '/grocery/produce',
      icon: '🥬',
      color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
      features: ['Quality grading', 'Seasonal pricing', 'Supplier tracking', 'Waste monitoring']
    },
    {
      title: 'Point of Sale',
      description: 'Barcode scanning, weight integration, loyalty programs',
      href: '/grocery/pos',
      icon: '🧾',
      color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
      features: ['Barcode scanning', 'Scale integration', 'Loyalty rewards', 'EBT/SNAP']
    },
    {
      title: 'Orders',
      description: 'View sales, reprint receipts, manage order status',
      href: '/grocery/orders',
      icon: '📋',
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
      features: ['View daily sales', 'Reprint receipts', 'Order tracking', 'Payment status']
    },
    {
      title: 'Reports',
      description: 'Sales analytics, trends, and financial reports',
      href: '/grocery/reports',
      icon: '📊',
      color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
      features: ['Visual analytics', 'End-of-day reports', 'Sales trends', 'Performance metrics']
    },
    {
      title: 'Customer Analytics',
      description: 'Shopping patterns, loyalty programs, promotional targeting',
      href: '/grocery/customers',
      icon: '👥',
      color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
      features: ['Purchase history', 'Loyalty tiers', 'Promotional targeting', 'Basket analysis']
    },
    ...(canManageLaybys ? [{
      title: 'Layby Management',
      description: 'Customer layby agreements and payment tracking',
      href: '/business/laybys',
      icon: '🛍️',
      color: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100',
      features: ['Reserve items', 'Payment tracking', 'Balance management', 'Item release']
    }] : []),
    {
      title: 'Supplier Management',
      description: 'Manage vendors, payment terms, and supplier relationships',
      href: '/business/suppliers',
      icon: '🚚',
      color: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
      features: ['Supplier contacts', 'Payment terms', 'Account balances', 'Credit limits']
    },
    {
      title: 'Location Management',
      description: 'Storage locations, warehouses, and inventory organization',
      href: '/business/locations',
      icon: '📍',
      color: 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100',
      features: ['Location codes', 'Hierarchy setup', 'Capacity tracking', 'Product assignment']
    },
    {
      title: 'Department Management',
      description: 'Deli, bakery, pharmacy, and specialty departments',
      href: '/grocery/departments',
      icon: '🏪',
      color: 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100',
      features: ['Department P&L', 'Staff scheduling', 'Equipment tracking', 'Compliance']
    },
    {
      title: 'Employee Management',
      description: 'Manage grocery store staff, schedules, and performance',
      href: '/grocery/employees',
      icon: '👥',
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
      features: ['Staff scheduling', 'Performance tracking', 'Payroll management', 'Training records']
    }
  ]

  const [metrics, setMetrics] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])

  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  useEffect(() => {
    async function loadData() {
      try {
        // Inventory value report for metrics
        const reportRes = await fetch(`/api/inventory/${BUSINESS_ID}/reports?reportType=inventory_value`)
        if (reportRes.ok) {
          const json = await reportRes.json()
          const data = json.report?.data || {}
          const computed = [
            { title: 'Total Inventory Value', value: data.totalInventoryValue ? `$${data.totalInventoryValue.toLocaleString()}` : '—', change: `${data.trends?.weekOverWeek || 0}%`, icon: '💰', description: 'inventory value' },
            { title: 'Total Items', value: data.totalItems ? `${data.totalItems}` : '—', change: '', icon: '📦', description: 'distinct items' },
            { title: 'Top Category', value: data.categories?.[0]?.category || '—', change: `${data.categories?.[0]?.percentage || 0}%`, icon: '🥕', description: 'top value category' }
          ]
          setMetrics(computed)
        }
        setLoadingMetrics(false)

        const alertsRes = await fetch(`/api/inventory/${BUSINESS_ID}/alerts?acknowledged=false&limit=5`)
        if (alertsRes.ok) {
          const json = await alertsRes.json()
          setAlerts(json.alerts || [])
        }
        setLoadingAlerts(false)
      } catch (err) {
        // keep static fallback if API fails
        console.error('Failed to load grocery metrics/alerts', err)
      }
        setLoadingMetrics(false)
        setLoadingAlerts(false)
    }

    loadData()
  }, [])

  return (
    <BusinessProvider businessId={BUSINESS_ID}>
      <BusinessTypeRoute requiredBusinessType="grocery">
        <ContentLayout
          title="🛒 Grocery Store Management"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Grocery Store', isActive: true }
          ]}
        >
          <div className="space-y-6">
            {/* Inventory Overview Widget */}
            <InventoryDashboardWidget
              businessId={BUSINESS_ID}
              businessType="grocery"
              showDetails={true}
              maxAlerts={3}
            />

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {loadingMetrics ? (
                <div className="col-span-1 md:col-span-2 lg:col-span-4 p-6 text-center">Loading metrics…</div>
              ) : metrics.length === 0 ? (
                <div className="col-span-1 md:col-span-2 lg:col-span-4 p-6 text-center">No metrics available</div>
              ) : (
                metrics.map((metric) => (
                  <div key={metric.title} className="card p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-secondary">{metric.title}</p>
                        <p className={`text-2xl font-bold ${metric.urgent ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {metric.value}
                        </p>
                        <p className="text-xs text-secondary mt-1">
                          <span className={metric.urgent ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}>
                            {metric.change}
                          </span>{' '}
                          {metric.description}
                        </p>
                      </div>
                      <div className="text-3xl opacity-20">{metric.icon}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Alerts Panel */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-primary mb-4">🚨 Store Alerts</h2>
              <div className="space-y-3">
                {loadingAlerts ? (
                  <div className="p-3 text-center">Loading alerts…</div>
                ) : alerts.length === 0 ? (
                  <div className="p-3 text-center">No alerts</div>
                ) : (
                  alerts.map((alert, index) => (
                    <div key={index} className={`p-3 rounded-lg border-l-4 ${
                      alert.type === 'urgent' ? 'bg-red-50 dark:bg-red-900/20 border-red-400' :
                      alert.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400' :
                      'bg-blue-50 dark:bg-blue-900/20 border-blue-400'
                    }`}>
                      <div className="flex items-start">
                        <div className="text-xl mr-3">{alert.icon}</div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h4 className={`font-medium ${
                              alert.type === 'urgent' ? 'text-red-800 dark:text-red-200' :
                              alert.type === 'warning' ? 'text-yellow-800 dark:text-yellow-200' :
                              'text-blue-800 dark:text-blue-200'
                            }`}>
                              {alert.title}
                            </h4>
                            <span className="text-xs text-secondary">{alert.time}</span>
                          </div>
                          <p className={`text-sm mt-1 ${
                            alert.type === 'urgent' ? 'text-red-700 dark:text-red-300' :
                            alert.type === 'warning' ? 'text-yellow-700 dark:text-yellow-300' :
                            'text-blue-700 dark:text-blue-300'
                          }`}>
                            {alert.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {quickActions.map((action) => (
                <Link key={action.title} href={action.href}>
                  <div className={`p-6 rounded-lg border transition-all duration-200 cursor-pointer ${action.color}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-4xl">{action.icon}</div>
                    </div>

                    <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                    <p className="text-sm mb-4 opacity-90">{action.description}</p>

                    <div className="space-y-1">
                      {action.features.map((feature, index) => (
                        <div key={index} className="flex items-center text-xs opacity-80">
                          <div className="w-1.5 h-1.5 bg-current rounded-full mr-2"></div>
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Grocery-specific Features Overview */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4">
                🛒 Grocery Store Advanced Features
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-4 border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">📅 Expiration Management</h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    FIFO rotation, automatic markdowns, waste tracking, and donation management.
                  </p>
                </div>

                <div className="card p-4 border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">⚖️ Weight-Based Pricing</h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Integrated scales, PLU codes, tare weights, and price-per-pound calculations.
                  </p>
                </div>

                <div className="card p-4 border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">🌡️ Cold Chain Monitoring</h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Temperature logging, alert systems, compliance reporting, and quality tracking.
                  </p>
                </div>

                <div className="card p-4 border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">🎯 Loyalty Programs</h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Points systems, targeted promotions, purchase history, and customer segmentation.
                  </p>
                </div>
              </div>
            </div>

            {/* Department Status */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-primary mb-4">🏪 Department Status</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[
                  { name: 'Produce', icon: '🥬', status: 'Good', color: 'text-green-600' },
                  { name: 'Dairy', icon: '🥛', status: 'Alert', color: 'text-red-600' },
                  { name: 'Meat', icon: '🥩', status: 'Good', color: 'text-green-600' },
                  { name: 'Deli', icon: '🧀', status: 'Good', color: 'text-green-600' },
                  { name: 'Bakery', icon: '🍞', status: 'Warning', color: 'text-yellow-600' },
                  { name: 'Pharmacy', icon: '💊', status: 'Good', color: 'text-green-600' }
                ].map((dept) => (
                  <div key={dept.name} className="text-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg card">
                    <div className="text-2xl mb-1">{dept.icon}</div>
                    <div className="text-sm font-medium text-primary">{dept.name}</div>
                    <div className={`text-xs font-medium ${dept.color}`}>{dept.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}