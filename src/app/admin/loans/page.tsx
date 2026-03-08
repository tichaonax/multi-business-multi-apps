'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { hasPermission } from '@/lib/permission-utils'
import { useToastContext } from '@/components/ui/toast'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'

interface Loan {
  id: string
  loanNumber: string
  description: string
  totalAmount: string
  lockedBalance: string | null
  lenderName: string
  status: string
  createdAt: string
  managedBy: { id: string; name: string; email: string }
  managers: { userId: string; user: { id: string; name: string; email: string } }[]
  expenseAccount: { id: string; accountNumber: string; balance: string } | null
  _count: { expenseEntries: number; withdrawalRequests: number }
}

interface UserOption {
  id: string
  name: string
  email: string
  phone: string | null
}

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

function fmt(val: string | number | null | undefined) {
  if (val == null) return '—'
  return `$${Number(val).toFixed(2)}`
}

export default function AdminLoansPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToastContext()

  const [loans, setLoans] = useState<Loan[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [lenderIsEmployee, setLenderIsEmployee] = useState(false)
  const [lenderSearch, setLenderSearch] = useState('')
  const [lenderDropdownOpen, setLenderDropdownOpen] = useState(false)

  const [form, setForm] = useState({
    description: '',
    totalAmount: '',
    lenderName: '',
    lenderContactInfo: '',
    lenderUserId: '',
    managedByUserId: '',
    additionalManagerIds: [] as string[],
    notes: '',
  })

  const currentUser = session?.user as any
  const canManage = currentUser && hasPermission(currentUser, 'canManageBusinessLoans')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    if (!canManage) { router.push('/'); return }
    fetchLoans()
    fetchUsers()
  }, [session, status])

  async function fetchLoans() {
    setLoading(true)
    try {
      const res = await fetch('/api/business-loans', { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load loans')
      setLoans(json.loans)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' })
      const json = await res.json()
      if (res.ok) setUsers((json as any[]).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone ?? u.employees?.phone ?? null,
      })))
    } catch {}
  }

  async function handleCreateLoan(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description || !form.lenderName || !form.lenderContactInfo || !form.managedByUserId) {
      toast.error('Description, lender name, lender phone, and managed-by user are required')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/business-loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          description: form.description,
          totalAmount: form.totalAmount !== '' ? parseFloat(form.totalAmount) : 0,
          lenderName: form.lenderName,
          lenderContactInfo: form.lenderContactInfo || undefined,
          lenderUserId: form.lenderUserId || undefined,
          managedByUserId: form.managedByUserId,
          additionalManagerIds: form.additionalManagerIds.length > 0 ? form.additionalManagerIds : undefined,
          notes: form.notes || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create loan')
      toast.push('Loan created', { type: 'success' })
      setShowNewModal(false)
      setForm({ description: '', totalAmount: '', lenderName: '', lenderContactInfo: '', lenderUserId: '', managedByUserId: '', additionalManagerIds: [], notes: '' })
      setLenderIsEmployee(false)
      setLenderSearch('')

      fetchLoans()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleApproveLock(loanId: string, loanNumber: string) {
    if (!confirm(`Approve lock for ${loanNumber}? This cannot be undone. The current balance will be snapshot and no further expense entries will be allowed.`)) return
    setApprovingId(loanId)
    try {
      const res = await fetch(`/api/business-loans/${loanId}/approve-lock`, {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to approve lock')
      toast.push('Lock approved — balance snapshot taken', { type: 'success' })
      fetchLoans()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setApprovingId(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }

  const lockRequestedLoans = loans.filter(l => l.status === 'LOCK_REQUESTED')

  return (
    <ContentLayout title="Business Loan Repayments">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Business Loan Repayments</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage informal business loans and track auto-deposit repayments.
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + New Loan
          </button>
        </div>

        {/* Lock-requested alert banner */}
        {lockRequestedLoans.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl p-4">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
              ⚠️ {lockRequestedLoans.length} loan{lockRequestedLoans.length > 1 ? 's' : ''} awaiting lock approval
            </p>
            <div className="space-y-1">
              {lockRequestedLoans.map(l => (
                <div key={l.id} className="flex items-center justify-between">
                  <span className="text-sm text-yellow-700 dark:text-yellow-400">
                    {l.loanNumber} — {l.lenderName} — managed by {l.managedBy.name}
                  </span>
                  <button
                    onClick={() => handleApproveLock(l.id, l.loanNumber)}
                    disabled={approvingId === l.id}
                    className="ml-4 px-3 py-1 bg-yellow-600 text-white rounded-lg text-xs font-medium hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                  >
                    {approvingId === l.id ? 'Approving…' : 'Approve Lock'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loans table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Loan #</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Lender</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Description</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Managed By</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Total Borrowed</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Locked Balance</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Current Balance</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400 dark:text-gray-500">
                    No loans yet. Click <strong>+ New Loan</strong> to create one.
                  </td>
                </tr>
              ) : (
                loans.map(loan => (
                  <tr key={loan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{loan.loanNumber}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{loan.lenderName}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-xs truncate">{loan.description}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      <div className="flex flex-wrap gap-1">
                        {(loan.managers ?? [{ userId: loan.managedBy.id, user: loan.managedBy }]).map(m => (
                          <span key={m.userId} className="inline-flex px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300">
                            {m.user.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[loan.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[loan.status] ?? loan.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-gray-100">{fmt(loan.totalAmount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-gray-100">{fmt(loan.lockedBalance)}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-gray-100">
                      {loan.expenseAccount ? fmt(loan.expenseAccount.balance) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/loans/${loan.id}`}
                          className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          View
                        </Link>
                        {loan.status === 'LOCK_REQUESTED' && (
                          <button
                            onClick={() => handleApproveLock(loan.id, loan.loanNumber)}
                            disabled={approvingId === loan.id}
                            className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg text-xs hover:bg-yellow-200 dark:hover:bg-yellow-800/40 disabled:opacity-50 transition-colors"
                          >
                            {approvingId === loan.id ? 'Approving…' : 'Approve Lock'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Loan Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New Business Loan</h2>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">×</button>
            </div>
            <form onSubmit={handleCreateLoan} className="px-6 py-5 space-y-4">

              {/* Description — full width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="What was this loan used for?"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Two-column grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* LEFT — Lender info */}
                <div className="space-y-4">

                  {/* Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={lenderIsEmployee}
                      onChange={e => {
                        setLenderIsEmployee(e.target.checked)
                        setLenderSearch('')
                        setForm(f => ({ ...f, lenderName: '', lenderContactInfo: '', lenderUserId: '' }))
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Lender is a system user / employee</span>
                  </label>

                  {/* Lender Name — combobox or free text */}
                  {lenderIsEmployee ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Lender (System User) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search by name or email…"
                          value={lenderSearch}
                          autoComplete="off"
                          required={!form.lenderName}
                          onFocus={() => setLenderDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setLenderDropdownOpen(false), 150)}
                          onChange={e => {
                            setLenderSearch(e.target.value)
                            setLenderDropdownOpen(true)
                            // Clear selection if user edits after picking
                            setForm(f => ({ ...f, lenderName: '', lenderContactInfo: '', lenderUserId: '' }))
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        {form.lenderName && (
                          <div className="mt-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">{form.lenderName}</span>
                            <button
                              type="button"
                              onClick={() => { setForm(f => ({ ...f, lenderName: '', lenderContactInfo: '', lenderUserId: '' })); setLenderSearch('') }}
                              className="text-blue-400 hover:text-blue-600 ml-2"
                            >×</button>
                          </div>
                        )}
                        {lenderDropdownOpen && !form.lenderName && (
                          <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {users
                              .filter(u =>
                                !lenderSearch ||
                                u.name.toLowerCase().includes(lenderSearch.toLowerCase()) ||
                                u.email.toLowerCase().includes(lenderSearch.toLowerCase())
                              )
                              .map(u => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onMouseDown={() => {
                                    setForm(f => ({
                                      ...f,
                                      lenderName: u.name,
                                      lenderContactInfo: u.phone ?? '',
                                      lenderUserId: u.id,
                                    }))
                                    setLenderSearch(u.name)
                                    setLenderDropdownOpen(false)
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between gap-2"
                                >
                                  <div>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{u.name}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{u.email}</span>
                                  </div>
                                  {u.phone && <span className="text-xs text-gray-400 shrink-0">{u.phone}</span>}
                                </button>
                              ))}
                            {users.filter(u =>
                              !lenderSearch ||
                              u.name.toLowerCase().includes(lenderSearch.toLowerCase()) ||
                              u.email.toLowerCase().includes(lenderSearch.toLowerCase())
                            ).length === 0 && (
                              <p className="px-3 py-2 text-sm text-gray-400">No users found</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lender Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="Name of the person who lent the money"
                        value={form.lenderName}
                        onChange={e => setForm(f => ({ ...f, lenderName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <PhoneNumberInput
                      label="Lender Phone Number"
                      required
                      value={form.lenderContactInfo}
                      onChange={(fullNumber) => setForm(f => ({ ...f, lenderContactInfo: fullNumber }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Amount Borrowed</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.totalAmount}
                      onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">Informational — can be entered later.</p>
                  </div>

                  {!lenderIsEmployee && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lender User Account (optional)</label>
                      <select
                        value={form.lenderUserId}
                        onChange={e => setForm(f => ({ ...f, lenderUserId: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">— None —</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-400 mt-1">Can view repayment progress in read-only mode</p>
                    </div>
                  )}
                </div>

                {/* RIGHT — Manager / access */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Assigned User <span className="text-red-500">*</span></label>
                    <select
                      required
                      value={form.managedByUserId}
                      onChange={e => setForm(f => ({ ...f, managedByUserId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">— Select user —</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Manages expenses &amp; repayments</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Managers</label>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-40 overflow-y-auto bg-white dark:bg-gray-700">
                      {users
                        .filter(u => u.id !== form.managedByUserId)
                        .map(u => (
                          <label key={u.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.additionalManagerIds.includes(u.id)}
                              onChange={e => setForm(f => ({
                                ...f,
                                additionalManagerIds: e.target.checked
                                  ? [...f.additionalManagerIds, u.id]
                                  : f.additionalManagerIds.filter(id => id !== u.id),
                              }))}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-gray-800 dark:text-gray-200">{u.name}</span>
                          </label>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">All selected users can add/delete expenses and repayments</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                    <textarea
                      rows={4}
                      placeholder="Any additional context..."
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Creating…' : 'Create Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ContentLayout>
  )
}
