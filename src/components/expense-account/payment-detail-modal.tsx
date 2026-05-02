'use client'

import { useState, useEffect } from 'react'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'

interface PaymentDetail {
  id: string
  amount: number
  paymentDate: string
  payeeType: string
  payeeUser: { name: string; email?: string } | null
  payeeEmployee: { fullName: string; phone?: string | null; nationalId?: string | null } | null
  payeePerson: { fullName: string; phone?: string | null; email?: string | null; nationalId?: string | null } | null
  payeeBusiness: { name: string } | null
  payeeSupplier: { name: string; phone?: string | null; contactPerson?: string | null } | null
  category: { name: string; emoji: string } | null
  subcategory: { name: string; emoji: string } | null
  notes: string | null
  status: string
  paymentType: string
  paymentChannel: string
  receiptNumber: string | null
  createdBy: { name: string } | null
  // Transfer link (MBM-198)
  destinationDepositId: string | null
  destinationAccountId: string | null
  destinationAccountName: string | null
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-primary break-words">{value}</span>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DRAFT:     'bg-gray-100  text-gray-600  dark:bg-gray-700     dark:text-gray-300',
  QUEUED:    'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400',
  REQUEST:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  PAID:      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

function resolvePhone(payment: PaymentDetail): string | null {
  const raw =
    payment.payeeEmployee?.phone ||
    payment.payeePerson?.phone ||
    payment.payeeSupplier?.phone ||
    null
  if (!raw) return null
  try {
    const formatted = formatPhoneNumberForDisplay(raw)
    return formatted || raw
  } catch {
    return raw
  }
}

function resolveNationalId(payment: PaymentDetail): string | null {
  return payment.payeeEmployee?.nationalId || payment.payeePerson?.nationalId || null
}

export function PaymentDetailModal({
  isOpen,
  onClose,
  accountId,
  paymentId,
}: {
  isOpen: boolean
  onClose: () => void
  accountId: string
  paymentId: string
}) {
  const [payment, setPayment] = useState<PaymentDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !accountId || !paymentId) { setPayment(null); return }
    setLoading(true)
    fetch(`/api/expense-account/${accountId}/payments/${paymentId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setPayment(d?.data?.payment ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isOpen, accountId, paymentId])

  if (!isOpen) return null

  const payeeName = payment?.payeeUser?.name
    ?? payment?.payeeEmployee?.fullName
    ?? payment?.payeePerson?.fullName
    ?? payment?.payeeBusiness?.name
    ?? payment?.payeeSupplier?.name
    ?? '—'

  const phone = payment ? resolvePhone(payment) : null
  const nationalId = payment ? resolveNationalId(payment) : null
  const statusColor = STATUS_COLORS[payment?.status ?? ''] ?? 'bg-gray-100 text-gray-600'

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10200] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-border w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-primary">
            {payment?.paymentType === 'TRANSFER_OUT' ? '💸 Auto-Transfer Out' : 'Payment Details'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {loading ? (
            <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
          ) : !payment ? (
            <p className="text-sm text-gray-400 py-8 text-center">Payment not found</p>
          ) : (
            <div className="space-y-3">
              {/* Auto-transfer badge */}
              {payment.paymentType === 'TRANSFER_OUT' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-700 rounded-lg">
                  <span className="text-sky-600 dark:text-sky-400 text-xs">🔒 Auto-transfer — not editable</span>
                </div>
              )}
              {payment.paymentType !== 'TRANSFER_OUT' && (
                <Row label="Payee" value={payeeName} />
              )}
              {nationalId && <Row label="ID" value={nationalId} />}
              {phone && <Row label="Phone" value={phone} />}
              <Row label="Amount" value={`$${payment.amount.toFixed(2)}`} />
              <Row label="Date" value={payment.paymentDate.slice(0, 10)} />
              {/* Destination account for TRANSFER_OUT */}
              {payment.paymentType === 'TRANSFER_OUT' && (
                <div className="flex gap-3">
                  <span className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">To Account</span>
                  {payment.destinationAccountId && payment.destinationDepositId ? (
                    <a
                      href={`/expense-accounts/${payment.destinationAccountId}/deposits/${payment.destinationDepositId}`}
                      className="text-sm text-sky-600 dark:text-sky-400 hover:underline font-medium"
                      onClick={onClose}
                    >
                      → {payment.destinationAccountName ?? 'Destination Account'}
                    </a>
                  ) : payment.destinationAccountName ? (
                    <span className="text-sm text-sky-700 dark:text-sky-400 font-medium">
                      → {payment.destinationAccountName}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </div>
              )}
              {payment.category && (
                <Row label="Category" value={`${payment.category.emoji} ${payment.category.name}`} />
              )}
              {payment.subcategory && (
                <Row label="Subcategory" value={`${payment.subcategory.emoji} ${payment.subcategory.name}`} />
              )}
              {payment.paymentType !== 'TRANSFER_OUT' && (
                <Row label="Channel" value={payment.paymentChannel === 'ECOCASH' ? '📱 EcoCash' : '💵 Cash'} />
              )}
              <div className="flex gap-3 items-center">
                <span className="text-xs text-gray-400 w-28 shrink-0">Status</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
                  {payment.status}
                </span>
              </div>
              {payment.receiptNumber && <Row label="Receipt #" value={payment.receiptNumber} />}
              {payment.notes && <Row label="Notes" value={payment.notes} />}
              {payment.createdBy && <Row label="Created by" value={payment.createdBy.name} />}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex justify-between items-center">
          {payment && payment.paymentType !== 'TRANSFER_OUT' && (
            <a
              href={`/expense-accounts/${accountId}/payments/${paymentId}`}
              onClick={onClose}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              View full details →
            </a>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-primary rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
