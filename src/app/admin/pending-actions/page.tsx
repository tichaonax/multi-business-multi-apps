'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'

import { useToastContext } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-modal'
import Link from 'next/link'
import { formatDateTimeZim } from '@/lib/date-utils'
import { ExpensePaymentVoucherModal, PaymentSummary } from '@/components/expense-account/expense-payment-voucher-modal'

// Approved standalone payment returned by direct-approve API — used to drive per-payment voucher panel
interface ApprovedStandalonePayment {
  id: string
  amount: number
  notes: string | null
  paymentChannel: string
  paymentDate: string | null
  payeeName: string | null
  categoryName: string | null
  subcategoryName: string | null
  businessId: string | null
  businessName: string | null
}

// Canonical adapter — maps any source payment type to PaymentSummary for ExpensePaymentVoucherModal
function toPaymentSummary(
  payment: PersonalPaymentRequest | ApprovedStandalonePayment,
  accountName?: string
): PaymentSummary {
  // PersonalPaymentRequest has expenseAccountId; ApprovedStandalonePayment has businessId
  const isPersonal = 'expenseAccountId' in payment
  return {
    id: payment.id,
    amount: payment.amount,
    paymentDate: payment.paymentDate ?? new Date().toISOString(),
    payeeName: payment.payeeName ?? '—',
    payeeType: 'PERSON',
    purpose: payment.notes ?? (isPersonal ? (payment as PersonalPaymentRequest).categoryName : (payment as ApprovedStandalonePayment).categoryName) ?? '—',
    category: isPersonal
      ? (payment as PersonalPaymentRequest).categoryName ?? undefined
      : (payment as ApprovedStandalonePayment).categoryName ?? undefined,
    businessId: isPersonal ? null : ((payment as ApprovedStandalonePayment).businessId ?? null),
    businessName: isPersonal
      ? (accountName ?? (payment as PersonalPaymentRequest).accountName)
      : ((payment as ApprovedStandalonePayment).businessName ?? accountName ?? null),
  }
}

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
  const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([])
  const [withdrawalActionState, setWithdrawalActionState] = useState<Record<string, boolean>>({})
  const [withdrawalDenyModal, setWithdrawalDenyModal] = useState<{ requestId: string; loanId: string; amount: number; deniedByRole: 'ADMIN' | 'CASHIER' } | null>(null)
  const [withdrawalDenyReason, setWithdrawalDenyReason] = useState('Insufficient funds')
  const [withdrawalApproveModal, setWithdrawalApproveModal] = useState<{ requestId: string; loanId: string; requestedAmount: number } | null>(null)
  const [withdrawalApproveAmount, setWithdrawalApproveAmount] = useState('')
  const [personalActionState, setPersonalActionState] = useState<Record<string, 'approving' | 'rejecting' | null>>({})
  const [voucherItem, setVoucherItem] = useState<PersonalPaymentRequest | null>(null)
  // Standalone approval voucher panel state
  const [justApprovedStandalone, setJustApprovedStandalone] = useState<ApprovedStandalonePayment[]>([])
  const [standaloneVoucherStatuses, setStandaloneVoucherStatuses] = useState<Record<string, 'pending' | 'created' | 'skipped'>>({})
  const [standaloneVoucherItem, setStandaloneVoucherItem] = useState<ApprovedStandalonePayment | null>(null)
  const [standaloneAccountName, setStandaloneAccountName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const currentUser = session?.user as any
  const isAdminUser = currentUser?.role === 'admin'
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
  const [pageSearch, setPageSearch] = useState('')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // After data loads, scroll to and highlight the target request if ?requestId= is in the URL
  useEffect(() => {
    const requestId = searchParams.get('requestId')
    if (!requestId || loading) return
    const el = document.getElementById(`request-${requestId}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightId(requestId)
    const t = setTimeout(() => setHighlightId(null), 2500)
    return () => clearTimeout(t)
  }, [loading, searchParams])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const [res, wRes] = await Promise.all([
        fetch('/api/admin/pending-actions', { credentials: 'include' }),
        fetch('/api/business-loans/withdrawal-requests/pending', { credentials: 'include' }),
      ])
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
      if (wRes.ok) {
        const wJson = await wRes.json()
        setWithdrawalRequests(wJson.data ?? [])
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
      const accountNameForVoucher = standaloneReview.accountName
      setStandaloneReview(null)
      setPendingPaymentRequests(prev => prev.filter(r => r.id !== removedAccountId))
      // Populate voucher panel for each approved payment
      if (json.approvedPayments?.length > 0) {
        setJustApprovedStandalone(json.approvedPayments)
        setStandaloneVoucherStatuses(Object.fromEntries(json.approvedPayments.map((p: ApprovedStandalonePayment) => [p.id, 'pending' as const])))
        setStandaloneAccountName(accountNameForVoucher)
      }
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
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Items requiring your attention</p>
          {!loading && total > 0 && (
            <span className="bg-red-500 text-white text-sm font-bold rounded-full px-3 py-1">
              {total}
            </span>
          )}
        </div>
        {!loading && total > 0 && (
          <div className="mb-6">
            <input
              type="text"
              value={pageSearch}
              onChange={e => setPageSearch(e.target.value)}
              placeholder="Search by name, purpose, account…"
              className="w-full px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {pageSearch && (
              <button onClick={() => setPageSearch('')} className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">Clear search</button>
            )}
          </div>
        )}

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
            {(() => { const _ps = pageSearch.toLowerCase().trim(); const items = _ps ? loanLockRequests.filter(i => [i.loanNumber, i.description, i.lenderName, i.lockRequester?.name, i.managedBy?.name].some(v => v?.toLowerCase().includes(_ps))) : loanLockRequests; return items.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>🔒</span> Loan Lock Requests
                  <span className="bg-yellow-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {items.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {items.map(item => (
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
            )})()}

            {/* Pending Petty Cash Requests */}
            {(() => { const _ps = pageSearch.toLowerCase().trim(); const items = _ps ? pendingPettyCash.filter(i => [i.purpose, i.notes, i.requester?.name, i.business?.name].some(v => v?.toLowerCase().includes(_ps))) : pendingPettyCash; return items.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>💵</span> Petty Cash Requests
                  <span className="bg-orange-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {items.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {items.map(item => {
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
            )})()}

            {/* Pending Eco-Cash Conversions */}
            {(() => { const _ps = pageSearch.toLowerCase().trim(); const items = _ps ? pendingEcocashConversions.filter(i => [i.business?.name, i.requester?.name, i.notes].some(v => v?.toLowerCase().includes(_ps))) : pendingEcocashConversions; return items.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>📱</span> Eco-Cash to Cash Conversions
                  <span className="bg-teal-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {items.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {items.map(item => (
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
            )})()}

            {/* Loan Withdrawal Requests */}
            {(() => { const _ps = pageSearch.toLowerCase().trim(); const items = _ps ? withdrawalRequests.filter((i: any) => [i.creator?.name, i.loan?.loanNumber, i.requestMonth, i.notes].some((v: any) => typeof v === 'string' && v.toLowerCase().includes(_ps))) : withdrawalRequests; return items.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>💸</span> Loan Withdrawal Requests
                  <span className="bg-purple-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {items.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {items.map((item: any) => {
                    const isPending = item.status === 'PENDING'
                    const isDraft = item.status === 'DRAFT'
                    const isApproved = item.status === 'APPROVED'
                    const isActioning = withdrawalActionState[item.id]
                    return (
                      <div key={item.id} className={`bg-white dark:bg-gray-800 border rounded-lg p-4 ${
                        isApproved ? 'border-purple-400 dark:border-purple-600' :
                        isDraft ? 'border-gray-300 dark:border-gray-600 opacity-75' :
                        'border-purple-200 dark:border-purple-800'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {isPending && <span className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-xs font-medium px-2 py-0.5 rounded">🔒 Pending Admin Approval</span>}
                              {isDraft && <span className="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 text-xs font-medium px-2 py-0.5 rounded">✏️ Lender is Editing</span>}
                              {isApproved && <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs font-medium px-2 py-0.5 rounded">✅ Approved — Ready to Disburse</span>}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                              <span className="font-semibold text-gray-900 dark:text-white">{item.creator?.name ?? '—'}</span>
                              <span className="font-mono text-purple-600 dark:text-purple-400">${Number(isApproved ? item.approvedAmount : item.requestedAmount).toFixed(2)}{isDraft ? '*' : ''}</span>
                              <span className="text-gray-500 dark:text-gray-400">Loan {item.loan?.loanNumber}</span>
                              <span className="text-gray-500 dark:text-gray-400">{item.requestMonth}</span>
                              {isApproved && item.loan?.lenderContactInfo && (
                                <span className="text-gray-500 dark:text-gray-400">{item.loan.lenderContactInfo}</span>
                              )}
                            </div>
                            {item.notes && !isDraft && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">"{item.notes}"</p>
                            )}
                            {isDraft && (
                              <p className="text-xs text-sky-600 dark:text-sky-400 mt-0.5 italic">Values may change — no action available until lender resubmits</p>
                            )}
                            {isApproved && item.approver && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Approved by {item.approver.name}</p>
                            )}
                          </div>
                          {isPending && isAdminUser && (
                            <div className="flex gap-2 shrink-0">
                              <button
                                disabled={isActioning}
                                onClick={() => { setWithdrawalApproveModal({ requestId: item.id, loanId: item.loanId, requestedAmount: Number(item.requestedAmount) }); setWithdrawalApproveAmount(String(item.requestedAmount)) }}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                disabled={isActioning}
                                onClick={() => setWithdrawalDenyModal({ requestId: item.id, loanId: item.loanId, amount: Number(item.requestedAmount), deniedByRole: 'ADMIN' })}
                                className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 text-sm font-medium rounded transition-colors hover:bg-red-100 disabled:opacity-50"
                              >
                                Deny
                              </button>
                            </div>
                          )}
                          {isApproved && (
                            <div className="flex gap-2 shrink-0">
                              <button
                                disabled={isActioning}
                                onClick={async () => {
                                  if (!await confirm({ title: 'Confirm Disbursement', description: `You are about to disburse $${Number(item.approvedAmount).toFixed(2)} to ${item.creator?.name}. This cannot be undone.`, confirmText: 'Confirm Disbursement' })) return
                                  setWithdrawalActionState(s => ({ ...s, [item.id]: true }))
                                  try {
                                    const res = await fetch(`/api/business-loans/${item.loanId}/withdrawal-requests/${item.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      credentials: 'include',
                                      body: JSON.stringify({ action: 'pay' }),
                                    })
                                    const json = await res.json()
                                    if (!res.ok) throw new Error(json.error || 'Failed to mark paid')
                                    toast.push('Disbursement confirmed', { type: 'success' })
                                    fetchItems()
                                  } catch (e: any) { toast.error(e.message) } finally {
                                    setWithdrawalActionState(s => ({ ...s, [item.id]: false }))
                                  }
                                }}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded transition-colors disabled:opacity-50"
                              >
                                {isActioning ? 'Processing…' : 'Mark as Paid'}
                              </button>
                              <button
                                disabled={isActioning}
                                onClick={() => setWithdrawalDenyModal({ requestId: item.id, loanId: item.loanId, amount: Number(item.approvedAmount), deniedByRole: 'CASHIER' })}
                                className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 text-sm font-medium rounded transition-colors hover:bg-red-100 disabled:opacity-50"
                              >
                                Deny — Insufficient Funds
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )})()}

            {/* Pending Cash Allocation Reports */}
            {(() => { const _ps = pageSearch.toLowerCase().trim(); const items = _ps ? pendingCashAllocations.filter(i => i.business?.name?.toLowerCase().includes(_ps)) : pendingCashAllocations; return items.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>💰</span> Cash Allocation Reports
                  <span className="bg-blue-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {items.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {items.map(item => {
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
            )})()}

            {/* EOD Payment Batches awaiting cashier review */}
            {(() => { const _ps = pageSearch.toLowerCase().trim(); const items = _ps ? pendingPaymentBatches.filter(i => [i.business?.name, i.eodDate].some(v => v?.toLowerCase().includes(_ps))) : pendingPaymentBatches; return items.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>📋</span> EOD Payment Batches
                  <span className="bg-amber-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {items.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {items.map(item => (
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
            )})()}

            {/* Personal Payment Requests — cashier-assisted payments awaiting approval */}
            {(() => { const _ps = pageSearch.toLowerCase().trim(); const items = _ps ? personalPaymentRequests.filter(i => [i.accountName, i.payeeName, i.creatorName, i.notes, i.categoryName].some(v => v?.toLowerCase().includes(_ps))) : personalPaymentRequests; return items.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>🙋</span> Personal Payment Requests
                  <span className="bg-amber-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {items.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {items.map(item => {
                    const isUrgent = item.priority === 'URGENT'
                    const actionState = personalActionState[item.id]
                    const isHighlighted = highlightId === item.id
                    return (
                      <div id={`request-${item.id}`} key={item.id} className={`bg-white dark:bg-gray-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-shadow ${isHighlighted ? 'ring-4 ring-indigo-400 ring-offset-2' : ''} ${isUrgent ? 'border-2 border-red-500 dark:border-red-400' : 'border border-amber-300 dark:border-amber-700'}`}>
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
            )})()}

            {/* Pending Payment Batch Requests */}
            {(() => { const _ps = pageSearch.toLowerCase().trim(); const items = _ps ? pendingPaymentRequests.filter(i => [i.accountName, i.business?.name].some(v => v?.toLowerCase().includes(_ps))) : pendingPaymentRequests; return items.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>📦</span> Payment Requests
                  <span className="bg-indigo-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {items.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {items.map(item => {
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
            )})()}

            {/* My Pending Payment Requests — own QUEUED payments awaiting cashier batching */}
            {(() => { const _ps = pageSearch.toLowerCase().trim(); const items = _ps ? myPendingPayments.filter(i => [i.accountName, i.business?.name].some(v => v?.toLowerCase().includes(_ps))) : myPendingPayments; return items.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>📤</span> My Payment Requests
                  <span className="bg-blue-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {items.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {items.map(item => (
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
            )})()}

            {/* My Approved Petty Cash — collect cash */}
            {(() => { const _ps = pageSearch.toLowerCase().trim(); const items = _ps ? myApprovedPettyCash.filter((i: any) => [i.purpose, i.business?.name].some((v: any) => typeof v === 'string' && v.toLowerCase().includes(_ps))) : myApprovedPettyCash; return items.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>🪙</span> Petty Cash Approved — Collect Cash
                  <span className="bg-green-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {items.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {items.map((item: any) => (
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
            )})()}

            {/* My Approved Payments — collect cash */}
            {(() => { const _ps = pageSearch.toLowerCase().trim(); const items = _ps ? myApprovedPayments.filter((i: any) => [i.businessName, i.payeeName, i.categoryName, i.notes].some((v: any) => typeof v === 'string' && v.toLowerCase().includes(_ps))) : myApprovedPayments; return items.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>✅</span> Payment Approved — Collect Cash
                  <span className="bg-green-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {items.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {items.map((item: any) => (
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
            )})()}

            {/* Pending Meal Program Approvals */}
            {(() => { const _ps = pageSearch.toLowerCase().trim(); const items = _ps ? pendingMealPrograms.filter(i => [i.accountName, i.business?.name].some(v => v?.toLowerCase().includes(_ps))) : pendingMealPrograms; return items.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>🍽️</span> Meal Program Approvals
                  <span className="bg-teal-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {items.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {items.map(item => (
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
            )})()}

            {/* Pending Supplier Payment Requests */}
            {(() => { const _ps = pageSearch.toLowerCase().trim(); const items = _ps ? pendingSupplierPayments.filter(i => [i.supplier?.name, i.business?.name, i.notes, i.submitter?.name].some(v => v?.toLowerCase().includes(_ps))) : pendingSupplierPayments; return items.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>🧾</span> Supplier Payment Requests
                  <span className="bg-orange-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {items.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {items.map(item => (
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
            )})()}

          </div>
        )}
      </div>
    </ContentLayout>

    {/* Withdrawal — cashier deny modal */}
    {withdrawalDenyModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{withdrawalDenyModal.deniedByRole === 'ADMIN' ? 'Deny Withdrawal Request' : 'Deny Disbursement'}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Amount: <strong>${withdrawalDenyModal.amount.toFixed(2)}</strong></p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Reason for denial</label>
            <textarea
              rows={3}
              value={withdrawalDenyReason}
              onChange={e => setWithdrawalDenyReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setWithdrawalDenyModal(null); setWithdrawalDenyReason('Insufficient funds') }}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!withdrawalDenyReason.trim() || withdrawalActionState[withdrawalDenyModal.requestId]}
              onClick={async () => {
                const { requestId, loanId } = withdrawalDenyModal
                setWithdrawalActionState(s => ({ ...s, [requestId]: true }))
                try {
                  const res = await fetch(`/api/business-loans/${loanId}/withdrawal-requests/${requestId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ action: 'deny', deniedByRole: withdrawalDenyModal.deniedByRole, denialReason: withdrawalDenyReason }),
                  })
                  const json = await res.json()
                  if (!res.ok) throw new Error(json.error || 'Failed to deny')
                  toast.push('Disbursement denied', { type: 'success' })
                  setWithdrawalDenyModal(null)
                  setWithdrawalDenyReason('Insufficient funds')
                  fetchItems()
                } catch (e: any) { toast.error(e.message) } finally {
                  setWithdrawalActionState(s => ({ ...s, [requestId]: false }))
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Confirm Denial
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Withdrawal — admin approve modal */}
    {withdrawalApproveModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Approve Withdrawal</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Requested: <strong>${withdrawalApproveModal.requestedAmount.toFixed(2)}</strong></p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Approved amount</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={withdrawalApproveAmount}
              onChange={e => setWithdrawalApproveAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setWithdrawalApproveModal(null); setWithdrawalApproveAmount('') }}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!withdrawalApproveAmount || Number(withdrawalApproveAmount) <= 0 || withdrawalActionState[withdrawalApproveModal.requestId]}
              onClick={async () => {
                const { requestId, loanId } = withdrawalApproveModal
                setWithdrawalActionState(s => ({ ...s, [requestId]: true }))
                try {
                  const res = await fetch(`/api/business-loans/${loanId}/withdrawal-requests/${requestId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ action: 'approve', approvedAmount: parseFloat(withdrawalApproveAmount) }),
                  })
                  const json = await res.json()
                  if (!res.ok) throw new Error(json.error || 'Failed to approve')
                  toast.push('Withdrawal approved', { type: 'success' })
                  setWithdrawalApproveModal(null)
                  setWithdrawalApproveAmount('')
                  fetchItems()
                } catch (e: any) { toast.error(e.message) } finally {
                  setWithdrawalActionState(s => ({ ...s, [requestId]: false }))
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {withdrawalActionState[withdrawalApproveModal.requestId] ? 'Approving…' : 'Confirm Approval'}
            </button>
          </div>
        </div>
      </div>
    )}

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
        payment={toPaymentSummary(voucherItem)}
        existingVoucher={null}
        userId={session?.user?.id ?? ''}
        creatorName={session?.user?.name ?? ''}
        onClose={() => setVoucherItem(null)}
        onSaved={() => setVoucherItem(null)}
      />
    )}

    {standaloneVoucherItem && (
      <ExpensePaymentVoucherModal
        payment={toPaymentSummary(standaloneVoucherItem, standaloneAccountName)}
        existingVoucher={null}
        userId={session?.user?.id ?? ''}
        creatorName={session?.user?.name ?? ''}
        onClose={() => setStandaloneVoucherItem(null)}
        onSaved={() => {
          setStandaloneVoucherStatuses(prev => ({ ...prev, [standaloneVoucherItem.id]: 'created' }))
          setStandaloneVoucherItem(null)
        }}
      />
    )}

    {justApprovedStandalone.length > 0 && (
      <div className="fixed bottom-4 right-4 z-40 w-full max-w-md bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-green-50 dark:bg-green-900/30 border-b border-green-200 dark:border-green-700">
          <div>
            <p className="font-semibold text-green-800 dark:text-green-200 text-sm">
              ✅ {justApprovedStandalone.length} Payment{justApprovedStandalone.length !== 1 ? 's' : ''} Approved — Create Vouchers
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Each voucher captures the payee&apos;s signature as proof of receipt.</p>
          </div>
          <button
            onClick={() => { setJustApprovedStandalone([]); setStandaloneVoucherStatuses({}) }}
            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 text-lg leading-none ml-3"
            title="Dismiss"
          >✕</button>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-72 overflow-y-auto">
          {justApprovedStandalone.map(pmt => {
            const status = standaloneVoucherStatuses[pmt.id] ?? 'pending'
            return (
              <div key={pmt.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {pmt.payeeName ?? '—'}
                    <span className="ml-2 font-semibold text-gray-700 dark:text-gray-300">${pmt.amount.toFixed(2)}</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {pmt.categoryName ?? pmt.notes ?? '—'}
                    <span className="ml-2">{pmt.paymentChannel === 'ECOCASH' ? '📱 EcoCash' : '💵 Cash'}</span>
                  </p>
                </div>
                {status === 'created' && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium shrink-0">✅ Created</span>
                )}
                {status === 'skipped' && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium shrink-0">Skipped</span>
                )}
                {status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setStandaloneVoucherItem(pmt)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                    >
                      📄 Voucher
                    </button>
                    <button
                      onClick={() => setStandaloneVoucherStatuses(prev => ({ ...prev, [pmt.id]: 'skipped' }))}
                      className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-medium rounded transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )}
  </>
  )
}
