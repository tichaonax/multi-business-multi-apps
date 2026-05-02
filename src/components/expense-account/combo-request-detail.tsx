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
  sections: ComboSection[]
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  SUBMITTED: { label: 'Submitted', className: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-800' },
  PARTIALLY_APPROVED: { label: 'Partially Approved', className: 'bg-orange-100 text-orange-800' },
  PARTIALLY_PAID: { label: 'Partially Paid', className: 'bg-blue-100 text-blue-800' },
  PAID: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
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
  const [availableBalance, setAvailableBalance] = useState(0)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [markPaidItem, setMarkPaidItem] = useState<ComboItem | null>(null)
  const [showVoucherModal, setShowVoucherModal] = useState(false)
  const [accountInfo, setAccountInfo] = useState<{ accountName: string; accountNumber: string } | null>(null)

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
    }
  }, [accountId])

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
  }, [loadRequest, loadBalance, accountId])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    )
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
  const userRole = (session?.user as any)?.role
  const isCashier = userRole === 'admin' || (session?.user as any)?.permissions?.canMakeExpensePayments

  const effectiveRequested = request.overrideAmount ?? request.requestedAmount
  const canApprove = isCashier && request.status === 'SUBMITTED'
  const canCancel = isCreator && ['DRAFT', 'SUBMITTED'].includes(request.status)
  const canMarkPaid = isCreator && ['APPROVED', 'PARTIALLY_APPROVED', 'PARTIALLY_PAID'].includes(request.status)

  const badge = STATUS_BADGE[request.status] ?? { label: request.status, className: 'bg-gray-100 text-gray-700' }

  const allItems = request.sections.flatMap(s => s.items)
  const totalPaid = allItems.reduce((sum, i) => sum + (i.paidAmount ?? 0), 0)
  const fundedItems = allItems.filter(i => !(i.approvedAmount !== null && i.approvedAmount === 0))

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push(`/expense-accounts/${accountId}`)}
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Account
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{request.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Submitted by {request.creator.name} · {fmtDate(request.submittedAt ?? null)}
            </p>
          </div>
          <span className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        {/* Amounts row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">Requested</div>
            <div className="text-lg font-bold text-gray-900">{fmt(effectiveRequested)}</div>
          </div>
          {request.approvedAmount !== null && (
            <div className={`rounded-lg p-3 ${request.status === 'PARTIALLY_APPROVED' || request.status === 'PARTIALLY_PAID' ? 'bg-orange-50' : 'bg-green-50'}`}>
              <div className="text-xs text-gray-500">Approved</div>
              <div className={`text-lg font-bold ${request.status.startsWith('PARTIALLY') ? 'text-orange-700' : 'text-green-700'}`}>
                {fmt(request.approvedAmount)}
              </div>
            </div>
          )}
          {request.paidAt && (
            <div className="bg-emerald-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Total Paid</div>
              <div className="text-lg font-bold text-emerald-700">{fmt(totalPaid)}</div>
            </div>
          )}
        </div>

        {/* Approval details */}
        {request.approver && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">{request.status.startsWith('PARTIALLY') ? 'Partially approved' : 'Approved'}</span>
            {' '}by {request.approver.name} on {fmtDate(request.approvedAt)}.
            {request.approvalNote && (
              <span className="block mt-1 text-gray-500 italic">"{request.approvalNote}"</span>
            )}
          </div>
        )}

        {request.notes && (
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-2">{request.notes}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-2 flex-wrap">
          {canApprove && (
            <button
              onClick={() => setShowApproveModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              Approve Request
            </button>
          )}
          {canCancel && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Cancel Request
            </button>
          )}
          {!['DRAFT', 'CANCELLED'].includes(request.status) && (
            <button
              onClick={() => setShowVoucherModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Voucher
            </button>
          )}
        </div>
      </div>

      {/* Sections */}
      {request.sections.map(section => {
        const sectionTotal = section.items.reduce((sum, i) => sum + Number(i.estimatedAmount || 0), 0)
        const sectionApproved = section.items.reduce((sum, i) => {
          if (i.approvedAmount !== null) return sum + i.approvedAmount
          return sum + Number(i.estimatedAmount || 0)
        }, 0)

        return (
          <div key={section.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200">
              <span className="text-lg">{SECTION_ICONS[section.sectionType] ?? '📋'}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-800">
                  {section.sectionName || SECTION_LABELS[section.sectionType] || section.sectionType}
                </span>
                {section.payeeType && (
                  <span className="ml-2 text-xs text-gray-500">({section.payeeType})</span>
                )}
                {section.notes && (
                  <p className="text-xs text-gray-500 mt-0.5">{section.notes}</p>
                )}
              </div>
              <div className="text-sm font-semibold text-gray-700 shrink-0">{fmt(sectionTotal)}</div>
            </div>

            {/* Items */}
            <div className="divide-y divide-gray-100">
              {section.items.map(item => {
                const isNotFunded = item.approvedAmount !== null && item.approvedAmount === 0
                const isFundedAndPaid = item.isPaid
                const canMarkThisItem = canMarkPaid && !item.isPaid && !isNotFunded

                return (
                  <div
                    key={item.id}
                    className={`px-5 py-3 flex items-start gap-4 ${isNotFunded ? 'opacity-60 bg-red-50' : ''}`}
                  >
                    {/* Status indicator */}
                    <div className="shrink-0 mt-0.5">
                      {isNotFunded ? (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Not Funded</span>
                      ) : isFundedAndPaid ? (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Paid</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Pending</span>
                      )}
                    </div>

                    {/* Description + meta */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.description}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-500">
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
                      <div className="text-sm font-semibold text-gray-900">
                        {item.estimatedAmount !== null ? fmt(item.estimatedAmount) : '—'}
                      </div>
                      {item.approvedAmount !== null && item.approvedAmount !== 0 && item.approvedAmount !== item.estimatedAmount && (
                        <div className="text-xs text-green-600">Approved: {fmt(item.approvedAmount)}</div>
                      )}
                      {item.paidAmount !== null && (
                        <div className="text-xs text-emerald-600">Paid: {fmt(item.paidAmount)}</div>
                      )}
                    </div>

                    {/* Mark paid action */}
                    {canMarkThisItem && (
                      <button
                        onClick={() => setMarkPaidItem(item)}
                        className="shrink-0 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-2 py-1 rounded transition-colors"
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4">
        <div className="flex flex-col gap-1 items-end text-sm">
          <div className="flex justify-between w-full max-w-xs">
            <span className="text-gray-600">Requested Total</span>
            <span className="font-medium">{fmt(effectiveRequested)}</span>
          </div>
          {request.approvedAmount !== null && (
            <div className="flex justify-between w-full max-w-xs">
              <span className="text-gray-600">Approved Total</span>
              <span className="font-medium text-green-700">{fmt(request.approvedAmount)}</span>
            </div>
          )}
          {totalPaid > 0 && (
            <div className="flex justify-between w-full max-w-xs border-t border-gray-200 pt-1 mt-1">
              <span className="font-semibold text-gray-800">Total Paid Out</span>
              <span className="font-bold text-emerald-700">{fmt(totalPaid)}</span>
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
