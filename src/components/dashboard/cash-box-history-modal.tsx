'use client'

import { useState, useEffect } from 'react'
import { X, ChevronDown, ChevronRight } from 'lucide-react'
import { ModalPortal } from '@/components/ui/modal-portal'

interface SetAside {
  id: string
  amount: number
  reportedAmount: number
  sourceType: string
  reportId: string
  date: string | null
  lockedAt: string | null
  lockedBy: string | null
  businessName: string | null
  isGrouped: boolean
}

interface Payment {
  id: string
  amount: number
  date: string
  status: string
  paymentType: string
  payee: string | null
  category: string | null
  notes: string | null
  receiptNumber: string | null
  createdBy: string | null
}

interface CashBoxData {
  accountName: string
  setAsides: SetAside[]
  payments: Payment[]
  totals: { setAside: number; paid: number }
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

const fmtDate = (iso: string | null) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const monthKey = (iso: string | null) => (iso ? iso.slice(0, 7) : 'unknown')

const monthLabel = (key: string) => {
  if (key === 'unknown') return 'Unknown Date'
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

const sourceTypeLabel = (t: string) => {
  if (t === 'EOD_AUTO_DEPOSIT') return 'EOD Auto-Deposit'
  if (t === 'EOD_RENT_TRANSFER') return 'Rent Transfer'
  return t
}

const paymentTypeLabel = (t: string) => {
  if (t === 'LOAN_REPAYMENT') return 'Loan Repayment'
  if (t === 'LOAN_DISBURSEMENT') return 'Loan Disbursement'
  if (t === 'TRANSFER_RETURN') return 'Transfer Return'
  if (t === 'ADVANCE') return 'Advance'
  return 'Payment'
}

function groupByMonth<T extends { date: string | null }>(items: T[]): Array<[string, T[]]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = monthKey(item.date)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
}

function MonthSection({
  label, total, count, isOpen, onToggle, amountClass, children,
}: {
  label: string; total: number; count: number; isOpen: boolean
  onToggle: () => void; amountClass: string; children: React.ReactNode
}) {
  return (
    <div className="border-b border-gray-100 dark:border-gray-700 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {isOpen
            ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{label}</span>
          <span className="text-xs text-gray-400">({count})</span>
        </div>
        <span className={`text-xs font-mono font-semibold ${amountClass}`}>{fmt(total)}</span>
      </button>
      {isOpen && <div>{children}</div>}
    </div>
  )
}

export function CashBoxHistoryModal({
  accountId, accountName, businessName, type = 'account', businessId, onClose,
}: {
  accountId?: string; accountName: string; businessName: string
  type?: 'account' | 'payroll'; businessId?: string; onClose: () => void
}) {
  const [data, setData] = useState<CashBoxData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'setasides' | 'payments'>('setasides')
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set())
  const [showBizBreakdown, setShowBizBreakdown] = useState(false)

  useEffect(() => {
    const url =
      type === 'payroll'
        ? `/api/dashboard/cash-box-history?type=payroll&businessId=${businessId}`
        : `/api/dashboard/cash-box-history?accountId=${accountId}`
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setData(d.data)
          const allDates = [
            ...d.data.setAsides.map((s: SetAside) => s.date),
            ...d.data.payments.map((p: Payment) => p.date),
          ].filter(Boolean) as string[]
          const sorted = allDates.map(x => x.slice(0, 7)).sort().reverse()
          if (sorted.length > 0) setOpenMonths(new Set([sorted[0]]))
        } else {
          setError(d.error ?? 'Failed to load')
        }
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [accountId, businessId, type])

