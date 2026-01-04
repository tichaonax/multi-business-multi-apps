'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { DepositForm } from '@/components/payroll/deposit-form'
import { useAlert } from '@/components/ui/confirm-modal'

export default function DepositsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DepositsContent />
    </Suspense>
  )
}

function DepositsContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const customAlert = useAlert()
  const [deposits, setDeposits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  })

  useEffect(() => {
    fetchDeposits()
  }, [pagination.offset])

  const fetchDeposits = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/payroll/account/deposits?limit=${pagination.limit}&offset=${pagination.offset}`,
        { credentials: 'include' }
      )

      if (response.ok) {
        const data = await response.json()
        setDeposits(data.data.deposits || [])
        setPagination({
          ...pagination,
          total: data.data.pagination.total,
          hasMore: data.data.pagination.hasMore,
        })
      }
    } catch (error) {
      console.error('Error fetching deposits:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDepositSuccess = () => {
    // Refresh deposits list
    setPagination({ ...pagination, offset: 0 })
    fetchDeposits()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'PAYROLL_EXPENSE':
        return 'Payroll Expense'
      case 'MANUAL_TRANSFER':
        return 'Manual Transfer'
      default:
        return type
    }
  }

  const getTransactionTypeBadge = (type: string) => {
    const baseClasses = 'px-2 py-1 text-xs rounded-full font-medium'
    switch (type) {
      case 'PAYROLL_EXPENSE':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'MANUAL_TRANSFER':
        return `${baseClasses} bg-blue-100 text-blue-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const handlePreviousPage = () => {
    setPagination({
      ...pagination,
      offset: Math.max(0, pagination.offset - pagination.limit),
    })
  }

  const handleNextPage = () => {
    setPagination({
      ...pagination,
      offset: pagination.offset + pagination.limit,
    })
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout
          title="💰 Payroll Deposits"
          description="Transfer funds from business accounts to payroll account"
        >
          <div className="space-y-6">
            {/* Back Button */}
            <button
              onClick={() => router.push('/payroll/account')}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              ← Back to Dashboard
            </button>

            {/* Deposit Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Create New Deposit</h2>
              <DepositForm onSuccess={handleDepositSuccess} />
            </div>

            {/* Deposit History */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">📜 Deposit History</h2>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total: {pagination.total} deposits
                </div>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                      </div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              ) : deposits.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-gray-500 dark:text-gray-400">No deposits yet</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Create your first deposit using the form above
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Business
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Note
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Created By
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {deposits.map((deposit) => (
                          <tr key={deposit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {formatDate(deposit.depositDate)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {deposit.business.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {deposit.business.type}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-green-600">
                              {formatCurrency(deposit.amount)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={getTransactionTypeBadge(deposit.transactionType)}>
                                {getTransactionTypeLabel(deposit.transactionType)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                              {deposit.autoGeneratedNote}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {deposit.createdBy.name}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3">
                    {deposits.map((deposit) => (
                      <div key={deposit.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {deposit.business.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {deposit.business.type}
                            </p>
                          </div>
                          <p className="text-lg font-semibold text-green-600">
                            {formatCurrency(deposit.amount)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className={getTransactionTypeBadge(deposit.transactionType)}>
                            {getTransactionTypeLabel(deposit.transactionType)}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {formatDate(deposit.depositDate)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {deposit.autoGeneratedNote}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          By: {deposit.createdBy.name}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination.total > pagination.limit && (
                    <div className="mt-6 flex items-center justify-between border-t pt-4">
                      <button
                        onClick={handlePreviousPage}
                        disabled={pagination.offset === 0}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
                      </span>
                      <button
                        onClick={handleNextPage}
                        disabled={!pagination.hasMore}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}
