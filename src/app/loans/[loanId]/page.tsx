'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useToastContext } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-modal'

// ── Types ────────────────────────────────────────────────────────────────────

interface LoanExpense {
  id: string
  description: string
  amount: string
  expenseDate: string
  notes: string | null
  createdAt: string
  creator: { id: string; name: string }
}

interface PreLockRepayment {
  id: string
  description: string
  amount: string
  repaymentDate: string
  notes: string | null
  createdAt: string
  creator: { id: string; name: string }
}

interface WithdrawalRequest {
  id: string
  requestNumber: string
  requestedAmount: string
  approvedAmount: string | null
  requestMonth: string
  status: string
  notes: string | null
  rejectionReason: string | null
  createdAt: string
  approvedAt: string | null
  paidAt: string | null
  approver: { id: string; name: string } | null
  payer: { id: string; name: string } | null
}

interface Loan {
  id: string
  loanNumber: string
  description: string
  totalAmount: string
  lockedBalance: string | null
  lenderName: string
  lenderContactInfo: string | null
  status: string
  notes: string | null
  createdAt: string
  lockedAt: string | null
  settledAt: string | null
  lockRequestedAt: string | null
  managedBy: { id: string; name: string; email: string }
  managers: { userId: string; user: { id: string; name: string; email: string } }[]
  lenderUser: { id: string; name: string; email: string } | null
  creator: { id: string; name: string }
  locker: { id: string; name: string } | null
  lockRequester: { id: string; name: string } | null
  expenseAccount: {
    id: string
    accountNumber: string
    accountName: string
    balance: string
    isLoanAccount: boolean
  } | null
  expenseEntries: LoanExpense[]
  preLockRepayments: PreLockRepayment[]
  withdrawalRequests: WithdrawalRequest[]
}

interface Summary {
  totalExpenses: number
  totalPreLockRepayments: number
  currentBalance: number
  lockedBalance: number | null
  totalDepositedSinceLock: number
  availableToWithdraw: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  RECORDING: 'Recording',
  LOCK_REQUESTED: 'Lock Requested',
  LOCKED: 'Locked',
  SETTLED: 'Settled',
}
const STATUS_COLORS: Record<string, string> = {
  RECORDING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  LOCK_REQUESTED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  LOCKED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  SETTLED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
}
const WITHDRAWAL_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  APPROVED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

