'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'
import Link from 'next/link'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getLocalDateString } from '@/lib/utils'
import { SalesSummaryCards } from '@/components/reports/sales-summary-cards'
import { TopPerformersCards } from '@/components/reports/top-performers-cards'
import { DailySalesLineChart } from '@/components/reports/daily-sales-line-chart'
import { SalesBreakdownCharts } from '@/components/reports/sales-breakdown-charts'

interface SalesAnalyticsData {
  summary: {
    totalSales: number
    totalTax: number
    averageOrderValue: number
    totalOrders: number
    totalExpenses: number
    grossMargin: number
  }
  topProducts: {
    byUnits: Array<{ productName: string; emoji: string; unitsSold: number }>
    byRevenue: Array<{ productName: string; emoji: string; revenue: number }>
  }
  topCategories: Array<{ categoryPath: string; emoji: string; revenue: number }>
  topSalesReps: Array<{ employeeName: string; revenue: number }>
  dailySales: Array<{ date: string; sales: number; orderCount: number; expenses?: number }>
  productBreakdown: Array<{ productName: string; emoji: string; revenue: number; percentage: number }>
  categoryBreakdown: Array<{ categoryPath: string; emoji: string; revenue: number; percentage: number }>
  salesRepBreakdown: Array<{ employeeName: string; revenue: number; percentage: number }>
  paymentMethodBreakdown?: Record<string, { count: number; total: number }>
}

export default function RestaurantSalesAnalytics() {
  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()
  const router = useRouter()
  const dateFormat = useDateFormat()
  const businessType = currentBusiness?.businessType || 'restaurant'

  // Initialize date range from URL params (drill-down links) or default last 30 days
  const searchParams = useSearchParams()
  const getInitialDateRange = (): DateRange => {
    const spStart = searchParams.get('startDate')
    const spEnd   = searchParams.get('endDate')
    if (spStart && spEnd) {
      const start = new Date(spStart + 'T00:00:00')
      const end   = new Date(spEnd   + 'T00:00:00')
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) return { start, end }
    }
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 30)
    return { start, end }
  }

  const [dateRange, setDateRange] = useState<DateRange>(getInitialDateRange())
  const [data, setData] = useState<SalesAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentBusinessId) {
      loadAnalytics()
    }
  }, [currentBusinessId, dateRange])

  const loadAnalytics = async () => {
    if (!currentBusinessId) return

    try {
      setLoading(true)

      const startDate = getLocalDateString(dateRange.start)
      const endDate = getLocalDateString(dateRange.end)

      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const response = await fetch(
        `/api/business/${currentBusinessId}/sales-analytics?startDate=${startDate}&endDate=${endDate}&timezone=${encodeURIComponent(tz)}`
      )

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setData(result)
        }
      }
    } catch (error) {
      console.error('Failed to load sales analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading sales analytics...</p>
        </div>
      </div>
    )
  }

  const formattedStartDate = formatDateByFormat(getLocalDateString(dateRange.start), dateFormat)
  const formattedEndDate = formatDateByFormat(getLocalDateString(dateRange.end), dateFormat)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* Navigation */}
      <div className="mb-6 flex gap-3 no-print">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Back
        </button>
        <Link
          href={`/${businessType}/reports`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ← Back to Reports
        </Link>
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          📊 Sales Analytics Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive sales analysis and performance metrics
        </p>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Period Selector */}
            <div className="bg-pink-100 dark:bg-pink-900/20 border-2 border-pink-300 dark:border-pink-800 rounded-lg p-4">
              <h2 className="text-lg font-bold text-pink-900 dark:text-pink-300 mb-4">
                Sales Dashboard
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-pink-800 dark:text-pink-400 mb-1">
                    Enter Period
                  </label>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-pink-700 dark:text-pink-500">Start Date</span>
                      <p className="text-sm font-medium text-pink-900 dark:text-pink-300">
                        {formattedStartDate}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-pink-700 dark:text-pink-500">End Date</span>
                      <p className="text-sm font-medium text-pink-900 dark:text-pink-300">
                        {formattedEndDate}
                      </p>
                    </div>
                  </div>
                </div>
                <DateRangeSelector value={dateRange} onChange={setDateRange} />
              </div>
            </div>

            {/* Summary Cards */}
            {data && (
              <SalesSummaryCards
                totalSales={data.summary.totalSales}
                totalTax={data.summary.totalTax}
                averageOrderValue={data.summary.averageOrderValue}
              />
            )}

            {/* EcoCash breakdown (shown when EcoCash sales exist) */}
            {data?.paymentMethodBreakdown?.['ECOCASH'] && (
              <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-lg p-4">
                <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase mb-2">📱 EcoCash</p>
                <p className="text-xl font-bold text-teal-700 dark:text-teal-300">
                  ${data.paymentMethodBreakdown['ECOCASH'].total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                  {data.paymentMethodBreakdown['ECOCASH'].count} orders ·{' '}
                  {data.summary.totalSales > 0 ? ((data.paymentMethodBreakdown['ECOCASH'].total / data.summary.totalSales) * 100).toFixed(1) : 0}% of revenue
                </p>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Top Performers */}
            {data && (
              <TopPerformersCards
                topProductsByUnits={data.topProducts.byUnits}
                topProductsByRevenue={data.topProducts.byRevenue}
                topCategories={data.topCategories}
                topSalesReps={data.topSalesReps}
              />
            )}

            {/* Daily Sales Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              {data && <DailySalesLineChart data={data.dailySales} />}
            </div>

            {/* Breakdown Charts */}
            {data && (
              <SalesBreakdownCharts
                productBreakdown={data.productBreakdown}
                categoryBreakdown={data.categoryBreakdown}
                salesRepBreakdown={data.salesRepBreakdown}
              />
            )}
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
