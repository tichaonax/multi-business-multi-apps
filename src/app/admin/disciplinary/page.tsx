'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { hasPermission } from '@/lib/permission-utils'
import { DateInput } from '@/components/ui/date-input'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'

interface DisciplinaryAction {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  actionTaken: string
  actionDate: string
  followUpDate: string | null
  isResolved: boolean
  resolvedDate: string | null
  resolvedBy: string | null
  notes: string | null
  createdAt: string
  employee: {
    id: string
    fullName: string
    employeeNumber: string
    jobTitle: {
      title: string
      department: string | null
    }
    primaryBusiness: {
      name: string
      type: string
    }
  }
  createdByUser: {
    name: string
  }
}

interface Employee {
  id: string
  fullName: string
  employeeNumber: string
  jobTitle: {
    title: string
  }
  primaryBusiness: {
    name: string
  }
}

interface DisciplinaryFormData {
  employeeId: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  actionTaken: string
  actionDate: string
  followUpDate: string
  notes: string
}

const DISCIPLINARY_TYPES = [
  'Attendance',
  'Performance',
  'Conduct',
  'Policy Violation',
  'Safety',
  'Insubordination',
  'Harassment',
  'Theft',
  'Other'
]

const SEVERITY_COLORS = {
  low: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
}

export default function DisciplinaryPage() {
  const { data: session } = useSession()
  const [disciplinaryActions, setDisciplinaryActions] = useState<DisciplinaryAction[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedAction, setSelectedAction] = useState<DisciplinaryAction | null>(null)

  const customAlert = useAlert()
  const confirm = useConfirm()

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [employeeFilter, setEmployeeFilter] = useState('')

  // Form state
  const [formData, setFormData] = useState<DisciplinaryFormData>({
    employeeId: '',
    type: '',
    severity: 'low',
    description: '',
    actionTaken: '',
    actionDate: new Date().toISOString().split('T')[0],
    followUpDate: '',
    notes: ''
  })

  const currentUser = session?.user as any
  const canManageDisciplinary = currentUser && hasPermission(currentUser, 'canManageDisciplinaryActions')
  const canViewDisciplinary = currentUser && (canManageDisciplinary || hasPermission(currentUser, 'canViewEmployees'))

  useEffect(() => {
    if (canViewDisciplinary) {
      fetchData()
    }
  }, [canViewDisciplinary])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [actionsRes, employeesRes] = await Promise.all([
        fetch('/api/disciplinary-actions'),
        fetch('/api/employees?includeInactive=false')
      ])

      if (actionsRes.ok) setDisciplinaryActions(await actionsRes.json())
      if (employeesRes.ok) {
        const employeesData = await employeesRes.json()
        setEmployees(employeesData.employees || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setFormData({
      employeeId: '',
      type: '',
      severity: 'low',
      description: '',
      actionTaken: '',
      actionDate: new Date().toISOString().split('T')[0],
      followUpDate: '',
      notes: ''
    })
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setFormData({
      employeeId: '',
      type: '',
      severity: 'low',
      description: '',
      actionTaken: '',
      actionDate: new Date().toISOString().split('T')[0],
      followUpDate: '',
      notes: ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.employeeId || !formData.type || !formData.description || !formData.actionTaken) {
      await customAlert({ title: 'Validation', description: 'Please fill in all required fields' })
      return
    }

    try {
      const response = await fetch('/api/disciplinary-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          followUpDate: formData.followUpDate || null
        })
      })

      if (response.ok) {
        fetchData()
        closeCreateModal()
      } else {
        const error = await response.json()
        await customAlert({ title: 'Create failed', description: error.error || 'Failed to create disciplinary action' })
      }
    } catch (error) {
      console.error('Error creating disciplinary action:', error)
      await customAlert({ title: 'Create failed', description: 'Failed to create disciplinary action' })
    }
  }

  const resolveAction = async (actionId: string) => {
    const ok = await confirm({ title: 'Resolve action', description: 'Mark this disciplinary action as resolved?' })
    if (!ok) return

    try {
      const response = await fetch(`/api/disciplinary-actions/${actionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isResolved: true,
          resolvedDate: new Date().toISOString()
        })
      })

      if (response.ok) {
        fetchData()
      } else {
        const error = await response.json()
        await customAlert({ title: 'Resolve failed', description: error.error || 'Failed to resolve disciplinary action' })
      }
    } catch (error) {
      console.error('Error resolving disciplinary action:', error)
      await customAlert({ title: 'Resolve failed', description: 'Failed to resolve disciplinary action' })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getDaysOverdue = (followUpDate: string) => {
    if (!followUpDate) return null
    const today = new Date()
    const followUp = new Date(followUpDate)
    const diffTime = today.getTime() - followUp.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : null
  }

  // Filter data
  const filteredActions = disciplinaryActions.filter(action => {
    const matchesSearch = action.employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         action.employee.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         action.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         action.type.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = !typeFilter || action.type === typeFilter
    const matchesSeverity = !severityFilter || action.severity === severityFilter
    const matchesEmployee = !employeeFilter || action.employee.id === employeeFilter
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'open' && !action.isResolved) ||
                         (statusFilter === 'resolved' && action.isResolved) ||
                         (statusFilter === 'overdue' && !action.isResolved && action.followUpDate && getDaysOverdue(action.followUpDate))

    return matchesSearch && matchesType && matchesSeverity && matchesEmployee && matchesStatus
  })

  if (!session) {
    return (
      <ContentLayout title="Disciplinary Actions">
        <div className="text-center py-8">
          <p className="text-secondary">Please sign in to view disciplinary actions.</p>
        </div>
      </ContentLayout>
    )
  }

  if (!canViewDisciplinary) {
    return (
      <ContentLayout title="Disciplinary Actions">
        <div className="text-center py-8">
          <p className="text-secondary">You don't have permission to view disciplinary actions.</p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="Disciplinary Actions Management"
      subtitle="Track and manage employee disciplinary actions and follow-ups"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Admin', href: '/admin' },
        { label: 'Disciplinary Actions', isActive: true }
      ]}
      headerActions={
        canManageDisciplinary ? (
          <button onClick={openCreateModal} className="btn-primary">
            <span className="mr-2">+</span>
            New Disciplinary Action
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by employee, description..."
                className="input w-full px-4 py-2.5 text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Employee
              </label>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="input w-full px-4 py-2.5 text-base"
              >
                <option value="">All Employees</option>
                {(employees || []).map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input w-full px-4 py-2.5 text-base"
              >
                <option value="">All Types</option>
                {DISCIPLINARY_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Severity
              </label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="input w-full px-4 py-2.5 text-base"
              >
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input w-full px-4 py-2.5 text-base"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div className="flex items-end">
              <button 
                onClick={fetchData}
                className="btn-secondary w-full"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center mr-3">
                <span className="text-blue-600 dark:text-blue-300 text-sm font-semibold">📋</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{filteredActions.length}</p>
                <p className="text-sm text-secondary">Total Actions</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-800 rounded-lg flex items-center justify-center mr-3">
                <span className="text-red-600 dark:text-red-300 text-sm font-semibold">🔥</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {filteredActions.filter(a => !a.isResolved).length}
                </p>
                <p className="text-sm text-secondary">Open</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-800 rounded-lg flex items-center justify-center mr-3">
                <span className="text-orange-600 dark:text-orange-300 text-sm font-semibold">⚠️</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {filteredActions.filter(a => !a.isResolved && a.followUpDate && getDaysOverdue(a.followUpDate)).length}
                </p>
                <p className="text-sm text-secondary">Overdue</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-800 rounded-lg flex items-center justify-center mr-3">
                <span className="text-red-600 dark:text-red-300 text-sm font-semibold">🚨</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {filteredActions.filter(a => a.severity === 'critical' || a.severity === 'high').length}
                </p>
                <p className="text-sm text-secondary">High/Critical</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center mr-3">
                <span className="text-green-600 dark:text-green-300 text-sm font-semibold">✅</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {filteredActions.filter(a => a.isResolved).length}
                </p>
                <p className="text-sm text-secondary">Resolved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions List */}
        <div className="card">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-secondary">Loading disciplinary actions...</p>
            </div>
          ) : filteredActions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-secondary">No disciplinary actions found matching your criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredActions.map((action) => {
                const daysOverdue = action.followUpDate ? getDaysOverdue(action.followUpDate) : null
                
                return (
                  <div key={action.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 dark:text-blue-300 font-semibold text-sm">
                              {action.employee.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-primary">{action.employee.fullName}</h4>
                            <p className="text-sm text-secondary">
                              {action.employee.employeeNumber} • {action.employee.jobTitle.title}
                              {action.employee.jobTitle.department && ` • ${action.employee.jobTitle.department}`}
                            </p>
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded">
                              {action.type}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded capitalize ${
                              SEVERITY_COLORS[action.severity]
                            }`}>
                              {action.severity}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                              action.isResolved 
                                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200' 
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
                            }`}>
                              {action.isResolved ? 'Resolved' : 'Open'}
                            </span>
                            {daysOverdue && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200 rounded">
                                {daysOverdue} days overdue
                              </span>
                            )}
                          </div>
                          
                          <h5 className="font-medium text-primary mb-1">Description:</h5>
                          <p className="text-sm text-secondary mb-3">{action.description}</p>
                          
                          <h5 className="font-medium text-primary mb-1">Action Taken:</h5>
                          <p className="text-sm text-secondary mb-3">{action.actionTaken}</p>
                          
                          {action.notes && (
                            <>
                              <h5 className="font-medium text-primary mb-1">Notes:</h5>
                              <p className="text-sm text-secondary mb-3">{action.notes}</p>
                            </>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-secondary">
                          <div>
                            <span className="font-medium">Action Date:</span>
                            <p>{formatDate(action.actionDate)}</p>
                          </div>
                          {action.followUpDate && (
                            <div>
                              <span className="font-medium">Follow-up Date:</span>
                              <p>{formatDate(action.followUpDate)}</p>
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Created By:</span>
                            <p>{action.createdByUser.name}</p>
                          </div>
                          {action.isResolved && action.resolvedDate && (
                            <div>
                              <span className="font-medium">Resolved:</span>
                              <p>{formatDate(action.resolvedDate)}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {canManageDisciplinary && !action.isResolved && (
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => setSelectedAction(action)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => resolveAction(action.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 text-sm"
                          >
                            Mark Resolved
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto">
          <div className="relative my-10 mx-4 sm:mx-auto w-full max-w-2xl bg-white dark:bg-gray-800 rounded-md shadow-lg border p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-primary mb-4">
                Create New Disciplinary Action
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Employee *
                    </label>
                    <select
                      value={formData.employeeId}
                      onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                      className="input w-full px-4 py-2.5 text-base"
                      required
                    >
                      <option value="">Select Employee</option>
                      {(employees || []).map(employee => (
                        <option key={employee.id} value={employee.id}>
                          {employee.fullName} - {employee.jobTitle.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Type *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="input w-full px-4 py-2.5 text-base"
                      required
                    >
                      <option value="">Select Type</option>
                      {DISCIPLINARY_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Severity *
                    </label>
                    <select
                      value={formData.severity}
                      onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value as any }))}
                      className="input w-full px-4 py-2.5 text-base"
                      required
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <DateInput
                      label="Action Date"
                      value={formData.actionDate}
                      onChange={(isoDate, countryCode) => {
                        setFormData(prev => ({ ...prev, actionDate: isoDate }))
                      }}
                      required
                      className=""
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="input w-full px-4 py-2.5 text-base"
                    placeholder="Detailed description of the incident or issue..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Action Taken *
                  </label>
                  <textarea
                    value={formData.actionTaken}
                    onChange={(e) => setFormData(prev => ({ ...prev, actionTaken: e.target.value }))}
                    rows={3}
                    className="input w-full px-4 py-2.5 text-base"
                    placeholder="Actions taken to address the issue..."
                    required
                  />
                </div>

                <div>
                  <DateInput
                    label="Follow-up Date"
                    value={formData.followUpDate}
                    onChange={(isoDate, countryCode) => {
                      setFormData(prev => ({ ...prev, followUpDate: isoDate }))
                    }}
                    className=""
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="input w-full px-4 py-2.5 text-base"
                    placeholder="Any additional notes or context..."
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Create Disciplinary Action
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </ContentLayout>
  )
}