'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { useState, useEffect, Suspense } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDateFull, formatDateTime } from '@/lib/date-format'

function HistoricalReportViewContent() {
  const [dailySales, setDailySales] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { currentBusinessId } = useBusinessPermissionsContext()
  const searchParams = useSearchParams()
  const reportDate = searchParams.get('date')

  useEffect(() => {
    if (reportDate && currentBusinessId) {
      loadHistoricalReport()
    }
  }, [reportDate, currentBusinessId])

  const loadHistoricalReport = async () => {
    if (!currentBusinessId || !reportDate) return

    try {
      setLoading(true)

      // Fetch the daily sales data for the specific date
      const response = await fetch(
        `/api/restaurant/daily-sales?businessId=${currentBusinessId}&date=${reportDate}`
      )

      if (response.ok) {
        const data = await response.json()
        setDailySales(data.data)
      }
    } catch (error) {
      console.error('Failed to load historical report:', error)
    } finally {
      setLoading(false)
    }
  }


  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  if (!dailySales) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 dark:text-gray-400">No report found for this date</p>
          <Link
            href="/restaurant/reports/history"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to History
          </Link>
        </div>
      </div>
    )
  }

  const expectedCash = dailySales.paymentMethods?.CASH?.total || 0

  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <div className="min-h-screen bg-white dark:bg-gray-900 p-4 print:p-0">
        {/* Print Button - Hidden when printing */}
        <div className="mb-6 flex gap-3 print:hidden">
          <Link
            href="/restaurant/reports/history"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to History
          </Link>
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            🖨️ Print Report
          </button>
        </div>

        {/* Report Container */}
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg print:shadow-none print:bg-white print:text-gray-900">
          {/* Header */}
          <div className="text-center mb-8 pb-6 border-b-2 border-gray-300 dark:border-gray-600 print:border-gray-300">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 print:text-gray-900">
              END OF DAY REPORT
            </h1>
            <p className="text-xl text-gray-700 dark:text-gray-300 print:text-gray-700">
              {formatDateFull(reportDate || '')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 print:text-gray-500">
              Business Day: {reportDate} (5:00 AM - 5:00 AM)
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 print:text-gray-400">
              Historical Report - Read Only
            </p>
          </div>

          {/* Sales Summary */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 print:text-gray-900 print:border-gray-300">
              SALES SUMMARY
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg print:bg-gray-50">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1 print:text-gray-600">
                  Total Orders
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 print:text-gray-900">
                  {dailySales.summary.totalOrders}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg print:bg-gray-50">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1 print:text-gray-600">
                  Receipts Issued
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 print:text-gray-900">
                  {dailySales.summary.receiptsIssued}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg print:bg-gray-50">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1 print:text-gray-600">
                  Average Order Value
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 print:text-gray-900">
                  {formatCurrency(dailySales.summary.averageOrderValue)}
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg print:bg-green-50">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1 print:text-gray-600">
                  Total Sales
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 print:text-green-600">
                  {formatCurrency(dailySales.summary.totalSales)}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 print:text-gray-900 print:border-gray-300">
              PAYMENT METHODS
            </h3>
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700 print:bg-gray-100">
                <tr>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">
                    Method
                  </th>
                  <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">
                    Transactions
                  </th>
                  <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(dailySales.paymentMethods || {}).map(([method, data]: [string, any]) => (
                  <tr
                    key={method}
                    className="border-b border-gray-200 dark:border-gray-600 print:border-gray-200"
                  >
                    <td className="p-3 font-medium text-gray-900 dark:text-gray-100 print:text-gray-900">
                      {method}
                    </td>
                    <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">
                      {data.count}
                    </td>
                    <td className="p-3 text-right font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">
                      {formatCurrency(data.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sales by Employee */}
          {dailySales.employeeSales && dailySales.employeeSales.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 print:text-gray-900 print:border-gray-300">
                SALES BY EMPLOYEE
              </h3>
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700 print:bg-gray-100">
                  <tr>
                    <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">
                      Employee
                    </th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">
                      Orders
                    </th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">
                      Sales
                    </th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">
                      Avg per Order
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dailySales.employeeSales.map((emp: any) => (
                    <tr
                      key={emp.name}
                      className="border-b border-gray-200 dark:border-gray-600 print:border-gray-200"
                    >
                      <td className="p-3 font-medium text-gray-900 dark:text-gray-100 print:text-gray-900">
                        {emp.name}
                      </td>
                      <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">
                        {emp.orders}
                      </td>
                      <td className="p-3 text-right font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">
                        {formatCurrency(emp.sales)}
                      </td>
                      <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">
                        {formatCurrency(emp.sales / emp.orders)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Category Breakdown */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 print:text-gray-900 print:border-gray-300">
              CATEGORY BREAKDOWN
            </h3>
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700 print:bg-gray-100">
                <tr>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">
                    Category
                  </th>
                  <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">
                    Items Sold
                  </th>
                  <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">
                    Sales
                  </th>
                  <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {dailySales.categoryBreakdown?.map((category: any) => (
                  <tr
                    key={category.name}
                    className="border-b border-gray-200 dark:border-gray-600 print:border-gray-200"
                  >
                    <td className="p-3 font-medium text-gray-900 dark:text-gray-100 print:text-gray-900">
                      {category.name}
                    </td>
                    <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">
                      {category.itemCount}
                    </td>
                    <td className="p-3 text-right font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">
                      {formatCurrency(category.totalSales)}
                    </td>
                    <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">
                      {((category.totalSales / dailySales.summary.totalSales) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Till Reconciliation (Read-Only) */}
          <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg print:bg-blue-50">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 print:text-gray-900">
              TILL RECONCILIATION
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded print:bg-gray-50">
                <span className="font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">
                  Expected Cash in Drawer:
                </span>
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100 print:text-gray-900">
                  {formatCurrency(expectedCash)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-300 dark:border-gray-600 text-center text-sm text-gray-500 dark:text-gray-400 print:border-gray-300 print:text-gray-500">
            <p>Historical Report - Generated on {formatDateTime(new Date())}</p>
          </div>
        </div>
      </div>
    </BusinessTypeRoute>
  )
}

export default function HistoricalReportView() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    }>
      <HistoricalReportViewContent />
    </Suspense>
  )
}
