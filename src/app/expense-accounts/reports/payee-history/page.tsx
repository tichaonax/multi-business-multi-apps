'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getEffectivePermissions } from '@/lib/permission-utils'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlatPayee {
  id: string
  type: string
  name: string
  subtitle?: string
}

interface Payment {
  id: string
  amount: number
  paymentDate: string
  status: string
  notes?: string | null
  receiptNumber?: string | null
  category?: { name: string } | null
  expenseAccount?: { accountName: string } | null
}

interface PayeeSummary {
  payee: { id: string; type: string; name: string; notes?: string | null; email?: string | null; phone?: string | null }
  totalPaid: number
  paymentCount: number
  payments: Payment[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYEE_TYPE_LABELS: Record<string, string> = {
  EMPLOYEE: 'Employee',
  PERSON: 'Person',
  SUPPLIER: 'Supplier',
  BUSINESS: 'Business',
  USER: 'User',
  CONTRACTOR: 'Contractor',
}

const PAYEE_TYPE_COLORS: Record<string, string> = {
  EMPLOYEE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  PERSON: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  SUPPLIER: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  BUSINESS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  USER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  CONTRACTOR: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toISODate(d: Date) {
  return d.toISOString().split('T')[0]
}

function defaultDateRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return { start, end }
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYEE_TYPE_COLORS[type] || 'bg-gray-100 text-gray-600'}`}>
      {PAYEE_TYPE_LABELS[type] || type}
    </span>
  )
}

// ─── Payee Selector ──────────────────────────────────────────────────────────

function PayeeSelector({ payees, selected, onSelect }: {
  payees: FlatPayee[]
  selected: FlatPayee | null
  onSelect: (p: FlatPayee | null) => void
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return payees
    const q = search.toLowerCase()
    return payees.filter(p => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || (p.subtitle || '').toLowerCase().includes(q))
  }, [payees, search])

  const grouped = useMemo(() => {
    const g: Record<string, FlatPayee[]> = {}
    for (const p of filtered) {
      if (!g[p.type]) g[p.type] = []
      g[p.type].push(p)
    }
    return g
  }, [filtered])

  return (
    <div ref={ref} className="relative">
      <div
        className="flex items-center gap-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        {selected ? (
          <>
            <TypeBadge type={selected.type} />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1">{selected.name}</span>
            <button
              onClick={e => { e.stopPropagation(); onSelect(null); setSearch('') }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
            >×</button>
          </>
        ) : (
          <span className="text-sm text-gray-400 flex-1">Search for a payee...</span>
        )}
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-72 flex flex-col">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Type to search..."
              className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-400 text-center">No payees found</div>
            ) : (
              Object.entries(grouped).map(([type, items]) => (
                <div key={type}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase bg-gray-50 dark:bg-gray-900/50">
                    {PAYEE_TYPE_LABELS[type] || type}s
                  </div>
                  {items.map(p => (
                    <button
                      key={`${p.type}-${p.id}`}
                      onClick={() => { onSelect(p); setOpen(false); setSearch('') }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2"
                    >
                      <TypeBadge type={p.type} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 dark:text-gray-100 font-medium truncate">{p.name}</div>
                        {p.subtitle && <div className="text-xs text-gray-400 truncate">{p.subtitle}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PayeePaymentHistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [allPayees, setAllPayees] = useState<FlatPayee[]>([])
  const [loadingPayees, setLoadingPayees] = useState(true)
  const [selectedPayee, setSelectedPayee] = useState<FlatPayee | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange())
  const [allTime, setAllTime] = useState(false)

  const [summary, setSummary] = useState<PayeeSummary | null>(null)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentSearch, setPaymentSearch] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    const perms = getEffectivePermissions(session?.user)
    if (!perms.canViewExpenseReports) { router.push('/expense-accounts'); return }
    loadPayees()
  }, [status, session])

  useEffect(() => {
    if (!selectedPayee) { setSummary(null); setPaymentError(null); return }
    loadPayments()
  }, [selectedPayee, dateRange, allTime])

  const loadPayees = async () => {
    try {
      const res = await fetch('/api/expense-account/payees', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      const d = data.data || {}

      const flat: FlatPayee[] = [
        ...(d.employees || []).map((e: any) => ({ id: e.id, type: 'EMPLOYEE', name: e.fullName || e.name, subtitle: e.jobTitle?.title })),
        ...(d.persons || []).map((p: any) => ({ id: p.id, type: 'PERSON', name: p.fullName || p.name, subtitle: p.nationalId })),
        ...(d.suppliers || []).map((s: any) => ({ id: s.id, type: 'SUPPLIER', name: s.name, subtitle: s.businessType })),
        ...(d.businesses || []).map((b: any) => ({ id: b.id, type: 'BUSINESS', name: b.name || b.businessName })),
        ...(d.users || []).map((u: any) => ({ id: u.id, type: 'USER', name: u.name || u.fullName, subtitle: u.email })),
        ...(d.contractors || []).map((c: any) => ({ id: c.id, type: 'CONTRACTOR', name: c.fullName || c.name })),
      ]

      flat.sort((a, b) => a.name.localeCompare(b.name))
      setAllPayees(flat)

      // Auto-select from URL params (e.g. ?payeeType=PERSON&payeeId=xxx&payeeName=xxx&allTime=true)
      const urlType = searchParams.get('payeeType')
      const urlId = searchParams.get('payeeId')
      const urlName = searchParams.get('payeeName')
      if (searchParams.get('allTime') === 'true') setAllTime(true)
      if (urlType && urlId) {
        // Prefer exact type+id match; fall back to id-only match (handles PERSON vs CONTRACTOR mismatch)
        const match = flat.find(p => p.type === urlType && p.id === urlId)
          || flat.find(p => p.id === urlId)
        if (match) {
          setSelectedPayee(match)
        } else if (urlName) {
          // Payee not in list (e.g. different business scope) — create a minimal entry
          setSelectedPayee({ id: urlId, type: urlType, name: urlName })
        }
      }
    } finally {
      setLoadingPayees(false)
    }
  }

  const loadPayments = async () => {
    if (!selectedPayee) return
    setLoadingPayments(true)
    setPaymentError(null)
    setSummary(null)
    try {
      const params = new URLSearchParams()
      if (!allTime) {
        params.set('startDate', toISODate(dateRange.start))
        params.set('endDate', toISODate(dateRange.end))
      }
      params.set('limit', '200')

      const res = await fetch(
        `/api/expense-account/payees/${selectedPayee.type}/${selectedPayee.id}/payments?${params}`,
        { credentials: 'include' }
      )
      if (res.ok) {
        const data = await res.json()
        setSummary(data.data || null)
      } else {
        const errData = await res.json().catch(() => ({}))
        const msg = errData?.error || `Failed to load payments (HTTP ${res.status})`
        setPaymentError(msg)
      }
    } catch {
      setPaymentError('Network error — could not load payments')
    } finally {
      setLoadingPayments(false)
    }
  }

  const handleExportCsv = () => {
    if (!filteredPayments.length) return
    const header = 'Date,Amount,Category,Receipt #,Account,Status,Notes'
    const lines = filteredPayments.map(p =>
      [
        fmtDate(p.paymentDate),
        p.amount.toFixed(2),
        p.category?.name || '',
        p.receiptNumber || '',
        p.expenseAccount?.accountName || '',
        p.status,
        (p.notes || '').replace(/,/g, ';'),
      ].join(',')
    )
    const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(selectedPayee?.name || 'payee').replace(/\s+/g, '_')}_payment_history.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const payments = summary?.payments || []

  const filteredPayments = useMemo(() => {
    const q = paymentSearch.trim().toLowerCase()
    if (!q) return payments
    return payments.filter(p =>
      fmtDate(p.paymentDate).toLowerCase().includes(q) ||
      p.amount.toFixed(2).includes(q) ||
      (p.category?.name || '').toLowerCase().includes(q) ||
      (p.receiptNumber || '').toLowerCase().includes(q) ||
      (p.expenseAccount?.accountName || '').toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q) ||
      (p.notes || '').toLowerCase().includes(q)
    )
  }, [payments, paymentSearch])

  return (
    <ContentLayout title="Payee Payment History" subtitle="Full payment history for any recipient in the system">
      <div className="space-y-5">
        <Link href="/expense-accounts/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Reports Hub
        </Link>

        {/* Payee selector */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Select Payee</label>
            {loadingPayees ? (
              <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
            ) : (
              <PayeeSelector payees={allPayees} selected={selectedPayee} onSelect={setSelectedPayee} />
            )}
          </div>
          {/* Supplier notes — shown inline below the selected payee name */}
          {selectedPayee?.type === 'SUPPLIER' && summary?.payee?.notes && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
              <div className="flex items-start gap-2">
                <span className="text-amber-500 dark:text-amber-400 text-base mt-0.5">📋</span>
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-0.5">Supplier Notes</p>
                  <p className="text-sm text-amber-800 dark:text-amber-200 whitespace-pre-line">{summary.payee.notes}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Date filter */}
        <DateRangeSelector
          value={dateRange}
          onChange={setDateRange}
          showAllTime
          allTime={allTime}
          onAllTimeChange={setAllTime}
        />

        {/* Content — only shown after payee is selected */}
        {!selectedPayee ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500 space-y-2">
            <svg className="w-12 h-12 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm">Select a payee above to view their payment history</p>
          </div>
        ) : paymentError ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 text-center space-y-2">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">{paymentError}</p>
            <p className="text-xs text-red-500 dark:text-red-500">Try selecting the payee again or contact support if the issue persists.</p>
          </div>
        ) : loadingPayments ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 border-l-4 border-l-red-500">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Paid</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{fmt(summary?.totalPaid ?? 0)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 border-l-4 border-l-blue-500">
                <p className="text-xs text-gray-500 dark:text-gray-400">Payments</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{summary?.paymentCount ?? 0}</p>
              </div>
            </div>

            {/* Payments table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Table header: name + search + export */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {selectedPayee.name}
                    </h3>
                    <TypeBadge type={selectedPayee.type} />
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {paymentSearch ? `${filteredPayments.length} of ${payments.length}` : `${payments.length}`} payment{payments.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {payments.length > 0 && (
                    <button
                      onClick={handleExportCsv}
                      className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shrink-0"
                    >
                      Export CSV
                    </button>
                  )}
                </div>
                {payments.length > 0 && (
                  <input
                    type="text"
                    value={paymentSearch}
                    onChange={e => setPaymentSearch(e.target.value)}
                    placeholder="Search by date, amount, category, receipt #, account, status, notes…"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>

              {payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500 text-sm space-y-1">
                  <p>No payments found for the selected period.</p>
                  {!allTime && (
                    <p className="text-xs">Try enabling <span className="font-semibold">All Time</span> above to see all historical payments.</p>
                  )}
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500 text-sm space-y-1">
                  <p>No payments match <span className="font-semibold">&ldquo;{paymentSearch}&rdquo;</span>.</p>
                  <button onClick={() => setPaymentSearch('')} className="text-xs text-blue-500 hover:underline">Clear search</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Receipt #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Account</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredPayments.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmtDate(p.paymentDate)}</td>
                          <td className="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400 whitespace-nowrap">{fmt(p.amount)}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.category?.name || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{p.receiptNumber || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{p.expenseAccount?.accountName || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : p.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : p.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-xs truncate">{p.notes || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ContentLayout>
  )
}
