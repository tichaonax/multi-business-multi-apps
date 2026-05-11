'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useToastContext } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-modal'
import { ComboRequestApproveModal } from './combo-request-approve-modal'
import { ComboMarkPaidModal } from './combo-request-mark-paid-modal'
import { ComboVoucherModal } from './combo-voucher-modal'

interface ComboItem {
  id: string
  description: string
  quantity: number | null
  unit: string | null
  estimatedAmount: number | null
  approvedAmount: number | null
  isPaid: boolean
  paidAt: string | null
  paidAmount: number | null
  receiptNumber: string | null
  notes: string | null
  sortOrder: number
  payeeType: string | null
}

interface ComboSection {
  id: string
  sectionType: string
  sectionName: string | null
  payeeType: string | null
  notes: string | null
  sortOrder: number
  items: ComboItem[]
}

interface ComboRequest {
  id: string
  title: string
  status: string
  requestedAmount: number
  overrideAmount: number | null
  approvedAmount: number | null
  approvalNote: string | null
  notes: string | null
  createdBy: string
  submittedAt: string | null
  approvedAt: string | null
  paidAt: string | null
  cancelledAt: string | null
  linkedPaymentId: string | null
  creator: { id: string; name: string }
  approver: { id: string; name: string } | null
  returnedByUser: { id: string; name: string } | null
  returnNote: string | null
  returnedAt: string | null
  sections: ComboSection[]
  // Server-computed action permissions
  canApprove: boolean
  canReturn: boolean
  canRequestSettle: boolean
  canConfirmSettle: boolean
  remainingBalance: number
  // Settle fields
  settleRequestedAt: string | null
  settleConfirmedAt: string | null
  settler: { id: string; name: string } | null
  settleNote: string | null
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT:              { label: 'Draft',             className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  SUBMITTED:          { label: 'Submitted',         className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  APPROVED:           { label: 'Approved',          className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  PARTIALLY_APPROVED: { label: 'Partially Approved',className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  PARTIALLY_PAID:     { label: 'Partially Paid',    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  PAID:               { label: 'Paid',              className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  CANCELLED:          { label: 'Cancelled',         className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  SETTLE_REQUESTED:   { label: 'Awaiting Settlement', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  SETTLED:            { label: 'Settled',           className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' },
}

const SECTION_ICONS: Record<string, string> = {
  GROCERY: '🛒',
  MONTHLY_CONTRIBUTION: '📅',
  SCHOOL_FEES: '🎓',
  CUSTOM: '📋',
}

const SECTION_LABELS: Record<string, string> = {
  GROCERY: 'Grocery / Supplies',
  MONTHLY_CONTRIBUTION: 'Monthly Contribution',
  SCHOOL_FEES: 'School Fees',
  CUSTOM: 'Custom',
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

interface ComboRequestDetailProps {
  accountId: string
  requestId: string
}

export function ComboRequestDetail({ accountId, requestId }: ComboRequestDetailProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const toast = useToastContext()
  const confirm = useConfirm()

  const [request, setRequest] = useState<ComboRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [loadingAccountInfo, setLoadingAccountInfo] = useState(true)
  const [availableBalance, setAvailableBalance] = useState(0)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [markPaidItem, setMarkPaidItem] = useState<ComboItem | null>(null)
  const [showVoucherModal, setShowVoucherModal] = useState(false)
  const [accountInfo, setAccountInfo] = useState<{ accountName: string; accountNumber: string } | null>(null)
  const [showSubmitPanel, setShowSubmitPanel] = useState(false)
  const [overrideAmountStr, setOverrideAmountStr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [showReturnPanel, setShowReturnPanel] = useState(false)
  const [returnNoteInput, setReturnNoteInput] = useState('')
  const [returning, setReturning] = useState(false)
  const [showSettlePanel, setShowSettlePanel] = useState(false)
  const [settleConfirmPanel, setSettleConfirmPanel] = useState(false)
  const [settleConfirmNote, setSettleConfirmNote] = useState('')
  const [settleSubmitting, setSettleSubmitting] = useState(false)

  const loadRequest = useCallback(async () => {
    try {
      const res = await fetch(`/api/expense-account/${accountId}/combo-requests/${requestId}`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok && data.data) {
        // Normalise Decimal fields to numbers
        const req = data.data
        setRequest({
          ...req,
          requestedAmount: Number(req.requestedAmount),
          overrideAmount: req.overrideAmount !== null ? Number(req.overrideAmount) : null,
          approvedAmount: req.approvedAmount !== null ? Number(req.approvedAmount) : null,
          returnNote: req.returnNote ?? null,
          returnedAt: req.returnedAt ?? null,
          returnedByUser: req.returnedByUser ?? null,
          settleRequestedAt: req.settleRequestedAt ?? null,
          settleConfirmedAt: req.settleConfirmedAt ?? null,
          settler: req.settler ?? null,
          settleNote: req.settleNote ?? null,
          canRequestSettle: req.canRequestSettle ?? false,
          canConfirmSettle: req.canConfirmSettle ?? false,
          remainingBalance: Number(req.remainingBalance ?? 0),
          sections: req.sections.map((s: any) => ({
            ...s,
            items: s.items.map((i: any) => ({
              ...i,
              estimatedAmount: i.estimatedAmount !== null ? Number(i.estimatedAmount) : null,
              approvedAmount: i.approvedAmount !== null ? Number(i.approvedAmount) : null,
              paidAmount: i.paidAmount !== null ? Number(i.paidAmount) : null,
            })),
          })),
        })
      }
    } catch {
      toast.error('Failed to load request')
    } finally {
      setLoading(false)
    }
  }, [accountId, requestId])

  const loadBalance = useCallback(async () => {
    try {
      const res = await fetch(`/api/expense-account/${accountId}/balance`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setAvailableBalance(Number(data.data?.balance ?? 0))
      }
    } catch {
      // non-critical
    } finally {
      setLoadingBalance(false)
    }
  }, [accountId])

  // Poll every 10s when awaiting settlement so requester sees cashier confirmation automatically
  useEffect(() => {
    if (!request || request.status !== 'SETTLE_REQUESTED') return
    const interval = setInterval(() => { loadRequest() }, 10000)
    return () => clearInterval(interval)
  }, [request?.status, loadRequest])

  useEffect(() => {
    loadRequest()
    loadBalance()
    // Fetch account name/number for the voucher
    fetch(`/api/expense-account/${accountId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const acct = data?.data?.account
        if (acct) setAccountInfo({ accountName: acct.accountName, accountNumber: acct.accountNumber })
      })
      .catch(() => {})
      .finally(() => setLoadingAccountInfo(false))
  }, [loadRequest, loadBalance, accountId])

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {}
      const override = parseFloat(overrideAmountStr)
      if (!isNaN(override) && override > 0) body.overrideAmount = override

      const res = await fetch(`/api/expense-account/${accountId}/combo-requests/${requestId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to submit'); return }
      toast.push('Request submitted successfully')
      setShowSubmitPanel(false)
      loadRequest()
    } catch {
      toast.error('Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    const confirmed = await confirm({
      title: 'Cancel Request',
      description: 'Are you sure you want to cancel this combo request? This action cannot be undone.',
      confirmText: 'Cancel Request',
      cancelText: 'Keep Request',
    })
    if (!confirmed) return
    try {
      const res = await fetch(`/api/expense-account/${accountId}/combo-requests/${requestId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to cancel'); return }
      toast.push('Request cancelled')
      loadRequest()
    } catch {
      toast.error('Failed to cancel request')
    }
  }

  async function handleReturn() {
    setReturning(true)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/combo-requests/${requestId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note: returnNoteInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to return request'); return }
      toast.push('Request returned to requester for edits')
      setShowReturnPanel(false)
      setReturnNoteInput('')
      loadRequest()
    } catch {
      toast.error('Failed to return request')
    } finally {
      setReturning(false)
    }
  }

  async function handleSettleRequest() {
    setSettleSubmitting(true)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/combo-requests/${requestId}/settle-request`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to send settle request'); return }
      toast.push('Settlement request sent to cashier')
      setShowSettlePanel(false)
      loadRequest()
    } catch {
      toast.error('Failed to send settle request')
    } finally {
      setSettleSubmitting(false)
    }
  }

  async function handleSettleConfirm() {
    setSettleSubmitting(true)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/combo-requests/${requestId}/settle-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note: settleConfirmNote.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to confirm settlement'); return }
      toast.push('Settlement confirmed')
      setSettleConfirmPanel(false)
      setSettleConfirmNote('')
      loadRequest()
    } catch {
      toast.error('Failed to confirm settlement')
    } finally {
      setSettleSubmitting(false)
    }
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-red-500 text-sm">Request not found</div>
      </div>
    )
  }

  const userId = session?.user?.id
  const isCreator = request.createdBy === userId

  const dataReady = !loading && !loadingBalance && !loadingAccountInfo
  const effectiveRequested = request.overrideAmount ?? request.requestedAmount
  const canEdit = isCreator && request.status === 'DRAFT'
  const canSubmit = isCreator && request.status === 'DRAFT'
  const canApprove = request.canApprove
  const canCancel = isCreator && ['DRAFT', 'SUBMITTED'].includes(request.status)
  const canMarkPaid = isCreator && ['APPROVED', 'PARTIALLY_APPROVED', 'PARTIALLY_PAID'].includes(request.status)
  const canReturn = request.canReturn
  const canRequestSettle = request.canRequestSettle
  const canConfirmSettle = request.canConfirmSettle
  const overrideAmountValid = !isNaN(parseFloat(overrideAmountStr)) && parseFloat(overrideAmountStr) > 0
  const returnNoteValid = returnNoteInput.trim().length >= 10

  const badge = STATUS_BADGE[request.status] ?? { label: request.status, className: 'bg-gray-100 text-gray-700' }

  const allItems = request.sections.flatMap(s => s.items)
  const totalPaid = allItems.reduce((sum, i) => sum + (i.paidAmount ?? 0), 0)
  const fundedItems = allItems.filter(i => !(i.approvedAmount !== null && i.approvedAmount === 0))

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={() => router.push(`/expense-accounts/${accountId}`)}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Account
        </button>
        {['APPROVED', 'PARTIALLY_APPROVED', 'PARTIALLY_PAID', 'PAID', 'SETTLE_REQUESTED', 'SETTLED'].includes(request.status) && accountInfo && (
          <a
            href={`/expense-accounts/${accountId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            {accountInfo.accountName} · {accountInfo.accountNumber}
          </a>
        )}
      </div>

      {/* Header card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
        {/* Return note banner — shown to requester when their draft was returned */}
        {request.returnNote && request.status === 'DRAFT' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-3 text-sm">
            <p className="font-medium text-yellow-800 dark:text-yellow-300">
              ↩ Returned for edits{request.returnedByUser ? ` by ${request.returnedByUser.name}` : ''}
            </p>
            <p className="mt-1 text-yellow-700 dark:text-yellow-400 italic">&ldquo;{request.returnNote}&rdquo;</p>
          </div>
        )}

        {/* Settle requested banner */}
        {request.status === 'SETTLE_REQUESTED' && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg px-4 py-3 text-sm">
            <p className="font-medium text-purple-800 dark:text-purple-300">
              💰 Awaiting settlement — <span className="font-bold">${request.remainingBalance.toFixed(2)}</span> to be returned to the cashier
            </p>
            <p className="mt-1 text-purple-700 dark:text-purple-400 text-xs">
              The requester has notified the cashier that they are returning the remaining change.
            </p>
          </div>
        )}

        {/* Settled banner */}
        {request.status === 'SETTLED' && (
          <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg px-4 py-3 text-sm">
            <p className="font-medium text-teal-800 dark:text-teal-300">
              ✓ Settled{request.settler ? ` by ${request.settler.name}` : ''}{request.settleConfirmedAt ? ` on ${fmtDate(request.settleConfirmedAt)}` : ''}
            </p>
            {request.settleNote && (
              <p className="mt-1 text-teal-700 dark:text-teal-400 italic">&ldquo;{request.settleNote}&rdquo;</p>
            )}
          </div>
        )}

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{request.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Submitted by {request.creator.name} · {fmtDate(request.submittedAt ?? null)}
            </p>
          </div>
          <span className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        {/* Amounts row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Requested</div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(effectiveRequested)}</div>
          </div>
          {request.approvedAmount !== null && (
            <div className={`rounded-lg p-3 ${request.status === 'PARTIALLY_APPROVED' || request.status === 'PARTIALLY_PAID' ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
              <div className="text-xs text-gray-500 dark:text-gray-400">Approved</div>
              <div className={`text-lg font-bold ${request.status.startsWith('PARTIALLY') ? 'text-orange-700 dark:text-orange-400' : 'text-green-700 dark:text-green-400'}`}>
                {fmt(request.approvedAmount)}
              </div>
            </div>
          )}
          {request.paidAt && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Paid</div>
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{fmt(totalPaid)}</div>
            </div>
          )}
        </div>

        {/* Approval details */}
        {request.approver && (
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-medium">{request.status.startsWith('PARTIALLY') ? 'Partially approved' : 'Approved'}</span>
            {' '}by {request.approver.name} on {fmtDate(request.approvedAt)}.
            {request.approvalNote && (
              <span className="block mt-1 text-gray-500 dark:text-gray-400 italic">"{request.approvalNote}"</span>
            )}
          </div>
        )}

        {request.notes && (
          <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-2">{request.notes}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-2 flex-wrap">
          {canEdit && (
            <button
              onClick={() => router.push(`/expense-accounts/${accountId}/combo-requests/${requestId}/edit`)}
              className="px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              Edit Request
            </button>
          )}
          <button
            onClick={async () => {
              setDuplicating(true)
              try {
                const res = await fetch(`/api/expense-account/${accountId}/combo-requests/${requestId}/duplicate`, {
                  method: 'POST', credentials: 'include',
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json.error || 'Failed to duplicate')
                router.push(`/expense-accounts/${accountId}/combo-requests/${json.newRequestId}/edit`)
              } catch (err: any) {
                toast.error(err.message || 'Could not duplicate request')
              } finally {
                setDuplicating(false)
              }
            }}
            disabled={duplicating}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            title="Create a new draft pre-filled from this request"
          >
            {duplicating ? 'Duplicating...' : 'Duplicate'}
          </button>
          {canSubmit && (
            <button
              onClick={() => {
                setOverrideAmountStr(effectiveRequested.toFixed(2))
                setShowSubmitPanel(v => !v)
              }}
              disabled={!dataReady || submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {!dataReady ? 'Loading...' : 'Submit Request'}
            </button>
          )}
          {canApprove && (
            <button
              onClick={() => setShowApproveModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              Approve Request
            </button>
          )}
          {canReturn && (
            <button
              onClick={() => setShowReturnPanel(v => !v)}
              className="px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              ↩ Return for Edits
            </button>
          )}
          {canRequestSettle && (
            <button
              onClick={() => setShowSettlePanel(v => !v)}
              className="px-4 py-2 text-sm font-medium text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
            >
              💰 Request Settlement
            </button>
          )}
          {/* Requester status indicator when awaiting cashier confirmation */}
          {isCreator && request.status === 'SETTLE_REQUESTED' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              Awaiting cashier confirmation
            </span>
          )}
          {/* Cashier-only confirm button — never shown to the request creator */}
          {canConfirmSettle && !isCreator && (
            <button
              onClick={() => setSettleConfirmPanel(v => !v)}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
            >
              ✓ Confirm Change Received
            </button>
          )}
          {canCancel && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Cancel Request
            </button>
          )}
          {!['DRAFT', 'CANCELLED'].includes(request.status) && (
            <button
              onClick={() => setShowVoucherModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Voucher
            </button>
          )}
        </div>

        {/* Inline return panel */}
        {showReturnPanel && (
          <div className="mt-2 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-3">
            <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">↩ Return this request for edits</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Explain what the requester needs to change before they can resubmit. This note will be sent to them as a notification.
            </p>
            <div>
              <textarea
                rows={3}
                value={returnNoteInput}
                onChange={e => setReturnNoteInput(e.target.value)}
                placeholder='e.g. "Please add the payee for the school fees item and confirm the quantity for sugar."'
                className="w-full border border-amber-300 dark:border-amber-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Required · minimum 10 characters</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReturn}
                disabled={!returnNoteValid || returning}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {returning ? 'Returning...' : 'Confirm Return'}
              </button>
              <button
                onClick={() => { setShowReturnPanel(false); setReturnNoteInput('') }}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Settle request panel — shown to requester */}
        {showSettlePanel && canRequestSettle && (
          <div className="mt-2 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg space-y-3">
            <p className="text-sm text-purple-800 dark:text-purple-300 font-medium">💰 Request Settlement</p>
            <p className="text-xs text-purple-700 dark:text-purple-400">
              You spent less than the approved amount. Notify the cashier that you are returning the remaining change of{' '}
              <span className="font-semibold">${request.remainingBalance.toFixed(2)}</span>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleSettleRequest}
                disabled={settleSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {settleSubmitting ? 'Sending…' : 'Notify Cashier'}
              </button>
              <button
                onClick={() => setShowSettlePanel(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Settle confirm panel — shown to cashier only, never the creator */}
        {settleConfirmPanel && canConfirmSettle && !isCreator && (
          <div className="mt-2 p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg space-y-3">
            <p className="text-sm text-teal-800 dark:text-teal-300 font-medium">✓ Confirm Change Received</p>
            <div className="flex items-center justify-between bg-teal-100 dark:bg-teal-900/40 border border-teal-300 dark:border-teal-700 rounded-lg px-4 py-3">
              <span className="text-xs text-teal-700 dark:text-teal-400 font-medium">Change to collect from requester</span>
              <span className="text-2xl font-bold text-teal-700 dark:text-teal-300 tracking-tight">
                ${request.remainingBalance.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-teal-700 dark:text-teal-400">
              Confirm that you have received the remaining change from the requester.
            </p>
            <div>
              <label className="block text-xs font-medium text-teal-700 dark:text-teal-400 mb-1">Note (optional)</label>
              <textarea
                rows={2}
                value={settleConfirmNote}
                onChange={e => setSettleConfirmNote(e.target.value)}
                placeholder="e.g. Received in cash."
                className="w-full border border-teal-300 dark:border-teal-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSettleConfirm}
                disabled={settleSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {settleSubmitting ? 'Confirming…' : 'Confirm Receipt'}
              </button>
              <button
                onClick={() => { setSettleConfirmPanel(false); setSettleConfirmNote('') }}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Inline submit panel */}
        {showSubmitPanel && (
          <div className="mt-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">Submit this request</p>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              You can adjust the amount below if the exact costs weren&apos;t known when the items were added.
            </p>
            <div>
              <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Requested Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={overrideAmountStr}
                onChange={e => setOverrideAmountStr(e.target.value)}
                className="w-48 border border-blue-300 dark:border-blue-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={submitting || !overrideAmountValid}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting...' : 'Confirm Submit'}
              </button>
              <button
                onClick={() => setShowSubmitPanel(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sections */}
      {request.sections.map(section => {
        const sectionTotal = section.items.reduce((sum, i) => sum + Number(i.estimatedAmount || 0), 0)
        const sectionApproved = section.items.reduce((sum, i) => {
          if (i.approvedAmount !== null) return sum + i.approvedAmount
          return sum + Number(i.estimatedAmount || 0)
        }, 0)

        return (
          <div key={section.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <span className="text-lg">{SECTION_ICONS[section.sectionType] ?? '📋'}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {section.sectionName || SECTION_LABELS[section.sectionType] || section.sectionType}
                </span>
                {section.payeeType && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({section.payeeType})</span>
                )}
                {section.notes && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{section.notes}</p>
                )}
              </div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 shrink-0">{fmt(sectionTotal)}</div>
            </div>

            {/* Items */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {section.items.map(item => {
                const isNotFunded = item.approvedAmount !== null && item.approvedAmount === 0
                const isFundedAndPaid = item.isPaid
                const canMarkThisItem = canMarkPaid && !item.isPaid && !isNotFunded

                return (
                  <div
                    key={item.id}
                    className={`px-5 py-3 flex items-start gap-4 ${isNotFunded ? 'opacity-60 bg-red-50 dark:bg-red-900/20' : ''}`}
                  >
                    {/* Status indicator */}
                    <div className="shrink-0 mt-0.5">
                      {isNotFunded ? (
                        <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded">Not Funded</span>
                      ) : isFundedAndPaid ? (
                        <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded">Paid</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 px-1.5 py-0.5 rounded">Pending</span>
                      )}
                    </div>

                    {/* Description + meta */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.description}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {(item.quantity !== null || item.unit) && (
                          <span>{[item.quantity, item.unit].filter(Boolean).join(' ')}</span>
                        )}
                        {item.payeeType && <span>Payee: {item.payeeType}</span>}
                        {item.receiptNumber && <span>Receipt: {item.receiptNumber}</span>}
                        {item.paidAt && <span>Paid {fmtDate(item.paidAt)}</span>}
                        {item.notes && <span className="italic">{item.notes}</span>}
                      </div>
                    </div>

                    {/* Amounts */}
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {item.estimatedAmount !== null ? fmt(item.estimatedAmount) : '—'}
                      </div>
                      {item.approvedAmount !== null && item.approvedAmount !== 0 && item.approvedAmount !== item.estimatedAmount && (
                        <div className="text-xs text-green-600 dark:text-green-400">Approved: {fmt(item.approvedAmount)}</div>
                      )}
                      {item.paidAmount !== null && (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">Paid: {fmt(item.paidAmount)}</div>
                      )}
                    </div>

                    {/* Mark paid action */}
                    {canMarkThisItem && (
                      <button
                        onClick={() => setMarkPaidItem(item)}
                        className="shrink-0 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 px-2 py-1 rounded transition-colors"
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Totals footer */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm px-6 py-4">
        <div className="flex flex-col gap-1 items-end text-sm">
          <div className="flex justify-between w-full max-w-xs">
            <span className="text-gray-600 dark:text-gray-400">Requested Total</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{fmt(effectiveRequested)}</span>
          </div>
          {request.approvedAmount !== null && (
            <div className="flex justify-between w-full max-w-xs">
              <span className="text-gray-600 dark:text-gray-400">Approved Total</span>
              <span className="font-medium text-green-700 dark:text-green-400">{fmt(request.approvedAmount)}</span>
            </div>
          )}
          {totalPaid > 0 && (
            <div className="flex justify-between w-full max-w-xs border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
              <span className="font-semibold text-gray-800 dark:text-gray-200">Total Paid Out</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">{fmt(totalPaid)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Approve modal */}
      {showApproveModal && (
        <ComboRequestApproveModal
          isOpen={showApproveModal}
          onClose={() => setShowApproveModal(false)}
          onSuccess={() => { setShowApproveModal(false); loadRequest(); loadBalance() }}
          accountId={accountId}
          requestId={requestId}
          requestTitle={request.title}
          requestedAmount={request.requestedAmount}
          overrideAmount={request.overrideAmount}
          sections={request.sections}
          availableBalance={availableBalance}
        />
      )}

      {/* Mark paid modal */}
      {markPaidItem && (
        <ComboMarkPaidModal
          isOpen={!!markPaidItem}
          onClose={() => setMarkPaidItem(null)}
          onSuccess={() => { setMarkPaidItem(null); loadRequest() }}
          accountId={accountId}
          requestId={requestId}
          itemId={markPaidItem.id}
          itemDescription={markPaidItem.description}
          approvedAmount={markPaidItem.approvedAmount}
          estimatedAmount={markPaidItem.estimatedAmount}
        />
      )}

      {/* Voucher modal */}
      {showVoucherModal && (
        <ComboVoucherModal
          isOpen={showVoucherModal}
          onClose={() => setShowVoucherModal(false)}
          request={request}
          accountName={accountInfo?.accountName ?? ''}
          accountNumber={accountInfo?.accountNumber ?? ''}
        />
      )}
    </div>
  )
}
