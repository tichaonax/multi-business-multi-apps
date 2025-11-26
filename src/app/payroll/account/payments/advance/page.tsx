'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'

interface Employee {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  fullName: string
  nationalId: string
}

export default function SalaryAdvancePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SalaryAdvanceContent />
    </Suspense>
  )
}

function SalaryAdvanceContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const customAlert = useAlert()
  const customConfirm = useConfirm()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [accountBalance, setAccountBalance] = useState(0)
  const [recentAdvances, setRecentAdvances] = useState<any[]>([])

  const [formData, setFormData] = useState({
    employeeId: '',
    amount: '',
    reason: '',
    generateVoucher: true,
  })

  const [errors, setErrors] = useState({
    employeeId: '',
    amount: '',
    reason: '',
  })

  const [createdPaymentId, setCreatedPaymentId] = useState<string | null>(null)
  const [showVoucherOptions, setShowVoucherOptions] = useState(false)

  useEffect(() => {
    fetchEmployees()
    fetchAccountBalance()
    fetchRecentAdvances()
  }, [])

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
    } finally {
      setLoading(false)
    }
  }

  const fetchAccountBalance = async () => {
    try {
      const response = await fetch('/api/payroll/account', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setAccountBalance(Number(data.data.balance || 0))
      }
    } catch (error) {
      console.error('Error fetching account balance:', error)
    }
  }

  const fetchRecentAdvances = async () => {
    try {
      const response = await fetch('/api/payroll/account/payments?isAdvance=true&limit=5', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setRecentAdvances(data.data.payments || [])
      }
    } catch (error) {
      console.error('Error fetching recent advances:', error)
    }
  }

  const selectedEmployee = employees.find(e => e.id === formData.employeeId)

  const validateForm = () => {
    const newErrors = {
      employeeId: '',
      amount: '',
      reason: '',
    }

    if (!formData.employeeId) {
      newErrors.employeeId = 'Please select an employee'
    }

    const amount = parseFloat(formData.amount)
    if (!formData.amount || isNaN(amount)) {
      newErrors.amount = 'Please enter a valid amount'
    } else if (amount <= 0) {
      newErrors.amount = 'Amount must be greater than $0'
    } else if (amount > accountBalance) {
      newErrors.amount = `Insufficient balance. Available: $${accountBalance.toFixed(2)}`
    } else if (amount > 5000) {
      newErrors.amount = 'Advance amount cannot exceed $5,000'
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Please provide a reason for the advance'
    } else if (formData.reason.trim().length < 10) {
      newErrors.reason = 'Reason must be at least 10 characters'
    }

    setErrors(newErrors)
    return !newErrors.employeeId && !newErrors.amount && !newErrors.reason
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const employeeName = selectedEmployee?.fullName ||
      `${selectedEmployee?.firstName} ${selectedEmployee?.lastName}`

    const confirmed = await customConfirm({
      title: 'Confirm Salary Advance',
      message: `Process salary advance of $${parseFloat(formData.amount).toFixed(2)} for ${employeeName}?`,
      confirmText: 'Process Advance',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    setSubmitting(true)

    try {
      const response = await fetch('/api/payroll/account/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          employeeId: formData.employeeId,
          amount: parseFloat(formData.amount),
          paymentType: 'ADVANCE',
          isAdvance: true,
          adjustmentNote: formData.reason,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const paymentId = data.data.payments[0].id

        customAlert({
          title: 'Success',
          message: `Salary advance of $${parseFloat(formData.amount).toFixed(2)} created successfully`,
          type: 'success',
        })

        setCreatedPaymentId(paymentId)
        setShowVoucherOptions(formData.generateVoucher)

        // Reset form
        setFormData({
          employeeId: '',
          amount: '',
          reason: '',
          generateVoucher: true,
        })

        fetchAccountBalance()
        fetchRecentAdvances()

        // Auto-generate voucher if option enabled
        if (formData.generateVoucher) {
          await generateVoucher(paymentId)
        }
      } else {
        customAlert({
          title: 'Error',
          message: data.error || 'Failed to create advance payment',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Error creating advance payment:', error)
      customAlert({
        title: 'Error',
        message: 'An error occurred while processing the advance',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const generateVoucher = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/payroll/account/payments/${paymentId}/voucher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'generate', format: 'html' }),
      })

      if (response.ok) {
        const html = await response.text()
        const newWindow = window.open('', '_blank')
        if (newWindow) {
          newWindow.document.write(html)
          newWindow.document.close()
        }
      }
    } catch (error) {
      console.error('Error generating voucher:', error)
    }
  }

  const handleViewVoucher = () => {
    if (createdPaymentId) {
      generateVoucher(createdPaymentId)
      setShowVoucherOptions(false)
    }
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

  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout
          title="⚡ Salary Advance"
          description="Process individual advance payments for employees"
        >
          <div className="space-y-6">
            {/* Back Button */}
            <button
              onClick={() => router.push('/payroll/account')}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              ← Back to Dashboard
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Advance Payment Form */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">Create Advance Payment</h2>

                  {/* Account Balance */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-700">Available Balance</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {formatCurrency(accountBalance)}
                        </p>
                      </div>
                      {accountBalance < 500 && (
                        <div className="text-red-500">
                          <span className="text-2xl">⚠️</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Employee Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Employee <span className="text-red-500">*</span>
                      </label>
                      {loading ? (
                        <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-600 rounded"></div>
                      ) : (
                        <select
                          value={formData.employeeId}
                          onChange={(e) => {
                            setFormData({ ...formData, employeeId: e.target.value })
                            setErrors({ ...errors, employeeId: '' })
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.employeeId ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select an employee...</option>
                          {employees.map((employee) => {
                            const name = employee.fullName || `${employee.firstName} ${employee.lastName}`
                            return (
                              <option key={employee.id} value={employee.id}>
                                {name} - {employee.employeeNumber}
                              </option>
                            )
                          })}
                        </select>
                      )}
                      {errors.employeeId && (
                        <p className="mt-1 text-sm text-red-500">{errors.employeeId}</p>
                      )}
                      {selectedEmployee && (
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          National ID: {selectedEmployee.nationalId}
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Advance Amount <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="5000"
                          value={formData.amount}
                          onChange={(e) => {
                            setFormData({ ...formData, amount: e.target.value })
                            setErrors({ ...errors, amount: '' })
                          }}
                          className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.amount ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="0.00"
                        />
                      </div>
                      {errors.amount && (
                        <p className="mt-1 text-sm text-red-500">{errors.amount}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Maximum advance amount: $5,000.00
                      </p>

                      {/* Quick Amount Buttons */}
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Quick:</span>
                        {[100, 250, 500, 1000].map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setFormData({ ...formData, amount: amount.toString() })}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 dark:bg-gray-600 rounded border border-gray-300 dark:border-gray-600"
                          >
                            ${amount}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reason */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reason for Advance <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.reason}
                        onChange={(e) => {
                          setFormData({ ...formData, reason: e.target.value })
                          setErrors({ ...errors, reason: '' })
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.reason ? 'border-red-500' : 'border-gray-300'
                        }`}
                        rows={3}
                        placeholder="Please provide a detailed reason for this advance payment (minimum 10 characters)"
                      />
                      {errors.reason && (
                        <p className="mt-1 text-sm text-red-500">{errors.reason}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {formData.reason.length} characters
                      </p>
                    </div>

                    {/* Generate Voucher Option */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          checked={formData.generateVoucher}
                          onChange={(e) => setFormData({ ...formData, generateVoucher: e.target.checked })}
                          className="mt-1 mr-3"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Generate payment voucher immediately
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Opens voucher in new tab for printing and employee signature
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Submit Button */}
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            employeeId: '',
                            amount: '',
                            reason: '',
                            generateVoucher: true,
                          })
                          setErrors({ employeeId: '', amount: '', reason: '' })
                        }}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700"
                      >
                        Reset
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Processing...' : 'Process Advance'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Voucher Options (shown after successful payment) */}
                {showVoucherOptions && createdPaymentId && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-green-900">Payment Created Successfully!</p>
                        <p className="text-sm text-green-700 mt-1">
                          Voucher is being generated...
                        </p>
                      </div>
                      <button
                        onClick={() => setShowVoucherOptions(false)}
                        className="text-green-500 hover:text-green-700"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Advances */}
              <div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">📜 Recent Advances</h3>

                  {recentAdvances.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">📭</div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">No recent advances</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentAdvances.map((advance) => (
                        <div key={advance.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                              {advance.employee.name}
                            </p>
                            <p className="font-semibold text-green-600">
                              {formatCurrency(advance.amount)}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(advance.paymentDate)}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              advance.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-800'
                                : advance.status === 'SIGNED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {advance.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Help Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                  <h4 className="font-medium text-blue-900 mb-2">💡 About Advances</h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Maximum advance: $5,000</li>
                    <li>• Reason is required</li>
                    <li>• Voucher generated instantly</li>
                    <li>• Can be deducted from next salary</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}
