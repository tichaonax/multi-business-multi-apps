'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { useState, useEffect } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'
import { formatCurrency, formatDateFull, formatDateTime } from '@/lib/date-format'

export default function EndOfDayReport() {
  const [dailySales, setDailySales] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cashCounted, setCashCounted] = useState('')
  const [variance, setVariance] = useState(0)
  const [managerSignature, setManagerSignature] = useState('')

  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
  } = useBusinessPermissionsContext()

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Data Available</h2>
          <p className="text-gray-600 dark:text-gray-400">Unable to load sales data for today.</p>
        </div>
      </div>
    )
  }

  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
        {/* Print Styles */}
        <style jsx global>{`
          @media print {
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

        {/* Navigation (No Print) */}
        <div className="no-print mb-6 flex items-center justify-between">
          <Link
            href="/restaurant/pos"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to POS
          </Link>
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold"
          >
            🖨️ Print Report
          </button>
        </div>

        {/* Printable Report */}
        <div id="end-of-day-report" className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg print:bg-white">
          {/* Header */}
          <div className="text-center mb-8 pb-6 border-b-2 border-gray-300 dark:border-gray-600 print:border-gray-300">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 print:text-gray-900">END OF DAY REPORT</h1>
            <h2 className="text-xl text-gray-700 dark:text-gray-300 print:text-gray-700">{currentBusiness?.businessName || 'Restaurant'}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 print:text-gray-600">Business Day: {formatDateRange()}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600">Report Generated: {new Date().toLocaleString()}</p>
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

          {/* Payment Methods Breakdown */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 print:text-gray-900 print:border-gray-300">
              PAYMENT METHODS
            </h3>
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700 print:bg-gray-100">
                <tr>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Method</th>
                  <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Orders</th>
                  <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Amount</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(dailySales.paymentMethods).map(([method, data]: [string, any]) => (
                  <tr key={method} className="border-b border-gray-200 dark:border-gray-600 print:border-gray-200">
                    <td className="p-3 font-medium text-gray-900 dark:text-gray-100 print:text-gray-900">{method}</td>
                    <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">{data.count}</td>
                    <td className="p-3 text-right font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">{formatCurrency(data.total)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 dark:bg-gray-700 font-bold print:bg-gray-100">
                  <td className="p-3 text-gray-900 dark:text-gray-100 print:text-gray-900">TOTAL</td>
                  <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">{dailySales.summary.totalOrders}</td>
                  <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">{formatCurrency(dailySales.summary.totalSales)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Employee Sales */}
          {dailySales.employeeSales && dailySales.employeeSales.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 print:text-gray-900 print:border-gray-300">
                SALES BY EMPLOYEE
              </h3>
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700 print:bg-gray-100">
                  <tr>
                    <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Employee</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Orders</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Sales</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Avg per Order</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySales.employeeSales.map((emp: any) => (
                    <tr key={emp.name} className="border-b border-gray-200 dark:border-gray-600 print:border-gray-200">
                      <td className="p-3 font-medium text-gray-900 dark:text-gray-100 print:text-gray-900">{emp.name}</td>
                      <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">{emp.orders}</td>
                      <td className="p-3 text-right font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">{formatCurrency(emp.sales)}</td>
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
          {dailySales.categoryBreakdown && dailySales.categoryBreakdown.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 print:text-gray-900 print:border-gray-300">
                SALES BY CATEGORY
              </h3>
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700 print:bg-gray-100">
                  <tr>
                    <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Category</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Items Sold</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Sales</th>
                    <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySales.categoryBreakdown.map((cat: any) => (
                    <tr key={cat.name} className="border-b border-gray-200 dark:border-gray-600 print:border-gray-200">
                      <td className="p-3 font-medium text-gray-900 dark:text-gray-100 print:text-gray-900">{cat.name}</td>
                      <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">{cat.itemCount}</td>
                      <td className="p-3 text-right font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">{formatCurrency(cat.totalSales)}</td>
                      <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">
                        {((cat.totalSales / dailySales.summary.totalSales) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 dark:bg-gray-700 font-bold print:bg-gray-100">
                    <td className="p-3 text-gray-900 dark:text-gray-100 print:text-gray-900">TOTAL</td>
                    <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">
                      {dailySales.categoryBreakdown.reduce((sum: number, cat: any) => sum + cat.itemCount, 0)}
                    </td>
                    <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">{formatCurrency(dailySales.summary.totalSales)}</td>
                    <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">100%</td>
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
                <div className="border-b-2 border-gray-400 dark:border-gray-500 pb-1 mb-2 font-semibold text-gray-900 dark:text-gray-100 print:border-gray-400 print:text-gray-900">
                  {new Date().toLocaleString()}
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
      </div>
    </BusinessTypeRoute>
  )
}
