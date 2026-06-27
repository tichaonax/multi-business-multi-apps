'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { AccountBalanceCard } from '@/components/payroll/account-balance-card'
import { EmployeeLoanPanel } from '@/components/payroll/employee-loan-panel'
import { useAlert } from '@/components/ui/confirm-modal'

export default function PayrollAccountPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PayrollAccountContent />
    </Suspense>
  )
}

function PayrollAccountContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const customAlert = useAlert()
  const [accountData, setAccountData] = useState<any>(null)
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null)
  const [breakdownData, setBreakdownData] = useState<any | null>(null)
  const [breakdownLoading, setBreakdownLoading] = useState(false)

  useEffect(() => {
    fetchAccountData()
    fetchRecentTransactions()
  }, [])

  const fetchAccountData = async () => {
    try {
      const response = await fetch('/api/payroll/account', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setAccountData(data.data)
      } else {
        customAlert({
          title: 'Error',
          message: 'Failed to load payroll account data',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Error fetching account data:', error)
      customAlert({
        title: 'Error',
        message: 'An error occurred while loading account data',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentTransactions = async () => {
    try {
      const response = await fetch('/api/payroll/account/history?limit=10', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setRecentTransactions(data.data.transactions || [])
      }
    } catch (error) {
      console.error('Error fetching recent transactions:', error)
    } finally {
      setTransactionsLoading(false)
    }
  }

  const getTransactionIcon = (type: string) => {
    return type === 'DEPOSIT' ? '💰' : '💸'
  }

  const getTransactionColor = (type: string) => {
    return type === 'DEPOSIT' ? 'text-green-400' : 'text-orange-400'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const DETAIL_TYPES = ['SALARY', 'ZIMRA_PAYE', 'NSSA', 'AIDS_LEVY']

  const handleTransactionClick = async (transaction: any) => {
    if (transaction.type !== 'PAYMENT' || !DETAIL_TYPES.includes(transaction.paymentType)) return
    setSelectedTransaction(transaction)
    setBreakdownData(null)
    setBreakdownLoading(true)
    try {
      const res = await fetch(`/api/payroll/account/payments/${transaction.id}/breakdown`, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setBreakdownData(json.data)
      }
    } catch (e) {
      console.error('Error fetching breakdown:', e)
    } finally {
      setBreakdownLoading(false)
    }
  }

  const closeModal = () => {
    setSelectedTransaction(null)
    setBreakdownData(null)
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
        <ContentLayout
          title="💼 Payroll Account"
          description="Manage payroll deposits and employee payments"
        >
          <div className="space-y-6">
            {/* Balance Card */}
            {loading ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
                  <div className="h-12 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
              </div>
            ) : (
              <AccountBalanceCard accountData={accountData} onRefresh={fetchAccountData} canEditThreshold={session?.user?.role === 'admin'} />
            )}

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">⚡ Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <button
                  onClick={() => router.push('/payroll/account/deposits')}
                  className="flex flex-col items-center justify-center p-4 border-2 border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/20 hover:border-blue-400 transition-colors"
                >
                  <span className="text-3xl mb-2">💰</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Make Deposit</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">From business accounts</span>
                </button>

                <button
                  onClick={() => router.push('/payroll/account/payments')}
                  className="flex flex-col items-center justify-center p-4 border-2 border-green-200 dark:border-green-800 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 dark:bg-green-900/20 hover:border-green-400 transition-colors"
                >
                  <span className="text-3xl mb-2">💸</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Process Payments</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Batch employee payments</span>
                </button>

                <button
                  onClick={() => router.push('/payroll/account/payments/advance')}
                  className="flex flex-col items-center justify-center p-4 border-2 border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 dark:bg-purple-900/20 hover:border-purple-400 transition-colors"
                >
                  <span className="text-3xl mb-2">⚡</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Salary Advance</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Individual advance payment</span>
                </button>

                <button
                  onClick={() => router.push('/payroll/account/payments/history')}
                  className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 hover:border-gray-400 transition-colors"
                >
                  <span className="text-3xl mb-2">📜</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">View History</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Payment records</span>
                </button>

                <button
                  onClick={() => router.push('/payroll/account/reports')}
                  className="flex flex-col items-center justify-center p-4 border-2 border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/30 dark:bg-teal-900/20 hover:border-teal-400 transition-colors"
                >
                  <span className="text-3xl mb-2">📊</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Reports</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Analytics & exports</span>
                </button>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">📝 Recent Transactions</h2>
                <button
                  onClick={() => router.push('/payroll/account/history')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View All →
                </button>
              </div>

              {transactionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-4 p-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                      </div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Make a deposit to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      onClick={() => handleTransactionClick(transaction)}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        transaction.type === 'PAYMENT' && DETAIL_TYPES.includes(transaction.paymentType)
                          ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer active:bg-blue-100'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      } dark:bg-gray-700`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-600 rounded-full text-xl">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(transaction.date)}
                            {transaction.sourceBusiness && (
                              <span className="ml-2">
                                • {transaction.sourceBusiness.name}
                              </span>
                            )}
                            {transaction.employee && (
                              <span className="ml-2">
                                • {transaction.employee.name}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                          {transaction.amount > 0 ? '+' : ''}
                          {formatCurrency(Math.abs(transaction.amount))}
                        </p>
                        {transaction.balanceAfter !== undefined && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Balance: {formatCurrency(transaction.balanceAfter)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Employee Loans */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <EmployeeLoanPanel canManage={true} />
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                💡 Getting Started
              </h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p>
                  <strong>1. Make a Deposit:</strong> Transfer funds from your business accounts to the payroll account
                </p>
                <p>
                  <strong>2. Process Payments:</strong> Create batch payments for multiple employees or individual salary advances
                </p>
                <p>
                  <strong>3. Issue Vouchers:</strong> Generate payment vouchers for employee signatures
                </p>
                <p>
                  <strong>4. Track History:</strong> View comprehensive reports and export to Excel
                </p>
              </div>
            </div>
          </div>
        </ContentLayout>

        {/* Transaction Detail Modal */}
        {selectedTransaction && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={closeModal}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {selectedTransaction.paymentType === 'SALARY' && 'Payslip Breakdown'}
                    {selectedTransaction.paymentType === 'ZIMRA_PAYE' && 'ZIMRA PAYE Breakdown'}
                    {selectedTransaction.paymentType === 'NSSA' && 'NSSA Contribution Breakdown'}
                    {selectedTransaction.paymentType === 'AIDS_LEVY' && 'AIDS Levy Breakdown'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {selectedTransaction.description}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5">
                {breakdownLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}

                {!breakdownLoading && !breakdownData && (
                  <p className="text-center text-gray-500 py-8">Unable to load breakdown details.</p>
                )}

                {!breakdownLoading && breakdownData?.type === 'SALARY' && (
                  <div className="space-y-5">
                    {/* Employee info */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                        {breakdownData.employee.name}
                      </p>
                      {breakdownData.employee.employeeNumber && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {breakdownData.employee.employeeNumber}
                          {breakdownData.employee.nationalId && ` · ${breakdownData.employee.nationalId}`}
                        </p>
                      )}
                      {breakdownData.period && (
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                          {breakdownData.period.label}
                        </p>
                      )}
                    </div>

                    {/* Earnings */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Earnings
                      </p>
                      <div className="space-y-1.5">
                        {[
                          { label: 'Basic Salary', val: breakdownData.earnings.baseSalary },
                          { label: 'Commission', val: breakdownData.earnings.commission },
                          { label: 'Living Allowance', val: breakdownData.earnings.livingAllowance },
                          { label: 'Vehicle Allowance', val: breakdownData.earnings.vehicleAllowance },
                          { label: 'Travel Allowance', val: breakdownData.earnings.travelAllowance },
                          { label: 'Overtime Pay', val: breakdownData.earnings.overtimePay },
                          { label: 'Benefits', val: breakdownData.earnings.benefitsTotal },
                        ].filter((r) => r.val > 0).map((row) => (
                          <div key={row.label} className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{row.label}</span>
                            <span className="text-gray-900 dark:text-gray-100">{formatCurrency(row.val)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-semibold border-t border-gray-200 dark:border-gray-600 pt-1.5 mt-1">
                          <span className="text-gray-800 dark:text-gray-200">Gross Pay</span>
                          <span className="text-gray-900 dark:text-gray-100">{formatCurrency(breakdownData.earnings.grossPay)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Deductions
                      </p>
                      <div className="space-y-1.5">
                        {[
                          { label: 'PAYE Tax', val: breakdownData.deductions.payeTax },
                          { label: 'AIDS Levy', val: breakdownData.deductions.aidsLevy },
                          { label: 'NSSA (Employee)', val: breakdownData.deductions.nssaEmployee },
                          { label: 'Loan Repayments', val: breakdownData.deductions.loanDeductions },
                          { label: 'Advance Recovery', val: breakdownData.deductions.advanceDeductions },
                          { label: 'Misc Deductions', val: breakdownData.deductions.miscDeductions },
                        ].filter((r) => r.val > 0).map((row) => (
                          <div key={row.label} className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{row.label}</span>
                            <span className="text-red-600 dark:text-red-400">-{formatCurrency(row.val)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-semibold border-t border-gray-200 dark:border-gray-600 pt-1.5 mt-1">
                          <span className="text-gray-800 dark:text-gray-200">Total Deductions</span>
                          <span className="text-red-600 dark:text-red-400">-{formatCurrency(breakdownData.deductions.totalDeductions)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Net Pay */}
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">Net Pay</span>
                        <span className="text-xl font-bold text-green-700 dark:text-green-400">
                          {formatCurrency(breakdownData.netPay)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {!breakdownLoading && breakdownData && ['ZIMRA_PAYE', 'NSSA', 'AIDS_LEVY'].includes(breakdownData.type) && (
                  <div className="space-y-4">
                    {breakdownData.period && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        Period: {breakdownData.period.label}
                      </p>
                    )}
                    <div>
                      <div className="grid grid-cols-[1fr_auto] gap-x-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600 pb-2 mb-2">
                        <span>Employee</span>
                        <span className="text-right">Amount</span>
                      </div>
                      <div className="space-y-2">
                        {breakdownData.rows.map((row: any, i: number) => (
                          <div key={i} className="grid grid-cols-[1fr_auto] gap-x-4 text-sm">
                            <div>
                              <p className="text-gray-900 dark:text-gray-100">{row.employeeName}</p>
                              {row.employeeNumber && (
                                <p className="text-xs text-gray-400">{row.employeeNumber}</p>
                              )}
                            </div>
                            <span className="text-gray-900 dark:text-gray-100 text-right font-medium">
                              {formatCurrency(row.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-600 pt-3 font-semibold">
                      <span className="text-gray-900 dark:text-gray-100">Total</span>
                      <span className="text-lg text-gray-900 dark:text-gray-100">{formatCurrency(breakdownData.total)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </ProtectedRoute>
  )
}
