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

interface BucketBalance {
  businessId: string
  business: Business | null
  inflow: number
  outflow: number
  balance: number
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
  entryDate: string
  createdAt: string
  createdBy: { id: string; name: string } | null
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
  const [balances, setBalances] = useState<BucketBalance[]>([])
  const [entries, setEntries] = useState<BucketEntry[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [selectedBiz, setSelectedBiz] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/cash-bucket', { credentials: 'include' })
      if (!res.ok) { router.push('/dashboard'); return }
      const json = await res.json()
      setTotalBalance(json.data.totalBalance)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBiz || !amount) return

    const bizName = businesses.find(b => b.id === selectedBiz)?.name ?? 'this business'
    const ok = await confirm({
      title: 'Record EOD Cash Receipt',
      description: `Record ${fmt(Number(amount))} EOD cash for ${bizName}?`,
      confirmText: 'Record',
    })
    if (!ok) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/cash-bucket', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: selectedBiz, amount: Number(amount), notes, entryDate }),
      })
      const json = await res.json()
      if (res.ok) {
        setAmount('')
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
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Total Cash in Bucket</p>
            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{fmt(totalBalance)}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-4xl">🪣</span>
            <Link href="/cash-bucket/report" className="text-xs text-emerald-600 dark:text-emerald-400 underline hover:no-underline">
              View Full Report →
            </Link>
          </div>
        </div>

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
                  <label className="block text-xs font-medium text-secondary mb-1">Amount</label>
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
                  <label className="block text-xs font-medium text-secondary mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Restaurant closing shift"
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedBiz || !amount}
                  className="w-full py-2 px-4 rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Recording…' : '💵 Record Receipt'}
                </button>
              </form>
            </div>
          </div>

          {/* Per-business balances */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold text-primary">Per-Business Balance</h2>
            {loading ? (
              <p className="text-sm text-secondary">Loading…</p>
            ) : balances.length === 0 ? (
              <p className="text-sm text-secondary">No entries yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {balances.map(b => (
                  <div key={b.businessId} className="rounded-lg border border-border bg-card px-4 py-3">
                    <p className="text-xs font-medium text-secondary uppercase tracking-wide truncate">{b.business?.name ?? b.businessId}</p>
                    <p className={`text-xl font-bold mt-0.5 ${b.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {fmt(b.balance)}
                    </p>
                    <div className="flex gap-3 mt-1 text-xs text-secondary">
                      <span>↑ {fmt(b.inflow)}</span>
                      <span>↓ {fmt(b.outflow)}</span>
                    </div>
                  </div>
                ))}
              </div>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-3 py-2 whitespace-nowrap text-secondary">
                        {new Date(e.entryDate).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 font-medium text-primary truncate max-w-[120px]">
                        {e.business?.name ?? '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {ENTRY_TYPE_LABEL[e.entryType] ?? e.entryType}
                      </td>
                      <td className="px-3 py-2 text-secondary truncate max-w-[160px]">{e.notes ?? '—'}</td>
                      <td className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${e.direction === 'INFLOW' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {e.direction === 'INFLOW' ? '+' : '−'}{fmt(e.amount)}
                      </td>
                      <td className="px-3 py-2 text-secondary whitespace-nowrap">{e.createdBy?.name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </ContentLayout>
  )
}
