'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface EmployeeRow {
  name: string
  employeeNumber: string
  count: number
  totalAmount: number
  salaryAmount: number
  loanAmount: number
  advanceAmount: number
}

export default function ByEmployeeReportPage() {
  const { status } = useSession()
  const router = useRouter()

  const [rows, setRows] = useState<EmployeeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [totalAmount, setTotalAmount] = useState(0)

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
      const p = new URLSearchParams({ groupBy: 'employee' })
      if (startDate) p.set('startDate', startDate)
      if (endDate) p.set('endDate', endDate)

      const res = await fetch(`/api/payroll/account/reports?${p}`, { credentials: 'include' })
      if (!res.ok) return

      const d = await res.json()
      const grouped: Record<string, any> = d.data?.groupedData || {}

      const built: EmployeeRow[] = Object.entries(grouped).map(([name, g]: [string, any]) => {
        const payments: any[] = g.payments || []
        const empNum = payments[0]?.employeeNumber || ''
        const salaryAmount = payments.filter((p: any) => p.paymentType === 'SALARY').reduce((s: number, p: any) => s + p.amount, 0)
        const loanAmount = payments.filter((p: any) => p.paymentType === 'LOAN_DISBURSEMENT').reduce((s: number, p: any) => s + p.amount, 0)
        const advanceAmount = payments.filter((p: any) => p.paymentType === 'ADVANCE').reduce((s: number, p: any) => s + p.amount, 0)
        return { name, employeeNumber: empNum, count: g.count, totalAmount: g.totalAmount, salaryAmount, loanAmount, advanceAmount }
      })

      built.sort((a, b) => b.totalAmount - a.totalAmount)
      setRows(built)
      setTotalAmount(built.reduce((s, r) => s + r.totalAmount, 0))
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') return null

  return (
    <ContentLayout title="👤 By Employee" subtitle="Payment totals grouped by employee">
      <div className="space-y-6">
        <Link href="/payroll/account/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Reports Hub
        </Link>

        {/* Date filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="flex flex-wrap gap-2 mb-4">
            {[['This Month','thisMonth'],['Last Month','lastMonth'],['This Year','thisYear']].map(([label, key]) => (
              <button key={key} onClick={() => {
                const today = new Date(), pad = (n: number) => String(n).padStart(2,'0')
                const d = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`
                if (key==='thisMonth'){setStartDate(d(new Date(today.getFullYear(),today.getMonth(),1)));setEndDate(d(today))}
                if (key==='lastMonth'){setStartDate(d(new Date(today.getFullYear(),today.getMonth()-1,1)));setEndDate(d(new Date(today.getFullYear(),today.getMonth(),0)))}
                if (key==='thisYear'){setStartDate(`${today.getFullYear()}-01-01`);setEndDate(d(today))}
              }} className="px-3 py-1 text-xs rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 transition-colors">
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 items-end">
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
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 pb-1">Clear</button>
          )}
          <div className="flex-1" />

          {!loading && rows.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">{rows.length} employees · Grand total</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmt(totalAmount)}</p>
            </div>
          )}
          </div>
        </div>

        {/* Bar Chart */}
        {!loading && rows.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Employee Pay Comparison</h3>
            <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 48)}>
              <BarChart
                data={rows.map(r => ({ name: r.name.split(' ')[0], Salary: r.salaryAmount, Loans: r.loanAmount, Advances: r.advanceAmount }))}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Legend />
                <Bar dataKey="Salary"   stackId="a" fill="#3B82F6" name="Salary" />
                <Bar dataKey="Loans"    stackId="a" fill="#EF4444" name="Loans" />
                <Bar dataKey="Advances" stackId="a" fill="#F97316" name="Advances" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">No payments found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    {['Employee', 'Payments', 'Salary Paid', 'Loans', 'Advances', 'Total'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {rows.map(row => (
                    <tr key={row.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{row.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{row.employeeNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.count}</td>
                      <td className="px-4 py-3 text-blue-700 dark:text-blue-400">{row.salaryAmount > 0 ? fmt(row.salaryAmount) : '—'}</td>
                      <td className="px-4 py-3 text-red-700 dark:text-red-400">{row.loanAmount > 0 ? fmt(row.loanAmount) : '—'}</td>
                      <td className="px-4 py-3 text-orange-700 dark:text-orange-400">{row.advanceAmount > 0 ? fmt(row.advanceAmount) : '—'}</td>
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">{fmt(row.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-700 border-t-2 border-gray-300 dark:border-gray-500">
                  <tr>
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100" colSpan={2}>Grand Total</td>
                    <td className="px-4 py-3 font-bold text-blue-700 dark:text-blue-400">{fmt(rows.reduce((s, r) => s + r.salaryAmount, 0))}</td>
                    <td className="px-4 py-3 font-bold text-red-700 dark:text-red-400">{fmt(rows.reduce((s, r) => s + r.loanAmount, 0))}</td>
                    <td className="px-4 py-3 font-bold text-orange-700 dark:text-orange-400">{fmt(rows.reduce((s, r) => s + r.advanceAmount, 0))}</td>
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">{fmt(totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </ContentLayout>
  )
}
