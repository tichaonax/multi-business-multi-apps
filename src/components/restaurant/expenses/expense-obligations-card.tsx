'use client'

/**
 * MBM-319 — "Obligations" card on a restaurant's expense account: what is
 * owed for recorded purchases, by stage. Recording never touches the
 * balance, so this shows alongside it. Renders nothing for non-restaurant
 * accounts or when nothing is owed.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Totals { unpaid: number; inRequest: number; approved: number }

const money = (n: number) => `$${n.toFixed(2)}`

export function ExpenseObligationsCard({ accountId, balance }: { accountId: string; balance: number }) {
  const [totals, setTotals] = useState<Totals | null>(null)

  useEffect(() => {
    fetch(`/api/restaurant/expenses?accountId=${encodeURIComponent(accountId)}&status=open`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!j?.restaurant) return
        const t: Totals = { unpaid: 0, inRequest: 0, approved: 0 }
        for (const txn of j.data as { expenseAccountId: string; lines: { status: string; outstanding: number }[] }[]) {
          if (txn.expenseAccountId !== accountId) continue
          for (const l of txn.lines) {
            if (l.status === 'UNPAID') t.unpaid += l.outstanding
            else if (l.status === 'IN_REQUEST') t.inRequest += l.outstanding
            else if (l.status === 'APPROVED') t.approved += l.outstanding
          }
        }
        setTotals(t)
      })
      .catch(() => {})
  }, [accountId])

  if (!totals) return null
  const owed = totals.unpaid + totals.inRequest + totals.approved
  if (owed <= 0) return null

  const cell = (label: string, value: number, cls: string) => (
    <div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`text-lg font-bold ${cls}`}>{money(value)}</div>
    </div>
  )

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-rose-200 dark:border-rose-800">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">🧾 Obligations — recorded restaurant expenses</h3>
        <Link href={`/expense-accounts/${accountId}/combo-requests/new`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
          Request payment →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cell('Available funds', balance, balance < owed ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}
        {cell('Unpaid (not requested)', totals.unpaid, 'text-amber-600 dark:text-amber-400')}
        {cell('In payment requests', totals.inRequest, 'text-blue-600 dark:text-blue-400')}
        {cell('Approved, awaiting payment', totals.approved, 'text-purple-600 dark:text-purple-400')}
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Total owed {money(owed)}. Recorded purchases don&apos;t reduce the balance until they are paid through a payment request.
      </p>
    </div>
  )
}
