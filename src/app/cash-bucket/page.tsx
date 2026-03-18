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
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

const ENTRY_TYPE_LABEL: Record<string, string> = {
  EOD_RECEIPT:       '💵 EOD Receipt',
  PAYMENT_APPROVAL:  '✅ Payment Approval',
  PETTY_CASH:        '🪙 Petty Cash',
  CASH_ALLOCATION:   '📋 Cash Allocation',
}


export default function CashBucketPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const confirm = useConfirm()
  const alert = useAlert()

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


  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/cash-bucket', { credentials: 'include' })
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
  }, [router])

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
                              <div key={i} className="flex justify-between items-center pl-8 text-gray-400 dark:text-gray-500">
                                <span className="truncate max-w-[140px]">{i === b.allocations.length - 1 ? '└──' : '├──'} {a.accountName}</span>
                                <span>{fmt(a.amount)}</span>
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
                  return (
                    <div className="rounded-lg border border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10 px-4 py-3 text-xs space-y-1">
                      <p className="font-semibold text-gray-600 dark:text-gray-300 text-sm mb-2">All Businesses — Combined</p>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">💵 Total physical cash to count</span>
                        <span className="font-bold text-base text-emerald-700 dark:text-emerald-300">{fmt(totalPhysicalCash)}</span>
                      </div>
                      <div className="flex justify-between items-center pl-3">
                        <span className="text-gray-400 dark:text-gray-500">├── ✅ Free / available</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(totalBalance)}</span>
                      </div>
                      <div className="flex justify-between items-center pl-3">
                        <span className="text-gray-400 dark:text-gray-500">└── 🔒 Earmarked this month</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">{fmt(totalAllocated)}</span>
                      </div>
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
          <h2 className="text-sm font-semibold text-primary mb-3">Recent Entries</h2>
          {loading ? (
            <p className="text-sm text-secondary">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-secondary">No entries yet.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
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
                  {entries.map(e => {
                    const isDeleted = !!e.deletedAt
                    const isEdited = !!e.editedAt && !isDeleted
                    const canEdit = e.entryType === 'EOD_RECEIPT' && !isDeleted
                    const canDelete = e.entryType === 'EOD_RECEIPT' && !isDeleted
                    return (
                      <tr key={e.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${isDeleted ? 'opacity-50' : ''}`}>
                        <td className="px-3 py-2 whitespace-nowrap text-secondary">
                          {new Date(e.entryDate).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 font-medium text-primary truncate max-w-[120px]">
                          {e.business?.name ?? '—'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div>{ENTRY_TYPE_LABEL[e.entryType] ?? e.entryType}</div>
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
                            {canEdit && (
                              <button
                                onClick={() => openEditModal(e)}
                                className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                title="Edit entry"
                              >
                                ✏️
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => openDeleteModal(e)}
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
            </div>
          )}
        </div>

      </div>

      {/* Edit modal */}
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg border border-border shadow-xl w-full max-w-sm mx-4 p-5">
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

      {/* Delete confirmation modal */}
      {deleteEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg border border-border shadow-xl w-full max-w-sm mx-4 p-5">
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
