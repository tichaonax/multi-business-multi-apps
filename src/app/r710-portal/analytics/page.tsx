'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'

interface PackagePerformance {
  packageName: string
  totalSales: number
  totalRevenue: number
  activationRate: number
  averagePrice: number
}

interface DailyRevenue {
  date: string
  sales: number
  revenue: number
}

interface AnalyticsData {
  packagePerformance: PackagePerformance[]
  dailyRevenue: DailyRevenue[]
  topMetrics: {
    bestSellingPackage: string
    highestRevenuePackage: string
    bestActivationRate: string
    peakSalesDay: string
  }
  summary: {
    totalSales: number
    totalRevenue: number
    averageOrderValue: number
    overallActivationRate: number
  }
}

export default function R710AnalyticsPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout>
          <R710AnalyticsContent />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function R710AnalyticsContent() {
  const { data: session } = useSession()
  const { currentBusiness } = useBusinessPermissionsContext()

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month')

  useEffect(() => {
    loadAnalytics()
  }, [currentBusiness?.businessId, dateRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)

      if (!currentBusiness?.businessId) {
        setAnalytics(null)
        return
      }

      const params = new URLSearchParams()
      params.append('businessId', currentBusiness.businessId)
      params.append('dateRange', dateRange)

      const response = await fetch(`/api/r710/analytics?${params.toString()}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <Link href="/r710-portal" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Revenue Analytics
              </h1>
            </div>
            <p className="mt-1 ml-8 text-sm text-gray-500 dark:text-gray-400">
              Performance insights for {currentBusiness?.businessName || 'your business'}
            </p>
          </div>

          {/* Date Range Selector */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading analytics...</p>
        </div>
      )}

      {/* Analytics Content */}
      {!loading && analytics && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6">
              <div className="text-sm font-medium opacity-90 mb-2">Total Revenue</div>
              <div className="text-3xl font-bold mb-1">{formatCurrency(analytics.summary.totalRevenue)}</div>
              <div className="text-sm opacity-90">{analytics.summary.totalSales} sales</div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Avg Order Value</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {formatCurrency(analytics.summary.averageOrderValue)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">per token</div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Activation Rate</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {analytics.summary.overallActivationRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">of sold tokens</div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Best Seller</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {analytics.topMetrics.bestSellingPackage || 'N/A'}
              </div>
            </div>
          </div>

          {/* Daily Revenue Trend */}
          {analytics.dailyRevenue.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Revenue Trend
              </h2>
              <div className="space-y-3">
                {analytics.dailyRevenue.slice(0, 14).map((day, index) => {
                  const maxRevenue = Math.max(...analytics.dailyRevenue.map(d => d.revenue))
                  const widthPercent = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0

                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400 w-24">
                          {formatDate(day.date)}
                        </span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {formatCurrency(day.revenue)}
                        </span>
                        <span className="text-gray-500 dark:text-gray-500 w-16 text-right">
                          {day.sales} {day.sales === 1 ? 'sale' : 'sales'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${widthPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Package Performance */}
          {analytics.packagePerformance.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Package Performance
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Package
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Total Sales
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Avg Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Activation Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {analytics.packagePerformance.map((pkg, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {index === 0 && (
                              <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            )}
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {pkg.packageName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {pkg.totalSales}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(pkg.totalRevenue)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {formatCurrency(pkg.averagePrice)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900 dark:text-white mr-2">
                              {pkg.activationRate.toFixed(1)}%
                            </div>
                            <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  pkg.activationRate >= 70
                                    ? 'bg-green-500'
                                    : pkg.activationRate >= 50
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${pkg.activationRate}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Metrics Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-200 mb-4">
                🏆 Top Performers
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-green-700 dark:text-green-300">Best Selling Package</div>
                  <div className="text-lg font-bold text-green-900 dark:text-green-100">
                    {analytics.topMetrics.bestSellingPackage || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-green-700 dark:text-green-300">Highest Revenue Package</div>
                  <div className="text-lg font-bold text-green-900 dark:text-green-100">
                    {analytics.topMetrics.highestRevenuePackage || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-green-700 dark:text-green-300">Best Activation Rate</div>
                  <div className="text-lg font-bold text-green-900 dark:text-green-100">
                    {analytics.topMetrics.bestActivationRate || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-4">
                📊 Quick Stats
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Peak Sales Day</div>
                  <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    {analytics.topMetrics.peakSalesDay || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Average Order Value</div>
                  <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    {formatCurrency(analytics.summary.averageOrderValue)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Total Packages</div>
                  <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    {analytics.packagePerformance.length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center justify-center space-x-4">
            <Link
              href="/r710-portal/sales"
              className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              View Sales History
            </Link>
            <Link
              href="/r710-portal/tokens"
              className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              Token Inventory
            </Link>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !analytics && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Analytics Data
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Sales data will appear here once tokens are sold.
          </p>
          <Link
            href="/r710-portal/tokens"
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            Go to Token Inventory
          </Link>
        </div>
      )}
    </div>
  )
}
