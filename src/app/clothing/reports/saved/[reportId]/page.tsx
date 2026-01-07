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

export default function SavedReportView({ params }: { params: Promise<{ reportId: string }> }) {
  const [reportId, setReportId] = useState<string | null>(null)
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const {
    currentBusiness,
    isAuthenticated,
  } = useBusinessPermissionsContext()

  // Unwrap params
  useEffect(() => {
    params.then((p) => setReportId(p.reportId))
  }, [params])

  // Load saved report
  useEffect(() => {
    const loadReport = async () => {
      if (!reportId) return

      try {
        setLoading(true)
        const response = await fetch(`/api/reports/saved/${reportId}`)

        if (!response.ok) {
          throw new Error('Failed to load report')
        }

        const data = await response.json()
        setReport(data.report)
      } catch (err: any) {
        console.error('Failed to load saved report:', err)
        setError(err.message || 'Failed to load report')
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [reportId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📄</div>
          <p className="text-gray-600 dark:text-gray-400">Loading saved report...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center max-w-md mx-auto mt-20">
          <div className="mb-4">
            <span className="text-6xl">❌</span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Report Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'This report does not exist or you do not have access to it.'}</p>
          <Link
            href="/clothing/reports/history"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← Back to Reports
          </Link>
        </div>
      </div>
    )
  }

  const reportData = report.reportData
  const businessType = report.business?.type || 'clothing'
  const posLink = `/${businessType}/pos`

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
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
          #saved-report,
          #saved-report * {
            visibility: visible;
          }
          #saved-report {
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

      {/* Locked Report Banner */}
      <div className="no-print mb-6 max-w-4xl mx-auto">
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-500 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <h3 className="font-bold text-yellow-900 dark:text-yellow-100">Locked Report</h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Signed by <strong>{report.managerName}</strong> on{' '}
                {formatDateTime(new Date(report.signedAt))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="no-print mb-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href={posLink}
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm whitespace-nowrap"
          >
            ← Back to POS
          </Link>
          <Link
            href="/clothing/reports/history"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
          >
            📅 All Saved Reports
          </Link>
          <Link
            href="/clothing/reports/end-of-day"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm whitespace-nowrap"
          >
            📊 Today's Report
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
          >
            🖨️ Print Report
          </button>
        </div>
      </div>

      {/* Printable Report */}
      <div id="saved-report" className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg print:bg-white">
        {/* Header */}
        <div className="text-center mb-8 pb-6 border-b-2 border-gray-300 dark:border-gray-600 print:border-gray-300">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 print:text-gray-900">
            {report.reportType === 'END_OF_DAY' ? 'END OF DAY REPORT' : 'END OF WEEK REPORT'}
          </h1>
          <h2 className="text-xl text-gray-700 dark:text-gray-300 print:text-gray-700">{report.business?.name || 'Restaurant'}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 print:text-gray-600">
            Report Date: {formatDateFull(new Date(report.reportDate))}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600">
            Period: {formatDateTime(new Date(report.periodStart))} - {formatDateTime(new Date(report.periodEnd))}
          </p>
          <div className="mt-2 inline-block px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 rounded-full text-xs font-semibold print:bg-yellow-100 print:text-yellow-800">
            🔒 LOCKED - Signed by {report.managerName}
          </div>
        </div>

        {/* Summary Section */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 print:text-gray-900 print:border-gray-300">
            💰 Sales Summary
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg print:bg-gray-50">
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 print:text-gray-900">{formatCurrency(report.totalSales)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg print:bg-gray-50">
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 print:text-gray-900">{report.totalOrders}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg print:bg-gray-50">
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600">Average Order Value</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 print:text-gray-900">
                {formatCurrency(report.totalOrders > 0 ? report.totalSales / report.totalOrders : 0)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg print:bg-gray-50">
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600">Receipts Issued</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 print:text-gray-900">{report.receiptsIssued}</p>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        {reportData.paymentMethods && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 print:text-gray-900 print:border-gray-300">
              💳 Payment Methods
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700 print:bg-gray-100">
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-gray-100 print:text-gray-900 print:border-gray-300">Method</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-gray-100 print:text-gray-900 print:border-gray-300">Orders</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-gray-100 print:text-gray-900 print:border-gray-300">% of Total</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-gray-100 print:text-gray-900 print:border-gray-300">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(reportData.paymentMethods).map(([method, data]: [string, any]) => (
                    <tr key={method} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100 print:text-gray-900 print:border-gray-300">
                        {getPaymentMethodEmoji(method)} {method}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-gray-100 print:text-gray-900 print:border-gray-300">{data.count}</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-gray-100 print:text-gray-900 print:border-gray-300">
                        {((data.total / report.totalSales) * 100).toFixed(1)}%
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900 print:border-gray-300">
                        {formatCurrency(data.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Till Reconciliation */}
        {report.expectedCash !== null && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 print:text-gray-900 print:border-gray-300">
              💵 Till Reconciliation
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg print:bg-gray-50">
                <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600">Expected Cash</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 print:text-gray-900">{formatCurrency(report.expectedCash)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg print:bg-gray-50">
                <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600">Cash Counted</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 print:text-gray-900">
                  {report.cashCounted !== null ? formatCurrency(report.cashCounted) : 'Not counted'}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg print:bg-gray-50">
                <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600">Variance</p>
                <p className={`text-xl font-bold ${
                  report.variance === null ? 'text-gray-500' :
                  report.variance > 0 ? 'text-green-600 dark:text-green-400' :
                  report.variance < 0 ? 'text-red-600 dark:text-red-400' :
                  'text-gray-900 dark:text-gray-100'
                } print:text-gray-900`}>
                  {report.variance !== null ? formatCurrency(report.variance) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Signature Section */}
        <div className="mt-8 pt-6 border-t-2 border-gray-300 dark:border-gray-600 print:border-gray-300">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 print:text-gray-900">Manager Signature</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 print:text-gray-700">Closing Manager:</label>
              <div className="border-b-2 border-gray-400 dark:border-gray-500 pb-1 mb-2 font-semibold text-gray-900 dark:text-gray-100 print:border-gray-400 print:text-gray-900">
                {report.managerName}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 print:text-gray-500">Closing Manager</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 print:text-gray-700">Date & Time:</label>
              <div className="border-b-2 border-gray-400 dark:border-gray-500 pb-1 mb-2 font-semibold text-gray-900 dark:text-gray-100 print:border-gray-400 print:text-gray-900">
                {formatDateTime(new Date(report.signedAt))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 print:text-gray-500">Report Locked</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 dark:border-gray-600 text-center text-xs text-gray-500 dark:text-gray-400 print:border-gray-300 print:text-gray-500">
          <p>This is a locked report for compliance and audit purposes. Keep with daily records.</p>
          <p className="mt-1">Report ID: {report.id}</p>
        </div>
      </div>
    </div>
  )
}
