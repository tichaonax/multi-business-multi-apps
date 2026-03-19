'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'

interface ReversiblePayment {
  id: string
  amount: number
  status: string
  paymentDate: string
  notes: string | null
  payeeType: string
  payeeSupplier: { id: string; name: string } | null
  payeeEmployee: { id: string; fullName: string } | null
  payeeUser: { id: string; name: string } | null
  category: { name: string } | null
  createdAt: string
}

interface UserOption {
  id: string
  name: string
  email: string
}

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED:        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  PENDING_APPROVAL: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  APPROVED:         'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  PAID:             'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function payeeName(p: ReversiblePayment): string {
  if (p.payeeSupplier) return p.payeeSupplier.name
  if (p.payeeEmployee) return p.payeeEmployee.fullName
  if (p.payeeUser) return p.payeeUser.name
  return '—'
}

const DATE_RANGES = [
  { key: 'today',     label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7days',     label: '7 Days' },
  { key: '30days',    label: '30 Days' },
  { key: 'all',       label: 'All' },
] as const

export default function ReversePaymentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToastContext()
  const { businesses, isSystemAdmin, loading: bizLoading } = useBusinessPermissionsContext()

  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [businessSearch, setBusinessSearch] = useState('')
  const [users, setUsers] = useState<UserOption[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [requesterSearch, setRequesterSearch] = useState('')
  const [payments, setPayments] = useState<ReversiblePayment[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [reversalNote, setReversalNote] = useState('')
  const [paymentSearch, setPaymentSearch] = useState('')
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | '7days' | '30days' | 'all'>('all')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'loading' || bizLoading) return
    if (!session) { router.push('/auth/signin'); return }
    // Only system admins or users explicitly granted canReversePaymentsToPettyCash can access
    if (!isSystemAdmin) {
      const memberships: any[] = (session.user as any)?.businessMemberships || []
      const hasPermission = memberships.some(
        (m: any) => m.isActive && m.permissions?.canReversePaymentsToPettyCash === true
      )
      if (!hasPermission) router.push('/dashboard')
    }
  }, [session, status, bizLoading, isSystemAdmin, router])

  useEffect(() => {
    if (!selectedBusinessId) { setUsers([]); setSelectedUserId(''); setPayments([]); setRequesterSearch(''); return }
    setLoadingUsers(true)
    setSelectedUserId('')
    setRequesterSearch('')
    setPayments([])
    setSelectedIds(new Set())
    fetch(`/api/expense-account/reverse-to-petty-cash?businessId=${selectedBusinessId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        if (!json.success) throw new Error(json.error || 'Failed to load users')
        setUsers(json.data.users || [])
      })
      .catch(e => toast.error(e.message))
      .finally(() => setLoadingUsers(false))
  }, [selectedBusinessId])

  useEffect(() => {
    if (!selectedBusinessId || !selectedUserId) { setPayments([]); setSelectedIds(new Set()); return }
    setLoadingPayments(true)
    setSelectedIds(new Set())
    setPaymentSearch('')
    setDateRange('all')
    fetch(`/api/expense-account/reverse-to-petty-cash?businessId=${selectedBusinessId}&userId=${selectedUserId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        if (!json.success) throw new Error(json.error || 'Failed to load payments')
        setPayments(json.data.payments || [])
      })
      .catch(e => toast.error(e.message))
      .finally(() => setLoadingPayments(false))
  }, [selectedBusinessId, selectedUserId])

  // Date + search filtering
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const rangeStart: Date | null = (() => {
    if (dateRange === 'today') return startOfDay(now)
    if (dateRange === 'yesterday') { const y = new Date(now); y.setDate(y.getDate() - 1); return startOfDay(y) }
    if (dateRange === '7days') { const d = new Date(now); d.setDate(d.getDate() - 6); return startOfDay(d) }
    if (dateRange === '30days') { const d = new Date(now); d.setDate(d.getDate() - 29); return startOfDay(d) }
    return null
  })()
  const rangeEnd: Date | null = dateRange === 'yesterday' ? new Date(startOfDay(now).getTime() - 1) : null

  const visiblePayments = payments.filter(p => {
    const d = new Date(p.paymentDate)
    if (rangeStart && d < rangeStart) return false
    if (rangeEnd && d > rangeEnd) return false
    if (paymentSearch.trim()) {
      const q = paymentSearch.toLowerCase()
      if (!payeeName(p).toLowerCase().includes(q) &&
          !(p.notes || '').toLowerCase().includes(q) &&
          !(p.category?.name || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const toggleAll = () => {
    if (visiblePayments.every(p => selectedIds.has(p.id))) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(visiblePayments.map(p => p.id)))
    }
  }

  const selectedTotal = payments.filter(p => selectedIds.has(p.id)).reduce((s, p) => s + Number(p.amount), 0)

  const handleSubmit = async () => {
    if (selectedIds.size === 0) { toast.error('Select at least one payment'); return }
    if (!reversalNote.trim()) { toast.error('Reversal note is required'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/expense-account/reverse-to-petty-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paymentIds: [...selectedIds], reversalNote: reversalNote.trim(), businessId: selectedBusinessId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to reverse payments')
      toast.push(`Payments reversed. Petty cash request created for ${fmt(json.data.totalAmount)}.`, { type: 'success' })
      router.push(`/petty-cash/${json.data.pettyCashRequestId}`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    )
  }

  const activeBusinesses = businesses.filter(b => b.isActive && !b.isUmbrellaBusiness)
  const filteredBusinesses = activeBusinesses.filter(b => b.businessName.toLowerCase().includes(businessSearch.toLowerCase()))
  const selectedBusiness = activeBusinesses.find(b => b.businessId === selectedBusinessId)
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(requesterSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(requesterSearch.toLowerCase())
  )
  const selectedUser = users.find(u => u.id === selectedUserId)

  const isReadyToSubmit = selectedIds.size > 0 && reversalNote.trim().length > 0
  const showActionBar = selectedUserId && payments.length > 0

  return (
    <ContentLayout title="Reverse Payments to Petty Cash">
      <div className="max-w-5xl mx-auto">

        {/* ── Sticky action bar ─────────────────────────────────────────── */}
        {showActionBar && (
          <div className="sticky top-16 z-20 mb-6">
            <div className="rounded-2xl shadow-xl overflow-hidden border border-indigo-900">
              {/* Context breadcrumb — solid dark with bright text */}
              <div className="bg-indigo-900 px-5 py-2.5 flex items-center gap-2 text-xs font-semibold">
                <span className="bg-indigo-700 text-indigo-100 rounded px-2 py-0.5">{selectedBusiness?.businessName}</span>
                <span className="text-indigo-400">›</span>
                <span className="bg-indigo-700 text-indigo-100 rounded px-2 py-0.5">{selectedUser?.name}</span>
                <span className="text-indigo-400">›</span>
                <span className="text-indigo-300">{payments.length} reversible payment{payments.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Action row — light background for contrast */}
              <div className="bg-white dark:bg-gray-800 p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                {/* Live totals */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center min-w-[40px]">
                    <div className={`text-2xl font-bold tabular-nums leading-none ${selectedIds.size > 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-300 dark:text-gray-600'}`}>
                      {selectedIds.size}
                    </div>
                    <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wide">selected</div>
                  </div>
                  <div className="h-10 w-px bg-gray-200 dark:bg-gray-600" />
                  <div className="text-center">
                    <div className={`text-2xl font-bold tabular-nums leading-none ${selectedIds.size > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-300 dark:text-gray-600'}`}>
                      {fmt(selectedTotal)}
                    </div>
                    <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wide">total</div>
                  </div>
                  <div className="h-10 w-px bg-gray-200 dark:bg-gray-600 hidden sm:block" />
                </div>

                {/* Reversal note */}
                <div className="flex-1 w-full">
                  <input
                    type="text"
                    value={reversalNote}
                    onChange={e => setReversalNote(e.target.value)}
                    placeholder="Reversal note (required) — e.g. Payments submitted before services rendered..."
                    className="w-full px-3 py-2.5 border-2 border-gray-300 dark:border-gray-500 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !isReadyToSubmit}
                  className={`shrink-0 px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                    isReadyToSubmit && !submitting
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-md'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {submitting ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    '↩ Reverse & Create Petty Cash'
                  )}
                </button>
              </div>

              {/* Selection hint */}
              {selectedIds.size === 0 && (
                <div className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-5 pb-3 pt-0 text-xs text-gray-400 dark:text-gray-500">
                  Select payments below, add a note, then click Reverse.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-5">
          {/* Page title (only when action bar not shown yet) */}
          {!showActionBar && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reverse Payments to Petty Cash</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Select incorrectly submitted expense payments and convert them into a single petty cash request.
              </p>
            </div>
          )}

          {/* Info banner */}
          {!showActionBar && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-semibold">When to use this</p>
              <p>Use when a staff member submitted direct payment requests before services were rendered and the cashier incorrectly approved them. Converting to petty cash lets the requester record actual amounts and return any unused balance.</p>
              <p className="mt-1 text-xs opacity-80">Original payments are marked <strong>REVERSED</strong>. A new petty cash request is created in <strong>APPROVED</strong> status. No cash moves — funds already left the bucket.</p>
            </div>
          )}

          {/* Step 1 — Business */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/60">
              <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${selectedBusiness ? 'bg-indigo-600 text-white' : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'}`}>
                {selectedBusiness ? '✓' : '1'}
              </span>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Select Business</h2>
            </div>
            <div className="p-4">
              {selectedBusiness ? (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/50">
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-500 dark:text-indigo-400 text-base">🏢</span>
                    <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">{selectedBusiness.businessName}</span>
                  </div>
                  <button
                    onClick={() => { setSelectedBusinessId(''); setBusinessSearch(''); setUsers([]); setSelectedUserId(''); setPayments([]); setSelectedIds(new Set()); }}
                    className="text-xs text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-200 font-medium"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Search businesses..."
                    value={businessSearch}
                    onChange={e => setBusinessSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  {filteredBusinesses.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 py-1">No businesses match.</p>
                  ) : (
                    <ul className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60 max-h-44 overflow-y-auto">
                      {filteredBusinesses.map(b => (
                        <li key={b.businessId}>
                          <button
                            onClick={() => { setSelectedBusinessId(b.businessId); setBusinessSearch(''); }}
                            className="w-full text-left px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          >
                            {b.businessName}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Step 2 — Requester */}
          {selectedBusinessId && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/60">
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${selectedUser ? 'bg-indigo-600 text-white' : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'}`}>
                  {selectedUser ? '✓' : '2'}
                </span>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Select Requester</h2>
              </div>
              <div className="p-4">
                {loadingUsers ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-1">
                    <span className="inline-block w-3.5 h-3.5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
                    Loading users...
                  </div>
                ) : users.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-1">No users with reversible payments found for this business.</p>
                ) : selectedUser ? (
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/50">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-500 dark:text-indigo-400 text-base">👤</span>
                      <div>
                        <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">{selectedUser.name}</span>
                        <span className="text-xs text-indigo-500 dark:text-indigo-400 ml-2">{selectedUser.email}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedUserId(''); setRequesterSearch(''); setPayments([]); setSelectedIds(new Set()); }}
                      className="text-xs text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-200 font-medium"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={requesterSearch}
                      onChange={e => setRequesterSearch(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                    {filteredUsers.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 py-1">No requesters match.</p>
                    ) : (
                      <ul className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60 max-h-44 overflow-y-auto">
                        {filteredUsers.map(u => (
                          <li key={u.id}>
                            <button
                              onClick={() => { setSelectedUserId(u.id); setRequesterSearch(''); }}
                              className="w-full text-left px-3 py-2.5 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            >
                              <span className="font-medium text-gray-800 dark:text-gray-200">{u.name}</span>
                              <span className="text-gray-400 dark:text-gray-500 ml-2">{u.email}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3 — Payments */}
          {selectedUserId && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/60">
                <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">3</span>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Select Payments to Reverse</h2>
                {payments.length > 0 && (
                  <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 font-medium">{payments.length} total</span>
                )}
              </div>

              {loadingPayments ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-12">
                  <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
                  Loading payments...
                </div>
              ) : payments.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-3xl mb-2">📭</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No reversible payments found for this requester.</p>
                </div>
              ) : (
                <>
                  {/* Filter bar */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 flex flex-col sm:flex-row gap-2">
                    <div className="flex gap-1 flex-wrap">
                      {DATE_RANGES.map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setDateRange(key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            dateRange === key
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Search payee, notes, category..."
                      value={paymentSearch}
                      onChange={e => setPaymentSearch(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {visiblePayments.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-sm text-gray-400 dark:text-gray-500">No payments match the current filter.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-900/40 text-xs uppercase tracking-wide">
                            <th className="px-4 py-3 text-left">
                              <input
                                type="checkbox"
                                checked={visiblePayments.length > 0 && visiblePayments.every(p => selectedIds.has(p.id))}
                                onChange={toggleAll}
                                className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                              />
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400">Date</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400">Payee</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400">Notes</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400">Status</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-500 dark:text-gray-400">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                          {visiblePayments.map(p => {
                            const selected = selectedIds.has(p.id)
                            return (
                              <tr
                                key={p.id}
                                onClick={() => toggleSelect(p.id)}
                                className={`cursor-pointer transition-colors ${
                                  selected
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                                }`}
                              >
                                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleSelect(p.id)}
                                    className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                                  />
                                </td>
                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{fmtDate(p.paymentDate)}</td>
                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{payeeName(p)}</td>
                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{p.notes || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[p.status] || 'bg-gray-100 text-gray-600'}`}>
                                    {p.status.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className={`px-4 py-3 text-right font-semibold tabular-nums ${selected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-gray-100'}`}>
                                  {fmt(Number(p.amount))}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        {selectedIds.size > 0 && (
                          <tfoot>
                            <tr className="bg-indigo-50 dark:bg-indigo-900/20 border-t-2 border-indigo-200 dark:border-indigo-700">
                              <td colSpan={4} className="px-4 py-3 text-sm font-medium text-indigo-700 dark:text-indigo-300">
                                {selectedIds.size} payment{selectedIds.size !== 1 ? 's' : ''} selected
                              </td>
                              <td />
                              <td className="px-4 py-3 text-right text-base font-bold text-indigo-700 dark:text-indigo-300 tabular-nums">
                                {fmt(selectedTotal)}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </ContentLayout>
  )
}
