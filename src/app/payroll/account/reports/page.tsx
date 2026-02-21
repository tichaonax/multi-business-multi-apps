'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────
type Preset = 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear' | 'allTime' | 'custom'

interface Summary {
  totalPayments: number
  totalAmount: number
  byStatus: Record<string, { count: number; amount: number }>
  byPaymentType: Record<string, { count: number; amount: number }>
}

interface TopEarner {
  name: string
  employeeNumber: string
  totalAmount: number
  salaryAmount: number
  loanAmount: number
  advanceAmount: number
  count: number
}

interface MonthBar {
  month: string
  Salary: number
  Loans: number
  Advances: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

const fmtFull = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

function typeLabel(t: string) {
  const map: Record<string, string> = {
    SALARY: 'Salary', LOAN_DISBURSEMENT: 'Loans', ADVANCE: 'Advances',
    BONUS: 'Bonus', COMMISSION: 'Commission',
  }
  return map[t] ?? t
}

const PIE_COLORS: Record<string, string> = {
  SALARY: '#3B82F6', LOAN_DISBURSEMENT: '#EF4444',
  ADVANCE: '#F97316', BONUS: '#22C55E', COMMISSION: '#8B5CF6',
}

function getDateRange(preset: Preset, custom: { start: string; end: string }) {
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  if (preset === 'thisMonth') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    return { startDate: fmt(start), endDate: fmt(today) }
  }
  if (preset === 'lastMonth') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const end = new Date(today.getFullYear(), today.getMonth(), 0)
    return { startDate: fmt(start), endDate: fmt(end) }
  }
  if (preset === 'last3Months') {
    const start = new Date(today.getFullYear(), today.getMonth() - 2, 1)
    return { startDate: fmt(start), endDate: fmt(today) }
  }
  if (preset === 'thisYear') {
    return { startDate: `${today.getFullYear()}-01-01`, endDate: fmt(today) }
  }
  if (preset === 'custom') {
    return { startDate: custom.start, endDate: custom.end }
  }
  return { startDate: '', endDate: '' }
}

