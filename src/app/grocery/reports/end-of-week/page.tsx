'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'
import { formatCurrency, formatDateFull, formatDateTime } from '@/lib/date-format'
import { getCategoryEmoji, getPaymentMethodEmoji } from '@/lib/category-emojis'
import '@/styles/print-report.css'

export default function EndOfWeekReport() {
  const [weeklySales, setWeeklySales] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState<{ start: string; end: string } | null>(null)
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

  // Calculate current week (Monday to Sunday)
  const getCurrentWeek = () => {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Calculate days to Monday

    const monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    monday.setHours(0, 0, 0, 0)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    }
  }

  // Initialize with current week
  useEffect(() => {
    setSelectedWeek(getCurrentWeek())
  }, [])

  // Load weekly sales data
  useEffect(() => {
    const loadWeeklySales = async () => {
      if (!currentBusinessId || !selectedWeek) return

      try {
        setLoading(true)
        const response = await fetch(
          `/api/reports/weekly?businessId=${currentBusinessId}&weekStart=${selectedWeek.start}&weekEnd=${selectedWeek.end}`
        )

        if (response.ok) {
          const result = await response.json()
          setWeeklySales(result.data)
        }
      } catch (error) {
        console.error('Failed to load weekly sales:', error)
      } finally {
        setLoading(false)
      }
    }

    loadWeeklySales()
  }, [currentBusinessId, selectedWeek])

  // Check if report already exists (locked)
  useEffect(() => {
    const checkExistingReport = async () => {
      if (!currentBusinessId || !selectedWeek) return

      try {
        const reportDate = selectedWeek.start // Use Monday as report date
        const response = await fetch(
          `/api/reports/save?businessId=${currentBusinessId}&reportType=END_OF_WEEK&reportDate=${reportDate}`
        )

        if (response.ok) {
          const data = await response.json()
          if (!data.canSave && data.existingReport) {
            setExistingReport(data.existingReport)
          } else {
            setExistingReport(null)
          }
        }
      } catch (error) {
        console.error('Failed to check existing report:', error)
      }
    }

    checkExistingReport()
  }, [currentBusinessId, selectedWeek])

  // Handle save report
  const handleSaveReport = async () => {
    if (!managerSignature.trim()) {
      setSaveError('Manager name is required')
      return
    }

    if (!selectedWeek) return

    try {
      setSaving(true)
      setSaveError(null)

      const reportData = {
        summary: weeklySales.summary,
        paymentMethods: weeklySales.paymentMethods,
        employeeSales: weeklySales.employeeSales || [],
        categoryBreakdown: weeklySales.categoryBreakdown || [],
        dailyBreakdown: weeklySales.dailyBreakdown || [],
        weekPeriod: weeklySales.weekPeriod
      }

      const response = await fetch('/api/reports/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusinessId,
          reportType: 'END_OF_WEEK',
          reportDate: selectedWeek.start,
          periodStart: weeklySales.weekPeriod.startDate,
          periodEnd: weeklySales.weekPeriod.endDate,
          managerName: managerSignature,
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

  // Navigate to previous week
  const goToPreviousWeek = () => {
    if (!selectedWeek) return
    const monday = new Date(selectedWeek.start)
    monday.setDate(monday.getDate() - 7)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    setSelectedWeek({
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    })
  }

  // Navigate to next week
  const goToNextWeek = () => {
    if (!selectedWeek) return
    const monday = new Date(selectedWeek.start)
    monday.setDate(monday.getDate() + 7)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    setSelectedWeek({
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    })
  }

  // Format week range
  const formatWeekRange = () => {
    if (!selectedWeek) return ''
    const start = new Date(selectedWeek.start)
    const end = new Date(selectedWeek.end)
    return `${formatDateFull(start)} - ${formatDateFull(end)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  if (!weeklySales) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 flex gap-3">
            <Link
              href={posLink}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Back to POS
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="mb-4">
              <span className="text-6xl">📭</span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Data Available</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Unable to load weekly sales data.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
        {/* Print Styles */}
        <style jsx global>{`
          .print-only {
            display: none;
          }

          @media print {
            .print-only {
              display: block !important;
            }

            body * {
              visibility: hidden;
            }
            #end-of-week-report,
            #end-of-week-report * {
              visibility: visible;
            }
            #end-of-week-report {
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
                  This weekly report is now permanently locked and cannot be modified.
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
              href="/grocery/reports/end-of-day"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
            >
              📅 End of Day Report
            </Link>
            <Link
              href="/grocery/reports/history"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm whitespace-nowrap"
            >
              📊 Historical Reports
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

        {/* Week Selector (No Print) */}
        <div className="no-print mb-6 flex items-center justify-center gap-4">
          <button
            onClick={goToPreviousWeek}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            ← Previous Week
          </button>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Week of {formatWeekRange()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedWeek?.start} to {selectedWeek?.end}
            </div>
          </div>
          <button
            onClick={goToNextWeek}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Next Week →
          </button>
        </div>

        {/* Printable Report */}
        <div id="end-of-week-report" className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
          {/* Header */}
          <div className="text-center mb-8 pb-6 border-b-2 border-gray-300 dark:border-gray-600">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">END OF WEEK REPORT</h1>
            <h2 className="text-xl text-gray-700 dark:text-gray-300">{currentBusiness?.businessName || 'Restaurant'}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Week: {formatWeekRange()}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400" suppressHydrationWarning>
              Report Generated: {new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>
          </div>

          {/* Weekly Summary */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
              WEEKLY SUMMARY
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Total Revenue</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(weeklySales.summary.totalSales)}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Total Orders</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {weeklySales.summary.totalOrders}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Average Order Value</div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(weeklySales.summary.averageOrderValue)}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Receipts Issued</div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {weeklySales.summary.receiptsIssued}
                </div>
              </div>
            </div>
          </div>

          {/* Daily Breakdown */}
          {weeklySales.dailyBreakdown && weeklySales.dailyBreakdown.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                📅 DAILY BREAKDOWN
              </h3>
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">Day</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100">Orders</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100">Receipts</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100">Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklySales.dailyBreakdown.map((day: any) => {
                    const dayName = new Date(day.date).toLocaleDateString('en-GB', { weekday: 'long' })
                    return (
                      <tr key={day.date} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-3 font-medium text-gray-900 dark:text-gray-100">
                          {dayName}<br/>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{formatDateFull(new Date(day.date))}</span>
                        </td>
                        <td className="p-3 text-right text-gray-900 dark:text-gray-100">{day.orders}</td>
                        <td className="p-3 text-right text-gray-900 dark:text-gray-100">{day.receipts}</td>
                        <td className="p-3 text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(day.sales)}</td>
                      </tr>
                    )
                  })}
                  <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                    <td className="p-3 text-gray-900 dark:text-gray-100">WEEKLY TOTAL</td>
                    <td className="p-3 text-right text-gray-900 dark:text-gray-100">{weeklySales.summary.totalOrders}</td>
                    <td className="p-3 text-right text-gray-900 dark:text-gray-100">{weeklySales.summary.receiptsIssued}</td>
                    <td className="p-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(weeklySales.summary.totalSales)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Payment Methods */}
          {Object.keys(weeklySales.paymentMethods).length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                💰 PAYMENT METHODS
              </h3>
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">Method</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100">Orders</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100">% of Total</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(weeklySales.paymentMethods)
                    .sort(([, a]: [string, any], [, b]: [string, any]) => b.total - a.total)
                    .map(([method, data]: [string, any]) => {
                      const percentage = (data.total / weeklySales.summary.totalSales) * 100
                      return (
                        <tr key={method} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="p-3 font-medium text-gray-900 dark:text-gray-100">
                            <span className="mr-2">{getPaymentMethodEmoji(method)}</span>
                            {method}
                          </td>
                          <td className="p-3 text-right text-gray-900 dark:text-gray-100">{data.count}</td>
                          <td className="p-3 text-right text-gray-900 dark:text-gray-100">{percentage.toFixed(1)}%</td>
                          <td className="p-3 text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(data.total)}</td>
                        </tr>
                      )
                    })}
                  <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                    <td className="p-3 text-gray-900 dark:text-gray-100">TOTAL</td>
                    <td className="p-3 text-right text-gray-900 dark:text-gray-100">{weeklySales.summary.totalOrders}</td>
                    <td className="p-3 text-right text-gray-900 dark:text-gray-100">100%</td>
                    <td className="p-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(weeklySales.summary.totalSales)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Employee Performance */}
          {weeklySales.employeeSales && weeklySales.employeeSales.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                👥 EMPLOYEE PERFORMANCE
              </h3>
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="text-center p-3 font-semibold text-gray-900 dark:text-gray-100 w-12">#</th>
                    <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">Employee</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100">Orders</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100">Sales</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100">Avg/Order</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklySales.employeeSales.map((emp: any, index: number) => {
                    const isTopThree = index < 3
                    return (
                      <tr
                        key={index}
                        className={`border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                          isTopThree ? 'bg-green-50 dark:bg-green-900/20' : ''
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
                        <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{emp.name}</td>
                        <td className="p-3 text-right text-gray-900 dark:text-gray-100">{emp.orders}</td>
                        <td className="p-3 text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(emp.sales)}</td>
                        <td className="p-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(emp.sales / emp.orders)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Category Performance */}
          {weeklySales.categoryBreakdown && weeklySales.categoryBreakdown.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                📊 TOP INCOME SOURCES
              </h3>
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="text-center p-3 font-semibold text-gray-900 dark:text-gray-100 w-12">#</th>
                    <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">Category</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100">Items Sold</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100">% of Total</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100">Total Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklySales.categoryBreakdown.map((cat: any, index: number) => {
                    const percentage = (cat.totalSales / weeklySales.summary.totalSales) * 100
                    const isTopThree = index < 3
                    return (
                      <tr
                        key={index}
                        className={`border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                          isTopThree ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
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
                        <td className="p-3 font-medium text-gray-900 dark:text-gray-100">
                          <span className="mr-2">{getCategoryEmoji(cat.name)}</span>
                          {cat.name}
                        </td>
                        <td className="p-3 text-right text-gray-900 dark:text-gray-100">{cat.itemCount}</td>
                        <td className="p-3 text-right text-gray-900 dark:text-gray-100">{percentage.toFixed(1)}%</td>
                        <td className="p-3 text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(cat.totalSales)}</td>
                      </tr>
                    )
                  })}
                  <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                    <td className="p-3 text-center text-gray-900 dark:text-gray-100"></td>
                    <td className="p-3 text-gray-900 dark:text-gray-100">TOTAL</td>
                    <td className="p-3 text-right text-gray-900 dark:text-gray-100">
                      {weeklySales.categoryBreakdown.reduce((sum: number, cat: any) => sum + cat.itemCount, 0)}
                    </td>
                    <td className="p-3 text-right text-gray-900 dark:text-gray-100">100%</td>
                    <td className="p-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(weeklySales.summary.totalSales)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Signatures */}
          <div className="mt-12 pt-8 border-t-2 border-gray-300 dark:border-gray-600">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Manager Name:</label>
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Closing Manager</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Date & Time:</label>
                <div className="border-b-2 border-gray-400 dark:border-gray-500 pb-1 mb-2 font-semibold text-gray-900 dark:text-gray-100" suppressHydrationWarning>
                  {new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Report Completed</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-300 dark:border-gray-600 text-center text-xs text-gray-500 dark:text-gray-400">
            <p>This report is for internal use only. Keep with weekly records.</p>
            <p className="mt-1">Week: {selectedWeek?.start} to {selectedWeek?.end}</p>
          </div>
        </div>

        {/* Save Confirmation Modal */}
        {showSaveModal && (
          <div className="no-print fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Save & Lock Weekly Report
              </h2>

              <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
                <p className="text-sm text-yellow-900 dark:text-yellow-100">
                  <strong>⚠️ Warning:</strong> Once saved, this weekly report cannot be edited or deleted (admin only).
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

              <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-3">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Week Period:</strong> {formatWeekRange()}
                </p>
                <p className="text-sm text-blue-900 dark:text-blue-100 mt-1">
                  <strong>Total Sales:</strong> {formatCurrency(weeklySales.summary.totalSales)}
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
