'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { AccountBalanceCard } from '@/components/expense-account/account-balance-card'
import { DepositForm } from '@/components/expense-account/deposit-form'
import { PaymentForm } from '@/components/expense-account/payment-form'
import { TransactionHistory } from '@/components/expense-account/transaction-history'
import { QuickPaymentModal } from '@/components/expense-account/quick-payment-modal'
import { QuickDepositModal } from '@/components/expense-account/quick-deposit-modal'
import { AccountPermissionsTab } from '@/components/expense-account/account-permissions-tab'
import { LoansTab } from '@/components/expense-account/loans-tab'
import { ReturnTransferModal } from '@/components/expense-account/return-transfer-modal'
import { LendMoneyModal } from '@/components/expense-account/lend-money-modal'
import { FundPayrollModal } from '@/components/expense-account/fund-payroll-modal'
import { OutgoingLoansPanel } from '@/components/expense-account/outgoing-loans-panel'
import SmartQuickPaymentModal from '@/components/expense-account/smart-quick-payment-modal'
import VehicleExpenseModal from '@/components/expense-account/vehicle-expense-modal'
import { AutoDepositAdminPanel } from '@/components/expense-account/auto-deposit-admin-panel'
import { PaymentBatchModal } from '@/components/expense-account/payment-batch-modal'
import { useConfirm, useAlert } from '@/components/ui/confirm-modal'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'

interface ExpenseAccount {
  id: string
  accountNumber: string
  accountName: string
  description: string | null
  balance: number
  lowBalanceThreshold: number
  isActive: boolean
  isLoanAccount: boolean
  createdAt: string
  businessId: string | null
  accountType: string
  // Sibling account fields
  parentAccountId: string | null
  siblingNumber: number | null
  isSibling: boolean
  canMerge: boolean
  // Landlord info for RENT accounts
  landlordSupplierId?: string | null
  landlordSupplierName?: string | null
  monthlyRentAmount?: number | null
}

// ─── Recent Deposits Panel ──────────────────────────────────────────────────
interface RecentDeposit {
  id: string
  amount: number
  date: string
  description: string
  sourceType: string
  sourceBusiness?: { name: string } | null
}

