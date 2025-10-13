'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { PersonRegistrationForm } from '@/components/construction/person-registration-form'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/permission-utils'
import Link from 'next/link'
import { DateInput } from '@/components/ui/date-input'
import { formatDateByFormat, formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'

interface Project {
  id: string
  name: string
  description: string
  status: string
  budget: number
  startDate: string
  endDate: string
  createdAt: string
  stages?: Stage[]
  projectContractors?: ProjectContractor[]
  projectTransactions?: Transaction[]
}

interface Stage {
  id: string
  name: string
  status: string
  estimatedAmount: number
  orderIndex: number
  description?: string | null
  startDate: string
  endDate: string
  completionDate: string
}

interface ProjectContractor {
  id: string
  isPrimary: boolean
  role: string
  person: {
    id: string
    fullName: string
    phone: string
    email: string
  }
}

interface Transaction {
  id: string
  transactionType: string
  amount: number
  description: string
  createdAt: string
  status: string
  recipientPerson?: {
    fullName: string
  }
  stage?: {
    name: string
  }
}

export default function ProjectDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const projectId = params.projectId as string
  const { format: globalDateFormat } = useDateFormat()
  
  const [project, setProject] = useState<Project | null>(null)
  const [costSummary, setCostSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showStageModal, setShowStageModal] = useState(false)
  const [showContractorModal, setShowContractorModal] = useState(false)
  const [stageForm, setStageForm] = useState({
    name: '',
    description: '',
    estimatedAmount: '',
    startDate: '',
    endDate: ''
  })
  const [contractorForm, setContractorForm] = useState({
    personId: '',
    isPrimary: false,
    role: '',
    hourlyRate: '',
    totalContractAmount: '',
    startDate: '',
    endDate: '',
    notes: ''
  })
  const [persons, setPersons] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showPersonForm, setShowPersonForm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: '',
    budget: '',
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    if (projectId && session && status === 'authenticated') {
      fetchProject()
      fetchCostSummary()
    }
  }, [projectId, session, status])

  const fetchProject = async () => {
    try {
      console.log('🔍 Fetching project:', projectId)
      console.log('🔍 Session user:', session?.user)
      
      const response = await fetch(`/api/construction/projects/${projectId}`)
      console.log('🔍 Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Project data received:', data)
        setProject(data)
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to fetch project:', response.status, errorData)
      }
    } catch (error) {
      console.error('💥 Error fetching project:', error)
    }
  }

  const fetchCostSummary = async () => {
    try {
      const response = await fetch(`/api/construction/projects/${projectId}/cost-summary`)
      if (response.ok) {
        const data = await response.json()
        setCostSummary(data)
      }
    } catch (error) {
      console.error('Error fetching cost summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPersons = async () => {
    try {
      const response = await fetch('/api/persons')
      if (response.ok) {
        const data = await response.json()
        setPersons(data)
      }
    } catch (error) {
      console.error('Error fetching persons:', error)
    }
  }

  const handleStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stageForm.name.trim()) return
    
    setSubmitting(true)
    try {
      const response = await fetch(`/api/construction/projects/${projectId}/stages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: stageForm.name.trim(),
          description: stageForm.description.trim() || null,
          estimatedAmount: stageForm.estimatedAmount ? parseFloat(stageForm.estimatedAmount) : null,
          startDate: stageForm.startDate || null,
          endDate: stageForm.endDate || null
        }),
      })

      if (response.ok) {
        setStageForm({ name: '', description: '', estimatedAmount: '', startDate: '', endDate: '' })
        setShowStageModal(false)
        fetchProject() // Refresh project data
      } else {
        const error = await response.json()
        alert('Failed to create stage: ' + error.error)
      }
    } catch (error) {
      console.error('Error creating stage:', error)
      alert('Failed to create stage')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePersonCreated = (newPerson: any) => {
    // Add the new person to the persons list and pre-select them
    setPersons(prev => [...prev, newPerson])
    // Pre-select the new person in the contractor form
    setContractorForm(prev => ({ ...prev, personId: newPerson.id }))
    // Hide the person registration form
    setShowPersonForm(false)
  }

  const handleContractorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contractorForm.personId) return
    
    setSubmitting(true)
    try {
      const response = await fetch(`/api/construction/projects/${projectId}/contractors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personId: contractorForm.personId,
          isPrimary: contractorForm.isPrimary,
          role: contractorForm.role.trim() || null,
          hourlyRate: contractorForm.hourlyRate ? parseFloat(contractorForm.hourlyRate) : null,
          totalContractAmount: contractorForm.totalContractAmount ? parseFloat(contractorForm.totalContractAmount) : null,
          startDate: contractorForm.startDate || null,
          endDate: contractorForm.endDate || null,
          notes: contractorForm.notes.trim() || null
        }),
      })

      if (response.ok) {
        setContractorForm({
          personId: '',
          isPrimary: false,
          role: '',
          hourlyRate: '',
          totalContractAmount: '',
          startDate: '',
          endDate: '',
          notes: ''
        })
        setShowContractorModal(false)
        setShowPersonForm(false) // Reset person form state
        fetchProject() // Refresh project data
      } else {
        const error = await response.json()
        alert('Failed to add contractor: ' + error.error)
      }
    } catch (error) {
      console.error('Error adding contractor:', error)
      alert('Failed to add contractor')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = () => {
    if (project) {
      setEditForm({
        name: project.name,
        description: project.description || '',
        status: project.status,
        budget: project.budget ? project.budget.toString() : '',
        startDate: project.startDate ? project.startDate.split('T')[0] : '',
        endDate: project.endDate ? project.endDate.split('T')[0] : ''
      })
      setShowEditModal(true)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm.name.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/construction/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          status: editForm.status,
          budget: editForm.budget ? parseFloat(editForm.budget) : null,
          startDate: editForm.startDate || null,
          endDate: editForm.endDate || null
        })
      })

      if (response.ok) {
        setShowEditModal(false)
        fetchProject() // Refresh project data
      } else {
        const error = await response.json()
        alert('Failed to update project: ' + error.error)
      }
    } catch (error) {
      console.error('Error updating project:', error)
      alert('Failed to update project')
    } finally {
      setSubmitting(false)
    }
  }

  const currentUser = session?.user as any
  const canEditProject = currentUser && hasPermission(currentUser, 'canEditProjects')

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    return formatDateByFormat(dateString, globalDateFormat)
  }

  if (loading || status === 'loading') {
    return (
      <BusinessTypeRoute requiredBusinessType="construction">
        <ContentLayout title="Loading...">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </ContentLayout>
      </BusinessTypeRoute>
    )
  }

  if (!project) {
    return (
      <BusinessTypeRoute requiredBusinessType="construction">
        <ContentLayout title="Project Not Found">
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">The requested project could not be found.</p>
            <Link href="/construction" className="btn-primary">
              Back to Projects
            </Link>
          </div>
        </ContentLayout>
      </BusinessTypeRoute>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <BusinessTypeRoute requiredBusinessType="construction">
      <ContentLayout
        title={project.name}
        subtitle={project.description}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Construction', href: '/construction' },
          { label: project.name, isActive: true }
        ]}
        headerActions={
          <div className="flex space-x-2">
            {canEditProject && (
              <button
                onClick={openEditModal}
                className="btn-secondary"
              >
                Edit Project
              </button>
            )}
            <Link
              href={`/construction/${projectId}/expenses`}
              className="btn-primary"
            >
              Manage Expenses
            </Link>
            <button
              onClick={() => router.back()}
              className="btn-secondary"
            >
              Back
            </button>
          </div>
        }
      >
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview' },
                { id: 'stages', name: 'Stages' },
                { id: 'contractors', name: 'Contractors' },
                { id: 'costs', name: 'Costs' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Project Info */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Project Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-secondary">Status</label>
                    <div className="mt-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary">Budget</label>
                    <p className="text-primary font-medium">
                      ${project.budget ? Number(project.budget).toLocaleString() : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary">Start Date</label>
                    <p className="text-primary">
                      {project.startDate ? formatDate(project.startDate) : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary">End Date</label>
                    <p className="text-primary">
                      {project.endDate ? formatDate(project.endDate) : 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {project.description && (
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-primary mb-4">Description</h3>
                  <p className="text-secondary">{project.description}</p>
                </div>
              )}
            </div>

            {/* Cost Summary Sidebar */}
            <div>
              {costSummary && (
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-primary mb-4">Cost Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-secondary">Contractor Payments:</span>
                      <span className="font-medium text-primary">
                        ${costSummary.totalCosts?.contractorPayments?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Project Expenses:</span>
                      <span className="font-medium text-primary">
                        ${costSummary.totalCosts?.projectExpenses?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <hr className="border-gray-200 dark:border-gray-700" />
                    <div className="flex justify-between font-semibold">
                      <span className="text-primary">Total Cost:</span>
                      <span className="text-primary">
                        ${costSummary.totalCosts?.totalProjectCost?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    {project.budget && costSummary.totalCosts?.budgetVariance && (
                      <div className="flex justify-between">
                        <span className="text-secondary">Budget Variance:</span>
                        <span className={`font-medium ${
                          costSummary.totalCosts.budgetVariance > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          ${Math.abs(costSummary.totalCosts.budgetVariance).toFixed(2)}
                          {costSummary.totalCosts.budgetVariance > 0 ? ' over' : ' under'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stages' && (
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-primary">Project Stages</h3>
              <button 
                className="btn-primary"
                onClick={() => setShowStageModal(true)}
              >
                Add Stage
              </button>
            </div>
            {project.stages && project.stages.length > 0 ? (
              <div className="space-y-4">
                {project.stages.map((stage) => (
                  <div key={stage.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-primary">{stage.name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(stage.status)}`}>
                        {stage.status}
                      </span>
                    </div>
                    {stage.description && (
                      <p className="text-sm text-secondary mb-2">{stage.description}</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      {stage.estimatedAmount && (
                        <div>
                          <span className="text-secondary">Estimated: </span>
                          <span className="font-medium text-primary">${stage.estimatedAmount.toLocaleString()}</span>
                        </div>
                      )}
                      {stage.startDate && (
                        <div>
                          <span className="text-secondary">Start: </span>
                          <span className="text-primary">{formatDate(stage.startDate)}</span>
                        </div>
                      )}
                      {stage.endDate && (
                        <div>
                          <span className="text-secondary">End: </span>
                          <span className="text-primary">{formatDate(stage.endDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary text-center py-8">No stages added yet. Click "Add Stage" to create the first project stage.</p>
            )}
          </div>
        )}

        {activeTab === 'contractors' && (
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-primary">Project Contractors</h3>
              <button 
                className="btn-primary"
                onClick={() => {
                  setShowContractorModal(true)
                  fetchPersons()
                }}
              >
                Add Contractor
              </button>
            </div>
            {project.projectContractors && project.project_contractors.length > 0 ? (
              <div className="space-y-4">
                {project.project_contractors.map((contractor) => (
                  <div key={contractor.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-primary">{contractor.persons.fullName}</h4>
                        {contractor.role && (
                          <p className="text-sm text-secondary">{contractor.role}</p>
                        )}
                      </div>
                      {contractor.isPrimary && (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-secondary">Email: </span>
                        <span className="text-primary">{contractor.persons.email || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-secondary">Phone: </span>
                        <span className="text-primary">{contractor.persons.phone ? formatPhoneNumberForDisplay(contractor.persons.phone) : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary text-center py-8">No contractors assigned yet. Click "Add Contractor" to assign contractors to this project.</p>
            )}
          </div>
        )}

        {activeTab === 'costs' && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Detailed Cost Breakdown</h3>
            {costSummary ? (
              <div className="space-y-6">
                {/* Transaction Summary */}
                <div>
                  <h4 className="font-medium text-primary mb-3">Transaction Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {costSummary.transactionCounts?.totalTransactions || 0}
                      </div>
                      <div className="text-xs text-blue-600">Total Transactions</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900 dark:bg-opacity-20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {costSummary.transactionCounts?.contractorPayments || 0}
                      </div>
                      <div className="text-xs text-green-600">Contractor Payments</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900 dark:bg-opacity-20 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {costSummary.transactionCounts?.projectExpenses || 0}
                      </div>
                      <div className="text-xs text-purple-600">Project Expenses</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {costSummary.transactionCounts?.pendingTransactions || 0}
                      </div>
                      <div className="text-xs text-yellow-600">Pending</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-secondary">No cost data available.</p>
            )}
          </div>
        )}

        {/* Add Stage Modal */}
        {showStageModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto">
            <div className="relative my-10 mx-4 sm:mx-auto w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
              <form onSubmit={handleStageSubmit}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-primary">Add New Stage</h3>
                  <button
                    type="button"
                    onClick={() => setShowStageModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Stage Name *
                    </label>
                    <input
                      type="text"
                      value={stageForm.name}
                      onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., Foundation, Framing, Roofing"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Description
                    </label>
                    <textarea
                      value={stageForm.description}
                      onChange={(e) => setStageForm({ ...stageForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      rows={2}
                      placeholder="Optional description of this stage"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Estimated Amount
                    </label>
                    <input
                      type="number"
                      value={stageForm.estimatedAmount}
                      onChange={(e) => setStageForm({ ...stageForm, estimatedAmount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <DateInput
                      value={stageForm.startDate}
                      onChange={(date) => setStageForm({ ...stageForm, startDate: date })}
                      label="Start Date"
                    />
                    <DateInput
                      value={stageForm.endDate}
                      onChange={(date) => setStageForm({ ...stageForm, endDate: date })}
                      label="End Date"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowStageModal(false)}
                    className="btn-secondary"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submitting || !stageForm.name.trim()}
                  >
                    {submitting ? 'Creating...' : 'Create Stage'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Contractor Modal */}
        {showContractorModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto">
            <div className="relative my-10 mx-4 sm:mx-auto w-full max-w-lg shadow-lg rounded-md bg-white dark:bg-gray-800 border p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
              {showPersonForm ? (
                <PersonRegistrationForm 
                  onSuccess={handlePersonCreated}
                  onCancel={() => setShowPersonForm(false)}
                />
              ) : (
                <form onSubmit={handleContractorSubmit}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-primary">Add Contractor</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowContractorModal(false)
                        setShowPersonForm(false)
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-secondary">
                          Select Person *
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPersonForm(true)}
                          className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded"
                        >
                          + Add New Person
                        </button>
                      </div>
                      <select
                        value={contractorForm.personId}
                        onChange={(e) => setContractorForm({ ...contractorForm, personId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      >
                        <option value="">Choose a person...</option>
                        {persons.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.fullName} - {person.email || (person.phone ? formatPhoneNumberForDisplay(person.phone) : 'N/A')}
                          </option>
                        ))}
                      </select>
                      {persons.length === 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          No people found. Click "Add New Person" to create one.
                        </p>
                      )}
                    </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Role
                    </label>
                    <input
                      type="text"
                      value={contractorForm.role}
                      onChange={(e) => setContractorForm({ ...contractorForm, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., General Contractor, Electrician, Plumber"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isPrimary"
                      checked={contractorForm.isPrimary}
                      onChange={(e) => setContractorForm({ ...contractorForm, isPrimary: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isPrimary" className="ml-2 block text-sm text-secondary">
                      Primary Contractor
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Hourly Rate
                      </label>
                      <input
                        type="number"
                        value={contractorForm.hourlyRate}
                        onChange={(e) => setContractorForm({ ...contractorForm, hourlyRate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Total Contract Amount
                      </label>
                      <input
                        type="number"
                        value={contractorForm.totalContractAmount}
                        onChange={(e) => setContractorForm({ ...contractorForm, totalContractAmount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <DateInput
                      value={contractorForm.startDate}
                      onChange={(date) => setContractorForm({ ...contractorForm, startDate: date })}
                      label="Start Date"
                    />
                    <DateInput
                      value={contractorForm.endDate}
                      onChange={(date) => setContractorForm({ ...contractorForm, endDate: date })}
                      label="End Date"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Notes
                    </label>
                    <textarea
                      value={contractorForm.notes}
                      onChange={(e) => setContractorForm({ ...contractorForm, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      rows={2}
                      placeholder="Additional notes about this contractor assignment"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowContractorModal(false)}
                    className="btn-secondary"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submitting || !contractorForm.personId}
                  >
                    {submitting ? 'Adding...' : 'Add Contractor'}
                  </button>
                </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Edit Project Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto">
            <div className="relative my-10 mx-4 sm:mx-auto w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
              <form onSubmit={handleEditSubmit}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-primary">Edit Project</h3>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Enter project name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Description
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      rows={3}
                      placeholder="Project description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Status
                      </label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Budget
                      </label>
                      <input
                        type="number"
                        value={editForm.budget}
                        onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <DateInput
                      value={editForm.startDate}
                      onChange={(date) => setEditForm({ ...editForm, startDate: date })}
                      label="Start Date"
                    />
                    <DateInput
                      value={editForm.endDate}
                      onChange={(date) => setEditForm({ ...editForm, endDate: date })}
                      label="End Date"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="btn-secondary"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submitting || !editForm.name.trim()}
                  >
                    {submitting ? 'Updating...' : 'Update Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </ContentLayout>
    </BusinessTypeRoute>
  )
}