'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { formatCurrency } from '@/lib/format-currency'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface PayeeExpenseReportProps {
  payeeType: 'USER' | 'EMPLOYEE' | 'PERSON' | 'BUSINESS'
  payeeId: string
}

interface ReportData {
  summary: {
    totalPaid: number
    paymentCount: number
    averagePayment: number
    accountsCount: number
  }
  paymentsByCategory: Array<{
    categoryId: string | null
    categoryName: string
    categoryEmoji: string
    totalAmount: number
    paymentCount: number
  }>
  paymentsByAccount: Array<{
    accountId: string
    accountName: string
    accountNumber: string
    totalAmount: number
    paymentCount: number
  }>
  paymentTrends: Array<{
    month: string
    totalAmount: number
    paymentCount: number
  }>
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

export function PayeeExpenseReport({
  payeeType,
  payeeId,
}: PayeeExpenseReportProps) {
  const { data: session } = useSession()
  const [hasPermission, setHasPermission] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ReportData | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (session?.user) {
      checkPermission()
    }
  }, [session])

  useEffect(() => {
    if (hasPermission && payeeId) {
      fetchReportData()
    }
  }, [hasPermission, payeeId, payeeType, startDate, endDate])

  const checkPermission = async () => {
    try {
      const permissions = await getEffectivePermissions(session?.user?.id || '')
      setHasPermission(permissions.canViewExpenseReports || false)
    } catch (error) {
      console.error('Error checking permissions:', error)
      setHasPermission(false)
    }
  }

  const fetchReportData = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(
        `/api/expense-account/payees/${payeeType}/${payeeId}/reports?${params.toString()}`,
        { credentials: 'include' }
      )

      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      }
    } catch (error) {
      console.error('Error fetching payee expense report:', error)
    } finally {
      setLoading(false)
    }
  }

  // Don't render if no permission
  if (!hasPermission) {
    return null
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-gray-500 dark:text-gray-400">Loading report...</div>
      </div>
    )
  }

  if (!data || data.summary.paymentCount === 0) {
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Expense Analytics
          </h3>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            {expanded ? 'Hide Charts' : 'Show Charts'}
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="flex gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
            placeholder="Start Date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
            placeholder="End Date"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('')
                setEndDate('')
              }}
              className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Total Paid
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(data.summary.totalPaid)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Payments
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {data.summary.paymentCount}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Average
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(data.summary.averagePayment)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Accounts
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {data.summary.accountsCount}
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {expanded && (
        <div className="p-6 space-y-8 border-t border-gray-200 dark:border-gray-700">
          {/* Payments by Category - Pie Chart */}
          {data.paymentsByCategory.length > 0 && (
            <div>
              <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Payments by Category
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.paymentsByCategory}
                    dataKey="totalAmount"
                    nameKey="categoryName"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.categoryEmoji} ${entry.categoryName}`}
                  >
                    {data.paymentsByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Payments by Account - Bar Chart */}
          {data.paymentsByAccount.length > 0 && (
            <div>
              <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Payments by Account
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.paymentsByAccount}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="accountName"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                  />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="totalAmount" fill="#3B82F6" name="Total Paid" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Payment Trends - Line Chart */}
          {data.paymentTrends.length > 0 && (
            <div>
              <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Payment Trends Over Time
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.paymentTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalAmount"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Total Paid"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
