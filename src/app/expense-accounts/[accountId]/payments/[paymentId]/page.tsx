"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { formatCurrency } from '@/lib/format-currency'

export default function ExpensePaymentDetailPage() {
  const params = useParams() as { accountId: string; paymentId: string }
  const router = useRouter()
  const { accountId, paymentId } = params
  const { hasPermission } = useBusinessPermissionsContext()

  const [payment, setPayment] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [depositsCount, setDepositsCount] = useState<number | null>(null)
  const [paymentsCount, setPaymentsCount] = useState<number | null>(null)
  const [countsError, setCountsError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState<any>({})
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [actionState, setActionState] = useState<'idle' | 'approving' | 'rejecting'>('idle')

  useEffect(() => {
    if (!accountId || !paymentId) return
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/expense-account/${accountId}/payments/${paymentId}`, {
          credentials: 'include',
        })
        if (!res.ok) {
          router.push(`/expense-accounts/${accountId}`)
          return
        }
        const data = await res.json()
        setPayment(data.data.payment)
        setEditFormData({
          amount: data.data.payment.amount,
          paymentDate: data.data.payment.paymentDate.split('T')[0],
          notes: data.data.payment.notes || '',
          categoryId: data.data.payment.category?.id || '',
          subcategoryId: data.data.payment.subcategory?.id || '',
          receiptNumber: data.data.payment.receiptNumber || '',
          receiptServiceProvider: data.data.payment.receiptServiceProvider || '',
          receiptReason: data.data.payment.receiptReason || '',
          isFullPayment: data.data.payment.isFullPayment || false,
        })
      } catch (err) {
        console.error('Error loading payment', err)
        router.push(`/expense-accounts/${accountId}`)
      } finally {
        setLoading(false)
      }
    })()
  }, [accountId, paymentId, router])

  useEffect(() => {
    if (!accountId) return
    ;(async () => {
      try {
        const res = await fetch(`/api/expense-account/${accountId}/balance`, { credentials: 'include' })
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) setCountsError('unauthorized')
          else setCountsError('unavailable')
          console.warn(`Failed to fetch balance counts: ${res.status}`)
          return
        }
        const data = await res.json()
        setDepositsCount(data.data.depositCount ?? 0)
        setPaymentsCount(data.data.paymentCount ?? 0)
        setCountsError(null)
      } catch (err) {
        console.error('Error loading counts', err)
        setCountsError('error')
      }
    })()
  }, [accountId])

  if (loading) return (
    <ContentLayout title="Payment Details">
      <div className="text-secondary">Loading payment details...</div>
    </ContentLayout>
  )

  if (!payment) return (
    <ContentLayout title="Payment Details">
      <div className="text-secondary">Payment not found</div>
    </ContentLayout>
  )

  const payeeName =
    payment.payeeUser?.name ||
    payment.payeeEmployee?.fullName ||
    payment.payeePerson?.fullName ||
    payment.payeeBusiness?.name ||
    payment.payeeSupplier?.name ||
    'Unknown'

  const payeePhone =
    payment.payeeEmployee?.phone ||
    payment.payeePerson?.phone ||
    payment.payeeSupplier?.phone ||
    null

  const payeeEmail =
    payment.payeeUser?.email ||
    payment.payeePerson?.email ||
    payment.payeeSupplier?.email ||
    null

  const payeeSecondaryLabel =
    payment.payeeEmployee?.employeeNumber
      ? `Emp# ${payment.payeeEmployee.employeeNumber}`
      : payment.payeeSupplier?.contactPerson
      ? `Contact: ${payment.payeeSupplier.contactPerson}`
      : null

  const getCategoryLabel = (): string => {
    if (payment.category) {
      return [payment.category.emoji, payment.category.name].filter(Boolean).join(' ')
    }
    switch (payment.paymentType) {
      case 'LOAN_DISBURSEMENT': return '🤝 Loan Disbursement'
      case 'LOAN_REPAYMENT': return '🏦 Loan Repayment'
      case 'PAYROLL_FUNDING': return '💵 Payroll Funding'
      case 'TRANSFER_RETURN': return '🔄 Transfer Return'
      default: return '—'
    }
  }

  const getPayeeRoute = () => {
    if (payment.payeeEmployee) return `/employees/${payment.payeeEmployee.id}`
    if (payment.payeeBusiness) return `/business/suppliers/${payment.payeeBusiness.id}`
    if (payment.payeeUser) return `/admin/users/${payment.payeeUser.id}`
    if (payment.payeePerson) return `/customers/${payment.payeePerson.id}`
    if (payment.payeeSupplier) return `/suppliers/${payment.payeeSupplier.id}`
    return null
  }

  const canViewPayee = () => {
    if (payment.payeeEmployee) return hasPermission('canViewEmployees')
    if (payment.payeeBusiness) return hasPermission('canViewSuppliers')
    if (payment.payeeUser) return hasPermission('canViewUsers')
    if (payment.payeePerson) return hasPermission('canViewCustomers')
    if (payment.payeeSupplier) return hasPermission('canViewSuppliers')
    return false
  }

  // Render notes with human-readable formatting.
  // Handles old "Reversed from payments: uuid1, uuid2, ..." pattern by converting
  // UUIDs to clickable Payment links. Otherwise preserves newlines.
  const renderNotes = (notes: string | null) => {
    if (!notes) return <span className="text-secondary italic">No notes provided</span>

    const reversedMatch = notes.match(/^Reversed from payments:\s*(.+)/i)
    if (reversedMatch) {
      const ids = reversedMatch[1].split(',').map((s: string) => s.trim()).filter(Boolean)
      return (
        <span>
          Reversed from {ids.length} payment{ids.length !== 1 ? 's' : ''}:{' '}
          {ids.map((id: string, i: number) => (
            <span key={id}>
              {i > 0 && ', '}
              <button
                onClick={() => router.push(`/expense-accounts/${accountId}/payments/${id}`)}
                className="text-blue-600 hover:underline text-sm"
                title={`Go to payment ${id}`}
              >
                Payment {i + 1}
              </button>
            </span>
          ))}
        </span>
      )
    }

    return <span className="whitespace-pre-wrap">{notes}</span>
  }

  const handleDecision = async (decision: 'approve' | 'reject') => {
    setActionState(decision === 'approve' ? 'approving' : 'rejecting')
    try {
      const res = await fetch(`/api/expense-account/${accountId}/payments/direct-approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          decision === 'approve'
            ? { approvedPaymentIds: [paymentId], rejectedPaymentIds: [] }
            : { approvedPaymentIds: [], rejectedPaymentIds: [paymentId] }
        ),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Action failed')
        return
      }
      // Reload to show updated status
      const reloaded = await fetch(`/api/expense-account/${accountId}/payments/${paymentId}`, { credentials: 'include' })
      if (reloaded.ok) {
        const data = await reloaded.json()
        setPayment(data.data.payment)
      }
    } finally {
      setActionState('idle')
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditErrors({})
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditErrors({})
    // Reset form data to original payment values
    if (payment) {
      setEditFormData({
        amount: payment.amount,
        paymentDate: payment.paymentDate.split('T')[0],
        notes: payment.notes || '',
        categoryId: payment.category?.id || '',
        subcategoryId: payment.subcategory?.id || '',
        receiptNumber: payment.receiptNumber || '',
        receiptServiceProvider: payment.receiptServiceProvider || '',
        receiptReason: payment.receiptReason || '',
        isFullPayment: payment.isFullPayment || false,
      })
    }
  }

  const handleSaveEdit = async () => {
    setEditErrors({})

    // Notes are mandatory when modifying a submitted (non-DRAFT) payment
    if (payment.status !== 'DRAFT' && !editFormData.notes?.trim()) {
      setEditErrors({ notes: 'Notes are required when modifying a submitted payment — explain the reason for the change.' })
      return
    }

    setSaving(true)

    try {
      const res = await fetch(`/api/expense-account/${accountId}/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editFormData),
      })

      if (!res.ok) {
        const errorData = await res.json()
        setEditErrors({ general: errorData.error || 'Failed to update payment' })
        setSaving(false)
        return
      }

      const data = await res.json()
      setPayment(data.data.payment)
      setIsEditing(false)
      setSaving(false)
    } catch (err) {
      console.error('Error saving payment', err)
      setEditErrors({ general: 'Network error occurred' })
      setSaving(false)
    }
  }

  // Header actions: counts showing deposits and payments
  const headerActions = (
    <div className="flex items-center gap-3">
      <div className="text-sm text-secondary">Deposits</div>
      <div>
        {depositsCount !== null ? (
          hasPermission('canAccessExpenseAccount') ? (
            <a
              href={`/expense-accounts/${accountId}/deposits`}
              onClick={(e) => { e.stopPropagation() }}
              className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-xs text-green-800 dark:text-green-200 font-semibold hover:underline"
              aria-label={`Open deposits for ${payment.expenseAccount?.accountName || 'expense account'}`}>
              <span className="font-semibold">{depositsCount}</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700/10 text-xs text-gray-700 dark:text-gray-200 font-semibold">{depositsCount}</span>
          )
        ) : (
          <div title={countsError ? `Counts not available (${countsError})` : 'Counts not loaded'} className="text-green-600 font-semibold">—</div>
        )}
      </div>
      <div className="text-sm text-secondary">Payments</div>
      <div title={countsError ? `Counts not available (${countsError})` : ''} className="text-orange-600 font-semibold">{paymentsCount ?? '—'}</div>
    </div>
  )

  return (
    <ContentLayout title={`Payment ${payment.id}`} description={`Payment for ${payment.expenseAccount?.accountName || 'expense account'}`} headerActions={headerActions}>
      <div className="space-y-4">
        {!isEditing ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-orange-600">{formatCurrency(payment.amount)}</h2>
                <div className="text-sm text-secondary">{new Date(payment.paymentDate).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-secondary">Payee</div>
                {canViewPayee() && getPayeeRoute() ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(getPayeeRoute()!) }}
                    aria-label={`Open payee ${payeeName}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {payeeName}
                  </button>
                ) : (
                  <div className="font-medium">{payeeName}</div>
                )}
                {payeeSecondaryLabel && (
                  <div className="text-xs text-secondary mt-0.5">{payeeSecondaryLabel}</div>
                )}
                {payeePhone && (
                  <div className="text-xs text-secondary mt-0.5">📞 {payeePhone}</div>
                )}
                {payeeEmail && (
                  <div className="text-xs text-secondary mt-0.5">✉️ {payeeEmail}</div>
                )}
                {payment.payeePerson?.nationalId && (
                  <div className="text-xs text-secondary mt-0.5">
                    ID: {payment.payeePerson.nationalId}
                  </div>
                )}
                {payment.payeeEmployee?.nationalId && (
                  <div className="text-xs text-secondary mt-0.5">
                    ID: {payment.payeeEmployee.nationalId}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-secondary">Category</div>
                <div className="font-medium">{getCategoryLabel()}</div>
              </div>
              <div>
                <div className="text-sm text-secondary">Subcategory</div>
                <div className="font-medium">{payment.subcategory?.name || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-secondary">Receipt Number</div>
                <div className="font-medium">{payment.receiptNumber || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-secondary">Service Provider</div>
                <div className="font-medium">{payment.receiptServiceProvider || '—'}</div>
              </div>
            </div>

            {payment.receiptReason && (
              <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                <div><strong>Receipt Reason:</strong></div>
                <div className="mt-2">{payment.receiptReason}</div>
              </div>
            )}

            <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
              <div><strong>Notes:</strong></div>
              <div className="mt-2">{renderNotes(payment.notes)}</div>
            </div>

            <div className="mt-4 text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <div className="flex items-center gap-2">
                <strong>Status:</strong>
                {payment.status === 'REVERSED' ? (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs font-semibold uppercase">
                    Reversed
                  </span>
                ) : (
                  <span className="capitalize">{payment.status?.toLowerCase()}</span>
                )}
              </div>
              <div><strong>Full Payment:</strong> {payment.isFullPayment ? 'Yes' : 'No'}</div>
            </div>

            {/* Reversal metadata (MBM-153) */}
            {payment.status === 'REVERSED' && (
              <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 text-sm space-y-1">
                <p className="font-semibold text-red-800 dark:text-red-300">Payment Reversed</p>
                {payment.reversalNote && (
                  <p className="text-red-700 dark:text-red-400"><strong>Reason:</strong> {payment.reversalNote}</p>
                )}
                {payment.reversalPettyCashId && (
                  <p className="text-red-700 dark:text-red-400">
                    <strong>Petty Cash:</strong>{' '}
                    <a
                      href={`/petty-cash/${payment.reversalPettyCashId}`}
                      className="underline hover:no-underline"
                    >
                      View petty cash request
                    </a>
                  </p>
                )}
              </div>
            )}

            {/* Approve / Reject — for reviewers on pending payments */}
            {['QUEUED', 'REQUEST', 'SUBMITTED'].includes(payment.status) && hasPermission('canSubmitPaymentBatch') && (
              payment.expenseAccount?.businessId === null ? (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-3">⏳ Awaiting Review</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleDecision('approve')}
                      disabled={actionState !== 'idle'}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
                    >
                      {actionState === 'approving' ? 'Approving…' : '✓ Approve'}
                    </button>
                    <button
                      onClick={() => handleDecision('reject')}
                      disabled={actionState !== 'idle'}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
                    >
                      {actionState === 'rejecting' ? 'Rejecting…' : '✕ Reject'}
                    </button>
                    {hasPermission('canEditExpenseTransactions') && (
                      <button
                        onClick={handleEdit}
                        disabled={actionState !== 'idle'}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
                      >
                        ✏️ Edit / Adjust Request
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">Rejected payments return to queue and will appear for review again. Use "Edit / Adjust" to modify the amount or details before approving.</p>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>ℹ️ This payment will be reviewed as part of an EOD payment batch.</span>
                    <a href="/admin/pending-actions" className="underline hover:no-underline">Go to Pending Actions</a>
                    {hasPermission('canEditExpenseTransactions') && (
                      <button
                        onClick={handleEdit}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                      >
                        ✏️ Edit / Adjust Request
                      </button>
                    )}
                  </div>
                </div>
              )
            )}

            <div className="mt-4 flex gap-2">
              {hasPermission('canEditExpenseTransactions') && payment.paymentType !== 'TRANSFER_OUT' && !['APPROVED', 'PAID', 'REVERSED'].includes(payment.status) && !(['QUEUED', 'REQUEST', 'SUBMITTED'].includes(payment.status) && hasPermission('canSubmitPaymentBatch')) && (
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Edit Payment
                </button>
              )}
              {payment.paymentType === 'TRANSFER_OUT' && (
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded text-sm">
                  🔒 Auto-transfer — not editable
                </div>
              )}
              {['APPROVED', 'PAID', 'REVERSED'].includes(payment.status) && payment.paymentType !== 'TRANSFER_OUT' && (
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded text-sm">
                  🔒 {payment.status === 'APPROVED' ? 'Approved' : payment.status === 'PAID' ? 'Paid' : 'Reversed'} — not editable
                </div>
              )}
              <button
                onClick={() => router.push(`/expense-accounts/${accountId}/payments`)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Back to Payments
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <h3 className="text-lg font-semibold mb-4">Edit Payment</h3>

            {editErrors.general && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded">
                {editErrors.general}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData({ ...editFormData, amount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                {editErrors.amount && <div className="text-sm text-red-600 mt-1">{editErrors.amount}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Payment Date</label>
                <input
                  type="date"
                  value={editFormData.paymentDate}
                  onChange={(e) => setEditFormData({ ...editFormData, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                {editErrors.paymentDate && <div className="text-sm text-red-600 mt-1">{editErrors.paymentDate}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Receipt Number</label>
                <input
                  type="text"
                  value={editFormData.receiptNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, receiptNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Service Provider</label>
                <input
                  type="text"
                  value={editFormData.receiptServiceProvider}
                  onChange={(e) => setEditFormData({ ...editFormData, receiptServiceProvider: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Receipt Reason</label>
                <input
                  type="text"
                  value={editFormData.receiptReason}
                  onChange={(e) => setEditFormData({ ...editFormData, receiptReason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Notes {payment.status !== 'DRAFT' && <span className="text-red-500">*</span>}
                </label>
                {payment.status !== 'DRAFT' && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Required — explain the reason for any changes to this request (e.g. "Reduced amount — supplier quoted lower price").</p>
                )}
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${editErrors.notes ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder={payment.status !== 'DRAFT' ? 'Reason for change (required)…' : 'Add any additional notes…'}
                />
                {editErrors.notes && <div className="text-sm text-red-600 mt-1">{editErrors.notes}</div>}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFullPayment"
                  checked={editFormData.isFullPayment}
                  onChange={(e) => setEditFormData({ ...editFormData, isFullPayment: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isFullPayment" className="text-sm font-medium">Full Payment</label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
