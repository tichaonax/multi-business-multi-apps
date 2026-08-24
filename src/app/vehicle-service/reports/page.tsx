'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

// Deliberately NOT a re-export of restaurant's hub (src/app/restaurant/reports/page.tsx)
// — that page lists 10 reports unconditionally, several of which are
// restaurant/food-specific (Meal Program, Prep Inventory, Delivery Reports)
// or hardcoded to businessType 'restaurant' entirely (Cash Allocation) and
// would be broken or meaningless here. This is a curated list of just the
// reports actually confirmed to be business-type-agnostic under the hood.
export default function VehicleServiceReportsPage() {
  const { currentBusinessId } = useBusinessPermissionsContext()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const reportOptions = [
    {
      title: '📊 Visual Analytics Dashboard',
      description: 'Interactive charts and graphs showing sales trends',
      href: '/vehicle-service/reports/dashboard',
      icon: '📊',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      title: '📈 Sales Analytics Report',
      description: 'Comprehensive sales analysis with top performers and trends',
      href: '/vehicle-service/reports/sales-analytics',
      icon: '📈',
      color: 'bg-indigo-600 hover:bg-indigo-700'
    },
    {
      title: "Today's End-of-Day Report",
      description: 'View current day sales, cash count, and close out the day',
      href: '/vehicle-service/reports/end-of-day',
      icon: '📋',
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      title: 'Report History',
      description: 'View past end-of-day reports and historical data',
      href: '/vehicle-service/reports/history',
      icon: '📅',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      title: '⏳ Billed but Unpaid Jobs',
      description: "Invoiced jobs awaiting payment — not counted as cash until collected",
      href: '/vehicle-service/reports/unpaid',
      icon: '⏳',
      color: 'bg-amber-600 hover:bg-amber-700'
    }
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="mb-6">
        <Link
          href="/universal/pos"
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors inline-block"
        >
          ← Back to POS
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Vehicle Service Reports</h1>
          <p className="text-gray-600 dark:text-gray-400">
            View sales reports and historical data
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {reportOptions.map((option) => (
            <Link key={option.href} href={option.href} className="block group">
              <div className={`${option.color} text-white p-6 rounded-lg shadow-lg transition-all duration-200 transform group-hover:scale-105 group-hover:shadow-xl`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{option.icon}</div>
                  <div className="text-white text-opacity-80">
                    <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-xl font-bold mb-2">{option.title}</h2>
                <p className="text-white text-opacity-90 text-sm">{option.description}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-blue-600 dark:text-blue-400 mr-3 text-xl">ℹ️</span>
            <div>
              <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-1">About Reports</h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Reports are generated based on order data for the selected business.
              </p>
            </div>
          </div>
        </div>

        {isMounted && !currentBusinessId && (
          <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-yellow-600 dark:text-yellow-400 mr-3 text-xl">⚠️</span>
              <div>
                <h3 className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">No Business Selected</h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Please select a vehicle service business from the business selector to view reports.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
