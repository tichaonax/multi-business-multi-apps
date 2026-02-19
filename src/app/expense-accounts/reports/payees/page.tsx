'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { DateInput } from '@/components/ui/date-input'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Link from 'next/link'

const PAYEE_TYPE_TABS = [
  { label: 'All', value: 'ALL' },
  { label: 'Employees', value: 'EMPLOYEE' },
  { label: 'Persons', value: 'PERSON' },
  { label: 'Businesses', value: 'BUSINESS' },
  { label: 'Users', value: 'USER' },
]

interface PayeeRow {
  payeeType: string
  payeeId: string
  payeeName: string
  totalAmount: number
  paymentCount: number
}

interface PayeeTypeRow {
  payeeType: string
  totalAmount: number
  paymentCount: number
}

interface SystemTotals {
  totalPaid: number
  uniquePayees: number
  topPayee: string | null
}

function payeeTypeBadge(type: string) {
  const styles: Record<string, string> = {
    EMPLOYEE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    PERSON: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    BUSINESS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    USER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  }
  const labels: Record<string, string> = {
    EMPLOYEE: 'Employee', PERSON: 'Person', BUSINESS: 'Business', USER: 'User',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-600'}`}>
      {labels[type] || type}
    </span>
  )
}

export default function PayeeAnalysisReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [byPayee, setByPayee] = useState<PayeeRow[]>([])
  const [byPayeeType, setByPayeeType] = useState<PayeeTypeRow[]>([])
  const [totals, setTotals] = useState<SystemTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [payeeType, setPayeeType] = useState('ALL')

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const toDateStr = (d: Date) => d.toISOString().split('T')[0]
  const applyQuickFilter = (days: number | 'today' | 'yesterday') => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (days === 'today') { setStartDate(toDateStr(today)); setEndDate(toDateStr(today)) }
    else if (days === 'yesterday') { const y = new Date(today); y.setDate(y.getDate() - 1); setStartDate(toDateStr(y)); setEndDate(toDateStr(y)) }
    else { const f = new Date(today); f.setDate(f.getDate() - days + 1); setStartDate(toDateStr(f)); setEndDate(toDateStr(today)) }
  }
  const QUICK_FILTERS = [
    { label: 'Today', action: () => applyQuickFilter('today') },
    { label: 'Yesterday', action: () => applyQuickFilter('yesterday') },
    { label: '7 Days', action: () => applyQuickFilter(7) },
    { label: '30 Days', action: () => applyQuickFilter(30) },
    { label: '90 Days', action: () => applyQuickFilter(90) },
  ]

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    const permissions = getEffectivePermissions(session?.user)
    if (!permissions.canViewExpenseReports) { router.push('/expense-accounts'); return }
    loadReport()
  }, [status, session, payeeType, startDate, endDate])

  const loadReport = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (payeeType !== 'ALL') params.append('payeeType', payeeType)
      const res = await fetch(`/api/expense-account/reports/payees?${params}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setByPayee(data.data?.byPayee || [])
        setByPayeeType(data.data?.byPayeeType || [])
        setTotals(data.data?.systemTotals || null)
      }
    } catch (e) {
      console.error('Error loading report:', e)
    } finally {
      setLoading(false)
    }
  }

  const chartData = byPayee.slice(0, 10).map((p) => ({
    name: p.payeeName.length > 14 ? p.payeeName.slice(0, 14) + '…' : p.payeeName,
    amount: p.totalAmount,
  }))

  return (
    <ContentLayout title="Payee Analysis" subtitle="Top payees across all expense accounts">
      <div className="space-y-6">
        <Link href="/expense-accounts/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Reports Hub
        </Link>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {PAYEE_TYPE_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setPayeeType(tab.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  payeeType === tab.value
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {QUICK_FILTERS.map((f) => (
              <button key={f.label} onClick={f.action} className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">{f.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <DateInput value={startDate} onChange={setStartDate} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <DateInput value={endDate} onChange={setEndDate} />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setStartDate(''); setEndDate(''); setPayeeType('ALL') }}
                className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        {totals && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-red-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Paid</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{formatCurrency(totals.totalPaid)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-green-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Unique Payees</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{totals.uniquePayees}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-purple-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Top Payee</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1 truncate">{totals.topPayee || '—'}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : byPayee.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No payee data found</div>
        ) : (
          <>
            {/* Bar chart: top 10 */}
            {chartData.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-4">Top 10 Payees by Amount</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => formatCurrency(v)} />
                    <Bar dataKey="amount" fill="#87B5A5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Main payee table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">All Payees</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-10">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payee</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Paid</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase"># Payments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {byPayee.map((p, i) => (
                      <tr key={`${p.payeeType}-${p.payeeId}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-center text-xs text-gray-400">#{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{p.payeeName}</td>
                        <td className="px-4 py-3 text-center">{payeeTypeBadge(p.payeeType)}</td>
                        <td className="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400">{formatCurrency(p.totalAmount)}</td>
                        <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{p.paymentCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By payee type breakdown */}
            {byPayeeType.length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">By Payee Type</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Paid</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase"># Payments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {byPayeeType.map((t) => (
                        <tr key={t.payeeType} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3">{payeeTypeBadge(t.payeeType)}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(t.totalAmount)}</td>
                          <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{t.paymentCount}</td>
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
