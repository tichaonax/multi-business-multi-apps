'use client'

import { SystemAdminRoute } from '@/components/auth/system-admin-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect, useRef } from 'react'
import { formatDateByFormat, formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'
import { canDeletePersonalExpense } from '@/lib/expense-deletion-utils'
import { useSession } from 'next-auth/react'
import { isSystemAdmin } from '@/lib/permission-utils'
import { useAlert } from '@/components/ui/confirm-modal'

interface User {
  id: string
  name: string
  email: string
  isActive: boolean
  createdAt: string
  _count: {
    personalExpenses: number
  }
  totalExpenses: number
  recentActivity?: {
    date: string
    amount: number
    description: string
  }
}

interface PersonalExpense {
  id: string
  amount: number
  description: string
  date: string
  paymentType: string
  tags?: string
  notes?: string
  createdAt: string
  category?: {
    id: string
    name: string
    emoji: string
    color: string
  }
  projectTransactions?: {
    id: string
    paymentMethod?: string
    transactionType?: string
    paymentCategory?: string
    status?: string
    notes?: string
    recipientPerson?: {
      id: string
      fullName: string
      phone: string
      email: string
    }
    projectContractor?: {
      person: {
        id: string
        fullName: string
        email: string
        phone: string
      }
    }
    constructionProject?: {
      id: string
      name: string
      status: string
    }
    projectStage?: {
      id: string
      name: string
    }
  }[]
}

interface FinanceData {
  user: User
  transactions: PersonalExpense[]
  summary: {
    totalExpenses: number
    totalTransactions: number
    expensesByCategory: Record<string, number>
    expensesByPaymentType: Record<string, number>
  }
}

export default function AdminPersonalFinancePage() {
  const { format: globalDateFormat } = useDateFormat()
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [financeData, setFinanceData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(true)
  const [editingExpense, setEditingExpense] = useState<PersonalExpense | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<PersonalExpense | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const customAlert = useAlert()
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [editForm, setEditForm] = useState({
    amount: '',
    description: '',
    notes: ''
  })
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [showContractorModal, setShowContractorModal] = useState(false)
  const [selectedProjectData, setSelectedProjectData] = useState<any>(null)
  const [selectedContractorData, setSelectedContractorData] = useState<any>(null)
  const [modalLoading, setModalLoading] = useState(false)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Load users on component mount
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setUsersLoading(true)
      const response = await fetch('/api/admin/personal-finance/users')
      if (response.ok) {
        const userData = await response.json()
        setUsers(userData)
      } else {
        console.error('Failed to fetch users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setUsersLoading(false)
    }
  }

  const fetchUserFinanceData = async (userId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/personal-finance?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setFinanceData(data)
      } else {
        console.error('Failed to fetch user finance data')
        setFinanceData(null)
      }
    } catch (error) {
      console.error('Error fetching user finance data:', error)
      setFinanceData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId)
    if (userId) {
      fetchUserFinanceData(userId)
    } else {
      setFinanceData(null)
    }
  }

  const handleUserSelectFromSearch = (user: User) => {
    setSelectedUser(user)
    setSelectedUserId(user.id)
    setSearchTerm(`${user.name} (${user.email})`)
    setIsDropdownOpen(false)
    fetchUserFinanceData(user.id)
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEditExpense = (expense: PersonalExpense) => {
    setEditingExpense(expense)
    setEditForm({
      amount: expense.amount.toString(),
      description: expense.description,
      notes: expense.notes || ''
    })
  }

  const handleSaveEdit = async () => {
    if (!editingExpense) return

    try {
      const response = await fetch('/api/admin/personal-finance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: editingExpense.id,
          amount: parseFloat(editForm.amount),
          description: editForm.description,
          notes: editForm.notes
        })
      })

      if (response.ok) {
        // Refresh the data
        if (selectedUserId) {
          fetchUserFinanceData(selectedUserId)
        }
        setEditingExpense(null)
      } else {
        console.error('Failed to update expense')
      }
    } catch (error) {
      console.error('Error updating expense:', error)
    }
  }

  const handleDeleteExpense = (expense: PersonalExpense) => {
    setDeletingExpense(expense)
    setDeleteConfirmation('')
  }

  const confirmDelete = async () => {
    if (!deletingExpense || deleteConfirmation.toLowerCase() !== 'delete') return

    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/personal/expenses/${deletingExpense.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (response.ok) {
        // Refresh the data
        if (selectedUserId) {
          fetchUserFinanceData(selectedUserId)
        }
        setDeletingExpense(null)
        setDeleteConfirmation('')

        // Show success message with rollback details if available
        if (result.rollback && result.rollback.totalRollback > 0) {
          await customAlert({ title: 'Expense Deleted', description: `Financial rollback applied: $${result.rollback.totalRollback.toFixed(2)}` })
        } else {
          await customAlert({ title: 'Expense Deleted', description: 'Expense deleted successfully' })
        }
      } else {
        // Show error message with specific details
        if (result.isTimeRestricted) {
          await customAlert({ title: 'Delete Failed', description: `Delete failed: ${result.error}` })
        } else {
          await customAlert({ title: 'Delete Failed', description: result.error || 'Failed to delete expense' })
        }
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
      await customAlert({ title: 'Error deleting expense', description: 'Error deleting expense. Please try again.' })
    } finally {
      setDeleteLoading(false)
    }
  }

  const formatDate = (dateString: string) => formatDateByFormat(dateString, globalDateFormat)
  const formatCurrency = (amount: number | string | any) => `$${Number(amount || 0).toFixed(2)}`

  // Helper function to check if user can edit an expense (same rules as deletion)
  const canEditExpense = (transaction: PersonalExpense): boolean => {
    if (!session?.user) return false

    const isAdmin = isSystemAdmin(session.user)
    if (isAdmin) return true

    // For non-admin users, check if the expense belongs to the selected user and is within 24 hours
    if (transaction.users?.id !== selectedUserId) return false

    const creationDate = new Date(transaction.createdAt)
    const now = new Date()
    const hoursSinceCreation = (now.getTime() - creationDate.getTime()) / (1000 * 60 * 60)

    return hoursSinceCreation <= 24
  }

  // Helper function to get contractor information for clickable navigation
  const getContractorInfo = (transaction: any): { id: string; name: string } | null => {
    // First check for direct contractor info from API
    if (transaction.contractorInfo) {
      return transaction.contractorInfo
    }

    // Legacy: Check project transactions for contractor info
    if (transaction.projectTransactions && transaction.project_transactions.length > 0) {
      const projectTransaction = transaction.projectTransactions[0]

      // Check for project contractor
      if (projectTransaction.projectContractor?.person) {
        return {
          id: projectTransaction.projectContractor.persons.id,
          name: projectTransaction.projectContractor.persons.fullName
        }
      }

      // Check for recipient person
      if (projectTransaction.recipientPerson) {
        return {
          id: projectTransaction.recipientPerson.id,
          name: projectTransaction.recipientPerson.fullName
        }
      }
    }

    return null
  }

  // Helper function to check if payment type indicates contractor payment
  const isContractorPaymentType = (transaction: PersonalExpense): boolean => {
    const paymentType = (getPaymentType(transaction) || 'category').toLowerCase()

    // Check if payment type contains contractor-related keywords
    return paymentType.includes('contractor') ||
           paymentType.includes('person payment') ||
           paymentType.includes('project payment') ||
           Boolean(transaction.projectTransactions && transaction.project_transactions.length > 0)
  }

  // Function to show project details modal
  const showProjectDetails = async (projectId: string) => {
    setModalLoading(true)
    setShowProjectModal(true)

    try {
      const response = await fetch(`/api/construction/projects/${projectId}`)
      if (response.ok) {
        const projectData = await response.json()
        setSelectedProjectData(projectData)
      } else {
        setSelectedProjectData({ error: 'Failed to load project details' })
      }
    } catch (error) {
      setSelectedProjectData({ error: 'Failed to load project details' })
    } finally {
      setModalLoading(false)
    }
  }

  // Function to show contractor details modal
  const showContractorDetails = async (contractorId: string) => {
    setModalLoading(true)
    setShowContractorModal(true)
    setSelectedContractorData(null)

    try {
      const response = await fetch(`/api/persons/${contractorId}`)
      if (response.ok) {
        const contractorData = await response.json()
        setSelectedContractorData(contractorData)
      } else {
        setSelectedContractorData({ error: 'Failed to load contractor details' })
      }
    } catch (error) {
      setSelectedContractorData({ error: 'Failed to load contractor details' })
    } finally {
      setModalLoading(false)
    }
  }

  // Helper function to determine payment type from transaction data
  const getPaymentType = (transaction: any): string => {
    // First use the API-derived payment type if available
    if (transaction.paymentType) {
      return transaction.paymentType
    }

    // Legacy fallback logic for backward compatibility
    if (transaction.projectTransactions && transaction.project_transactions.length > 0) {
      const projectTransaction = transaction.projectTransactions[0]

      // Use paymentCategory if available
      if (projectTransaction.paymentCategory) {
        return projectTransaction.paymentCategory
      }

      // Use transactionType
      if (projectTransaction.transactionType) {
        return projectTransaction.transactionType
      }

      // If it has contractor, it's a contractor payment
      if (projectTransaction.projectContractor) {
        return 'contractor'
      }

      // If it has recipient person, it's a person payment
      if (projectTransaction.recipientPerson) {
        return 'contractor'
      }

      // Fall back to project payment
      return 'project'
    }

    // Check for loan transactions
    if (transaction.loanTransactions && transaction.loanTransactions.length > 0) {
      return 'loan'
    }

    // Default to category
    return 'category'
  }

  return (
    <SystemAdminRoute>
      <ContentLayout
        title="Global Finance Administration"
        subtitle="View and manage user personal finance transactions"
        breadcrumb={[
          { label: 'Administration', href: '/admin' },
          { label: 'Global Finance', isActive: true }
        ]}
      >
        <div className="space-y-6">
          {/* User Selection */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Select User</h2>

            {usersLoading ? (
              <div className="text-secondary">Loading users...</div>
            ) : (
              <div className="space-y-4">
                <div className="relative" ref={dropdownRef}>
                  <div className="flex gap-2">
                    {searchTerm && (
                      <button
                        onClick={() => {
                          setSearchTerm('')
                          setSelectedUser(null)
                          setSelectedUserId('')
                          setFinanceData(null)
                          setIsDropdownOpen(false)
                        }}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
                        title="Clear search"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setIsDropdownOpen(true)
                        if (!e.target.value) {
                          setSelectedUser(null)
                          setSelectedUserId('')
                          setFinanceData(null)
                        }
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      placeholder="Search for a user by name or email..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {isDropdownOpen && filteredUsers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredUsers.map(user => (
                        <button
                          key={user.id}
                          onClick={() => handleUserSelectFromSearch(user)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-600 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-primary">{user.name}</div>
                              <div className="text-sm text-secondary">{user.email}</div>
                            </div>
                            <div className="text-sm text-secondary">
                              {user._count.personalExpenses} transactions - {formatCurrency(user.totalExpenses)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {isDropdownOpen && searchTerm && filteredUsers.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-3">
                      <div className="text-secondary text-center">No users found matching "{searchTerm}"</div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Users</h3>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{users.length}</p>
                    {searchTerm && (
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Filtered: {filteredUsers.length}</p>
                    )}
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Active Users with Expenses</h3>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {users.filter(u => u._count.personalExpenses > 0).length}
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200">Total System Expenses</h3>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(users.reduce((sum, user) => sum + user.totalExpenses, 0))}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Total Available Funds</h3>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(users.reduce((sum, user) => sum + (user.totalAvailable || 0), 0))}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Finance Data */}
          {selectedUserId && (
            <>
              {loading ? (
                <div className="card p-6">
                  <div className="text-secondary">Loading user finance data...</div>
                </div>
              ) : financeData ? (
                <div className="space-y-6">
                  {/* User vs Global Statistics */}
                  <div className="card p-6">
                    <h2 className="text-xl font-semibold text-primary mb-4">
                      {financeData.users.name} vs Global Statistics
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">User Total Expenses</h3>
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(financeData.summary.totalExpenses)}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          {((financeData.summary.totalExpenses / users.reduce((sum, user) => sum + user.totalExpenses, 0)) * 100).toFixed(1)}% of global total
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <h3 className="text-sm font-medium text-green-800 dark:text-green-200">User Transactions</h3>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                          {financeData.summary.totalTransactions}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          {((financeData.summary.totalTransactions / users.reduce((sum, user) => sum + user._count.personalExpenses, 0)) * 100).toFixed(1)}% of global transactions
                        </p>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                        <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200">Avg Transaction Size</h3>
                        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                          {formatCurrency(financeData.summary.totalExpenses / financeData.summary.totalTransactions || 0)}
                        </p>
                        <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                          vs Global Avg: {formatCurrency(users.reduce((sum, user) => sum + user.totalExpenses, 0) / users.reduce((sum, user) => sum + user._count.personalExpenses, 0) || 0)}
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Available Amount</h3>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(financeData.summary.availableAmount || 0)}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          {((financeData.summary.availableAmount || 0) / (users.reduce((sum, user) => sum + (user.totalAvailable || 0), 0) || 1) * 100).toFixed(1)}% of global available
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="card p-4">
                      <h3 className="text-sm font-medium text-secondary">Total Expenses</h3>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(financeData.summary.totalExpenses)}</p>
                    </div>
                    <div className="card p-4">
                      <h3 className="text-sm font-medium text-secondary">Total Transactions</h3>
                      <p className="text-2xl font-bold text-primary">{financeData.summary.totalTransactions}</p>
                    </div>
                    <div className="card p-4">
                      <h3 className="text-sm font-medium text-secondary">Avg Transaction</h3>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(financeData.summary.totalExpenses / financeData.summary.totalTransactions || 0)}
                      </p>
                    </div>
                    <div className="card p-4">
                      <h3 className="text-sm font-medium text-secondary">Payment Types</h3>
                      <p className="text-2xl font-bold text-primary">
                        {Object.keys(financeData.summary.expensesByPaymentType).length}
                      </p>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-primary mb-4">
                      Transactions for {financeData.users.name}
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                              Category/Project
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {financeData.transactions.map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-6 py-4 text-sm text-primary">
                                <div>
                                  <div className="font-medium">{formatDate(transaction.date)}</div>
                                  <div className="text-xs text-secondary">
                                    {new Date(transaction.createdAt).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-primary">
                                <div>
                                  <div className="font-medium">{transaction.description}</div>
                                  {transaction.notes && (
                                    <div className="text-xs text-secondary mt-1">Note: {transaction.notes}</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                                {(() => {
                                  const contractorInfo = getContractorInfo(transaction)
                                  const paymentType = getPaymentType(transaction)
                                  const isContractorRelated = isContractorPaymentType(transaction)

                                  if (contractorInfo) {
                                    // Specific contractor information available
                                    return (
                                      <button
                                        onClick={() => showContractorDetails(contractorInfo.id)}
                                        className="capitalize text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline cursor-pointer transition-colors"
                                        title={`View contractor: ${contractorInfo.name}`}
                                      >
                                        {paymentType}
                                      </button>
                                    )
                                  } else if (transaction.project_transactions?.[0]?.constructionProject?.id) {
                                    // Project-related payment
                                    return (
                                      <button
                                        onClick={() => showProjectDetails(transaction.project_transactions?.[0]?.constructionProject?.id || '')}
                                        className="capitalize text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline cursor-pointer transition-colors"
                                        title="View project details"
                                      >
                                        {paymentType}
                                      </button>
                                    )
                                  } else if (isContractorRelated) {
                                    // Contractor-related payment but no specific contractor info
                                    return (
                                      <span className="capitalize text-yellow-600 dark:text-yellow-400" title="Contractor payment - no details available">
                                        {paymentType}
                                      </span>
                                    )
                                  } else {
                                    // Not contractor-related
                                    return <span className="capitalize">{paymentType}</span>
                                  }
                                })()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                                {formatCurrency(transaction.amount)}
                              </td>
                              <td className="px-6 py-4 text-sm text-secondary">
                                {transaction.category && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    {transaction.category.emoji} {transaction.category.name}
                                  </span>
                                )}
                                {transaction.project_transactions?.map((projectTransaction, index) => (
                                  <div key={projectTransaction.id} className="space-y-1">
                                    {projectTransaction.constructionProject && (
                                      <button
                                        onClick={() => showProjectDetails(projectTransaction.constructionProject!.id)}
                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800 transition-colors cursor-pointer mr-1 mb-1"
                                        title={`View project: ${projectTransaction.constructionProject.name}`}
                                      >
                                        🏗️ {projectTransaction.constructionProject.name}
                                      </button>
                                    )}
                                    {projectTransaction.projectContractor?.person && (
                                      <button
                                        onClick={() => showContractorDetails(projectTransaction.projectContractor!.persons.id)}
                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors cursor-pointer mr-1 mb-1"
                                        title={`View contractor: ${projectTransaction.projectContractor.persons.fullName}`}
                                      >
                                        💰 {projectTransaction.projectContractor.persons.fullName}
                                      </button>
                                    )}
                                    {projectTransaction.recipientPerson && (
                                      <button
                                        onClick={() => showContractorDetails(projectTransaction.recipientPerson?.id || '')}
                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors cursor-pointer mr-1 mb-1"
                                        title={`View person: ${projectTransaction.recipientPerson?.fullName || 'Unknown'}`}
                                      >
                                        👤 {projectTransaction.recipientPerson?.fullName}
                                      </button>
                                    )}
                                    {projectTransaction.projectStage && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mr-1 mb-1">
                                        📋 {projectTransaction.projectStage.name}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                                <div className="flex space-x-3">
                                  {canEditExpense(transaction) && (
                                    <button
                                      onClick={() => handleEditExpense(transaction)}
                                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteExpense(transaction)}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card p-6">
                  <div className="text-secondary">No finance data found for selected user.</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Edit Modal */}
        {editingExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="card p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold text-primary mb-4">Edit Transaction</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Notes
                  </label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Optional notes for this transaction"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Payment Type
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-primary">
                    {(() => {
                      const contractorInfo = getContractorInfo(editingExpense)
                      const paymentType = getPaymentType(editingExpense)
                      const isContractorRelated = isContractorPaymentType(editingExpense)

                      if (contractorInfo) {
                        // Specific contractor information available
                        return (
                          <button
                            onClick={() => showContractorDetails(contractorInfo.id)}
                            className="capitalize text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline cursor-pointer transition-colors"
                            title={`View contractor: ${contractorInfo.name}`}
                          >
                            {paymentType}
                          </button>
                        )
                      } else if (editingExpense.project_transactions?.[0]?.constructionProject?.id) {
                        // Project-related payment
                        return (
                          <button
                            onClick={() => showProjectDetails(editingExpense.project_transactions?.[0]?.constructionProject?.id || '')}
                            className="capitalize text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline cursor-pointer transition-colors"
                            title="View project details"
                          >
                            {paymentType}
                          </button>
                        )
                      } else if (isContractorRelated) {
                        // Contractor-related payment but no specific contractor info
                        return (
                          <span className="capitalize text-yellow-600 dark:text-yellow-400" title="Contractor payment - no details available">
                            {paymentType}
                          </span>
                        )
                      } else {
                        // Not contractor-related
                        return <span className="capitalize">{paymentType}</span>
                      }
                    })()}
                  </div>
                  <p className="text-xs text-secondary mt-1">
                    Payment type is determined by project transaction details. {getContractorInfo(editingExpense) ? 'Click to view contractor details.' : isContractorPaymentType(editingExpense) ? 'Click to view construction projects and contractors.' : 'Cannot be edited here.'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveEdit}
                  className="btn-primary"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingExpense(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="card p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold text-primary mb-4">Confirm Deletion</h2>
              <div className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Warning: This action cannot be undone
                      </h3>
                      <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                        This will permanently delete the expense and apply financial rollbacks to affected systems.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-primary mb-2">Transaction Details:</h4>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 text-sm">
                    <p><span className="font-medium">Amount:</span> <span className="text-green-600 font-semibold">{formatCurrency(deletingExpense.amount)}</span></p>
                    <p><span className="font-medium">Description:</span> {deletingExpense.description}</p>
                    <p><span className="font-medium">Date:</span> {formatDate(deletingExpense.date)}</p>
                    <p><span className="font-medium">Type:</span> {deletingExpense.paymentType}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Type "DELETE" to confirm (case insensitive):
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Type DELETE to confirm"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={confirmDelete}
                  disabled={deleteConfirmation.toLowerCase() !== 'delete' || deleteLoading}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  {deleteLoading ? 'Deleting...' : 'Delete Expense'}
                </button>
                <button
                  onClick={() => {
                    setDeletingExpense(null)
                    setDeleteConfirmation('')
                  }}
                  disabled={deleteLoading}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Project Details Modal */}
        {showProjectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="card p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-primary">Project Details</h2>
                <button
                  onClick={() => {
                    setShowProjectModal(false)
                    setSelectedProjectData(null)
                  }}
                  className="text-secondary hover:text-primary text-2xl"
                >
                  ×
                </button>
              </div>

              {modalLoading ? (
                <div className="text-secondary text-center py-8">Loading project details...</div>
              ) : selectedProjectData?.error ? (
                <div className="text-red-600 text-center py-8">{selectedProjectData.error}</div>
              ) : selectedProjectData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary">Project Name</label>
                      <p className="text-primary font-medium">{selectedProjectData.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary">Status</label>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedProjectData.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        selectedProjectData.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        selectedProjectData.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {selectedProjectData.status}
                      </span>
                    </div>
                    {selectedProjectData.description && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-secondary">Description</label>
                        <p className="text-primary">{selectedProjectData.description}</p>
                      </div>
                    )}
                    {selectedProjectData.location && (
                      <div>
                        <label className="block text-sm font-medium text-secondary">Location</label>
                        <p className="text-primary">{selectedProjectData.location}</p>
                      </div>
                    )}
                    {selectedProjectData.budget && (
                      <div>
                        <label className="block text-sm font-medium text-secondary">Budget</label>
                        <p className="text-primary">{formatCurrency(selectedProjectData.budget)}</p>
                      </div>
                    )}
                    {selectedProjectData.startDate && (
                      <div>
                        <label className="block text-sm font-medium text-secondary">Start Date</label>
                        <p className="text-primary">{formatDate(selectedProjectData.startDate)}</p>
                      </div>
                    )}
                    {selectedProjectData.endDate && (
                      <div>
                        <label className="block text-sm font-medium text-secondary">End Date</label>
                        <p className="text-primary">{formatDate(selectedProjectData.endDate)}</p>
                      </div>
                    )}
                  </div>

                  {selectedProjectData.stages && selectedProjectData.stages.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">Project Stages</label>
                      <div className="space-y-2">
                        {selectedProjectData.stages.map((stage: any) => (
                          <div key={stage.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <span className="text-primary">{stage.name}</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              stage.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              stage.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {stage.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-secondary text-center py-8">No project data available</div>
              )}
            </div>
          </div>
        )}

        {/* Contractor Details Modal */}
        {showContractorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="card p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-primary">Contractor Details</h2>
                <button
                  onClick={() => {
                    setShowContractorModal(false)
                    setSelectedContractorData(null)
                  }}
                  className="text-secondary hover:text-primary text-2xl"
                >
                  ×
                </button>
              </div>

              {modalLoading ? (
                <div className="text-secondary text-center py-8">Loading contractor details...</div>
              ) : selectedContractorData?.error ? (
                <div className="text-red-600 text-center py-8">{selectedContractorData.error}</div>
              ) : selectedContractorData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary">Full Name</label>
                      <p className="text-primary font-medium">{selectedContractorData.fullName}</p>
                    </div>
                    {selectedContractorData.email && (
                      <div>
                        <label className="block text-sm font-medium text-secondary">Email</label>
                        <p className="text-primary">{selectedContractorData.email}</p>
                      </div>
                    )}
                    {selectedContractorData.phone && (
                      <div>
                        <label className="block text-sm font-medium text-secondary">Phone</label>
                        <p className="text-primary">{formatPhoneNumberForDisplay(selectedContractorData.phone)}</p>
                      </div>
                    )}
                    {selectedContractorData.nationalId && (
                      <div>
                        <label className="block text-sm font-medium text-secondary">National ID</label>
                        <p className="text-primary">{selectedContractorData.nationalId}</p>
                      </div>
                    )}
                    {selectedContractorData.address && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-secondary">Address</label>
                        <p className="text-primary">{selectedContractorData.address}</p>
                      </div>
                    )}
                    {selectedContractorData.skills && selectedContractorData.skills.length > 0 && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-secondary">Skills</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedContractorData.skills.map((skill: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-sm">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedContractorData.notes && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-secondary">Notes</label>
                        <p className="text-primary">{selectedContractorData.notes}</p>
                      </div>
                    )}
                  </div>

                  {selectedContractorData.projects && selectedContractorData.projects.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">Recent Projects</label>
                      <div className="space-y-2">
                        {selectedContractorData.projects.slice(0, 5).map((project: any) => (
                          <div key={project.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <span className="text-primary">{project.name}</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              project.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              project.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {project.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-secondary text-center py-8">No contractor data available</div>
              )}
            </div>
          </div>
        )}
      </ContentLayout>
    </SystemAdminRoute>
  )
}