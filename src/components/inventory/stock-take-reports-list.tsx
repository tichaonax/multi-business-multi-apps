'use client'

import { useState, useEffect, useCallback } from 'react'
import { StockTakeReportDetail } from './stock-take-report-detail'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useToastContext } from '@/components/ui/toast'

interface ReportEmployee {
  id: string
  employeeId: string
  signedAt: string | null
  employee: { id: string; fullName: string; employeeNumber: string }
}

interface Report {
  id: string
  businessId: string
  status: 'PENDING_SIGNOFF' | 'SIGNED_OFF' | 'VOIDED'
  createdAt: string
  fullySignedOffAt: string | null
  totalShortfallQty: number
  totalShortfallValue: string | number
  totalNewStockValue: string | number
  employeeCount: number
  submittedBy: { id: string; name: string } | null
  managerSignedBy: { id: string; name: string } | null
  managerSignedAt: string | null
  employees: ReportEmployee[]
}

interface StockTakeReportsListProps {
  businessId: string
  businessName: string
  canManage: boolean   // true if canAccessFinancialData
  onClose: () => void
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PENDING_SIGNOFF: { label: 'Pending Sign-off', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  SIGNED_OFF:      { label: 'Signed Off',        cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  VOIDED:          { label: 'Voided',             cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
}

function fmt(n: number | string) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function StockTakeReportsList({ businessId, businessName, canManage, onClose }: StockTakeReportsListProps) {
  const confirm = useConfirm()
  const { push: toast, error: toastError } = useToastContext()

  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [voidingId, setVoidingId] = useState<string | null>(null)

  const handleVoid = async (id: string) => {
    const ok = await confirm({ title: 'Void stock take report?', description: 'This will mark the report as voided. Stock changes already recorded are not reversed.', confirmText: 'Void Report', cancelText: 'Cancel' })
    if (!ok) return
    setVoidingId(id)
    try {
      const res = await fetch(`/api/stock-take/reports/${id}/void`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const d = await res.json()
      if (d.success) {
        setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'VOIDED' } : r))
        toast('Report voided', { type: 'success' })
      } else {
        toastError(d.error || 'Void failed')
      }
    } catch {
      toastError('Void failed')
    } finally {
      setVoidingId(null)
    }
  }

  const fetchReports = useCallback(() => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ businessId, page: String(page), limit: '20' })
    if (statusFilter) params.set('status', statusFilter)
    fetch(`/api/stock-take/reports?${params}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) { setError(d.error || 'Failed to load reports'); return }
        setReports(d.data ?? [])
        setTotalPages(d.meta?.pages ?? 1)
      })
      .catch(() => setError('Failed to load reports'))
      .finally(() => setLoading(false))
  }, [businessId, page, statusFilter])

  useEffect(() => { fetchReports() }, [fetchReports])

  if (selectedReportId) {
    return (
      <StockTakeReportDetail
        reportId={selectedReportId}
        businessName={businessName}
        canManage={canManage}
        onBack={() => { setSelectedReportId(null); fetchReports() }}
        onClose={onClose}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          ← Back
        </button>
        <h1 className="font-bold text-gray-900 dark:text-white text-base">Stock Take Reports — {businessName}</h1>
        {/* Filter */}
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="ml-auto text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
          <option value="">All statuses</option>
          <option value="PENDING_SIGNOFF">Pending Sign-off</option>
          <option value="SIGNED_OFF">Signed Off</option>
          <option value="VOIDED">Voided</option>
        </select>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-12">{error}</div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <p className="text-lg">📋</p>
            <p className="text-sm mt-2">No stock take reports yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-max w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left min-w-[180px]">Employees</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Shortfall</th>
                  <th className="px-3 py-2 text-right">New Stock</th>
                  <th className="px-3 py-2 text-left">Submitted by</th>
                  <th className="px-3 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => {
                  const info = STATUS_LABEL[r.status] ?? { label: r.status, cls: '' }
                  const signedCount = r.employees.filter(e => e.signedAt).length
                  return (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString()}
                        <div className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {r.employees.map(e => (
                            <span key={e.id} className={`text-xs px-1.5 py-0.5 rounded-full ${e.signedAt ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                              {e.employee.fullName.split(' ')[0]}
                              {e.signedAt ? ' ✓' : ''}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{signedCount}/{r.employees.length} signed</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.cls}`}>{info.label}</span>
                        {r.fullySignedOffAt && (
                          <div className="text-xs text-gray-400 mt-0.5">{new Date(r.fullySignedOffAt).toLocaleDateString()}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {Number(r.totalShortfallQty) > 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">${fmt(r.totalShortfallValue)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-700 dark:text-gray-300">
                        ${fmt(r.totalNewStockValue)}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{r.submittedBy?.name ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setSelectedReportId(r.id)}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                            View
                          </button>
                          {canManage && r.status === 'PENDING_SIGNOFF' && (
                            <button onClick={() => handleVoid(r.id)} disabled={voidingId === r.id}
                              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 font-medium">
                              {voidingId === r.id ? '…' : 'Void'}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-center gap-3 py-3 border-t border-gray-200 dark:border-gray-700">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">
            ← Prev
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
