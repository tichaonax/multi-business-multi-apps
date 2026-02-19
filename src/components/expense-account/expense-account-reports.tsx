'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts'
import { DateInput } from '@/components/ui/date-input'

interface ReportData {
  byCategory: Array<{
    categoryId: string
    categoryName: string
    emoji: string
    color: string
    totalAmount: number
    paymentCount: number
    percentage: number
  }>
  byPayee: Array<{
    payeeType: string
    payeeId: string
    payeeName: string
    totalAmount: number
    paymentCount: number
  }>
  trends: Array<{
    period: string
    totalAmount: number
    paymentCount: number
  }>
  summary: {
    totalSpent: number
    averagePayment: number
    totalPayments: number
    mostExpensiveCategory: string
    mostFrequentPayee: string
    dateRange: {
      startDate: string | null
      endDate: string | null
    }
    accountInfo: {
      id: string
      accountNumber: string
      accountName: string
    }
  }
  accountType?: string
  byDepositSource?: Array<{
    sourceId: string
    sourceName: string
    totalAmount: number
    depositCount: number
    percentage: number
  }>
  incomeVsExpenses?: Array<{
    month: string
    income: number
    expenses: number
  }>
}

interface ExpenseAccountReportsProps {
  accountId: string
}

const CHART_COLORS = [
  '#87B5A5', '#E8D5C4', '#C9A5B8', '#A8C5D6',
  '#8B7B8B', '#F4C9A0', '#FFD3A0', '#B5D5A5'
]

export function ExpenseAccountReports({ accountId }: ExpenseAccountReportsProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    loadReports()
  }, [accountId, startDate, endDate])

  const loadReports = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(
        `/api/expense-account/${accountId}/reports?${params.toString()}`,
        { credentials: 'include' }
      )

      if (response.ok) {
        const data = await response.json()
        setReportData(data.data)
      }
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    if (percent < 0.05) return null

    return (
      <text
        x={x}
        y={y}
        fill="#000000"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-bold"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(255,255,255,0.8))' }}
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]

      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {data.name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatCurrency(data.value)}
          </p>
          {data.payload.percentage && (
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {data.payload.percentage.toFixed(1)}%
            </p>
          )}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-secondary">Loading reports...</div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Failed to load reports</p>
      </div>
    )
  }

  const { byCategory, byPayee, trends, summary, accountType, byDepositSource, incomeVsExpenses } = reportData
  const isPersonal = accountType === 'PERSONAL'

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <DateInput value={startDate} onChange={setStartDate} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <DateInput value={endDate} onChange={setEndDate} />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setStartDate('')
                setEndDate('')
              }}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(summary.totalSpent)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Payments</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {summary.totalPayments}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Average Payment</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(summary.averagePayment)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Top Category</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
            {summary.mostExpensiveCategory}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense by Category Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Expenses by Category
          </h3>

          {byCategory.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No expense data available
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={byCategory.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderPieLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="totalAmount"
                    nameKey="categoryName"
                  >
                    {byCategory.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="mt-4 space-y-2">
                {byCategory.slice(0, 8).map((category, index) => (
                  <div
                    key={category.categoryId}
                    className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-700 rounded px-2 py-1"
                  >
                    <div
                      className="w-4 h-4 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-base">{category.emoji}</span>
                    <span className="text-gray-900 dark:text-gray-100 truncate flex-1">
                      {category.categoryName}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 text-xs font-semibold">
                      {category.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top Payees */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Top Payees
          </h3>

          {byPayee.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No payee data available
            </div>
          ) : (
            <div className="space-y-3">
              {byPayee.slice(0, 10).map((payee, index) => (
                <div
                  key={`${payee.payeeType}-${payee.payeeId}`}
                  className="flex items-center gap-3"
                >
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {payee.payeeName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {payee.paymentCount} payment{payee.paymentCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(payee.totalAmount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trends */}
      {trends.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Monthly Spending Trends
          </h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                tickFormatter={formatPeriod}
                tick={{ fill: 'currentColor' }}
              />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tick={{ fill: 'currentColor' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatPeriod(payload[0].payload.period)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Total: {formatCurrency(payload[0].value as number)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {payload[0].payload.paymentCount} payments
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="totalAmount" fill="#87B5A5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* PERSONAL ACCOUNT SECTIONS */}
      {isPersonal && (
        <>
          {/* Savings Summary */}
          {byDepositSource && incomeVsExpenses && (() => {
            const totalIncome = byDepositSource.reduce((s, d) => s + d.totalAmount, 0)
            const totalExpenses = summary.totalSpent
            const netSavings = totalIncome - totalExpenses
            const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0
            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-green-500">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Income</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-red-500">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Expenses</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 ${netSavings >= 0 ? 'border-teal-500' : 'border-orange-500'}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Net Savings</p>
                  <p className={`text-xl font-bold mt-1 ${netSavings >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>
                    {netSavings >= 0 ? '+' : ''}{formatCurrency(netSavings)}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-blue-500">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Savings Rate</p>
                  <p className={`text-xl font-bold mt-1 ${savingsRate >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                    {savingsRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            )
          })()}

          {/* Income by Source */}
          {byDepositSource && byDepositSource.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Income by Source</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={byDepositSource.slice(0, 8)} dataKey="totalAmount" nameKey="sourceName" cx="50%" cy="50%" outerRadius={90} labelLine={false} label={renderPieLabel}>
                      {byDepositSource.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {byDepositSource.slice(0, 8).map((src, i) => (
                    <div key={src.sourceId} className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
                      <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-gray-900 dark:text-gray-100 flex-1 truncate">{src.sourceName}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{src.percentage.toFixed(1)}%</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(src.totalAmount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Income vs Expenses chart */}
          {incomeVsExpenses && incomeVsExpenses.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Income vs Expenses</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={incomeVsExpenses.map((m) => ({ ...m, name: formatPeriod(m.month) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#87B5A5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#E8D5C4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
