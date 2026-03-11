'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useAlert } from '@/components/ui/confirm-modal'

const CARD_CLS = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5'
const TH_CLS = 'text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider py-2 px-3'
const TD_CLS = 'py-2 px-3 text-sm text-gray-900 dark:text-gray-100'

const REASONS = ['DISEASE', 'INJURY', 'PREDATOR', 'UNKNOWN', 'OTHER']

interface BatchMortality {
  batchId: string
  batchNumber: string
  initialCount: number
  totalDeaths: number
  mortalityRate: number
  byReason: Record<string, number>
}
interface ReportData {
  byBatch: BatchMortality[]
  byReason: Record<string, number>
  totalDeaths: number
}

export default function MortalityReportPage() {
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
      const res = await fetch(`/api/chicken-run/reports/mortality?businessId=${currentBusinessId}`, { credentials: 'include' })
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }
  if (!session || !isAuthenticated) return null

  return (
    <ContentLayout title="Mortality Report">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <nav className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/chicken-run" className="hover:underline">Chicken Run</Link>
            <span className="mx-2">/</span>
            <Link href="/chicken-run/reports" className="hover:underline">Reports</Link>
            <span className="mx-2">/</span>
            <span>Mortality Trends</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mortality Trends</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Deaths by batch and reason across all batches</p>
        </div>

        {loading && <div className="text-center py-8 text-gray-400">Loading report...</div>}

        {report && (
          <>
            {/* Summary */}
            <div className={CARD_CLS}>
              <div className="flex items-center gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Deaths</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{report.totalDeaths}</p>
                </div>
              </div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Deaths by Reason</h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {REASONS.map(reason => {
                  const count = report.byReason[reason] ?? 0
                  const pct = report.totalDeaths > 0 ? ((count / report.totalDeaths) * 100).toFixed(1) : '0.0'
                  return (
                    <div key={reason} className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{reason}</p>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">{count}</p>
                      <p className="text-xs text-gray-400">{pct}%</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Per-batch breakdown */}
            <div className={CARD_CLS}>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Per-Batch Breakdown</h2>
              {report.byBatch.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">No batches found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-600">
                        <th className={TH_CLS}>Batch</th>
                        <th className={`${TH_CLS} text-right`}>Initial</th>
                        <th className={`${TH_CLS} text-right`}>Deaths</th>
                        <th className={`${TH_CLS} text-right`}>Rate %</th>
                        {REASONS.map(r => <th key={r} className={`${TH_CLS} text-right`}>{r}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {report.byBatch.map(b => (
                        <tr key={b.batchId} className="border-b border-gray-100 dark:border-gray-700">
                          <td className={TD_CLS}>{b.batchNumber}</td>
                          <td className={`${TD_CLS} text-right`}>{b.initialCount}</td>
                          <td className={`${TD_CLS} text-right font-semibold text-red-600 dark:text-red-400`}>{b.totalDeaths}</td>
                          <td className={`${TD_CLS} text-right`}>{b.mortalityRate}%</td>
                          {REASONS.map(r => (
                            <td key={r} className={`${TD_CLS} text-right`}>{b.byReason[r] ?? 0}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ContentLayout>
  )
}
