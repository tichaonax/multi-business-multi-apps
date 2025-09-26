'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { formatDateByFormat, formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'

interface Transaction {
  id: string
  amount: number
  description: string
  status: string
  transactionType: string
  paymentMethod?: string
  notes?: string
  createdAt: string
  updatedAt: string
  projectId: string
  project?: {
    id: string
    name: string
    status: string
    business?: {
      businessName: string
      businessType: string
    }
  }
  contractor?: {
    id: string
    person: {
      fullName: string
      phone?: string
      email?: string
    }
  }
  createdBy?: {
    name: string
    email: string
  }
}

interface TransactionDetailModalProps {
  transactionId: string | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: (updatedTransaction: Transaction) => void
}

export function TransactionDetailModal({ transactionId, isOpen, onClose, onUpdate }: TransactionDetailModalProps) {
  const { data: session } = useSession()
  const { format: globalDateFormat } = useDateFormat()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    description: '',
    status: '',
    amount: '',
    paymentMethod: '',
    notes: ''
  })

  const currentUser = session?.user as any

  // Helper function to check if editing is allowed
  const canEdit = () => {
    if (!currentUser || !transaction) return false
    if (!hasPermission(currentUser, 'canManageProjects') && !hasPermission(currentUser, 'canManagePersonalProjects')) return false
    if (isSystemAdmin(currentUser)) return true

    // Check if user has access to this transaction's project business
    const userBusinessIds = (currentUser.businessMemberships || []).map((m: any) => m.businessId)
    if (transaction.project?.business && !userBusinessIds.includes(transaction.project.business.businessName)) return false

    // Check if user created this transaction (for personal projects)
    if (!transaction.project?.business && transaction.createdBy?.email !== currentUser.email) return false

    return true
  }

  const isEditAllowed = canEdit()

  // Helper function to format dates according to global settings
  const formatDate = (dateString: string) => formatDateByFormat(dateString, globalDateFormat)
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const formattedDate = formatDateByFormat(dateString, globalDateFormat)
    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return `${formattedDate} ${formattedTime}`
  }

  useEffect(() => {
    if (isOpen && transactionId) {
      fetchTransaction()
    }
  }, [isOpen, transactionId])

  useEffect(() => {
    if (transaction) {
      setEditForm({
        description: transaction.description || '',
        status: transaction.status || '',
        amount: transaction.amount?.toString() || '',
        paymentMethod: transaction.paymentMethod || '',
        notes: transaction.notes || ''
      })
    }
  }, [transaction])

  const fetchTransaction = async () => {
    if (!transactionId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/construction/transactions/${transactionId}`)
      if (response.ok) {
        const data = await response.json()
        setTransaction(data)
      } else {
        console.error('Failed to fetch transaction details')
      }
    } catch (error) {
      console.error('Error fetching transaction:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const handleSave = async () => {
    if (!isEditAllowed || !transaction) return

    try {
      setLoading(true)
      const response = await fetch(`/api/construction/transactions/${transaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editForm.description,
          status: editForm.status,
          amount: parseFloat(editForm.amount) || 0,
          paymentMethod: editForm.paymentMethod,
          notes: editForm.notes
        })
      })

      if (response.ok) {
        const updatedTransaction = await response.json()
        setTransaction(updatedTransaction)
        onUpdate?.(updatedTransaction)
        setIsEditing(false)
      } else {
        console.error('Failed to update transaction')
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (transaction) {
      setEditForm({
        description: transaction.description || '',
        status: transaction.status || '',
        amount: transaction.amount?.toString() || '',
        paymentMethod: transaction.paymentMethod || '',
        notes: transaction.notes || ''
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const getTransactionTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'payment_received': return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
      case 'project_expense': return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
      case 'contractor_payment': return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200'
      case 'material_cost': return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200'
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
    }
  }

  const isIncome = transaction?.transactionType === 'payment_received'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="card max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-primary">
              {isEditing ? 'Edit Transaction' : 'Transaction Details'}
            </h2>
            <div className="flex gap-2">
              {!isEditing && isEditAllowed && (
                <button
                  onClick={() => setIsEditing(true)}
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

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-secondary">Loading transaction details...</div>
            </div>
          ) : !transaction ? (
            <div className="text-red-600 dark:text-red-400 text-center py-8">
              Failed to load transaction details
            </div>
          ) : (
            <>
              {/* Transaction Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">Amount</h3>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.amount}
                      onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className={`text-2xl font-bold ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isIncome ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">Status</h3>
                  {isEditing ? (
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-1 text-sm font-medium rounded ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Transaction Type */}
              <div>
                <h3 className="text-sm font-medium text-secondary mb-1">Transaction Type</h3>
                <span className={`inline-flex items-center px-2 py-1 text-sm font-medium rounded ${getTransactionTypeColor(transaction.transactionType)}`}>
                  {transaction.transactionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-secondary mb-1">Description</h3>
                {isEditing ? (
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Transaction description..."
                  />
                ) : (
                  <p className="text-primary">{transaction.description}</p>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <h3 className="text-sm font-medium text-secondary mb-1">Payment Method</h3>
                {isEditing ? (
                  <select
                    value={editForm.paymentMethod}
                    onChange={(e) => setEditForm({...editForm, paymentMethod: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select payment method</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <p className="text-primary">
                    {transaction.paymentMethod ? transaction.paymentMethod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified'}
                  </p>
                )}
              </div>

              {/* Project Information */}
              {transaction.project && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-200 dark:border-blue-700 rounded-md">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Project Information</h3>
                  <div className="space-y-1">
                    <p className="font-medium text-blue-900 dark:text-blue-100">{transaction.project.name}</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Status: {transaction.project.status}</p>
                    {transaction.project.business && (
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Business: {transaction.project.business.businessName} ({transaction.project.business.businessType})
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Contractor Information */}
              {transaction.contractor && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900 dark:bg-opacity-20 border border-purple-200 dark:border-purple-700 rounded-md">
                  <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">Contractor Information</h3>
                  <div className="space-y-1">
                    <p className="font-medium text-purple-900 dark:text-purple-100">{transaction.contractor.person.fullName}</p>
                    <div className="flex gap-4 text-sm text-purple-700 dark:text-purple-300">
                      {transaction.contractor.person.phone && (
                        <span>📞 {formatPhoneNumberForDisplay(transaction.contractor.person.phone)}</span>
                      )}
                      {transaction.contractor.person.email && (
                        <span>📧 {transaction.contractor.person.email}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <h3 className="text-sm font-medium text-secondary mb-1">Notes</h3>
                {isEditing ? (
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Additional notes..."
                  />
                ) : (
                  <p className="text-primary">{transaction.notes || 'No notes'}</p>
                )}
              </div>

              {/* Created By */}
              {transaction.createdBy && (
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">Created By</h3>
                  <p className="text-primary">{transaction.createdBy.name} ({transaction.createdBy.email})</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-xs text-secondary">
                  <div>
                    <span className="block">Created</span>
                    <span>{formatDateTime(transaction.createdAt)}</span>
                  </div>
                  <div>
                    <span className="block">Last Modified</span>
                    <span>{formatDateTime(transaction.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Edit Actions */}
              {isEditing && (
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
              )}

              {/* Permission Messages */}
              {!isEditAllowed && (
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
                        You don't have permission to edit this transaction or it belongs to a project you don't have access to.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}