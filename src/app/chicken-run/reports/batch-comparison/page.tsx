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

interface BatchOption { id: string; batchNumber: string; status: string }
interface BatchMetrics {
  batchId: string; batchNumber: string; status: string; initialCount: number; ageInDays: number
  totalCost: number; costPerBird: number; costPerKg: number; fcr: number
  mortalityRate: number; yieldPercent: number; totalCulled: number; totalCulledWeightKg: number
}

const METRIC_ROWS: { key: keyof BatchMetrics; label: string; format: (v: unknown) => string }[] = [
  { key: 'totalCost', label: 'Total Cost', format: v => formatCurrency(Number(v)) },
  { key: 'costPerBird', label: 'Cost / Bird', format: v => formatCurrency(Number(v)) },
  { key: 'costPerKg', label: 'Cost / Kg', format: v => Number(v) > 0 ? formatCurrency(Number(v)) : '—' },
  { key: 'fcr', label: 'FCR', format: v => Number(v) > 0 ? Number(v).toFixed(3) : '—' },
  { key: 'mortalityRate', label: 'Mortality Rate', format: v => `${Number(v).toFixed(2)}%` },
  { key: 'yieldPercent', label: 'Yield %', format: v => `${Number(v).toFixed(2)}%` },
  { key: 'totalCulled', label: 'Total Culled (birds)', format: v => Number(v) > 0 ? String(v) : '—' },
  { key: 'totalCulledWeightKg', label: 'Total Culled Kg', format: v => Number(v) > 0 ? `${Number(v).toFixed(2)} kg` : '—' },
  { key: 'initialCount', label: 'Initial Count', format: v => String(v) },
  { key: 'ageInDays', label: 'Age (days)', format: v => String(v) },
]

export default function BatchComparisonPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const alert = useAlert()
  const { currentBusinessId, isAuthenticated, loading: bizLoading } = useBusinessPermissionsContext()

  const [batches, setBatches] = useState<BatchOption[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [comparison, setComparison] = useState<BatchMetrics[]>([])
  const [loading, setLoading] = useState(false)
  const [comparing, setComparing] = useState(false)

  const fetchBatches = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/chicken-run/batches?businessId=${currentBusinessId}`, { credentials: 'include' })
      const json = await res.json()
      if (res.ok) setBatches(json.data || [])
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [currentBusinessId])

  const runComparison = useCallback(async () => {
    if (!currentBusinessId || selectedIds.length < 2) return
    setComparing(true)
    try {
      const params = new URLSearchParams({ businessId: currentBusinessId, batchIds: selectedIds.join(',') })
      const res = await fetch(`/api/chicken-run/reports/batch-comparison?${params}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load comparison')
      setComparison(json.data || [])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      await alert({ title: 'Error', description: msg })
    } finally {
      setComparing(false)
    }
  }, [currentBusinessId, selectedIds, alert])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    if (!currentBusinessId) return
    fetchBatches()
  }, [session, status, router, currentBusinessId, fetchBatches])

  const toggleBatch = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  if (status === 'loading' || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }
  if (!session || !isAuthenticated) return null

  return (
    <ContentLayout title="Batch Comparison">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <nav className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/chicken-run" className="hover:underline">Chicken Run</Link>
            <span className="mx-2">/</span>
            <Link href="/chicken-run/reports" className="hover:underline">Reports</Link>
            <span className="mx-2">/</span>
            <span>Batch Comparison</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Batch Comparison</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select 2 or more batches to compare side-by-side</p>
        </div>

        {/* Batch selector */}
        <div className={CARD_CLS}>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Select Batches</h2>
          {loading ? (
            <p className="text-sm text-gray-400">Loading batches...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {batches.map(b => (
                <label
                  key={b.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                    selectedIds.includes(b.id)
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(b.id)}
                    onChange={() => toggleBatch(b.id)}
                    className="rounded"
                  />
                  <span className="text-gray-900 dark:text-gray-100">{b.batchNumber}</span>
                  <span className="text-xs text-gray-400">({b.status})</span>
                </label>
              ))}
            </div>
          )}
          <button
            onClick={runComparison}
            disabled={selectedIds.length < 2 || comparing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {comparing ? 'Comparing...' : `Compare (${selectedIds.length} selected)`}
          </button>
          {selectedIds.length === 1 && (
            <p className="text-xs text-gray-400 mt-2">Select at least one more batch to compare.</p>
          )}
        </div>

        {/* Comparison table */}
        {comparison.length >= 2 && (
          <div className={CARD_CLS}>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className={TH_CLS}>Metric</th>
                    {comparison.map(b => (
                      <th key={b.batchId} className={`${TH_CLS} text-right`}>{b.batchNumber}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {METRIC_ROWS.map(row => (
                    <tr key={row.key} className="border-b border-gray-100 dark:border-gray-700">
                      <td className={`${TD_CLS} font-medium text-gray-600 dark:text-gray-300`}>{row.label}</td>
                      {comparison.map(b => (
                        <td key={b.batchId} className={`${TD_CLS} text-right`}>
                          {row.format(b[row.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
