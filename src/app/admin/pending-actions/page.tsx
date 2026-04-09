'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'

import { useToastContext } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-modal'
import Link from 'next/link'
import { formatDateTimeZim } from '@/lib/date-utils'
import { ExpensePaymentVoucherModal, PaymentSummary } from '@/components/expense-account/expense-payment-voucher-modal'

interface LockRequest {
  id: string
  loanNumber: string
  description: string
  lenderName: string
  lockRequestedAt: string | null
  lockRequester: { id: string; name: string } | null
  managedBy: { id: string; name: string } | null
  expenseAccount: { balance: string } | null
}

interface PendingSupplierPayment {
  id: string
  amount: string
  notes: string | null
  dueDate: string
  submittedAt: string
  submitter: { id: string; name: string } | null
  supplier: { id: string; name: string } | null
  business: { id: string; name: string } | null
}

interface PendingPettyCash {
  id: string
  requestedAmount: string
  purpose: string
  notes: string | null
  requestedAt: string
  paymentChannel?: string
  priority?: string
  requester: { id: string; name: string } | null
  business: { id: string; name: string } | null
}

interface PendingCashAllocation {
  id: string
  reportDate: string | null
  status: string
  isGrouped: boolean
  createdAt: string
  cashboxDeposit: number | null
  business: { id: string; name: string; type: string } | null
  groupedRun: { id: string; totalCashReceived?: number; dates: { date: string }[] } | null
  totalReported: number
  _count: { lineItems: number }
}

interface PendingPaymentBatch {
  id: string
  eodDate: string
  business: { id: string; name: string; type: string } | null
  _count: { payments: number }
  totalAmount?: number
  cashCount?: number
  ecocashCount?: number
}

interface PendingPaymentRequest {
  id: string
  accountName: string
  accountNumber: string
  requestCount: number
  totalAmount?: number
  cashCount?: number
  ecocashCount?: number
  urgentCount?: number
  awaitingCashier?: boolean
  business: { id: string; name: string } | null
}

interface PendingMealProgram {
  id: string
  batchPaymentId: string
  accountName: string
  accountNumber: string
  paymentCount: number
  totalAmount: number
  paymentDate?: string
  business: { id: string; name: string } | null
}

interface PersonalPaymentRequest {
  id: string
  amount: number
  notes: string | null
  paymentDate: string | null
  paymentChannel: string
  priority: string
  createdAt: string | null
  expenseAccountId: string
  accountName: string
  creatorName: string | null
  categoryName: string | null
  subcategoryName: string | null
  payeeName: string | null
}

interface StandalonePaymentDetail {
  id: string
  amount: string
  paymentDate: string
  notes: string | null
  paymentChannel: string
  payeeName: string | null
  categoryName: string | null
  subcategoryName: string | null
  subSubcategoryName: string | null
  creatorName: string | null
}

interface PendingEcocashConversion {
  id: string
  amount: number
  notes: string | null
  requestedAt: string
  requester: { id: string; name: string } | null
  business: { id: string; name: string } | null
}

