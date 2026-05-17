"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { formatCurrency } from '@/lib/format-currency'
import { ExpensePaymentVoucherModal, PaymentSummary } from '@/components/expense-account/expense-payment-voucher-modal'

export default function ExpensePaymentDetailPage() {
  const params = useParams() as { accountId: string; paymentId: string }
  const router = useRouter()
  const searchParams = useSearchParams()
  const resubmitMode = searchParams.get('resubmit') === 'true'
  const { accountId, paymentId } = params
  const { hasPermission } = useBusinessPermissionsContext()
  const { data: session } = useSession()
  const currentUserId = (session?.user as any)?.id as string | undefined

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
  const [cancelling, setCancelling] = useState(false)
  const [showVoucherModal, setShowVoucherModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelReasonError, setCancelReasonError] = useState('')
  const [inlineAdjustmentReason, setInlineAdjustmentReason] = useState('')

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
        // Auto-open edit mode when arriving from the rejected tab via ?resubmit=true
        if (resubmitMode && data.data.payment.status === 'REJECTED') {
          setIsEditing(true)
        }
      } catch (err) {
        console.error('Error loading payment', err)
        router.push(`/expense-accounts/${accountId}`)
      } finally {
        setLoading(false)
      }
    })()
  }, [accountId, paymentId, router, resubmitMode])

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

  // Own-request edit: creator can edit REQUEST/REJECTED payments on personal accounts,
  // OR edit their own REJECTED payments from any account (EOD rejections)
  const isPersonalAccount = !payment.expenseAccount?.businessId || payment.expenseAccount?.accountType === 'PERSONAL'
  const isOwnRequest = !!currentUserId && payment.creator?.id === currentUserId && isPersonalAccount
  const isOwnRejected = !!currentUserId && payment.creator?.id === currentUserId && payment.status === 'REJECTED'
  const canEditOwnRequest = (isOwnRequest && ['REQUEST', 'REJECTED'].includes(payment.status)) || isOwnRejected
  // Creator can self-cancel any non-terminal payment that hasn't been approved yet
  const canSelfCancel = !!currentUserId && payment.creator?.id === currentUserId && ['SUBMITTED', 'QUEUED', 'REQUEST', 'REJECTED'].includes(payment.status)

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
    setInlineAdjustmentReason('')
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
    const isDownwardEdit = Number(editFormData.amount) < Number(payment.amount) && payment.status === 'SUBMITTED'
    const editingOwnRequest = !!currentUserId && payment.creator?.id === currentUserId && ['REQUEST', 'REJECTED'].includes(payment.status)

    // Notes are mandatory when modifying a submitted payment (not own REQUEST/REJECTED edits)
    if (!editingOwnRequest && payment.status !== 'DRAFT' && !editFormData.notes?.trim() && !(isDownwardEdit && inlineAdjustmentReason.trim())) {
      setEditErrors({ notes: 'Notes are required when modifying a submitted payment — explain the reason for the change.' })
      return
    }
    if (isDownwardEdit && !inlineAdjustmentReason.trim()) {
      setEditErrors({ adjustmentReason: 'Adjustment reason is required when reducing the amount.' })
      return
    }

    setSaving(true)

    try {
      const patchBody: any = { ...editFormData }
      if (isDownwardEdit && inlineAdjustmentReason.trim()) {
        patchBody.adjustmentReason = inlineAdjustmentReason.trim()
      }
      if (resubmitMode && payment.status === 'REJECTED') {
        patchBody.resubmit = true
      }
      const res = await fetch(`/api/expense-account/${accountId}/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patchBody),
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
      setInlineAdjustmentReason('')
      setSaving(false)
    } catch (err) {
      console.error('Error saving payment', err)
      setEditErrors({ general: 'Network error occurred' })
      setSaving(false)
    }
  }

  const openCancelModal = () => {
    setCancelReason('')
    setCancelReasonError('')
    setShowCancelModal(true)
  }

  const handleCancelRequest = async () => {
    if (!cancelReason.trim()) {
      setCancelReasonError('A reason is required to cancel this request.')
      return
    }
    setCancelling(true)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/payments/${paymentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: cancelReason.trim() }),
      })
      if (!res.ok) {
        const e = await res.json()
        setCancelReasonError(e.error || 'Failed to cancel')
        return
      }
      setShowCancelModal(false)
      // Reload to show CANCELLED status
      const reloaded = await fetch(`/api/expense-account/${accountId}/payments/${paymentId}`, { credentials: 'include' })
      if (reloaded.ok) {
        const data = await reloaded.json()
        setPayment(data.data.payment)
      }
    } finally {
      setCancelling(false)
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
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-orange-600">{formatCurrency(payment.amount)}</h2>
                  {payment.notes?.includes('[Adjusted ') && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs font-semibold">
                      Adjusted
                    </span>
                  )}
                </div>
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
              {/* ── Category hierarchy — matches modal labels (Business → Domain → Category → Sub-Category) ── */}
              {payment.category?.domain && (
                <div>
                  <div className="text-sm text-secondary">Business</div>
                  <div className="font-medium">{payment.category.domain.emoji} {payment.category.domain.name}</div>
                </div>
              )}
              {payment.category ? (
                <div>
                  <div className="text-sm text-secondary">{payment.category.domain ? 'Domain' : 'Category'}</div>
                  <div className="font-medium">{payment.category.emoji} {payment.category.name}</div>
                </div>
              ) : (
                <div>
                  <div className="text-sm text-secondary">Category</div>
                  <div className="font-medium">{getCategoryLabel()}</div>
                </div>
              )}
              {payment.subcategory && (
                <div>
                  <div className="text-sm text-secondary">{payment.category?.domain ? 'Category' : 'Subcategory'}</div>
                  <div className="font-medium">{payment.subcategory.emoji} {payment.subcategory.name}</div>
                </div>
              )}
              {payment.subSubcategory && (
                <div>
                  <div className="text-sm text-secondary">Sub-Category</div>
                  <div className="font-medium">{payment.subSubcategory.emoji} {payment.subSubcategory.name}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-secondary">Receipt Number</div>
                <div className="font-medium">{payment.receiptNumber || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-secondary">Service Provider</div>
                <div className="font-medium">{payment.receiptServiceProvider || '—'}</div>
              </div>
            </div>

            {payment.lineItems && Array.isArray(payment.lineItems) && payment.lineItems.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Line Items</div>
                <div className="space-y-1">
                  {payment.lineItems.map((item: { name: string; emoji: string; amount: number }, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <span className="w-6 text-center">{item.emoji}</span>
                      <span className="flex-1 text-gray-800 dark:text-gray-200">{item.name}</span>
                      <span className="text-gray-600 dark:text-gray-400 font-medium">${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                    Total: ${payment.lineItems.reduce((s: number, i: { amount: number }) => s + i.amount, 0).toFixed(2)} of ${Number(payment.amount).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

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
                {payment.status === 'REQUEST' && (!payment.expenseAccount?.businessId || payment.expenseAccount?.accountType === 'PERSONAL') ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs font-semibold">
                    ⏳ Awaiting Cashier
                  </span>
                ) : payment.status === 'REVERSED' ? (
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

            {/* Approve / Reject — only for business accounts awaiting EOD batch review */}
            {['QUEUED', 'REQUEST', 'SUBMITTED'].includes(payment.status) && hasPermission('canSubmitPaymentBatch') && !!payment.expenseAccount?.businessId && (
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
                  {canSelfCancel && (
                    <button
                      onClick={openCancelModal}
                      className="px-3 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 text-xs font-medium rounded transition-colors"
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Personal REQUEST — awaiting cashier approval */}
            {payment.status === 'REQUEST' && (!payment.expenseAccount?.businessId || payment.expenseAccount?.accountType === 'PERSONAL') && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                <div className="flex flex-wrap items-center gap-3">
                  <span>⏳ This payment is awaiting cashier approval. You will be notified when it is reviewed.</span>
                  {canSelfCancel && (
                    <button
                      onClick={openCancelModal}
                      className="px-3 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded transition-colors"
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              {/* Own-request edit: creator can edit REQUEST/REJECTED payments */}
              {canEditOwnRequest && !isEditing && (
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  {payment.status === 'REJECTED' ? 'Edit & Re-submit' : 'Edit Request'}
                </button>
              )}
              {/* Privileged edit for cashiers / admins */}
              {hasPermission('canEditExpenseTransactions') && !canEditOwnRequest && payment.paymentType !== 'TRANSFER_OUT' && !['APPROVED', 'PAID', 'REVERSED'].includes(payment.status) && !(['QUEUED', 'REQUEST', 'SUBMITTED'].includes(payment.status) && hasPermission('canSubmitPaymentBatch')) && (
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
              {['APPROVED', 'PAID'].includes(payment.status) && payment.paymentType !== 'TRANSFER_OUT' && (
                payment.payment_voucher ? (
                  <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 rounded text-sm">
                    📄 Voucher {payment.payment_voucher.voucherNumber}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowVoucherModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                  >
                    📄 Create Voucher
                  </button>
                )
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
            <h3 className="text-lg font-semibold mb-4">
              {canEditOwnRequest && payment.status === 'REJECTED' ? 'Edit & Re-submit Request' : 'Edit Payment'}
            </h3>

            {canEditOwnRequest && payment.status === 'REJECTED' && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200 rounded text-sm space-y-1">
                <p className="font-medium">⚠️ This request was rejected. {resubmitMode ? 'Edit the details below, then click Save & Resubmit to return it to the queue.' : 'Update the details below and save — it will be re-submitted for review.'}</p>
                {payment.rejectionReason && (
                  <p className="text-amber-700 dark:text-amber-300">Reason: "{payment.rejectionReason}"</p>
                )}
                {(payment.rejectedBy || payment.rejectedAt) && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {[
                      payment.rejectedBy ? `Rejected by ${payment.rejectedBy}` : null,
                      payment.rejectedAt ? new Date(payment.rejectedAt).toLocaleDateString() : null,
                    ].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            )}

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
                {payment.status === 'SUBMITTED' && (
                  <p className="text-xs text-gray-400 mt-1">Amount can only be decreased. To increase, create a new payment.</p>
                )}
                {editErrors.amount && <div className="text-sm text-red-600 mt-1">{editErrors.amount}</div>}
              </div>

              {/* Adjustment impact + reason — shown when reducing on a SUBMITTED payment */}
              {Number(editFormData.amount) < Number(payment.amount) && payment.status === 'SUBMITTED' && (
                <>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-800 dark:text-blue-200">
                    Reducing by ${(Number(payment.amount) - Number(editFormData.amount)).toFixed(2)} — a compensating deposit will be created for the difference.
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Adjustment Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={inlineAdjustmentReason}
                      onChange={(e) => setInlineAdjustmentReason(e.target.value)}
                      rows={2}
                      placeholder="Why is the amount being reduced?"
                      className={`w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${editErrors.adjustmentReason ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    />
                    {editErrors.adjustmentReason && <div className="text-sm text-red-600 mt-1">{editErrors.adjustmentReason}</div>}
                  </div>
                </>
              )}

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
                  Notes {payment.status !== 'DRAFT' && !canEditOwnRequest && <span className="text-red-500">*</span>}
                </label>
                {payment.status !== 'DRAFT' && !canEditOwnRequest && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Required — explain the reason for any changes to this request (e.g. "Reduced amount — supplier quoted lower price").</p>
                )}
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${editErrors.notes ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder={payment.status !== 'DRAFT' && !canEditOwnRequest ? 'Reason for change (required)…' : 'Add any additional notes…'}
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
                  {saving ? 'Saving…' : (resubmitMode || (canEditOwnRequest && payment.status === 'REJECTED')) ? 'Save & Resubmit' : 'Save Changes'}
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

      {/* Cancel Request confirmation modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Cancel Request</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This will permanently withdraw your payment request. Please provide a reason — this is recorded for audit purposes.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => { setCancelReason(e.target.value); setCancelReasonError('') }}
                rows={3}
                placeholder="e.g. No longer needed, submitted by mistake…"
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-red-400 ${cancelReasonError ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {cancelReasonError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{cancelReasonError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleCancelRequest}
                disabled={cancelling}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
              >
                {cancelling ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVoucherModal && payment && (
        <ExpensePaymentVoucherModal
          payment={{
            id: payment.id,
            amount: Number(payment.amount),
            paymentDate: payment.paymentDate ?? new Date().toISOString(),
            payeeName: payment.payeeUser?.name ?? payment.payeeEmployee?.fullName ?? payment.payeePerson?.fullName ?? payment.payeeSupplier?.name ?? '—',
            payeeType: payment.payeeType ?? 'PERSON',
            purpose: payment.notes ?? payment.category?.name ?? '—',
            category: payment.category?.name ?? undefined,
            businessId: payment.expenseAccount?.businessId ?? null,
            businessName: payment.expenseAccount?.accountName ?? null,
          } as PaymentSummary}
          existingVoucher={null}
          userId={(session?.user as any)?.id ?? ''}
          creatorName={(session?.user as any)?.name ?? ''}
          onClose={() => setShowVoucherModal(false)}
          onSaved={() => {
            setShowVoucherModal(false)
            // Reload payment to show the new voucher number
            setPayment((prev: any) => prev ? { ...prev, payment_voucher: { voucherNumber: '…' } } : prev)
          }}
        />
      )}
    </ContentLayout>
  )
}
