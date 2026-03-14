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
}

interface PendingPaymentRequest {
  id: string
  accountName: string
  accountNumber: string
  requestCount: number
  totalAmount?: number
  awaitingCashier?: boolean
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
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [batchingId, setBatchingId] = useState<string | null>(null)

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
        setTotal(json.total ?? 0)
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
      toast.error('Cannot create batch — no business linked to this account')
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
      fetchItems()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setApprovingId(null)
    }
  }

  return (
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
                  {pendingPettyCash.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 border border-orange-300 dark:border-orange-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-white">{item.purpose}</span>
                          <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 text-xs font-medium px-2 py-0.5 rounded">Pending</span>
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
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded transition-colors shrink-0"
                      >
                        Handle Request
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
                          {typeof item.totalAmount === 'number' && (
                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-semibold px-2 py-0.5 rounded ml-2">
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
                  {pendingPaymentRequests.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-white">{item.accountName}</span>
                          <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-xs font-medium px-2 py-0.5 rounded">{item.requestCount} pending</span>
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
                  ))}
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
  )
}
