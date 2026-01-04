'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

export default function RestaurantReportsPage() {
  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Determine POS link based on business type
  const businessType = currentBusiness?.businessType || 'grocery'
  const posLink = `/${businessType}/pos`

  const reportOptions = [
    {
      title: "📊 Visual Analytics Dashboard",
      description: 'Interactive charts and graphs showing sales trends',
      href: `/${businessType}/reports/dashboard`,
      icon: '📊',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      title: "📈 Sales Analytics Report",
      description: 'Comprehensive sales analysis with top performers and trends',
      href: `/${businessType}/reports/sales-analytics`,
      icon: '📈',
      color: 'bg-indigo-600 hover:bg-indigo-700'
    },
    {
      title: "Today's End-of-Day Report",
      description: 'View current day sales, orders, and receipt summary',
      href: `/${businessType}/reports/end-of-day`,
      icon: '📋',
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      title: 'Report History',
      description: 'View past end-of-day reports and historical data',
      href: `/${businessType}/reports/history`,
      icon: '📅',
      color: 'bg-blue-600 hover:bg-blue-700'
    }
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
        {/* Navigation */}
        <div className="mb-6">
          <Link
            href={posLink}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors inline-block"
          >
            ← Back to POS
          </Link>
        </div>

        {/* Header */}
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {businessType.charAt(0).toUpperCase() + businessType.slice(1)} Reports
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              View sales reports, end-of-day summaries, and historical data
            </p>
          </div>

          {/* Report Options */}
          <div className="grid gap-6 md:grid-cols-2">
            {reportOptions.map((option) => (
              <Link
                key={option.href}
                href={option.href}
                className="block group"
              >
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
                  <p className="text-white text-opacity-90 text-sm">
                    {option.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Additional Info */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-blue-600 dark:text-blue-400 mr-3 text-xl">ℹ️</span>
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-1">
                  About Reports
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Reports are generated based on receipt sequences and order data for the selected business.
                  End-of-day reports provide a comprehensive view of daily sales, orders, and payment methods.
                </p>
              </div>
            </div>
          </div>

          {isMounted && !currentBusinessId && (
            <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start">
                <span className="text-yellow-600 dark:text-yellow-400 mr-3 text-xl">⚠️</span>
                <div>
                  <h3 className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                    No Business Selected
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Please select a grocery business from the business selector to view reports.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  )
}
