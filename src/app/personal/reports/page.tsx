'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';

import { ProtectedRoute } from '@/components/auth/protected-route'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { hasUserPermission } from '@/lib/permission-utils'

interface ExpenseReport {
  totalExpenses: number
  totalTransactions: number
  categoryBreakdown: Array<{
    category: string
    amount: number
    count: number
  }>
  monthlyData: Array<{
    month: string
    amount: number
    count: number
  }>
  topContractors: Array<{
    contractorName: string
    amount: number
    count: number
  }>
}

export default function PersonalReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [reportData, setReportData] = useState<ExpenseReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of current year
    endDate: new Date().toISOString().split('T')[0] // Today
  })

  const fetchReportData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })

      const response = await fetch(`/api/personal/reports?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      } else {
        console.error('Failed to fetch report data')
      }
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

  // Check user-level permissions for Personal Finance access
  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Check if user has access to Personal Finance module
    if (!hasUserPermission(session.user, 'canAccessPersonalFinance')) {
      router.push('/personal')
      return
    }
  }, [session, status, router])

  // Show loading state while checking permissions
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Don't render content if no session or no access
  if (!session || !hasUserPermission(session.user, 'canAccessPersonalFinance')) {
    return null
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <ProtectedRoute>
      <ContentLayout
        title="Personal Finance Reports"
        subtitle="View detailed reports and analytics of your personal expenses"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Personal', href: '/personal' },
          { label: 'Reports', isActive: true }
        ]}
        headerActions={
          <Link
            href="/personal"
            className="btn-secondary"
          >
            ← Back to Personal
          </Link>
        }
      >
        <div className="space-y-6">

          {/* Date Range Filter */}
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-secondary mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-secondary mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={fetchReportData}
                className="btn-primary"
              >
                Update Report
              </button>
            </div>
          </div>

          {loading ? (
            <div className="card p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-secondary mt-2">Generating report...</p>
            </div>
          ) : !reportData ? (
            <div className="card p-8 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-primary mb-2">No data available</h3>
              <p className="text-secondary">Unable to load report data. Please check your connection and try again.</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-800">
                      <span className="text-blue-600 dark:text-blue-300 text-xl">💰</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-secondary">Total Expenses</h3>
                      <p className="text-2xl font-semibold text-primary">
                        {formatCurrency(reportData.totalExpenses)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-800">
                      <span className="text-green-600 dark:text-green-300 text-xl">📄</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-secondary">Total Transactions</h3>
                      <p className="text-2xl font-semibold text-primary">
                        {reportData.totalTransactions}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-800">
                      <span className="text-purple-600 dark:text-purple-300 text-xl">📈</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-secondary">Average per Transaction</h3>
                      <p className="text-2xl font-semibold text-primary">
                        {formatCurrency(reportData.totalTransactions > 0 ? reportData.totalExpenses / reportData.totalTransactions : 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="card">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-primary">Expenses by Category</h2>
                </div>
                <div className="p-6">
                  {reportData.categoryBreakdown.length === 0 ? (
                    <p className="text-secondary text-center py-8">No category data available</p>
                  ) : (
                    <div className="space-y-4">
                      {reportData.categoryBreakdown.map((category, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-primary">{category.category}</h4>
                            <p className="text-xs text-secondary">{category.count} transactions</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-primary">
                              {formatCurrency(category.amount)}
                            </p>
                            <p className="text-xs text-secondary">
                              {((category.amount / reportData.totalExpenses) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Monthly Trends */}
              <div className="card">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-primary">Monthly Trends</h2>
                </div>
                <div className="p-6">
                  {reportData.monthlyData.length === 0 ? (
                    <p className="text-secondary text-center py-8">No monthly data available</p>
                  ) : (
                    <div className="space-y-4">
                      {reportData.monthlyData.map((month, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-primary">{month.month}</h4>
                            <p className="text-xs text-secondary">{month.count} transactions</p>
                          </div>
                          <p className="text-sm font-semibold text-primary">
                            {formatCurrency(month.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Top Contractors */}
              <div className="card">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-primary">Top Contractors/Recipients</h2>
                </div>
                <div className="p-6">
                  {reportData.topContractors.length === 0 ? (
                    <p className="text-secondary text-center py-8">No contractor data available</p>
                  ) : (
                    <div className="space-y-4">
                      {reportData.topContractors.map((contractor, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-primary">{contractor.contractorName}</h4>
                            <p className="text-xs text-secondary">{contractor.count} payments</p>
                          </div>
                          <p className="text-sm font-semibold text-primary">
                            {formatCurrency(contractor.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Empty State for No Data */}
          {reportData && reportData.totalTransactions === 0 && (
            <div className="card p-8 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-primary mb-2">No expenses found</h3>
              <p className="text-secondary mb-4">
                No personal expenses found for the selected date range.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {hasUserPermission(session?.user, 'canAddPersonalExpenses') && (
                  <Link href="/personal/new" className="btn-primary">
                    Add Expense
                  </Link>
                )}
                {hasUserPermission(session?.user, 'canAddPersonalExpenses') && (
                  <Link href="/personal/contractors" className="btn-secondary">
                    Manage Contractors
                  </Link>
                )}
              </div>
            </div>
          )}

        </div>
      </ContentLayout>
    </ProtectedRoute>
  )
}