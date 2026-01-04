'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { EmployeePaymentRow } from '@/components/payroll/employee-payment-row'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'

interface Employee {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  fullName: string
  nationalId: string
}

interface PaymentData {
  employeeId: string
  amount: number
  note: string
}

export default function BatchPaymentsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BatchPaymentsContent />
    </Suspense>
  )
}

function BatchPaymentsContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const customAlert = useAlert()
  const customConfirm = useConfirm()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [accountBalance, setAccountBalance] = useState(0)

  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())
  const [paymentAmounts, setPaymentAmounts] = useState<Map<string, number>>(new Map())
  const [paymentNotes, setPaymentNotes] = useState<Map<string, string>>(new Map())

  const [defaultAmount, setDefaultAmount] = useState('1000')
  const [paymentType, setPaymentType] = useState<'REGULAR_SALARY' | 'BONUS' | 'COMMISSION'>('REGULAR_SALARY')
  const [paymentSchedule, setPaymentSchedule] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('MONTHLY')

  useEffect(() => {
    fetchEmployees()
    fetchAccountBalance()
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

  const handleToggleEmployee = (employeeId: string, selected: boolean) => {
    const newSelected = new Set(selectedEmployees)
    if (selected) {
      newSelected.add(employeeId)
      // Set default amount if not already set
      if (!paymentAmounts.has(employeeId)) {
        const newAmounts = new Map(paymentAmounts)
        newAmounts.set(employeeId, parseFloat(defaultAmount) || 0)
        setPaymentAmounts(newAmounts)
      }
    } else {
      newSelected.delete(employeeId)
    }
    setSelectedEmployees(newSelected)
  }

  const handleAmountChange = (employeeId: string, amount: number) => {
    const newAmounts = new Map(paymentAmounts)
    newAmounts.set(employeeId, amount)
    setPaymentAmounts(newAmounts)
  }

  const handleNoteChange = (employeeId: string, note: string) => {
    const newNotes = new Map(paymentNotes)
    newNotes.set(employeeId, note)
    setPaymentNotes(newNotes)
  }

  const handleSelectAll = () => {
    const allEmployeeIds = employees.map(e => e.id)
    const newSelected = new Set(allEmployeeIds)
    setSelectedEmployees(newSelected)

    // Set default amounts for all
    const newAmounts = new Map(paymentAmounts)
    allEmployeeIds.forEach(id => {
      if (!newAmounts.has(id)) {
        newAmounts.set(id, parseFloat(defaultAmount) || 0)
      }
    })
    setPaymentAmounts(newAmounts)
  }

  const handleDeselectAll = () => {
    setSelectedEmployees(new Set())
  }

  const handleApplyDefaultAmount = () => {
    const amount = parseFloat(defaultAmount) || 0
    const newAmounts = new Map(paymentAmounts)
    selectedEmployees.forEach(employeeId => {
      newAmounts.set(employeeId, amount)
    })
    setPaymentAmounts(newAmounts)
  }

  // Calculate total payment amount
  const totalAmount = Array.from(selectedEmployees).reduce((sum, employeeId) => {
    return sum + (paymentAmounts.get(employeeId) || 0)
  }, 0)

  const hasSufficientBalance = totalAmount <= accountBalance
  const balanceAfterPayment = accountBalance - totalAmount

  const handleSubmit = async () => {
    // Validation
    if (selectedEmployees.size === 0) {
      customAlert({
        title: 'No Employees Selected',
        message: 'Please select at least one employee to pay',
        type: 'error',
      })
      return
    }

    // Check amounts
    const invalidAmounts = Array.from(selectedEmployees).filter(
      employeeId => !paymentAmounts.get(employeeId) || paymentAmounts.get(employeeId)! <= 0
    )

    if (invalidAmounts.length > 0) {
      customAlert({
        title: 'Invalid Amounts',
        message: 'All selected employees must have a payment amount greater than $0',
        type: 'error',
      })
      return
    }

    // Check balance
    if (!hasSufficientBalance) {
      customAlert({
        title: 'Insufficient Balance',
        message: `Payroll account has insufficient funds. Required: $${totalAmount.toFixed(2)}, Available: $${accountBalance.toFixed(2)}`,
        type: 'error',
      })
      return
    }

    // Confirm
    const confirmed = await customConfirm({
      title: 'Confirm Batch Payment',
      message: `Are you sure you want to process ${selectedEmployees.size} payment(s) for a total of $${totalAmount.toFixed(2)}?`,
      confirmText: 'Process Payments',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    // Build payments array
    const payments: any[] = Array.from(selectedEmployees).map(employeeId => {
      const employee = employees.find(e => e.id === employeeId)
      return {
        employeeId,
        amount: paymentAmounts.get(employeeId) || 0,
        paymentType,
        paymentSchedule,
        adjustmentNote: paymentNotes.get(employeeId) || undefined,
      }
    })

    setSubmitting(true)

    try {
      const response = await fetch('/api/payroll/account/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ payments }),
      })

      const data = await response.json()

      if (response.ok) {
        customAlert({
          title: 'Success',
          message: `${selectedEmployees.size} payment(s) created successfully for $${totalAmount.toFixed(2)}`,
          type: 'success',
        })

        // Reset form
        setSelectedEmployees(new Set())
        setPaymentAmounts(new Map())
        setPaymentNotes(new Map())
        fetchAccountBalance()
      } else {
        customAlert({
          title: 'Error',
          message: data.error || 'Failed to create payments',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Error creating payments:', error)
      customAlert({
        title: 'Error',
        message: 'An error occurred while processing payments',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout
          title="💸 Batch Payment Processing"
          description="Process payments for multiple employees simultaneously"
        >
          <div className="space-y-6">
            {/* Back Button */}
            <button
              onClick={() => router.push('/payroll/account')}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              ← Back to Dashboard
            </button>

            {/* Account Balance Warning */}
            <div className={`rounded-lg p-4 ${
              accountBalance < 1000
                ? 'bg-red-50 border border-red-200'
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Payroll Account Balance
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(accountBalance)}
                  </p>
                </div>
                {accountBalance < 1000 && (
                  <div className="text-red-600">
                    <span className="text-2xl">⚠️</span>
                  </div>
                )}
              </div>
            </div>

            {/* Batch Controls */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">⚙️ Batch Settings</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Default Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Default Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={defaultAmount}
                      onChange={(e) => setDefaultAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="1000.00"
                    />
                  </div>
                </div>

                {/* Payment Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Type
                  </label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="REGULAR_SALARY">Regular Salary</option>
                    <option value="BONUS">Bonus</option>
                    <option value="COMMISSION">Commission</option>
                  </select>
                </div>

                {/* Payment Schedule */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Schedule
                  </label>
                  <select
                    value={paymentSchedule}
                    onChange={(e) => setPaymentSchedule(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Bi-weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
              </div>

              {/* Batch Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  disabled={loading || employees.length === 0}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAll}
                  disabled={selectedEmployees.size === 0}
                  className="px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Deselect All
                </button>
                <button
                  onClick={handleApplyDefaultAmount}
                  disabled={selectedEmployees.size === 0}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Default Amount to Selected
                </button>
              </div>
            </div>

            {/* Employee List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  👥 Select Employees ({selectedEmployees.size} selected)
                </h2>
                {employees.length > 0 && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Total: {employees.length} employees
                  </span>
                )}
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse border rounded-lg p-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👥</div>
                  <p className="text-gray-500 dark:text-gray-400">No employees found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {employees.map((employee) => (
                    <EmployeePaymentRow
                      key={employee.id}
                      employee={employee}
                      defaultAmount={parseFloat(defaultAmount) || 0}
                      isSelected={selectedEmployees.has(employee.id)}
                      onToggle={handleToggleEmployee}
                      onAmountChange={handleAmountChange}
                      onNoteChange={handleNoteChange}
                      disabled={submitting}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Payment Summary */}
            {selectedEmployees.size > 0 && (
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white sticky bottom-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm opacity-90">Total Payment Amount</p>
                    <p className="text-3xl font-bold">{formatCurrency(totalAmount)}</p>
                    <p className="text-sm opacity-90 mt-1">
                      {selectedEmployees.size} employee{selectedEmployees.size !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-90">Balance After Payment</p>
                    <p className={`text-2xl font-bold ${balanceAfterPayment < 0 ? 'text-red-200' : ''}`}>
                      {formatCurrency(balanceAfterPayment)}
                    </p>
                    {!hasSufficientBalance && (
                      <p className="text-sm text-red-200 mt-1">⚠️ Insufficient balance</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !hasSufficientBalance}
                  className="w-full px-6 py-3 bg-white dark:bg-gray-800 text-green-700 font-semibold rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 dark:bg-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Processing...' : `Process ${selectedEmployees.size} Payment${selectedEmployees.size !== 1 ? 's' : ''}`}
                </button>
              </div>
            )}
          </div>
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}
