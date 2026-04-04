'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useConfirm, useAlert } from '@/components/ui/confirm-modal'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface Business {
  id: string
  name: string
  type: string
}

interface AllocationItem {
  accountName: string
  amount: number
}

interface BucketBalance {
  businessId: string
  business: Business | null
  cashInflow: number
  cashOutflow: number
  cashBalance: number
  ecocashInflow: number
  ecocashOutflow: number
  ecocashBalance: number
  inflow: number
  outflow: number
  balance: number
  allocations: AllocationItem[]
  allocatedTotal: number
  physicalCash: number
}

interface BucketEntry {
  id: string
  businessId: string
  business: Business | null
  entryType: string
  direction: string
  amount: number
  referenceType: string | null
  referenceId: string | null
  notes: string | null
  paymentChannel: string
  entryDate: string
  createdAt: string
  createdBy: { id: string; name: string } | null
  editedAt: string | null
  editedBy: { id: string; name: string } | null
  deletedAt: string | null
  deletedBy: { id: string; name: string } | null
  deletionReason: string | null
  pettyCashStatus: string | null
  pettyCashRequestedAt: string | null
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

const ENTRY_TYPE_LABEL: Record<string, string> = {
  EOD_RECEIPT:       '💵 EOD Receipt',
  PAYMENT_APPROVAL:  '✅ Payment Approval',
  PETTY_CASH:        '🪙 Petty Cash',
  CASH_ALLOCATION:   '📋 Cash Allocation',
}

// ── EOD Summary panel (inline, no navigation) ─────────────────────────────────
function EodSummaryPanel({ eodSummary, fmt }: { eodSummary: any; fmt: (n: number) => string }) {
  const [reportModal, setReportModal] = useState<{ id: string; label: string } | null>(null)
  const [reportData, setReportData] = useState<Record<string, any>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const openReport = async (reportId: string, label: string) => {
    setReportModal({ id: reportId, label })
    if (reportData[reportId]) return
    setLoadingId(reportId)
    try {
      const res = await fetch(`/api/reports/saved/${reportId}`, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setReportData(prev => ({ ...prev, [reportId]: json.report }))
      }
    } finally {
      setLoadingId(null)
    }
  }

  const totalGroupSales = eodSummary.reports.reduce((s: number, r: any) => s + r.totalSales, 0)
  const activeReport = reportModal ? reportData[reportModal.id] : null

  return (
    <>
      <div className="flex-1 overflow-y-auto space-y-3">
        {/* Header row */}
        <div className="flex items-center gap-2 flex-wrap">
          {eodSummary.isGrouped && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              📦 Grouped EOD — {eodSummary.reports.length} day{eodSummary.reports.length !== 1 ? 's' : ''}
            </span>
          )}
          {eodSummary.lockedAt && (
            <span className="text-xs text-secondary">
              Locked {new Date(eodSummary.lockedAt).toLocaleString()}
            </span>
          )}
        </div>

        {/* Grouped totals banner */}
        {eodSummary.isGrouped && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 px-3 py-2.5 space-y-1.5">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
              Group Totals — signed off by {eodSummary.groupManagerName ?? '—'}
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-secondary">Combined Sales</p>
                <p className="font-bold text-emerald-700 dark:text-emerald-300">{fmt(totalGroupSales)}</p>
              </div>
              <div>
                <p className="text-secondary">💵 Cash Counted</p>
                <p className={`font-bold ${eodSummary.groupTotalCash != null ? 'text-primary' : 'text-gray-400'}`}>
                  {eodSummary.groupTotalCash != null ? fmt(eodSummary.groupTotalCash) : '—'}
                </p>
              </div>
              {eodSummary.groupTotalEcocash != null && eodSummary.groupTotalEcocash > 0 && (
                <div>
                  <p className="text-secondary">📱 EcoCash</p>
                  <p className="font-bold text-teal-600 dark:text-teal-400">{fmt(eodSummary.groupTotalEcocash)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Per-day breakdown */}
        {eodSummary.reports.length === 0 ? (
          <p className="text-sm text-secondary py-2">No saved EOD reports linked to this deposit.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide">
              {eodSummary.isGrouped ? 'Days Included' : 'EOD Report'}
            </p>
            {eodSummary.reports.map((r: any) => {
              const reportDate = new Date(r.reportDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
              const periodStart = new Date(r.periodStart).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
              const periodEnd = new Date(r.periodEnd).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
              const isLoading = loadingId === r.id
              return (
                <div key={r.id} className="rounded-lg border border-border bg-gray-50 dark:bg-gray-700/30 px-3 py-2.5 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary">📅 {reportDate}</p>
                    <p className="text-xs text-secondary">Period: {periodStart} → {periodEnd} · Manager: {r.managerName}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs space-y-0.5 mr-3">
                    <div>
                      <span className="text-secondary">Sales </span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">{fmt(r.totalSales)}</span>
                    </div>
                    {!eodSummary.isGrouped && r.cashCounted != null && (
                      <div>
                        <span className="text-secondary">Cash </span>
                        <span className="font-semibold text-primary">{fmt(r.cashCounted)}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => openReport(r.id, reportDate)}
                    disabled={isLoading}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? '…' : '📄 View Report'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Nested report modal — z-[60] sits above parent modal z-50 */}
      {reportModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 overflow-y-auto py-6 px-4" onClick={() => setReportModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            {/* Report modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-border rounded-t-lg">
              <div>
                <p className="text-sm font-semibold text-primary">📄 EOD Report — {reportModal.label}</p>
                <p className="text-xs text-secondary">{eodSummary.reports.find((r: any) => r.id === reportModal.id)?.notes ?? ''}</p>
              </div>
              <button onClick={() => setReportModal(null)} className="text-secondary hover:text-primary text-lg leading-none ml-4">✕</button>
            </div>

            <div className="p-4 space-y-4">
              {!activeReport ? (
                <p className="text-sm text-secondary text-center py-8">Loading report…</p>
              ) : (
                <>
                  {/* Header info */}
                  <div className="text-center pb-3 border-b border-border">
                    <p className="font-bold text-primary text-base">{activeReport.business?.name}</p>
                    <p className="text-xs text-secondary mt-1">
                      {new Date(activeReport.reportDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-secondary">
                      Period: {new Date(activeReport.periodStart).toLocaleString()} → {new Date(activeReport.periodEnd).toLocaleString()}
                    </p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                      🔒 Signed by {activeReport.managerName}
                    </span>
                  </div>

                  {/* Sales summary */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <p className="text-xs text-secondary mb-0.5">Total Revenue</p>
                      <p className="font-bold text-emerald-700 dark:text-emerald-300 text-lg">{fmt(Number(activeReport.totalSales))}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <p className="text-xs text-secondary mb-0.5">Total Orders</p>
                      <p className="font-bold text-blue-600 dark:text-blue-400 text-lg">{activeReport.totalOrders}</p>
                    </div>
                    {activeReport.cashCounted != null && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <p className="text-xs text-secondary mb-0.5">💵 Cash Counted</p>
                        <p className="font-bold text-primary text-lg">{fmt(Number(activeReport.cashCounted))}</p>
                      </div>
                    )}
                    {activeReport.variance != null && (
                      <div className={`rounded-lg p-3 ${Number(activeReport.variance) === 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                        <p className="text-xs text-secondary mb-0.5">Variance</p>
                        <p className={`font-bold text-lg ${Number(activeReport.variance) === 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                          {fmt(Number(activeReport.variance))}
                        </p>
                      </div>
                    )}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <p className="text-xs text-secondary mb-0.5">Receipts Issued</p>
                      <p className="font-bold text-primary text-lg">{activeReport.receiptsIssued}</p>
                    </div>
                  </div>

                  {/* Payment methods */}
                  {activeReport.reportData?.paymentMethods && Object.keys(activeReport.reportData.paymentMethods).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">💳 Payment Methods</p>
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-secondary">
                          <tr>
                            <th className="px-3 py-1.5 text-left">Method</th>
                            <th className="px-3 py-1.5 text-right">Orders</th>
                            <th className="px-3 py-1.5 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {Object.entries(activeReport.reportData.paymentMethods).map(([method, data]: [string, any]) => (
                            <tr key={method} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                              <td className="px-3 py-2 text-primary">{method}</td>
                              <td className="px-3 py-2 text-right text-secondary">{data.count}</td>
                              <td className="px-3 py-2 text-right font-semibold text-primary">{fmt(data.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 dark:bg-gray-700/50">
                          <tr>
                            <td colSpan={2} className="px-3 py-1.5 text-xs font-semibold text-secondary text-right">Total</td>
                            <td className="px-3 py-1.5 text-right font-bold text-primary">
                              {fmt(Object.values(activeReport.reportData.paymentMethods).reduce((s: number, d: any) => s + d.total, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* Categories */}
                  {activeReport.reportData?.categorySales && Object.keys(activeReport.reportData.categorySales).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">📦 Categories</p>
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-secondary">
                          <tr>
                            <th className="px-3 py-1.5 text-left">Category</th>
                            <th className="px-3 py-1.5 text-right">Orders</th>
                            <th className="px-3 py-1.5 text-right">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {Object.entries(activeReport.reportData.categorySales).map(([cat, data]: [string, any]) => (
                            <tr key={cat} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                              <td className="px-3 py-2 text-primary">{cat}</td>
                              <td className="px-3 py-2 text-right text-secondary">{data.count}</td>
                              <td className="px-3 py-2 text-right font-semibold text-emerald-700 dark:text-emerald-300">{fmt(data.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 text-center pt-1 border-t border-border">Report ID: {reportModal.id}</p>
                </>
              )}
            </div>

            <div className="sticky bottom-0 px-4 py-3 bg-white dark:bg-gray-800 border-t border-border rounded-b-lg">
              <button
                onClick={() => setReportModal(null)}
                className="w-full py-2 px-4 rounded-md text-sm font-medium border border-border text-secondary hover:bg-gray-50 dark:hover:bg-gray-700/30"
              >
                ← Back to EOD Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


export default function CashBucketPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const confirm = useConfirm()
  const alert = useAlert()

  const sessionUser = (session?.user as any)
  const currentUserId: string | undefined = sessionUser?.id
  const isAdmin: boolean = sessionUser?.role === 'admin'
  // canDeleteCashBucketEntry: true if admin, or if the permission is in the session permissions object
  const canDeleteBucketEntry: boolean = isAdmin || (sessionUser?.permissions?.canDeleteCashBucketEntry === true)

  const [totalBalance, setTotalBalance] = useState(0)
  const [totalAllocated, setTotalAllocated] = useState(0)
  const [totalPhysicalCash, setTotalPhysicalCash] = useState(0)
  const [balances, setBalances] = useState<BucketBalance[]>([])
  const [entries, setEntries] = useState<BucketEntry[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [selectedBiz, setSelectedBiz] = useState('')
  const [amount, setAmount] = useState('')
  const [ecocashAmount, setEcocashAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0])
  const [expectedEcocash, setExpectedEcocash] = useState<number | null>(null)

  // Edit modal state
  const [editEntry, setEditEntry] = useState<BucketEntry | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Delete modal state
  const [deleteEntry, setDeleteEntry] = useState<BucketEntry | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  // Filter / search state
  const [search, setSearch] = useState('')
  const [datePreset, setDatePreset] = useState<string>('7d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Resolve start/end from preset
  const getDateRange = (preset: string): { startDate: string; endDate: string } => {
    const today = new Date()
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    const ago = (days: number) => { const d = new Date(today); d.setDate(d.getDate() - days); return d }
    if (preset === 'today')    return { startDate: fmt(today), endDate: fmt(today) }
    if (preset === 'yesterday'){ const y = ago(1); return { startDate: fmt(y), endDate: fmt(y) } }
    if (preset === '7d')       return { startDate: fmt(ago(6)), endDate: fmt(today) }
    if (preset === '30d')      return { startDate: fmt(ago(29)), endDate: fmt(today) }
    if (preset === '90d')      return { startDate: fmt(ago(89)), endDate: fmt(today) }
    if (preset === 'custom')   return { startDate: customStart, endDate: customEnd }
    return { startDate: '', endDate: '' } // 'all'
  }

  // Detail modal state (PAYMENT_APPROVAL / PETTY_CASH / EOD_RECEIPT)
  const [detailEntry, setDetailEntry] = useState<BucketEntry | null>(null)
  const [detailData, setDetailData] = useState<{ payments: any[]; pettyCash: any; eodSummary: any } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const openDetailModal = async (entry: BucketEntry) => {
    setDetailEntry(entry)
    setDetailData(null)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/cash-bucket/${entry.id}`, { credentials: 'include' })
      const json = await res.json()
      if (res.ok) setDetailData({ payments: json.data.payments ?? [], pettyCash: json.data.pettyCash ?? null, eodSummary: json.data.eodSummary ?? null })
    } finally {
      setDetailLoading(false)
    }
  }


  const load = useCallback(async (opts?: { preset?: string; start?: string; end?: string; type?: string }) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200' })
      const preset = opts?.preset ?? datePreset
      const { startDate, endDate } = preset === 'custom'
        ? { startDate: opts?.start ?? customStart, endDate: opts?.end ?? customEnd }
        : getDateRange(preset)
      if (startDate) params.set('startDate', startDate)
      if (endDate)   params.set('endDate', endDate)
      const type = opts?.type ?? typeFilter
      if (type) params.set('entryType', type)
      const res = await fetch(`/api/cash-bucket?${params}`, { credentials: 'include' })
      if (!res.ok) { router.push('/dashboard'); return }
      const json = await res.json()
      setTotalBalance(json.data.totalBalance)
      setTotalAllocated(json.data.totalAllocated ?? 0)
      setTotalPhysicalCash(json.data.totalPhysicalCash ?? 0)
      setBalances(json.data.balances)
      setEntries(json.data.entries)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, datePreset, customStart, customEnd, typeFilter])

  const loadBusinesses = useCallback(async () => {
    const res = await fetch('/api/admin/businesses', { credentials: 'include' })
    if (res.ok) {
      const json = await res.json()
      setBusinesses(Array.isArray(json) ? json : (json.data ?? []))
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/signin'); return }
    if (status === 'authenticated') { load(); loadBusinesses() }
  }, [status, load, loadBusinesses, router])

  useEffect(() => {
    if (!selectedBiz || !entryDate) { setExpectedEcocash(null); return }
    fetch(`/api/cash-bucket?expectedEcocash=true&businessId=${selectedBiz}&date=${entryDate}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => setExpectedEcocash(j.data?.expectedEcocash ?? null))
      .catch(() => setExpectedEcocash(null))
  }, [selectedBiz, entryDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBiz || !amount || !notes.trim()) return

    const bizName = businesses.find(b => b.id === selectedBiz)?.name ?? 'this business'
    const cashAmt = Number(amount)
    const ecoAmt = Number(ecocashAmount || 0)
    const lines = [`💵 Cash: ${fmt(cashAmt)}`]
    if (ecoAmt > 0) lines.push(`📱 EcoCash: ${fmt(ecoAmt)}`)
    const ok = await confirm({
      title: 'Record EOD Receipt',
      description: `Record EOD receipt for ${bizName}?\n${lines.join('\n')}`,
      confirmText: 'Record',
    })
    if (!ok) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/cash-bucket', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: selectedBiz, amount: cashAmt, ecocashAmount: ecoAmt, notes, entryDate }),
      })
      const json = await res.json()
      if (res.ok) {
        setAmount('')
        setEcocashAmount('')
        setNotes('')
        setEntryDate(new Date().toISOString().split('T')[0])
        await load()
      } else {
        await alert({ title: 'Error', description: json.error ?? 'Failed to record receipt' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (entry: BucketEntry) => {
    setEditEntry(entry)
    setEditAmount(String(entry.amount))
    setEditNotes(entry.notes ?? '')
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editEntry) return
    setEditSubmitting(true)
    try {
      const res = await fetch(`/api/cash-bucket/${editEntry.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(editAmount), notes: editNotes }),
      })
      const json = await res.json()
      if (res.ok) {
        setEditEntry(null)
        await load()
      } else {
        await alert({ title: 'Error', description: json.error ?? 'Failed to update entry' })
      }
    } finally {
      setEditSubmitting(false)
    }
  }

  const openDeleteModal = (entry: BucketEntry) => {
    setDeleteEntry(entry)
    setDeleteReason('')
  }

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deleteEntry || !deleteReason.trim()) return
    setDeleteSubmitting(true)
    try {
      const res = await fetch(`/api/cash-bucket/${deleteEntry.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason }),
      })
      const json = await res.json()
      if (res.ok) {
        setDeleteEntry(null)
        await load()
      } else {
        await alert({ title: 'Error', description: json.error ?? 'Failed to delete entry' })
      }
    } finally {
      setDeleteSubmitting(false)
    }
  }

  return (
    <ContentLayout
      title="💰 Cash Bucket"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Cash Bucket', isActive: true },
      ]}
    >
      <div className="space-y-6">

        {/* Total balance banner */}
        {(() => {
          const totalEcocash = balances.reduce((s, b) => s + b.ecocashBalance, 0)
          return (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 px-5 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                  🪣 Cash Bucket — What's in the box right now
                </p>
                <Link href="/cash-bucket/report" className="text-xs text-emerald-600 dark:text-emerald-400 underline hover:no-underline">
                  View Full Report →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                {/* Physical cash card — the star of the show */}
                <div className="sm:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-emerald-200 dark:border-emerald-700 px-4 py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    💵 Physical Cash — count this when you open the box
                  </p>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{fmt(totalPhysicalCash)}</p>
                  <div className="mt-2 space-y-1 text-sm border-t border-gray-100 dark:border-gray-700 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">├── ✅ Free / available for payments</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(totalBalance)}</span>
                    </div>
                    {totalAllocated > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 dark:text-gray-400">└── 🔒 Earmarked (set aside this month)</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">{fmt(totalAllocated)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* EcoCash wallet */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-teal-200 dark:border-teal-700 px-4 py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">📱 EcoCash Wallet</p>
                  <p className="text-3xl font-bold text-teal-700 dark:text-teal-300">{fmt(totalEcocash)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    Not in the cashbox — held in EcoCash
                  </p>
                </div>
              </div>
            </div>
          )
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Record EOD Receipt form */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-border bg-card p-4 space-y-4">
              <h2 className="text-sm font-semibold text-primary">Record EOD Cash Receipt</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Business</label>
                  <SearchableSelect
                    options={businesses.map(b => ({ value: b.id, label: b.name }))}
                    value={selectedBiz}
                    onChange={setSelectedBiz}
                    placeholder="Search business…"
                    allLabel="Select business…"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">💵 Cash Amount</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    📱 EcoCash Amount
                    {expectedEcocash !== null && (
                      <span className="ml-2 text-teal-600 dark:text-teal-400 font-normal">
                        (expected: {fmt(expectedEcocash)})
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ecocashAmount}
                    onChange={e => setEcocashAmount(e.target.value)}
                    placeholder="0.00 (optional)"
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-primary focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Date</label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={e => setEntryDate(e.target.value)}
                    required
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Notes <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    required
                    placeholder="e.g. Restaurant closing shift"
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedBiz || !amount || !notes.trim()}
                  className="w-full py-2 px-4 rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Recording…' : '💵 Record Receipt'}
                </button>
              </form>
            </div>
          </div>

          {/* Per-business balances */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold text-primary">Per-Business Breakdown</h2>
            {loading ? (
              <p className="text-sm text-secondary">Loading…</p>
            ) : balances.length === 0 ? (
              <p className="text-sm text-secondary">No entries yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {balances.map(b => (
                    <div key={b.businessId} className="rounded-lg border border-border bg-card px-4 py-3 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-secondary uppercase tracking-wide truncate">{b.business?.name ?? b.businessId}</p>
                      </div>

                      {/* Physical cash section */}
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 dark:text-gray-400 font-medium">💵 Physical cash to count</span>
                          <span className="font-bold text-base text-emerald-700 dark:text-emerald-300">{fmt(b.physicalCash)}</span>
                        </div>
                        <div className="flex justify-between items-center pl-3">
                          <span className="text-gray-400 dark:text-gray-500">├── ✅ Free / available</span>
                          <span className={`font-semibold ${b.cashBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{fmt(b.cashBalance)}</span>
                        </div>
                        {b.allocations.length > 0 ? (
                          <>
                            <div className="flex justify-between items-center pl-3">
                              <span className="text-gray-400 dark:text-gray-500">└── 🔒 Earmarked ({b.allocations.length} item{b.allocations.length !== 1 ? 's' : ''})</span>
                              <span className="font-semibold text-amber-600 dark:text-amber-400">{fmt(b.allocatedTotal)}</span>
                            </div>
                            {b.allocations.map((a, i) => (
                              <div key={i} className={`flex justify-between items-center pl-8 py-0.5 rounded text-gray-400 dark:text-gray-400 ${i % 2 === 0 ? 'bg-amber-50/60 dark:bg-amber-900/10' : 'bg-gray-50/60 dark:bg-gray-700/20'}`}>
                                <span className="truncate max-w-[140px]">{i === b.allocations.length - 1 ? '└──' : '├──'} {a.accountName}</span>
                                <span className="font-medium">{fmt(a.amount)}</span>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="pl-3 text-gray-400 dark:text-gray-500">└── no earmarked funds this month</div>
                        )}
                      </div>

                      {/* EcoCash — separate, not in box */}
                      {(b.ecocashBalance !== 0 || b.ecocashInflow > 0) && (
                        <div className="border-t border-border pt-2 flex justify-between items-center text-xs">
                          <span className="text-gray-500 dark:text-gray-400">📱 EcoCash wallet</span>
                          <span className={`font-semibold ${b.ecocashBalance >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-500'}`}>{fmt(b.ecocashBalance)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Totals row across all businesses */}
                {balances.length > 1 && (() => {
                  const tEco = balances.reduce((s, b) => s + b.ecocashBalance, 0)
                  // Aggregate allocations across all businesses, merging by account type
                  // Strip business prefix (e.g. "HXI Eats — Rent Account" → "Rent Account")
                  // so rent/payroll from different businesses collapse into one line
                  const stripBizPrefix = (name: string) =>
                    name.includes(' — ') ? name.split(' — ').slice(1).join(' — ') : name
                  const combinedAllocMap = new Map<string, number>()
                  for (const b of balances) {
                    for (const a of b.allocations) {
                      const key = stripBizPrefix(a.accountName)
                      combinedAllocMap.set(key, (combinedAllocMap.get(key) ?? 0) + a.amount)
                    }
                  }
                  const combinedAllocs = Array.from(combinedAllocMap.entries())
                    .map(([accountName, amount]) => ({ accountName, amount }))
                    .sort((a, b) => b.amount - a.amount)
                  return (
                    <div className="rounded-lg border border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10 px-4 py-3 text-xs space-y-1">
                      <p className="font-semibold text-gray-600 dark:text-gray-300 text-sm mb-2">All Businesses — Combined</p>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">💵 Total physical cash to count</span>
                        <span className="font-bold text-base text-emerald-700 dark:text-emerald-300">{fmt(totalPhysicalCash)}</span>
                      </div>
                      <div className="flex justify-between items-center pl-3">
                        <span className="text-gray-400 dark:text-gray-500">{combinedAllocs.length > 0 ? '├──' : '└──'} ✅ Free / available</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(totalBalance)}</span>
                      </div>
                      {combinedAllocs.length > 0 && (
                        <>
                          <div className="flex justify-between items-center pl-3">
                            <span className="text-gray-400 dark:text-gray-500">└── 🔒 Earmarked this month ({combinedAllocs.length} item{combinedAllocs.length !== 1 ? 's' : ''})</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">{fmt(totalAllocated)}</span>
                          </div>
                          {combinedAllocs.map((a, i) => (
                            <div key={i} className={`flex justify-between items-center pl-8 py-0.5 rounded text-gray-400 dark:text-gray-400 ${i % 2 === 0 ? 'bg-amber-50/60 dark:bg-amber-900/10' : 'bg-gray-50/60 dark:bg-gray-700/20'}`}>
                              <span className="truncate max-w-[180px]">{i === combinedAllocs.length - 1 ? '└──' : '├──'} {a.accountName}</span>
                              <span className="font-medium">{fmt(a.amount)}</span>
                            </div>
                          ))}
                        </>
                      )}
                      <div className="flex justify-between items-center border-t border-dashed border-teal-200 dark:border-teal-800 pt-2 mt-1">
                        <span className="text-gray-500 dark:text-gray-400">📱 Total EcoCash wallet</span>
                        <span className="font-semibold text-teal-600 dark:text-teal-400">{fmt(tEco)}</span>
                      </div>
                    </div>
                  )
                })()}
              </>
            )}
          </div>
        </div>

        {/* Recent entries ledger */}
        <div>
          {/* Filter bar */}
          <div className="mb-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-primary">Entries</h2>
              {/* Search */}
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search business, notes, type…"
                className="flex-1 min-w-[180px] max-w-xs px-3 py-1.5 text-xs rounded-md border border-border bg-white dark:bg-gray-800 text-primary placeholder:text-secondary focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              {/* Entry type filter */}
              <select
                value={typeFilter}
                onChange={e => { setTypeFilter(e.target.value); load({ type: e.target.value }) }}
                className="px-2 py-1.5 text-xs rounded-md border border-border bg-white dark:bg-gray-800 text-primary focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <option value="">All types</option>
                <option value="EOD_RECEIPT">EOD Receipt</option>
                <option value="PAYMENT_APPROVAL">Payment Approval</option>
                <option value="PETTY_CASH">Petty Cash</option>
                <option value="PETTY_CASH_RETURN">Petty Cash Return</option>
                <option value="CASH_ALLOCATION">Cash Allocation</option>
              </select>
            </div>

            {/* Date preset pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {([
                { key: 'today',     label: 'Today' },
                { key: 'yesterday', label: 'Yesterday' },
                { key: '7d',        label: '7 days' },
                { key: '30d',       label: '30 days' },
                { key: '90d',       label: '90 days' },
                { key: 'all',       label: 'All time' },
                { key: 'custom',    label: 'Custom' },
              ] as { key: string; label: string }[]).map(p => (
                <button
                  key={p.key}
                  onClick={() => { setDatePreset(p.key); if (p.key !== 'custom') load({ preset: p.key }) }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${datePreset === p.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-secondary hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom date range */}
            {datePreset === 'custom' && (
              <div className="flex items-center gap-2 flex-wrap">
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  className="px-2 py-1 text-xs rounded-md border border-border bg-white dark:bg-gray-800 text-primary focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                <span className="text-xs text-secondary">to</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  className="px-2 py-1 text-xs rounded-md border border-border bg-white dark:bg-gray-800 text-primary focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                <button
                  onClick={() => load({ preset: 'custom', start: customStart, end: customEnd })}
                  disabled={!customStart || !customEnd}
                  className="px-3 py-1 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
          {loading ? (
            <p className="text-sm text-secondary">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-secondary">No entries yet.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              {(() => {
                // Colour palette — one slot per unique business that has PETTY_CASH entries
                const PETTY_CASH_COLORS = [
                  { pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',   border: 'border-l-amber-400 dark:border-l-amber-400' },
                  { pill: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',         border: 'border-l-blue-400 dark:border-l-blue-400' },
                  { pill: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', border: 'border-l-violet-400 dark:border-l-violet-400' },
                  { pill: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',         border: 'border-l-rose-400 dark:border-l-rose-400' },
                  { pill: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',         border: 'border-l-teal-400 dark:border-l-teal-400' },
                  { pill: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', border: 'border-l-orange-400 dark:border-l-orange-400' },
                ]
                // Assign a stable color index per businessId (order of first appearance)
                const bizColorIndex: Record<string, number> = {}
                let colorCounter = 0
                for (const e of entries) {
                  if (e.entryType === 'PETTY_CASH' && !(e.businessId in bizColorIndex)) {
                    bizColorIndex[e.businessId] = colorCounter % PETTY_CASH_COLORS.length
                    colorCounter++
                  }
                }
                // Build group count + position-within-group for PETTY_CASH entries keyed by requestDate|businessId
                const pettyCashGroupCount: Record<string, number> = {}
                const pettyCashGroupPosition: Record<string, number> = {}
                const pettyCashGroupCursor: Record<string, number> = {}
                for (const e of entries) {
                  if (e.entryType === 'PETTY_CASH') {
                    const reqDate = e.pettyCashRequestedAt ?? e.entryDate
                    const key = `${new Date(reqDate).toDateString()}|${e.businessId}`
                    pettyCashGroupCount[key] = (pettyCashGroupCount[key] ?? 0) + 1
                  }
                }
                for (const e of entries) {
                  if (e.entryType === 'PETTY_CASH') {
                    const reqDate = e.pettyCashRequestedAt ?? e.entryDate
                    const key = `${new Date(reqDate).toDateString()}|${e.businessId}`
                    pettyCashGroupCursor[key] = (pettyCashGroupCursor[key] ?? 0) + 1
                    pettyCashGroupPosition[e.id] = pettyCashGroupCursor[key]
                  }
                }
                // Client-side search filter
                const q = search.trim().toLowerCase()
                const visibleEntries = q
                  ? entries.filter(e =>
                      (e.business?.name ?? '').toLowerCase().includes(q) ||
                      (e.notes ?? '').toLowerCase().includes(q) ||
                      (ENTRY_TYPE_LABEL[e.entryType] ?? e.entryType).toLowerCase().includes(q)
                    )
                  : entries
                return (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-secondary uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Business</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Notes</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-left">By</th>
                    <th className="px-3 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleEntries.length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-secondary">{q ? 'No entries match your search.' : 'No entries yet.'}</td></tr>
                  ) : visibleEntries.map(e => {
                    const isDeleted = !!e.deletedAt
                    const isEdited = !!e.editedAt && !isDeleted
                    const isEodReceipt = e.entryType === 'EOD_RECEIPT'
                    const isCreator = e.createdBy?.id === currentUserId
                    const canEdit = isEodReceipt && !isDeleted && (isAdmin || isCreator)
                    const canDelete = isEodReceipt && !isDeleted && canDeleteBucketEntry
                    const hasDetails = e.entryType === 'PAYMENT_APPROVAL' || e.entryType === 'PETTY_CASH' || e.entryType === 'PETTY_CASH_RETURN' || (e.entryType === 'EOD_RECEIPT' && e.referenceType === 'CASH_ALLOCATION')
                    const isPettyCash = e.entryType === 'PETTY_CASH'
                    const isPettyCashReturn = e.entryType === 'PETTY_CASH_RETURN'
                    const pcReqDate = (isPettyCash || isPettyCashReturn) ? (e.pettyCashRequestedAt ?? e.entryDate) : e.entryDate
                    const pcGroupKey = `${new Date(pcReqDate).toDateString()}|${e.businessId}`
                    const pcGroupSize = pettyCashGroupCount[pcGroupKey] ?? 1
                    const pcPosition = isPettyCash ? (pettyCashGroupPosition[e.id] ?? 1) : 1
                    const pcColor = PETTY_CASH_COLORS[bizColorIndex[e.businessId] ?? 0]
                    const isSettled = e.pettyCashStatus === 'SETTLED'
                    const isCancelled = e.pettyCashStatus === 'CANCELLED'
                    return (
                      <tr
                        key={e.id}
                        onClick={hasDetails ? () => openDetailModal(e) : undefined}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${isDeleted ? 'opacity-50' : ''} ${hasDetails ? 'cursor-pointer' : ''} ${(isPettyCash || isPettyCashReturn) && pcGroupSize > 1 ? `border-l-2 ${pcColor.border}` : ''}`}
                      >
                        <td className="px-3 py-2 whitespace-nowrap text-secondary">
                          {new Date(e.entryDate).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 font-medium text-primary truncate max-w-[120px]">
                          {e.business?.name ?? '—'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{ENTRY_TYPE_LABEL[e.entryType] ?? e.entryType}</span>
                            {/* Settled / Cancelled badge for petty cash */}
                            {(isPettyCash || isPettyCashReturn) && isSettled && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                ✓ Settled
                              </span>
                            )}
                            {(isPettyCash || isPettyCashReturn) && isCancelled && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                ✕ Cancelled
                              </span>
                            )}
                            {/* Position indicator — colour per business so groups are visually distinct */}
                            {isPettyCash && pcGroupSize > 1 && (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${pcColor.pill}`} title={`${e.business?.name} — request ${pcPosition} of ${pcGroupSize} on this date`}>
                                {pcPosition}/{pcGroupSize}
                                <span className="font-normal opacity-80">· {new Date(pcReqDate).toLocaleDateString()}</span>
                              </span>
                            )}
                          </div>
                          {e.paymentChannel === 'ECOCASH' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 dark:text-teal-400">
                              <span className="text-base leading-none">📱</span> EcoCash
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                              <span className="text-base leading-none">💵</span> Cash
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-secondary max-w-[200px]">
                          <div className="truncate">{e.notes ?? '—'}</div>
                          {isEdited && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              ✏️ Edited by {e.editedBy?.name ?? '?'} · {new Date(e.editedAt!).toLocaleDateString()}
                            </span>
                          )}
                          {isDeleted && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" title={e.deletionReason ?? ''}>
                              🗑️ Deleted · {e.deletionReason ?? 'no reason'}
                            </span>
                          )}
                        </td>
                        <td className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDeleted ? 'line-through text-secondary' : e.paymentChannel === 'ECOCASH' ? 'text-teal-600 dark:text-teal-400' : e.direction === 'INFLOW' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {e.direction === 'INFLOW' ? '+' : '−'}{fmt(e.amount)}
                        </td>
                        <td className="px-3 py-2 text-secondary whitespace-nowrap">{e.createdBy?.name ?? '—'}</td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {hasDetails && (
                              <button
                                onClick={e2 => { e2.stopPropagation(); openDetailModal(e) }}
                                className="p-1 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-xs font-medium"
                                title="View details"
                              >
                                🔍
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={e2 => { e2.stopPropagation(); openEditModal(e) }}
                                className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                title="Edit entry"
                              >
                                ✏️
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={e2 => { e2.stopPropagation(); openDeleteModal(e) }}
                                className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Delete entry"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
                )
              })()}
            </div>
          )}
        </div>

      </div>

      {/* Edit modal */}
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl w-full max-w-sm mx-4 p-5">
            <h3 className="text-sm font-semibold text-primary mb-4">✏️ Edit Entry</h3>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Amount</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  required
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  required
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditEntry(null)}
                  className="flex-1 py-2 px-4 rounded-md text-sm font-medium border border-border text-secondary hover:bg-gray-50 dark:hover:bg-gray-700/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting || !editAmount || !editNotes.trim()}
                  className="flex-1 py-2 px-4 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail modal — PAYMENT_APPROVAL / PETTY_CASH */}
      {detailEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDetailEntry(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl w-full max-w-2xl mx-4 p-5 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-primary">
                {ENTRY_TYPE_LABEL[detailEntry.entryType] ?? detailEntry.entryType} — {detailEntry.business?.name ?? '—'}
              </h3>
              <button onClick={() => setDetailEntry(null)} className="text-secondary hover:text-primary text-lg leading-none">✕</button>
            </div>
            <div className="text-xs text-secondary mb-3 space-y-0.5">
              <div>{new Date(detailEntry.entryDate).toLocaleDateString()} · {fmt(detailEntry.amount)}</div>
              {detailEntry.notes && <div>{detailEntry.notes}</div>}
            </div>

            {detailLoading ? (
              <p className="text-sm text-secondary py-4 text-center">Loading…</p>
            ) : detailData?.payments && detailData.payments.length > 0 ? (
              <div className="overflow-y-auto overflow-x-hidden flex-1">
                <table className="w-full text-xs table-fixed">
                  <colgroup>
                    <col className="w-[28%]" />
                    <col className="w-[25%]" />
                    <col className="w-[27%]" />
                    <col className="w-[20%]" />
                  </colgroup>
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-secondary uppercase sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left">Payee</th>
                      <th className="px-2 py-2 text-left">Category</th>
                      <th className="px-2 py-2 text-left">Notes</th>
                      <th className="px-2 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {detailData.payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                        <td className="px-2 py-2 font-medium text-primary truncate">{p.payeeName}</td>
                        <td className="px-2 py-2 text-secondary truncate">{p.category ?? '—'}</td>
                        <td className="px-2 py-2 text-secondary truncate">{p.notes ?? '—'}</td>
                        <td className="px-2 py-2 text-right font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                          {p.paymentChannel === 'ECOCASH' ? '📱' : '💵'} {fmt(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <td colSpan={3} className="px-2 py-2 text-xs font-semibold text-secondary text-right">Total</td>
                      <td className="px-2 py-2 text-right font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                        {fmt(detailData.payments.reduce((s: number, p: any) => s + p.amount, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : detailData?.pettyCash ? (
              <>
                {/* Fixed summary — stays visible while transactions scroll */}
                <div className="shrink-0 grid grid-cols-2 gap-x-4 gap-y-1 text-sm pb-3 border-b border-border">
                  <div className="flex justify-between col-span-2"><span className="text-secondary">Purpose</span><span className="font-medium">{detailData.pettyCash.purpose}</span></div>
                  <div className="flex justify-between"><span className="text-secondary">Requested by</span><span>{detailData.pettyCash.requestedBy}</span></div>
                  <div className="flex justify-between"><span className="text-secondary">Status</span><span className="capitalize">{detailData.pettyCash.status?.toLowerCase()}</span></div>
                  <div className="flex justify-between"><span className="text-secondary">Approved</span><span className="text-emerald-600 font-semibold">{detailData.pettyCash.approvedAmount != null ? fmt(detailData.pettyCash.approvedAmount) : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-secondary">Spent</span><span>{detailData.pettyCash.spentAmount != null ? fmt(detailData.pettyCash.spentAmount) : '—'}</span></div>
                  {detailData.pettyCash.returnAmount != null && (
                    <div className="flex justify-between"><span className="text-secondary">Returned</span><span className="text-emerald-600">{fmt(detailData.pettyCash.returnAmount)}</span></div>
                  )}
                  {detailData.pettyCash.approvedAmount != null && detailData.pettyCash.spentAmount != null && detailData.pettyCash.status !== 'SETTLED' && (
                    (() => {
                      const remaining = detailData.pettyCash.approvedAmount - detailData.pettyCash.spentAmount
                      return remaining > 0 ? (
                        <div className="flex justify-between col-span-2 pt-1 border-t border-border">
                          <span className="text-secondary font-medium">Balance remaining</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">{fmt(remaining)}</span>
                        </div>
                      ) : null
                    })()
                  )}
                </div>

                {/* Transactions — scrollable only */}
                {detailData.pettyCash.transactions?.length > 0 && (
                  <div className="flex-1 overflow-y-auto mt-2">
                    <div className="text-xs font-semibold text-secondary uppercase mb-1">{detailData.pettyCash.transactions.length} expense(s)</div>
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-700 text-secondary uppercase sticky top-0 z-10">
                        <tr>
                          <th className="px-2 py-2 text-left">Payee</th>
                          <th className="px-2 py-2 text-left">Category</th>
                          <th className="px-2 py-2 text-left">Description</th>
                          <th className="px-2 py-2 text-left">Paid by</th>
                          <th className="px-2 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {detailData.pettyCash.transactions.map((t: any) => (
                          <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                            <td className="px-2 py-2">
                              <div className="font-medium text-primary">{t.payeeName}</div>
                              {t.payeePhone && <div className="text-secondary">{t.payeePhone}</div>}
                              {t.payeeContact && <div className="text-secondary">c/o {t.payeeContact}</div>}
                            </td>
                            <td className="px-2 py-2 text-secondary">{t.category ?? '—'}</td>
                            <td className="px-2 py-2 text-secondary">{t.description ?? '—'}</td>
                            <td className="px-2 py-2 text-secondary">{t.paidBy}</td>
                            <td className="px-2 py-2 text-right font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">💵 {fmt(t.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <td colSpan={4} className="px-2 py-2 text-xs font-semibold text-secondary text-right">Total spent</td>
                          <td className="px-2 py-2 text-right font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                            {fmt(detailData.pettyCash.transactions.reduce((s: number, t: any) => s + t.amount, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </>
            ) : detailData?.eodSummary ? (
              <div className="flex-1 overflow-y-auto">
                <EodSummaryPanel eodSummary={detailData.eodSummary} fmt={fmt} />
              </div>
            ) : (
              <p className="text-sm text-secondary py-4 text-center">No details available.</p>
            )}

            <div className="mt-4 pt-3 border-t border-border">
              <button onClick={() => setDetailEntry(null)} className="w-full py-2 px-4 rounded-md text-sm font-medium border border-border text-secondary hover:bg-gray-50 dark:hover:bg-gray-700/30">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl w-full max-w-sm mx-4 p-5">
            <h3 className="text-sm font-semibold text-red-600 mb-1">🗑️ Delete Entry</h3>
            <p className="text-xs text-secondary mb-4">
              This will zero out the entry ({fmt(deleteEntry.amount)}) and record the reason. This cannot be undone.
            </p>
            <form onSubmit={handleDeleteSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="Why is this entry being deleted?"
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-primary focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteEntry(null)}
                  className="flex-1 py-2 px-4 rounded-md text-sm font-medium border border-border text-secondary hover:bg-gray-50 dark:hover:bg-gray-700/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteSubmitting || !deleteReason.trim()}
                  className="flex-1 py-2 px-4 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteSubmitting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </ContentLayout>
  )
}
