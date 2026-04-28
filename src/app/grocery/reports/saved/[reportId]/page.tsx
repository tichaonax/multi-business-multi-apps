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
            href="/grocery/reports/history"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← Back to Reports
          </Link>
        </div>
      </div>
    )
  }

  const reportData = report.reportData
  const businessType = report.business?.type || 'grocery'
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
            href="/grocery/reports/history"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
          >
            📅 All Saved Reports
          </Link>
          <Link
            href="/grocery/reports/end-of-day"
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

        {/* EcoCash Breakdown */}
        {reportData.ecocashBreakdown && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 print:text-gray-900 print:border-gray-300">
              📱 EcoCash Breakdown
            </h3>
            <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-teal-600 dark:text-teal-400">Gross Total ({reportData.ecocashBreakdown.count} orders)</p>
                  <p className="text-lg font-bold text-teal-700 dark:text-teal-300">{formatCurrency(reportData.ecocashBreakdown.grossTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-red-500 dark:text-red-400">Fees Deducted</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">-{formatCurrency(reportData.ecocashBreakdown.fees)}</p>
                </div>
                <div>
                  <p className="text-xs text-teal-600 dark:text-teal-400">Net Received</p>
                  <p className="text-lg font-bold text-teal-700 dark:text-teal-300">{formatCurrency(reportData.ecocashBreakdown.netTotal)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Till Reconciliation */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 print:text-gray-900 print:border-gray-300">
            💵 Till Reconciliation
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg print:bg-gray-50">
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600">Expected Cash</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 print:text-gray-900">
                {report.expectedCash !== null ? formatCurrency(report.expectedCash) : '—'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg print:bg-gray-50">
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600">Cash Counted</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 print:text-gray-900">
                {report.cashCounted !== null ? formatCurrency(report.cashCounted) : '—'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg print:bg-gray-50">
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600">Variance</p>
              <p className={`text-xl font-bold ${
                report.variance === null ? 'text-gray-500' :
                report.variance > 0 ? 'text-yellow-600 dark:text-yellow-400' :
                report.variance < 0 ? 'text-red-600 dark:text-red-400' :
                'text-green-600 dark:text-green-400'
              } print:text-gray-900`}>
                {report.variance !== null ? (report.variance > 0 ? '+' : '') + formatCurrency(report.variance) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Salesperson EOD Submissions — shown when records exist */}
        {report.salespersonEodRecords && report.salespersonEodRecords.length > 0 && (() => {
          const records: any[] = report.salespersonEodRecords
          const pendingCount = records.filter((r: any) => r.status === 'PENDING').length
          const overrideCount = records.filter((r: any) => r.status === 'OVERRIDDEN').length
          const spCashTotal = report.salespersonCashTotal ?? records.filter((r: any) => r.status !== 'PENDING').reduce((s: number, r: any) => s + Number(r.cashAmount), 0)
          const spEcoTotal = report.salespersonEcocashTotal ?? records.filter((r: any) => r.status !== 'PENDING').reduce((s: number, r: any) => s + Number(r.ecocashAmount), 0)
          const cashVariance = report.cashCounted !== null ? (Number(report.cashCounted) - spCashTotal) : null
          const hasIssues = pendingCount > 0 || overrideCount > 0 || (cashVariance !== null && Math.abs(cashVariance) > 0.01)
          return (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 print:text-gray-900">
                  👥 Salesperson EOD Submissions
                </h3>
                {hasIssues
                  ? <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 print:bg-red-100 print:text-red-700">⚠️ ISSUES FOUND</span>
                  : <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 print:bg-green-100 print:text-green-700">✅ ALL CLEAR</span>
                }
              </div>

              {/* Issue flags */}
              {pendingCount > 0 && (
                <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-800 dark:text-red-200 print:bg-red-50 print:text-red-800">
                  <span className="font-bold">⛔</span>
                  <span><strong>{pendingCount} salesperson{pendingCount > 1 ? 's' : ''} did not submit</strong> their EOD report before books were closed.</span>
                </div>
              )}
              {overrideCount > 0 && (
                <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-200 print:bg-amber-50 print:text-amber-800">
                  <span className="font-bold">⚠️</span>
                  <span><strong>{overrideCount} report{overrideCount > 1 ? 's' : ''} were manager-overridden</strong> — submitted on behalf of salesperson.</span>
                </div>
              )}
              {cashVariance !== null && Math.abs(cashVariance) > 0.01 && (
                <div className={`mb-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm border print:bg-yellow-50 print:text-yellow-800 ${cashVariance > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200' : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'}`}>
                  <span className="font-bold">{cashVariance > 0 ? '💰' : '❌'}</span>
                  <span>
                    <strong>Cash discrepancy:</strong> Salespersons reported {formatCurrency(spCashTotal)} cash; manager counted {formatCurrency(Number(report.cashCounted))}.{' '}
                    {cashVariance > 0 ? `Cash over by ${formatCurrency(cashVariance)}.` : `Cash short by ${formatCurrency(Math.abs(cashVariance))}.`}
                  </span>
                </div>
              )}

              {/* Per-person table */}
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700 print:bg-gray-100">
                    <tr>
                      <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Salesperson</th>
                      <th className="text-center p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Status</th>
                      <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Cash</th>
                      <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">EcoCash</th>
                      <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">Submitted</th>
                      <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 print:text-gray-900">By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r: any) => (
                      <tr key={r.id} className={`border-t border-gray-200 dark:border-gray-700 ${r.status === 'PENDING' ? 'bg-red-50 dark:bg-red-900/10 print:bg-red-50' : ''}`}>
                        <td className="p-3 font-medium text-gray-900 dark:text-gray-100 print:text-gray-900">{r.salesperson.name}</td>
                        <td className="p-3 text-center">
                          {r.status === 'SUBMITTED' && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 print:bg-green-100 print:text-green-700">Submitted</span>}
                          {r.status === 'OVERRIDDEN' && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 print:bg-purple-100 print:text-purple-700">Override</span>}
                          {r.status === 'PENDING' && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 print:bg-red-100 print:text-red-700">⛔ Not submitted</span>}
                        </td>
                        <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">
                          {r.status === 'PENDING' ? <span className="text-gray-400">—</span> : formatCurrency(Number(r.cashAmount))}
                        </td>
                        <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">
                          {r.status === 'PENDING' ? <span className="text-gray-400">—</span> : formatCurrency(Number(r.ecocashAmount))}
                        </td>
                        <td className="p-3 text-right text-xs text-gray-500 dark:text-gray-400 print:text-gray-600">
                          {r.submittedAt ? new Date(r.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="p-3 text-xs text-gray-600 dark:text-gray-400 print:text-gray-600">
                          {r.isManagerOverride && r.submittedBy ? `${r.submittedBy.name} (mgr)` : (r.submittedBy?.name || '—')}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 font-bold print:bg-gray-100">
                      <td className="p-3 text-gray-900 dark:text-gray-100 print:text-gray-900" colSpan={2}>TOTALS (submitted)</td>
                      <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">{formatCurrency(spCashTotal)}</td>
                      <td className="p-3 text-right text-gray-900 dark:text-gray-100 print:text-gray-900">{formatCurrency(spEcoTotal)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}

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
