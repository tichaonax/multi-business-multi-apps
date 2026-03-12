'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useToastContext } from '@/components/ui/toast'
import { generatePaymentBatchVoucher } from '@/lib/pdf-utils'

function useCashBoxBalance(businessId: string) {
  const [balance, setBalance] = useState<number | null>(null)
  useEffect(() => {
    if (!businessId) return
    fetch(`/api/cash-allocation/${businessId}/summary`)
      .then(r => r.json())
      .then(j => setBalance(j.balance ?? null))
      .catch(() => setBalance(null))
  }, [businessId])
  return balance
}

interface BatchPayment {
  id: string
  status: string
  adHoc: boolean
  expenseAccountId: string
  expenseAccount: { id: string; accountName: string; accountNumber: string } | null
  payeeType: string
  payeeUser?: { name: string } | null
  payeeEmployee?: { fullName: string; phone?: string | null } | null
  payeePerson?: { fullName: string; phone?: string | null } | null
  payeeBusiness?: { name: string } | null
  payeeSupplier?: { name: string; phone?: string | null } | null
  category?: { name: string; emoji: string } | null
  subcategory?: { name: string } | null
  amount: number
  notes: string | null
  creator: { id: string; name: string } | null
  createdAt: string
}

interface Batch {
  id: string
  businessId: string
  business: { id: string; name: string; type: string }
  eodDate: string
  status: string
  approvedCount: number
  rejectedCount: number
  totalApproved: number | null
  reviewer: { name: string } | null
  reviewedAt: string | null
  businessAccountBalance: number | null
  payments: BatchPayment[]
}

function payeeName(p: BatchPayment): string {
  if (p.payeeUser) return p.payeeUser.name
  if (p.payeeEmployee) return p.payeeEmployee.fullName
  if (p.payeePerson) return p.payeePerson.fullName
  if (p.payeeBusiness) return p.payeeBusiness.name
  if (p.payeeSupplier) return p.payeeSupplier.name
  return 'General'
}

