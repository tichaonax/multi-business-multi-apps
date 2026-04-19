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
import { TransferModal } from '@/components/expense-account/transfer-modal'
import { TransferHistory } from '@/components/expense-account/transfer-history'
import VehicleExpenseModal from '@/components/expense-account/vehicle-expense-modal'
import { AutoDepositAdminPanel } from '@/components/expense-account/auto-deposit-admin-panel'
import { PaymentBatchModal } from '@/components/expense-account/payment-batch-modal'
import { ExpensePaymentVoucherModal, PaymentSummary } from '@/components/expense-account/expense-payment-voucher-modal'
import { useConfirm, useAlert } from '@/components/ui/confirm-modal'
import { useToastContext } from '@/components/ui/toast'
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
  businessName: string | null
  businessType: string | null
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
                  {p.status === 'REQUEST' && (
                    <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">⏳ Awaiting Cashier</span>
                  )}
                  {p.status === 'QUEUED' && (
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
  createdAt?: string
  createdBy?: { id: string } | null
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

interface PettyCashQueueItem {
  id: string
  requestedAmount: number
  purpose: string
  notes?: string | null
  status: string
  paymentChannel: string
  priority: string
  requestedAt: string
  requestedBy: string
}

interface EodSubmissionQueueItem {
  id: string
  businessId: string
  business: { id: string; name: string }
  cashier: { id: string; name: string }
  totalAmount: string
  submittedAt: string
  eodBatch: { id: string; eodDate: string; status: string; approvedCount: number } | null
}

function MyQueuePanel({
  accountId,
  refreshKey,
  onActionDone,
  onBalanceRefresh,
  businessId,
  businessName,
}: {
  accountId: string
  refreshKey: number
  onActionDone: () => void
  onBalanceRefresh?: () => void
  businessId?: string
  businessName?: string
}) {
  const confirm = useConfirm()
  const alert = useAlert()
  const { data: session } = useSession()
  const queueUserId = (session?.user as any)?.id as string | undefined
  const queueUserName = session?.user?.name ?? 'Staff'
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
  const dismissedIdsRef = useRef<Set<string>>(new Set())
  const mountedRef = useRef(false)
  const [activityDetected, setActivityDetected] = useState(false)
  const [queueVoucherModal, setQueueVoucherModal] = useState<{ payment: PaymentSummary; existing: any | null } | null>(null)
  const [queueOpen, setQueueOpen] = useState(true)
  const [mealGroupOpen, setMealGroupOpen] = useState(false)
  const [queueSearch, setQueueSearch] = useState('')
  const [pettyRequests, setPettyRequests] = useState<PettyCashQueueItem[]>([])
  const [eodSubmissions, setEodSubmissions] = useState<EodSubmissionQueueItem[]>([])

  const openQueueVoucher = async (p: QueuedPayment) => {
    if (!businessId) return
    const res = await fetch(`/api/payment-vouchers?paymentId=${p.id}`)
    const json = await res.json()
    const pName = payeeName(p)
    const payment: PaymentSummary = {
      id: p.id,
      amount: p.amount,
      paymentDate: new Date().toISOString(),
      payeeName: pName,
      payeeType: p.payeeType ?? 'GENERAL',
      purpose: p.description ?? '',
      category: p.category ? `${p.category.emoji} ${p.category.name}` : undefined,
      businessId: businessId!,
      businessName: businessName ?? '',
    }
    setQueueVoucherModal({ payment, existing: json.data ?? null })
  }

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const prevPendingCount = pendingApprovalRef.current.length
    const [q, pa, a, pc, eod] = await Promise.all([
      // Fetch QUEUED payments via the general payments endpoint (accessible to all account members).
      // Filter client-side to the current user's own payments so "My Queue" is personal.
      fetch(`/api/expense-account/${accountId}/payments?status=QUEUED&sortBy=createdAt&limit=50`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null).then(d => d?.data?.payments ?? []),
      fetch(`/api/expense-account/${accountId}/payments?status=REQUEST&sortBy=createdAt&limit=20`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null).then(d => d?.data?.payments ?? []),
      fetch(`/api/expense-account/${accountId}/payments?status=APPROVED&sortBy=createdAt&limit=20`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null).then(d => d?.data?.payments ?? []),
      businessId
        ? fetch(`/api/petty-cash/requests?businessId=${businessId}&status=PENDING&limit=50`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(d => (d?.data?.requests ?? []).filter((r: any) => r.requestedBy === queueUserId))
        : Promise.resolve([]),
      fetch(`/api/expense-account/${accountId}/eod-submissions`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null).then(d => d?.data ?? []),
    ])
    // Only show the current user's own QUEUED payments in My Queue
    setQueued(q.filter((p: QueuedPayment) => p.createdBy?.id === queueUserId))
    // Show ALL REQUEST payments on this account — not filtered by creator.
    // The requester sees their own; cashiers/admins viewing the account also see pending requests.
    setPendingApproval(pa)
    pendingApprovalRef.current = pa
    setApproved(a.filter((p: QueuedPayment) => !dismissedIdsRef.current.has(p.id) && p.createdBy?.id === queueUserId))
    setPettyRequests(pc)
    setEodSubmissions(eod)
    if (!silent) setLoading(false)
    // If a pending REQUEST payment was just approved/rejected (count dropped), show a
    // banner instead of auto-refreshing — avoids wiping unsaved work the user may have open.
    if (prevPendingCount > 0 && pa.length < prevPendingCount) {
      setActivityDetected(true)
    }
  }, [accountId, businessId, queueUserId])

  // Initial load (non-silent); subsequent refreshKey or fetchAll changes run silently to avoid panel flash
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      fetchAll(false)
    } else {
      fetchAll(true)
    }
  }, [fetchAll, refreshKey])

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

  const timeAgo = (iso: string | undefined | null): string => {
    if (!iso) return ''
    const diffMs = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days}d ago`
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  }

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
        setPendingApproval(prev => prev.filter(p => p.id !== paymentId))
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
        dismissedIdsRef.current.add(paymentId)
        setApproved(prev => prev.filter(p => p.id !== paymentId))
        // onActionDone refreshes balance + increments paymentRefreshKey (drives TransactionHistory)
        onActionDone()
        fetchAll(true)
      } else {
        const d = await res.json()
        await alert({ title: 'Error', description: d.error ?? 'Failed to mark payment as paid' })
      }
    } finally {
      setActionId(null)
    }
  }

  const handleCancelPetty = async (requestId: string) => {
    const ok = await confirm({ title: 'Cancel Petty Cash', description: 'Cancel this petty cash request?', confirmText: 'Yes, Cancel', cancelText: 'Keep' })
    if (!ok) return
    setActionId(requestId)
    try {
      const res = await fetch(`/api/petty-cash/requests/${requestId}/cancel`, { method: 'POST', credentials: 'include' })
      if (res.ok) {
        setPettyRequests(prev => prev.filter(r => r.id !== requestId))
        onActionDone()
      } else {
        const d = await res.json()
        await alert({ title: 'Error', description: d.error ?? 'Failed to cancel request' })
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
        const paidId = ecocashModal.paymentId
        dismissedIdsRef.current.add(paidId)
        setApproved(prev => prev.filter(p => p.id !== paidId))
        setEcocashModal(null)
        setEcocashTxCode('')
        onActionDone()
        fetchAll(true)
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
  if (queued.length === 0 && pendingApproval.length === 0 && approved.length === 0 && pettyRequests.length === 0 && eodSubmissions.length === 0) return null

  const totalCount = queued.length + pendingApproval.length + approved.length + pettyRequests.length + eodSubmissions.length
  const searchLower = queueSearch.toLowerCase()
  const matchesSearch = (p: QueuedPayment) =>
    !queueSearch ||
    payeeName(p).toLowerCase().includes(searchLower) ||
    (p.category?.name ?? '').toLowerCase().includes(searchLower) ||
    (p.description ?? '').toLowerCase().includes(searchLower)
  const matchesPettySearch = (p: PettyCashQueueItem) =>
    !queueSearch ||
    p.purpose.toLowerCase().includes(searchLower) ||
    (p.notes ?? '').toLowerCase().includes(searchLower)

  return (
    <>
    {activityDetected && (
      <div className="flex items-center justify-between gap-2 px-3 py-2 mb-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-xs">
        <span>Payment activity detected on this account.</span>
        <button
          type="button"
          onClick={() => { setActivityDetected(false); onActionDone() }}
          className="font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200 whitespace-nowrap"
        >
          Refresh now
        </button>
      </div>
    )}
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setQueueOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-border hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">My Queue</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
            {totalCount}
          </span>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${queueOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {queueOpen && (
        <div className="px-3 py-2 border-b border-border bg-white dark:bg-gray-800">
          <input
            type="text"
            value={queueSearch}
            onChange={e => setQueueSearch(e.target.value)}
            placeholder="Search payee, category..."
            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}
      {queueOpen && <div className="divide-y divide-border">
        {pendingApproval.filter(matchesSearch).map(p => (
          <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-blue-50/50 dark:bg-blue-900/10">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                {p.category?.emoji && <span className="text-xs shrink-0">{p.category.emoji}</span>}
                <p className="text-xs font-medium text-primary truncate">{payeeName(p)}</p>
                <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">💳 PMT</span>
                <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">AWAITING CASHIER</span>
                {p.paymentChannel === 'ECOCASH'
                  ? <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-medium">📱 EcoCash</span>
                  : <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">💵 Cash</span>
                }
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{p.category?.name ?? 'No category'}{p.createdAt && <span className="ml-1 text-gray-300 dark:text-gray-600">· {timeAgo(p.createdAt)}</span>}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">−{fmt(p.amount)}</span>
              <button
                onClick={() => handleCancel(p.id)}
                disabled={actionId === p.id}
                className="px-2 py-0.5 text-[10px] font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
              >
                {actionId === p.id ? '…' : '✕ Cancel'}
              </button>
            </div>
          </div>
        ))}
        {approved.filter(p => !dismissedIdsRef.current.has(p.id)).filter(matchesSearch).map(p => (
          <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-green-50/50 dark:bg-green-900/10">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {p.category?.emoji && <span className="text-xs shrink-0">{p.category.emoji}</span>}
                <p className="text-xs font-medium text-primary truncate">{payeeName(p)}</p>
                <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">💳 PMT</span>
                <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">APPROVED</span>
                {p.paymentChannel === 'ECOCASH'
                  ? <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-medium">📱 EcoCash</span>
                  : <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">💵 Cash</span>
                }
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{p.category?.name ?? 'No category'}{p.createdAt && <span className="ml-1 text-gray-300 dark:text-gray-600">· {timeAgo(p.createdAt)}</span>}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">−{fmt(p.amount)}</span>
              {businessId && (
                <button
                  onClick={() => openQueueVoucher(p)}
                  className="text-sm text-gray-300 dark:text-gray-600 hover:text-teal-500 dark:hover:text-teal-400 transition-colors"
                  title="Generate payment voucher"
                >
                  📄
                </button>
              )}
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
        {queued.filter(p => p.category?.name !== 'Employee Meal Program').filter(matchesSearch).map(p => (
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
                  <div className="flex items-center gap-1 flex-wrap">
                    {p.category?.emoji && <span className="text-xs shrink-0">{p.category.emoji}</span>}
                    <p className="text-xs font-medium text-primary truncate">{payeeName(p)}</p>
                    <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">💳 PMT</span>
                    <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">IN QUEUE</span>
                    {p.paymentChannel === 'ECOCASH'
                      ? <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-medium">📱 EcoCash</span>
                      : <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">💵 Cash</span>
                    }
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{p.category?.name ?? 'No category'}{p.createdAt && <span className="ml-1 text-gray-300 dark:text-gray-600">· {timeAgo(p.createdAt)}</span>}</p>
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
        {(() => {
          const mealItems = queued.filter(p => p.category?.name === 'Employee Meal Program').filter(matchesSearch)
          if (mealItems.length === 0) return null
          return (
            <div className="border-t border-border">
              <button
                onClick={() => setMealGroupOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <span className="font-medium flex items-center gap-1.5">
                  🍽️ Employee Meal Program
                  <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{mealItems.length}</span>
                </span>
                <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${mealGroupOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {mealGroupOpen && mealItems.map(p => (
                <div key={p.id} className="px-3 py-2 border-t border-border/50">
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
                          <input type="number" step="0.01" min="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="pl-5 pr-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-24 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <input type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes (optional)" className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleSaveEdit} disabled={saving} className="px-2 py-0.5 text-[10px] font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving ? '…' : '✓ Save'}</button>
                        <button onClick={() => setEditingId(null)} disabled={saving} className="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-500 rounded hover:bg-gray-200 dark:hover:bg-gray-500">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          {p.category?.emoji && <span className="text-xs shrink-0">{p.category.emoji}</span>}
                          <p className="text-xs font-medium text-primary truncate">{payeeName(p)}</p>
                          <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">💳 PMT</span>
                          <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">IN QUEUE</span>
                          {p.paymentChannel === 'ECOCASH'
                            ? <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-medium">📱 EcoCash</span>
                            : <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">💵 Cash</span>
                          }
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{p.category?.name ?? 'No category'}{p.createdAt && <span className="ml-1 text-gray-300 dark:text-gray-600">· {timeAgo(p.createdAt)}</span>}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-red-600 dark:text-red-400">−{fmt(p.amount)}</span>
                        <button onClick={() => startEdit(p)} disabled={!!actionId} className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50">✎ Edit</button>
                        <button onClick={() => handleCancel(p.id)} disabled={actionId === p.id} className="px-2 py-0.5 text-[10px] font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50">{actionId === p.id ? '…' : '✕ Cancel'}</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        })()}
        {pettyRequests.filter(matchesPettySearch).map(p => (
          <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-purple-50/50 dark:bg-purple-900/10">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold">💵 PCR</span>
                <p className="text-xs font-medium text-primary truncate">{p.purpose}</p>
                <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">PENDING</span>
                {p.paymentChannel === 'ECOCASH'
                  ? <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-medium">📱 EcoCash</span>
                  : <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">💵 Cash</span>
                }
                {p.priority === 'URGENT' && <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium">🚨 URGENT</span>}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{p.notes ?? ''}<span className="ml-1 text-gray-300 dark:text-gray-600">· {timeAgo(p.requestedAt)}</span></p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">−{fmt(p.requestedAmount)}</span>
              <button
                onClick={() => handleCancelPetty(p.id)}
                disabled={actionId === p.id}
                className="px-2 py-0.5 text-[10px] font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
              >
                {actionId === p.id ? '…' : '✕ Cancel'}
              </button>
            </div>
          </div>
        ))}
        {eodSubmissions.filter(s =>
          !queueSearch ||
          s.business.name.toLowerCase().includes(queueSearch.toLowerCase()) ||
          (s.eodBatch?.eodDate ?? '').includes(queueSearch)
        ).map(s => (
          <div key={s.id} className="flex items-center gap-2 px-3 py-2 bg-orange-50/50 dark:bg-orange-900/10">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-semibold">🏪 EOD</span>
                <p className="text-xs font-medium text-primary truncate">{s.business.name}</p>
                <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">AWAITING ALLOCATION</span>
                <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">💵 Cash</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                {s.eodBatch?.eodDate ? new Date(s.eodBatch.eodDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''} · {s.eodBatch?.approvedCount ?? 0} payment{(s.eodBatch?.approvedCount ?? 0) !== 1 ? 's' : ''} · by {s.cashier.name}<span className="ml-1 text-gray-300 dark:text-gray-600">· {timeAgo(s.submittedAt)}</span>
              </p>
            </div>
            <span className="text-xs font-semibold text-green-600 dark:text-green-400 shrink-0">+{fmt(Number(s.totalAmount))}</span>
          </div>
        ))}
      </div>}
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

    {/* Payment Voucher Modal — queue panel */}
    {queueVoucherModal && queueUserId && (
      <ExpensePaymentVoucherModal
        payment={queueVoucherModal.payment}
        existingVoucher={queueVoucherModal.existing}
        userId={queueUserId}
        creatorName={queueUserName}
        onClose={() => setQueueVoucherModal(null)}
        onSaved={() => setQueueVoucherModal(null)}
      />
    )}
    </>
  )
}
// ────────────────────────────────────────────────────────────────────────────

function QuickPettyCashModal({ businessId, onClose, onSuccess }: { businessId: string; onClose: () => void; onSuccess: () => void }) {
  const toast = useToastContext()
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [notes, setNotes] = useState('')
  const [channel, setChannel] = useState<'CASH' | 'ECOCASH'>('CASH')
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT'>('NORMAL')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return }
    if (!purpose.trim()) { toast.error('Purpose is required'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/petty-cash/requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, requestedAmount: amt, purpose: purpose.trim(), notes: notes.trim() || undefined, paymentChannel: channel, priority }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Failed to submit request'); return }
      toast.push('Petty cash request submitted', { type: 'success' })
      onSuccess()
      onClose()
    } catch { toast.error('Failed to submit request') } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-5 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">💵 Petty Cash Request</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
              <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00"
                className="w-full pl-6 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Purpose <span className="text-red-500">*</span></label>
            <input type="text" value={purpose} onChange={e => setPurpose(e.target.value)} required placeholder="What is this for?"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Channel</label>
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
                {(['CASH', 'ECOCASH'] as const).map(ch => (
                  <button key={ch} type="button" onClick={() => setChannel(ch)}
                    className={`flex-1 py-1.5 font-medium transition-colors ${channel === ch ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                    {ch === 'CASH' ? '💵 Cash' : '📱 EcoCash'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
                {(['NORMAL', 'URGENT'] as const).map(pr => (
                  <button key={pr} type="button" onClick={() => setPriority(pr)}
                    className={`flex-1 py-1.5 font-medium transition-colors ${priority === pr ? (pr === 'URGENT' ? 'bg-red-600 text-white' : 'bg-purple-600 text-white') : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                    {pr === 'NORMAL' ? 'Normal' : '🚨 Urgent'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={submitting}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-4 py-1.5 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50">
              {submitting ? 'Submitting…' : '💵 Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ExpenseAccountDetailPage() {
  const { data: session, status } = useSession()
  const toast = useToastContext()
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
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showQuickPaymentModal, setShowQuickPaymentModal] = useState(false)
  const [showSmartQuickPayModal, setShowSmartQuickPayModal] = useState(false)
  const [showReturnTransferModal, setShowReturnTransferModal] = useState(false)
  const [showLendMoneyModal, setShowLendMoneyModal] = useState(false)
  const [showFundPayrollModal, setShowFundPayrollModal] = useState(false)

  const [showVehicleExpenseModal, setShowVehicleExpenseModal] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [showPettyCashModal, setShowPettyCashModal] = useState(false)
  const [loansRefreshKey, setLoansRefreshKey] = useState(0)
  const [batchRefreshKey, setBatchRefreshKey] = useState(0)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [switcherSearch, setSwitcherSearch] = useState('')
  const [switcherAccounts, setSwitcherAccounts] = useState<{ id: string; accountName: string; accountNumber: string; balance: number }[]>([])
  const switcherRef = useRef<HTMLDivElement>(null)
  const [depositRefreshKey, setDepositRefreshKey] = useState(0)
  const [paymentRefreshKey, setPaymentRefreshKey] = useState(0)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [pendingBatchCount, setPendingBatchCount] = useState(0)
  const [pendingBatchCountOthers, setPendingBatchCountOthers] = useState(0)
  const [rentPaymentSubmitting, setRentPaymentSubmitting] = useState(false)
  const [rentPaidThisMonth, setRentPaidThisMonth] = useState(false)
  const [canRequestPettyCash, setCanRequestPettyCash] = useState(false)
  const [pendingPettyCashCount, setPendingPettyCashCount] = useState(0)

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

  const confirm = useConfirm()
  const alert = useAlert()

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
      // Fetch all accessible accounts for the switcher
      fetch('/api/expense-account', { credentials: 'include' })
        .then(r => r.json())
        .then(json => {
          if (json.data?.accounts) {
            setSwitcherAccounts(
              json.data.accounts.map((a: any) => ({
                id: a.id,
                accountName: a.accountName,
                accountNumber: a.accountNumber,
                balance: Number(a.balance ?? 0),
              }))
            )
          }
        })
        .catch(() => {})
    }
  }, [session, accountId])

  useEffect(() => {
    if (!session?.user) return
    fetch('/api/petty-cash/my-permissions', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        const canRequest = j.canRequest ?? false
        setCanRequestPettyCash(canRequest)
        if (canRequest && account?.businessId) {
          fetch(`/api/petty-cash/requests?status=PENDING&businessId=${account.businessId}&limit=50`, { credentials: 'include' })
            .then(r => r.json())
            .then(j => setPendingPettyCashCount(j.data?.pagination?.total ?? 0))
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [session, account?.businessId])

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

  // Close switcher dropdown on outside click
  useEffect(() => {
    if (!switcherOpen) return
    const handler = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [switcherOpen])

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

  // Fetch pending payment count for cashier batch button.
  // - QUEUED payments = business account EOD batch flow
  // - REQUEST payments = personal account cashier-assisted flow (MBM-171)
  // Both contribute to the badge so cashiers see any pending work.
  useEffect(() => {
    if (!accountId || !canSubmitPaymentBatch) return
    Promise.all([
      fetch(`/api/expense-account/${accountId}/payment-requests`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(data => (data?.data ?? []) as any[]),
      fetch(`/api/expense-account/${accountId}/payments?status=REQUEST&limit=50&sortBy=createdAt`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(data => (data?.data?.payments ?? []) as any[]),
    ]).then(([queued, requested]) => {
      const allPending = [...queued, ...requested]
      setPendingBatchCount(allPending.length)
      const currentUserId = (session?.user as any)?.id
      const othersCount = currentUserId
        ? allPending.filter((p: any) => p.createdBy?.id !== currentUserId).length
        : allPending.length
      setPendingBatchCountOthers(othersCount)
    }).catch(() => {})
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

          {/* Account switcher */}
          {switcherAccounts.length > 1 && (
            <div ref={switcherRef} className="relative shrink-0">
              <button
                onClick={() => { setSwitcherOpen(o => !o); setSwitcherSearch('') }}
                className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-400 transition-colors"
                title="Switch account"
              >
                <span>⇄ Switch</span>
                <svg className={`w-3 h-3 transition-transform ${switcherOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {switcherOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg w-72">
                  <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                    <input
                      autoFocus
                      type="text"
                      value={switcherSearch}
                      onChange={e => setSwitcherSearch(e.target.value)}
                      placeholder="Search accounts..."
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {switcherAccounts
                      .filter(a => !switcherSearch || a.accountName.toLowerCase().includes(switcherSearch.toLowerCase()) || a.accountNumber.toLowerCase().includes(switcherSearch.toLowerCase()))
                      .map(a => (
                        <button
                          key={a.id}
                          onClick={() => {
                            setSwitcherOpen(false)
                            setSwitcherSearch('')
                            router.push(`/expense-accounts/${a.id}`)
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between gap-2 ${a.id === accountId ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                        >
                          <div className="min-w-0">
                            <div className="truncate">{a.accountName}</div>
                            <div className="text-gray-400 dark:text-gray-500">{a.accountNumber}</div>
                          </div>
                          <span className={`shrink-0 font-medium ${a.balance <= 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                            ${a.balance.toFixed(2)}
                          </span>
                        </button>
                      ))
                    }
                    {switcherAccounts.filter(a => !switcherSearch || a.accountName.toLowerCase().includes(switcherSearch.toLowerCase()) || a.accountNumber.toLowerCase().includes(switcherSearch.toLowerCase())).length === 0 && (
                      <div className="px-3 py-4 text-xs text-gray-400 text-center">No accounts found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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
            {!account?.businessId && account?.accountType !== 'RENT' && (
              <button
                onClick={() => setShowTransferModal(true)}
                className="px-2.5 py-1 bg-violet-600 text-white rounded text-xs font-medium hover:bg-violet-700"
              >
                ⇄ Transfer
              </button>
            )}
            {canMakeExpenseDeposits && (
              <button
                onClick={() => setShowDepositModal(true)}
                className="px-2.5 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
              >
                + Deposit
              </button>
            )}
            {canRequestPettyCash && account.accountType !== 'RENT' && (
              <button
                onClick={() => setShowPettyCashModal(true)}
                className="relative px-2.5 py-1 bg-teal-600 text-white rounded text-xs font-medium hover:bg-teal-700"
              >
                💵 Petty Cash
                {pendingPettyCashCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {pendingPettyCashCount > 9 ? '9+' : pendingPettyCashCount}
                  </span>
                )}
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

              {!account?.businessId && account?.accountType !== 'RENT' && (
                <button
                  onClick={() => setActiveTab('transfers')}
                  className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'transfers'
                      ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  ⇄ Transfers
                </button>
              )}

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
                        const confirmed = await confirm({
                          title: account.isActive ? 'Deactivate Account' : 'Reactivate Account',
                          description: account.isActive ? 'Deactivate this account? It will be hidden from non-admin users.' : 'Reactivate this account?',
                          confirmText: account.isActive ? 'Deactivate' : 'Reactivate',
                        })
                        if (!confirmed) return
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
                  businessId={account.businessId || currentBusiness?.businessId}
                  businessName={currentBusiness?.businessName ?? ''}
                  onActionDone={() => {
                    refreshBalanceSilent()
                    setPaymentRefreshKey(k => k + 1)
                  }}
                  onBalanceRefresh={refreshBalanceSilent}
                />

                <TransactionHistory accountId={accountId} canEditPayments={canEditPayments} isAdmin={isSystemAdmin} refreshKey={paymentRefreshKey} businessId={account.businessId || currentBusiness?.businessId} businessName={currentBusiness?.businessName ?? ''} />
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
                  onDataChanged={() => { refreshBalanceSilent(); setPaymentRefreshKey(k => k + 1) }}
                  businessId={account.businessId || currentBusiness?.businessId}
                  businessName={currentBusiness?.businessName ?? ''}
                />
              </div>
            )}

            {/* Loans Tab */}
            {activeTab === 'transfers' && !account?.businessId && (
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Transfer History</h3>
                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="px-3 py-1.5 bg-violet-600 text-white rounded text-xs font-medium hover:bg-violet-700"
                  >
                    ⇄ New Transfer
                  </button>
                </div>
                <TransferHistory accountId={accountId} showFilters={true} />
              </div>
            )}

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
          accountType={account.accountType}
          businessId={account.businessId ?? undefined}
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
          onSuccess={(payload) => {
            loadAccount()
            fetchCounts()
            setPaymentRefreshKey(k => k + 1)
            // REQUEST payments stay on Overview so the requester sees My Queue update
            if (typeof payload === 'object' && !payload.isRequest) {
              setActiveTab('payments')
            }
            setShowQuickPaymentModal(false)
          }}
          onError={(error) => toast.error(error)}
          canCreatePayees={canCreatePayees}
          canChangeCategory={canChangeCategory}
          accountType={account.accountType}
          defaultCategoryBusinessType={account.accountType === 'PERSONAL' ? undefined : (account.businessType ?? businesses?.find(b => b.businessId === account.businessId)?.businessType)}
          businessId={account.accountType === 'PERSONAL' ? undefined : (account.businessId ?? undefined)}
          businessName={account.accountType === 'PERSONAL' ? undefined : (account.businessName ?? undefined)}
          businesses={businesses}
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

      {/* Smart Daily Expenses Modal — multi-line with historical pre-fill, adds to queue */}
      {showSmartQuickPayModal && account && (
        <SmartQuickPaymentModal
          isOpen={showSmartQuickPayModal}
          onClose={() => setShowSmartQuickPayModal(false)}
          accountId={accountId}
          accountBalance={Number(account.balance)}
          defaultCategoryBusinessType={account.businessId
            ? businesses?.find(b => b.businessId === account.businessId)?.businessType
            : currentBusiness?.businessType}
          businessId={account.businessId ?? undefined}
          onSuccess={() => {
            setShowSmartQuickPayModal(false)
            loadAccount()
            setPaymentRefreshKey(k => k + 1)
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

      {/* Quick Petty Cash Modal */}
      {showPettyCashModal && account?.businessId && (
        <QuickPettyCashModal
          businessId={account.businessId}
          onClose={() => setShowPettyCashModal(false)}
          onSuccess={() => {
            setPaymentRefreshKey(k => k + 1)
            setPendingPettyCashCount(prev => prev + 1)
          }}
        />
      )}

      {showTransferModal && account && !account.businessId && (
        <TransferModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          sourceAccountId={accountId}
          sourceAccountName={account.accountName}
          currentBalance={account.balance}
          onSuccess={() => {
            setShowTransferModal(false)
            setPaymentRefreshKey(k => k + 1)
            loadAccount()
          }}
        />
      )}
    </ContentLayout>
  )
}
