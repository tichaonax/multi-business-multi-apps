'use client'

import { useState, useEffect } from 'react'
import { AddReceiptModal } from './add-receipt-modal'
import { useSession } from 'next-auth/react'

interface PayeeRef {
  type: string
  id: string
  name: string
}

interface Receipt {
  id: string
  receiptDate: string
  amount: number
  description: string | null
  payeeName: string | null
  payeeType: string | null
  notes: string | null
  createdBy: string
  createdByName: string
  createdAt: string
}

interface ViewReceiptsModalProps {
  paymentId: string
  paymentAmount: number
  paymentDescription: string
  paymentPayee?: PayeeRef | null
  onClose: () => void
  onReceiptsChanged: () => void
}

export function ViewReceiptsModal({
  paymentId,
  paymentAmount,
  paymentDescription,
  paymentPayee,
  onClose,
  onReceiptsChanged,
}: ViewReceiptsModalProps) {
  const { data: session } = useSession()
  const currentUserId = (session?.user as any)?.id as string | undefined
  const isAdmin = (session?.user as any)?.role === 'admin'

  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [currentPayee, setCurrentPayee] = useState<PayeeRef | null>(paymentPayee ?? null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadReceipts()
  }, [paymentId])

  async function loadReceipts() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/expense-account/payments/${paymentId}/receipts`, {
        credentials: 'include',
      })
      const json = await res.json()
      if (json.success) {
        setReceipts(json.data.receipts)
        if (json.data.currentPayee) setCurrentPayee(json.data.currentPayee)
      } else {
        setError(json.error || 'Failed to load receipts')
      }
    } catch {
      setError('Failed to load receipts')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(receiptId: string) {
    setDeletingId(receiptId)
    try {
      const res = await fetch(`/api/expense-account/receipts/${receiptId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok || res.status === 204) {
        await loadReceipts()
        onReceiptsChanged()
      } else {
        const json = await res.json()
        alert(json.error || 'Failed to delete receipt')
      }
    } catch {
      alert('Failed to delete receipt')
    } finally {
      setDeletingId(null)
    }
  }

  function canDelete(r: Receipt): boolean {
    if (isAdmin) return true
    if (r.createdBy !== currentUserId) return false
    const diffDays = (Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    return diffDays <= 7
  }

  const fmt = (n: number) => `$${Number(n).toFixed(2)}`
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold">Receipts</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {paymentDescription} — {fmt(paymentAmount)}
                </p>
                {currentPayee && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Payee: {currentPayee.name}
                  </p>
                )}
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4">✕</button>
            </div>
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
              <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-6">No receipts yet</p>
            ) : (
              <div className="space-y-3">
                {receipts.map(r => (
                  <div key={r.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{fmt(r.amount)}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(r.receiptDate)}</span>
                          {r.payeeName && (
                            <>
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs text-teal-600 dark:text-teal-400">{r.payeeName}</span>
                            </>
                          )}
                        </div>
                        {r.description && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{r.description}</p>
                        )}
                        {r.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic">{r.notes}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">Added by {r.createdByName}</p>
                      </div>
                      {canDelete(r) && (
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId === r.id}
                          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 flex-shrink-0 px-1"
                          title="Delete receipt"
                        >
                          {deletingId === r.id ? '...' : '✕'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {receipts.length} receipt{receipts.length !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary text-sm">Close</button>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary text-sm"
              >
                + Add Receipt
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddReceiptModal
          paymentId={paymentId}
          paymentPayee={currentPayee}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            loadReceipts()
            onReceiptsChanged()
          }}
        />
      )}
    </>
  )
}
