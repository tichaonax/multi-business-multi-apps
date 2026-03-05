'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/date-format'
import { RentPaymentModal } from './rent-payment-modal'

interface RentMonthlySummaryProps {
  businessId: string
  accountId: string
  monthlyRentAmount: number
  dailyTransferAmount: number
  rentDueDay: number
  landlordSupplier: {
    id: string
    name: string
    contactPerson?: string | null
    phone?: string | null
  } | null
}

interface Transaction {
  id: string
  type: 'DEPOSIT' | 'PAYMENT'
  amount: number
  date: string
  description: string
  balance?: number
  sourceType?: string
}

export function RentMonthlySummary({
  businessId,
  accountId,
  monthlyRentAmount,
  dailyTransferAmount,
  rentDueDay,
  landlordSupplier,
}: RentMonthlySummaryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [currentBalance, setCurrentBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showPayModal, setShowPayModal] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const PAGE_SIZE = 20

  const loadTransactions = useCallback(async (offset = 0) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/expense-account/${accountId}/transactions?limit=${PAGE_SIZE}&offset=${offset}&sortOrder=desc`
      )
      if (res.ok) {
        const data = await res.json()
        const txns: Transaction[] = (data.transactions ?? []).map((t: any) => ({
          id: t.id,
          type: t.transactionType as 'DEPOSIT' | 'PAYMENT',
          amount: Math.abs(Number(t.amount)),
          date: t.transactionDate ?? t.paymentDate ?? t.depositDate,
          description: t.description ?? t.sourceType ?? (t.transactionType === 'DEPOSIT' ? 'Deposit' : 'Payment'),
          balance: t.runningBalance != null ? Number(t.runningBalance) : undefined,
          sourceType: t.sourceType,
        }))
        if (offset === 0) {
          setTransactions(txns)
        } else {
          setTransactions(prev => [...prev, ...txns])
        }
        setHasMore(txns.length === PAGE_SIZE)
      }

      // Also refresh balance from balance endpoint
      const balRes = await fetch(`/api/rent-account/${businessId}/balance`)
      if (balRes.ok) {
        const balData = await balRes.json()
        if (balData.hasRentAccount) setCurrentBalance(balData.balance ?? 0)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [accountId, businessId])

  useEffect(() => {
    loadTransactions(0)
  }, [loadTransactions])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    loadTransactions(next * PAGE_SIZE)
  }

  // Compute this month's stats
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthTxns = transactions.filter(t => new Date(t.date) >= monthStart)
  const thisMonthDeposits = thisMonthTxns.filter(t => t.type === 'DEPOSIT').reduce((s, t) => s + t.amount, 0)
  const thisMonthPayments = thisMonthTxns.filter(t => t.type === 'PAYMENT').reduce((s, t) => s + t.amount, 0)
  const daysRemaining = rentDueDay - now.getDate()
  const fundingPct = monthlyRentAmount > 0 ? Math.min(100, Math.round((currentBalance / monthlyRentAmount) * 100)) : 0

  function indColor(pct: number) {
    if (pct >= 100) return 'text-green-600 dark:text-green-400'
    if (pct >= 75) return 'text-orange-500 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }
  function indBg(pct: number) {
    if (pct >= 100) return 'bg-green-500'
    if (pct >= 75) return 'bg-orange-400'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-4">
      {/* Monthly cycle stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Balance</div>
          <div className={`text-base font-bold ${indColor(fundingPct)}`}>{formatCurrency(currentBalance)}</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">This Month Deposited</div>
          <div className="text-base font-bold text-blue-600 dark:text-blue-400">{formatCurrency(thisMonthDeposits)}</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">This Month Paid</div>
          <div className="text-base font-bold text-purple-600 dark:text-purple-400">{formatCurrency(thisMonthPayments)}</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {daysRemaining > 0 ? `${daysRemaining}d to due` : daysRemaining === 0 ? 'Due today' : 'Overdue'}
          </div>
          <div className={`text-base font-bold ${daysRemaining <= 0 ? 'text-red-600 dark:text-red-400' : daysRemaining <= 3 ? 'text-orange-500' : 'text-gray-700 dark:text-gray-300'}`}>
            Day {rentDueDay}
          </div>
        </div>
      </div>

      {/* Funding progress */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Funding progress</span>
          <span className={`font-semibold ${indColor(fundingPct)}`}>{fundingPct}% of {formatCurrency(monthlyRentAmount)}</span>
        </div>
        <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${indBg(fundingPct)}`} style={{ width: `${fundingPct}%` }} />
        </div>
      </div>

      {/* Pay Rent button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Daily target: {formatCurrency(dailyTransferAmount)}/day
          {landlordSupplier && <> · Landlord: <span className="font-medium text-gray-700 dark:text-gray-300">{landlordSupplier.name}</span></>}
        </p>
        <button
          onClick={() => setShowPayModal(true)}
          disabled={currentBalance <= 0}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          💸 Pay Rent
        </button>
      </div>

      {/* Transaction ledger */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Transaction History</h4>
        {loading && transactions.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center">Loading transactions…</div>
        ) : transactions.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center">No transactions yet.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-left p-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Date</th>
                  <th className="text-left p-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Description</th>
                  <th className="text-right p-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Amount</th>
                  {transactions.some(t => t.balance != null) && (
                    <th className="text-right p-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Balance</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={t.id} className={`border-t border-gray-100 dark:border-gray-700 ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-700/20'}`}>
                    <td className="p-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="p-2 text-xs text-gray-700 dark:text-gray-300">
                      <span className="mr-1">{t.type === 'DEPOSIT' ? '⬆️' : '⬇️'}</span>
                      {t.description}
                    </td>
                    <td className={`p-2 text-xs font-semibold text-right whitespace-nowrap ${t.type === 'DEPOSIT' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {t.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                    {transactions.some(tx => tx.balance != null) && (
                      <td className="p-2 text-xs text-right text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {t.balance != null ? formatCurrency(t.balance) : '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMore && (
              <div className="p-2 text-center border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="text-xs text-blue-600 dark:text-blue-400 underline hover:no-underline disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pay rent modal */}
      {showPayModal && (
        <RentPaymentModal
          businessId={businessId}
          accountId={accountId}
          accountBalance={currentBalance}
          monthlyRentAmount={monthlyRentAmount}
          landlordSupplier={landlordSupplier}
          onSuccess={() => {
            setShowPayModal(false)
            setPage(0)
            loadTransactions(0)
          }}
          onClose={() => setShowPayModal(false)}
        />
      )}
    </div>
  )
}
