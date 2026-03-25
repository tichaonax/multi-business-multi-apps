'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { NationalIdInput } from '@/components/ui/national-id-input'
import { DateInput } from '@/components/ui/date-input'
import { hasUserPermission } from '@/lib/permission-utils'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'

interface Person {
  id: string
  fullName: string
  email: string | null
  phone: string
  nationalId: string
  address: string | null
  isActive: boolean
  createdAt: string
  projectContractors: {
    id: string
    role: string | null
    isPrimary: boolean
    project: {
      id: string
      name: string
      status: string
    }
  }[]
  _count: {
    projectContractors: number
    projectTransactions: number
  }
}

export default function ContractorsPage() {
  const { data: session } = useSession()
  const [contractors, setContractors] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  // hooks moved to top to satisfy Rules of Hooks
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [selectedContractor, setSelectedContractor] = useState<Person | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [assignmentForm, setAssignmentForm] = useState({
    projectId: '',
    role: '',
    isPrimary: false,
    hourlyRate: '',
    totalContractAmount: '',
    startDate: '',
    endDate: '',
    notes: ''
  })
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    budget: '',
    startDate: '',
    endDate: '',
    location: ''
  })
  const [contractorForm, setContractorForm] = useState({
    fullName: '',
    phone: '',
    nationalId: '',
    email: '',
    address: '',
    notes: '',
    idFormatTemplateId: ''
  })
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    nationalId: '',
    email: '',
    address: '',
    notes: '',
    idFormatTemplateId: ''
  })

  // All hooks must be called before any conditional returns (Rules of Hooks)
  useEffect(() => {
    // Only fetch if user has permission
    if (session?.user && hasUserPermission(session.user, 'canManagePersonalContractors')) {
      fetchContractors()
    }
  }, [session?.user])

  // alert/confirm hooks
  const customAlert = useAlert()
  const confirm = useConfirm()

  // Check if user has permission to manage contractors
  if (!session?.user || !hasUserPermission(session.user, 'canManagePersonalContractors')) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <ContentLayout
            title="Access Denied"
            subtitle="You don't have permission to access contractor management"
            breadcrumb={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Contractors', isActive: true }
            ]}
          >
            <div className="card p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 mb-4">
                You don't have permission to manage contractors. Please contact your administrator to request the "Manage Contractors" permission.
              </p>
              <Link
                href="/dashboard"
                className="btn-secondary"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </ContentLayout>
        </MainLayout>
      </ProtectedRoute>
    )
  }


  const fetchContractors = async () => {
    try {
      const response = await fetch('/api/persons', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const data = await response.json()
        setContractors(data)
      } else {
        console.error('Failed to fetch contractors:', response.status)
      }
    } catch (error) {
      console.error('Error fetching contractors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contractorForm.fullName || !contractorForm.phone || !contractorForm.nationalId) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: contractorForm.fullName,
          phone: contractorForm.phone,
          nationalId: contractorForm.nationalId,
          email: contractorForm.email || null,
          address: contractorForm.address || null,
          notes: contractorForm.notes || null,
          idFormatTemplateId: contractorForm.idFormatTemplateId || null
        })
      })

      if (response.ok) {
        setContractorForm({
          fullName: '',
          phone: '',
          nationalId: '',
          email: '',
          address: '',
          notes: '',
          idFormatTemplateId: ''
        })
        setShowAddModal(false)
        fetchContractors()
      } else {
        const error = await response.json()
        await customAlert({ title: 'Failed to create contractor', description: error?.error || 'Unknown error' })
      }
    } catch (error) {
      console.error('Error creating contractor:', error)
      await customAlert({ title: 'Failed to create contractor', description: 'An unexpected error occurred.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm.fullName || !editForm.phone || !editForm.nationalId || !selectedContractor) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/persons/${selectedContractor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editForm.fullName,
          phone: editForm.phone,
          nationalId: editForm.nationalId,
          email: editForm.email || null,
          address: editForm.address || null,
          notes: editForm.notes || null,
          idFormatTemplateId: editForm.idFormatTemplateId || null
        })
      })

      if (response.ok) {
        setEditForm({
          fullName: '',
          phone: '',
          nationalId: '',
          email: '',
          address: '',
          notes: '',
          idFormatTemplateId: ''
        })
        setShowEditModal(false)
        setSelectedContractor(null)
        fetchContractors()
        await customAlert({ title: 'Contractor updated', description: 'Contractor updated successfully!' })
      } else {
        const error = await response.json()
        await customAlert({ title: 'Failed to update contractor', description: error?.error || 'Unknown error' })
      }
    } catch (error) {
      console.error('Error updating contractor:', error)
      await customAlert({ title: 'Failed to update contractor', description: 'An unexpected error occurred.' })
    } finally {
      setSubmitting(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/construction/projects', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const handleAssignClick = (contractor: Person) => {
    setSelectedContractor(contractor)
    setShowAssignModal(true)
    fetchProjects()
  }

  const handleViewDetailsClick = (contractor: Person) => {
    setSelectedContractor(contractor)
    setShowDetailsModal(true)
  }

  const handleEditClick = (contractor: Person) => {
    setSelectedContractor(contractor)
    setEditForm({
      fullName: contractor.fullName,
      phone: contractor.phone,
      nationalId: contractor.nationalId,
      email: contractor.email || '',
      address: contractor.address || '',
      notes: '', // Notes are not currently returned from API
      idFormatTemplateId: '' // Template ID not currently returned
    })
    setShowEditModal(true)
  }

  const handleRemoveFromProject = async (projectContractorId: string, projectName: string) => {
    const ok = await confirm({
      title: 'Remove from project?',
      description: `Are you sure you want to remove ${selectedContractor?.fullName} from ${projectName}?`,
      confirmText: 'Remove',
      cancelText: 'Cancel'
    })

    if (!ok) return

    try {
      const response = await fetch(`/api/construction/project-contractors/${projectContractorId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        // Refresh contractors list to show updated assignments
        fetchContractors()
        await customAlert({ title: 'Removed', description: `${selectedContractor?.fullName} has been removed from ${projectName}.` })
      } else {
        const error = await response.json()
        await customAlert({ title: 'Failed to remove contractor', description: error?.error || 'Unknown error' })
      }
    } catch (error) {
      console.error('Error removing contractor from project:', error)
      await customAlert({ title: 'Failed to remove contractor', description: 'An unexpected error occurred.' })
    }
  }

  // Filter projects to only show unassigned ones
  const getAvailableProjects = () => {
    if (!selectedContractor) return projects
    
    const assignedProjectIds = selectedContractor.project_contractors.map(pc => pc.project.id)
    return projects.filter(project => !assignedProjectIds.includes(project.id))
  }

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectForm.name) return
    
    setSubmitting(true)
    try {
      const response = await fetch('/api/construction/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectForm.name,
          description: projectForm.description || null,
          budget: projectForm.budget ? parseFloat(projectForm.budget) : null,
          startDate: projectForm.startDate || null,
          endDate: projectForm.endDate || null,
          location: projectForm.location || null,
          status: 'active'
        })
      })

      if (response.ok) {
        const newProject = await response.json()
        
        // Update projects list first
        await fetchProjects()
        
        // Then select the new project and close modal
        setAssignmentForm({ ...assignmentForm, projectId: newProject.id })
        
        // Reset form and close modal
        setProjectForm({
          name: '',
          description: '',
          budget: '',
          startDate: '',
          endDate: '',
          location: ''
        })
        setShowProjectModal(false)
        
        // Show success message
        await customAlert({ title: 'Project created', description: `Project "${newProject.name}" has been created and selected.` })
      } else {
        const error = await response.json()
        await customAlert({ title: 'Failed to create project', description: error?.error || 'Unknown error' })
      }
    } catch (error) {
      console.error('Error creating project:', error)
      await customAlert({ title: 'Failed to create project', description: 'An unexpected error occurred.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignmentForm.projectId || !selectedContractor) return
    
    setSubmitting(true)
    try {
      const response = await fetch(`/api/construction/projects/${assignmentForm.projectId}/contractors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId: selectedContractor.id,
          role: assignmentForm.role || null,
          isPrimary: assignmentForm.isPrimary,
          hourlyRate: assignmentForm.hourlyRate ? parseFloat(assignmentForm.hourlyRate) : null,
          totalContractAmount: assignmentForm.totalContractAmount ? parseFloat(assignmentForm.totalContractAmount) : null,
          startDate: assignmentForm.startDate || null,
          endDate: assignmentForm.endDate || null,
          notes: assignmentForm.notes || null
        })
      })

      if (response.ok) {
        // Reset form and close modal
        setAssignmentForm({
          projectId: '',
          role: '',
          isPrimary: false,
          hourlyRate: '',
          totalContractAmount: '',
          startDate: '',
          endDate: '',
          notes: ''
        })
        setShowAssignModal(false)
        setSelectedContractor(null)
        
        // Refresh contractors list to show updated assignments
        fetchContractors()
        
        await customAlert({ title: 'Assigned', description: `${selectedContractor.fullName} has been assigned to the project successfully!` })
      } else {
        const error = await response.json()
        await customAlert({ title: 'Failed to assign contractor', description: error?.error || 'Unknown error' })
      }
    } catch (error) {
      console.error('Error assigning contractor:', error)
      await customAlert({ title: 'Failed to assign contractor', description: 'An unexpected error occurred.' })
    } finally {
      setSubmitting(false)
    }
  }

  const filteredContractors = contractors.filter(contractor => {
    if (!searchTerm.trim()) return true
    
    const search = searchTerm.toLowerCase().trim()
    return (
      contractor.fullName.toLowerCase().includes(search) ||
      contractor.email?.toLowerCase().includes(search) ||
      contractor.phone.includes(search) ||
      contractor.nationalId.toLowerCase().includes(search) ||
      // Also search in project assignments
      contractor.project_contractors.some(pc => 
        pc.project.name.toLowerCase().includes(search) ||
        pc.role?.toLowerCase().includes(search)
      )
    )
  })

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <ContentLayout title="Loading...">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </ContentLayout>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout
          title="🔨 Contractors & Personnel"
          subtitle="Manage your contractors, subcontractors, and personnel directory"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Contractors', isActive: true }
          ]}
          headerActions={
            <button 
              className="btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              Add Contractor
            </button>
          }
        >
          {/* Quick links (match clothing module card style) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <Link href="/personal/contractors" className="block">
              <div className="card p-6 hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">🔨</div>
                <h3 className="text-lg font-semibold mb-2 text-primary">Directory</h3>
                <p className="text-secondary">Personal & contractor directory</p>
              </div>
            </Link>

            <Link href="/projects" className="block">
              <div className="card p-6 hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-lg font-semibold mb-2 text-primary">Projects</h3>
                <p className="text-secondary">Manage construction projects and assignments</p>
              </div>
            </Link>

            <Link href="/admin/contractors" className="block">
              <div className="card p-6 hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">💼</div>
                <h3 className="text-lg font-semibold mb-2 text-primary">Global Contractors</h3>
                <p className="text-secondary">System-level contractor management</p>
              </div>
            </Link>
          </div>
          {/* Search and Filters */}
          <div className="mb-6">
            <div className="max-w-md">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Search contractors..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          {/* Contractors Grid */}
          {filteredContractors.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔨</div>
              <h3 className="text-lg font-medium text-primary mb-2">No contractors found</h3>
              <p className="text-secondary mb-4">
                {searchTerm ? 'No contractors match your search criteria.' : 'Start by adding your first contractor.'}
              </p>
              {!searchTerm && (
                <button 
                  className="btn-primary"
                  onClick={() => setShowAddModal(true)}
                >
                  Add First Contractor
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContractors.map((contractor) => (
                <div key={contractor.id} className="card p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-primary mb-1">
                        {contractor.fullName}
                      </h3>
                      <div className="space-y-1 text-sm text-secondary">
                        <div className="flex items-center">
                          <span className="font-medium">Phone:</span>
                          <span className="ml-2">{formatPhoneNumberForDisplay(contractor.phone)}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium">ID:</span>
                          <span className="ml-2">{contractor.nationalId}</span>
                        </div>
                        {contractor.email && (
                          <div className="flex items-center">
                            <span className="font-medium">Email:</span>
                            <span className="ml-2">{contractor.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      contractor.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {contractor.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  {/* Project Assignments */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-secondary">Project Assignments</span>
                      <span className="text-sm text-primary font-semibold">
                        {contractor._count.projectContractors}
                      </span>
                    </div>
                    
                    {contractor.projectContractors.length > 0 ? (
                      <div className="space-y-2">
                        {contractor.projectContractors.slice(0, 3).map((assignment) => {
                          // Skip assignments with missing project data
                          if (!assignment.project) return null

                          return (
                            <div key={assignment.id} className="flex items-center justify-between text-sm">
                              <div className="flex-1">
                                <span className="text-primary font-medium">{assignment.project.name}</span>
                                {assignment.role && (
                                  <span className="text-secondary ml-2">• {assignment.role}</span>
                                )}
                                {assignment.isPrimary && (
                                  <span className="ml-2 px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                    Primary
                                  </span>
                                )}
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                assignment.project.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : assignment.project.status === 'completed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {assignment.project.status}
                              </span>
                            </div>
                          )
                        })}
                        {contractor.projectContractors.length > 3 && (
                          <div className="text-xs text-secondary">
                            +{contractor.projectContractors.length - 3} more projects
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-secondary italic">No active assignments</div>
                    )}
                  </div>

                  {/* Payment History */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-secondary">Total Transactions:</span>
                      <span className="text-primary font-semibold">
                        {contractor._count.projectTransactions}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                    <div className="flex space-x-2 mb-2">
                      <button
                        className="flex-1 btn-secondary text-sm py-2"
                        onClick={() => handleViewDetailsClick(contractor)}
                      >
                        View Details
                      </button>
                      <button
                        className="flex-1 btn-outline text-sm py-2"
                        onClick={() => handleEditClick(contractor)}
                      >
                        Edit
                      </button>
                    </div>
                    <button
                      className="w-full btn-primary text-sm py-2"
                      onClick={() => handleAssignClick(contractor)}
                    >
                      Assign to Project
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Edit Contractor Modal */}
          {showEditModal && selectedContractor && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto">
              <div className="relative my-10 mx-4 sm:mx-auto w-full max-w-lg shadow-lg rounded-md bg-white dark:bg-gray-800 border p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
                <form onSubmit={handleEditSubmit}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-primary">Edit Contractor</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false)
                        setSelectedContractor(null)
                      }}
                      aria-label="Close edit contractor"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={editForm.fullName}
                        onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Enter contractor's full name"
                        required
                      />
                    </div>

                    <div className="space-y-4">
                      <PhoneNumberInput
                        value={editForm.phone}
                        onChange={(fullPhoneNumber) => setEditForm({ ...editForm, phone: fullPhoneNumber })}
                        label="Phone"
                        required
                      />
                      <NationalIdInput
                        value={editForm.nationalId}
                        templateId={editForm.idFormatTemplateId}
                        onChange={(nationalId, templateId) => setEditForm({
                          ...editForm,
                          nationalId,
                          idFormatTemplateId: templateId || editForm.idFormatTemplateId
                        })}
                        onTemplateChange={(templateId) => setEditForm({ ...editForm, idFormatTemplateId: templateId })}
                        label="National ID"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="contractor@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Address
                      </label>
                      <textarea
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        rows={2}
                        placeholder="Contractor's address"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Notes
                      </label>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        rows={2}
                        placeholder="Additional notes about this contractor"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false)
                        setSelectedContractor(null)
                      }}
                      className="btn-secondary"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={submitting || !editForm.fullName || !editForm.phone || !editForm.nationalId}
                    >
                      {submitting ? 'Updating...' : 'Update Contractor'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add Contractor Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto">
              <div className="relative my-10 mx-4 sm:mx-auto w-full max-w-lg shadow-lg rounded-md bg-white dark:bg-gray-800 border p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
                <form onSubmit={handleSubmit}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-primary">Add New Contractor</h3>
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      aria-label="Close add contractor"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={contractorForm.fullName}
                        onChange={(e) => setContractorForm({ ...contractorForm, fullName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Enter contractor's full name"
                        required
                      />
                    </div>

                    <div className="space-y-4">
                      <PhoneNumberInput
                        value={contractorForm.phone}
                        onChange={(fullPhoneNumber) => setContractorForm({ ...contractorForm, phone: fullPhoneNumber })}
                        label="Phone"
                        required
                      />
                      <NationalIdInput
                        value={contractorForm.nationalId}
                        templateId={contractorForm.idFormatTemplateId}
                        onChange={(nationalId, templateId) => setContractorForm({ 
                          ...contractorForm, 
                          nationalId,
                          idFormatTemplateId: templateId || contractorForm.idFormatTemplateId
                        })}
                        onTemplateChange={(templateId) => setContractorForm({ ...contractorForm, idFormatTemplateId: templateId })}
                        label="National ID"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={contractorForm.email}
                        onChange={(e) => setContractorForm({ ...contractorForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="contractor@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Address
                      </label>
                      <textarea
                        value={contractorForm.address}
                        onChange={(e) => setContractorForm({ ...contractorForm, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        rows={2}
                        placeholder="Contractor's address"
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
                        placeholder="Additional notes about this contractor"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="btn-secondary"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={submitting || !contractorForm.fullName || !contractorForm.phone || !contractorForm.nationalId}
                    >
                      {submitting ? 'Adding...' : 'Add Contractor'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Assign to Project Modal */}
          {showAssignModal && selectedContractor && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto">
              <div className="relative my-10 mx-4 sm:mx-auto w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800 border p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
                <form onSubmit={handleAssignmentSubmit}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-primary">
                      Assign {selectedContractor.fullName} to Project
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAssignModal(false)
                        setSelectedContractor(null)
                      }}
                      aria-label="Close assign to project"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Project *
                      </label>
                      <select
                        value={assignmentForm.projectId}
                        onChange={(e) => {
                          if (e.target.value === 'ADD_NEW') {
                            setShowProjectModal(true)
                          } else {
                            setAssignmentForm({ ...assignmentForm, projectId: e.target.value })
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      >
                        <option value="">Select project...</option>
                        {getAvailableProjects().map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name} ({project.status})
                          </option>
                        ))}
                        <option value="ADD_NEW" className="font-semibold text-blue-600">+ Add New Project</option>
                        {getAvailableProjects().length === 0 && (
                          <option disabled>All existing projects already assigned</option>
                        )}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">
                          Role
                        </label>
                        <input
                          type="text"
                          value={assignmentForm.role}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, role: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="e.g., Lead Contractor, Electrician"
                        />
                      </div>

                      <div className="flex items-center pt-6">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={assignmentForm.isPrimary}
                            onChange={(e) => setAssignmentForm({ ...assignmentForm, isPrimary: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-sm text-secondary">Primary Contractor</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">
                          Hourly Rate
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={assignmentForm.hourlyRate}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, hourlyRate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">
                          Total Contract Amount
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={assignmentForm.totalContractAmount}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, totalContractAmount: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <DateInput
                        value={assignmentForm.startDate}
                        onChange={(date) => setAssignmentForm({ ...assignmentForm, startDate: date })}
                        label="Start Date"
                        placeholder="Select start date"
                        showCountrySelector={false}
                      />

                      <DateInput
                        value={assignmentForm.endDate}
                        onChange={(date) => setAssignmentForm({ ...assignmentForm, endDate: date })}
                        label="End Date"
                        placeholder="Select end date"
                        showCountrySelector={false}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Notes
                      </label>
                      <textarea
                        value={assignmentForm.notes}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        rows={3}
                        placeholder="Additional assignment notes..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAssignModal(false)
                        setSelectedContractor(null)
                      }}
                      className="btn-secondary"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={submitting || !assignmentForm.projectId}
                    >
                      {submitting ? 'Assigning...' : 'Assign to Project'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* View Details Modal */}
          {showDetailsModal && selectedContractor && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto">
              <div className="relative my-10 mx-4 sm:mx-auto w-full max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800 border p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-primary">
                    {selectedContractor.fullName} - Project Assignments
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetailsModal(false)
                      setSelectedContractor(null)
                    }}
                    aria-label="Close details"
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                {/* Contractor Basic Info */}
                <div className="card p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm font-medium text-secondary">Phone:</span>
                      <p className="text-primary">{selectedContractor.phone}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-secondary">National ID:</span>
                      <p className="text-primary">{selectedContractor.nationalId}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-secondary">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedContractor.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {selectedContractor.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment History */}
                <div className="mb-6">
                  <h4 className="text-md font-semibold text-primary mb-4">
                    Payment History ({selectedContractor._count.projectTransactions} transactions)
                  </h4>

                  {selectedContractor._count.projectTransactions === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">💰</div>
                      <p className="text-secondary">No payment transactions yet</p>
                    </div>
                  ) : (
                    <div className="card p-4">
                      <p className="text-secondary text-sm mb-2">
                        This contractor has received {selectedContractor._count.projectTransactions} payments.
                        View detailed payment history in the <Link href="/admin/contractors" className="text-blue-600 hover:underline">Global Contractor Management</Link> section.
                      </p>
                      <div className="text-primary font-medium">
                        💡 Payment details available to system administrators
                      </div>
                    </div>
                  )}
                </div>

                {/* Project Assignments */}
                <div>
                  <h4 className="text-md font-semibold text-primary mb-4">
                    Project Assignments ({selectedContractor.project_contractors.length})
                  </h4>
                  
                  {selectedContractor.project_contractors.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">📋</div>
                      <p className="text-secondary">No project assignments yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedContractor.project_contractors.map((assignment) => (
                        <div key={assignment.id} className="card p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h5 className="font-semibold text-primary">
                                  {assignment.project.name}
                                </h5>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  assignment.project.status === 'active' 
                                    ? 'bg-green-100 text-green-800'
                                    : assignment.project.status === 'completed'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {assignment.project.status}
                                </span>
                                {assignment.isPrimary && (
                                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                                    Primary Contractor
                                  </span>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="font-medium text-secondary">Role:</span>
                                  <p className="text-primary">{assignment.role || 'Not specified'}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-secondary">Status:</span>
                                  <p className="text-primary">{assignment.project.status}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-secondary">Total Transactions:</span>
                                  <p className="text-primary">{selectedContractor._count.projectTransactions}</p>
                                </div>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleRemoveFromProject(assignment.id, assignment.project.name)}
                              className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false)
                      setSelectedContractor(null)
                    }}
                    className="btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Project Modal */}
          {showProjectModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto">
              <div className="relative my-10 mx-4 sm:mx-auto w-full max-w-lg shadow-lg rounded-md bg-white dark:bg-gray-800 border p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
                <form onSubmit={handleProjectSubmit}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-primary">Add New Project</h3>
                    <button
                      type="button"
                      onClick={() => setShowProjectModal(false)}
                      aria-label="Close add project"
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
                        value={projectForm.name}
                        onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="e.g., Chomfuli Rentals, Office Building"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Description
                      </label>
                      <textarea
                        value={projectForm.description}
                        onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        rows={3}
                        placeholder="Brief description of the project"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">
                          Budget
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={projectForm.budget}
                          onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">
                          Location
                        </label>
                        <input
                          type="text"
                          value={projectForm.location}
                          onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="Project location"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <DateInput
                        value={projectForm.startDate}
                        onChange={(date) => setProjectForm({ ...projectForm, startDate: date })}
                        label="Start Date"
                        placeholder="Select start date"
                        showCountrySelector={false}
                      />

                      <DateInput
                        value={projectForm.endDate}
                        onChange={(date) => setProjectForm({ ...projectForm, endDate: date })}
                        label="End Date"
                        placeholder="Select end date"
                        showCountrySelector={false}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowProjectModal(false)}
                      className="btn-secondary"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={submitting || !projectForm.name}
                    >
                      {submitting ? 'Creating...' : 'Create Project'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}