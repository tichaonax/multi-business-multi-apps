'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface MonthRow {
  key: string
  label: string
  count: number
  totalAmount: number
  salaryAmount: number
  loanAmount: number
  advanceAmount: number
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const fmtShort = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

export default function MonthlyTrendsPage() {
  const { status } = useSession()
  const router = useRouter()

  const [rows, setRows] = useState<MonthRow[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') load()
  }, [status, year])

  const load = async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({
        groupBy: 'month',
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      })
      const res = await fetch(`/api/payroll/account/reports?${p}`, { credentials: 'include' })
      if (!res.ok) return

      const d = await res.json()
      const grouped: Record<string, any> = d.data?.groupedData || {}

      const built: MonthRow[] = Object.entries(grouped).map(([key, g]: [string, any]) => {
        const payments: any[] = g.payments || []
        const [y, m] = key.split('-')
        const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        const salaryAmount = payments.filter((p: any) => p.paymentType === 'SALARY').reduce((s: number, p: any) => s + p.amount, 0)
        const loanAmount = payments.filter((p: any) => p.paymentType === 'LOAN_DISBURSEMENT').reduce((s: number, p: any) => s + p.amount, 0)
        const advanceAmount = payments.filter((p: any) => p.paymentType === 'ADVANCE').reduce((s: number, p: any) => s + p.amount, 0)
        return { key, label, count: g.count, totalAmount: g.totalAmount, salaryAmount, loanAmount, advanceAmount }
      })

      built.sort((a, b) => a.key.localeCompare(b.key)) // chronological for chart
      setRows(built)
    } finally {
      setLoading(false)
    }
  }

  const grandTotal = rows.reduce((s, r) => s + r.totalAmount, 0)
  const currentYear = new Date().getFullYear()

  // Chart data: chronological order (already sorted asc)
  const chartData = rows.map(r => ({
    month: r.label,
    Salary: r.salaryAmount,
    Loans: r.loanAmount,
    Advances: r.advanceAmount,
  }))

  // Table rows: newest first
  const tableRows = [...rows].reverse()

  if (status === 'loading') return null

  return (
    <ContentLayout title="📅 Monthly Trends" subtitle="Month-by-month payment summary">
      <div className="space-y-6">
        <Link href="/payroll/account/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Reports Hub
        </Link>

        {/* Year picker */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Year</label>
          <div className="flex items-center gap-2">
            <button onClick={() => setYear(y => y - 1)}
              className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">‹</button>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100 w-16 text-center">{year}</span>
            <button onClick={() => setYear(y => y + 1)} disabled={year >= currentYear}
              className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-700 dark:text-gray-300">›</button>
          </div>
          {!loading && rows.length > 0 && (
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">{year} total</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmt(grandTotal)}</p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">No payments recorded in {year}</div>
        ) : (
          <>
            {/* Stacked Bar Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Monthly Payment Breakdown — {year}</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} width={60} />
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="Salary"   stackId="a" fill="#3B82F6" name="Salary" radius={[0,0,0,0]} />
                  <Bar dataKey="Loans"    stackId="a" fill="#EF4444" name="Loans" />
                  <Bar dataKey="Advances" stackId="a" fill="#F97316" name="Advances" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* KPI summary row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-gray-400">
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Months</p>
                <p className="text-xl font-bold text-gray-700 dark:text-gray-300 mt-1">{rows.length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-blue-500">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Salary</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{fmtShort(rows.reduce((s, r) => s + r.salaryAmount, 0))}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-red-500">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Loans</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{fmtShort(rows.reduce((s, r) => s + r.loanAmount, 0))}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-orange-500">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Advances</p>
                <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">{fmtShort(rows.reduce((s, r) => s + r.advanceAmount, 0))}</p>
              </div>
            </div>

            {/* Table — newest first */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      {['Month', 'Payments', 'Salary', 'Loans', 'Advances', 'Total'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {tableRows.map(row => (
                      <tr key={row.key} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{row.label}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.count}</td>
                        <td className="px-4 py-3 text-blue-700 dark:text-blue-400">{row.salaryAmount > 0 ? fmt(row.salaryAmount) : '—'}</td>
                        <td className="px-4 py-3 text-red-700 dark:text-red-400">{row.loanAmount > 0 ? fmt(row.loanAmount) : '—'}</td>
                        <td className="px-4 py-3 text-orange-700 dark:text-orange-400">{row.advanceAmount > 0 ? fmt(row.advanceAmount) : '—'}</td>
                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">{fmt(row.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-700 border-t-2 border-gray-300 dark:border-gray-500">
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100" colSpan={2}>Year Total</td>
                      <td className="px-4 py-3 font-bold text-blue-700 dark:text-blue-400">{fmt(rows.reduce((s, r) => s + r.salaryAmount, 0))}</td>
                      <td className="px-4 py-3 font-bold text-red-700 dark:text-red-400">{fmt(rows.reduce((s, r) => s + r.loanAmount, 0))}</td>
                      <td className="px-4 py-3 font-bold text-orange-700 dark:text-orange-400">{fmt(rows.reduce((s, r) => s + r.advanceAmount, 0))}</td>
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">{fmt(grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </ContentLayout>
  )
}
