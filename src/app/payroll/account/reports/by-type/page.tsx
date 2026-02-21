'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import Link from 'next/link'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const TYPE_COLORS: Record<string, string> = {
  SALARY: '#3B82F6', LOAN_DISBURSEMENT: '#EF4444', ADVANCE: '#F97316',
  BONUS: '#22C55E', COMMISSION: '#8B5CF6',
}

const TYPE_CONFIG: Record<string, { label: string; color: string; border: string }> = {
  SALARY:           { label: 'Salary Payment',    color: 'text-blue-700 dark:text-blue-400',   border: 'border-blue-500' },
  LOAN_DISBURSEMENT:{ label: 'Loan Disbursement',  color: 'text-red-700 dark:text-red-400',     border: 'border-red-500' },
  ADVANCE:          { label: 'Salary Advance',     color: 'text-orange-700 dark:text-orange-400', border: 'border-orange-500' },
  BONUS:            { label: 'Bonus Payment',      color: 'text-green-700 dark:text-green-400', border: 'border-green-500' },
  COMMISSION:       { label: 'Commission',         color: 'text-purple-700 dark:text-purple-400', border: 'border-purple-500' },
}

export default function ByTypeReportPage() {
  const { status } = useSession()
  const router = useRouter()

  const [grouped, setGrouped] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') load()
  }, [status, startDate, endDate])

  const load = async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ groupBy: 'paymentType' })
      if (startDate) p.set('startDate', startDate)
      if (endDate) p.set('endDate', endDate)
      const res = await fetch(`/api/payroll/account/reports?${p}`, { credentials: 'include' })
      if (res.ok) {
        const d = await res.json()
        setGrouped(d.data?.groupedData || {})
      }
    } finally {
      setLoading(false)
    }
  }

  const grandTotal = Object.values(grouped).reduce((s: number, g: any) => s + g.totalAmount, 0)

  if (status === 'loading') return null

  return (
    <ContentLayout title="🏷️ By Payment Type" subtitle="Payment breakdown — salary, loans, advances and more">
      <div className="space-y-6">
        <Link href="/payroll/account/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Reports Hub
        </Link>

        {/* Date filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate('') }}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 pb-1">Clear</button>
          )}
        </div>

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">Loading…</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">No payments found</div>
        ) : (
          <>
            {/* Pie Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Payment Type Distribution</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={Object.entries(grouped).map(([type, g]: [string, any]) => ({
                      name: TYPE_CONFIG[type]?.label || type,
                      value: g.totalAmount,
                      type,
                    }))}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {Object.keys(grouped).map((type) => (
                      <Cell key={type} fill={TYPE_COLORS[type] || '#6B7280'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(grouped).map(([type, g]: [string, any]) => {
                const cfg = TYPE_CONFIG[type] || { label: type, color: 'text-gray-700 dark:text-gray-300', border: 'border-gray-400' }
                const pct = grandTotal > 0 ? ((g.totalAmount / grandTotal) * 100).toFixed(1) : '0'
                return (
                  <button key={type} onClick={() => setExpanded(expanded === type ? null : type)}
                    className={`text-left bg-white dark:bg-gray-800 rounded-lg shadow p-5 border-l-4 ${cfg.border} hover:shadow-md transition-shadow`}>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{cfg.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${cfg.color}`}>{fmt(g.totalAmount)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{g.count} payment{g.count !== 1 ? 's' : ''} · {pct}% of total</p>
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-2">{expanded === type ? '▲ Hide detail' : '▼ Show detail'}</p>
                  </button>
                )
              })}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow p-5 border-l-4 border-gray-400 flex flex-col justify-center">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Grand Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{fmt(grandTotal)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {Object.values(grouped).reduce((s: number, g: any) => s + g.count, 0)} total payments
                </p>
              </div>
            </div>

            {/* Expanded detail */}
            {expanded && grouped[expanded] && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {TYPE_CONFIG[expanded]?.label || expanded} — Individual Payments
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        {['Employee', 'Gross', 'Net Pay', 'Date', 'Status'].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {grouped[expanded].payments.map((p: any) => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-2">
                            <p className="font-medium text-gray-900 dark:text-gray-100">{p.employeeName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{p.employeeNumber}</p>
                          </td>
                          <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{fmt(p.amount)}</td>
                          <td className="px-4 py-2 text-green-600 dark:text-green-400">{p.netAmount != null ? fmt(p.netAmount) : '—'}</td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                            {new Date(p.paymentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{p.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ContentLayout>
  )
}
