'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { hasUserPermission, isSystemAdmin } from '@/lib/permission-utils'
import { DateInput } from '@/components/ui/date-input'
import { formatDateByFormat, formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'
import { CategorySelector } from '@/components/personal/category-selector'
import type { Expense } from '@/types/expense'

interface ExpenseDetailModalProps {
  expense: Expense | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: (updatedExpense: Expense) => void
}

export function ExpenseDetailModal({ expense, isOpen, onClose, onUpdate }: ExpenseDetailModalProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { format: globalDateFormat } = useDateFormat()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [contractors, setContractors] = useState<any[]>([])
  const [editForm, setEditForm] = useState({
    description: '',
    categoryId: '',
    subcategoryId: '',
    amount: '',
    date: '',
    tags: '',
    paymentType: '',
    projectId: '',
    contractorId: ''
  })
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [detailsData, setDetailsData] = useState<any>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsType, setDetailsType] = useState<'contractor' | 'project' | 'loan' | null>(null)

  const currentUser = session?.user as any

  // Helper function to check if editing is allowed (both permission and time-based)
  const canEdit = () => {
    if (!currentUser || !expense) return false

    // Check basic permission
    if (!hasUserPermission(currentUser, 'canEditPersonalExpenses')) return false

    // Admins can always edit
    if (isSystemAdmin(currentUser)) return true

    // Check 24-hour window for non-admin users
    const creationDate = new Date(expense.createdAt)
    const now = new Date()
    const hoursSinceCreation = (now.getTime() - creationDate.getTime()) / (1000 * 60 * 60)

    return hoursSinceCreation <= 24
  }

  const isEditAllowed = canEdit()

  // Helper function to get time restriction message
  const getTimeRestrictionMessage = () => {
    if (!expense) return null

    const creationDate = new Date(expense.createdAt)
    const now = new Date()
    const hoursSinceCreation = (now.getTime() - creationDate.getTime()) / (1000 * 60 * 60)

    if (hoursSinceCreation > 24) {
      return 'This expense is older than 24 hours and can only be edited by an administrator.'
    }

    const hoursRemaining = 24 - hoursSinceCreation
    if (hoursRemaining < 2) {
      return `You have ${Math.floor(hoursRemaining * 60)} minutes remaining to edit this expense.`
    }

    return `You have ${Math.floor(hoursRemaining)} hours remaining to edit this expense.`
  }

  // Helper function to parse contractor information from tags
  const parseContractorFromTags = (tags: string): { id: string; name: string } | null => {
    if (tags && tags.startsWith('contractor:')) {
      const tagParts = tags.split(':')
      if (tagParts.length === 3) {
        return {
          id: tagParts[1],
          name: tagParts[2]
        }
      }
    }
    return null
  }

  // Helper function to check if tags should be displayed to user
  const shouldDisplayTags = (tags: string | null): boolean => {
    if (!tags) return false

    // System-generated tags that should not be shown to users
    const systemTags = ['project', 'category']
    const isSystemTag = systemTags.includes(tags)
    const isContractorTag = tags.startsWith('contractor:')

    return !isSystemTag && !isContractorTag
  }

  // Function to fetch details based on type
  const fetchDetails = async (type: 'contractor' | 'project' | 'loan', id: string, data?: any) => {
    setDetailsLoading(true)
    setShowDetailsModal(true)
    setDetailsData(null)
    setDetailsType(type)

    try {
      let response
      switch (type) {
        case 'contractor':
          response = await fetch(`/api/persons/${id}`)
          break
        case 'project':
          response = await fetch(`/api/construction/projects/${id}`)
          break
        case 'loan':
          // For loans, we already have the data from the transaction
          setDetailsData(data)
          setDetailsLoading(false)
          return
        default:
          throw new Error('Unknown detail type')
      }

      if (response.ok) {
        const responseData = await response.json()
        setDetailsData(responseData)
      } else {
        setDetailsData({ error: `Failed to load ${type} details` })
      }
    } catch (error) {
      console.error(`Error fetching ${type} details:`, error)
      setDetailsData({ error: `Failed to load ${type} details` })
    } finally {
      setDetailsLoading(false)
    }
  }

  // Helper function to format dates according to global settings
  const formatDate = (dateString: string) => formatDateByFormat(dateString, globalDateFormat)
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const formattedDate = formatDateByFormat(dateString, globalDateFormat)
    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return `${formattedDate} ${formattedTime}`
  }

  useEffect(() => {
    if (expense) {
      const transaction = expense.project_transactions?.[0]
      const loanTransaction = expense.loanTransactions?.[0]
      let paymentType = 'category'

      if (loanTransaction) {
        paymentType = 'loan'
      } else if (transaction?.paymentType) {
        paymentType = transaction.paymentType
      } else if (parseContractorFromTags(expense.tags || '') || expense.category === 'Contractor Payment') {
        paymentType = 'contractor'
      } else if (expense.tags === 'project') {
        paymentType = 'project'
      }

      setEditForm({
        description: expense.description || '',
        categoryId: (expense as any).categoryId || '',
        subcategoryId: (expense as any).subcategoryId || '',
        amount: expense.amount?.toString() || '',
        date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : '',
        tags: shouldDisplayTags(expense.tags || null) ? expense.tags || '' : '',
        paymentType: paymentType,
        projectId: transaction?.projectId || '',
        contractorId: transaction?.projectContractor?.id || ''
      })
    }
  }, [expense])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/construction/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }


  const fetchContractors = async (projectId: string) => {
    if (!projectId) {
      setContractors([])
      return
    }
    try {
      const response = await fetch(`/api/construction/projects/${projectId}/contractors`)
      if (response.ok) {
        const data = await response.json()
        setContractors(data)
      }
    } catch (error) {
      console.error('Error fetching contractors:', error)
      setContractors([])
    }
  }

  if (!isOpen || !expense) return null

  const handleSave = async () => {
    if (!isEditAllowed || !expense) return

    try {
      setLoading(true)
      const response = await fetch(`/api/personal/expenses/${expense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editForm.description,
          categoryId: editForm.categoryId || null,
          subcategoryId: editForm.subcategoryId || null,
          amount: parseFloat(editForm.amount),
          date: editForm.date,
          tags: editForm.tags,
          paymentType: editForm.paymentType,
          projectId: editForm.projectId || null,
          contractorId: editForm.contractorId || null
        })
      })

      if (response.ok) {
        const updatedExpense = await response.json()
        // Update the parent component's state
        onUpdate?.(updatedExpense)
        setIsEditing(false)
        
        // Force the modal to re-render with updated data by updating form state
        const transaction = updatedExpense.project_transactions?.[0]
        let paymentType = 'category'
        if (transaction?.paymentType) {
          paymentType = transaction.paymentType
        } else if (parseContractorFromTags(updatedExpense.tags || '') || updatedExpense.category === 'Contractor Payment') {
          paymentType = 'contractor'
        } else if (updatedExpense.tags === 'project') {
          paymentType = 'project'
        }
        
        setEditForm({
          description: updatedExpense.description || '',
          category: updatedExpense.category || '',
          amount: updatedExpense.amount?.toString() || '',
          date: updatedExpense.date ? new Date(updatedExpense.date).toISOString().split('T')[0] : '',
          tags: shouldDisplayTags(updatedExpense.tags || null) ? updatedExpense.tags || '' : '',
          paymentType: paymentType,
          projectId: transaction?.projectId || '',
          contractorId: transaction?.projectContractor?.id || ''
        })
      } else {
        console.error('Failed to update expense')
      }
    } catch (error) {
      console.error('Error updating expense:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    const transaction = expense.project_transactions?.[0]
    let paymentType = 'category'
    if (transaction?.paymentType) {
      paymentType = transaction.paymentType
    } else if (parseContractorFromTags(expense.tags || '') || expense.category === 'Contractor Payment') {
      paymentType = 'contractor'
    } else if (expense.tags === 'project') {
      paymentType = 'project'
    }
    
    setEditForm({
      description: expense.description || '',
      category: expense.category || '',
      amount: expense.amount?.toString() || '',
      date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : '',
      tags: shouldDisplayTags(expense.tags || null) ? expense.tags || '' : '',
      paymentType: paymentType,
      projectId: transaction?.projectId || '',
      contractorId: transaction?.projectContractor?.id || ''
    })
  }

  const transaction = expense.project_transactions?.[0]
  const loanTransaction = expense.loanTransactions?.[0]
  const contractorFromTags = parseContractorFromTags(expense.tags || '')
  const isProjectPayment = transaction?.paymentType === 'project' || expense.tags === 'project'
  const isContractorPayment = transaction?.paymentType === 'contractor' || !!contractorFromTags || expense.category === 'Contractor Payment'
  const isLoanTransaction = !!loanTransaction

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="card max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-primary">
              {isEditing ? 'Edit Expense' : 'Expense Details'}
            </h2>
            <div className="flex gap-2">
              {!isEditing && isEditAllowed && (
                <button
                  onClick={() => {
                    setIsEditing(true)
                    fetchProjects()
                    if (editForm.projectId) {
                      fetchContractors(editForm.projectId)
                    }
                  }}
                  className="btn-primary bg-blue-600 hover:bg-blue-700"
                >
                  Edit
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {isEditing ? (
            <div className="space-y-4">
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

              {/* Category & Subcategory Selector */}
              <CategorySelector
                onCategoryChange={(categoryId, subcategoryId) => {
                  setEditForm({
                    ...editForm,
                    categoryId: categoryId || '',
                    subcategoryId: subcategoryId || ''
                  })
                }}
                initialCategoryId={editForm.categoryId}
                initialSubcategoryId={editForm.subcategoryId}
                required={true}
              />

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <DateInput
                value={editForm.date}
                onChange={(date) => setEditForm({...editForm, date})}
                label="Date"
              />

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Payment Type
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentType"
                      value="category"
                      checked={editForm.paymentType === 'category'}
                      onChange={(e) => setEditForm({...editForm, paymentType: e.target.value})}
                      className="mr-2"
                    />
                    Regular Expense
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentType"
                      value="project"
                      checked={editForm.paymentType === 'project'}
                      onChange={(e) => setEditForm({...editForm, paymentType: e.target.value})}
                      className="mr-2"
                    />
                    Project Payment
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentType"
                      value="contractor"
                      checked={editForm.paymentType === 'contractor'}
                      onChange={(e) => setEditForm({...editForm, paymentType: e.target.value})}
                      className="mr-2"
                    />
                    Contractor Payment
                  </label>
                </div>
              </div>

              {(editForm.paymentType === 'project' || editForm.paymentType === 'contractor') && (
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Project *
                  </label>
                  <select
                    value={editForm.projectId}
                    onChange={(e) => {
                      setEditForm({...editForm, projectId: e.target.value, contractorId: ''})
                      fetchContractors(e.target.value)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editForm.paymentType === 'contractor' && editForm.projectId && (
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Contractor *
                  </label>
                  <select
                    value={editForm.contractorId}
                    onChange={(e) => setEditForm({...editForm, contractorId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a contractor</option>
                    {contractors
                      .filter(contractor => contractor.persons?.isActive !== false)
                      .map(contractor => (
                        <option key={contractor.id} value={contractor.id}>
                          {contractor.persons?.fullName || contractor.name || 'Unnamed Contractor'}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Only show Tags field for regular category expenses or if user has custom tags */}
              {(editForm.paymentType === 'category' || shouldDisplayTags(expense?.tags || null) || editForm.tags) && (
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={editForm.tags}
                    onChange={(e) => setEditForm({...editForm, tags: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional tags"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="btn-primary bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">Date</h3>
                  <p className="text-primary">{formatDate(expense.date)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">Amount</h3>
                  <p className={`font-semibold text-lg ${
                    isLoanTransaction && loanTransaction.transactionType === 'payment'
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {isLoanTransaction && loanTransaction.transactionType === 'payment' ? '+' : '-'}$
                    {expense.amount ? Number(expense.amount).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-secondary mb-1">Type</h3>
                <div>
                  {isProjectPayment ? (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200 rounded">
                      🏗️ Project Payment
                    </span>
                  ) : isContractorPayment ? (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200 rounded">
                      👷 Contractor Payment
                    </span>
                  ) : isLoanTransaction ? (
                    loanTransaction.transactionType === 'payment' ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200 rounded">
                        📈 Loan Payment
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded">
                        💸 Loan Advance
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded">
                      {expense.categoryObject?.emoji || '💰'} {expense.categoryObject?.name || expense.category}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-secondary mb-1">Description</h3>
                <p className="text-primary">{expense.description}</p>
              </div>

              {/* Payment Recipient - Prominently displayed */}
              {(isContractorPayment || isProjectPayment || isLoanTransaction) && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-200 dark:border-blue-700 rounded-md">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    {isLoanTransaction 
                      ? (loanTransaction.transactionType === 'payment' ? '💰 Payment Received From' : '💸 Loan Disbursed To')
                      : '💰 Payment Made To'
                    }
                  </h3>
                  {isLoanTransaction && loanTransaction.loan ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">
                          {loanTransaction.loan.borrowerType === 'business' 
                            ? loanTransaction.loan.borrowerBusiness?.name || 'Unknown Business'
                            : `${loanTransaction.loan.borrowerPerson?.fullName || 'Unknown Person'}${
                                loanTransaction.loan.borrowerPerson?.phone 
                                  ? ` • ${formatPhoneNumberForDisplay(loanTransaction.loan.borrowerPerson.phone)}` 
                                  : ''
                              }`
                          }
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          {loanTransaction.loan.borrowerType === 'business' ? '🏢' : '👤'} {loanTransaction.transactionType === 'payment' ? 'Loan Repayment' : 'Loan Recipient'} 
                          • Loan: {loanTransaction.loan.loanNumber}
                        </p>
                      </div>
                    </div>
                  ) : transaction?.projectContractor?.person ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">
                          {transaction.projectContractor.persons.fullName}
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Contractor
                          {transaction.projectContractor.persons.phone && ` • ${formatPhoneNumberForDisplay(transaction.projectContractor.persons.phone)}`}
                          {transaction.projectContractor.persons.email && ` • ${transaction.projectContractor.persons.email}`}
                        </p>
                      </div>
                    </div>
                  ) : transaction?.project && isProjectPayment ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">
                          {transaction.project.name}
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Project Payment
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const projectId = transaction.project?.id || transaction.projectId
                          if (projectId) {
                            window.location.href = `/projects/${projectId}`
                          }
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium whitespace-nowrap ml-4"
                      >
                        View Project →
                      </button>
                    </div>
                  ) : isContractorPayment && contractorFromTags ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">
                          {contractorFromTags.name}
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Contractor Payment
                        </p>
                      </div>
                      <button
                        onClick={() => fetchDetails('contractor', contractorFromTags.id)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium whitespace-nowrap ml-4"
                      >
                        View Details →
                      </button>
                    </div>
                  ) : isContractorPayment ? (
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        Contractor Payment
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Direct contractor payment
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        Unknown Project
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Project payment without detailed recipient information
                      </p>
                    </div>
                  )}
                </div>
              )}

              {(transaction || isContractorPayment || isProjectPayment) && (
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">
                    {transaction ? 'Project Details' : 'Payment Details'}
                  </h3>
                  <div className="space-y-1">
                    {transaction?.project && (
                      <p className="text-primary">Project: {transaction.project.name}</p>
                    )}
                    {transaction?.projectContractor?.person ? (
                      <div className="flex items-center justify-between">
                        <p className="text-primary">Contractor: {transaction.projectContractor.persons.fullName}</p>
                      </div>
                    ) : isContractorPayment && contractorFromTags ? (
                      <p className="text-primary">Contractor: {contractorFromTags.name}</p>
                    ) : isContractorPayment && !transaction?.projectContractor && !contractorFromTags && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-200 dark:border-blue-700 rounded-md">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          This is a contractor payment with limited information available.
                        </p>
                      </div>
                    )}
                    {transaction?.notes && (
                      <p className="text-sm text-secondary">{transaction.notes}</p>
                    )}
                  </div>
                </div>
              )}

              {shouldDisplayTags(expense.tags || null) && (
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">Tags</h3>
                  <p className="text-primary">{expense.tags}</p>
                </div>
              )}

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-xs text-secondary">
                  <div>
                    <span className="block">Created</span>
                    <span>{formatDateTime(expense.createdAt)}</span>
                  </div>
                  <div>
                    <span className="block">Last Modified</span>
                    <span>{formatDateTime(expense.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Time Restriction and Permission Messages */}
              {!isEditAllowed && (
                <div className="space-y-3">
                  {/* Time Restriction Message for non-admin users */}
                  {session?.user && hasUserPermission(session.user, 'canEditPersonalExpenses') && !isSystemAdmin(session.user) && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900 dark:bg-opacity-20 border border-amber-200 dark:border-amber-700 rounded-md">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <span className="text-amber-600 dark:text-amber-400">⏱️</span>
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            Time Restriction
                          </h4>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            {getTimeRestrictionMessage()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* General Permission Message */}
                  {session?.user && !hasUserPermission(session.user, 'canEditPersonalExpenses') && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 border border-yellow-200 dark:border-yellow-700 rounded-md">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <span className="text-yellow-600 dark:text-yellow-400">🔒</span>
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            Access Restricted
                          </h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            You don't have permission to edit expenses. Contact an administrator to request edit access.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Unified Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="card max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">
                  {detailsType === 'contractor' && 'Contractor Details'}
                  {detailsType === 'project' && 'Project Details'}
                  {detailsType === 'loan' && 'Loan Details'}
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-4">
              {detailsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-secondary">Loading {detailsType} details...</div>
                </div>
              ) : detailsData?.error ? (
                <div className="text-red-600 dark:text-red-400 text-center py-8">
                  {detailsData.error}
                </div>
              ) : detailsData ? (
                <div className="space-y-4">
                  {detailsType === 'contractor' && (
                    <>
                      <div>
                        <h4 className="text-sm font-medium text-secondary mb-1">Full Name</h4>
                        <p className="text-primary">{detailsData.fullName}</p>
                      </div>

                      {detailsData.phone && (
                        <div>
                          <h4 className="text-sm font-medium text-secondary mb-1">Phone</h4>
                          <p className="text-primary">
                            {formatPhoneNumberForDisplay(detailsData.phone)}
                          </p>
                        </div>
                      )}

                      {detailsData.email && (
                        <div>
                          <h4 className="text-sm font-medium text-secondary mb-1">Email</h4>
                          <p className="text-primary">{detailsData.email}</p>
                        </div>
                      )}

                      {detailsData.nationalId && (
                        <div>
                          <h4 className="text-sm font-medium text-secondary mb-1">National ID</h4>
                          <p className="text-primary">{detailsData.nationalId}</p>
                        </div>
                      )}

                      {detailsData.address && (
                        <div>
                          <h4 className="text-sm font-medium text-secondary mb-1">Address</h4>
                          <p className="text-primary">{detailsData.address}</p>
                        </div>
                      )}

                      <div>
                        <h4 className="text-sm font-medium text-secondary mb-1">Status</h4>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                          detailsData.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
                        }`}>
                          {detailsData.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {detailsData.notes && (
                        <div>
                          <h4 className="text-sm font-medium text-secondary mb-1">Notes</h4>
                          <p className="text-primary">{detailsData.notes}</p>
                        </div>
                      )}
                    </>
                  )}

                  {detailsType === 'project' && (
                    <>
                      <div>
                        <h4 className="text-sm font-medium text-secondary mb-1">Project Name</h4>
                        <p className="text-primary">{detailsData.name}</p>
                      </div>

                      {detailsData.description && (
                        <div>
                          <h4 className="text-sm font-medium text-secondary mb-1">Description</h4>
                          <p className="text-primary">{detailsData.description}</p>
                        </div>
                      )}

                      <div>
                        <h4 className="text-sm font-medium text-secondary mb-1">Status</h4>
                        <span className="capitalize text-primary">{detailsData.status}</span>
                      </div>

                      {detailsData.startDate && (
                        <div>
                          <h4 className="text-sm font-medium text-secondary mb-1">Start Date</h4>
                          <p className="text-primary">{formatDate(detailsData.startDate)}</p>
                        </div>
                      )}

                      {detailsData.endDate && (
                        <div>
                          <h4 className="text-sm font-medium text-secondary mb-1">End Date</h4>
                          <p className="text-primary">{formatDate(detailsData.endDate)}</p>
                        </div>
                      )}
                    </>
                  )}

                  {detailsType === 'loan' && (
                    <>
                      <div>
                        <h4 className="text-sm font-medium text-secondary mb-1">Loan Number</h4>
                        <p className="text-primary">{detailsData.loanNumber}</p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-secondary mb-1">Borrower</h4>
                        <p className="text-primary">
                          {detailsData.borrowerType === 'business'
                            ? detailsData.borrowerBusiness?.name || 'Unknown Business'
                            : detailsData.borrowerPerson?.fullName || 'Unknown Person'
                          }
                        </p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-secondary mb-1">Principal Amount</h4>
                        <p className="text-primary">${Number(detailsData.principalAmount || 0).toFixed(2)}</p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-secondary mb-1">Remaining Balance</h4>
                        <p className="text-primary">${Number(detailsData.remainingBalance || 0).toFixed(2)}</p>
                      </div>

                      {detailsData.interestRate && (
                        <div>
                          <h4 className="text-sm font-medium text-secondary mb-1">Interest Rate</h4>
                          <p className="text-primary">{Number(detailsData.interestRate)}%</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}