function payeePhone(p: BatchPayment): string | null {
  return p.payeeEmployee?.phone ?? p.payeePerson?.phone ?? p.payeeSupplier?.phone ?? null
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const PAYEE_TYPES = ['NONE', 'USER', 'EMPLOYEE', 'PERSON', 'BUSINESS', 'SUPPLIER']

export default function BatchReviewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const batchId = params.batchId as string
  const toast = useToastContext()

  const [batch, setBatch] = useState<Batch | null>(null)
  const [loading, setLoading] = useState(true)
  const [approved, setApproved] = useState<Set<string>>(new Set())
  const [rejected, setRejected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  // Ad-hoc form
  const [showAdHoc, setShowAdHoc] = useState(false)
  const [adHocForm, setAdHocForm] = useState({
    expenseAccountId: '', payeeType: 'NONE', amount: '', paymentDate: new Date().toISOString().split('T')[0], notes: '',
  })
  const [adHocAccounts, setAdHocAccounts] = useState<{ id: string; accountName: string }[]>([])
  const [addingAdHoc, setAddingAdHoc] = useState(false)

  const cashBoxBalance = useCashBoxBalance(batch?.business?.id ?? '')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/eod-payment-batches/${batchId}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Failed to load'); return }
      const b: Batch = json.data
      setBatch(b)
      // Default: no decisions made — cashier must explicitly approve or reject each one
      setApproved(new Set())
      setRejected(new Set())
      // Pre-fill ad-hoc account picker with first account
      if (b.payments.length > 0 && b.payments[0].expenseAccount) {
        setAdHocForm(f => ({ ...f, expenseAccountId: b.payments[0].expenseAccount!.id }))
      }
    } finally {
      setLoading(false)
    }
  }, [batchId, toast])

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/signin'); return }
    if (status === 'authenticated') load()
  }, [status, load, router])

  // Fetch expense accounts for ad-hoc form
  useEffect(() => {
    if (!batch) return
    fetch(`/api/expense-account?businessId=${batch.businessId}&isActive=true`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        const accts = (j.data ?? j.accounts ?? []).map((a: any) => ({ id: a.id, accountName: a.accountName }))
        setAdHocAccounts(accts)
        if (accts.length > 0 && !adHocForm.expenseAccountId) {
          setAdHocForm(f => ({ ...f, expenseAccountId: accts[0].id }))
        }
      })
      .catch(() => {})
  }, [batch])

  const pendingPayments = (batch?.payments ?? []).filter(p => p.status === 'PENDING_APPROVAL')
  const approvedPayments = pendingPayments.filter(p => approved.has(p.id))
  const rejectedPayments = pendingPayments.filter(p => rejected.has(p.id))
  const undecidedPayments = pendingPayments.filter(p => !approved.has(p.id) && !rejected.has(p.id))
  const totalApproved = approvedPayments.reduce((s, p) => s + p.amount, 0)
  const allDecided = undecidedPayments.length === 0 && pendingPayments.length > 0

  function setApprove(id: string) {
    setApproved(prev => new Set([...prev, id]))
    setRejected(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  function setReject(id: string) {
    setRejected(prev => new Set([...prev, id]))
    setApproved(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  async function handleSubmitReview() {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/eod-payment-batches/${batchId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          approvedPaymentIds: [...approved],
          rejectedPaymentIds: rejectedPayments.map(p => p.id),
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Failed to submit review'); return }

      toast.push(`${approvedPayments.length} approved, ${rejectedPayments.length} returned to queue`, { type: 'success' })

      load()
      // Refresh bell notification count across the app
      window.dispatchEvent(new CustomEvent('pending-actions:refresh'))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddAdHoc(e: React.FormEvent) {
    e.preventDefault()
    if (!adHocForm.expenseAccountId || !adHocForm.amount) return
    setAddingAdHoc(true)
    try {
      const res = await fetch(`/api/eod-payment-batches/${batchId}/add-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          expenseAccountId: adHocForm.expenseAccountId,
          payeeType: adHocForm.payeeType,
          amount: Number(adHocForm.amount),
          paymentDate: adHocForm.paymentDate,
          notes: adHocForm.notes || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Failed to add payment'); return }
      toast.push('Ad-hoc payment added', { type: 'success' })
      setAdHocForm(f => ({ ...f, amount: '', notes: '' }))
      setShowAdHoc(false)
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setAddingAdHoc(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }
  if (!batch) return null

  const isLocked = batch.status !== 'PENDING_REVIEW'

  return (
    <ContentLayout
      title={isLocked ? '✅ Batch Reviewed' : '🔍 Review Payment Batch'}
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Expense Accounts', href: '/expense-accounts' },
        { label: 'Payment Batches', href: '/expense-accounts/payment-batches' },
        { label: 'Review', isActive: true },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Batch meta */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Business</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{batch.business.name}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">EOD Date</p>
            <p className="font-mono font-medium text-gray-900 dark:text-gray-100">{batch.eodDate}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Payments in Batch</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{batch.payments.length}</p>
          </div>
          {batch.businessAccountBalance != null && (
            <div>
              <p className="text-gray-500 dark:text-gray-400">Business Balance</p>
              <p className={`font-medium ${batch.businessAccountBalance < totalApproved ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                {fmt(batch.businessAccountBalance)}
              </p>
            </div>
          )}
          {/* Total incoming request amount */}
          <div>
            <p className="text-gray-500 dark:text-gray-400">Total Requested</p>
            <p className="font-medium text-blue-600 dark:text-blue-400">
              {fmt(batch.payments.filter(p => p.status === 'PENDING_APPROVAL').reduce((s, p) => s + p.amount, 0))}
            </p>
          </div>
          {/* Business Cash Bucket Balance */}
          {batch.business?.id && (
            <div>
              <p className="text-gray-500 dark:text-gray-400">Cash Box Balance</p>
              <span className={`font-medium ${cashBoxBalance !== null && cashBoxBalance < batch.payments.filter(p => p.status === 'PENDING_APPROVAL').reduce((s, p) => s + p.amount, 0) ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {cashBoxBalance === null ? 'Loading…' : fmt(cashBoxBalance)}
              </span>
            </div>
          )}
          {/* Cash box balance after current selections */}
          {batch.business?.id && !isLocked && cashBoxBalance !== null && totalApproved > 0 && (
            <div>
              <p className="text-gray-500 dark:text-gray-400">Cash Box After Approval</p>
              <span className={`font-medium ${cashBoxBalance - totalApproved < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {fmt(cashBoxBalance - totalApproved)}
              </span>
            </div>
          )}
          {isLocked && batch.reviewer && (
            <>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Reviewed By</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{batch.reviewer.name}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Approved</p>
                <p className="font-medium text-green-700 dark:text-green-400">{batch.approvedCount} payments · {batch.totalApproved != null ? fmt(batch.totalApproved) : '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Returned to Queue</p>
                <p className="font-medium text-amber-700 dark:text-amber-400">{batch.rejectedCount} payments</p>
              </div>
            </>
          )}
        </div>

        {/* Insufficient balance warning */}
        {!isLocked && batch.businessAccountBalance != null && batch.businessAccountBalance < totalApproved && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
            ⚠️ Business account balance ({fmt(batch.businessAccountBalance)}) is insufficient for the selected approvals ({fmt(totalApproved)}). Uncheck some items.
          </div>
        )}

        {/* Payments table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">
              {isLocked ? 'Payments in Batch' : 'Select Payments to Approve'}
            </h2>
            {!isLocked && (
              <button
                onClick={() => setShowAdHoc(s => !s)}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700"
              >
                + Add Payment
              </button>
            )}
          </div>

          {/* Ad-hoc add form */}
          {showAdHoc && !isLocked && (
            <form onSubmit={handleAddAdHoc} className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/10 space-y-3">
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase">Ad-hoc Payment</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Account</label>
                  <select
                    value={adHocForm.expenseAccountId}
                    onChange={e => setAdHocForm(f => ({ ...f, expenseAccountId: e.target.value }))}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 dark:text-gray-100"
                    required
                  >
                    {adHocAccounts.map(a => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Payee Type</label>
                  <select
                    value={adHocForm.payeeType}
                    onChange={e => setAdHocForm(f => ({ ...f, payeeType: e.target.value }))}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 dark:text-gray-100"
                  >
                    {PAYEE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Amount</label>
                  <input
                    type="number" min="0.01" step="0.01" required
                    value={adHocForm.amount}
                    onChange={e => setAdHocForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 dark:text-gray-100"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Date</label>
                  <input
                    type="date" required
                    value={adHocForm.paymentDate}
                    onChange={e => setAdHocForm(f => ({ ...f, paymentDate: e.target.value }))}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Notes</label>
                <input
                  type="text"
                  value={adHocForm.notes}
                  onChange={e => setAdHocForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Purpose / description"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={addingAdHoc} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 disabled:opacity-50">
                  {addingAdHoc ? 'Adding…' : 'Add to Batch'}
                </button>
                <button type="button" onClick={() => setShowAdHoc(false)} className="px-4 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Payment rows */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {batch.payments.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">No payments in this batch.</p>
            ) : (
              batch.payments.map(p => {
                const isApprovedDecision = approved.has(p.id)
                const isRejectedDecision = rejected.has(p.id)
                const isUndecided = !isApprovedDecision && !isRejectedDecision && p.status === 'PENDING_APPROVAL'
                const pName = payeeName(p)
                const catLabel = p.category ? `${p.category.emoji ?? ''} ${p.category.name}`.trim() : ''

                return (
                  <div key={p.id} className={`flex items-start gap-3 px-5 py-3 ${
                    isApprovedDecision ? 'bg-green-50/50 dark:bg-green-900/10' :
                    isRejectedDecision ? 'bg-red-50/50 dark:bg-red-900/10 opacity-60' : ''
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{pName}</span>
                        {p.adHoc && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold">Ad-hoc</span>
                        )}
                        {catLabel && <span className="text-xs text-gray-500 dark:text-gray-400">{catLabel}</span>}
                        {p.expenseAccount && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">{p.expenseAccount.accountName}</span>
                        )}
                        {isLocked && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                            p.status === 'APPROVED' || p.status === 'SUBMITTED'
                              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                              : p.status === 'QUEUED'
                              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                          }`}>
                            {p.status === 'QUEUED' ? 'Returned to Queue' : p.status}
                          </span>
                        )}
                      </div>
                      {p.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.notes}</p>}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Requested by {p.creator?.name ?? '—'}
                        {payeePhone(p) && <span className="ml-2 text-gray-500 dark:text-gray-400 font-medium">{payeePhone(p)}</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-sm font-semibold tabular-nums ${isRejectedDecision ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                        {fmt(p.amount)}
                      </span>
                      {!isLocked && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => setApprove(p.id)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors ${
                              isApprovedDecision
                                ? 'bg-green-600 text-white border-green-600'
                                : 'border-green-400 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                            }`}
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => setReject(p.id)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors ${
                              isRejectedDecision
                                ? 'bg-red-500 text-white border-red-500'
                                : 'border-red-300 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                            }`}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer totals + submit */}
          {!isLocked && pendingPayments.length > 0 && (
            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {undecidedPayments.length > 0
                    ? <span className="text-amber-600 dark:text-amber-400">⚠ {undecidedPayments.length} payment(s) still need a decision</span>
                    : <span>{approvedPayments.length} approved · {rejectedPayments.length} returned to queue</span>
                  }
                </span>
                <span className="font-bold text-gray-900 dark:text-gray-100 text-base tabular-nums">{fmt(totalApproved)}</span>
              </div>
              {rejectedPayments.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {rejectedPayments.length} payment(s) will be returned to the queue for the next EOD cycle.
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const ids = new Set(pendingPayments.map(p => p.id))
                    setApproved(prev => {
                      const all = pendingPayments.every(p => prev.has(p.id))
                      return all ? new Set() : ids
                    })
                  }}
                  className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Toggle All
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={submitting || !allDecided || approvedPayments.length === 0 || (batch.businessAccountBalance != null && batch.businessAccountBalance < totalApproved)}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'Processing…' : `🖨 Process & Print Report — ${fmt(totalApproved)}`}
                </button>
              </div>
            </div>
          )}

          {isLocked && (
            <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
              <button
                onClick={() => batch.totalApproved != null && generatePaymentBatchVoucher({
                  batchId: batch.id,
                  businessName: batch.business.name,
                  cashierName: batch.reviewer?.name ?? '—',
                  reviewedAt: batch.reviewedAt ?? new Date().toISOString(),
                  totalApproved: batch.totalApproved,
                  approvedCount: batch.approvedCount,
                  rejectedCount: batch.rejectedCount,
                  payments: batch.payments.filter(p => p.status === 'APPROVED' || p.status === 'SUBMITTED').map(p => ({
                    payeeName: payeeName(p),
                    payeePhone: payeePhone(p),
                    categoryName: p.category ? `${p.category.emoji ?? ''} ${p.category.name}`.trim() : '—',
                    expenseAccount: p.expenseAccount?.accountName ?? '—',
                    amount: p.amount,
                    notes: p.notes,
                    requestedBy: p.creator?.name ?? '—',
                    adHoc: p.adHoc,
                  })),
                }, 'print')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                🖨️ Print Voucher
              </button>
              <button
                onClick={() => batch.totalApproved != null && generatePaymentBatchVoucher({
                  batchId: batch.id,
                  businessName: batch.business.name,
                  cashierName: batch.reviewer?.name ?? '—',
                  reviewedAt: batch.reviewedAt ?? new Date().toISOString(),
                  totalApproved: batch.totalApproved,
                  approvedCount: batch.approvedCount,
                  rejectedCount: batch.rejectedCount,
                  payments: batch.payments.filter(p => p.status === 'APPROVED' || p.status === 'SUBMITTED').map(p => ({
                    payeeName: payeeName(p),
                    payeePhone: payeePhone(p),
                    categoryName: p.category ? `${p.category.emoji ?? ''} ${p.category.name}`.trim() : '—',
                    expenseAccount: p.expenseAccount?.accountName ?? '—',
                    amount: p.amount,
                    notes: p.notes,
                    requestedBy: p.creator?.name ?? '—',
                    adHoc: p.adHoc,
                  })),
                }, 'save')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                📄 Save PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </ContentLayout>
  )
}