function fmt(val: string | number | null | undefined) {
  if (val == null) return '—'
  return `$${Number(val).toFixed(2)}`
}
function fmtDate(val: string | null | undefined) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString()
}
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LoanDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const loanId = params?.loanId as string
  const toast = useToastContext()
  const confirm = useConfirm()

  const [loan, setLoan] = useState<Loan | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [role, setRole] = useState<'admin' | 'manager' | 'lender' | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'expenses' | 'repayments' | 'withdrawals'>('expenses')
  const [submitting, setSubmitting] = useState(false)

  // Bulk entry row types
  type ExpenseRow = { description: string; amount: string; expenseDate: string; notes: string }
  type RepayRow   = { description: string; amount: string; repaymentDate: string; notes: string }

  const blankExpense = (): ExpenseRow => ({ description: '', amount: '', expenseDate: todayISO(), notes: '' })
  const blankRepay   = (): RepayRow   => ({ description: '', amount: '', repaymentDate: todayISO(), notes: '' })

  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([blankExpense()])
  const [repayRows,   setRepayRows]   = useState<RepayRow[]>([blankRepay()])
  const [withdrawForm, setWithdrawForm] = useState({ requestedAmount: '', notes: '' })

  // Manager management (admin only)
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; email: string }[]>([])
  const [managerSubmitting, setManagerSubmitting] = useState(false)

  // Admin withdrawal action modals
  const [approveModal, setApproveModal] = useState<{ requestId: string; requestedAmount: string } | null>(null)
  const [rejectModal, setRejectModal] = useState<{ requestId: string } | null>(null)
  const [approveAmount, setApproveAmount] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [actionSubmitting, setActionSubmitting] = useState(false)

  const currentUser = session?.user as any

  const fetchLoan = useCallback(async () => {
    try {
      const res = await fetch(`/api/business-loans/${loanId}`, { credentials: 'include' })
      if (res.status === 404) { router.push('/'); return }
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load loan')
      setLoan(json.loan)
      setSummary(json.summary)
      setRole(json.role)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [loanId, router, toast])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    fetchLoan()
    // Fetch user list for admin manager panel
    const u = session?.user as any
    if (u?.role === 'admin') {
      fetch('/api/admin/users', { credentials: 'include' })
        .then(r => r.json())
        .then(data => setAllUsers(Array.isArray(data) ? data.map((x: any) => ({ id: x.id, name: x.name, email: x.email })) : []))
        .catch(() => {})
    }
  }, [session, status, fetchLoan])

  // ── Manager management ───────────────────────────────────────────────────

  async function addManager(userId: string) {
    setManagerSubmitting(true)
    try {
      const res = await fetch(`/api/business-loans/${loanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ addManagerUserIds: [userId] }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add manager')
      toast.push('Manager added', { type: 'success' })
      fetchLoan()
    } catch (e: any) { toast.error(e.message) } finally { setManagerSubmitting(false) }
  }

  async function removeManager(userId: string, userName: string) {
    if (!await confirm({ title: 'Remove Manager', description: `Remove ${userName} as a manager?` })) return
    setManagerSubmitting(true)
    try {
      const res = await fetch(`/api/business-loans/${loanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ removeManagerUserIds: [userId] }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to remove manager')
      toast.push('Manager removed', { type: 'success' })
      fetchLoan()
    } catch (e: any) { toast.error(e.message) } finally { setManagerSubmitting(false) }
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  async function addExpenses(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const items = expenseRows.map(r => ({
        description: r.description,
        amount: parseFloat(r.amount),
        expenseDate: r.expenseDate,
        notes: r.notes || undefined,
      }))
      const res = await fetch(`/api/business-loans/${loanId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add expenses')
      toast.push(`${json.count} expense${json.count !== 1 ? 's' : ''} added`, { type: 'success' })
      setExpenseRows([blankExpense()])
      fetchLoan()
    } catch (e: any) { toast.error(e.message) } finally { setSubmitting(false) }
  }

  async function deleteExpense(expenseId: string) {
    if (!await confirm({ title: 'Remove Expense', description: 'Remove this expense entry?' })) return
    try {
      const res = await fetch(`/api/business-loans/${loanId}/expenses/${expenseId}`, { method: 'DELETE', credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete')
      toast.push('Expense removed', { type: 'success' })
      fetchLoan()
    } catch (e: any) { toast.error(e.message) }
  }

  async function addRepayments(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const items = repayRows.map(r => ({
        description: r.description,
        amount: parseFloat(r.amount),
        repaymentDate: r.repaymentDate,
        notes: r.notes || undefined,
      }))
      const res = await fetch(`/api/business-loans/${loanId}/pre-lock-repayments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add repayments')
      toast.push(`${json.count} repayment${json.count !== 1 ? 's' : ''} added`, { type: 'success' })
      setRepayRows([blankRepay()])
      fetchLoan()
    } catch (e: any) { toast.error(e.message) } finally { setSubmitting(false) }
  }

  async function deleteRepayment(repayId: string) {
    if (!await confirm({ title: 'Remove Repayment', description: 'Remove this repayment entry?' })) return
    try {
      const res = await fetch(`/api/business-loans/${loanId}/pre-lock-repayments/${repayId}`, { method: 'DELETE', credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete')
      toast.push('Repayment removed', { type: 'success' })
      fetchLoan()
    } catch (e: any) { toast.error(e.message) }
  }

  async function requestLock() {
    if (!await confirm({
      title: 'Request Lock',
      description: 'This cannot be undone. Once locked, no more expenses or prior repayments can be added. The admin will then review and approve the lock.',
      confirmText: 'Request Lock',
    })) return
    try {
      const res = await fetch(`/api/business-loans/${loanId}/request-lock`, { method: 'POST', credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to request lock')
      toast.push('Lock requested — awaiting admin approval', { type: 'success' })
      fetchLoan()
    } catch (e: any) { toast.error(e.message) }
  }

  async function approveLock() {
    if (!await confirm({
      title: 'Approve Lock',
      description: 'This will snapshot the current balance and prevent any further entries.',
      confirmText: 'Approve Lock',
    })) return
    try {
      const res = await fetch(`/api/business-loans/${loanId}/approve-lock`, { method: 'POST', credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to approve lock')
      toast.push('Lock approved — balance snapshot taken', { type: 'success' })
      fetchLoan()
    } catch (e: any) { toast.error(e.message) }
  }

  async function adminWithdrawalAction(requestId: string, action: 'approve' | 'reject' | 'pay', extra?: { approvedAmount?: number; rejectionReason?: string }) {
    setActionSubmitting(true)
    try {
      const res = await fetch(`/api/business-loans/${loanId}/withdrawal-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, ...extra }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Failed to ${action}`)
      toast.push(`Withdrawal ${action}d successfully`, { type: 'success' })
      setApproveModal(null)
      setRejectModal(null)
      setApproveAmount('')
      setRejectReason('')
      fetchLoan()
    } catch (e: any) { toast.error(e.message) } finally { setActionSubmitting(false) }
  }

  async function submitWithdrawal(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const month = new Date().toISOString().slice(0, 7) // "2026-03"
    try {
      const res = await fetch(`/api/business-loans/${loanId}/withdrawal-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestedAmount: parseFloat(withdrawForm.requestedAmount), requestMonth: month, notes: withdrawForm.notes || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit withdrawal')
      toast.push('Withdrawal request submitted', { type: 'success' })
      setWithdrawForm({ requestedAmount: '', notes: '' })
      setActiveTab('withdrawals')
      fetchLoan()
    } catch (e: any) { toast.error(e.message) } finally { setSubmitting(false) }
  }

  // ── Loading / Guard ───────────────────────────────────────────────────────

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }

  if (!loan || !summary) return null

  const isAdmin = role === 'admin'
  const isSystemAdmin = currentUser?.role === 'admin'
  const isManager = role === 'manager'
  const isLender = role === 'lender'
  const isRecording = loan.status === 'RECORDING'
  const isLockRequested = loan.status === 'LOCK_REQUESTED'
  const isLocked = loan.status === 'LOCKED'
  const isSettled = loan.status === 'SETTLED'
  const canEdit = (isManager || isAdmin) && isRecording

  // Progress bar for LOCKED/SETTLED
  const progressPct = summary.lockedBalance !== null && summary.lockedBalance !== 0
    ? Math.min(100, Math.round((summary.totalDepositedSinceLock / Math.abs(summary.lockedBalance)) * 100))
    : 0

  // ── Lender view ───────────────────────────────────────────────────────────
  if (isLender) {
    return (
      <ContentLayout title={`Loan ${loan.loanNumber}`}>
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{loan.loanNumber}</h1>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[loan.status]}`}>
                {STATUS_LABELS[loan.status]}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{loan.description}</p>
          </div>

          {(isLocked || isSettled) && summary.lockedBalance !== null && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Repayment Progress</h2>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Locked Balance</p>
                  <p className="font-mono font-semibold text-gray-900 dark:text-gray-100">{fmt(summary.lockedBalance)}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Deposited</p>
                  <p className="font-mono font-semibold text-green-600 dark:text-green-400">{fmt(summary.totalDepositedSinceLock)}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Remaining</p>
                  <p className="font-mono font-semibold text-red-600 dark:text-red-400">{fmt(summary.currentBalance)}</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Repayment progress</span><span>{progressPct}%</span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
              <div className="pt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Available to withdraw</p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{fmt(summary.availableToWithdraw)}</p>
              </div>
            </div>
          )}

          {loan.withdrawalRequests && loan.withdrawalRequests.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Withdrawal History</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 text-left text-gray-500">Request #</th>
                    <th className="py-2 text-left text-gray-500">Month</th>
                    <th className="py-2 text-right text-gray-500">Requested</th>
                    <th className="py-2 text-right text-gray-500">Approved</th>
                    <th className="py-2 text-left text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loan.withdrawalRequests.map(w => (
                    <tr key={w.id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 font-mono text-xs">{w.requestNumber}</td>
                      <td className="py-2">{w.requestMonth}</td>
                      <td className="py-2 text-right font-mono">{fmt(w.requestedAmount)}</td>
                      <td className="py-2 text-right font-mono">{fmt(w.approvedAmount)}</td>
                      <td className="py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${WITHDRAWAL_STATUS_COLORS[w.status]}`}>{w.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ContentLayout>
    )
  }

  // ── Full view (admin / manager) ───────────────────────────────────────────
  return (
    <ContentLayout title={`Loan ${loan.loanNumber}`}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Back link */}
        {isAdmin && (
          <Link href="/admin/loans" className="text-sm text-blue-500 hover:text-blue-700 dark:hover:text-blue-300">
            ← Back to Loan Repayments
          </Link>
        )}

        {/* ── Header card ─────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{loan.loanNumber}</h1>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[loan.status]}`}>
                  {STATUS_LABELS[loan.status]}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300">{loan.description}</p>
              {loan.notes && <p className="text-sm text-gray-500 dark:text-gray-400 italic">{loan.notes}</p>}
            </div>
            <div className="text-right text-sm space-y-1">
              <p className="text-gray-500 dark:text-gray-400">Lender: <span className="font-medium text-gray-900 dark:text-gray-100">{loan.lenderName}</span></p>
              {loan.lenderContactInfo && <p className="text-gray-400 dark:text-gray-500">{loan.lenderContactInfo}</p>}
              {isSystemAdmin && (
                <p className="text-gray-500 dark:text-gray-400">
                  Managers:{' '}
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {(loan.managers ?? [{ userId: loan.managedBy.id, user: loan.managedBy }])
                      .map(m => m.user.name).join(', ')}
                  </span>
                </p>
              )}
              <p className="text-gray-500 dark:text-gray-400">Total borrowed: <span className="font-mono font-medium text-gray-900 dark:text-gray-100">{fmt(loan.totalAmount)}</span></p>
            </div>
          </div>

          {/* Timeline */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span>Created: {fmtDate(loan.createdAt)} by {loan.creator.name}</span>
            {loan.lockRequester && <span>Lock requested: {fmtDate(loan.lockRequestedAt)} by {loan.lockRequester.name}</span>}
            {loan.locker && <span>Locked: {fmtDate(loan.lockedAt)} by {loan.locker.name}</span>}
            {loan.settledAt && <span>Settled: {fmtDate(loan.settledAt)}</span>}
          </div>
        </div>

        {/* ── Balance summary ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Balance</p>
            <p className={`text-xl font-bold font-mono ${summary.currentBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {fmt(summary.currentBalance)}
            </p>
          </div>
          {(isLocked || isSettled) && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Locked Balance</p>
                <p className="text-xl font-bold font-mono text-gray-900 dark:text-gray-100">{fmt(summary.lockedBalance)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Deposited Since Lock</p>
                <p className="text-xl font-bold font-mono text-green-600 dark:text-green-400">{fmt(summary.totalDepositedSinceLock)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Available to Withdraw</p>
                <p className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">{fmt(summary.availableToWithdraw)}</p>
              </div>
            </>
          )}
          {(isRecording || isLockRequested) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 col-span-1 md:col-span-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Net Summary</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Total Expenses <span className="font-mono font-semibold text-red-600 dark:text-red-400">{fmt(summary.totalExpenses)}</span>
                &nbsp;−&nbsp;Prior Repayments <span className="font-mono font-semibold text-green-600 dark:text-green-400">{fmt(summary.totalPreLockRepayments)}</span>
                &nbsp;=&nbsp;Net Still Owed <span className="font-mono font-semibold text-orange-600 dark:text-orange-400">{fmt(Math.abs(summary.currentBalance))}</span>
              </p>
            </div>
          )}
        </div>

        {/* ── Progress bar (LOCKED / SETTLED) ─────────────────────────────── */}
        {(isLocked || isSettled) && summary.lockedBalance !== null && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Repayment progress toward $0</span>
              <span className="font-semibold">{progressPct}%</span>
            </div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{fmt(summary.lockedBalance)} (start)</span>
              <span>$0 (target)</span>
            </div>
          </div>
        )}

        {/* ── Action buttons ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          {/* Manager/Admin: Request Lock (RECORDING only) */}
          {(isManager || isAdmin) && isRecording && (
            <button
              onClick={requestLock}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
            >
              🔒 Request Lock
            </button>
          )}

          {/* Admin: Approve Lock (LOCK_REQUESTED only) */}
          {isAdmin && isLockRequested && (
            <button
              onClick={approveLock}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
            >
              ✅ Approve Lock
            </button>
          )}

          {/* Admin link to expense account */}
          {isAdmin && loan.expenseAccount && (
            <Link
              href={`/expense-accounts/${loan.expenseAccount.id}`}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              View Expense Account
            </Link>
          )}
        </div>

        {/* ── Managers panel (admin only) ──────────────────────────────────── */}
        {isSystemAdmin && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Assigned Managers</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {(loan.managers ?? [{ userId: loan.managedBy.id, user: loan.managedBy }]).map(m => (
                <div key={m.userId} className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-full px-3 py-1 text-sm">
                  <span className="text-blue-800 dark:text-blue-200">{m.user.name}</span>
                  {m.userId !== loan.managedBy.id && (
                    <button
                      onClick={() => removeManager(m.userId, m.user.name)}
                      disabled={managerSubmitting}
                      className="text-blue-400 hover:text-red-500 dark:hover:text-red-400 font-bold leading-none disabled:opacity-40"
                      title="Remove manager"
                    >
                      ×
                    </button>
                  )}
                  {m.userId === loan.managedBy.id && (
                    <span className="text-xs text-blue-400 dark:text-blue-500">(primary)</span>
                  )}
                </div>
              ))}
            </div>
            {/* Add manager dropdown */}
            {(() => {
              const existingIds = new Set((loan.managers ?? [{ userId: loan.managedBy.id }]).map(m => m.userId))
              const available = allUsers.filter(u => !existingIds.has(u.id))
              return available.length > 0 ? (
                <div className="flex items-center gap-2">
                  <select
                    defaultValue=""
                    onChange={e => { if (e.target.value) { addManager(e.target.value); e.target.value = '' } }}
                    disabled={managerSubmitting}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-40"
                  >
                    <option value="">+ Add manager…</option>
                    {available.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
              ) : null
            })()}
          </div>
        )}

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="border-b border-gray-200 dark:border-gray-700 flex gap-0">
          {(['expenses', 'repayments', 'withdrawals'] as const).map(tab => {
            const labels: Record<string, string> = {
              expenses: `Expenses (${loan.expenseEntries.length})`,
              repayments: `Prior Repayments (${loan.preLockRepayments.length})`,
              withdrawals: `Withdrawals (${loan.withdrawalRequests.length})`,
            }
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {labels[tab]}
              </button>
            )
          })}
        </div>

        {/* ── Expenses tab ─────────────────────────────────────────────────── */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            {/* Bulk add form — manager/admin in RECORDING */}
            {canEdit && (
              <form onSubmit={addExpenses} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Add Expenses</h3>
                  <span className="text-xs text-gray-400">{expenseRows.length} row{expenseRows.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 dark:text-gray-400">
                        <th className="pb-1 text-left font-medium w-32">Date</th>
                        <th className="pb-1 text-left font-medium">Description</th>
                        <th className="pb-1 text-left font-medium w-28">Amount</th>
                        <th className="pb-1 text-left font-medium">Notes</th>
                        <th className="pb-1 w-6" />
                      </tr>
                    </thead>
                    <tbody className="space-y-1">
                      {expenseRows.map((row, i) => (
                        <tr key={i}>
                          <td className="pr-2 py-1">
                            <input required type="date" value={row.expenseDate}
                              onChange={e => setExpenseRows(rows => rows.map((r, j) => j === i ? { ...r, expenseDate: e.target.value } : r))}
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="pr-2 py-1">
                            <input required type="text" placeholder="Description" value={row.description}
                              onChange={e => setExpenseRows(rows => rows.map((r, j) => j === i ? { ...r, description: e.target.value } : r))}
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="pr-2 py-1">
                            <input required type="number" min="0.01" step="0.01" placeholder="0.00" value={row.amount}
                              onChange={e => setExpenseRows(rows => rows.map((r, j) => j === i ? { ...r, amount: e.target.value } : r))}
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="pr-2 py-1">
                            <input type="text" placeholder="Optional" value={row.notes}
                              onChange={e => setExpenseRows(rows => rows.map((r, j) => j === i ? { ...r, notes: e.target.value } : r))}
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="py-1 text-center">
                            {expenseRows.length > 1 && (
                              <button type="button" onClick={() => setExpenseRows(rows => rows.filter((_, j) => j !== i))}
                                className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button type="button" onClick={() => setExpenseRows(rows => [...rows, blankExpense()])}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    + Add row
                  </button>
                  <div className="flex items-center gap-3">
                    {expenseRows.length > 1 && (
                      <span className="text-xs text-gray-500">
                        Total: <strong className="font-mono text-red-600 dark:text-red-400">
                          ${expenseRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0).toFixed(2)}
                        </strong>
                      </span>
                    )}
                    <button type="submit" disabled={submitting}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap">
                      {submitting ? 'Saving…' : `Save ${expenseRows.length > 1 ? `${expenseRows.length} Expenses` : 'Expense'}`}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Expenses table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Date</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Description</th>
                    <th className="px-4 py-3 text-right text-gray-500 font-medium">Amount</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Added By</th>
                    {canEdit && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loan.expenseEntries.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No expenses recorded yet</td></tr>
                  ) : (
                    loan.expenseEntries.map(exp => (
                      <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{fmtDate(exp.expenseDate)}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                          {exp.description}
                          {exp.notes && <span className="block text-xs text-gray-400">{exp.notes}</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-red-600 dark:text-red-400">{fmt(exp.amount)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{exp.creator.name}</td>
                        {canEdit && (
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => deleteExpense(exp.id)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {loan.expenseEntries.length > 0 && (
                  <tfoot className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right">Total Expenses</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-red-600 dark:text-red-400">{fmt(summary.totalExpenses)}</td>
                      <td colSpan={canEdit ? 2 : 1} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ── Prior Repayments tab ─────────────────────────────────────────── */}
        {activeTab === 'repayments' && (
          <div className="space-y-4">
            {canEdit && (
              <form onSubmit={addRepayments} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Add Prior Repayments</h3>
                    <p className="text-xs text-gray-400">Record cash already returned to the lender before this system was set up.</p>
                  </div>
                  <span className="text-xs text-gray-400">{repayRows.length} row{repayRows.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 dark:text-gray-400">
                        <th className="pb-1 text-left font-medium w-32">Date</th>
                        <th className="pb-1 text-left font-medium">Description</th>
                        <th className="pb-1 text-left font-medium w-28">Amount</th>
                        <th className="pb-1 text-left font-medium">Notes</th>
                        <th className="pb-1 w-6" />
                      </tr>
                    </thead>
                    <tbody>
                      {repayRows.map((row, i) => (
                        <tr key={i}>
                          <td className="pr-2 py-1">
                            <input required type="date" value={row.repaymentDate}
                              onChange={e => setRepayRows(rows => rows.map((r, j) => j === i ? { ...r, repaymentDate: e.target.value } : r))}
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="pr-2 py-1">
                            <input required type="text" placeholder="e.g. Cash paid Jan" value={row.description}
                              onChange={e => setRepayRows(rows => rows.map((r, j) => j === i ? { ...r, description: e.target.value } : r))}
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="pr-2 py-1">
                            <input required type="number" min="0.01" step="0.01" placeholder="0.00" value={row.amount}
                              onChange={e => setRepayRows(rows => rows.map((r, j) => j === i ? { ...r, amount: e.target.value } : r))}
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="pr-2 py-1">
                            <input type="text" placeholder="Optional" value={row.notes}
                              onChange={e => setRepayRows(rows => rows.map((r, j) => j === i ? { ...r, notes: e.target.value } : r))}
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="py-1 text-center">
                            {repayRows.length > 1 && (
                              <button type="button" onClick={() => setRepayRows(rows => rows.filter((_, j) => j !== i))}
                                className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button type="button" onClick={() => setRepayRows(rows => [...rows, blankRepay()])}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    + Add row
                  </button>
                  <div className="flex items-center gap-3">
                    {repayRows.length > 1 && (
                      <span className="text-xs text-gray-500">
                        Total: <strong className="font-mono text-green-600 dark:text-green-400">
                          ${repayRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0).toFixed(2)}
                        </strong>
                      </span>
                    )}
                    <button type="submit" disabled={submitting}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap">
                      {submitting ? 'Saving…' : `Save ${repayRows.length > 1 ? `${repayRows.length} Repayments` : 'Repayment'}`}
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Date</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Description</th>
                    <th className="px-4 py-3 text-right text-gray-500 font-medium">Amount</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Added By</th>
                    {canEdit && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loan.preLockRepayments.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No prior repayments recorded</td></tr>
                  ) : (
                    loan.preLockRepayments.map(rep => (
                      <tr key={rep.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{fmtDate(rep.repaymentDate)}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                          {rep.description}
                          {rep.notes && <span className="block text-xs text-gray-400">{rep.notes}</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-green-600 dark:text-green-400">{fmt(rep.amount)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{rep.creator.name}</td>
                        {canEdit && (
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => deleteRepayment(rep.id)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {loan.preLockRepayments.length > 0 && (
                  <tfoot className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right">Total Prior Repayments</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-green-600 dark:text-green-400">{fmt(summary.totalPreLockRepayments)}</td>
                      <td colSpan={canEdit ? 2 : 1} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ── Withdrawals tab ──────────────────────────────────────────────── */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
            {/* Manager: submit withdrawal (LOCKED only, 1 per month) */}
            {isManager && isLocked && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Request a Withdrawal</h3>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Available to withdraw</p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{fmt(summary.availableToWithdraw)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Maximum one withdrawal per calendar month. Request must not exceed available amount.</p>
                <form onSubmit={submitWithdrawal} className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Amount</label>
                    <input
                      required
                      type="number"
                      min="0.01"
                      max={summary.availableToWithdraw}
                      step="0.01"
                      placeholder="0.00"
                      value={withdrawForm.requestedAmount}
                      onChange={e => setWithdrawForm(f => ({ ...f, requestedAmount: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 w-40"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
                    <input
                      type="text"
                      placeholder="Reason or reference"
                      value={withdrawForm.notes}
                      onChange={e => setWithdrawForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || summary.availableToWithdraw <= 0}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {submitting ? 'Submitting…' : 'Submit Request'}
                  </button>
                </form>
              </div>
            )}

            {/* Withdrawals table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Request #</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Month</th>
                    <th className="px-4 py-3 text-right text-gray-500 font-medium">Requested</th>
                    <th className="px-4 py-3 text-right text-gray-500 font-medium">Approved</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Notes</th>
                    {isAdmin && <th className="px-4 py-3 text-left text-gray-500 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loan.withdrawalRequests.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No withdrawal requests yet</td></tr>
                  ) : (
                    loan.withdrawalRequests.map(w => (
                      <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{w.requestNumber}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{w.requestMonth}</td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(w.requestedAmount)}</td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(w.approvedAmount)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${WITHDRAWAL_STATUS_COLORS[w.status]}`}>{w.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {w.rejectionReason ?? w.notes ?? '—'}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-xs">
                            {w.status === 'PENDING' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { setApproveModal({ requestId: w.id, requestedAmount: w.requestedAmount }); setApproveAmount(w.requestedAmount) }}
                                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => setRejectModal({ requestId: w.id })}
                                  className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                            {w.status === 'APPROVED' && (
                              <button
                                onClick={async () => { if (await confirm({ title: 'Mark as Paid', description: `Mark this withdrawal as paid? Amount: $${Number(w.approvedAmount).toFixed(2)}`, confirmText: 'Mark Paid' })) adminWithdrawalAction(w.id, 'pay') }}
                                className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                              >
                                Mark Paid
                              </button>
                            )}
                            {w.status === 'PAID' && (
                              <span className="text-gray-500 dark:text-gray-400">Paid {fmtDate(w.paidAt)}</span>
                            )}
                            {w.status === 'REJECTED' && (
                              <span className="text-gray-500 dark:text-gray-400">Rejected</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ── Approve modal ─────────────────────────────────────────────────── */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Approve Withdrawal</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Requested: <strong>{fmt(approveModal.requestedAmount)}</strong>. Enter the approved amount.
            </p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Approved Amount</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={approveAmount}
                onChange={e => setApproveAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setApproveModal(null); setApproveAmount('') }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={actionSubmitting || !approveAmount}
                onClick={() => adminWithdrawalAction(approveModal.requestId, 'approve', { approvedAmount: parseFloat(approveAmount) })}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {actionSubmitting ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject modal ──────────────────────────────────────────────────── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Reject Withdrawal</h3>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Reason for rejection</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Explain why this request is being rejected…"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setRejectModal(null); setRejectReason('') }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={actionSubmitting || !rejectReason.trim()}
                onClick={() => adminWithdrawalAction(rejectModal.requestId, 'reject', { rejectionReason: rejectReason })}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionSubmitting ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

    </ContentLayout>
  )
}
