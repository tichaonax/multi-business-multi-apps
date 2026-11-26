'use client'

/**
 * MBM-319 — Unpaid Expenses report: every recorded restaurant expense still
 * owed (awaiting selection, in a payment request, or approved but not yet
 * marked paid), filtered by PURCHASE date, grouped by payee → date →
 * purchase. Amounts are the current outstanding balance.
 */
export const dynamic = 'force-dynamic'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'

interface Line {
  id: string
  description: string
  amount: number
  paidAmount: number
  outstanding: number
  status: 'UNPAID' | 'IN_REQUEST' | 'APPROVED'
  category: { name: string; emoji: string } | null
  subcategory: { name: string } | null
  comboRequest: { id: string; title: string; status: string; accountId: string } | null
}
interface Txn {
  id: string
  reference: string
  purchasedAt: string
  payee: { type: string; id: string; name: string } | null
  notes: string | null
  createdBy: { name: string } | null
  lines: Line[]
}

const STATUS_LABEL: Record<Line['status'], { text: string; cls: string }> = {
  UNPAID: { text: 'Awaiting payment request', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  IN_REQUEST: { text: 'In payment request', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  APPROVED: { text: 'Approved — awaiting payment', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
}

const money = (n: number) => `$${n.toFixed(2)}`
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA')
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

export default function UnpaidExpensesReportPage() {
  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()
  const [allTime, setAllTime] = useState(true)
  const [range, setRange] = useState<DateRange>(() => {
    const end = new Date(); const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0) /* MBM-345: month to date */
    return { start, end }
  })
  const [txns, setTxns] = useState<Txn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    setError(null)
    const qs = new URLSearchParams({ businessId: currentBusinessId, status: 'open' })
    if (!allTime) {
      const start = new Date(range.start); start.setHours(0, 0, 0, 0)
      const end = new Date(range.end); end.setHours(23, 59, 59, 999)
      qs.set('start', start.toISOString())
      qs.set('end', end.toISOString())
    }
    try {
      const res = await fetch(`/api/restaurant/expenses?${qs}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setTxns(json.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setTxns([])
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, allTime, range])

  useEffect(() => { load() }, [load])

  // payee → day → purchases
  const groups = useMemo(() => {
    const byPayee = new Map<string, { name: string; specified: boolean; total: number; days: Map<string, { label: string; txns: Txn[] }> }>()
    for (const t of txns) {
      const key = t.payee ? `${t.payee.type}:${t.payee.id}` : '__none__'
      if (!byPayee.has(key)) byPayee.set(key, { name: t.payee?.name ?? 'Not specified', specified: !!t.payee, total: 0, days: new Map() })
      const g = byPayee.get(key)!
      g.total += t.lines.reduce((s, l) => s + l.outstanding, 0)
      const dk = dayKey(t.purchasedAt)
      if (!g.days.has(dk)) g.days.set(dk, { label: dayLabel(t.purchasedAt), txns: [] })
      g.days.get(dk)!.txns.push(t)
    }
    return Array.from(byPayee.entries())
      .map(([key, g]) => ({ key, ...g, days: Array.from(g.days.entries()).sort((a, b) => b[0].localeCompare(a[0])) }))
      .sort((a, b) => (a.specified === b.specified ? b.total - a.total : a.specified ? -1 : 1))
  }, [txns])

  const grandTotal = groups.reduce((s, g) => s + g.total, 0)
  const lineCount = txns.reduce((s, t) => s + t.lines.length, 0)

  if (currentBusiness && currentBusiness.businessType !== 'restaurant') {
    return <div className="p-6 text-gray-600 dark:text-gray-300">This report is available for restaurants only.</div>
  }

  return (
    <div className="min-h-screen page-background p-3 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">🧾 Unpaid Expenses</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Recorded purchases that have not been paid yet.</p>
          </div>
          <Link href="/restaurant/reports" className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            ← Reports
          </Link>
        </div>

        <DateRangeSelector value={range} onChange={setRange} showAllTime allTime={allTime} onAllTimeChange={setAllTime} />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ℹ️ The date range selects <strong>when expenses were incurred</strong> (purchase date). Amounts show what is <strong>still owed today</strong>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400">Total outstanding</div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{money(grandTotal)}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400">Payees</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{groups.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400">Unpaid items</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{lineCount}</div>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-10">Loading…</p>
        ) : error ? (
          <p className="text-center text-red-600 py-10">{error}</p>
        ) : groups.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-10">No unpaid expenses for this period. 🎉</p>
        ) : (
          <div className="space-y-3">
            {groups.map(g => {
              const open = expanded[g.key] ?? true
              return (
                <div key={g.key} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  <button onClick={() => setExpanded(e => ({ ...e, [g.key]: !open }))}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/60 text-left">
                    <span className={`font-semibold ${g.specified ? 'text-gray-900 dark:text-white' : 'italic text-gray-500 dark:text-gray-400'}`}>
                      {open ? '▾' : '▸'} {g.name}
                    </span>
                    <span className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400 mr-2">Subtotal</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{money(g.total)}</span>
                    </span>
                  </button>
                  {open && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left px-4 py-2 font-medium">Purchase date</th>
                            <th className="text-left px-2 py-2 font-medium">Reference</th>
                            <th className="text-left px-2 py-2 font-medium">Item</th>
                            <th className="text-right px-2 py-2 font-medium">Amount</th>
                            <th className="text-right px-2 py-2 font-medium">Paid</th>
                            <th className="text-right px-2 py-2 font-medium">Outstanding</th>
                            <th className="text-left px-2 py-2 font-medium">Status</th>
                            <th className="text-left px-4 py-2 font-medium">Payment request</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.days.map(([dk, day]) => (
                            <Fragment key={dk}>
                              {day.txns.map(t => t.lines.map((l, i) => (
                                <tr key={l.id} className="border-b border-gray-100 dark:border-gray-700/60">
                                  <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">{i === 0 ? day.label : ''}</td>
                                  <td className="px-2 py-2 whitespace-nowrap font-mono text-xs text-gray-600 dark:text-gray-400" title={t.notes ?? undefined}>{i === 0 ? t.reference : ''}</td>
                                  <td className="px-2 py-2 text-gray-900 dark:text-white">
                                    {l.description}
                                    <div className="text-xs text-gray-400">
                                      {l.category ? `${l.category.emoji} ${l.category.name}${l.subcategory ? ` › ${l.subcategory.name}` : ''}` : 'Unclassified'}
                                    </div>
                                  </td>
                                  <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-300">{money(l.amount)}</td>
                                  <td className="px-2 py-2 text-right text-gray-500 dark:text-gray-400">{l.paidAmount > 0 ? money(l.paidAmount) : '—'}</td>
                                  <td className="px-2 py-2 text-right font-semibold text-rose-600 dark:text-rose-400">{money(l.outstanding)}</td>
                                  <td className="px-2 py-2"><span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${STATUS_LABEL[l.status]?.cls ?? ''}`}>{STATUS_LABEL[l.status]?.text ?? l.status}</span></td>
                                  <td className="px-4 py-2 text-xs">
                                    {l.comboRequest ? (
                                      <Link href={`/expense-accounts/${l.comboRequest.accountId}/combo-requests/${l.comboRequest.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                                        {l.comboRequest.title}
                                      </Link>
                                    ) : <span className="text-gray-400">—</span>}
                                  </td>
                                </tr>
                              )))}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
