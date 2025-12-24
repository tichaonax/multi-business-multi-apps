'use client'

import { useState, useEffect } from 'react'
import { useAlert } from '@/components/ui/confirm-modal'

interface PayrollEntry {
  id: string
  employeeId: string
  employeeNumber: string
  employeeName: string
  nationalId: string
  netPay: number
  grossPay: number
  totalDeductions: number
  // Payment info if already paid
  payment?: {
    id: string
    amount: number
    status: string
    paymentDate: string
    createdBy: {
      name: string
    }
  }
}

interface BatchPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  periodId: string
  periodName: string
  onSuccess?: () => void
}

export function BatchPaymentModal({
  isOpen,
  onClose,
  periodId,
  periodName,
  onSuccess,
}: BatchPaymentModalProps) {
  const customAlert = useAlert()
  const [entries, setEntries] = useState<PayrollEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set())
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>({})
  const [paymentNotes, setPaymentNotes] = useState<Record<string, string>>({})
  const [processedPaymentIds, setProcessedPaymentIds] = useState<string[]>([])
  const [showVoucherOptions, setShowVoucherOptions] = useState(false)
  const [generatingVouchers, setGeneratingVouchers] = useState(false)

  useEffect(() => {
    if (isOpen && periodId) {
      loadEntries()
    }
  }, [isOpen, periodId])

  const loadEntries = async () => {
    try {
      setLoading(true)
      // Fetch payroll entries with payment info
      const response = await fetch(`/api/payroll/periods/${periodId}/payments-status`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        const entriesList = data.entries || []
        setEntries(entriesList)

        // Initialize payment amounts with netPay
        const amounts: Record<string, number> = {}
        entriesList.forEach((entry: PayrollEntry) => {
          if (!entry.payment) {
            amounts[entry.id] = Number(entry.netPay || 0)
          }
        })
        setPaymentAmounts(amounts)
      } else {
        const error = await response.json()
        customAlert({
          title: 'Error',
          message: error.error || 'Failed to load payroll entries',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Error loading entries:', error)
      customAlert({
        title: 'Error',
        message: 'Failed to load payroll entries',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleEntry = (entryId: string) => {
    const newSelected = new Set(selectedEntries)
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId)
    } else {
      newSelected.add(entryId)
    }
    setSelectedEntries(newSelected)
  }

  const handleToggleAll = () => {
    const eligibleEntries = entries.filter((e) => !e.payment)
    if (selectedEntries.size === eligibleEntries.length) {
      // Unselect all
      setSelectedEntries(new Set())
    } else {
      // Select all eligible
      setSelectedEntries(new Set(eligibleEntries.map((e) => e.id)))
    }
  }

  const handleAmountChange = (entryId: string, amount: number) => {
    setPaymentAmounts((prev) => ({ ...prev, [entryId]: amount }))
  }

  const handleNoteChange = (entryId: string, note: string) => {
    setPaymentNotes((prev) => ({ ...prev, [entryId]: note }))
  }

  const handleGenerateCombinedVouchers = async () => {
    if (processedPaymentIds.length === 0) return

    setGeneratingVouchers(true)
    try {
      const response = await fetch('/api/payroll/account/payments/vouchers/combined', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          paymentIds: processedPaymentIds,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // Open the PDF in a new tab
        window.open(data.pdfUrl, '_blank')

        customAlert({
          title: 'Success',
          message: 'Combined vouchers generated successfully',
          type: 'success',
        })

        setShowVoucherOptions(false)
        setProcessedPaymentIds([])
      } else {
        const error = await response.json()
        customAlert({
          title: 'Error',
          message: error.error || 'Failed to generate combined vouchers',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Error generating combined vouchers:', error)
      customAlert({
        title: 'Error',
        message: 'An error occurred while generating vouchers',
        type: 'error',
      })
    } finally {
      setGeneratingVouchers(false)
    }
  }

  const handleViewVouchers = () => {
    // Close modal and navigate to payment history where vouchers can be viewed
    onClose()
    window.location.href = '/payroll/account/payments/history'
  }

  const handleSubmit = async () => {
    if (selectedEntries.size === 0) {
      customAlert({
        title: 'No Selection',
        message: 'Please select at least one employee to process payment',
        type: 'error',
      })
      return
    }

    // Validate amounts
    const invalidAmounts = Array.from(selectedEntries).filter((id) => {
      const amount = paymentAmounts[id]
      return !amount || amount <= 0
    })

    if (invalidAmounts.length > 0) {
      customAlert({
        title: 'Invalid Amounts',
        message: 'All selected employees must have a payment amount greater than 0',
        type: 'error',
      })
      return
    }

    setSubmitting(true)

    try {
      // Prepare payment data
      const payments = Array.from(selectedEntries).map((entryId) => {
        const entry = entries.find((e) => e.id === entryId)
        return {
          payrollEntryId: entryId,
          employeeId: entry?.employeeId,
          amount: paymentAmounts[entryId],
          adjustmentNote: paymentNotes[entryId] || undefined,
        }
      })

      const response = await fetch('/api/payroll/account/payments/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          periodId,
          payments,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Store payment IDs for voucher generation
        const paymentIds = data.payments?.map((p: any) => p.id) || []
        setProcessedPaymentIds(paymentIds)
        setShowVoucherOptions(true)

        // Reset selections
        setSelectedEntries(new Set())
        setPaymentNotes({})

        if (onSuccess) {
          onSuccess()
        }

        // Reload entries to show updated payment status
        loadEntries()
      } else {
        customAlert({
          title: 'Error',
          message: data.error || 'Failed to create payments',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Error creating payments:', error)
      customAlert({
        title: 'Error',
        message: 'An error occurred while creating payments',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', label: 'Pending' },
      SIGNED: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', label: 'Signed' },
      COMPLETED: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', label: 'Completed' },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const eligibleEntries = entries.filter((e) => !e.payment)
  const paidEntries = entries.filter((e) => e.payment)
  const totalSelectedAmount = Array.from(selectedEntries).reduce(
    (sum, id) => sum + (paymentAmounts[id] || 0),
    0
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                💸 Process Batch Payments
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{periodName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-600 dark:text-gray-400">Loading...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Voucher Options - Show after successful processing */}
              {showVoucherOptions && processedPaymentIds.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                        ✅ Payments Processed Successfully!
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                        {processedPaymentIds.length} payment(s) have been created and vouchers have been generated.
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleGenerateCombinedVouchers}
                          disabled={generatingVouchers}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          {generatingVouchers ? 'Generating...' : 'Download Combined PDF'}
                        </button>
                        <button
                          onClick={handleViewVouchers}
                          className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Individual Vouchers
                        </button>
                        <button
                          onClick={() => {
                            setShowVoucherOptions(false)
                            setProcessedPaymentIds([])
                          }}
                          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-600 dark:text-blue-400">Eligible for Payment</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{eligibleEntries.length}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-sm text-green-600 dark:text-green-400">Already Paid</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-300">{paidEntries.length}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <p className="text-sm text-purple-600 dark:text-purple-400">Selected Amount</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                    {formatCurrency(totalSelectedAmount)}
                  </p>
                </div>
              </div>

              {/* Eligible Employees */}
              {eligibleEntries.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Eligible Employees ({eligibleEntries.length})
                    </h3>
                    <button
                      onClick={handleToggleAll}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {selectedEntries.size === eligibleEntries.length ? 'Unselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {eligibleEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`border rounded-lg p-4 transition-all ${
                          selectedEntries.has(entry.id)
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <div className="pt-1">
                            <input
                              type="checkbox"
                              checked={selectedEntries.has(entry.id)}
                              onChange={() => handleToggleEntry(entry.id)}
                              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          {/* Employee Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">{entry.employeeName}</h4>
                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  <span>ID: {entry.employeeNumber}</span>
                                  <span>•</span>
                                  <span>NID: {entry.nationalId}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Net Pay</p>
                                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                  {formatCurrency(entry.netPay)}
                                </p>
                              </div>
                            </div>

                            {/* Payment Details - Show when selected */}
                            {selectedEntries.has(entry.id) && (
                              <div className="mt-3 space-y-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      Payment Amount
                                    </label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={paymentAmounts[entry.id] || ''}
                                        onChange={(e) => handleAmountChange(entry.id, e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                        className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                                        placeholder="0.00"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      Adjustment Note (optional)
                                    </label>
                                    <input
                                      type="text"
                                      value={paymentNotes[entry.id] || ''}
                                      onChange={(e) => handleNoteChange(entry.id, e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                                      placeholder="Reason for adjustment"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Already Paid Employees */}
              {paidEntries.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Already Paid ({paidEntries.length})
                  </h3>

                  <div className="space-y-3">
                    {paidEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 opacity-75"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">✓</span>
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">{entry.employeeName}</h4>
                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  <span>ID: {entry.employeeNumber}</span>
                                  <span>•</span>
                                  <span>NID: {entry.nationalId}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="flex items-center gap-3 mb-2">
                              {entry.payment && getStatusBadge(entry.payment.status)}
                              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                {entry.payment && formatCurrency(entry.payment.amount)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Paid on {entry.payment && formatDate(entry.payment.paymentDate)}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              By: {entry.payment?.createdBy?.name || 'Unknown'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No employees message */}
              {entries.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400">No employees found in this payroll period</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              {selectedEntries.size > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedEntries.size} employee(s) selected • Total: {formatCurrency(totalSelectedAmount)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || selectedEntries.size === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Processing...' : `Process ${selectedEntries.size} Payment(s)`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
