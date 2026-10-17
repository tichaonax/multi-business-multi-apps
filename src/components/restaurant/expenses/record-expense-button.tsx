'use client'

/**
 * MBM-325 — the POS "Record Expense" button, coloured by the salesperson's own
 * recorded purchases: red with the unpaid count/amount while anything is
 * still owed, green "All paid" once everything is paid, neutral if they
 * haven't recorded anything yet. `refreshKey` changes (modal closed / saved)
 * trigger a reload; it also reloads on window focus and every 5 minutes.
 */
import { useCallback, useEffect, useState } from 'react'

type Summary = { openItems: number; openOwed: number; hasAny: boolean }

const REFRESH_MS = 5 * 60 * 1000

export function RecordExpenseButton({ businessId, refreshKey, onClick }: { businessId: string; refreshKey: number; onClick: () => void }) {
  const [summary, setSummary] = useState<Summary | null>(null)

  const load = useCallback(() => {
    fetch(`/api/restaurant/expenses/summary?businessId=${encodeURIComponent(businessId)}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (j?.data) setSummary(j.data) })
      .catch(() => {})
  }, [businessId])

  useEffect(() => { load() }, [load, refreshKey])
  useEffect(() => {
    const t = setInterval(load, REFRESH_MS)
    window.addEventListener('focus', load)
    return () => { clearInterval(t); window.removeEventListener('focus', load) }
  }, [load])

  const owed = !!summary && summary.openItems > 0
  const allPaid = !!summary && !owed && summary.hasAny
  const colour = owed ? 'bg-rose-600 hover:bg-rose-700' : allPaid ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
  const status = owed
    ? `${summary!.openItems} unpaid · $${summary!.openOwed.toFixed(2)}`
    : allPaid ? '✓ All paid' : null

  return (
    <button
      onClick={onClick}
      title={owed
        ? `${summary!.openItems} of your recorded item(s) not yet paid — $${summary!.openOwed.toFixed(2)} still owed. Click to see My purchases or record a new one.`
        : 'Record a purchase as an unpaid expense — paid later through a payment request'}
      className={`px-3 py-1 sm:py-1.5 ${colour} text-white rounded-lg text-xs sm:text-sm font-medium text-left leading-tight`}
    >
      <span className="block">🧾 Record Expense</span>
      {status && <span className="block text-[10px] sm:text-xs font-normal opacity-90">{status}</span>}
    </button>
  )
}