export default function PendingActionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToastContext()
  const confirm = useConfirm()

  const [loanLockRequests, setLoanLockRequests] = useState<LockRequest[]>([])
  const [pendingSupplierPayments, setPendingSupplierPayments] = useState<PendingSupplierPayment[]>([])
  const [pendingPettyCash, setPendingPettyCash] = useState<PendingPettyCash[]>([])
  const [pendingCashAllocations, setPendingCashAllocations] = useState<PendingCashAllocation[]>([])
  const [pendingPaymentBatches, setPendingPaymentBatches] = useState<PendingPaymentBatch[]>([])
  const [pendingPaymentRequests, setPendingPaymentRequests] = useState<PendingPaymentRequest[]>([])
  const [myPendingPayments, setMyPendingPayments] = useState<PendingPaymentRequest[]>([])
  const [myApprovedPayments, setMyApprovedPayments] = useState<any[]>([])
  const [myApprovedPettyCash, setMyApprovedPettyCash] = useState<any[]>([])
  const [pendingMealPrograms, setPendingMealPrograms] = useState<PendingMealProgram[]>([])
  const [personalPaymentRequests, setPersonalPaymentRequests] = useState<PersonalPaymentRequest[]>([])
  const [pendingEcocashConversions, setPendingEcocashConversions] = useState<PendingEcocashConversion[]>([])
  const [personalActionState, setPersonalActionState] = useState<Record<string, 'approving' | 'rejecting' | null>>({})
  const [voucherItem, setVoucherItem] = useState<PersonalPaymentRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const total = loanLockRequests.length + pendingSupplierPayments.length + pendingPettyCash.length +
    pendingCashAllocations.length + pendingPaymentBatches.length + pendingPaymentRequests.length +
    pendingMealPrograms.length + personalPaymentRequests.length + pendingEcocashConversions.length
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [batchingId, setBatchingId] = useState<string | null>(null)
  const [approvingMealId, setApprovingMealId] = useState<string | null>(null)
  const [standaloneReview, setStandaloneReview] = useState<{
    accountId: string
    accountName: string
    payments: StandalonePaymentDetail[]
    approved: Set<string>
    rejected: Set<string>
    submitting: boolean
  } | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/pending-actions', { credentials: 'include' })
      const json = await res.json()
      if (res.ok) {
        setLoanLockRequests(json.loanLockRequests || [])
        setPendingSupplierPayments(json.pendingSupplierPayments || [])
        setPendingPettyCash(json.pendingPettyCash || [])
        setPendingCashAllocations(json.pendingCashAllocations || [])
        setPendingPaymentBatches(json.pendingPaymentBatches || [])
        setPendingPaymentRequests(json.pendingPaymentRequests || [])
        setMyPendingPayments(json.myPendingPayments || [])
        setMyApprovedPayments(json.myApprovedPayments || [])
        setMyApprovedPettyCash(json.myApprovedPettyCash || [])
        setPendingMealPrograms(json.pendingMealPrograms || [])
        setPersonalPaymentRequests(json.personalPaymentRequests || [])
        setPendingEcocashConversions(json.pendingEcocashConversions || [])
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/signin'); return }
    if (status === 'authenticated') fetchItems()
  }, [status, fetchItems, router])

  useEffect(() => {
    // Debug: log pending cash allocations after fetch
    console.log('PENDING CASH ALLOCATIONS', pendingCashAllocations)
  }, [pendingCashAllocations])

  async function handleQuickBatch(item: PendingPaymentRequest) {
    const businessId = item.business?.id
    if (!businessId) {
      // Standalone account — fetch payment details and show review modal
      setBatchingId(item.id)
      try {
        const res = await fetch(`/api/expense-account/${item.id}/payments?status=all&limit=100`, { credentials: 'include' })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load payments')
        // Personal-account REQUEST payments are in personalPaymentRequests section.
        // Business-account REQUEST payments use the old request/approval flow and appear here.
        const pendingStatuses = ['QUEUED', 'REQUEST', 'SUBMITTED']
        const payments: StandalonePaymentDetail[] = (json.data?.payments ?? [])
          .filter((p: any) => pendingStatuses.includes(p.status))
          .map((p: any) => ({
            id: p.id,
            amount: p.amount,
            paymentDate: p.paymentDate,
            notes: p.notes,
            paymentChannel: p.paymentChannel || 'CASH',
            payeeName: p.payeeEmployee?.fullName ?? p.payeeUser?.name ?? p.payeePerson?.fullName ?? p.payeeBusiness?.name ?? p.payeeSupplier?.name ?? null,
            categoryName: p.category ? `${p.category.emoji} ${p.category.name}` : null,
            subcategoryName: p.subcategory ? `${p.subcategory.emoji} ${p.subcategory.name}` : null,
            subSubcategoryName: p.subSubcategoryName ?? null,
            creatorName: p.creator?.name ?? null,
          }))
        setStandaloneReview({ accountId: item.id, accountName: item.accountName, payments, approved: new Set(), rejected: new Set(), submitting: false })
      } catch (e: any) {
        toast.error(e.message)
      } finally {
        setBatchingId(null)
      }
      return
    }
    setBatchingId(item.id)
    try {
      const res = await fetch('/api/eod-payment-batches/quick-batch', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create batch')
      router.push(`/expense-accounts/payment-batches/${json.batchId}/review`)
    } catch (e: any) {
      toast.error(e.message)
      setBatchingId(null)
    }
  }

  async function handleApproveStandalone() {
    if (!standaloneReview) return
    setStandaloneReview(prev => prev ? { ...prev, submitting: true } : null)
    try {
      const res = await fetch(`/api/expense-account/${standaloneReview.accountId}/payments/direct-approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedPaymentIds: Array.from(standaloneReview.approved),
          rejectedPaymentIds: Array.from(standaloneReview.rejected),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to process decisions')
      const parts = []
      if (json.approvedCount > 0) parts.push(`${json.approvedCount} approved`)
      if (json.rejectedCount > 0) parts.push(`${json.rejectedCount} returned to queue`)
      toast.push(parts.join(', '), { type: 'success' })
      const removedAccountId = standaloneReview.accountId
      setStandaloneReview(null)
      setPendingPaymentRequests(prev => prev.filter(r => r.id !== removedAccountId))
    } catch (e: any) {
      toast.error(e.message)
      setStandaloneReview(prev => prev ? { ...prev, submitting: false } : null)
    }
  }

  async function handlePersonalApprove(item: PersonalPaymentRequest) {
    setPersonalActionState(prev => ({ ...prev, [item.id]: 'approving' }))
    try {
      const res = await fetch(`/api/expense-account/pending-actions/${item.id}/approve`, {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to approve')
      setPersonalPaymentRequests(prev => prev.filter(p => p.id !== item.id))
      // Open voucher modal so cashier knows payment was approved and can generate receipt
      setVoucherItem(item)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setPersonalActionState(prev => ({ ...prev, [item.id]: null }))
    }
  }

  async function handlePersonalReject(item: PersonalPaymentRequest) {
    setPersonalActionState(prev => ({ ...prev, [item.id]: 'rejecting' }))
    try {
      const res = await fetch(`/api/expense-account/pending-actions/${item.id}/reject`, {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to reject')
      toast.push(`Rejected payment request from ${item.creatorName ?? 'requester'}`)
      setPersonalPaymentRequests(prev => prev.filter(p => p.id !== item.id))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setPersonalActionState(prev => ({ ...prev, [item.id]: null }))
    }
  }

  async function handleApproveMeals(item: PendingMealProgram) {
    if (!await confirm({
      title: `Approve Meal Program — ${item.business?.name ?? item.accountName}`,
      description: `Approve ${item.paymentCount} subsidy payment${item.paymentCount !== 1 ? 's' : ''} totalling $${item.totalAmount.toFixed(2)}. A matching deposit will be created to balance the account.`,
      confirmText: 'Approve All',
    })) return

    setApprovingMealId(item.batchPaymentId)
    try {
      const res = await fetch('/api/restaurant/meal-program/approve', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchPaymentId: item.batchPaymentId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to approve')
      toast.push(`Approved ${json.approved} meal subsidy payment${json.approved !== 1 ? 's' : ''}`, { type: 'success' })
      setPendingMealPrograms(prev => prev.filter(m => m.batchPaymentId !== item.batchPaymentId))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setApprovingMealId(null)
    }
  }

  async function handleApproveLock(loan: LockRequest) {
    if (!await confirm({
      title: `Approve Lock — ${loan.loanNumber}`,
      description: 'This cannot be undone. The current balance will be snapshot and no further expense entries will be allowed.',
      confirmText: 'Approve Lock',
    })) return

    setApprovingId(loan.id)
    try {
      const res = await fetch(`/api/business-loans/${loan.id}/approve-lock`, { method: 'POST', credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to approve lock')
      toast.push(`Lock approved for ${loan.loanNumber}`, { type: 'success' })
      setLoanLockRequests(prev => prev.filter(l => l.id !== loan.id))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <>
    <ContentLayout title="Pending Actions">
      <div className="max-w-3xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Items requiring your attention</p>
          {!loading && total > 0 && (
            <span className="bg-red-500 text-white text-sm font-bold rounded-full px-3 py-1">
              {total}
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-gray-500 dark:text-gray-400 text-center py-12">Loading…</div>
        ) : total === 0 ? (
          <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">All clear — no pending actions</p>
          </div>
        ) : (
          <div className="space-y-8">

            {/* Loan Lock Requests */}
            {loanLockRequests.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>🔒</span> Loan Lock Requests
                  <span className="bg-yellow-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {loanLockRequests.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {loanLockRequests.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-white">{item.loanNumber}</span>
                          <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 text-xs font-medium px-2 py-0.5 rounded">Lock Requested</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{item.description}</p>
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>Lender: <span className="font-medium text-gray-700 dark:text-gray-300">{item.lenderName}</span></span>
                          <span>Manager: <span className="font-medium text-gray-700 dark:text-gray-300">{item.managedBy?.name ?? '—'}</span></span>
                          <span>Requested by: <span className="font-medium text-gray-700 dark:text-gray-300">{item.lockRequester?.name ?? item.managedBy?.name ?? '—'}</span></span>
                          {item.lockRequestedAt && (
                            <span>On: <span className="font-medium text-gray-700 dark:text-gray-300">{new Date(item.lockRequestedAt).toLocaleString()}</span></span>
                          )}
                          {item.expenseAccount && (
                            <span>Balance: <span className="font-medium text-gray-700 dark:text-gray-300">${Number(item.expenseAccount.balance).toFixed(2)}</span></span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Link
                          href={`/loans/${item.id}`}
                          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          View Loan
                        </Link>
                        <button
                          onClick={() => handleApproveLock(item)}
                          disabled={approvingId === item.id}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
                        >
                          {approvingId === item.id ? 'Approving…' : 'Approve Lock'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Petty Cash Requests */}
            {pendingPettyCash.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>💵</span> Petty Cash Requests
                  <span className="bg-orange-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {pendingPettyCash.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {pendingPettyCash.map(item => {
                    const isUrgent = item.priority === 'URGENT'
                    const isEcocash = item.paymentChannel === 'ECOCASH'
                    return (
                    <div key={item.id} className={`bg-white dark:bg-gray-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${isUrgent ? 'border-2 border-red-500 dark:border-red-400' : 'border border-orange-300 dark:border-orange-700'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isUrgent && <span className="text-lg">🚨</span>}
                          <span className={`font-semibold ${isUrgent ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}>{item.purpose}</span>
                          {isUrgent && <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-xs font-bold px-2 py-0.5 rounded">URGENT</span>}
                          <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 text-xs font-medium px-2 py-0.5 rounded">Pending</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${isEcocash ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                            {isEcocash ? '📱 EcoCash' : '💵 Cash'}
                          </span>
                        </div>
                        {item.notes && <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{item.notes}</p>}
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>Amount: <span className="font-medium text-gray-700 dark:text-gray-300">${Number(item.requestedAmount).toFixed(2)}</span></span>
                          <span>Requested by: <span className="font-medium text-gray-700 dark:text-gray-300">{item.requester?.name ?? '—'}</span></span>
                          {item.business && <span>Business: <span className="font-medium text-gray-700 dark:text-gray-300">{item.business.name}</span></span>}
                          <span>At: <span className="font-medium text-gray-700 dark:text-gray-300">{formatDateTimeZim(item.requestedAt)}</span></span>
                        </div>
                      </div>
                      <Link
                        href={`/petty-cash/${item.id}`}
                        className={`px-3 py-1.5 text-white text-sm font-medium rounded transition-colors shrink-0 ${isUrgent ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}`}
                      >
                        Handle Request
                      </Link>
                    </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Pending Eco-Cash Conversions */}
            {pendingEcocashConversions.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>📱</span> Eco-Cash to Cash Conversions
                  <span className="bg-teal-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {pendingEcocashConversions.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {pendingEcocashConversions.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 border border-teal-300 dark:border-teal-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg">📱→💵</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {item.business?.name ?? '—'}
                          </span>
                          <span className="bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 text-xs font-medium px-2 py-0.5 rounded">Pending Approval</span>
                        </div>
                        {item.notes && <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{item.notes}</p>}
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>Amount: <span className="font-semibold text-teal-600 dark:text-teal-400">${Number(item.amount).toFixed(2)}</span></span>
                          <span>Requested by: <span className="font-medium text-gray-700 dark:text-gray-300">{item.requester?.name ?? '—'}</span></span>
                          <span>At: <span className="font-medium text-gray-700 dark:text-gray-300">{formatDateTimeZim(item.requestedAt)}</span></span>
                        </div>
                      </div>
                      <Link
                        href="/cash-bucket"
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded transition-colors shrink-0"
                      >
                        Review
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Cash Allocation Reports */}
            {pendingCashAllocations.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>💰</span> Cash Allocation Reports
                  <span className="bg-blue-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {pendingCashAllocations.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {pendingCashAllocations.map(item => {
                    const isGrouped = item.isGrouped === true
                    const cashAllocUrl = isGrouped
                      ? `/${item.business?.type ?? 'restaurant'}/reports/cash-allocation?reportId=${item.id}&businessId=${item.business?.id ?? ''}`
                      : `/${item.business?.type ?? 'restaurant'}/reports/cash-allocation?date=${item.reportDate ? item.reportDate.split('T')[0] : ''}&businessId=${item.business?.id ?? ''}`
                    const dates = isGrouped
                      ? (item.groupedRun?.dates ?? []).map(d => d.date).sort()
                      : item.reportDate ? [item.reportDate.split('T')[0]] : []
                    return (
                      <div key={item.id} className="bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg">{isGrouped ? '📅' : '📊'}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {item.business?.name ?? 'Unknown Business'}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                              item.status === 'DRAFT'
                                ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            }`}>
                              {item.status}
                            </span>
                            {isGrouped && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                                Grouped Catch-Up
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                            {isGrouped ? (
                              <span>Days: <span className="font-medium text-gray-700 dark:text-gray-300">
                                {dates.length === 0 ? '—' : dates.map(d => d.slice(5).replace('-', '/')).join(', ')}
                              </span></span>
                            ) : (
                              <span>Date: <span className="font-medium text-gray-700 dark:text-gray-300">
                                {dates[0] ? formatDateTimeZim(dates[0] + 'T00:00:00') : '—'}
                              </span></span>
                            )}
                            {item._count.lineItems === 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">EOD complete · tap Reconcile to generate</span>
                            ) : (
                              <span>Items: <span className="font-medium text-gray-700 dark:text-gray-300">{item._count.lineItems}</span></span>
                            )}
                            {item.cashboxDeposit != null && (
                              <span>💵 Cashbox: <span className="font-semibold text-blue-600 dark:text-blue-400">${Number(item.cashboxDeposit).toFixed(2)}</span></span>
                            )}
                            {item.totalReported > 0 && (
                              <span>📤 Deposits: <span className="font-semibold text-emerald-600 dark:text-emerald-400">${item.totalReported.toFixed(2)}</span></span>
                            )}
                          </div>
                        </div>
                        <Link
                          href={cashAllocUrl}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors shrink-0"
                        >
                          Reconcile
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* EOD Payment Batches awaiting cashier review */}
            {pendingPaymentBatches.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>📋</span> EOD Payment Batches
                  <span className="bg-amber-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {pendingPaymentBatches.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {pendingPaymentBatches.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-white">{item.business?.name ?? 'Unknown Business'}</span>
                          <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs font-medium px-2 py-0.5 rounded">
                            {item._count.payments} payment{item._count.payments !== 1 ? 's' : ''}
                          </span>
                          {(item.cashCount ?? 0) > 0 && (
                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-medium px-2 py-0.5 rounded">💵 {item.cashCount}</span>
                          )}
                          {(item.ecocashCount ?? 0) > 0 && (
                            <span className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 text-xs font-medium px-2 py-0.5 rounded">📱 {item.ecocashCount}</span>
                          )}
                          {typeof item.totalAmount === 'number' && (
                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-semibold px-2 py-0.5 rounded">
                              ${item.totalAmount.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          EOD Date: {new Date(item.eodDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                          {item.business?.type && <span className="capitalize ml-2">· {item.business.type}</span>}
                        </p>
                      </div>
                      <Link
                        href={`/expense-accounts/payment-batches/${item.id}/review`}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded transition-colors shrink-0"
                      >
                        Review Batch
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Personal Payment Requests — cashier-assisted payments awaiting approval */}
            {personalPaymentRequests.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>🙋</span> Personal Payment Requests
                  <span className="bg-amber-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {personalPaymentRequests.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {personalPaymentRequests.map(item => {
                    const isUrgent = item.priority === 'URGENT'
                    const actionState = personalActionState[item.id]
                    return (
                      <div key={item.id} className={`bg-white dark:bg-gray-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${isUrgent ? 'border-2 border-red-500 dark:border-red-400' : 'border border-amber-300 dark:border-amber-700'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isUrgent && <span className="text-lg">🚨</span>}
                            <span className={`font-semibold ${isUrgent ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}>
                              ${item.amount.toFixed(2)}
                            </span>
                            <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs font-medium px-2 py-0.5 rounded">⏳ Awaiting Cashier</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${item.paymentChannel === 'ECOCASH' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                              {item.paymentChannel === 'ECOCASH' ? '📱 EcoCash' : '💵 Cash'}
                            </span>
                          </div>
                          {item.notes && <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{item.notes}</p>}
                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                            <span>Account: <span className="font-medium text-gray-700 dark:text-gray-300">{item.accountName}</span></span>
                            {item.payeeName && <span>Payee: <span className="font-medium text-gray-700 dark:text-gray-300">{item.payeeName}</span></span>}
                            {item.categoryName && <span>Category: <span className="font-medium text-gray-700 dark:text-gray-300">{item.categoryName}</span></span>}
                            {item.creatorName && <span>Requested by: <span className="font-medium text-gray-700 dark:text-gray-300">{item.creatorName}</span></span>}
                            {item.createdAt && <span>At: <span className="font-medium text-gray-700 dark:text-gray-300">{formatDateTimeZim(item.createdAt)}</span></span>}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handlePersonalApprove(item)}
                            disabled={!!actionState}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
                          >
                            {actionState === 'approving' ? 'Approving…' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handlePersonalReject(item)}
                            disabled={!!actionState}
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
                          >
                            {actionState === 'rejecting' ? 'Rejecting…' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Pending Payment Batch Requests */}
            {pendingPaymentRequests.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>📦</span> Payment Requests
                  <span className="bg-indigo-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {pendingPaymentRequests.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {pendingPaymentRequests.map(item => {
                    const hasUrgent = (item.urgentCount ?? 0) > 0
                    return (
                    <div key={item.id} className={`bg-white dark:bg-gray-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${hasUrgent ? 'border-2 border-red-500 dark:border-red-400' : 'border border-indigo-300 dark:border-indigo-700'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {hasUrgent && <span className="text-lg">🚨</span>}
                          <span className={`font-semibold ${hasUrgent ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}>{item.accountName}</span>
                          {hasUrgent && <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-xs font-bold px-2 py-0.5 rounded">{item.urgentCount} URGENT</span>}
                          <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-xs font-medium px-2 py-0.5 rounded">{item.requestCount} pending</span>
                          {(item.cashCount ?? 0) > 0 && (
                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-medium px-2 py-0.5 rounded">💵 {item.cashCount}</span>
                          )}
                          {(item.ecocashCount ?? 0) > 0 && (
                            <span className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 text-xs font-medium px-2 py-0.5 rounded">📱 {item.ecocashCount}</span>
                          )}
                          {item.totalAmount != null && (
                            <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded">${Number(item.totalAmount).toFixed(2)}</span>
                          )}
                        </div>
                        {item.business && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{item.business.name} · #{item.accountNumber}</p>}
                      </div>
                      <button
                        onClick={() => handleQuickBatch(item)}
                        disabled={batchingId === item.id}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors shrink-0"
                      >
                        {batchingId === item.id ? 'Creating…' : 'Review Payments'}
                      </button>
                    </div>
                  )})}
                </div>
              </div>
            )}

            {/* My Pending Payment Requests — own QUEUED payments awaiting cashier batching */}
            {myPendingPayments.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>📤</span> My Payment Requests
                  <span className="bg-blue-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {myPendingPayments.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {myPendingPayments.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-white">{item.accountName}</span>
                          {item.awaitingCashier ? (
                            <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs font-medium px-2 py-0.5 rounded">Awaiting cashier</span>
                          ) : (
                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-medium px-2 py-0.5 rounded">{item.requestCount} queued</span>
                          )}
                          {item.totalAmount != null && (
                            <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded">${Number(item.totalAmount).toFixed(2)}</span>
                          )}
                        </div>
                        {item.business && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{item.business.name} · #{item.accountNumber}</p>}
                      </div>
                      <Link
                        href={`/expense-accounts/${item.id}`}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors shrink-0"
                      >
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* My Approved Petty Cash — collect cash */}
            {myApprovedPettyCash.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>🪙</span> Petty Cash Approved — Collect Cash
                  <span className="bg-green-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {myApprovedPettyCash.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {myApprovedPettyCash.map((item: any) => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-white">{item.purpose}</span>
                          <span className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 text-xs font-medium px-2 py-0.5 rounded">Approved</span>
                          {item.approvedAmount != null && (
                            <span className="text-green-600 dark:text-green-400 font-semibold">${Number(item.approvedAmount).toFixed(2)}</span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          {item.business && <span>Business: <span className="font-medium text-gray-700 dark:text-gray-300">{item.business.name}</span></span>}
                          {item.approvedAt && <span>Approved: <span className="font-medium text-gray-700 dark:text-gray-300">{formatDateTimeZim(item.approvedAt)}</span></span>}
                        </div>
                      </div>
                      <Link
                        href={`/petty-cash/${item.id}`}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors shrink-0"
                      >
                        Collect Cash
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* My Approved Payments — collect cash */}
            {myApprovedPayments.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>✅</span> Payment Approved — Collect Cash
                  <span className="bg-green-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {myApprovedPayments.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {myApprovedPayments.map((item: any) => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-white">${Number(item.amount).toFixed(2)}</span>
                          <span className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 text-xs font-medium px-2 py-0.5 rounded">Approved</span>
                          {item.categoryName && <span className="text-xs text-gray-500 dark:text-gray-400">{item.categoryName}</span>}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>Business: <span className="font-medium text-gray-700 dark:text-gray-300">{item.businessName}</span></span>
                          {item.payeeName && <span>Payee: <span className="font-medium text-gray-700 dark:text-gray-300">{item.payeeName}</span></span>}
                          {item.approvedAt && <span>Approved: <span className="font-medium text-gray-700 dark:text-gray-300">{formatDateTimeZim(item.approvedAt)}</span></span>}
                        </div>
                        {item.notes && <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{item.notes}</p>}
                      </div>
                      <Link
                        href="/expense-accounts/my-payments"
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors shrink-0"
                      >
                        Collect Cash
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Meal Program Approvals */}
            {pendingMealPrograms.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>🍽️</span> Meal Program Approvals
                  <span className="bg-teal-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {pendingMealPrograms.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {pendingMealPrograms.map(item => (
                    <div key={item.batchPaymentId} className="bg-white dark:bg-gray-800 border border-teal-300 dark:border-teal-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-white">{item.business?.name ?? item.accountName}</span>
                          <span className="bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 text-xs font-medium px-2 py-0.5 rounded">
                            {item.paymentCount} subsidy{item.paymentCount !== 1 ? ' payments' : ' payment'}
                          </span>
                          <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                            ${item.totalAmount.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{item.accountName} · #{item.accountNumber}</p>
                      </div>
                      <button
                        onClick={() => handleApproveMeals(item)}
                        disabled={approvingMealId === item.batchPaymentId}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors shrink-0"
                      >
                        {approvingMealId === item.batchPaymentId ? 'Approving…' : 'Approve All'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Supplier Payment Requests */}
            {pendingSupplierPayments.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>🧾</span> Supplier Payment Requests
                  <span className="bg-orange-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {pendingSupplierPayments.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {pendingSupplierPayments.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 border border-orange-300 dark:border-orange-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-white">{item.supplier?.name ?? 'Unknown Supplier'}</span>
                          <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 text-xs font-medium px-2 py-0.5 rounded">Pending</span>
                        </div>
                        {item.notes && <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{item.notes}</p>}
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>Amount: <span className="font-medium text-gray-700 dark:text-gray-300">${Number(item.amount).toFixed(2)}</span></span>
                          <span>Business: <span className="font-medium text-gray-700 dark:text-gray-300">{item.business?.name ?? '—'}</span></span>
                          <span>Submitted by: <span className="font-medium text-gray-700 dark:text-gray-300">{item.submitter?.name ?? '—'}</span></span>
                          <span>Due: <span className="font-medium text-gray-700 dark:text-gray-300">{new Date(item.dueDate).toLocaleDateString()}</span></span>
                        </div>
                      </div>
                      <Link
                        href="/supplier-payments"
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors shrink-0"
                      >
                        View Queue
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </ContentLayout>

    {/* Standalone account payment review modal */}
    {standaloneReview && (() => {
      const undecided = standaloneReview.payments.filter(p => !standaloneReview.approved.has(p.id) && !standaloneReview.rejected.has(p.id))
      const setApprove = (id: string) => setStandaloneReview(prev => {
        if (!prev) return prev
        const approved = new Set([...prev.approved, id])
        const rejected = new Set(prev.rejected); rejected.delete(id)
        return { ...prev, approved, rejected }
      })
      const setReject = (id: string) => setStandaloneReview(prev => {
        if (!prev) return prev
        const rejected = new Set([...prev.rejected, id])
        const approved = new Set(prev.approved); approved.delete(id)
        return { ...prev, approved, rejected }
      })
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review Payments — {standaloneReview.accountName}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {standaloneReview.payments.length} request{standaloneReview.payments.length !== 1 ? 's' : ''} · {undecided.length > 0 ? <span className="text-amber-600 dark:text-amber-400">{undecided.length} undecided</span> : <span className="text-green-600 dark:text-green-400">All decided</span>}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {standaloneReview.payments.map(p => {
                const isApproved = standaloneReview.approved.has(p.id)
                const isRejected = standaloneReview.rejected.has(p.id)
                return (
                  <div key={p.id} className={`border rounded-lg p-3 transition-colors ${isApproved ? 'border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-700' : isRejected ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 dark:text-white">${Number(p.amount).toFixed(2)}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${p.paymentChannel === 'ECOCASH' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                            {p.paymentChannel === 'ECOCASH' ? '📱 EcoCash' : '💵 Cash'}
                          </span>
                          {isApproved && <span className="text-xs font-semibold text-green-700 dark:text-green-400">✓ Approved</span>}
                          {isRejected && <span className="text-xs font-semibold text-red-600 dark:text-red-400">✕ Returned to Queue</span>}
                        </div>
                        {p.payeeName && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                            <span className="text-gray-500 dark:text-gray-400">Payee: </span>
                            <span className="font-medium">{p.payeeName}</span>
                          </p>
                        )}
                        {p.notes && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                            <span className="text-gray-500 dark:text-gray-400">Purpose: </span>{p.notes}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {p.categoryName && <span>Category: <span className="font-medium text-gray-700 dark:text-gray-300">{p.categoryName}</span></span>}
                          {p.subcategoryName && <span>Subcategory: <span className="font-medium text-gray-700 dark:text-gray-300">{p.subcategoryName}</span></span>}
                          {p.subSubcategoryName && <span>Sub-category: <span className="font-medium text-gray-700 dark:text-gray-300">{p.subSubcategoryName}</span></span>}
                          <span>Date: <span className="font-medium text-gray-700 dark:text-gray-300">{new Date(p.paymentDate).toLocaleDateString()}</span></span>
                          {p.creatorName && <span>Requested by: <span className="font-medium text-gray-700 dark:text-gray-300">{p.creatorName}</span></span>}
                        </div>
                      </div>
                      {/* Per-payment Approve / Reject buttons */}
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => setApprove(p.id)}
                          disabled={standaloneReview.submitting}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${isApproved ? 'bg-green-600 text-white' : 'border border-green-500 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'}`}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setReject(p.id)}
                          disabled={standaloneReview.submitting}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${isRejected ? 'bg-red-500 text-white' : 'border border-red-400 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'}`}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {standaloneReview.payments.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-6">No pending payments found.</p>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {undecided.length > 0 ? `${undecided.length} payment${undecided.length !== 1 ? 's' : ''} still need a decision` : `${standaloneReview.approved.size} approved · ${standaloneReview.rejected.size} returned to queue`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setStandaloneReview(null)}
                  disabled={standaloneReview.submitting}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveStandalone}
                  disabled={standaloneReview.submitting || undecided.length > 0 || standaloneReview.payments.length === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-md"
                >
                  {standaloneReview.submitting ? 'Submitting…' : 'Submit Decisions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    })()}

    {/* Payment Voucher modal — opens after cashier approves a personal payment request */}
    {voucherItem && (
      <ExpensePaymentVoucherModal
        payment={{
          id: voucherItem.id,
          amount: voucherItem.amount,
          paymentDate: voucherItem.paymentDate ?? new Date().toISOString(),
          payeeName: voucherItem.payeeName ?? '—',
          payeeType: 'PERSON',
          purpose: voucherItem.notes ?? voucherItem.categoryName ?? '—',
          category: voucherItem.categoryName ?? undefined,
          businessId: '',
          businessName: voucherItem.accountName,
        } as PaymentSummary}
        existingVoucher={null}
        userId={session?.user?.id ?? ''}
        creatorName={session?.user?.name ?? ''}
        onClose={() => setVoucherItem(null)}
        onSaved={() => setVoucherItem(null)}
      />
    )}
  </>
  )
}