// ─── Report Nav Cards ─────────────────────────────────────────────────────────
const REPORT_CARDS = [
  { href: '/payroll/account/reports/payments',    emoji: '📋', title: 'Payment Register',    desc: 'Full list of all payments — filter, sort and export to CSV.',          color: 'border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10' },
  { href: '/payroll/account/reports/by-employee', emoji: '👤', title: 'By Employee',          desc: 'Per-employee totals: salary, loans, advances and grand total.',        color: 'border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10' },
  { href: '/payroll/account/reports/by-type',     emoji: '🏷️', title: 'By Payment Type',     desc: 'Salary vs loans vs advances — click any type to see individual rows.', color: 'border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10' },
  { href: '/payroll/account/reports/monthly',     emoji: '📅', title: 'Monthly Trends',       desc: 'Year-picker view of month-by-month totals with full breakdown.',       color: 'border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/10' },
  { href: '/payroll',                             emoji: '📄', title: 'Period Reports',        desc: 'Per-period: Payroll Register, PAYE, NSSA, NEC returns and payslips. Open a period → Reports tab.', color: 'border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10' },
  { href: '/payroll/account/reports/zimra',        emoji: '🏛️', title: 'ZIMRA Remittances',    desc: 'AIDS Levy and PAYE submission status across all periods. Process and track P2 submissions.', color: 'border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10' },
]

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'thisMonth',   label: 'This Month' },
  { key: 'lastMonth',   label: 'Last Month' },
  { key: 'last3Months', label: 'Last 3 Months' },
  { key: 'thisYear',    label: 'This Year' },
  { key: 'allTime',     label: 'All Time' },
  { key: 'custom',      label: 'Custom' },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function PayrollReportsHubPage() {
  const { status } = useSession()
  const router = useRouter()

  const [preset, setPreset] = useState<Preset>('thisMonth')
  const [custom, setCustom] = useState({ start: '', end: '' })

  const [accountBalance, setAccountBalance] = useState(0)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [topEarners, setTopEarners] = useState<TopEarner[]>([])
  const [monthlyBars, setMonthlyBars] = useState<MonthBar[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  const { startDate, endDate } = getDateRange(preset, custom)

  const loadData = useCallback(async () => {
    if (status !== 'authenticated') return
    if (preset === 'custom' && (!custom.start || !custom.end)) return

    setLoading(true)
    try {
      const dp = new URLSearchParams({ limit: '500' })
      if (startDate) dp.set('startDate', startDate)
      if (endDate) dp.set('endDate', endDate)

      const [accountRes, summaryRes, monthlyRes, empRes] = await Promise.all([
        fetch('/api/payroll/account', { credentials: 'include' }),
        fetch(`/api/payroll/account/reports?${dp}`, { credentials: 'include' }),
        fetch(`/api/payroll/account/reports?${dp}&groupBy=month`, { credentials: 'include' }),
        fetch(`/api/payroll/account/reports?${dp}&groupBy=employee`, { credentials: 'include' }),
      ])

      if (accountRes.ok) {
        const d = await accountRes.json()
        setAccountBalance(Number(d.data?.balance || 0))
      }

      if (summaryRes.ok) {
        const d = await summaryRes.json()
        setSummary(d.data?.summary || null)
      }

      if (monthlyRes.ok) {
        const d = await monthlyRes.json()
        const grouped: Record<string, any> = d.data?.groupedData || {}
        const bars: MonthBar[] = Object.entries(grouped)
          .map(([key, g]: [string, any]) => {
            const payments: any[] = g.payments || []
            const [y, m] = key.split('-')
            const label = new Date(Number(y), Number(m) - 1, 1)
              .toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            return {
              month: label,
              Salary:   payments.filter(p => p.paymentType === 'SALARY').reduce((s, p) => s + p.amount, 0),
              Loans:    payments.filter(p => p.paymentType === 'LOAN_DISBURSEMENT').reduce((s, p) => s + p.amount, 0),
              Advances: payments.filter(p => p.paymentType === 'ADVANCE').reduce((s, p) => s + p.amount, 0),
            }
          })
          .sort((a, b) => a.month.localeCompare(b.month))
        setMonthlyBars(bars)
      }

      if (empRes.ok) {
        const d = await empRes.json()
        const grouped: Record<string, any> = d.data?.groupedData || {}
        const earners: TopEarner[] = Object.entries(grouped)
          .map(([name, g]: [string, any]) => {
            const payments: any[] = g.payments || []
            return {
              name,
              employeeNumber: payments[0]?.employeeNumber || '',
              totalAmount:    g.totalAmount,
              count:          g.count,
              salaryAmount:   payments.filter(p => p.paymentType === 'SALARY').reduce((s, p) => s + p.amount, 0),
              loanAmount:     payments.filter(p => p.paymentType === 'LOAN_DISBURSEMENT').reduce((s, p) => s + p.amount, 0),
              advanceAmount:  payments.filter(p => p.paymentType === 'ADVANCE').reduce((s, p) => s + p.amount, 0),
            }
          })
          .sort((a, b) => b.totalAmount - a.totalAmount)
          .slice(0, 8)
        setTopEarners(earners)
      }
    } finally {
      setLoading(false)
    }
  }, [status, startDate, endDate, preset, custom])

  useEffect(() => { loadData() }, [loadData])

  // Pie chart data
  const pieData = summary
    ? Object.entries(summary.byPaymentType)
        .map(([type, v]) => ({ name: typeLabel(type), value: v.amount, type }))
        .filter(d => d.value > 0)
    : []

  const totalPaid = summary?.totalAmount || 0
  const maxEarner = topEarners[0]?.totalAmount || 1

  if (status === 'loading') return null

  return (
    <ContentLayout title="📊 Payroll Reports" subtitle="Analytics, comparisons and exports for all payroll activity">
      <div className="space-y-6">

        {/* Back */}
        <Link href="/payroll/account" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Payroll Account
        </Link>

        {/* ── Date Filter Bar ───────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`px-4 py-1.5 text-sm rounded-full border transition-colors ${
                  preset === p.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
            {preset === 'custom' && (
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="date" value={custom.start}
                  onChange={e => setCustom(c => ({ ...c, start: e.target.value }))}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <span className="text-gray-500 dark:text-gray-400 text-sm">to</span>
                <input
                  type="date" value={custom.end}
                  onChange={e => setCustom(c => ({ ...c, end: e.target.value }))}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-blue-500">
            <p className="text-xs text-gray-500 dark:text-gray-400">Account Balance</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{fmtFull(accountBalance)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-gray-400">
            <p className="text-xs text-gray-500 dark:text-gray-400">Payments</p>
            <p className="text-xl font-bold text-gray-700 dark:text-gray-300 mt-1">{loading ? '—' : summary?.totalPayments ?? 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-green-500">
            <p className="text-xs text-gray-500 dark:text-gray-400">Salary Paid</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{loading ? '—' : fmt(summary?.byPaymentType?.SALARY?.amount || 0)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-red-500">
            <p className="text-xs text-gray-500 dark:text-gray-400">Loans Disbursed</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{loading ? '—' : fmt(summary?.byPaymentType?.LOAN_DISBURSEMENT?.amount || 0)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-orange-500">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Paid Out</p>
            <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">{loading ? '—' : fmt(totalPaid)}</p>
          </div>
        </div>

        {/* ── Charts Row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Pie chart — payment type split */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Payment Type Breakdown</h3>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-gray-400">Loading…</div>
            ) : pieData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No payments in this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={PIE_COLORS[entry.type] || '#6B7280'} />
                    ))}
                  </Pie>
                  <ReTooltip formatter={(v: any) => fmtFull(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bar chart — monthly trends */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Monthly Payment Trends</h3>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-gray-400">Loading…</div>
            ) : monthlyBars.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data in this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyBars} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} width={55} />
                  <ReTooltip formatter={(v: any) => fmtFull(v)} />
                  <Legend />
                  <Bar dataKey="Salary"   stackId="a" fill="#3B82F6" radius={[0,0,0,0]} />
                  <Bar dataKey="Loans"    stackId="a" fill="#EF4444" />
                  <Bar dataKey="Advances" stackId="a" fill="#F97316" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Top Earners ───────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Top Earners — Highest Paid Employees
          </h3>
          {loading ? (
            <div className="text-gray-400 text-sm py-4">Loading…</div>
          ) : topEarners.length === 0 ? (
            <div className="text-gray-400 text-sm py-4">No payments in this period</div>
          ) : (
            <div className="space-y-3">
              {topEarners.map((e, i) => (
                <div key={e.name} className="flex items-center gap-4">
                  {/* Rank */}
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-yellow-400 text-yellow-900' :
                    i === 1 ? 'bg-gray-300 dark:bg-gray-500 text-gray-800 dark:text-gray-100' :
                    i === 2 ? 'bg-amber-600 text-white' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>{i + 1}</span>

                  {/* Name */}
                  <div className="w-40 flex-shrink-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{e.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{e.employeeNumber} · {e.count} payment{e.count !== 1 ? 's' : ''}</p>
                  </div>

                  {/* Bar */}
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${(e.totalAmount / maxEarner) * 100}%` }}
                    />
                  </div>

                  {/* Amount */}
                  <div className="text-right flex-shrink-0 w-24">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmtFull(e.totalAmount)}</p>
                    {e.loanAmount > 0 && (
                      <p className="text-xs text-red-500 dark:text-red-400">Loans: {fmt(e.loanAmount)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Report Cards ──────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">Detailed Reports</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORT_CARDS.map((card) => (
              <Link
                key={`${card.href}-${card.title}`}
                href={card.href}
                className={`block rounded-lg border-l-4 bg-white dark:bg-gray-800 p-5 shadow hover:shadow-md transition-shadow ${card.color}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{card.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{card.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{card.desc}</p>
                  </div>
                </div>
                <div className="mt-3 text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  View Report
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </ContentLayout>
  )
}
