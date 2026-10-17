'use client'

/**
 * MBM-322 — salesperson's view of recorded purchases (tab in the Record
 * Expense modal): where each item is in the payment process, with the
 * payee's phone so they can answer the vendor.
 */
import { useEffect, useState } from 'react'

interface Line {
  id: string
  description: string
  amount: number
  paidAmount: number
  outstanding: number
  status: 'UNPAID' | 'IN_REQUEST' | 'APPROVED' | 'PAID' | 'VOID'
  paidAt: string | null
  comboRequest: { status: string; submittedAt: string | null; approvedAt: string | null; requestedBy: string | null } | null
}
interface Txn {
  id: string
  reference: string
  purchasedAt: string
  payee: { name: string; phone: string | null } | null
  notes: string | null
  createdBy: { name: string } | null
  lines: Line[]
}

type Filter = 'open' | 'paid' | 'all'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'open', label: 'Pending' },
  { key: 'paid', label: 'Paid' },
  { key: 'all', label: 'All' },
]

const money = (n: number) => `$${n.toFixed(2)}`
const day = (iso: string) => new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })

/** Plain-words status for one item. */
function lineStatus(l: Line): { text: string; cls: string } {
  const by = l.comboRequest?.requestedBy ? ` by ${l.comboRequest.requestedBy}` : ''
  switch (l.status) {
    case 'PAID':
      return { text: `Paid${l.paidAt ? ` on ${day(l.paidAt)}` : ''}`, cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' }
    case 'APPROVED':
      return { text: `Approved — awaiting payment${by ? ` (requested${by})` : ''}`, cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' }
    case 'IN_REQUEST':
      return l.comboRequest?.submittedAt && l.comboRequest.status !== 'DRAFT'
        ? { text: `Payment requested${by} on ${day(l.comboRequest.submittedAt)}`, cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' }
        : { text: `Payment request being prepared${by}`, cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' }
    default:
      return l.paidAmount > 0
        ? { text: `Part-paid — ${money(l.outstanding)} not yet requested`, cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' }
        : { text: 'Not yet requested', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' }
  }
}

export function MyPurchasesList({ businessId }: { businessId: string }) {
  const [filter, setFilter] = useState<Filter>('open')
  const [mineOnly, setMineOnly] = useState(true)
  const [txns, setTxns] = useState<Txn[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Ignore a slower response for a filter the user has already moved off
    let current = true
    setTxns(null)
    setError(null)
    const qs = new URLSearchParams({ businessId, status: filter, ...(mineOnly ? { mine: '1' } : {}) })
    fetch(`/api/restaurant/expenses?${qs}`)
      .then(async r => {
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j.error || 'Failed to load')
        if (current) setTxns((j.data || []).slice(0, 100))
      })
      .catch(e => { if (current) { setError(e.message); setTxns([]) } })
    return () => { current = false }
  }, [businessId, filter, mineOnly])

  const owed = (txns ?? []).reduce((s, t) => s + t.lines.reduce((x, l) => x + l.outstanding, 0), 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          {FILTERS.map(f => (
            <button key={f.key} type="button" onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-sm ${filter === f.key ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={mineOnly} onChange={e => setMineOnly(e.target.checked)} />
          Recorded by me only
        </label>
      </div>

      {txns === null ? (
        <p className="text-center text-sm text-gray-500 py-8">Loading…</p>
      ) : error ? (
        <p className="text-center text-sm text-red-600 py-8">{error}</p>
      ) : txns.length === 0 ? (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
          {filter === 'open' ? 'Nothing waiting for payment. 🎉' : 'No purchases to show.'}
        </p>
      ) : (
        <>
          {filter !== 'paid' && owed > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-300">Still owed: <span className="font-bold text-rose-600 dark:text-rose-400">{money(owed)}</span></p>
          )}
          {txns.map(t => (
            <div key={t.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {t.payee?.name ?? <span className="italic font-normal text-gray-500">No payee yet</span>}
                  </div>
                  {t.payee?.phone && (
                    <a href={`tel:${t.payee.phone.replace(/\s+/g, '')}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">📞 {t.payee.phone}</a>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  <div>{day(t.purchasedAt)} · <span className="font-mono">{t.reference}</span></div>
                  {!mineOnly && t.createdBy && <div>Recorded by {t.createdBy.name}</div>}
                </div>
              </div>
              {t.lines.map(l => {
                const st = lineStatus(l)
                return (
                  <div key={l.id} className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm text-gray-900 dark:text-white">{l.description}</div>
                      <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs ${st.cls}`}>{st.text}</span>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold text-gray-900 dark:text-white">{money(l.amount)}</div>
                      {l.paidAmount > 0 && l.status !== 'PAID' && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">paid {money(l.paidAmount)} · owed {money(l.outstanding)}</div>
                      )}
                    </div>
                  </div>
                )
              })}
              {t.notes && <div className="px-3 py-1.5 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">📝 {t.notes}</div>}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