function RecentDepositsPanel({ accountId, refreshKey }: { accountId: string; refreshKey: number }) {
  const [deposits, setDeposits] = useState<RecentDeposit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/expense-account/${accountId}/transactions?transactionType=DEPOSIT&limit=5&sortOrder=desc`)
      .then(r => r.json())
      .then(data => {
        if (data?.data?.transactions) setDeposits(data.data.transactions)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accountId, refreshKey])

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  const sourceLabel = (d: RecentDeposit) => {
    if (d.sourceType === 'BUSINESS') return d.sourceBusiness?.name ?? 'Business'
    if (d.sourceType === 'MANUAL') return 'Manual'
    if (d.sourceType === 'LOAN') return 'Loan'
    if (d.sourceType === 'WIFI_TOKEN_SALE') return 'WiFi Sale'
    return d.sourceType.charAt(0) + d.sourceType.slice(1).toLowerCase()
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-border">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Recent Deposits</span>
        {loading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
      </div>
      {!loading && deposits.length === 0 ? (
        <p className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">No deposits yet</p>
      ) : (
        <div className="divide-y divide-border">
          {deposits.map(d => (
            <div key={d.id} className="flex items-center gap-2 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary truncate">{sourceLabel(d)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{d.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400">+{fmt(d.amount)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{fmtDate(d.date)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
// ────────────────────────────────────────────────────────────────────────────

// ─── Recent Payments Panel ──────────────────────────────────────────────────
interface RecentPayment {
  id: string
  amount: number
  paymentDate: string
  createdAt: string
  payeeType: string
  payeeUser?: { name: string } | null
  payeeEmployee?: { fullName: string } | null
  payeePerson?: { fullName: string } | null
  payeeBusiness?: { name: string } | null
  payeeSupplier?: { name: string } | null
  category?: { name: string; emoji: string } | null
  receiptNumber?: string | null
  status: string
  paymentType?: string | null
}

function RecentPaymentsPanel({ accountId, refreshKey }: { accountId: string; refreshKey: number }) {
  const [payments, setPayments] = useState<RecentPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/expense-account/${accountId}/payments?sortBy=createdAt&limit=5`)
      .then(r => r.json())
      .then(data => {
        if (data?.data?.payments) setPayments(data.data.payments)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accountId, refreshKey])

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  const payeeName = (p: RecentPayment): string => {
    if (p.paymentType === 'PETTY_CASH_RETURN') return 'Petty Cash Return'
    if (p.payeeType === 'NONE') return 'General'
    if (p.payeeUser) return p.payeeUser.name
    if (p.payeeEmployee) return p.payeeEmployee.fullName
    if (p.payeePerson) return p.payeePerson.fullName
    if (p.payeeBusiness) return p.payeeBusiness.name
    if (p.payeeSupplier) return p.payeeSupplier.name
    return 'Unknown'
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-border">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Recently Entered</span>
        {loading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
      </div>
      {!loading && payments.length === 0 ? (
        <p className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">No payments yet</p>
      ) : (
        <div className="divide-y divide-border">
          {payments.map(p => (
            <div key={p.id} className="flex items-center gap-2 px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  {p.category?.emoji && <span className="text-xs shrink-0">{p.category.emoji}</span>}
                  <p className="text-xs font-medium text-primary truncate">{payeeName(p)}</p>
                  {p.status === 'DRAFT' && (
                    <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">DRAFT</span>
                  )}
                  {(p.status === 'REQUEST' || p.status === 'QUEUED') && (
                    <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium">IN QUEUE</span>
                  )}
                  {p.status === 'APPROVED' && (
                    <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">APPROVED</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  {p.paymentType === 'PETTY_CASH_RETURN'
                    ? 'Unused cash returned'
                    : (p.category?.name ?? 'No category')}
                  {p.receiptNumber ? ` · #${p.receiptNumber}` : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">−{fmt(p.amount)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500" title={`Payment date: ${fmtDate(p.paymentDate)}`}>
                  entered {fmtDate(p.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
// ────────────────────────────────────────────────────────────────────────────

// ─── My Payment Queue Panel ─────────────────────────────────────────────────
interface QueuedPayment {
  id: string
  amount: number
  paymentDate: string
  description?: string | null
  status: string
  payeeUser?: { name: string } | null
  payeeEmployee?: { fullName: string } | null
  payeePerson?: { fullName: string } | null
  payeeBusiness?: { name: string } | null
  payeeSupplier?: { name: string } | null
  payeeType: string
  category?: { name: string; emoji: string } | null
  paymentChannel?: string
}

function MyQueuePanel({
  accountId,
  refreshKey,
  onActionDone,
}: {
  accountId: string
  refreshKey: number
  onActionDone: () => void
}) {
  const confirm = useConfirm()
  const alert = useAlert()
  const [queued, setQueued] = useState<QueuedPayment[]>([])
  const [pendingApproval, setPendingApproval] = useState<QueuedPayment[]>([])
  const [approved, setApproved] = useState<QueuedPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const pendingApprovalRef = useRef<QueuedPayment[]>([])
  const [ecocashModal, setEcocashModal] = useState<{ paymentId: string; amount: number } | null>(null)
  const [ecocashTxCode, setEcocashTxCode] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [ecocashSubmitting, setEcocashSubmitting] = useState(false)
  const ecocashSubmittingRef = useRef(false)

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const [q, pa, a] = await Promise.all([
      fetch(`/api/expense-account/${accountId}/payment-requests`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null).then(d => d?.data ?? []),
      fetch(`/api/expense-account/${accountId}/payments?status=PENDING_APPROVAL&sortBy=createdAt&limit=20`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null).then(d => d?.data?.payments ?? []),
      fetch(`/api/expense-account/${accountId}/payments?status=APPROVED&sortBy=createdAt&limit=20`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null).then(d => d?.data?.payments ?? []),
    ])
    setQueued(q)
    setPendingApproval(pa)
    pendingApprovalRef.current = pa
    setApproved(a)
    if (!silent) setLoading(false)
  }, [accountId])

  // Initial load
  useEffect(() => { fetchAll() }, [fetchAll, refreshKey])

  // Auto-poll every 10s while any payments are PENDING_APPROVAL (cashier reviewing)
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingApprovalRef.current.length > 0) {
        fetchAll(true)
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

  const payeeName = (p: QueuedPayment): string => {
    if (p.payeeType === 'NONE') return 'General'
    if (p.payeeUser) return p.payeeUser.name
    if (p.payeeEmployee) return p.payeeEmployee.fullName
    if (p.payeePerson) return p.payeePerson.fullName
    if (p.payeeBusiness) return p.payeeBusiness.name
    if (p.payeeSupplier) return p.payeeSupplier.name
    return 'Unknown'
  }

  const handleCancel = async (paymentId: string) => {
    const ok = await confirm({ title: 'Cancel Payment', description: 'Cancel this payment request?', confirmText: 'Yes, Cancel', cancelText: 'Keep' })
    if (!ok) return
    setActionId(paymentId)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/payments/${paymentId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        setQueued(prev => prev.filter(p => p.id !== paymentId))
        onActionDone()
      } else {
        const d = await res.json()
        await alert({ title: 'Error', description: d.error ?? 'Failed to cancel payment' })
      }
    } finally {
      setActionId(null)
    }
  }

  const startEdit = (p: QueuedPayment) => {
    setEditingId(p.id)
    setEditAmount(String(p.amount))
    setEditNotes(p.description ?? '')
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    const amt = parseFloat(editAmount)
    if (isNaN(amt) || amt <= 0) {
      await alert({ title: 'Invalid amount', description: 'Enter a valid amount greater than 0.' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/payments/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: amt, notes: editNotes.trim() || null }),
      })
      if (res.ok) {
        setQueued(prev => prev.map(p => p.id === editingId ? { ...p, amount: amt, description: editNotes.trim() || null } : p))
        setEditingId(null)
        onActionDone()
      } else {
        const d = await res.json()
        await alert({ title: 'Error', description: d.error ?? 'Failed to update payment' })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleMarkPaid = async (paymentId: string) => {
    const ok = await confirm({ title: 'Mark as Paid', description: 'Confirm physical handover and mark this payment as submitted?', confirmText: 'Yes, Mark as Paid' })
    if (!ok) return
    setActionId(paymentId)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/payments/${paymentId}/submit`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        setApproved(prev => prev.filter(p => p.id !== paymentId))
        onActionDone()
      } else {
        const d = await res.json()
        await alert({ title: 'Error', description: d.error ?? 'Failed to mark payment as paid' })
      }
    } finally {
      setActionId(null)
    }
  }

  const handleMarkSentEcocash = async () => {
    if (!ecocashModal) return
    if (!ecocashTxCode.trim()) return
    if (ecocashSubmittingRef.current) return
    ecocashSubmittingRef.current = true
    setEcocashSubmitting(true)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/payments/${ecocashModal.paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'markPaid', ecocashTransactionCode: ecocashTxCode.trim() }),
      })
      if (res.ok) {
        setApproved(prev => prev.filter(p => p.id !== ecocashModal.paymentId))
        setEcocashModal(null)
        setEcocashTxCode('')
        onActionDone()
      } else {
        const d = await res.json()
        await alert({ title: 'Error', description: d.error ?? 'Failed to mark EcoCash payment as sent' })
      }
    } finally {
      ecocashSubmittingRef.current = false
      setEcocashSubmitting(false)
    }
  }

  if (loading) return null
  if (queued.length === 0 && pendingApproval.length === 0 && approved.length === 0) return null

  return (
    <>
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-border">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">My Payment Queue</span>
      </div>
      <div className="divide-y divide-border">
        {pendingApproval.map(p => (
          <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-blue-50/50 dark:bg-blue-900/10">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {p.category?.emoji && <span className="text-xs shrink-0">{p.category.emoji}</span>}
                <p className="text-xs font-medium text-primary truncate">{payeeName(p)}</p>
                <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">AWAITING CASHIER</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{p.category?.name ?? 'No category'}</p>
            </div>
            <div className="shrink-0">
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">−{fmt(p.amount)}</span>
            </div>
          </div>
        ))}
        {approved.map(p => (
          <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-green-50/50 dark:bg-green-900/10">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {p.category?.emoji && <span className="text-xs shrink-0">{p.category.emoji}</span>}
                <p className="text-xs font-medium text-primary truncate">{payeeName(p)}</p>
                <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">APPROVED</span>
                {p.paymentChannel === 'ECOCASH' && (
                  <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-medium">📱 ECOCASH</span>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{p.category?.name ?? 'No category'}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">−{fmt(p.amount)}</span>
              {p.paymentChannel === 'ECOCASH' ? (
                <button
                  onClick={() => { setEcocashModal({ paymentId: p.id, amount: p.amount }); setEcocashTxCode('') }}
                  disabled={actionId === p.id}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
                >
                  📱 Mark as Sent
                </button>
              ) : (
                <button
                  onClick={() => handleMarkPaid(p.id)}
                  disabled={actionId === p.id}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {actionId === p.id ? '…' : '✓ Mark as Paid'}
                </button>
              )}
            </div>
          </div>
        ))}
        {queued.map(p => (
          <div key={p.id} className="px-3 py-2">
            {editingId === p.id ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  {p.category?.emoji && <span className="text-xs shrink-0">{p.category.emoji}</span>}
                  <p className="text-xs font-medium text-primary truncate">{payeeName(p)}</p>
                  <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">IN QUEUE</span>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editAmount}
                      onChange={e => setEditAmount(e.target.value)}
                      className="pl-5 pr-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? '…' : '✓ Save'}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    disabled={saving}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-500 rounded hover:bg-gray-200 dark:hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {p.category?.emoji && <span className="text-xs shrink-0">{p.category.emoji}</span>}
                    <p className="text-xs font-medium text-primary truncate">{payeeName(p)}</p>
                    <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">IN QUEUE</span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{p.category?.name ?? 'No category'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">−{fmt(p.amount)}</span>
                  <button
                    onClick={() => startEdit(p)}
                    disabled={!!actionId}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50"
                  >
                    ✎ Edit
                  </button>
                  <button
                    onClick={() => handleCancel(p.id)}
                    disabled={actionId === p.id}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                  >
                    {actionId === p.id ? '…' : '✕ Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>

    {/* EcoCash txCode modal */}
    {ecocashModal && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-5 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">📱 Mark EcoCash as Sent</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Amount: {fmt(ecocashModal.amount)}</p>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">EcoCash Transaction Code</label>
          <input
            type="text"
            value={ecocashTxCode}
            onChange={(e) => setEcocashTxCode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-teal-500 mb-4"
            placeholder="e.g. ECD1234567"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setEcocashModal(null); setEcocashTxCode('') }}
              disabled={ecocashSubmitting}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleMarkSentEcocash}
              disabled={!ecocashTxCode.trim() || ecocashSubmitting}
              className="px-3 py-1.5 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {ecocashSubmitting ? 'Sending…' : 'Confirm Sent'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
// ────────────────────────────────────────────────────────────────────────────

export default function ExpenseAccountDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const accountId = params.accountId as string
  const searchParams = useSearchParams()
  const urlTab       = searchParams.get('tab')       ?? ''
  const urlStartDate = searchParams.get('startDate') ?? ''
  const urlEndDate   = searchParams.get('endDate')   ?? ''
  const urlType      = searchParams.get('type')      ?? ''  // 'PAYMENT' | 'DEPOSIT' | ''

  const [account, setAccount] = useState<ExpenseAccount | null>(null)
  const [depositsCount, setDepositsCount] = useState<number | null>(null)
  const [paymentsCount, setPaymentsCount] = useState<number | null>(null)
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState<number>(0)
  const [countsError, setCountsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(urlTab || 'overview')
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showQuickPaymentModal, setShowQuickPaymentModal] = useState(false)
  const [showReturnTransferModal, setShowReturnTransferModal] = useState(false)
  const [showLendMoneyModal, setShowLendMoneyModal] = useState(false)
  const [showFundPayrollModal, setShowFundPayrollModal] = useState(false)
  const [showSmartQuickPayModal, setShowSmartQuickPayModal] = useState(false)
  const [showVehicleExpenseModal, setShowVehicleExpenseModal] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [loansRefreshKey, setLoansRefreshKey] = useState(0)
  const [batchRefreshKey, setBatchRefreshKey] = useState(0)
  const [depositRefreshKey, setDepositRefreshKey] = useState(0)
  const [paymentRefreshKey, setPaymentRefreshKey] = useState(0)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [pendingBatchCount, setPendingBatchCount] = useState(0)
  const [pendingBatchCountOthers, setPendingBatchCountOthers] = useState(0)
  const [rentPaymentSubmitting, setRentPaymentSubmitting] = useState(false)
  const [rentPaidThisMonth, setRentPaidThisMonth] = useState(false)

  // Permissions from business context (properly fetched from API)
  const { hasPermission, loading: permissionsLoading, isSystemAdmin, isBusinessOwner, currentBusiness, businesses } = useBusinessPermissionsContext()
  const canAccessExpenseAccount = hasPermission('canAccessExpenseAccount')
  const canMakeExpenseDeposits = hasPermission('canMakeExpenseDeposits')
  const canMakeExpensePayments = hasPermission('canMakeExpensePayments')
  const canViewExpenseReports = hasPermission('canViewExpenseReports')
  const canManageLending = isSystemAdmin || hasPermission('canManageLending')
  const canChangeCategory = isSystemAdmin || isBusinessOwner || currentBusiness?.role === 'business-manager'
  const canViewSupplierPaymentQueue = hasPermission('canViewSupplierPaymentQueue')
  const canSubmitPaymentBatch = isSystemAdmin || hasPermission('canSubmitPaymentBatch')
  const canCreatePayees = canChangeCategory // Only owners, managers, and admins can create payees
  const canEditPayments = canChangeCategory // Same set of roles can edit payments

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (!permissionsLoading && !canAccessExpenseAccount) {
      router.push('/dashboard')
    }
  }, [permissionsLoading, canAccessExpenseAccount, router])

  useEffect(() => {
    if (session?.user && accountId) {
      loadAccount()
      fetchCounts()
    }
  }, [session, accountId])

  // Re-check rent payment status when the user returns to this tab (e.g. after cancelling from another page)
  useEffect(() => {
    if (!accountId) return
    const handleVisibility = () => {
      if (!document.hidden && session?.user) {
        loadAccount()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [accountId, session])

  const loadAccount = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/expense-account/${accountId}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        const acct = data.data.account
        setAccount(acct)
        // Check if a rent payment was already made this month (for RENT accounts)
        if (acct?.accountType === 'RENT') {
          const now = new Date()
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
          const paymentsRes = await fetch(
            `/api/expense-account/${accountId}/payment-requests?startDate=${monthStart}&limit=1`,
            { credentials: 'include' }
          )
          if (paymentsRes.ok) {
            const pd = await paymentsRes.json()
            setRentPaidThisMonth((pd.data?.length ?? pd.data?.items?.length ?? 0) > 0)
          }
        }
      } else {
        router.push('/expense-accounts')
      }
    } catch (error) {
      console.error('Error loading account:', error)
      router.push('/expense-accounts')
    } finally {
      setLoading(false)
    }
  }

  const fetchCounts = async () => {
    try {
      const res = await fetch(`/api/expense-account/${accountId}/balance`, { credentials: 'include' })
      if (!res.ok) {
        // Set friendly error for UI and log status so it is obvious why counts are hidden
        if (res.status === 401 || res.status === 403) setCountsError('unauthorized')
        else setCountsError('unavailable')
        console.warn(`Failed to fetch balance counts: ${res.status}`)
        return
      }
      const data = await res.json()
      setDepositsCount(data?.data?.depositCount ?? 0)
      setPaymentsCount(data?.data?.paymentCount ?? 0)
      setPendingPaymentsCount(data?.data?.pendingPayments ?? 0)
      setCountsError(null)
    } catch (err) {
      console.error('Error fetching counts', err)
      setCountsError('error')
    }
  }

  // Fetch pending supplier payment requests for this account's business
  useEffect(() => {
    if (!account?.businessId || !canViewSupplierPaymentQueue) return
    fetch(`/api/supplier-payments/requests?businessId=${account.businessId}&status=PENDING&limit=1`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { setPendingRequestsCount(data?.pagination?.total ?? 0) })
      .catch(() => {})
  }, [account?.businessId, canViewSupplierPaymentQueue])

  // Fetch pending REQUEST payments count for cashier batch button
  useEffect(() => {
    if (!accountId || !canSubmitPaymentBatch) return
    fetch(`/api/expense-account/${accountId}/payment-requests`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const payments: any[] = data?.data ?? []
        setPendingBatchCount(payments.length)
        const currentUserId = (session?.user as any)?.id
        const othersCount = currentUserId
          ? payments.filter((p: any) => p.createdBy?.id !== currentUserId).length
          : payments.length
        setPendingBatchCountOthers(othersCount)
      })
      .catch(() => {})
  }, [accountId, canSubmitPaymentBatch, paymentRefreshKey, batchRefreshKey, session])

  const refreshBalanceSilent = async () => {
    try {
      const res = await fetch(`/api/expense-account/${accountId}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setAccount(data.data.account)
      }
    } catch {}
  }

  const handleRefresh = () => {
    loadAccount()
  }

  // One-click rent payment request — always for the full configured monthly rent
  const handleRentPaymentRequest = async () => {
    if (!account || rentPaymentSubmitting) return
    const monthlyRent = account.monthlyRentAmount
    if (!monthlyRent || monthlyRent <= 0) return
    setRentPaymentSubmitting(true)
    try {
      const body: any = {
        amount: monthlyRent,
        paymentType: 'RENT_PAYMENT',
        payeeType: account.landlordSupplierId ? 'SUPPLIER' : 'NONE',
        ...(account.landlordSupplierId && { payeeSupplierId: account.landlordSupplierId }),
        notes: `Rent payment — ${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}`,
      }
      const res = await fetch(`/api/expense-account/${accountId}/payments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        await alert({ title: 'Error', description: json.error ?? 'Failed to submit rent payment request' })
        return
      }
      setRentPaidThisMonth(true)
      await loadAccount()
      setPaymentRefreshKey(k => k + 1)
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message ?? 'Failed to submit rent payment request' })
    } finally {
      setRentPaymentSubmitting(false)
    }
  }

  const handleDepositSuccess = () => {
    loadAccount()
    setShowDepositModal(false)
    setDepositRefreshKey(k => k + 1)
  }

  const handlePaymentSuccess = () => {
    loadAccount()
    fetchCounts()
    setPaymentRefreshKey(k => k + 1)
  }

  if (status === 'loading' || loading || permissionsLoading) {
    return (
      <ContentLayout title="Expense Account">
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">Loading...</div>
        </div>
      </ContentLayout>
    )
  }

  if (!account) {
    return (
      <ContentLayout title="Expense Account">
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">Account not found</div>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title={account.accountName}
      description={`Account #${account.accountNumber}`}
      headerActions={(
        <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm">
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-secondary">Deposits</span>
            {depositsCount !== null ? (
                  canMakeExpenseDeposits ? (
                    <a
                      href={`/expense-accounts/${accountId}/deposits`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-green-600 dark:text-green-400 font-semibold hover:underline"
                      aria-label={`Open deposits for ${account.accountName}`}
                    >
                      {depositsCount}
                    </a>
                  ) : (
                  <span className="text-green-600 font-semibold">{depositsCount}</span>
                )
              ) : (
                <span title={countsError ? `Counts not available (${countsError})` : 'Counts not loaded'} className="text-green-600 font-semibold">—</span>
              )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-secondary">Payments</span>
            <span title={countsError ? `Counts not available (${countsError})` : ''} className="text-orange-600 font-semibold">{paymentsCount ?? '—'}</span>
          </div>
        </div>
      )}
    >
      <div className="space-y-2">
        {/* Compact header: back link · badge · description · actions */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {/* Back link */}
          <Link
            href="/expense-accounts"
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-0.5 shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Accounts
          </Link>

          <span className="text-gray-300 dark:text-gray-600 text-xs">/</span>

          {/* Account type badge */}
          {account.accountType === 'PERSONAL' ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 shrink-0">
              PERSONAL
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 shrink-0">
              GENERAL
            </span>
          )}

          {/* Description (if any) */}
          {account.description && (
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{account.description}</span>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action buttons — compact */}
          {/* RENT accounts only show Deposit, Payment and Reports — Daily/Vehicle are not applicable */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {canMakeExpenseDeposits && (
              <button
                onClick={() => setShowDepositModal(true)}
                className="px-2.5 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
              >
                + Deposit
              </button>
            )}
            {canMakeExpensePayments && account?.accountType === 'RENT' ? (
              // Rent accounts: one-click request for the full accumulated balance
              rentPaidThisMonth ? (
                <span className="px-2.5 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  ✓ Rent requested this month
                </span>
              ) : (
                <button
                  onClick={handleRentPaymentRequest}
                  disabled={rentPaymentSubmitting || !account || !account.monthlyRentAmount || account.monthlyRentAmount <= 0}
                  title={`Request full monthly rent ($${account?.monthlyRentAmount?.toFixed(2) ?? '…'})`}
                  className="px-2.5 py-1 bg-orange-600 text-white rounded text-xs font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rentPaymentSubmitting ? 'Requesting…' : `🏠 Request Rent $${account?.monthlyRentAmount?.toFixed(2) ?? '…'}`}
                </button>
              )
            ) : canMakeExpensePayments ? (
              <button
                onClick={() => setShowQuickPaymentModal(true)}
                className="px-2.5 py-1 bg-orange-600 text-white rounded text-xs font-medium hover:bg-orange-700"
              >
                + Payment
              </button>
            ) : null}
            {canMakeExpensePayments && account.accountType !== 'RENT' && (
              <button
                onClick={() => setShowSmartQuickPayModal(true)}
                className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
              >
                ⚡ Daily
              </button>
            )}
            {canMakeExpensePayments && account.accountType !== 'RENT' && (
              <button
                onClick={() => setShowVehicleExpenseModal(true)}
                className="px-2.5 py-1 bg-slate-600 text-white rounded text-xs font-medium hover:bg-slate-700"
              >
                🚗 Vehicle
              </button>
            )}
            {canSubmitPaymentBatch && (
              <button
                onClick={() => setShowBatchModal(true)}
                disabled={pendingBatchCountOthers === 0}
                title={pendingBatchCount > 0 && pendingBatchCountOthers === 0 ? 'All queued payments are your own requests — a different user must submit the batch' : undefined}
                className="relative px-2.5 py-1 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Batch
                {pendingBatchCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {pendingBatchCount > 9 ? '9+' : pendingBatchCount}
                  </span>
                )}
              </button>
            )}
            {canViewExpenseReports && (
              <Link
                href={`/expense-accounts/${accountId}/reports`}
                className="px-2.5 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700"
              >
                Reports
              </Link>
            )}
          </div>
        </div>

        {/* Balance Card */}
        <AccountBalanceCard
          accountData={account}
          onRefresh={handleRefresh}
          canViewExpenseReports={canViewExpenseReports}
          canEditThreshold={canChangeCategory}
        />


        {/* Pending supplier payment requests notice */}
        {canViewSupplierPaymentQueue && pendingRequestsCount > 0 && (
          <Link
            href={`/supplier-payments?businessId=${account.businessId}`}
            className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          >
            <span className="text-lg">📋</span>
            <span className="flex-1 font-medium text-amber-800 dark:text-amber-200">
              {pendingRequestsCount} pending supplier payment {pendingRequestsCount === 1 ? 'request' : 'requests'} awaiting approval
            </span>
            <span className="text-amber-600 dark:text-amber-400 text-xs font-semibold shrink-0">Review →</span>
          </Link>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <nav className="flex -mb-px min-w-0">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                Overview
              </button>

              {canMakeExpenseDeposits && (
                <button
                  onClick={() => setActiveTab('deposits')}
                  className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'deposits'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Deposits
                </button>
              )}

              {canMakeExpensePayments && (
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
                    activeTab === 'payments'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Payments
                  {pendingPaymentsCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                      {pendingPaymentsCount}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'transactions'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                Transactions
              </button>

              <button
                onClick={() => setActiveTab('loans')}
                className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'loans'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                Loans
              </button>

              {canManageLending && (
                <button
                  onClick={() => setActiveTab('lent-out')}
                  className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'lent-out'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Lent Out
                </button>
              )}

              {isSystemAdmin && (
                <button
                  onClick={() => setActiveTab('permissions')}
                  className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'permissions'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Permissions
                </button>
              )}

              {isSystemAdmin && (
                <button
                  onClick={() => setActiveTab('auto-deposit-settings')}
                  className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'auto-deposit-settings'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  ⚙ Auto-Deposit Settings
                </button>
              )}
            </nav>
          </div>

          <div className="p-2 sm:p-3">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-3">
                {/* Compact info bar + quick actions on one row */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  {/* Account info chips */}
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                    <span className="opacity-60">#</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{account.accountNumber}</span>
                  </div>
                  <div className="text-xs shrink-0">
                    {account.isActive
                      ? <span className="text-green-600 dark:text-green-400">✅ Active</span>
                      : <span className="text-red-500">❌ Inactive</span>}
                  </div>
                  {isSystemAdmin && (
                    <button
                      onClick={async () => {
                        if (!confirm(account.isActive ? 'Deactivate this account? It will be hidden from non-admin users.' : 'Reactivate this account?')) return
                        const res = await fetch(`/api/expense-account/${accountId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ isActive: !account.isActive }),
                        })
                        if (res.ok) {
                          setAccount(prev => prev ? { ...prev, isActive: !prev.isActive } : prev)
                        }
                      }}
                      className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
                        account.isActive
                          ? 'border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : 'border-green-400 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                    >
                      {account.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  )}
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                    <span className="opacity-60">Since</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{new Date(account.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex-1 hidden sm:block" />

                  {/* Quick action buttons inline */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {canMakeExpenseDeposits && (
                      <button
                        onClick={() => setActiveTab('deposits')}
                        className="px-4 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-400 dark:hover:border-green-700 transition-colors"
                      >
                        💰 Deposit
                      </button>
                    )}
                    {canMakeExpensePayments && (
                      <button
                        onClick={() => setActiveTab('payments')}
                        className="px-4 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-400 dark:hover:border-orange-700 transition-colors"
                      >
                        💸 Payment
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="px-4 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-700 transition-colors"
                    >
                      📜 Transactions
                    </button>
                    {canViewExpenseReports && (
                      <Link
                        href={`/expense-accounts/${accountId}/reports`}
                        className="px-4 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-400 dark:hover:border-purple-700 transition-colors"
                      >
                        📊 Reports
                      </Link>
                    )}
                    {(isSystemAdmin || canViewExpenseReports) && account?.businessId && (() => {
                      const bType = businesses?.find(b => b.businessId === account.businessId)?.businessType ?? currentBusiness?.businessType ?? 'restaurant'
                      return (
                        <Link
                          href={`/${bType}/reports/financial-insights`}
                          className="px-4 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                          title="Analyse profit margins, cost trends and opportunities"
                        >
                          📈 Financial Insights
                        </Link>
                      )
                    })()}
                  </div>
                </div>

                <MyQueuePanel
                  accountId={accountId}
                  refreshKey={paymentRefreshKey}
                  onActionDone={() => {
                    refreshBalanceSilent()
                    setPaymentRefreshKey(k => k + 1)
                  }}
                />

                <TransactionHistory accountId={accountId} canEditPayments={canEditPayments} isAdmin={isSystemAdmin} refreshKey={paymentRefreshKey} />
              </div>
            )}

            {/* Deposits Tab */}
            {activeTab === 'deposits' && canMakeExpenseDeposits && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-start">
                {/* Deposit Form */}
                <div className="lg:col-span-3">
                  <DepositForm
                    accountId={accountId}
                    accountType={account.accountType}
                    onSuccess={handleDepositSuccess}
                  />
                </div>
                {/* Last 5 Deposits Panel */}
                <div className="lg:col-span-2">
                  <RecentDepositsPanel accountId={accountId} refreshKey={depositRefreshKey} />
                </div>
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && canMakeExpensePayments && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-start">
                {/* Left: Payment Form */}
                <div className="lg:col-span-3">
                  <PaymentForm
                    accountId={accountId}
                    businessId={account.businessId || currentBusiness?.id}
                    currentBalance={Number(account.balance)}
                    onSuccess={handlePaymentSuccess}
                    onAddFunds={() => setActiveTab('deposits')}
                    canCreatePayees={canCreatePayees}
                    accountType={account.accountType}
                    defaultCategoryBusinessType={currentBusiness?.businessType}
                    batchRefreshKey={batchRefreshKey}
                    ecocashEnabled={currentBusiness?.ecocashEnabled ?? false}
                    accountInfo={{
                      accountName: account.accountName,
                      isSibling: account.isSibling,
                      siblingNumber: account.siblingNumber,
                      parentAccountId: account.parentAccountId
                    }}
                  />
                </div>
                {/* Right: action buttons + recent panel */}
                <div className="lg:col-span-2 flex flex-col gap-2">
                  <div className="flex items-center justify-end gap-2">
                    {canMakeExpensePayments && (
                      <button
                        onClick={() => setShowFundPayrollModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                      >
                        💵 Fund Payroll
                      </button>
                    )}
                    <button
                      onClick={() => setShowReturnTransferModal(true)}
                      disabled={account.balance <= 0}
                      title={account.balance <= 0 ? 'Insufficient balance to return transfer' : undefined}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-purple-50 dark:disabled:hover:bg-purple-900/20"
                    >
                      🔄 Return Transfer
                    </button>
                  </div>
                  <RecentPaymentsPanel accountId={accountId} refreshKey={paymentRefreshKey} />
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div>
                <TransactionHistory
                  accountId={accountId}
                  canEditPayments={canEditPayments}
                  isAdmin={isSystemAdmin}
                  initialStartDate={urlStartDate || undefined}
                  initialEndDate={urlEndDate || undefined}
                  defaultType={(urlType === 'PAYMENT' || urlType === 'DEPOSIT') ? urlType : ''}
                />
              </div>
            )}

            {/* Loans Tab */}
            {activeTab === 'loans' && (
              <div>
                <LoansTab accountId={accountId} />
              </div>
            )}

            {/* Lent Out Tab */}
            {activeTab === 'lent-out' && canManageLending && (
              <div>
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setShowLendMoneyModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    🤝 Lend Money
                  </button>
                </div>
                <OutgoingLoansPanel
                  accountId={accountId}
                  canManage={canManageLending}
                  refreshKey={loansRefreshKey}
                  onRepaymentSuccess={loadAccount}
                />
              </div>
            )}

            {/* Permissions Tab (admin only) */}
            {activeTab === 'permissions' && isSystemAdmin && (
              <div>
                <AccountPermissionsTab accountId={accountId} />
              </div>
            )}

            {/* Auto-Deposit Settings Tab (admin only) */}
            {activeTab === 'auto-deposit-settings' && isSystemAdmin && (
              <div className="max-w-2xl">
                <AutoDepositAdminPanel accountId={accountId} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Deposit Modal */}
      {account && (
        <QuickDepositModal
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          accountId={accountId}
          accountName={account.accountName}
          isLoanAccount={account.isLoanAccount}
          currentBalance={Number(account.balance)}
          onSuccess={() => {
            loadAccount()
            setShowDepositModal(false)
          }}
          onError={(error) => console.error('Quick deposit error:', error)}
        />
      )}

      {/* Quick Payment Modal */}
      {account && (
        <QuickPaymentModal
          isOpen={showQuickPaymentModal}
          onClose={() => setShowQuickPaymentModal(false)}
          accountId={accountId}
          accountName={account.accountName}
          currentBalance={Number(account.balance)}
          onSuccess={() => {
            loadAccount()
            setShowQuickPaymentModal(false)
          }}
          onError={(error) => console.error('Quick payment error:', error)}
          canCreatePayees={canCreatePayees}
          canChangeCategory={canChangeCategory}
          accountType={account.accountType}
          defaultCategoryBusinessType={currentBusiness?.businessType}
          businessId={account.businessId || currentBusiness?.id}
          presetPayee={
            account.accountType === 'RENT' && account.landlordSupplierId && account.landlordSupplierName
              ? { type: 'SUPPLIER', id: account.landlordSupplierId, name: account.landlordSupplierName }
              : null
          }
        />
      )}

      {/* Return Transfer Modal */}
      {showReturnTransferModal && account && (
        <ReturnTransferModal
          accountId={accountId}
          currentBalance={Number(account.balance)}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowReturnTransferModal(false)}
        />
      )}

      {/* Lend Money Modal */}
      {showLendMoneyModal && account && (
        <LendMoneyModal
          accountId={accountId}
          accountName={account.accountName}
          accountBalance={Number(account.balance)}
          currentBusinessId={account.businessId}
          onSuccess={() => {
            loadAccount()
            setLoansRefreshKey(k => k + 1)
          }}
          onClose={() => setShowLendMoneyModal(false)}
        />
      )}

      {/* Fund Payroll Modal */}
      {showFundPayrollModal && account && (
        <FundPayrollModal
          accountId={accountId}
          accountName={account.accountName}
          accountBalance={Number(account.balance)}
          onSuccess={() => {
            loadAccount()
            setShowFundPayrollModal(false)
          }}
          onClose={() => setShowFundPayrollModal(false)}
        />
      )}

      {/* Smart Daily Expenses Modal — adds to queue, switches to Payments tab */}
      {account && (
        <SmartQuickPaymentModal
          isOpen={showSmartQuickPayModal}
          onClose={() => setShowSmartQuickPayModal(false)}
          accountId={accountId}
          accountBalance={Number(account.balance)}
          defaultCategoryBusinessType={currentBusiness?.businessType}
          businessId={account.businessId || currentBusiness?.id}
          onSuccess={() => {
            setShowSmartQuickPayModal(false)
            setActiveTab('payments')
          }}
        />
      )}

      {/* Payment Batch Modal — cashier submits REQUEST payments */}
      {showBatchModal && account && canSubmitPaymentBatch && (
        <PaymentBatchModal
          accountId={accountId}
          accountName={account.accountName}
          businessId={account.businessId ?? ''}
          onClose={() => setShowBatchModal(false)}
          onSuccess={() => {
            setShowBatchModal(false)
            loadAccount()
            setPaymentRefreshKey(k => k + 1)
            setPendingBatchCount(0)
          }}
        />
      )}

      {/* Vehicle Expenses Modal — adds to queue, switches to Payments tab */}
      {account && (
        <VehicleExpenseModal
          isOpen={showVehicleExpenseModal}
          onClose={() => setShowVehicleExpenseModal(false)}
          accountId={accountId}
          accountBalance={Number(account.balance)}
          canManageVehicles={isSystemAdmin || isBusinessOwner || hasPermission('canManageVehicles')}
          onSuccess={() => {
            setShowVehicleExpenseModal(false)
            setBatchRefreshKey(k => k + 1)
            setActiveTab('payments')
          }}
        />
      )}
    </ContentLayout>
  )
}
