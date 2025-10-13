'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'

interface Project {
  id: string
  name: string
  description?: string
  status: string
  businessType?: string
  totalCost: number
  startDate?: string
  endDate?: string
  expectedCompletionDate?: string
  location?: string
  createdAt: string
  updatedAt: string
  businessId?: string
  business?: {
    businessName: string
    businessType: string
  }
  createdBy?: {
    name: string
    email: string
  }
  transactions?: Array<{
    id: string
    amount: number
    description: string
    status: string
    transactionType: string
    createdAt: string
  }>
  contractors?: Array<{
    id: string
    person: {
      fullName: string
      phone?: string
      email?: string
    }
  }>
  _count?: {
    transactions: number
  }
}

interface ProjectDetailModalProps {
  projectId: string | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: (updatedProject: Project) => void
}

export function ProjectDetailModal({ projectId, isOpen, onClose, onUpdate }: ProjectDetailModalProps) {
  const { data: session } = useSession()
  const { format: globalDateFormat } = useDateFormat()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: '',
    totalCost: '',
    location: '',
    expectedCompletionDate: ''
  })

  const currentUser = session?.user as any

  // Helper function to check if editing is allowed
  const canEdit = () => {
    if (!currentUser || !project) return false
    if (!hasPermission(currentUser, 'canManageProjects') && !hasPermission(currentUser, 'canManagePersonalProjects')) return false
    if (isSystemAdmin(currentUser)) return true

    // Check if user has access to this project's business
    const userBusinessIds = (currentUser.businessMemberships || []).map((m: any) => m.businessId)
    if (project.businessId && !userBusinessIds.includes(project.businessId)) return false

    // Check if user created this project (for personal projects)
    if (!project.businessId && project.createdBy?.email !== currentUser.email) return false

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
    if (isOpen && projectId) {
      fetchProject()
    }
  }, [isOpen, projectId])

  useEffect(() => {
    if (project) {
      setEditForm({
        name: project.name || '',
        description: project.description || '',
        status: project.status || '',
        totalCost: project.totalCost?.toString() || '',
        location: project.location || '',
        expectedCompletionDate: project.expectedCompletionDate
          ? new Date(project.expectedCompletionDate).toISOString().split('T')[0]
          : ''
      })
    }
  }, [project])

  const fetchProject = async () => {
    if (!projectId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/construction/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data)
      } else {
        // Try to read JSON body for more details, but fallback to text
        let body: any = null
        try {
          body = await response.json()
        } catch (e) {
          try { body = await response.text() } catch (e) { body = null }
        }
        console.error('Failed to fetch project details', { status: response.status, body })
        // Optionally set project to null to show error UI
        setProject(null)
      }
    } catch (error) {
      console.error('Error fetching project:', error)
      setProject(null)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const handleSave = async () => {
    if (!isEditAllowed || !project) return

    try {
      setLoading(true)
      const response = await fetch(`/api/construction/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          status: editForm.status,
          totalCost: parseFloat(editForm.totalCost) || 0,
          location: editForm.location,
          expectedCompletionDate: editForm.expectedCompletionDate || null
        })
      })

      if (response.ok) {
        const updatedProject = await response.json()
        setProject(updatedProject)
        onUpdate?.(updatedProject)
        setIsEditing(false)
      } else {
        console.error('Failed to update project')
      }
    } catch (error) {
      console.error('Error updating project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (project) {
      setEditForm({
        name: project.name || '',
        description: project.description || '',
        status: project.status || '',
        totalCost: project.totalCost?.toString() || '',
        location: project.location || '',
        expectedCompletionDate: project.expectedCompletionDate
          ? new Date(project.expectedCompletionDate).toISOString().split('T')[0]
          : ''
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'planned': return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
      case 'completed': return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const calculateFinancials = () => {
    if (!project?.transactions) return { totalSpent: 0, totalReceived: 0, netAmount: 0 }

    const completedTransactions = project.transactions.filter(t => t.status === 'completed')
    const totalSpent = completedTransactions
      .filter(t => Number(t.amount) > 0 && t.transactionType !== 'payment_received')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const totalReceived = completedTransactions
      .filter(t => t.transactionType === 'payment_received')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    return {
      totalSpent,
      totalReceived,
      netAmount: totalReceived - totalSpent
    }
  }

  const financials = project ? calculateFinancials() : { totalSpent: 0, totalReceived: 0, netAmount: 0 }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="card max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-primary">
              {isEditing ? 'Edit Project' : 'Project Details'}
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
              <div className="text-secondary">Loading project details...</div>
            </div>
          ) : !project ? (
            <div className="text-red-600 dark:text-red-400 text-center py-8">
              Failed to load project details
            </div>
          ) : (
            <>
              {/* Project Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">Project Name</h3>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-lg font-bold text-primary">{project.name}</p>
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
                      <option value="planned">Planned</option>
                      <option value="active">Active</option>
                      <option value="on_hold">On Hold</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-1 text-sm font-medium rounded ${getStatusColor(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Project Description */}
              <div>
                <h3 className="text-sm font-medium text-secondary mb-1">Description</h3>
                {isEditing ? (
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Project description..."
                  />
                ) : (
                  <p className="text-primary">{project.description || 'No description provided'}</p>
                )}
              </div>

              {/* Project Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">Budget</h3>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.totalCost}
                      onChange={(e) => setEditForm({...editForm, totalCost: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-primary">${project.totalCost.toFixed(2)}</p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">Location</h3>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Project location"
                    />
                  ) : (
                    <p className="text-primary">{project.location || 'Not specified'}</p>
                  )}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="p-4 bg-green-50 dark:bg-green-900 dark:bg-opacity-20 border border-green-200 dark:border-green-700 rounded-md">
                <h3 className="text-lg font-medium text-green-800 dark:text-green-200 mb-3">Financial Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300">Total Spent</p>
                    <p className="text-lg font-semibold text-red-600 dark:text-red-400">${financials.totalSpent.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300">Total Received</p>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">${financials.totalReceived.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300">Net Amount</p>
                    <p className={`text-lg font-semibold ${financials.netAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      ${financials.netAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Progress: {project.totalCost > 0 ? ((financials.totalSpent / project.totalCost) * 100).toFixed(1) : 0}% of budget used
                  </p>
                </div>
              </div>

              {/* Contractors */}
              {project.contractors && project.contractors.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">Contractors ({project.contractors.length})</h3>
                  <div className="space-y-2">
                    {project.contractors.map((contractor) => (
                      <div key={contractor.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <div>
                          <p className="font-medium text-primary">{contractor.persons.fullName}</p>
                          <div className="flex gap-4 text-sm text-secondary">
                            {contractor.persons.phone && <span>📞 {contractor.persons.phone}</span>}
                            {contractor.persons.email && <span>📧 {contractor.persons.email}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Transactions */}
              {project.transactions && project.transactions.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">
                    Recent Transactions ({project.transactions.length})
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {project.transactions.slice(0, 10).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <div className="flex-1">
                          <p className="font-medium text-primary">{transaction.description}</p>
                          <div className="flex gap-4 text-sm text-secondary">
                            <span className="capitalize">{transaction.transactionType.replace('_', ' ')}</span>
                            <span>{formatDateTime(transaction.createdAt)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            transaction.transactionType === 'payment_received'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {transaction.transactionType === 'payment_received' ? '+' : '-'}${Number(transaction.amount).toFixed(2)}
                          </p>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                            transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {transaction.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">Expected Completion</h3>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.expectedCompletionDate}
                      onChange={(e) => setEditForm({...editForm, expectedCompletionDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-primary">
                      {project.expectedCompletionDate ? formatDate(project.expectedCompletionDate) : 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">Business Type</h3>
                  <p className="text-primary capitalize">{project.businessType || 'Personal'}</p>
                </div>
              </div>

              {/* Business Information */}
              {project.business && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-200 dark:border-blue-700 rounded-md">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Business</h3>
                  <p className="text-blue-900 dark:text-blue-100">{project.businesses.businessName}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 capitalize">{project.businesses.businessType}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-xs text-secondary">
                  <div>
                    <span className="block">Created</span>
                    <span>{formatDateTime(project.createdAt)}</span>
                  </div>
                  <div>
                    <span className="block">Last Modified</span>
                    <span>{formatDateTime(project.updatedAt)}</span>
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
                        You don't have permission to edit this project or it belongs to a business you don't have access to.
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