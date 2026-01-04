'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { hasPermission } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { formatCurrency } from '@/lib/format-currency'
import { RevenueTrendsChart } from '@/components/wifi-portal/revenue-trends-chart'
import { PackagePopularityChart } from '@/components/wifi-portal/package-popularity-chart'
import { PaymentMethodsChart } from '@/components/wifi-portal/payment-methods-chart'

interface WifiPortalStats {
  business: {
    id: string
    name: string
    type: string
  }
  dateRange: {
    startDate: string | null
    endDate: string | null
  }
  summary: {
    totalTokensCreated: number
    activeTokens: number
    expiredTokens: number
    disabledTokens: number
    totalSales: number
    totalRevenue: number
    averageSaleAmount: number
  }
  salesByPaymentMethod: Array<{
    paymentMethod: string
    count: number
    totalAmount: number
  }>
  tokensByConfiguration: Array<{
    tokenConfig: {
      id: string
      name: string
      basePrice: number
    }
    count: number
  }>
  bandwidthUsage: {
    totalDownloadMb: number
    totalUploadMb: number
    averageDownloadMb: number
    averageUploadMb: number
  }
  dailyTrends: Array<{
    date: string
    tokensCreated: number
    salesCount: number
    revenue: number
  }>
  recentSales: Array<{
    id: string
    token: string
    tokenConfig: string
    saleAmount: number
    paymentMethod: string
    soldAt: string
  }>
}

export default function WiFiPortalReportsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { currentBusinessId, currentBusiness, loading: businessLoading } = useBusinessPermissionsContext()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<WifiPortalStats | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Initialize date range to last 30 days
  const getInitialDateRange = (): DateRange => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 30)
    return { start, end }
  }

  const [dateRange, setDateRange] = useState<DateRange>(getInitialDateRange())

  const canViewReports = session?.user ? hasPermission(session.user, 'canViewWifiReports') : false

  useEffect(() => {
    if (businessLoading || !currentBusinessId) return

    // Check business type
    if (currentBusiness?.businessType !== 'restaurant' && currentBusiness?.businessType !== 'grocery') {
      setErrorMessage('WiFi portal reports are only available for restaurant and grocery businesses')
      setLoading(false)
      return
    }

    if (!canViewReports) {
      router.push('/dashboard')
      return
    }

    fetchStats()
  }, [currentBusinessId, businessLoading, dateRange])

  const fetchStats = async () => {
    if (!currentBusinessId) return

    try {
      setLoading(true)
      setErrorMessage(null)

      const startDate = dateRange.start.toISOString().split('T')[0]
      const endDate = dateRange.end.toISOString().split('T')[0]

      const response = await fetch(
        `/api/wifi-portal/stats?businessId=${currentBusinessId}&startDate=${startDate}&endDate=${endDate}`
      )

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      } else {
        const error = await response.json()
        setErrorMessage(error.error || 'Failed to fetch WiFi portal statistics')
      }
    } catch (error) {
      console.error('Error fetching WiFi portal stats:', error)
      setErrorMessage('Failed to load WiFi portal statistics')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatBandwidth = (mb: number): string => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`
    }
    return `${mb.toFixed(2)} MB`
  }

  const exportToCSV = () => {
    if (!stats) return

    // Prepare CSV data with daily trends
    const csvData = stats.dailyTrends.map(day => ({
      Date: day.date,
      'Tokens Created': day.tokensCreated,
      'Sales Count': day.salesCount,
      'Revenue (₱)': day.revenue.toFixed(2),
    }))

    // Convert to CSV string
    const headers = Object.keys(csvData[0]).join(',')
    const rows = csvData.map(row => Object.values(row).join(',')).join('\n')
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`

    // Download
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `wifi-portal-report-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    // Use browser's print to PDF functionality
    window.print()
  }

  if (businessLoading || loading) {
    return (
      <ContentLayout title="WiFi Portal Reports">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading statistics...</p>
          </div>
        </div>
      </ContentLayout>
    )
  }

  if (currentBusiness?.businessType !== 'restaurant' && currentBusiness?.businessType !== 'grocery') {
    return (
      <ContentLayout title="WiFi Portal Reports">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            WiFi portal reports are only available for restaurant and grocery businesses.
          </p>
        </div>
      </ContentLayout>
    )
  }

  if (!canViewReports) {
    return (
      <ContentLayout title="WiFi Portal Reports">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            You do not have permission to view WiFi portal reports.
          </p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="WiFi Portal Reports"
      description="Analytics and statistics for WiFi token sales and usage"
    >
      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* Date Range Selector */}
      <div className="mb-6 no-print">
        <DateRangeSelector dateRange={dateRange} onChange={setDateRange} />
      </div>

      {stats && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg p-6">
              <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(stats.summary.totalRevenue)}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {stats.summary.totalSales} sales
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <div className="text-sm text-gray-600 mb-1">Tokens Created</div>
              <div className="text-3xl font-bold text-blue-600">
                {stats.summary.totalTokensCreated}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {stats.summary.activeTokens} active
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <div className="text-sm text-gray-600 mb-1">Average Sale</div>
              <div className="text-3xl font-bold text-purple-600">
                {formatCurrency(stats.summary.averageSaleAmount)}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Per token sold
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <div className="text-sm text-gray-600 mb-1">Token Status</div>
              <div className="space-y-1 mt-2">
                <div className="text-sm">
                  <span className="text-green-600">●</span> Active: {stats.summary.activeTokens}
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">●</span> Expired: {stats.summary.expiredTokens}
                </div>
                <div className="text-sm">
                  <span className="text-red-600">●</span> Disabled: {stats.summary.disabledTokens}
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Trends Chart */}
          <div className="bg-white border rounded-lg p-6">
            <RevenueTrendsChart data={stats.dailyTrends} />
          </div>

          {/* Charts: Package Popularity & Payment Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Package Popularity Pie Chart */}
            <div className="bg-white border rounded-lg p-6">
              <PackagePopularityChart data={stats.tokensByConfiguration} />
            </div>

            {/* Payment Methods Pie Chart */}
            <div className="bg-white border rounded-lg p-6">
              <PaymentMethodsChart data={stats.salesByPaymentMethod} />
            </div>
          </div>

          {/* Bandwidth Usage */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Bandwidth Usage Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Total Download</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatBandwidth(stats.bandwidthUsage.totalDownloadMb)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Total Upload</div>
                <div className="text-2xl font-bold text-purple-600">
                  {formatBandwidth(stats.bandwidthUsage.totalUploadMb)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Avg Download/Token</div>
                <div className="text-2xl font-bold text-blue-500">
                  {formatBandwidth(stats.bandwidthUsage.averageDownloadMb)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Avg Upload/Token</div>
                <div className="text-2xl font-bold text-purple-500">
                  {formatBandwidth(stats.bandwidthUsage.averageUploadMb)}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Sales */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Sales (Last 10)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Token
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Package
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Payment
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats.recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {sale.token}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {sale.tokenConfig}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 capitalize">
                        {sale.paymentMethod.toLowerCase()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                        {formatCurrency(sale.saleAmount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDateTime(sale.soldAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {stats.recentSales.length === 0 && (
                <p className="text-gray-500 text-center py-8">No sales recorded yet</p>
              )}
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-3 no-print">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              📊 Export CSV
            </button>
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              📄 Export PDF
            </button>
          </div>
        </div>
      )}

      {!stats && !loading && (
        <div className="text-center py-12 text-gray-500">
          <p>No statistics available for the selected date range.</p>
        </div>
      )}
    </ContentLayout>
  )
}
