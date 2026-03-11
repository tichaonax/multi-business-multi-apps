'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { formatDate, formatCurrency } from '@/lib/date-format'
import { useAlert } from '@/components/ui/confirm-modal'

const CARD_CLS = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5'
const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
const TH_CLS = 'text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider py-2 px-3'
const TD_CLS = 'py-2 px-3 text-sm text-gray-900 dark:text-gray-100'

interface BatchOption { id: string; batchNumber: string; status: string }
interface ReportData {
  batchNumber: string; status: string; purchaseDate: string; expectedCullDate?: string
  initialCount: number; currentAliveCount: number
  ageInDays: number; ageInWeeks: number; feedStage: string
  totalMortality: number; mortalityRate: number; mortalityByReason: Record<string, number>
  purchaseCost: number; totalFeedCost: number; totalMedCost: number; totalCost: number
  totalCulled: number; totalCulledWeightKg: number
  yieldPercent: number; costPerBird: number; costPerKg: number
  totalFeedKg: number; fcr: number
  feedLogs: Array<{ id: string; date: string; feedType: string; quantityKg: unknown; costPerKg: unknown; totalCost: unknown }>
  medicationLogs: Array<{ id: string; date: string; medicationName: string; totalCost: unknown }>
}
interface ProjectionData {
  currentCost: number; projectedTotalCost: number; projectedCostPerBird: number
  projectedCostPerKg: number; remainingDays: number; ageInDays: number
  costPerDay: number; expectedCullDate: string
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={CARD_CLS}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  )
}

