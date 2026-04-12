'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';

import { ProtectedRoute } from '@/components/auth/protected-route'
import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { ContentLayout } from '@/components/layout/content-layout'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getLocalDateString } from '@/lib/utils'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#a4de6c']

function getDefaultRange(): DateRange {
  const end = new Date()
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  return { start, end }
}

function formatCurrency(val: number) {
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface SummaryData {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  revenueTrend: { date: string; revenue: number }[]
  expensesByCategory: { category: string; amount: number }[]
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultRange())
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const startDate = getLocalDateString(dateRange.start)
      const endDate = getLocalDateString(dateRange.end)
      const res = await fetch(`/api/reports/summary?startDate=${startDate}&endDate=${endDate}`)
      const json = await res.json()
      if (json.success) {
        setData(json)
      } else {
        setError(json.error ?? 'Failed to load report')
      }
    } catch {
      setError('Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <ProtectedRoute>
      <ContentLayout
        title="📊 Reports & Analytics"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports', isActive: true }
        ]}
      >
        <DateRangeSelector value={dateRange} onChange={setDateRange} />

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-600" />
            <span className="ml-4 text-gray-500">Loading...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-2 text-primary">Total Revenue</h3>
                <p className="text-3xl font-bold text-green-600">${formatCurrency(data.totalRevenue)}</p>
                <p className="text-sm text-gray-500">Selected period</p>
              </div>
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-2 text-primary">Total Expenses</h3>
                <p className="text-3xl font-bold text-red-600">${formatCurrency(data.totalExpenses)}</p>
                <p className="text-sm text-gray-500">Selected period</p>
              </div>
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-2 text-primary">Net Profit</h3>
                <p className={`text-3xl font-bold ${data.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  ${formatCurrency(data.netProfit)}
                </p>
                <p className="text-sm text-gray-500">Selected period</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4 text-primary">Revenue Trend</h3>
                {data.revenueTrend.length === 0 ? (
                  <p className="text-gray-400 text-center py-10">No sales data for this period</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.revenueTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`$${formatCurrency(v)}`, 'Revenue']} />
                      <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4 text-primary">Expenses by Category</h3>
                {data.expensesByCategory.length === 0 ? (
                  <p className="text-gray-400 text-center py-10">No expense data for this period</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.expensesByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percent }) => `${category} ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        dataKey="amount"
                      >
                        {data.expensesByCategory.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`$${formatCurrency(v)}`, 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}

        {/* Report Hubs */}
        <div className="mt-2">
          <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">Report Hubs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="/expense-accounts/reports"
              className="block bg-white dark:bg-gray-800 rounded-lg shadow p-5 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <span className="text-3xl">💳</span>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">Expense Account Reports</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Accounts overview, loans, transfers, lending and spending trends.</p>
                </div>
              </div>
            </a>
            <a href="/payroll/account/reports"
              className="block bg-white dark:bg-gray-800 rounded-lg shadow p-5 border-l-4 border-teal-500 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <span className="text-3xl">💼</span>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">Payroll Reports</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Payment register, per-employee totals, payment type breakdown, and monthly trends.</p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </ContentLayout>
    </ProtectedRoute>
  )
}
