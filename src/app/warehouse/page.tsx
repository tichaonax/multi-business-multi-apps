'use client'

export const dynamic = 'force-dynamic'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToastContext } from '@/components/ui/toast'

interface BatchSummary {
  id: string
  batchName: string
  batchNumber: string | null
  importedAt: string
  status: string
  rowCount: number
  itemCount: number
  movedCount: number
  totalYuanCost: number | null
  totalUsdCost: number | null
  transportCostHarare: number | null
  pickedUpFromHarare: boolean
  notes: string | null
  originalFileName: string
}

interface Stats {
  totalBatches: number
  inWarehouse: number
  movedToBusiness: number
  movedToPersonal: number
}

function formatUsd(v: number | null | undefined) {
  if (v == null) return '—'
  return `$${Number(v).toFixed(2)}`
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'ACTIVE'
    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>
}

export default function WarehousePage() {
  const router = useRouter()
  const toast = useToastContext()
  const [batches, setBatches] = useState<BatchSummary[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/warehouse?limit=50', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setBatches(data.batches || [])
        setStats(data.stats || null)
      } else {
        toast.error(data.error || 'Failed to load warehouse batches')
      }
    } catch {
      toast.error('Failed to load warehouse batches')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(batch: BatchSummary) {
    if (!confirm(`Delete batch "${batch.batchName}"?\n\nThis will permanently delete all ${batch.itemCount} items and images. This cannot be undone.`)) return
    setDeletingId(batch.id)
    try {
      const res = await fetch(`/api/warehouse/${batch.id}`, { method: 'DELETE', credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        toast.push('Batch deleted')
        load()
      } else {
        toast.error(data.error || 'Failed to delete batch')
      }
    } catch {
      toast.error('Failed to delete batch')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <ProtectedRoute>
      <ContentLayout title="Warehouse">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Warehouse</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Staging area for imported merchandise
              </p>
            </div>
            <Link
              href="/warehouse/import"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import Batch
            </Link>
          </div>

          {/* Stats bar */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Batches', value: stats.totalBatches, color: 'text-gray-900 dark:text-white' },
                { label: 'In Warehouse', value: stats.inWarehouse, color: 'text-blue-600 dark:text-blue-400' },
                { label: 'In Business', value: stats.movedToBusiness, color: 'text-green-600 dark:text-green-400' },
                { label: 'Personal', value: stats.movedToPersonal, color: 'text-purple-600 dark:text-purple-400' },
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Batches table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading batches…</div>
            ) : batches.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No batches imported yet.</p>
                <Link href="/warehouse/import" className="text-blue-600 hover:underline text-sm">
                  Import your first batch
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      {['Batch Name', 'Imported', 'Items', 'Progress', 'USD Total', 'Transport', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {batches.map(batch => {
                      const progress = batch.itemCount > 0 ? Math.round((batch.movedCount / batch.itemCount) * 100) : 0
                      return (
                        <tr key={batch.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white">{batch.batchName}</div>
                            <div className="text-xs text-gray-400 truncate max-w-[200px]" title={batch.originalFileName}>
                              {batch.originalFileName}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                            {new Date(batch.importedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-900 dark:text-white font-medium">
                            {batch.itemCount}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{batch.movedCount}/{batch.itemCount}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                            {formatUsd(batch.totalUsdCost)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                            {batch.pickedUpFromHarare ? formatUsd(batch.transportCostHarare) : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge status={batch.status} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/warehouse/${batch.id}`}
                                className="px-3 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 rounded-md transition-colors font-medium"
                              >
                                View
                              </Link>
                              {batch.status === 'ACTIVE' && batch.movedCount === 0 && (
                                <button
                                  onClick={() => handleDelete(batch)}
                                  disabled={deletingId === batch.id}
                                  className="px-3 py-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 rounded-md transition-colors font-medium disabled:opacity-50"
                                >
                                  {deletingId === batch.id ? 'Deleting…' : 'Delete'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </ContentLayout>
    </ProtectedRoute>
  )
}