export default function BatchCostReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const alert = useAlert()
  const { currentBusinessId, isAuthenticated, loading: bizLoading } = useBusinessPermissionsContext()

  const [batches, setBatches] = useState<BatchOption[]>([])
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [report, setReport] = useState<ReportData | null>(null)
  const [projection, setProjection] = useState<ProjectionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [projLoading, setProjLoading] = useState(false)

  const fetchBatches = useCallback(async () => {
    if (!currentBusinessId) return
    try {
      const res = await fetch(`/api/chicken-run/batches?businessId=${currentBusinessId}`, { credentials: 'include' })
      const json = await res.json()
      if (res.ok) setBatches(json.data || [])
    } catch { /* silent */ }
  }, [currentBusinessId])

  const fetchReport = useCallback(async (batchId: string) => {
    setLoading(true)
    setReport(null)
    setProjection(null)
    try {
      const res = await fetch(`/api/chicken-run/reports/batch/${batchId}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load report')
      setReport(json.data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      await alert({ title: 'Error', description: msg })
    } finally {
      setLoading(false)
    }

    // Fetch projection separately
    setProjLoading(true)
    try {
      const res2 = await fetch(`/api/chicken-run/reports/cost-projection/${batchId}`, { credentials: 'include' })
      const json2 = await res2.json()
      if (res2.ok) setProjection(json2.data)
    } catch { /* silent */ } finally {
      setProjLoading(false)
    }
  }, [alert])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    if (!currentBusinessId) return
    fetchBatches()
  }, [session, status, router, currentBusinessId, fetchBatches])

  useEffect(() => {
    if (selectedBatchId) fetchReport(selectedBatchId)
  }, [selectedBatchId, fetchReport])

  if (status === 'loading' || bizLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" /></div>
  }
  if (!session || !isAuthenticated) return null

  return (
    <ContentLayout title="Batch Cost Report">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <nav className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/chicken-run" className="hover:underline">Chicken Run</Link>
            <span className="mx-2">/</span>
            <Link href="/chicken-run/reports" className="hover:underline">Reports</Link>
            <span className="mx-2">/</span>
            <span>Batch Cost</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Batch Cost Report</h1>
        </div>

        {/* Batch selector */}
        <div className={CARD_CLS}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Batch</label>
          <select
            value={selectedBatchId}
            onChange={e => setSelectedBatchId(e.target.value)}
            className={INPUT_CLS}
          >
            <option value="">-- Select a batch --</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.batchNumber} ({b.status})</option>
            ))}
          </select>
        </div>

        {loading && <div className="text-center py-8 text-gray-400">Loading report...</div>}

        {report && (
          <>
            {/* Overview metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="Age" value={`${report.ageInWeeks}w ${report.ageInDays % 7}d`} />
              <MetricCard label="Feed Stage" value={report.feedStage} />
              <MetricCard label="Alive" value={`${report.currentAliveCount} / ${report.initialCount}`} />
              <MetricCard label="Mortality Rate" value={`${report.mortalityRate}%`} />
              <MetricCard label="Total Cost" value={formatCurrency(report.totalCost)} />
              <MetricCard label="Cost / Bird" value={formatCurrency(report.costPerBird)} />
              <MetricCard label="Cost / Kg" value={formatCurrency(report.costPerKg)} />
              <MetricCard label="FCR" value={report.fcr > 0 ? report.fcr.toFixed(3) : '—'} />
              <MetricCard label="Total Culled" value={report.totalCulled > 0 ? `${report.totalCulled} birds` : '—'} />
              <MetricCard label="Total Culled Kg" value={report.totalCulledWeightKg > 0 ? `${report.totalCulledWeightKg} kg` : '—'} />
              <MetricCard label="Yield %" value={`${report.yieldPercent}%`} />
              <MetricCard label="Total Feed Kg" value={`${report.totalFeedKg} kg`} />
            </div>

            {/* Cost breakdown */}
            <div className={CARD_CLS}>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Cost Breakdown</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className={TH_CLS}>Category</th>
                    <th className={`${TH_CLS} text-right`}>Amount</th>
                    <th className={`${TH_CLS} text-right`}>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Purchase Cost', value: report.purchaseCost },
                    { label: 'Feed Cost', value: report.totalFeedCost },
                    { label: 'Medication Cost', value: report.totalMedCost },
                  ].map(row => (
                    <tr key={row.label} className="border-b border-gray-100 dark:border-gray-700">
                      <td className={TD_CLS}>{row.label}</td>
                      <td className={`${TD_CLS} text-right`}>{formatCurrency(row.value)}</td>
                      <td className={`${TD_CLS} text-right`}>
                        {report.totalCost > 0 ? ((row.value / report.totalCost) * 100).toFixed(1) : '0'}%
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className={TD_CLS}>Total</td>
                    <td className={`${TD_CLS} text-right`}>{formatCurrency(report.totalCost)}</td>
                    <td className={`${TD_CLS} text-right`}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Feed logs */}
            {report.feedLogs.length > 0 && (
              <div className={CARD_CLS}>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Feed Log</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className={TH_CLS}>Date</th>
                      <th className={TH_CLS}>Type</th>
                      <th className={`${TH_CLS} text-right`}>Qty (kg)</th>
                      <th className={`${TH_CLS} text-right`}>Cost/kg</th>
                      <th className={`${TH_CLS} text-right`}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.feedLogs.map(f => (
                      <tr key={f.id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className={TD_CLS}>{formatDate(f.date)}</td>
                        <td className={TD_CLS}>{f.feedType}</td>
                        <td className={`${TD_CLS} text-right`}>{Number(f.quantityKg).toFixed(2)}</td>
                        <td className={`${TD_CLS} text-right`}>{formatCurrency(Number(f.costPerKg))}</td>
                        <td className={`${TD_CLS} text-right`}>{formatCurrency(Number(f.totalCost))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Medication logs */}
            {report.medicationLogs.length > 0 && (
              <div className={CARD_CLS}>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Medication Log</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className={TH_CLS}>Date</th>
                      <th className={TH_CLS}>Medication</th>
                      <th className={`${TH_CLS} text-right`}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.medicationLogs.map(m => (
                      <tr key={m.id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className={TD_CLS}>{formatDate(m.date)}</td>
                        <td className={TD_CLS}>{m.medicationName}</td>
                        <td className={`${TD_CLS} text-right`}>{formatCurrency(Number(m.totalCost))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mortality summary */}
            {report.totalMortality > 0 && (
              <div className={CARD_CLS}>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Mortality Summary ({report.totalMortality} deaths — {report.mortalityRate}%)
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {Object.entries(report.mortalityByReason).map(([reason, count]) => (
                    <div key={reason} className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{reason}</p>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">{count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cost projection */}
            {projLoading && <div className="text-center py-4 text-gray-400 text-sm">Loading projection...</div>}
            {projection && (
              <div className={CARD_CLS}>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Cost Projection</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Based on current spending rate of {formatCurrency(projection.costPerDay)}/day. Expected cull: {formatDate(projection.expectedCullDate)} ({projection.remainingDays} days remaining).
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard label="Current Total Cost" value={formatCurrency(projection.currentCost)} />
                  <MetricCard label="Projected Total" value={formatCurrency(projection.projectedTotalCost)} />
                  <MetricCard label="Proj. Cost/Bird" value={formatCurrency(projection.projectedCostPerBird)} />
                  <MetricCard label="Proj. Cost/Kg" value={formatCurrency(projection.projectedCostPerKg)} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ContentLayout>
  )
}
