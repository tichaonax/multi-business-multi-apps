'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { PaymentStatusBadge } from '@/components/payroll/payment-status-badge'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'

interface Payment {
  id: string
  employeeId: string
  employee: {
    employeeNumber: string
    firstName: string
    lastName: string
    fullName: string
    nationalId: string
  }
  amount: number
  paymentType: string
  status: string
  isAdvance: boolean
  paymentDate: string
  createdAt: string
  adjustmentNote?: string
  paymentSchedule?: string
  hasVoucher: boolean
  voucherNumber?: string
  isLocked: boolean
}

export default function PaymentHistoryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentHistoryContent />
    </Suspense>
  )
}

function PaymentHistoryContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const customAlert = useAlert()
  const customConfirm = useConfirm()

  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [exporting, setExporting] = useState(false)
  const [generatingVoucher, setGeneratingVoucher] = useState<string | null>(null)

  // Filter states
  const [filters, setFilters] = useState({
    employeeId: '',
    status: '',
    paymentType: '',
    startDate: '',
    endDate: '',
    isAdvance: '',
  })

  // Pagination
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  })

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    fetchPayments()
  }, [pagination.offset, filters])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setEmployees(data.employees || [])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
      })

      // Add filters
      if (filters.employeeId) params.append('employeeId', filters.employeeId)
      if (filters.status) params.append('status', filters.status)
      if (filters.paymentType) params.append('paymentType', filters.paymentType)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.isAdvance) params.append('isAdvance', filters.isAdvance)

      const response = await fetch(`/api/payroll/account/payments?${params}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setPayments(data.data.payments || [])
        setPagination({
          ...pagination,
          total: data.data.pagination.total,
          hasMore: data.data.pagination.hasMore,
        })
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value })
    setPagination({ ...pagination, offset: 0 }) // Reset to first page
  }

  const handleClearFilters = () => {
    setFilters({
      employeeId: '',
      status: '',
      paymentType: '',
      startDate: '',
      endDate: '',
      isAdvance: '',
    })
    setPagination({ ...pagination, offset: 0 })
  }

  const handleViewVoucher = async (paymentId: string) => {
    setGeneratingVoucher(paymentId)
    try {
      const response = await fetch(`/api/payroll/account/payments/${paymentId}/voucher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'view',
          format: 'html',
        }),
      })

      if (response.ok) {
        const html = await response.text()
        const newWindow = window.open('', '_blank')
        if (newWindow) {
          newWindow.document.write(html)
          newWindow.document.close()
        } else {
          customAlert({
            title: 'Popup Blocked',
            message: 'Please allow popups to view the voucher',
            type: 'error',
          })
        }
      } else {
        const data = await response.json()
        customAlert({
          title: 'Error',
          message: data.error || 'Failed to generate voucher',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Error viewing voucher:', error)
      customAlert({
        title: 'Error',
        message: 'An error occurred while viewing the voucher',
        type: 'error',
      })
    } finally {
      setGeneratingVoucher(null)
    }
  }

  const handleRegenerateVoucher = async (paymentId: string) => {
    const confirmed = await customConfirm({
      title: 'Regenerate Voucher',
      message: 'This will create a new voucher for this payment. The regeneration will be tracked. Continue?',
      confirmText: 'Regenerate',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    setGeneratingVoucher(paymentId)
    try {
      const response = await fetch(`/api/payroll/account/payments/${paymentId}/voucher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'regenerate',
          format: 'html',
        }),
      })

      if (response.ok) {
        const html = await response.text()
        const newWindow = window.open('', '_blank')
        if (newWindow) {
          newWindow.document.write(html)
          newWindow.document.close()
        }

        customAlert({
          title: 'Success',
          message: 'Voucher regenerated successfully',
          type: 'success',
        })

        // Refresh the list
        fetchPayments()
      } else {
        const data = await response.json()
        customAlert({
          title: 'Error',
          message: data.error || 'Failed to regenerate voucher',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Error regenerating voucher:', error)
      customAlert({
        title: 'Error',
        message: 'An error occurred while regenerating the voucher',
        type: 'error',
      })
    } finally {
      setGeneratingVoucher(null)
    }
  }

  const handleSignPayment = async (paymentId: string, employeeName: string) => {
    const confirmed = await customConfirm({
      title: 'Sign Payment',
      message: `Mark payment for ${employeeName} as signed? This means the employee has acknowledged the payment.`,
      confirmText: 'Sign Payment',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/payroll/account/payments/${paymentId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (response.ok) {
        await customAlert({
          title: 'Success',
          message: 'Payment signed successfully',
        })
        fetchPayments() // Refresh the list
      } else {
        const errorData = await response.json()
        await customAlert({
          title: 'Error',
          message: errorData.error || 'Failed to sign payment',
        })
      }
    } catch (error) {
      await customAlert({
        title: 'Error',
        message: 'Failed to sign payment',
      })
    }
  }

  const handleCompletePayment = async (paymentId: string, employeeName: string) => {
    const confirmed = await customConfirm({
      title: 'Complete Payment',
      message: `Mark payment for ${employeeName} as completed? This means the employee has received the money.`,
      confirmText: 'Mark as Completed',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/payroll/account/payments/${paymentId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (response.ok) {
        await customAlert({
          title: 'Success',
          message: 'Payment marked as completed successfully',
        })
        fetchPayments() // Refresh the list
      } else {
        const errorData = await response.json()
        await customAlert({
          title: 'Error',
          message: errorData.error || 'Failed to complete payment',
        })
      }
    } catch (error) {
      await customAlert({
        title: 'Error',
        message: 'Failed to complete payment',
      })
    }
  }

  const handleExportToExcel = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()

      // Add filters
      if (filters.employeeId) params.append('employeeId', filters.employeeId)
      if (filters.status) params.append('status', filters.status)
      if (filters.paymentType) params.append('paymentType', filters.paymentType)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.isAdvance) params.append('isAdvance', filters.isAdvance)
      params.append('format', 'csv')

      const response = await fetch(`/api/payroll/account/reports?${params}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payroll-payments-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        customAlert({
          title: 'Success',
          message: 'Payment history exported successfully',
          type: 'success',
        })
      } else {
        const data = await response.json()
        customAlert({
          title: 'Error',
          message: data.error || 'Failed to export data',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      customAlert({
        title: 'Error',
        message: 'An error occurred while exporting data',
        type: 'error',
      })
    } finally {
      setExporting(false)
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
    })
  }

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'REGULAR_SALARY':
        return 'Regular Salary'
      case 'ADVANCE':
        return 'Salary Advance'
      case 'BONUS':
        return 'Bonus'
      case 'COMMISSION':
        return 'Commission'
      default:
        return type
    }
  }

  const getPaymentTypeBadge = (type: string) => {
    const baseClasses = 'px-2 py-1 text-xs rounded-full font-medium'
    switch (type) {
      case 'REGULAR_SALARY':
        return `${baseClasses} bg-blue-100 text-blue-800`
      case 'ADVANCE':
        return `${baseClasses} bg-orange-100 text-orange-800`
      case 'BONUS':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'COMMISSION':
        return `${baseClasses} bg-purple-100 text-purple-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const activeFilterCount = Object.values(filters).filter((v) => v !== '').length

  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout
          title="📜 Payment History"
          description="View and manage all payroll payments"
        >
          <div className="space-y-6">
            {/* Back Button */}
            <button
              onClick={() => router.push('/payroll/account')}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              ← Back to Dashboard
            </button>

            {/* Filters Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  🔍 Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                      ({activeFilterCount} active)
                    </span>
                  )}
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleClearFilters}
                    disabled={activeFilterCount === 0}
                    className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={handleExportToExcel}
                    disabled={exporting || payments.length === 0}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    {exporting ? (
                      <>
                        <span>⏳</span>
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <span>📊</span>
                        <span>Export to CSV</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Employee Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Employee
                  </label>
                  <select
                    value={filters.employeeId}
                    onChange={(e) => handleFilterChange('employeeId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Employees</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName || `${emp.firstName} ${emp.lastName}`} ({emp.employeeNumber})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="VOUCHER_ISSUED">Voucher Issued</option>
                    <option value="SIGNED">Signed</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                {/* Payment Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Type
                  </label>
                  <select
                    value={filters.paymentType}
                    onChange={(e) => handleFilterChange('paymentType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="REGULAR_SALARY">Regular Salary</option>
                    <option value="ADVANCE">Salary Advance</option>
                    <option value="BONUS">Bonus</option>
                    <option value="COMMISSION">Commission</option>
                  </select>
                </div>

                {/* Start Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* End Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Advance Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Advance Only
                  </label>
                  <select
                    value={filters.isAdvance}
                    onChange={(e) => handleFilterChange('isAdvance', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Payments</option>
                    <option value="true">Advances Only</option>
                    <option value="false">Regular Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Payment History Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  💳 Payment Records
                </h2>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total: {pagination.total} payments
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
              ) : payments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-gray-500 dark:text-gray-400">No payments found</p>
                  {activeFilterCount > 0 && (
                    <p className="text-sm text-gray-400 mt-2">
                      Try adjusting your filters
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Voucher
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {payments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                            <td className="px-4 py-3 text-sm">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {payment.employee.fullName ||
                                    `${payment.employee.firstName} ${payment.employee.lastName}`}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {payment.employee.employeeNumber}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <p className="font-semibold text-gray-900 dark:text-gray-100">
                                {formatCurrency(payment.amount)}
                              </p>
                              {payment.isAdvance && (
                                <p className="text-xs text-orange-600 font-medium">Advance</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={getPaymentTypeBadge(payment.paymentType)}>
                                {getPaymentTypeLabel(payment.paymentType)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <PaymentStatusBadge status={payment.status} />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(payment.paymentDate)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {payment.voucherNumber || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <div className="flex items-center justify-end space-x-2">
                                {/* View Voucher - always available */}
                                <button
                                  onClick={() => handleViewVoucher(payment.id)}
                                  disabled={generatingVoucher === payment.id}
                                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="View Voucher"
                                >
                                  {generatingVoucher === payment.id ? '⏳' : '👁️'} View
                                </button>

                                {/* Sign Button - show for PENDING or VOUCHER_ISSUED */}
                                {(payment.status === 'PENDING' || payment.status === 'VOUCHER_ISSUED') && !payment.isLocked && (
                                  <button
                                    onClick={() => handleSignPayment(payment.id, payment.employee.fullName || `${payment.employee.firstName} ${payment.employee.lastName}`)}
                                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                    title="Sign Payment"
                                  >
                                    ✍️ Sign
                                  </button>
                                )}

                                {/* Complete Button - show for SIGNED */}
                                {payment.status === 'SIGNED' && (
                                  <button
                                    onClick={() => handleCompletePayment(payment.id, payment.employee.fullName || `${payment.employee.firstName} ${payment.employee.lastName}`)}
                                    className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                                    title="Mark as Completed"
                                  >
                                    ✅ Complete
                                  </button>
                                )}

                                {/* Regenerate - show for non-completed */}
                                {payment.status !== 'COMPLETED' && (
                                  <button
                                    onClick={() => handleRegenerateVoucher(payment.id)}
                                    disabled={generatingVoucher === payment.id}
                                    className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Regenerate Voucher"
                                  >
                                    {generatingVoucher === payment.id ? '⏳' : '🔄'} Regen
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden space-y-3">
                    {payments.map((payment) => (
                      <div key={payment.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {payment.employee.fullName ||
                                `${payment.employee.firstName} ${payment.employee.lastName}`}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {payment.employee.employeeNumber}
                            </p>
                          </div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(payment.amount)}
                          </p>
                        </div>

                        <div className="flex items-center flex-wrap gap-2">
                          <span className={getPaymentTypeBadge(payment.paymentType)}>
                            {getPaymentTypeLabel(payment.paymentType)}
                          </span>
                          <PaymentStatusBadge status={payment.status} />
                          {payment.isAdvance && (
                            <span className="px-2 py-1 text-xs rounded-full font-medium bg-orange-100 text-orange-800">
                              Advance
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <p>Date: {formatDate(payment.paymentDate)}</p>
                          {payment.voucherNumber && (
                            <p>Voucher: {payment.voucherNumber}</p>
                          )}
                        </div>

                        <div className="flex flex-col space-y-2 pt-2 border-t">
                          {/* View Voucher - always available */}
                          <button
                            onClick={() => handleViewVoucher(payment.id)}
                            disabled={generatingVoucher === payment.id}
                            className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {generatingVoucher === payment.id ? '⏳ Loading...' : '👁️ View Voucher'}
                          </button>

                          {/* Sign Button - show for PENDING or VOUCHER_ISSUED */}
                          {(payment.status === 'PENDING' || payment.status === 'VOUCHER_ISSUED') && !payment.isLocked && (
                            <button
                              onClick={() => handleSignPayment(payment.id, payment.employee.fullName || `${payment.employee.firstName} ${payment.employee.lastName}`)}
                              className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              ✍️ Sign Payment
                            </button>
                          )}

                          {/* Complete Button - show for SIGNED */}
                          {payment.status === 'SIGNED' && (
                            <button
                              onClick={() => handleCompletePayment(payment.id, payment.employee.fullName || `${payment.employee.firstName} ${payment.employee.lastName}`)}
                              className="w-full px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                              ✅ Mark as Completed
                            </button>
                          )}

                          {/* Regenerate - show for non-completed */}
                          {payment.status !== 'COMPLETED' && (
                            <button
                              onClick={() => handleRegenerateVoucher(payment.id)}
                              disabled={generatingVoucher === payment.id}
                              className="w-full px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {generatingVoucher === payment.id ? '⏳ Loading...' : '🔄 Regenerate Voucher'}
                            </button>
                          )}
                        </div>
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
                        Showing {pagination.offset + 1} -{' '}
                        {Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
                        {pagination.total}
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
