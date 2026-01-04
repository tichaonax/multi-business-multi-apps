'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'
import { IncomePieChart } from '@/components/reports/income-pie-chart'
import { ExpensePieChart } from '@/components/reports/expense-pie-chart'
import { DailyTrendsChart } from '@/components/reports/daily-trends-chart'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { EmployeeFilter } from '@/components/reports/employee-filter'

export default function ReportsDashboard() {
  // Initialize date range to last 30 days
  const getInitialDateRange = (): DateRange => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 30)
    return { start, end }
  }

  const [dateRange, setDateRange] = useState<DateRange>(getInitialDateRange())
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [incomeData, setIncomeData] = useState<any[]>([])
  const [expenseData, setExpenseData] = useState<any[]>([])
  const [trendsData, setTrendsData] = useState<any[]>([])
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [loading, setLoading] = useState(true)

  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()
  const businessType = currentBusiness?.businessType || 'restaurant'
  const posLink = `/${businessType}/pos`

  useEffect(() => {
    if (currentBusinessId) {
      loadDashboardData()
    }
  }, [currentBusinessId, dateRange, selectedEmployeeId])

  const loadDashboardData = async () => {
    if (!currentBusinessId) return

    try {
      setLoading(true)

      // Format dates for API
      const startDate = dateRange.start.toISOString().split('T')[0]
      const endDate = dateRange.end.toISOString().split('T')[0]

      // Build query params
      const params = new URLSearchParams({
        businessId: currentBusinessId,
        businessType,
        startDate,
        endDate
      })
      if (selectedEmployeeId) {
        params.append('employeeId', selectedEmployeeId)
      }

      // Load daily sales data for date range (income) - use universal API
      const response = await fetch(`/api/universal/daily-sales?${params.toString()}`)

      if (response.ok) {
        const data = await response.json()

        // Process income data from category breakdown
        if (data.data?.categoryBreakdown) {
          const total = data.data.summary.totalSales
          const incomeCategories = data.data.categoryBreakdown.map((cat: any) => ({
            name: cat.name,
            value: cat.totalSales,
            percentage: (cat.totalSales / total) * 100
          }))
          setIncomeData(incomeCategories)
          setTotalIncome(total)
        }

        // Load real expense data from API
        const expenseParams = new URLSearchParams({ startDate, endDate })
        if (selectedEmployeeId) {
          expenseParams.append('employeeId', selectedEmployeeId)
        }
        const expenseResponse = await fetch(
          `/api/business/${currentBusinessId}/expenses?${expenseParams.toString()}`
        )

        if (expenseResponse.ok) {
          const expenseResult = await expenseResponse.json()
          if (expenseResult.success && expenseResult.summary) {
            setExpenseData(expenseResult.summary.byCategory)
            setTotalExpenses(expenseResult.summary.total)
          } else {
            // No expense data available
            setExpenseData([])
            setTotalExpenses(0)
          }
        } else {
          // API error - show empty state
          setExpenseData([])
          setTotalExpenses(0)
        }
      }

      // TODO: Load historical data for trends chart
      // For now, create mock trend data based on selected date range
      const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
      const mockTrends = Array.from({ length: daysDiff + 1 }, (_, i) => {
        const date = new Date(dateRange.start)
        date.setDate(date.getDate() + i)
        // Format as dd/mm (Zimbabwe/UK format)
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const dateStr = `${day}/${month}`

        // Random data for demonstration
        const income = Math.random() * 300 + 50
        const expense = Math.random() * 350 + 50
        const savings = income - expense

        return {
          date: dateStr,
          income,
          expense,
          savings
        }
      })
      setTrendsData(mockTrends)

    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* Navigation */}
      <div className="mb-6 flex gap-3 no-print">
        <Link
          href={posLink}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Back to POS
        </Link>
        <Link
          href="/restaurant/reports"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ← Back to Reports
        </Link>
        <Link
          href="/restaurant/reports/end-of-day"
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          📊 End-of-Day Report
        </Link>
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          📊 Sales Analytics Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Visual breakdown of income, expenses, and trends
        </p>
      </div>

      {/* Date Range Selector & Filters */}
      <div className="max-w-7xl mx-auto space-y-4">
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
        {currentBusinessId && (
          <EmployeeFilter
            businessId={currentBusinessId}
            selectedEmployeeId={selectedEmployeeId}
            onEmployeeChange={setSelectedEmployeeId}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4"
          />
        )}
      </div>

      {/* Charts Grid */}
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Row: Two Pie Charts Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income Pie Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 overflow-visible">
            {incomeData.length > 0 ? (
              <IncomePieChart data={incomeData} totalIncome={totalIncome} />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No income data available</p>
              </div>
            )}
          </div>

          {/* Expense Pie Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 overflow-visible">
            {expenseData.length > 0 ? (
              <ExpensePieChart data={expenseData} totalExpenses={totalExpenses} />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No expense data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row: Daily Trends Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {trendsData.length > 0 ? (
            <DailyTrendsChart data={trendsData} />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No trend data available</p>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border-2 border-green-200 dark:border-green-800">
            <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
              💰 Total Income
            </h3>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              ${totalIncome.toFixed(2)}
            </p>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border-2 border-red-200 dark:border-red-800">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
              💸 Total Expenses
            </h3>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              ${totalExpenses.toFixed(2)}
            </p>
          </div>

          <div className={`rounded-lg p-6 border-2 ${
            totalIncome - totalExpenses >= 0
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
          }`}>
            <h3 className={`text-sm font-semibold mb-2 ${
              totalIncome - totalExpenses >= 0
                ? 'text-blue-800 dark:text-blue-300'
                : 'text-orange-800 dark:text-orange-300'
            }`}>
              📊 Net Profit/Loss
            </h3>
            <p className={`text-3xl font-bold ${
              totalIncome - totalExpenses >= 0
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-orange-600 dark:text-orange-400'
            }`}>
              ${(totalIncome - totalExpenses).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
