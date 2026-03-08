'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'

interface LoanSummary {
  id: string
  loanNumber: string
  description: string
  totalAmount: string
  lockedBalance: string | null
  lenderName: string
  status: string
  createdAt: string
  expenseAccount: { id: string; accountNumber: string; balance: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  RECORDING: 'Recording',
  LOCK_REQUESTED: 'Lock Requested',
  LOCKED: 'Locked',
  SETTLED: 'Settled',
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

export default function LoansPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [loans, setLoans] = useState<LoanSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentUser = session?.user as any

  const fetchLoans = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/loans/my', { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load loans')
      setLoans(json.loans)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    fetchLoans()
  }, [session, status, fetchLoans])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }

  return (
    <ContentLayout title="Loan Repayments">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Loan Repayments</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Loans you are assigned to manage or track.
            </p>
          </div>
          {currentUser?.role === 'admin' && (
            <Link
              href="/admin/loans"
              className="px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Admin View
            </Link>
          )}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {!error && loans.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center text-gray-400 dark:text-gray-500">
            No loans assigned to you.
          </div>
        ) : (
          <div className="space-y-4">
            {loans.map(loan => {
              const balance = loan.expenseAccount ? Number(loan.expenseAccount.balance) : null
              const isNegative = balance !== null && balance < 0
              return (
                <Link
                  key={loan.id}
                  href={`/loans/${loan.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-gray-800 dark:text-gray-200">{loan.loanNumber}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[loan.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[loan.status] ?? loan.status}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 truncate">{loan.description}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Lender: {loan.lenderName}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-xs text-gray-400 dark:text-gray-500">Current Balance</p>
                      <p className={`text-lg font-bold font-mono ${isNegative ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {balance !== null ? fmt(balance) : '—'}
                      </p>
                      {loan.lockedBalance && (
                        <>
                          <p className="text-xs text-gray-400 dark:text-gray-500">Locked at {fmt(loan.lockedBalance)}</p>
                          {balance !== null && loan.lockedBalance && (
                            <div className="w-28">
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div
                                  className="bg-blue-500 h-1.5 rounded-full"
                                  style={{
                                    width: `${Math.min(100, Math.round(
                                      (Math.abs(Number(loan.lockedBalance)) - Math.abs(balance)) /
                                      Math.abs(Number(loan.lockedBalance)) * 100
                                    ))}%`
                                  }}
                                />
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5 text-right">
                                {Math.min(100, Math.round(
                                  (Math.abs(Number(loan.lockedBalance)) - Math.abs(balance)) /
                                  Math.abs(Number(loan.lockedBalance)) * 100
                                ))}% repaid
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
