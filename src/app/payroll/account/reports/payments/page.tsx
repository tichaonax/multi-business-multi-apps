'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import Link from 'next/link'

interface Payment {
  id: string
  employeeNumber: string
  employeeName: string
  amount: number
  netAmount: number | null
  paymentType: string
  paymentDate: string
  status: string
  notes: string | null
  createdBy: string
  signedBy: string | null
  completedBy: string | null
}

interface Summary {
  totalPayments: number
  totalAmount: number
  byStatus: Record<string, { count: number; amount: number }>
  byPaymentType: Record<string, { count: number; amount: number }>
}

function typeLabel(t: string) {
  switch (t) {
    case 'SALARY': return 'Salary Payment'
    case 'LOAN_DISBURSEMENT': return 'Loan Disbursement'
    case 'ADVANCE': return 'Salary Advance'
    case 'BONUS': return 'Bonus Payment'
    case 'COMMISSION': return 'Commission'
    default: return t
  }
}

function typeBadge(t: string) {
  const base = 'px-2 py-0.5 text-xs rounded-full font-medium'
  switch (t) {
    case 'SALARY': return `${base} bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300`
    case 'LOAN_DISBURSEMENT': return `${base} bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300`
    case 'ADVANCE': return `${base} bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300`
    default: return `${base} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300`
  }
}

function statusBadge(s: string) {
  const base = 'px-2 py-0.5 text-xs rounded-full font-medium'
  switch (s) {
    case 'COMPLETED': return `${base} bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300`
    case 'SIGNED': return `${base} bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300`
    case 'PENDING': return `${base} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300`
    default: return `${base} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300`
  }
}

export default function PaymentRegisterPage() {
  const { status } = useSession()
  const router = useRouter()

  const [payments, setPayments] = useState<Payment[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [paymentType, setPaymentType] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const LIMIT = 50

  const applyPreset = (p: string) => {
    const today = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const d = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`
    if (p === 'thisMonth') { setStartDate(d(new Date(today.getFullYear(), today.getMonth(), 1))); setEndDate(d(today)) }
    if (p === 'lastMonth') { setStartDate(d(new Date(today.getFullYear(), today.getMonth()-1, 1))); setEndDate(d(new Date(today.getFullYear(), today.getMonth(), 0))) }
    if (p === 'thisYear')  { setStartDate(`${today.getFullYear()}-01-01`); setEndDate(d(today)) }
    setPage(0)
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') load()
  }, [status, startDate, endDate, paymentType, statusFilter, page])

  const buildParams = (extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({ limit: String(LIMIT), offset: String(page * LIMIT) })
    if (startDate) p.set('startDate', startDate)
    if (endDate) p.set('endDate', endDate)
    if (paymentType) p.set('paymentType', paymentType)
    if (statusFilter) p.set('status', statusFilter)
    Object.entries(extra).forEach(([k, v]) => p.set(k, v))
    return p
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll/account/reports?${buildParams()}`, { credentials: 'include' })
      if (res.ok) {
        const d = await res.json()
        setPayments(d.data.payments || [])
        setSummary(d.data.summary || null)
        setTotal(d.data.pagination?.total || 0)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/payroll/account/reports?${buildParams({ format: 'csv' })}`, { credentials: 'include' })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payroll-payments-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setExporting(false)
    }
  }

  const clear = () => { setStartDate(''); setEndDate(''); setPaymentType(''); setStatusFilter(''); setPage(0) }

  if (status === 'loading') return null

  return (
    <ContentLayout title="📋 Payment Register" subtitle="All payroll payments with full detail">
      <div className="space-y-6">
        <Link href="/payroll/account/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Reports Hub
        </Link>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          {/* Quick date presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            {['This Month','Last Month','This Year'].map((label, i) => {
              const keys = ['thisMonth','lastMonth','thisYear']
              return (
                <button key={label} onClick={() => applyPreset(keys[i])}
                  className="px-3 py-1 text-xs rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 transition-colors">
                  {label}
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">From</label>
              <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(0) }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">To</label>
              <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(0) }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Payment Type</label>
              <select value={paymentType} onChange={e => { setPaymentType(e.target.value); setPage(0) }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="">All Types</option>
                <option value="SALARY">Salary Payment</option>
                <option value="LOAN_DISBURSEMENT">Loan Disbursement</option>
                <option value="ADVANCE">Salary Advance</option>
                <option value="BONUS">Bonus</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="SIGNED">Signed</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={clear} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">Clear filters</button>
            <div className="flex-1" />
            <button onClick={handleExport} disabled={exporting}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {exporting ? 'Exporting…' : '⬇ Export CSV'}
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-blue-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Records</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{total}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-gray-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Gross</p>
              <p className="text-xl font-bold text-gray-700 dark:text-gray-300">{fmt(summary.totalAmount)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-green-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Salary Payments</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{fmt(summary.byPaymentType?.SALARY?.amount || 0)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-amber-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Loan Disbursements</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{fmt(summary.byPaymentType?.LOAN_DISBURSEMENT?.amount || 0)}</p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading…</div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">No payments found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      {['Employee', 'Type', 'Gross', 'Net Pay', 'Date', 'Status', 'Processed By'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{p.employeeName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{p.employeeNumber}</p>
                        </td>
                        <td className="px-4 py-3"><span className={typeBadge(p.paymentType)}>{typeLabel(p.paymentType)}</span></td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{fmt(p.amount)}</td>
                        <td className="px-4 py-3 font-medium text-green-600 dark:text-green-400">
                          {p.netAmount != null ? fmt(p.netAmount) : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {new Date(p.paymentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3"><span className={statusBadge(p.status)}>{p.status}</span></td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{p.createdBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {total > LIMIT && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total}</span>
                  <div className="flex gap-2">
                    <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-40">Previous</button>
                    <button disabled={(page + 1) * LIMIT >= total} onClick={() => setPage(p => p + 1)}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ContentLayout>
  )
}
