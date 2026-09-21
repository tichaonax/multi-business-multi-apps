'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

// MBM-296: fixes a real 404 — the global header's breadcrumb auto-derives a
// link for every URL segment (so /inventory/reports/pricing-exceptions gets
// a clickable "Reports" crumb pointing at /inventory/reports), but no page
// existed at that exact path. Doubles as the actual hub for these reports,
// matching the same reportOptions/card-grid pattern used by every business
// type's own /{businessType}/reports/page.tsx.
export default function InventoryReportsIndexPage() {
  const { currentBusiness } = useBusinessPermissionsContext()
  const businessType = currentBusiness?.businessType || 'grocery'

  const reportOptions = [
    {
      title: '🚫 Out of Stock',
      description: 'Tracked items with zero stock on hand — click through to restock and come straight back',
      href: '/inventory/reports/out-of-stock',
      color: 'bg-red-700 hover:bg-red-800',
    },
    {
      title: '📉 Low Stock',
      description: 'Tracked items at or below the low-stock threshold — click through to restock and come straight back',
      href: '/inventory/reports/low-stock',
      color: 'bg-orange-700 hover:bg-orange-800',
    },
    {
      title: '⚠️ Pricing & Value Exceptions',
      description: 'Missing/zero prices, below-cost sales, suspicious values, and price-change anomalies — with a review/approval workflow',
      href: '/inventory/reports/pricing-exceptions',
      color: 'bg-red-600 hover:bg-red-700',
    },
    {
      title: '💰 Inventory Value',
      description: 'Item- and total-level valuation, split into recently-stocked, existing, and combined inventory',
      href: '/inventory/reports/inventory-value',
      color: 'bg-cyan-600 hover:bg-cyan-700',
    },
    {
      title: '📈 Product Performance',
      description: 'Sales, revenue, cost of goods sold, and margin per product — find your fast-moving, profitable items',
      href: '/inventory/reports/performance',
      color: 'bg-violet-600 hover:bg-violet-700',
    },
    {
      title: '📉 Poor-Performing Stock',
      description: 'Slow-moving, non-moving, excess, and loss-making stock with recommended actions',
      href: '/inventory/reports/poor-performers',
      color: 'bg-orange-600 hover:bg-orange-700',
    },
    {
      title: '📦 Minimum-Stock Recommendation',
      description: 'Reorder suggestions plus a "Show all products" view comparing every product\'s stock to a recommended minimum',
      href: '/admin/reports/reorder',
      color: 'bg-amber-600 hover:bg-amber-700',
    },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="mb-6">
        <Link href={`/${businessType}/reports`} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors inline-block">
          ← Back to {businessType.charAt(0).toUpperCase() + businessType.slice(1)} Reports
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Inventory Reports</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Pricing, cost, valuation, and performance intelligence for the currently selected business.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {reportOptions.map(option => (
            <Link key={option.href} href={option.href} className="block group">
              <div className={`${option.color} text-white p-6 rounded-lg shadow-lg transition-all duration-200 transform group-hover:scale-105 group-hover:shadow-xl`}>
                <h2 className="text-xl font-bold mb-2">{option.title}</h2>
                <p className="text-white text-opacity-90 text-sm">{option.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
