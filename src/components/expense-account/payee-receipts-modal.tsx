'use client'

import { useState, useEffect } from 'react'

interface ReceiptRow {
  id: string
  receiptDate: string
  amount: number
  description: string | null
  notes: string | null
  paymentId: string
  paymentDescription: string | null
  paymentDate: string
  paymentAmount: number
  accountName: string
}

interface PayeeReceiptsModalProps {
  payeeType: 'PERSON' | 'BUSINESS' | 'SUPPLIER'
  payeeId: string
  payeeName: string
  onClose: () => void
}

export function PayeeReceiptsModal({ payeeType, payeeId, payeeName, onClose }: PayeeReceiptsModalProps) {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([])
  const [summary, setSummary] = useState<{ totalReceiptCount: number; totalAmount: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams({ payeeType, payeeId })
    fetch(`/api/expense-account/payee-receipts?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setReceipts(json.data.receipts)
          setSummary(json.data.summary)
        } else {
          setError(json.error || 'Failed to load receipts')
        }
      })
      .catch(() => setError('Failed to load receipts'))
      .finally(() => setLoading(false))
  }, [payeeType, payeeId])

  const fmt = (n: number) => `$${Number(n).toFixed(2)}`
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">Receipt History</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{payeeName}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4">✕</button>
          </div>

          {summary && !loading && (
            <div className="mt-3 flex gap-4">
              <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded px-3 py-2 text-center">
                <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">Total Receipts</p>
                <p className="text-lg font-bold text-teal-700 dark:text-teal-300">{summary.totalReceiptCount}</p>
              </div>
              <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded px-3 py-2 text-center">
                <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">Total Amount</p>
                <p className="text-lg font-bold text-teal-700 dark:text-teal-300">{fmt(summary.totalAmount)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          ) : receipts.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-6">No receipts found for this payee</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <th className="pb-2 pr-3">Date</th>
                    <th className="pb-2 pr-3">Account</th>
                    <th className="pb-2 pr-3">Description</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map(r => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-2 pr-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {fmtDate(r.receiptDate)}
                      </td>
                      <td className="py-2 pr-3 text-gray-700 dark:text-gray-300 text-xs">
                        {r.accountName}
                      </td>
                      <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">
                        {r.description || r.paymentDescription || '—'}
                      </td>
                      <td className="py-2 text-right font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {fmt(r.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-sm">Close</button>
        </div>
      </div>
    </div>
  )
}
