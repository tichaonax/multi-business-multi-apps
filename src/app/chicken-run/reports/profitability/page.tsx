'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { formatCurrency } from '@/lib/date-format'
import { useAlert } from '@/components/ui/confirm-modal'

const CARD_CLS = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5'
const TH_CLS = 'text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider py-2 px-3'
const TD_CLS = 'py-2 px-3 text-sm text-gray-900 dark:text-gray-100'

interface BatchRow {
  batchId: string; batchNumber: string; status: string
  totalCulled: number; totalCulledWeightKg: number; totalCost: number; raisedCostPerKg: number
}
interface ReportData {
  batches: BatchRow[]
  raisedAvgCostPerKg: number
  purchasedAvgCostPerKg: number
  savingsPerKg: number
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className={CARD_CLS}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ?? 'text-gray-900 dark:text-gray-100'}`}>{value}</p>
    </div>
  )
}

export default function ProfitabilityReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const alert = useAlert()
  const { currentBusinessId, isAuthenticated, loading: bizLoading } = useBusinessPermissionsContext()

  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchReport = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/chicken-run/reports/profitability?businessId=${currentBusinessId}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load report')
      setReport(json.data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      await alert({ title: 'Error', description: msg })
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, alert])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    if (!currentBusinessId) return
    fetchReport()
  }, [session, status, router, currentBusinessId, fetchReport])

  if (status === 'loading' || bizLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" /></div>
  }
  if (!session || !isAuthenticated) return null

  return (
    <ContentLayout title="Profitability Report">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <nav className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/chicken-run" className="hover:underline">Chicken Run</Link>
            <span className="mx-2">/</span>
            <Link href="/chicken-run/reports" className="hover:underline">Reports</Link>
            <span className="mx-2">/</span>
            <span>Profitability</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profitability</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Raised vs purchased cost/kg comparison</p>
        </div>

        {loading && <div className="text-center py-8 text-gray-400">Loading report...</div>}

        {report && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SummaryCard
                label="Raised Avg Cost/Kg"
                value={report.raisedAvgCostPerKg > 0 ? formatCurrency(report.raisedAvgCostPerKg) : '—'}
              />
              <SummaryCard
                label="Purchased Avg Cost/Kg"
                value={report.purchasedAvgCostPerKg > 0 ? formatCurrency(report.purchasedAvgCostPerKg) : '—'}
              />
              <SummaryCard
                label="Savings per Kg (Raised)"
                value={report.savingsPerKg !== 0 ? formatCurrency(Math.abs(report.savingsPerKg)) : '—'}
                highlight={report.savingsPerKg > 0 ? 'text-green-600 dark:text-green-400' : report.savingsPerKg < 0 ? 'text-red-600 dark:text-red-400' : undefined}
              />
            </div>

            {report.savingsPerKg !== 0 && (
              <div className={`${CARD_CLS} ${report.savingsPerKg > 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {report.savingsPerKg > 0
                    ? `Raising your own chickens saves ${formatCurrency(report.savingsPerKg)}/kg compared to purchasing.`
                    : `Purchasing chickens is ${formatCurrency(Math.abs(report.savingsPerKg))}/kg cheaper than raising your own.`
                  }
                </p>
              </div>
            )}

            <div className={CARD_CLS}>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Per-Batch Breakdown</h2>
              {report.batches.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">No completed batches with culling data yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className={TH_CLS}>Batch</th>
                      <th className={TH_CLS}>Status</th>
                      <th className={`${TH_CLS} text-right`}>Culled (birds)</th>
                      <th className={`${TH_CLS} text-right`}>Total Kg</th>
                      <th className={`${TH_CLS} text-right`}>Total Cost</th>
                      <th className={`${TH_CLS} text-right`}>Cost/Kg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.batches.map(b => (
                      <tr key={b.batchId} className="border-b border-gray-100 dark:border-gray-700">
                        <td className={TD_CLS}>{b.batchNumber}</td>
                        <td className={TD_CLS}>{b.status}</td>
                        <td className={`${TD_CLS} text-right`}>{b.totalCulled}</td>
                        <td className={`${TD_CLS} text-right`}>{b.totalCulledWeightKg} kg</td>
                        <td className={`${TD_CLS} text-right`}>{formatCurrency(b.totalCost)}</td>
                        <td className={`${TD_CLS} text-right font-semibold`}>{formatCurrency(b.raisedCostPerKg)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {report.raisedAvgCostPerKg > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 dark:border-gray-500 font-semibold">
                        <td className={TD_CLS} colSpan={5}>Raised Average</td>
                        <td className={`${TD_CLS} text-right`}>{formatCurrency(report.raisedAvgCostPerKg)}</td>
                      </tr>
                      {report.purchasedAvgCostPerKg > 0 && (
                        <tr className="text-blue-700 dark:text-blue-400">
                          <td className={TD_CLS} colSpan={5}>Purchased Average (reference)</td>
                          <td className={`${TD_CLS} text-right`}>{formatCurrency(report.purchasedAvgCostPerKg)}</td>
                        </tr>
                      )}
                    </tfoot>
                  )}
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </ContentLayout>
  )
}
