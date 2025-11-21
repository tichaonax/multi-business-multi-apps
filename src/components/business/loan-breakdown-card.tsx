'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface LoanDetail {
  id: string
  loanNumber: string
  lenderName: string
  lenderType: 'business' | 'bank' | 'individual'
  principalAmount: number
  interestRate: number
  interestAmount: number
  totalAmount: number
  remainingBalance: number
  loanDate: string | null
  dueDate: string | null
  status: string
}

interface LoanBreakdownData {
  hasLoans: boolean
  summary: {
    totalLoansReceived: number
    totalInterestAccrued: number
    totalOutstanding: number
    activeLoansCount: number
    totalLoansCount: number
  } | null
  loans: LoanDetail[]
}

interface LoanBreakdownCardProps {
  businessId: string
  className?: string
}

export function LoanBreakdownCard({ businessId, className = '' }: LoanBreakdownCardProps) {
  const router = useRouter()
  const [data, setData] = useState<LoanBreakdownData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const handleLoanClick = (loanId: string) => {
    router.push(`/business/manage/loans?viewLoan=${loanId}`)
  }

  useEffect(() => {
    fetchLoanBreakdown()
  }, [businessId])

  const fetchLoanBreakdown = async () => {
    try {
      const response = await fetch(`/api/business/${businessId}/loan-breakdown`, {
        credentials: 'include'
      })
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch loan breakdown:', error)
    } finally {
      setLoading(false)
    }
  }

  // Don't render if loading or no loans
  if (loading) return null
  if (!data?.hasLoans || !data.summary) return null

  const { summary, loans } = data

  const getLenderIcon = (type: string) => {
    switch (type) {
      case 'bank': return '🏦'
      case 'business': return '🏢'
      default: return '👤'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</span>
      case 'paid':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Paid</span>
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">{status}</span>
    }
  }

  return (
    <div className={`card p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          💰 Loans Received
          <span className="text-sm font-normal text-secondary">
            ({summary.activeLoansCount} active of {summary.totalLoansCount})
          </span>
        </h3>
        {loans.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            {expanded ? 'Hide Details' : 'Show Details'}
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-xs text-secondary mb-1">Total Received</p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            ${summary.totalLoansReceived.toFixed(2)}
          </p>
        </div>
        <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <p className="text-xs text-secondary mb-1">Interest Accrued</p>
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
            ${summary.totalInterestAccrued.toFixed(2)}
          </p>
        </div>
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-xs text-secondary mb-1">Outstanding</p>
          <p className="text-lg font-bold text-red-600 dark:text-red-400">
            ${summary.totalOutstanding.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Expanded Loan Details */}
      {expanded && (
        <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
          {loans.map(loan => (
            <div
              key={loan.id}
              onClick={() => handleLoanClick(loan.id)}
              className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>{getLenderIcon(loan.lenderType)}</span>
                  <span className="font-medium text-primary">{loan.lenderName}</span>
                  <span className="text-xs text-secondary">({loan.loanNumber})</span>
                </div>
                {getStatusBadge(loan.status)}
              </div>
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-secondary">Principal:</span>
                  <span className="ml-1 font-medium text-primary">${loan.principalAmount.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-secondary">Interest:</span>
                  <span className="ml-1 font-medium text-orange-600">${loan.interestAmount.toFixed(2)}</span>
                  {loan.interestRate > 0 && <span className="text-xs text-secondary ml-1">({loan.interestRate}%)</span>}
                </div>
                <div>
                  <span className="text-secondary">Remaining:</span>
                  <span className="ml-1 font-medium text-red-600">${loan.remainingBalance.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-secondary">Due:</span>
                  <span className="ml-1 text-primary">{loan.dueDate || 'N/A'}</span>
                </div>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Click to view payment history &rarr;
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