  const toggleMonth = (key: string) =>
    setOpenMonths(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })

  const netBalance = data ? data.totals.setAside - data.totals.paid : 0

  // Per-business contribution totals (from set-asides)
  const bizContributions: Array<{ name: string; amount: number }> = data
    ? Array.from(
        data.setAsides.reduce((map, s) => {
          const name = s.businessName ?? 'Unknown'
          map.set(name, (map.get(name) ?? 0) + s.amount)
          return map
        }, new Map<string, number>())
      )
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
    : []
  const hasMultipleBiz = bizContributions.length > 1

  const setAsideGroups = data ? groupByMonth(data.setAsides) : []
  const paymentGroups  = data ? groupByMonth(data.payments)  : []

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
        <div
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl mx-auto flex flex-col overflow-hidden"
          style={{ maxHeight: 'min(85vh, calc(100dvh - 2rem))' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Sticky top */}
          <div className="flex-none">
            <div className="flex items-start justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">🏦 {accountName}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{businessName} — Cash Box History</p>
              </div>
              <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {data && (
              <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex gap-4 px-4 py-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Total Set Aside</span>
                    <p className="font-mono font-semibold text-green-600 dark:text-green-400">{fmt(data.totals.setAside)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Total Paid Out</span>
                    <p className="font-mono font-semibold text-red-600 dark:text-red-400">{fmt(data.totals.paid)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Net in Box</span>
                    <p className={`font-mono font-semibold ${netBalance >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'}`}>
                      {fmt(netBalance)}
                    </p>
                  </div>
                  {hasMultipleBiz && (
                    <button
                      onClick={() => setShowBizBreakdown(v => !v)}
                      className="ml-auto self-start flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400 pt-1"
                    >
                      {showBizBreakdown ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      By business
                    </button>
                  )}
                </div>
                {showBizBreakdown && hasMultipleBiz && (
                  <div className="px-4 pb-3 grid grid-cols-2 gap-x-6 gap-y-1">
                    {bizContributions.map(b => (
                      <div key={b.name} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400 truncate mr-2">{b.name}</span>
                        <span className="font-mono font-semibold text-green-600 dark:text-green-400 shrink-0">{fmt(b.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-1 px-4 pt-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              {(['setasides', 'payments'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
                    tab === t
                      ? 'bg-white dark:bg-gray-900 border border-b-white dark:border-gray-600 dark:border-b-gray-900 text-gray-900 dark:text-gray-100'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {t === 'setasides' ? '📥 Set Asides' : '📤 Payments Out'}
                  {data ? ` (${t === 'setasides' ? data.setAsides.length : data.payments.length})` : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading && (
              <div className="flex items-center justify-center h-32 text-sm text-gray-500 dark:text-gray-400">Loading…</div>
            )}
            {error && (
              <div className="flex items-center justify-center h-32 text-sm text-red-500">{error}</div>
            )}

            {!loading && !error && data && tab === 'setasides' && (
              <>
                {setAsideGroups.length === 0 && (
                  <p className="px-4 py-6 text-center text-xs text-gray-400">No set-aside entries yet</p>
                )}
                {setAsideGroups.map(([key, rows]) => (
                  <MonthSection
                    key={key}
                    label={monthLabel(key)}
                    total={rows.reduce((s, r) => s + r.amount, 0)}
                    count={rows.length}
                    isOpen={openMonths.has(key)}
                    onToggle={() => toggleMonth(key)}
                    amountClass="text-green-600 dark:text-green-400"
                  >
                    <table className="w-full text-xs">
                      <thead className="bg-white dark:bg-gray-900">
                        <tr className="text-left text-gray-400 dark:text-gray-500">
                          <th className="px-4 py-1.5 font-medium">Date</th>
                          <th className="px-4 py-1.5 font-medium">Business</th>
                          <th className="px-4 py-1.5 font-medium">Type</th>
                          <th className="px-4 py-1.5 font-medium text-right">Amount</th>
                          <th className="px-4 py-1.5 font-medium">Locked By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {rows.map(s => (
                          <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmtDate(s.date)}</td>
                            <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{s.businessName ?? '—'}</td>
                            <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                              {sourceTypeLabel(s.sourceType)}
                              {s.isGrouped && <span className="ml-1 text-blue-500">(grouped)</span>}
                            </td>
                            <td className="px-4 py-2 text-right font-mono font-semibold text-green-600 dark:text-green-400">
                              {fmt(s.amount)}
                            </td>
                            <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{s.lockedBy ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </MonthSection>
                ))}
              </>
            )}

            {!loading && !error && data && tab === 'payments' && (
              <>
                {paymentGroups.length === 0 && (
                  <p className="px-4 py-6 text-center text-xs text-gray-400">No payments recorded yet</p>
                )}
                {paymentGroups.map(([key, rows]) => (
                  <MonthSection
                    key={key}
                    label={monthLabel(key)}
                    total={rows.reduce((s, r) => s + r.amount, 0)}
                    count={rows.length}
                    isOpen={openMonths.has(key)}
                    onToggle={() => toggleMonth(key)}
                    amountClass="text-red-600 dark:text-red-400"
                  >
                    <table className="w-full text-xs">
                      <thead className="bg-white dark:bg-gray-900">
                        <tr className="text-left text-gray-400 dark:text-gray-500">
                          <th className="px-4 py-1.5 font-medium">Date</th>
                          <th className="px-4 py-1.5 font-medium">Payee</th>
                          <th className="px-4 py-1.5 font-medium">Category</th>
                          <th className="px-4 py-1.5 font-medium text-right">Amount</th>
                          <th className="px-4 py-1.5 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {rows.map(p => (
                          <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmtDate(p.date)}</td>
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                              <div>{p.payee ?? '—'}</div>
                              {p.paymentType !== 'REGULAR' && (
                                <div className="text-gray-400">{paymentTypeLabel(p.paymentType)}</div>
                              )}
                            </td>
                            <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{p.category ?? '—'}</td>
                            <td className="px-4 py-2 text-right font-mono font-semibold text-red-600 dark:text-red-400">
                              {fmt(p.amount)}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                p.status === 'PAID'     ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                p.status === 'APPROVED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </MonthSection>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex-none px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-right">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
