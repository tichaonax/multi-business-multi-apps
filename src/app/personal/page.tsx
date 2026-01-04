'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useState, useEffect } from 'react'
import type { Expense } from '@/types/expense'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { ExpenseDetailModal } from '@/components/personal/expense-detail-modal'
import { useSession } from 'next-auth/react'
import { hasPermission, hasUserPermission, isSystemAdmin } from '@/lib/permission-utils'
import { formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'
import { useNavigation } from '@/contexts/navigation-context'
import { canDeletePersonalExpense } from '@/lib/expense-deletion-utils'
import { useAlert } from '@/components/ui/confirm-modal'

// use shared Expense type from src/types/expense.ts

interface BudgetData {
  balance: number
  entries: Array<{
    id: string
    amount: number
    description: string
    type: string
    createdAt: string
  }>
}

// Helper component for permission-based cards
function PermissionCard({
  title,
  href,
  linkText,
  hasPermission: userHasPermission,
  requiredPermission
}: {
  title: string
  href: string
  linkText: string
  hasPermission: boolean
  requiredPermission: string
}) {
  const { navigateTo } = useNavigation()

  if (userHasPermission) {
    return (
      <div className="card p-4 sm:p-6 hover:shadow-lg transition-shadow">
        <h3 className="text-lg font-semibold text-primary mb-2">{title}</h3>
        <button
          onClick={() => navigateTo(href)}
          className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 text-left"
        >
          {linkText}
        </button>
      </div>
    )
  }

  return (
    <div className="card p-4 sm:p-6 bg-gray-50 dark:bg-gray-700 opacity-75 cursor-not-allowed transition-all">
      <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">{title}</h3>
      <div className="flex flex-col space-y-2">
        <span className="text-gray-400 dark:text-gray-500 text-sm cursor-not-allowed">
          {linkText}
        </span>
        <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
          🔒 Access Denied - Contact admin for "{requiredPermission}" permission
        </div>
      </div>
    </div>
  )
}

export default function PersonalPage() {
  const customAlert = useAlert()
  const { data: session } = useSession()
  const globalDateFormat = useDateFormat()
  const { navigateTo } = useNavigation()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budgetData, setBudgetData] = useState<BudgetData>({ balance: 0, entries: [] })
  const [loading, setLoading] = useState(true)
  const [totalThisMonth, setTotalThisMonth] = useState(0)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Helper function to format dates according to global settings
  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    return formatDateByFormat(dateString, globalDateFormat)
  }

  const calculateThisMonthTotal = (expenses: Expense[]) => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    const thisMonthTotal = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date)
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear
      })
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
    
    setTotalThisMonth(thisMonthTotal)
  }

  const handleExpenseClick = (expense: Expense) => {
    setSelectedExpense(expense)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setSelectedExpense(null)
    setShowModal(false)
  }

  const handleExpenseUpdate = (updatedExpense: Expense) => {
    setExpenses(expenses.map(exp => 
      exp.id === updatedExpense.id ? updatedExpense : exp
    ))
    // Update the selected expense so the modal shows the updated data
    setSelectedExpense(updatedExpense)
    // Recalculate this month's total
    const updatedExpensesList = expenses.map(exp => 
      exp.id === updatedExpense.id ? updatedExpense : exp
    )
    calculateThisMonthTotal(updatedExpensesList)
  }

  const handleDeleteClick = (expense: Expense, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent triggering row click
    setDeleteConfirmExpense(expense)
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmExpense(null)
  }

  // Filter expenses based on search term
  const filteredExpenses = expenses.filter(expense => {
    if (!searchTerm) return true

    const search = searchTerm.toLowerCase()

    // Search in description
    if (expense.description.toLowerCase().includes(search)) return true

    // Search in category
    if (expense.category.toLowerCase().includes(search)) return true

    // Search in notes
    if (expense.notes?.toLowerCase().includes(search)) return true

    // Search in project payments
    if (expense.projectPayments?.some(payment =>
      payment.project?.name.toLowerCase().includes(search) ||
      payment.contractor?.name.toLowerCase().includes(search)
    )) return true

    // Search in project transactions
    if (expense.project_transactions?.some(transaction =>
      transaction.projectContractor?.persons.name.toLowerCase().includes(search)
    )) return true

    // Search in amount
    if (expense.amount.toString().includes(search)) return true

    return false
  })

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmExpense) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/personal/expenses/${deleteConfirmExpense.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete expense')
      }

      // Remove the expense from the list
      const updatedExpenses = expenses.filter(exp => exp.id !== deleteConfirmExpense.id)
      setExpenses(updatedExpenses)
      
      // Recalculate this month's total
      calculateThisMonthTotal(updatedExpenses)
      
      // Refresh budget data
      fetch('/api/personal/budget')
        .then(res => res.json())
        .then(data => setBudgetData(data))
        .catch(console.error)

      // Close modal if the deleted expense was selected
      if (selectedExpense?.id === deleteConfirmExpense.id) {
        setSelectedExpense(null)
        setShowModal(false)
      }

    } catch (error) {
      console.error('Failed to delete expense:', error)
      void customAlert({ title: 'Delete failed', description: 'Failed to delete expense. Please try again.' })
    } finally {
      setDeleting(false)
      setDeleteConfirmExpense(null)
    }
  }

  const fetchData = () => {
    // Fetch budget data
    fetch('/api/personal/budget')
      .then(res => res.json())
      .then(data => setBudgetData(data))
      .catch(console.error)

    // Fetch real expenses
    fetch('/api/personal/expenses')
      .then(res => res.json())
      .then(data => {
        // Check if data is an array, otherwise use fallback
        if (Array.isArray(data)) {
          setExpenses(data)
          // Calculate this month's total from actual data
          calculateThisMonthTotal(data)
        } else {
          console.error('Expenses API returned non-array:', data)
          setExpenses([])
          setTotalThisMonth(0)
        }
      })
      .catch((error) => {
        console.error('Failed to fetch expenses:', error)
        // Fallback to static data if API fails
        const nowIso = new Date().toISOString()
        const fallbackExpenses: Expense[] = [
          { id: '1', category: 'Food', description: 'Grocery shopping', amount: 150.0, date: '2024-01-15', tags: 'weekly', notes: 'Weekly grocery run', userId: null, createdAt: nowIso, updatedAt: nowIso },
          { id: '2', category: 'Transport', description: 'Gas station', amount: 65.0, date: '2024-01-14', tags: 'fuel', notes: 'Fuel for work trips', userId: null, createdAt: nowIso, updatedAt: nowIso },
          { id: '3', category: 'Utilities', description: 'Electricity bill', amount: 120.0, date: '2024-01-12', tags: 'monthly', notes: 'Monthly utility payment', userId: null, createdAt: nowIso, updatedAt: nowIso },
        ]
        setExpenses(fallbackExpenses)
        calculateThisMonthTotal(fallbackExpenses)
      })
    setLoading(false)
  }

  useEffect(() => {
    fetchData()

    // Refresh data when window gains focus (user returns to tab)
    const handleFocus = () => {
      fetchData()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  return (
    <ProtectedRoute>
      <ContentLayout
        title="💰 Personal Expenses"
        showBackButton={false}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Personal', isActive: true }
        ]}
        headerActions={
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {hasUserPermission(session?.user, 'canAddMoney') && (
              <button
                onClick={() => navigateTo('/personal/add-money')}
                className="btn-primary"
              >
                💰 Add Money
              </button>
            )}
            {hasUserPermission(session?.user, 'canAddPersonalExpenses') && (
              <button
                onClick={() => navigateTo('/personal/new')}
                className="btn-primary bg-green-600 hover:bg-green-700"
              >
                Add Expense
              </button>
            )}
            <button
              onClick={() => navigateTo('/personal/categories')}
              className="btn-secondary"
            >
              📁 Categories
            </button>
            <button
              onClick={() => navigateTo('/dashboard')}
              className="btn-secondary"
            >
              🏠 Home
            </button>
          </div>
        }
      >

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          <div className="card p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-primary mb-2">💰 Available Balance</h3>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">${budgetData.balance ? budgetData.balance.toFixed(2) : '0.00'}</p>
          </div>

          <div className="card p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-primary mb-2">This Month Expenses</h3>
            <p className="text-2xl sm:text-3xl font-bold text-red-600">${totalThisMonth.toFixed(2)}</p>
          </div>

          <PermissionCard
            title="New Project"
            href="/projects/new"
            linkText="Create Project"
            hasPermission={hasUserPermission(session?.user, 'canCreatePersonalProjects')}
            requiredPermission="Create Personal Projects"
          />

          <PermissionCard
            title="Categories"
            href="/personal/categories"
            linkText="Manage Categories"
            hasPermission={hasUserPermission(session?.user, 'canManagePersonalCategories')}
            requiredPermission="Manage Personal Categories"
          />

          <PermissionCard
            title="Contractors"
            href="/personal/contractors"
            linkText="Manage People"
            hasPermission={hasUserPermission(session?.user, 'canAddPersonalExpenses')}
            requiredPermission="Add Personal Expenses"
          />

          <PermissionCard
            title="Reports"
            href="/personal/reports"
            linkText="View Reports"
            hasPermission={hasUserPermission(session?.user, 'canViewPersonalReports')}
            requiredPermission="View Personal Reports"
          />
        </div>

        <div className="card">
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-primary">Recent Expenses</h2>
                <button
                  onClick={fetchData}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  title="Refresh expenses"
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="relative w-full sm:max-w-md">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search expenses..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">🔍</span>
                </div>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            {searchTerm && (
              <div className="mt-2 text-sm text-secondary">
                Showing {filteredExpenses.length} of {expenses.length} expenses matching "{searchTerm}"
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Date</th>
                  <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Type</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Description</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Amount</th>
                  <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {Array.isArray(filteredExpenses) && filteredExpenses.map(expense => {
                  const payment = expense.projectPayments?.[0]
                  const loanTransaction = expense.loanTransactions?.[0]
                  const isProjectPayment = payment?.paymentType === 'project'
                  const isContractorPayment = payment?.paymentType === 'contractor'
                  const isLoanTransaction = !!loanTransaction
                  
                  return (
                    <tr
                      key={expense.id}
                      onClick={() => handleExpenseClick(expense)}
                      className={`transition-colors cursor-pointer ${
                        isLoanTransaction
                          ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border-l-4 border-green-500'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <td className="px-3 sm:px-6 py-4 text-sm text-primary">
                        <div>
                          <div className="font-medium">{formatDate(expense.date)}</div>
                          <div className="text-xs text-secondary">
                            {new Date(expense.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleExpenseClick(expense)}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {isProjectPayment ? (
                            <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                              🏗️ Project
                            </span>
                          ) : isContractorPayment ? (
                            <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                              👷 Contractor
                            </span>
                          ) : isLoanTransaction ? (
                            loanTransaction.transactionType === 'payment' ? (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                📈 Loan Payment
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                💸 Loan Advance
                              </span>
                            )
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              {expense.categoryObject?.emoji || '💰'} {expense.categoryObject?.name || expense.category}
                              {expense.subcategoryObject && (
                                <span className="text-xs opacity-75"> → {expense.subcategoryObject.emoji} {expense.subcategoryObject.name}</span>
                              )}
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-primary">
                        <div>{expense.description}</div>
                        {/* Show type info on mobile since Type column is hidden */}
                        <div className="sm:hidden mt-1">
                          {isProjectPayment ? (
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded mr-2">
                              🏗️ Project
                            </span>
                          ) : isContractorPayment ? (
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded mr-2">
                              👷 Contractor
                            </span>
                          ) : isLoanTransaction ? (
                            loanTransaction.transactionType === 'payment' ? (
                              <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded mr-2">
                                📈 Loan Payment
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded mr-2">
                                💸 Loan Advance
                              </span>
                            )
                          ) : (
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded mr-2">
                              {expense.categoryObject?.emoji || '💰'} {expense.categoryObject?.name || expense.category}
                              {expense.subcategoryObject && (
                                <span className="text-xs opacity-75"> → {expense.subcategoryObject.emoji} {expense.subcategoryObject.name}</span>
                              )}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        // Determine if this is income (green) or expense (red)
                        loanTransaction && loanTransaction.transactionType === 'payment'
                          ? 'text-green-600' // Loan repayment received - money coming in
                          : 'text-red-600'   // Regular expense or loan disbursement - money going out
                      }`}>
                        <div>
                          {loanTransaction && loanTransaction.transactionType === 'payment' ? '+' : '-'}${expense.amount ? Number(expense.amount).toFixed(2) : '0.00'}
                        </div>
                        {(() => {
                          if (!session?.user || !hasUserPermission(session.user, 'canEditPersonalExpenses')) {
                            return null
                          }

                          const adminStatus = isSystemAdmin(session.user)
                          const permissionCheck = canDeletePersonalExpense(session.user, expense, adminStatus)

                          // Hide delete button if user cannot delete (for non-admins, this is usually when time has expired)
                          if (!permissionCheck.canDelete) {
                            return null
                          }

                          return (
                            <div className="mt-1">
                              <button
                                onClick={(e) => handleDeleteClick(expense, e)}
                                className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                                title={permissionCheck.reason || "Delete expense"}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          )
                        })()}
                      </td>
                      <td className="hidden lg:table-cell px-3 sm:px-6 py-4 text-sm text-secondary">
                        {payment ? (
                          <div>
                            {payment.project && <div>Project: {payment.project.name}</div>}
                            {payment.contractor && <div>Contractor: {payment.contractor.name}</div>}
                            {payment.notes && <div className="text-xs mt-1 text-gray-400 dark:text-gray-500">{payment.notes}</div>}
                          </div>
                        ) : loanTransaction ? (
                          <div>
                            <div>🏦 Loan: {loanTransaction.loan.loanNumber}</div>
                            <div>
                              {loanTransaction.loan.lenderType === 'personal' ? '👤 Personal' : `🏢 ${loanTransaction.loan.lenderBusiness?.name}`} → {loanTransaction.loan.borrowerBusiness?.name ? `🏢 ${loanTransaction.loan.borrowerBusiness.name}` : `👤 ${loanTransaction.loan.borrowerPerson?.fullName}`}
                            </div>
                            <div className="text-xs mt-1 text-gray-400 dark:text-gray-500">Balance: ${loanTransaction.loan.remainingBalance.toFixed(2)}</div>
                          </div>
                        ) : (
                          expense.notes
                        )}
                      </td>
                    </tr>
                  )
                })}
                {(!Array.isArray(filteredExpenses) || filteredExpenses.length === 0) && (
                  <tr>
                    <td colSpan={3} className="sm:hidden px-3 sm:px-6 py-8 text-center text-secondary">
                      {loading ? 'Loading expenses...' : searchTerm ? `No expenses found matching "${searchTerm}"` : 'No expenses found. Add your first expense to get started!'}
                    </td>
                    <td colSpan={4} className="hidden sm:table-cell lg:hidden px-3 sm:px-6 py-8 text-center text-secondary">
                      {loading ? 'Loading expenses...' : searchTerm ? `No expenses found matching "${searchTerm}"` : 'No expenses found. Add your first expense to get started!'}
                    </td>
                    <td colSpan={5} className="hidden lg:table-cell px-3 sm:px-6 py-8 text-center text-secondary">
                      {loading ? 'Loading expenses...' : searchTerm ? `No expenses found matching "${searchTerm}"` : 'No expenses found. Add your first expense to get started!'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ExpenseDetailModal
          expense={selectedExpense}
          isOpen={showModal}
          onClose={handleCloseModal}
          onUpdate={handleExpenseUpdate}
        />

        {/* Delete Confirmation Modal */}
        {deleteConfirmExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-300 text-lg">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-primary">Delete Expense</h3>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-secondary">
                  Are you sure you want to delete this expense?
                </p>
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <p className="text-sm font-medium text-primary">{deleteConfirmExpense.description}</p>
                  <p className="text-sm text-secondary">
                    ${deleteConfirmExpense.amount ? Number(deleteConfirmExpense.amount).toFixed(2) : '0.00'} • {formatDate(deleteConfirmExpense.date)}
                  </p>
                </div>
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  This action cannot be undone. The amount will be restored to your available balance.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 text-sm font-medium text-secondary bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </ContentLayout>
    </ProtectedRoute>
  )
}