'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'
import { formatCurrency, formatDateFull, formatDateTime } from '@/lib/date-format'
import { getCategoryEmoji, getPaymentMethodEmoji } from '@/lib/category-emojis'
import { PercentageBar } from '@/components/reports/percentage-bar'
import { PaymentMethodsPieChart } from '@/components/reports/payment-methods-pie-chart'
import { CategoryPerformanceBarChart } from '@/components/reports/category-performance-bar-chart'
import '@/styles/print-report.css'

export default function EndOfDayReport() {
  const [dailySales, setDailySales] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cashCounted, setCashCounted] = useState('')
  const [variance, setVariance] = useState(0)
  const [managerSignature, setManagerSignature] = useState('')

  // Report saving state
  const [existingReport, setExistingReport] = useState<any>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
  } = useBusinessPermissionsContext()

  // Determine POS link based on business type
  const businessType = currentBusiness?.businessType || 'grocery'
  const posLink = `/${businessType}/pos`

  // Load daily sales data
  useEffect(() => {
    const loadDailySales = async () => {
      if (!currentBusinessId) return

      try {
        setLoading(true)
        const response = await fetch(`/api/restaurant/daily-sales?businessId=${currentBusinessId}`)
        if (response.ok) {
          const data = await response.json()
          setDailySales(data.data)
        }
      } catch (error) {
        console.error('Failed to load daily sales:', error)
      } finally {
        setLoading(false)
      }
    }

    if (currentBusinessId) {
      loadDailySales()
    }
  }, [currentBusinessId])

  // Check if report already exists (locked)
  useEffect(() => {
    const checkExistingReport = async () => {
      if (!currentBusinessId || !dailySales) return

      try {
        const reportDate = dailySales.businessDay.date
        const response = await fetch(
          `/api/reports/save?businessId=${currentBusinessId}&reportType=END_OF_DAY&reportDate=${reportDate}`
        )

        if (response.ok) {
          const data = await response.json()
          if (!data.canSave && data.existingReport) {
            setExistingReport(data.existingReport)
          }
        }
      } catch (error) {
        console.error('Failed to check existing report:', error)
      }
    }

    checkExistingReport()
  }, [currentBusinessId, dailySales])

  // Handle save report
  const handleSaveReport = async () => {
    if (!managerSignature.trim()) {
      setSaveError('Manager name is required')
      return
    }

    try {
      setSaving(true)
      setSaveError(null)

      const reportData = {
        summary: {
          totalSales: dailySales.summary.totalSales,
          totalOrders: dailySales.summary.totalOrders,
          averageOrderValue: dailySales.summary.averageOrderValue,
          receiptsIssued: dailySales.summary.receiptsIssued,
          totalTax: dailySales.summary.totalTax
        },
        paymentMethods: dailySales.paymentMethods,
        employeeSales: dailySales.employeeSales || [],
        categoryBreakdown: dailySales.categoryBreakdown || [],
        businessDay: dailySales.businessDay
      }

      const response = await fetch('/api/reports/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusinessId,
          reportType: 'END_OF_DAY',
          reportDate: dailySales.businessDay.date,
          periodStart: dailySales.businessDay.start,
          periodEnd: dailySales.businessDay.end,
          managerName: managerSignature,
          cashCounted: cashCounted ? parseFloat(cashCounted) : null,
          reportData: reportData
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save report')
      }

      setSaveSuccess(true)
      setExistingReport(result.report)
      setShowSaveModal(false)

      // Show success message
      setTimeout(() => {
        setSaveSuccess(false)
      }, 5000)

    } catch (error: any) {
      console.error('Error saving report:', error)
      setSaveError(error.message || 'Failed to save report')
    } finally {
      setSaving(false)
    }
  }

  // Calculate expected cash
  const expectedCash = dailySales?.paymentMethods?.CASH?.total || 0

  // Calculate variance when cash counted changes
  useEffect(() => {
    if (cashCounted) {
      const counted = parseFloat(cashCounted) || 0
      setVariance(counted - expectedCash)
    } else {
      setVariance(0)
    }
  }, [cashCounted, expectedCash])

  // Format date range for Zimbabwe locale
  const formatDateRange = () => {
    if (!dailySales) return ''
    const start = new Date(dailySales.businessDay.start)
    const end = new Date(dailySales.businessDay.end)
    return `${formatDateTime(start)} - ${formatDateTime(end)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!dailySales) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Navigation */}
          <div className="mb-6 flex gap-3">
            <Link
              href={posLink}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Back to POS
            </Link>
            <Link
              href="/grocery/reports"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Back to Reports
            </Link>
          </div>

          {/* Error Message */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="mb-4">
              <span className="text-6xl">📭</span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Data Available</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Unable to load sales data for today.</p>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>This could mean:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>No orders have been placed today</li>
                <li>No business is currently selected</li>
                <li>There was an error loading the data</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
        {/* Print Styles */}
        <style jsx global>{`
          /* Hide print-only elements on screen */
          .print-only {
            display: none;
          }

          @media print {
            /* Show print-only elements when printing */
            .print-only {
              display: block !important;
            }

            body * {
              visibility: hidden;
            }
            #end-of-day-report,
            #end-of-day-report * {
              visibility: visible;
            }
            #end-of-day-report {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {/* Success Message */}
        {saveSuccess && (
          <div className="no-print mb-6 bg-green-50 dark:bg-green-900/30 border-2 border-green-500 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h3 className="font-bold text-green-900 dark:text-green-100">Report Saved & Locked Successfully!</h3>
                <p className="text-sm text-green-800 dark:text-green-200">
                  This report is now permanently locked and cannot be modified.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Locked Report Indicator */}
        {existingReport && (
          <div className="no-print mb-6 bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-500 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔒</span>
                <div>
                  <h3 className="font-bold text-yellow-900 dark:text-yellow-100">Report Already Locked</h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Signed by <strong>{existingReport.managerName}</strong> on{' '}
                    {new Date(existingReport.signedAt).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              <Link
                href={`/grocery/reports/saved/${existingReport.id}`}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-semibold"
              >
                View Locked Report →
              </Link>
            </div>
          </div>
        )}

        {/* Navigation (No Print) */}
        <div className="no-print mb-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href={posLink}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm whitespace-nowrap"
            >
              ← Back to POS
            </Link>
            <Link
              href="/grocery/reports/history"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
            >
              📅 Historical Reports
            </Link>
            <Link
              href="/grocery/reports/end-of-week"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm whitespace-nowrap"
            >
              📊 End of Week Report
            </Link>
            {!existingReport && (
              <button
                onClick={() => setShowSaveModal(true)}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm whitespace-nowrap"
              >
                💾 Save & Lock Report
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
            >
              🖨️ Print Report
            </button>
          </div>
        </div>

        {/* Printable Report */}
        <div id="end-of-day-report" className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg print:bg-white">
          {/* Header */}
          <div className="text-center mb-8 pb-6 border-b-2 border-gray-300 dark:border-gray-600 print:border-gray-300">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 print:text-gray-900">END OF DAY REPORT</h1>
            <h2 className="text-xl text-gray-700 dark:text-gray-300 print:text-gray-700">{currentBusiness?.businessName || 'Restaurant'}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 print:text-gray-600">Business Day: {formatDateRange()}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600" suppressHydrationWarning>
              Report Generated: {new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>
          </div>

          {/* Summary Section */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 print:text-gray-900 print:border-gray-300">
              SALES SUMMARY
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded print:bg-gray-50">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1 print:text-gray-600">Total Revenue</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 print:text-green-600">
                  {formatCurrency(dailySales.summary.totalSales)}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded print:bg-gray-50">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1 print:text-gray-600">Total Orders</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 print:text-blue-600">
                  {dailySales.summary.totalOrders}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded print:bg-gray-50">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1 print:text-gray-600">Average Order Value</div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 print:text-purple-600">
                  {formatCurrency(dailySales.summary.averageOrderValue)}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded print:bg-gray-50">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1 print:text-gray-600">Receipts Issued</div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 print:text-orange-600">
                  {dailySales.summary.receiptsIssued}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded print:bg-gray-50">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1 print:text-gray-600">Total Tax Collected</div>
                <div className="text-2xl font-bold text-gray-700 dark:text-gray-300 print:text-gray-700">
                  {formatCurrency(dailySales.summary.totalTax)}
                </div>
              </div>
            </div>
          </div>

          {/* Visual Charts Section */}
          <div className="mb-8 space-y-8 no-print">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b-2 border-gray-300 dark:border-gray-600">
              📊 VISUAL ANALYTICS
            </h3>

            {/* Payment Methods Pie Chart */}
            {Object.keys(dailySales.paymentMethods).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 overflow-visible">
                <PaymentMethodsPieChart
                  data={Object.entries(dailySales.paymentMethods).map(([method, data]: [string, any]) => ({
                    method: method,
                    value: data.total,
                    percentage: (data.total / dailySales.summary.totalSales) * 100,
                  }))}
                  totalAmount={dailySales.summary.totalSales}
                />
              </div>
            )}

            {/* Category Performance Bar Chart */}
            {dailySales.categoryBreakdown && dailySales.categoryBreakdown.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 overflow-visible">
                <CategoryPerformanceBarChart
                  data={dailySales.categoryBreakdown.map((cat: any) => ({
                    name: cat.name,
                    sales: cat.totalSales,
                    orders: cat.itemCount,
                  }))}
                  topN={10}
                />
              </div>
            )}
          </div>

          {/* Payment Methods Breakdown */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 print:text-gray-900 print:border-gray-300">
              💰 PAYMENT METHODS
            </h3>
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700 print:bg-gray-100">
                <tr>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Method</th>
                  <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Orders</th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">% of Total</th>
                  <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Amount</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(dailySales.paymentMethods)
                  .sort(([, a]: [string, any], [, b]: [string, any]) => b.total - a.total)
                  .map(([method, data]: [string, any], index) => {
                    const percentage = (data.total / dailySales.summary.totalSales) * 100
                    return (
                      <tr key={method} className="border-b border-gray-200 dark:border-gray-600 print:border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-3 font-medium text-gray-900 dark:text-gray-100 print:text-gray-900">
                          <span className="mr-2">{getPaymentMethodEmoji(method)}</span>
                          {method}
                        </td>
                        <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">{data.count}</td>
                        <td className="p-3 print:hidden">
                          <PercentageBar percentage={percentage} color="blue" />
                        </td>
                        <td className="hidden print:table-cell p-3 text-left text-gray-900">
                          {percentage.toFixed(1)}%
                        </td>
                        <td className="p-3 text-right font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">{formatCurrency(data.total)}</td>
                      </tr>
                    )
                  })}
                <tr className="bg-gray-100 dark:bg-gray-700 font-bold print:bg-gray-100">
                  <td className="p-3 text-gray-900 dark:text-gray-100 print:text-gray-900">TOTAL</td>
                  <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">{dailySales.summary.totalOrders}</td>
                  <td className="p-3 text-left text-gray-900 dark:text-gray-100 print:text-gray-900">100%</td>
                  <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">{formatCurrency(dailySales.summary.totalSales)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Employee Sales */}
          {dailySales.employeeSales && dailySales.employeeSales.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 print:text-gray-900 print:border-gray-300">
                👥 SALES BY EMPLOYEE
              </h3>
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700 print:bg-gray-100">
                  <tr>
                    <th className="text-center p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900 w-12">#</th>
                    <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Employee</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Orders</th>
                    <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Sales Performance</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Avg/Order</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySales.employeeSales
                    .sort((a: any, b: any) => b.sales - a.sales)
                    .map((emp: any, index: number) => {
                      const percentage = (emp.sales / dailySales.summary.totalSales) * 100
                      const isTopThree = index < 3
                      return (
                        <tr
                          key={emp.name}
                          className={`border-b border-gray-200 dark:border-gray-600 print:border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                            isTopThree ? 'bg-green-50 dark:bg-green-900/20 print:bg-green-50' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                              index === 0 ? 'bg-yellow-400 text-yellow-900' :
                              index === 1 ? 'bg-gray-300 text-gray-900' :
                              index === 2 ? 'bg-orange-400 text-orange-900' :
                              'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-gray-900 dark:text-gray-100 print:text-gray-900">
                            {emp.name}
                          </td>
                          <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">{emp.orders}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="print:hidden flex-1">
                                <PercentageBar percentage={percentage} color="purple" />
                              </div>
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900 min-w-[6rem] text-right">
                                {formatCurrency(emp.sales)}
                              </span>
                              <span className="hidden print:inline text-sm text-gray-600 ml-2">
                                ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">
                            {formatCurrency(emp.sales / emp.orders)}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}

          {/* Category Breakdown - Income Sources */}
          {dailySales.categoryBreakdown && dailySales.categoryBreakdown.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 print:text-gray-900 print:border-gray-300">
                📊 TOP INCOME SOURCES
              </h3>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4 print:bg-blue-50">
                <div className="text-sm font-semibold text-blue-900 dark:text-blue-100 print:text-blue-900">
                  Total Income: <span className="text-2xl ml-2">{formatCurrency(dailySales.summary.totalSales)}</span>
                </div>
              </div>
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700 print:bg-gray-100">
                  <tr>
                    <th className="text-center p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900 w-12">#</th>
                    <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Income Source</th>
                    <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">% and Total Amount</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySales.categoryBreakdown
                    .sort((a: any, b: any) => b.totalSales - a.totalSales)
                    .map((cat: any, index: number) => {
                      const percentage = (cat.totalSales / dailySales.summary.totalSales) * 100
                      const isTopThree = index < 3
                      return (
                        <tr
                          key={cat.name}
                          className={`border-b border-gray-200 dark:border-gray-600 print:border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                            isTopThree ? 'bg-yellow-50 dark:bg-yellow-900/20 print:bg-yellow-50' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                              index === 0 ? 'bg-yellow-400 text-yellow-900' :
                              index === 1 ? 'bg-gray-300 text-gray-900' :
                              index === 2 ? 'bg-orange-400 text-orange-900' :
                              'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-gray-900 dark:text-gray-100 print:text-gray-900">
                            <span className="mr-2">{getCategoryEmoji(cat.name)}</span>
                            {cat.name}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="print:hidden flex-1">
                                <PercentageBar percentage={percentage} color="green" />
                              </div>
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900 min-w-[6rem] text-right">
                                {formatCurrency(cat.totalSales)}
                              </span>
                              <span className="hidden print:inline text-sm text-gray-600 ml-2">
                                ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">{cat.itemCount}</td>
                        </tr>
                      )
                    })}
                  <tr className="bg-gray-100 dark:bg-gray-700 font-bold print:bg-gray-100">
                    <td className="p-3 text-center text-gray-900 dark:text-gray-100 print:text-gray-900"></td>
                    <td className="p-3 text-gray-900 dark:text-gray-100 print:text-gray-900">TOTAL</td>
                    <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">{formatCurrency(dailySales.summary.totalSales)}</td>
                    <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">
                      {dailySales.categoryBreakdown.reduce((sum: number, cat: any) => sum + cat.itemCount, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Till Reconciliation */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 print:text-gray-900 print:border-gray-300">
              TILL RECONCILIATION
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded print:bg-gray-50">
                <span className="font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Expected Cash in Drawer:</span>
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100 print:text-gray-900">{formatCurrency(expectedCash)}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded print:bg-blue-50">
                <label className="font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Cash Counted:</label>
                <div className="flex items-center gap-2">
                  <span className="text-lg text-gray-900 dark:text-gray-100 print:text-gray-900">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cashCounted}
                    onChange={(e) => setCashCounted(e.target.value)}
                    placeholder="0.00"
                    className="w-32 px-3 py-2 border-2 border-blue-300 dark:border-blue-600 dark:bg-gray-700 dark:text-gray-100 rounded text-right font-bold text-lg no-print"
                  />
                  <span className="print-only font-bold text-lg text-gray-900">
                    {cashCounted ? formatCurrency(parseFloat(cashCounted)) : '_____________'}
                  </span>
                </div>
              </div>

              {cashCounted && (
                <div className={`flex justify-between items-center p-3 rounded ${
                  variance === 0 ? 'bg-green-50 dark:bg-green-900/30 print:bg-green-50' :
                  variance > 0 ? 'bg-yellow-50 dark:bg-yellow-900/30 print:bg-yellow-50' :
                  'bg-red-50 dark:bg-red-900/30 print:bg-red-50'
                }`}>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Variance:</span>
                  <span className={`text-xl font-bold ${
                    variance === 0 ? 'text-green-600 dark:text-green-400 print:text-green-600' :
                    variance > 0 ? 'text-yellow-600 dark:text-yellow-400 print:text-yellow-600' :
                    'text-red-600 dark:text-red-400 print:text-red-600'
                  }`}>
                    {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-12 pt-8 border-t-2 border-gray-300 dark:border-gray-600 print:border-gray-300">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 print:text-gray-700">Manager Name:</label>
                <input
                  type="text"
                  value={managerSignature}
                  onChange={(e) => setManagerSignature(e.target.value)}
                  placeholder="Enter manager name"
                  className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded no-print"
                />
                <div className="print-only border-b-2 border-gray-400 pb-1 mb-2 text-gray-900">
                  {managerSignature || '_________________________'}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 print:text-gray-500">Closing Manager</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 print:text-gray-700">Date & Time:</label>
                <div className="border-b-2 border-gray-400 dark:border-gray-500 pb-1 mb-2 font-semibold text-gray-900 dark:text-gray-100 print:border-gray-400 print:text-gray-900" suppressHydrationWarning>
                  {new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 print:text-gray-500">Report Completed</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-300 dark:border-gray-600 text-center text-xs text-gray-500 dark:text-gray-400 print:border-gray-300 print:text-gray-500">
            <p>This report is for internal use only. Keep with daily records.</p>
            <p className="mt-1">Business Day: {dailySales.businessDay.date}</p>
          </div>
        </div>

        {/* Save Confirmation Modal */}
        {showSaveModal && (
          <div className="no-print fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Save & Lock Report
              </h2>

              <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
                <p className="text-sm text-yellow-900 dark:text-yellow-100">
                  <strong>⚠️ Warning:</strong> Once saved, this report cannot be edited or deleted (admin only).
                  This creates a permanent record for compliance and audit purposes.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Manager Name: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={managerSignature}
                  onChange={(e) => setManagerSignature(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  autoFocus
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Cash Counted (Optional):
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-lg text-gray-700 dark:text-gray-300">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cashCounted}
                    onChange={(e) => setCashCounted(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 px-3 py-2 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-right"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Expected Cash: {formatCurrency(expectedCash)}
                  {cashCounted && ` | Variance: ${formatCurrency(variance)}`}
                </p>
              </div>

              {saveError && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{saveError}</p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowSaveModal(false)
                    setSaveError(null)
                  }}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveReport}
                  disabled={saving || !managerSignature.trim()}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                >
                  {saving ? '💾 Saving...' : '💾 Save & Lock'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  )
}
