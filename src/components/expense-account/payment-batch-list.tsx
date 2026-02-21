'use client'

import { useState } from 'react'

interface BatchPayment {
  id: string // Temporary client-side ID
  payeeType: string
  payeeName: string
  payeeId: string
  categoryId: string
  categoryName: string
  categoryEmoji: string
  subcategoryId?: string
  subcategoryName?: string
  amount: number
  paymentDate: string
  notes?: string
  receiptNumber?: string
  receiptServiceProvider?: string
  receiptReason?: string
  isFullPayment?: boolean
}

interface PaymentBatchListProps {
  payments: BatchPayment[]
  currentBalance: number
  onEdit: (payment: BatchPayment) => void
  onDelete: (paymentId: string) => void
  onClearAll: () => void
  disabled?: boolean
}

export function PaymentBatchList({
  payments,
  currentBalance,
  onEdit,
  onDelete,
  onClearAll,
  disabled = false,
}: PaymentBatchListProps) {
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getPayeeTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      USER: { label: 'User', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
      EMPLOYEE: { label: 'Employee', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
      PERSON: { label: 'Individual', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
      BUSINESS: { label: 'Business', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
      SUPPLIER: { label: 'Supplier', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
      NONE: { label: 'Vehicle Expense', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    }
    return badges[type] || { label: type, className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' }
  }

  // Calculate running balance after each payment
  const paymentsWithBalance = payments.map((payment, index) => {
    const previousPayments = payments.slice(0, index)
    const totalPreviousPayments = previousPayments.reduce((sum, p) => sum + p.amount, 0)
    const balanceAfter = currentBalance - totalPreviousPayments - payment.amount

    return {
      ...payment,
      balanceAfter,
      isNegative: balanceAfter < 0
    }
  })

  const totalBatchAmount = payments.reduce((sum, p) => sum + p.amount, 0)
  const finalBalance = currentBalance - totalBatchAmount
  const hasNegativeBalance = finalBalance < 0

  if (payments.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
        <div className="text-4xl mb-2">📝</div>
        <p className="text-gray-500 dark:text-gray-400">No payments in batch</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Add payments using the form above
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Batch Summary Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Batch Summary</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {payments.length} payment{payments.length !== 1 ? 's' : ''} • {formatCurrency(totalBatchAmount)}
          </p>
        </div>
        <button
          onClick={onClearAll}
          disabled={disabled}
          className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear All
        </button>
      </div>

      {/* Payment List */}
      <div className="space-y-2">
        {paymentsWithBalance.map((payment, index) => {
          const badge = getPayeeTypeBadge(payment.payeeType)
          const isExpanded = expandedPaymentId === payment.id

          return (
            <div
              key={payment.id}
              className={`border rounded-lg overflow-hidden ${
                payment.isNegative
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              {/* Main Row */}
              <div className="p-3 flex items-center gap-3">
                {/* Index */}
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-300">
                  {index + 1}
                </div>

                {/* Payee Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {payment.payeeName}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {payment.categoryEmoji} {payment.categoryName}
                    {payment.subcategoryName && ` › ${payment.subcategoryName}`}
                  </div>
                </div>

                {/* Amount & Balance */}
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-gray-100">
                    -{formatCurrency(payment.amount)}
                  </p>
                  <p className={`text-xs ${payment.isNegative ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                    Balance: {formatCurrency(payment.balanceAfter)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setExpandedPaymentId(isExpanded ? null : payment.id)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="View details"
                  >
                    <svg
                      className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onEdit(payment)}
                    disabled={disabled}
                    className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Edit payment"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(payment.id)}
                    disabled={disabled}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete payment"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Payment Date:</span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">{formatDate(payment.paymentDate)}</span>
                    </div>
                    {payment.receiptNumber && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Receipt #:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">{payment.receiptNumber}</span>
                      </div>
                    )}
                  </div>
                  {payment.notes && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Notes:</span>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">{payment.notes}</p>
                    </div>
                  )}
                  {payment.receiptServiceProvider && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Service Provider:</span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">{payment.receiptServiceProvider}</span>
                    </div>
                  )}
                  {payment.receiptReason && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Reason:</span>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">{payment.receiptReason}</p>
                    </div>
                  )}
                  {payment.isFullPayment !== undefined && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Payment Type:</span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">
                        {payment.isFullPayment ? 'Full Payment' : 'Partial Payment'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Negative Balance Warning */}
              {payment.isNegative && (
                <div className="px-3 pb-3 pt-0">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-semibold">Insufficient balance after this payment</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Final Balance Summary */}
      <div className={`p-4 rounded-lg ${hasNegativeBalance ? 'bg-red-50 dark:bg-red-900/10 border-2 border-red-500' : 'bg-green-50 dark:bg-green-900/10 border-2 border-green-500'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Final Balance</p>
            <p className={`text-2xl font-bold ${hasNegativeBalance ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {formatCurrency(finalBalance)}
            </p>
          </div>
          {hasNegativeBalance && (
            <div className="text-red-600 dark:text-red-400 text-right">
              <p className="font-semibold">Insufficient Funds</p>
              <p className="text-sm">Shortfall: {formatCurrency(Math.abs(finalBalance))}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
