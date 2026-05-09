'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { useToastContext } from '@/components/ui/toast'

type Tab = 'approved' | 'rejected'

interface ApprovedPayment {
  id: string
  amount: number
  notes: string | null
  categoryName: string | null
  businessName: string
  approvedAt: string | null
  payeeName: string | null
  payeePhone: string | null
}

interface RejectedPayment {
  id: string
  amount: number
  notes: string | null
  categoryName: string | null
  payeeName: string | null
  expenseAccountId: string
  expenseAccountName: string | null
  businessName: string | null
  rejectionReason: string | null
  rejectedByName: string | null
  rejectedAt: string | null
  paymentChannel: string
  priority: string
}

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export default function MyPaymentsPage() {
  const toast = useToastContext()
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialTab: Tab = searchParams.get('tab') === 'rejected' ? 'rejected' : 'approved'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  const [approvedPayments, setApprovedPayments] = useState<ApprovedPayment[]>([])
  const [rejectedPayments, setRejectedPayments] = useState<RejectedPayment[]>([])
  const [loadingApproved, setLoadingApproved] = useState(true)
  const [loadingRejected, setLoadingRejected] = useState(true)
  const [collecting, setCollecting] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const loadApproved = useCallback(async () => {
    setLoadingApproved(true)
    try {
      const res = await fetch('/api/admin/pending-actions', { credentials: 'include' })
      const data = await res.json()
      setApprovedPayments(data.myApprovedPayments ?? [])
    } finally {
      setLoadingApproved(false)
    }
  }, [])

  const loadRejected = useCallback(async () => {
    setLoadingRejected(true)
    try {
      const res = await fetch('/api/expense-account/my-requests', { credentials: 'include' })
      const data = await res.json()
      setRejectedPayments(data.data?.rejected ?? [])
    } finally {
      setLoadingRejected(false)
    }
  }, [])

  useEffect(() => { loadApproved(); loadRejected() }, [loadApproved, loadRejected])

  const switchTab = (tab: Tab) => {
    setActiveTab(tab)
    router.replace(`/expense-accounts/my-payments${tab === 'rejected' ? '?tab=rejected' : ''}`, { scroll: false })
  }

  const handleCollect = async (paymentId: string) => {
    setCollecting(paymentId)
    try {
      const res = await fetch('/api/expense-account-payments/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paymentId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed'); return }
      toast.push('Cash collected — payment marked complete', { type: 'success' })
      window.dispatchEvent(new CustomEvent('pending-actions:refresh'))
      loadApproved()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCollecting(null)
    }
  }

  const handleResubmit = async (paymentId: string) => {
    setActing(paymentId)
    try {
      const res = await fetch(`/api/expense-account/payments/${paymentId}/resubmit`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to resubmit'); return }
      toast.push('Payment resubmitted to the queue', { type: 'success' })
      loadRejected()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setActing(null)
    }
  }

  const handleCancel = async (paymentId: string) => {
    setActing(paymentId)
    try {
      const res = await fetch(`/api/expense-account/payments/${paymentId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to cancel'); return }
      toast.push('Payment cancelled', { type: 'success' })
      loadRejected()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setActing(null)
    }
  }

  return (
    <ContentLayout
      title="💵 My Payments"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'My Payments', isActive: true },
      ]}
    >
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => switchTab('approved')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'approved'
                ? 'border-green-500 text-green-700 dark:text-green-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            ✓ Approved
            {approvedPayments.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                {approvedPayments.length}
              </span>
            )}
          </button>
          <button
            onClick={() => switchTab('rejected')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'rejected'
                ? 'border-red-500 text-red-700 dark:text-red-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            ✗ Rejected
            {rejectedPayments.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                {rejectedPayments.length}
              </span>
            )}
          </button>
        </div>

        {/* Approved tab */}
        {activeTab === 'approved' && (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              These payments have been approved by the cashier. Collect the cash and tap <strong>Payment Made</strong> to mark each one complete.
            </p>
            {loadingApproved ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
              </div>
            ) : approvedPayments.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
                No approved payments waiting for collection.
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {approvedPayments.map(p => (
                  <div key={p.id} className="flex items-start gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-green-700 dark:text-green-400">{fmt(p.amount)}</span>
                        {p.categoryName && <span className="text-xs text-gray-500 dark:text-gray-400">{p.categoryName}</span>}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-medium">✓ Approved</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.businessName}</p>
                      {p.payeeName && (
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                          Hand to: {p.payeeName}{p.payeePhone ? ` · ${p.payeePhone}` : ''}
                        </p>
                      )}
                      {p.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.notes}</p>}
                      {p.approvedAt && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Approved {new Date(p.approvedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleCollect(p.id)}
                      disabled={collecting === p.id}
                      className="shrink-0 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                    >
                      {collecting === p.id ? 'Marking…' : 'Payment Made'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Rejected tab */}
        {activeTab === 'rejected' && (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              These payments were rejected by the cashier. You can edit and resubmit, resubmit as-is, or cancel each one.
            </p>
            {loadingRejected ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
              </div>
            ) : rejectedPayments.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
                No rejected payments. All clear!
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {rejectedPayments.map(p => {
                  const isActing = acting === p.id
                  return (
                    <div key={p.id} className="px-5 py-4 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-red-600 dark:text-red-400">{fmt(p.amount)}</span>
                            {p.priority === 'URGENT' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-bold uppercase">Urgent</span>
                            )}
                            {p.categoryName && <span className="text-xs text-gray-500 dark:text-gray-400">{p.categoryName}</span>}
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                              {p.paymentChannel === 'ECOCASH' ? '📱 EcoCash' : '💵 Cash'}
                            </span>
                          </div>
                          {p.expenseAccountName && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.expenseAccountName}{p.businessName ? ` — ${p.businessName}` : ''}</p>
                          )}
                          {p.payeeName && <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-0.5">{p.payeeName}</p>}
                          {p.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.notes}</p>}
                        </div>
                        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-medium">✗ Rejected</span>
                      </div>

                      {/* Rejection reason */}
                      {(p.rejectionReason || p.rejectedByName || p.rejectedAt) && (
                        <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2 text-xs space-y-0.5">
                          {p.rejectionReason && (
                            <p className="text-amber-800 dark:text-amber-300 font-medium">"{p.rejectionReason}"</p>
                          )}
                          <p className="text-amber-600 dark:text-amber-400">
                            {[
                              p.rejectedByName ? `Rejected by ${p.rejectedByName}` : null,
                              p.rejectedAt ? new Date(p.rejectedAt).toLocaleDateString() : null,
                            ].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 flex-wrap pt-1">
                        <button
                          onClick={() => router.push(`/expense-accounts/${p.expenseAccountId}/payments/${p.id}?resubmit=true`)}
                          disabled={isActing}
                          className="px-3 py-1.5 text-xs font-medium rounded border border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-50 transition-colors"
                        >
                          Edit & Resubmit
                        </button>
                        <button
                          onClick={() => handleResubmit(p.id)}
                          disabled={isActing}
                          className="px-3 py-1.5 text-xs font-medium rounded border border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 transition-colors"
                        >
                          {isActing ? '…' : 'Resubmit As-Is'}
                        </button>
                        <button
                          onClick={() => handleCancel(p.id)}
                          disabled={isActing}
                          className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                        >
                          {isActing ? '…' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </ContentLayout>
  )
}
