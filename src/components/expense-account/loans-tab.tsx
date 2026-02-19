'use client'

import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/date-format'

interface LoanRepayment {
  amount: number
  interestAmount: number | null
  paymentDate: string
}

interface Loan {
  id: string
  loanNumber: string
  principalAmount: number
  remainingBalance: number
  totalInterestPaid: number
  totalPaid: number
  repayments: LoanRepayment[]
  loanDate: string
  dueDate: string | null
  status: string
  notes: string | null
  lender: { id: string; name: string; lenderType: string }
  createdAt: string
}

interface LoansTabProps {
  accountId: string
}

function statusBadge(status: string) {
  if (status === 'PAID_OFF') {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
        Paid Off
      </span>
    )
  }
  if (status === 'OVERDUE') {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
        Overdue
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
      Active
    </span>
  )
}

export function LoansTab({ accountId }: LoansTabProps) {
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Payment history modal
  const [historyLoan, setHistoryLoan] = useState<Loan | null>(null)

  // Payment modal state
  const [payingLoan, setPayingLoan] = useState<Loan | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payInterest, setPayInterest] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  useEffect(() => {
    loadLoans()
  }, [accountId])

  const loadLoans = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/expense-account/${accountId}/loans`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load loans')
      const data = await res.json()
      setLoans(data.data?.loans || [])
    } catch (e) {
      setError('Failed to load loans')
    } finally {
      setLoading(false)
    }
  }

  const openPayModal = (loan: Loan) => {
    setPayingLoan(loan)
    setPayAmount('')
    setPayInterest('')
    setPayNotes('')
    setPayError(null)
  }

  const closePayModal = () => {
    setPayingLoan(null)
    setPaying(false)
    setPayError(null)
  }

  const handlePay = async () => {
    if (!payingLoan || !payAmount) return
    setPaying(true)
    setPayError(null)
    const interest = payInterest ? Number(payInterest) : 0
    try {
      const res = await fetch(`/api/expense-account/${accountId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          payeeType: 'NONE',
          amount: Number(payAmount),        // only the payment — deducted from account
          paymentType: 'LOAN_REPAYMENT',
          loanId: payingLoan.id,
          interestAmount: interest || null, // fee that increases the loan balance
          notes: payNotes.trim() || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        closePayModal()
        loadLoans()
      } else {
        // Show a friendly message — never expose the raw Prisma error
        const msg = data.error || ''
        if (msg.includes('Insufficient') || msg.includes('balance')) {
          setPayError('Insufficient account balance to record this payment.')
        } else {
          setPayError('Failed to record payment. Please try again.')
        }
      }
    } catch {
      setPayError('Failed to record payment. Please try again.')
    } finally {
      setPaying(false)
    }
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
        <button onClick={loadLoans} className="mt-2 text-sm text-blue-600 hover:underline">Retry</button>
      </div>
    )
  }

  if (loans.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">🏦</p>
        <p className="text-gray-600 dark:text-gray-400 font-medium">No loans recorded</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Loans are created when you make a deposit with source type "Loan".
        </p>
      </div>
    )
  }

  const active = loans.filter(l => l.status === 'ACTIVE' || l.status === 'OVERDUE')
  const paidOff = loans.filter(l => l.status === 'PAID_OFF')

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{loans.length}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Total Loans</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
            {formatCurrency(active.reduce((s, l) => s + l.remainingBalance, 0))}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Outstanding Balance</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{paidOff.length}</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">Paid Off</p>
        </div>
      </div>

      {/* Loans Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Loan #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lender</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Principal</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Remaining</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payments</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Interest Paid</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Due Date</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loans.map((loan) => (
              <tr key={loan.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{loan.loanNumber}</td>
                <td className="px-4 py-3">
                  <div className="text-gray-900 dark:text-gray-100">{loan.lender.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{loan.lender.lenderType.toLowerCase()}</div>
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(loan.principalAmount)}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  <span className={loan.remainingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}>
                    {formatCurrency(loan.remainingBalance)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {loan.totalPaid > 0 ? (
                    <button
                      onClick={() => setHistoryLoan(loan)}
                      className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300"
                      title="View payment history"
                    >
                      {formatCurrency(loan.totalPaid)}
                      <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </button>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                  {loan.totalInterestPaid > 0 ? (
                    <span className="text-red-500 dark:text-red-400">{formatCurrency(loan.totalInterestPaid)}</span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{formatDate(loan.loanDate)}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                  {loan.dueDate ? formatDate(loan.dueDate) : '—'}
                </td>
                <td className="px-4 py-3 text-center">{statusBadge(loan.status)}</td>
                <td className="px-4 py-3 text-right">
                  {loan.status !== 'PAID_OFF' && (
                    <button
                      onClick={() => openPayModal(loan)}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Pay
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loans.some(l => l.notes) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Loan Notes</h4>
          {loans.filter(l => l.notes).map(loan => (
            <div key={loan.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
              <span className="font-mono text-xs text-gray-500 dark:text-gray-400 mr-2">{loan.loanNumber}</span>
              <span className="text-gray-700 dark:text-gray-300">{loan.notes}</span>
            </div>
          ))}
        </div>
      )}

      {/* Payment History Modal */}
      {historyLoan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-primary">Payment History</h3>
                <p className="text-xs text-secondary mt-0.5">{historyLoan.loanNumber} — {historyLoan.lender.name}</p>
              </div>
              <button onClick={() => setHistoryLoan(null)} className="text-secondary hover:text-primary text-xl leading-none">&times;</button>
            </div>

            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {historyLoan.repayments.length === 0 ? (
                <p className="text-sm text-secondary text-center py-8">No payments recorded yet.</p>
              ) : (
                historyLoan.repayments.map((r, i) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between">
                    <span className="text-sm text-secondary">{formatDate(r.paymentDate)}</span>
                    <div className="text-right">
                      <div className="text-sm font-medium text-primary">{formatCurrency(r.amount)}</div>
                      {r.interestAmount != null && r.interestAmount > 0 && (
                        <div className="text-xs text-red-500 dark:text-red-400">+{formatCurrency(r.interestAmount)} interest charged</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-border grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-secondary">Total Paid</p>
                <p className="font-semibold text-primary">{formatCurrency(historyLoan.totalPaid)}</p>
              </div>
              {historyLoan.totalInterestPaid > 0 && (
                <div>
                  <p className="text-xs text-secondary">Total Interest Charged</p>
                  <p className="font-semibold text-red-500 dark:text-red-400">{formatCurrency(historyLoan.totalInterestPaid)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loan Payment Modal */}
      {payingLoan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-primary">Loan Repayment</h3>
              <button onClick={closePayModal} className="text-secondary hover:text-primary text-lg leading-none">&times;</button>
            </div>

            <div className="text-sm text-secondary space-y-0.5">
              <p><span className="font-medium text-primary">{payingLoan.loanNumber}</span> — {payingLoan.lender.name}</p>
              <p>Current balance: <span className="font-medium text-amber-600 dark:text-amber-400">{formatCurrency(payingLoan.remainingBalance)}</span></p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-secondary mb-1 block">Interest Charged <span className="font-normal text-secondary/70">(optional)</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payInterest}
                  onChange={e => setPayInterest(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary text-sm"
                />
                <p className="text-xs text-secondary mt-0.5">Fee added to the loan balance</p>
              </div>

              {Number(payInterest) > 0 && (
                <div className="flex justify-between text-xs px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded text-amber-700 dark:text-amber-300">
                  <span>Balance after interest:</span>
                  <span className="font-semibold">{formatCurrency(payingLoan.remainingBalance + Number(payInterest))}</span>
                </div>
              )}

              <div>
                <label className="text-xs text-secondary mb-1 block">Payment Amount *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary text-sm"
                />
                <p className="text-xs text-secondary mt-0.5">Deducted from account, reduces balance</p>
              </div>

              {Number(payAmount) > 0 && (
                <div className="flex justify-between text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-700 dark:text-blue-300">
                  <span>Balance after payment:</span>
                  <span className="font-semibold">
                    {formatCurrency(Math.max(0, payingLoan.remainingBalance + (Number(payInterest) || 0) - Number(payAmount)))}
                  </span>
                </div>
              )}

              <div>
                <label className="text-xs text-secondary mb-1 block">Notes</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="Optional notes"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary text-sm"
                />
              </div>
            </div>

            {payError && <p className="text-xs text-red-500">{payError}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <button onClick={closePayModal} className="px-4 py-2 text-sm border border-border rounded-md text-secondary hover:bg-muted">
                Cancel
              </button>
              <button
                onClick={handlePay}
                disabled={paying || !payAmount}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {paying ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
