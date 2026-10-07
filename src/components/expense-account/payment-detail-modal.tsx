'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'

interface PaymentDetail {
  id: string
  amount: number
  paymentDate: string
  payeeType: string
  payeeUser: { id: string; name: string; email?: string } | null
  payeeEmployee: { id: string; fullName: string; phone?: string | null; nationalId?: string | null } | null
  payeePerson: { id: string; fullName: string; phone?: string | null; email?: string | null; nationalId?: string | null; emoji?: string | null } | null
  payeeBusiness: { id: string; name: string } | null
  payeeSupplier: { id: string; name: string; phone?: string | null; contactPerson?: string | null; emoji?: string | null; businessId?: string | null } | null
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
  expenseAccountBusinessId: string | null
}

const PAYEE_TYPE_BADGE: Record<string, { label: string; emoji: string; style: string }> = {
  USER:     { label: 'User',       emoji: '👤', style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  EMPLOYEE: { label: 'Employee',   emoji: '👷', style: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  PERSON:   { label: 'Contractor', emoji: '🤝', style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  BUSINESS: { label: 'Business',   emoji: '🏢', style: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  SUPPLIER: { label: 'Supplier',   emoji: '🚚', style: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
}

function resolvePayeeHistoryUrl(payment: PaymentDetail): string | null {
  switch (payment.payeeType) {
    case 'PERSON':   return payment.payeePerson ? `/expense-accounts/reports/payee-history?payeeType=PERSON&payeeId=${payment.payeePerson.id}` : null
    case 'SUPPLIER': return payment.payeeSupplier ? `/expense-accounts/reports/payee-history?payeeType=SUPPLIER&payeeId=${payment.payeeSupplier.id}` : null
    case 'EMPLOYEE': return payment.payeeEmployee ? `/expense-accounts/reports/payee-history?payeeType=EMPLOYEE&payeeId=${payment.payeeEmployee.id}` : null
    case 'USER':     return payment.payeeUser ? `/expense-accounts/reports/payee-history?payeeType=USER&payeeId=${payment.payeeUser.id}` : null
    case 'BUSINESS': return payment.payeeBusiness ? `/expense-accounts/reports/payee-history?payeeType=BUSINESS&payeeId=${payment.payeeBusiness.id}` : null
    default: return null
  }
}

// returnTo: pre-encoded URL back to this exact Payment Details modal — the
// destination page reads it as ?returnTo= and navigates back there on
// close/save instead of its own default list view. Same established pattern
// as grocery/clothing inventory's report-page deep-link-and-return (see
// src/app/grocery/inventory/page.tsx's editReturnTo).
function resolveManageUrl(payment: PaymentDetail, returnTo: string): string | null {
  switch (payment.payeeType) {
    // Deep-link straight to this specific record — /contractors reads
    // ?edit=, /business/suppliers already supported ?supplierId= for the
    // payment-queue flow (reused here, same pattern). Previously SUPPLIER
    // pointed at /supplier-payments, which is a payment-REQUEST workflow
    // page with no supplier-editing UI at all — wrong destination, not a
    // caching issue.
    case 'PERSON':   return payment.payeePerson ? `/contractors?edit=${payment.payeePerson.id}&returnTo=${returnTo}` : '/contractors'
    case 'EMPLOYEE': return '/employees'
    case 'SUPPLIER': return payment.payeeSupplier ? `/business/suppliers?supplierId=${payment.payeeSupplier.id}&returnTo=${returnTo}` : null
    default:         return null
  }
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
  onEditPayment,
}: {
  isOpen: boolean
  onClose: () => void
  accountId: string
  paymentId: string
  // Opens the full payment editor (EditPaymentModal) for this payment —
  // that's where Category/Subcategory actually live and already has a
  // working Suggest-driven picker wired to refresh the transaction list on
  // save. Optional: omitted by callers with no edit flow of their own
  // (e.g. read-only drill-down contexts), in which case no edit action shows.
  onEditPayment?: () => void
}) {
  const router = useRouter()
  const toast = useToastContext()
  const { currentBusinessId, switchBusiness } = useBusinessPermissionsContext()
  const [payment, setPayment] = useState<PaymentDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [switchingBusiness, setSwitchingBusiness] = useState(false)

  useEffect(() => {
    if (!isOpen || !accountId || !paymentId) { setPayment(null); return }
    setLoading(true)
    fetch(`/api/expense-account/${accountId}/payments/${paymentId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setPayment(d?.data?.payment ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isOpen, accountId, paymentId])

  // The expense account a payment lives on is NOT necessarily tied to the
  // app's globally-selected "current business" — a supplier's own record,
  // though, only exists under its real owning business
  // (BusinessSuppliers.businessId). /business/suppliers scopes its fetch to
  // currentBusinessId, so deep-linking there silently shows nothing if the
  // two differ. Switch first, same established pattern as
  // warehouse/[batchId]/page.tsx's cross-business navigation.
  async function handleManageClick(e: React.MouseEvent, url: string) {
    if (payment?.payeeType !== 'SUPPLIER' || !payment.payeeSupplier?.businessId) return
    const targetBusinessId = payment.payeeSupplier.businessId
    if (targetBusinessId === currentBusinessId) return
    e.preventDefault()
    setSwitchingBusiness(true)
    try {
      await switchBusiness(targetBusinessId)
      onClose()
      router.push(url)
    } catch {
      toast.error('Could not switch to that supplier\'s business')
    } finally {
      setSwitchingBusiness(false)
    }
  }

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
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-border w-full max-w-md"
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
              {payment.paymentType !== 'TRANSFER_OUT' && (() => {
                const badge = PAYEE_TYPE_BADGE[payment.payeeType]
                const historyUrl = resolvePayeeHistoryUrl(payment)
                // Reopens this exact Payment Details modal when the user
                // navigates back from editing the payee's full record.
                const returnTo = encodeURIComponent(`/expense-accounts/${accountId}?tab=transactions&openPaymentDetail=${paymentId}`)
                const manageUrl = resolveManageUrl(payment, returnTo)
                const payeeEmoji = payment.payeePerson?.emoji || payment.payeeSupplier?.emoji || null
                const defaultEmoji = badge?.emoji || '👤'
                return (
                  <div className="flex gap-3">
                    <span className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">Payee</span>
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base leading-none">{payeeEmoji || defaultEmoji}</span>
                        {historyUrl ? (
                          <Link
                            href={historyUrl}
                            onClick={onClose}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {payeeName}
                          </Link>
                        ) : (
                          <span className="text-sm text-primary">{payeeName}</span>
                        )}
                        {badge && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.style}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {historyUrl && (
                          <Link
                            href={historyUrl}
                            onClick={onClose}
                            className="text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                          >
                            📋 Payment history
                          </Link>
                        )}
                        {manageUrl && (
                          <Link
                            href={manageUrl}
                            onClick={(e) => { handleManageClick(e, manageUrl); if (!e.defaultPrevented) onClose() }}
                            className="text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                          >
                            ✏️ {switchingBusiness ? 'Switching business…' : 'View / Edit details'}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}
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
              {(payment.category || onEditPayment) && payment.paymentType !== 'TRANSFER_OUT' && (
                <div className="flex gap-3">
                  <span className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">Category</span>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm text-primary break-words">
                      {payment.category
                        ? `${payment.category.emoji} ${payment.category.name}${payment.subcategory ? ` › ${payment.subcategory.emoji} ${payment.subcategory.name}` : ''}`
                        : <span className="italic text-gray-400">not set</span>}
                    </span>
                    {onEditPayment && (
                      <button
                        onClick={() => { onClose(); onEditPayment() }}
                        className="text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-left w-fit"
                      >
                        ✏️ Edit category
                      </button>
                    )}
                  </div>
                </div>
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
