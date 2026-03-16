'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface BusinessLoan {
  id: string
  loanNumber: string
  lenderName: string
  description: string
  totalAmount: string
  lockedBalance: string | null
  status: string
  expenseAccount: { balance: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  RECORDING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  LOCK_REQUESTED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  LOCKED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  SETTLED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
}

function fmt(val: string | number | null | undefined) {
  if (val == null) return '—'
  return `$${Number(val).toFixed(2)}`
}

export function BusinessLoansWidget() {
  const router = useRouter()
  const [loans, setLoans] = useState<BusinessLoan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/business-loans')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.loans) setLoans(data.loans) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || loans.length === 0) return null

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          💳 Business Loan Repayments
          <span className="text-sm font-normal text-secondary">({loans.length} loan{loans.length !== 1 ? 's' : ''})</span>
        </h3>
        <button
          onClick={() => router.push('/admin/loans')}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          View All →
        </button>
      </div>

      <div className="space-y-3">
        {loans.map(loan => {
          const currentBalance = Number(loan.expenseAccount?.balance ?? 0)
          const lockedBalance = Number(loan.lockedBalance ?? 0)
          const isLocked = loan.status === 'LOCKED' || loan.status === 'SETTLED'
          return (
            <div
              key={loan.id}
              onClick={() => router.push(`/loans/${loan.id}`)}
              className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium text-primary text-sm">{loan.lenderName}</span>
                  <span className="text-xs text-secondary ml-2">({loan.loanNumber})</span>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${STATUS_COLORS[loan.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {loan.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-secondary mb-2 truncate">{loan.description}</p>
              {isLocked ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <p className="text-xs text-secondary mb-0.5">Total Borrowed</p>
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{fmt(Math.abs(lockedBalance))}</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <p className="text-xs text-secondary mb-0.5">Paid to Date</p>
                    <p className="text-sm font-bold text-green-700 dark:text-green-400">{fmt(Math.abs(lockedBalance) - Math.abs(currentBalance))}</p>
                  </div>
                  <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <p className="text-xs text-secondary mb-0.5">Remaining</p>
                    <p className="text-sm font-bold text-red-700 dark:text-red-400">{fmt(Math.abs(currentBalance))}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                    <p className="text-xs text-secondary mb-0.5">Running Balance (not yet locked)</p>
                    <p className="text-sm font-bold text-orange-700 dark:text-orange-400">{fmt(currentBalance)}</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
