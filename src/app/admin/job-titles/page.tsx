'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { hasPermission } from '@/lib/permission-utils'

interface JobTitle {
  id: string
  title: string
  description: string | null
  responsibilities: string[]
  department: string | null
  level: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    employees: number
    contracts: number
  }
}

interface JobTitleFormData {
  title: string
  description: string
  responsibilities: string[]
  department: string
  level: string
}

const JOB_LEVELS = [
  'Entry Level',
  'Junior',
  'Mid Level',
  'Senior',
  'Lead',
  'Manager',
  'Director',
  'Executive'
]

const DEPARTMENTS = [
  'Administration',
  'Finance',
  'Human Resources',
  'Operations',
  'Sales',
  'Marketing',
  'Customer Service',
  'IT/Technology',
  'Legal',
  'Logistics'
]

export default function JobTitlesPage() {
  const { data: session } = useSession()
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingJobTitle, setEditingJobTitle] = useState<JobTitle | null>(null)
  const [formData, setFormData] = useState<JobTitleFormData>({
    title: '',
    description: '',
    responsibilities: [''],
    department: '',
    level: ''
  })

  const currentUser = session?.user as any
  const canManageJobTitles = currentUser && hasPermission(currentUser, 'canManageJobTitles')
  const canViewJobTitles = currentUser && (hasPermission(currentUser, 'canManageJobTitles') || hasPermission(currentUser, 'canViewEmployees'))

  useEffect(() => {
    if (canViewJobTitles) {
      fetchJobTitles()
    }
  }, [canViewJobTitles, departmentFilter, levelFilter, includeInactive])

  const fetchJobTitles = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (includeInactive) {
        params.append('includeInactive', 'true')
      }

      const response = await fetch(`/api/admin/job-titles?${params}`)
      if (response.ok) {
        const data = await response.json()
        setJobTitles(data)
      } else {
        console.error('Failed to fetch job titles')
      }
    } catch (error) {
      console.error('Error fetching job titles:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredJobTitles = jobTitles.filter((jobTitle) => {
    const matchesSearch = jobTitle.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         jobTitle.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         jobTitle.department?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDepartment = !departmentFilter || jobTitle.department === departmentFilter
    const matchesLevel = !levelFilter || jobTitle.level === levelFilter

    return matchesSearch && matchesDepartment && matchesLevel
  })

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      responsibilities: [''],
      department: '',
      level: ''
    })
  }

  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const openEditModal = (jobTitle: JobTitle) => {
    setEditingJobTitle(jobTitle)
    setFormData({
      title: jobTitle.title,
      description: jobTitle.description || '',
      responsibilities: jobTitle.responsibilities.length > 0 ? jobTitle.responsibilities : [''],
      department: jobTitle.department || '',
      level: jobTitle.level || ''
    })
    setShowEditModal(true)
  }

  const closeModals = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setEditingJobTitle(null)
    resetForm()
  }

  const handleResponsibilityChange = (index: number, value: string) => {
    const newResponsibilities = [...formData.responsibilities]
    newResponsibilities[index] = value
    setFormData({ ...formData, responsibilities: newResponsibilities })
  }

  const addResponsibility = () => {
    setFormData({
      ...formData,
      responsibilities: [...formData.responsibilities, '']
    })
  }

  const removeResponsibility = (index: number) => {
    if (formData.responsibilities.length > 1) {
      const newResponsibilities = formData.responsibilities.filter((_, i) => i !== index)
      setFormData({ ...formData, responsibilities: newResponsibilities })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      alert('Title is required')
      return
    }

    try {
      const filteredResponsibilities = formData.responsibilities.filter(r => r.trim() !== '')
      
      const submitData = {
        ...formData,
        responsibilities: filteredResponsibilities,
        description: formData.description.trim() || null,
        department: formData.department.trim() || null,
        level: formData.level.trim() || null
      }

      const url = editingJobTitle ? `/api/admin/job-titles/${editingJobTitle.id}` : '/api/admin/job-titles'
      const method = editingJobTitle ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      })

      if (response.ok) {
        fetchJobTitles()
        closeModals()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save job title')
      }
    } catch (error) {
      console.error('Error saving job title:', error)
      alert('Failed to save job title')
    }
  }

  const toggleJobTitleStatus = async (jobTitle: JobTitle) => {
    try {
      const response = await fetch(`/api/admin/job-titles/${jobTitle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: jobTitle.title,
          description: jobTitle.description,
          responsibilities: jobTitle.responsibilities,
          department: jobTitle.department,
          level: jobTitle.level,
          isActive: !jobTitle.isActive
        })
      })

      if (response.ok) {
        fetchJobTitles()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update job title status')
      }
    } catch (error) {
      console.error('Error updating job title:', error)
      alert('Failed to update job title status')
    }
  }

  if (!session) {
    return (
      <ContentLayout title="💼 Job Titles">
        <div className="text-center py-8">
          <p className="text-secondary">Please sign in to view job titles.</p>
        </div>
      </ContentLayout>
    )
  }

  if (!canViewJobTitles) {
    return (
      <ContentLayout title="💼 Job Titles">
        <div className="text-center py-8">
          <p className="text-secondary">You don't have permission to view job titles.</p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="💼 Job Titles Management"
      subtitle="Manage job titles, descriptions, and responsibilities"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Admin', href: '/admin' },
        { label: 'Job Titles', isActive: true }
      ]}
      headerActions={
        canManageJobTitles ? (
          <button onClick={openCreateModal} className="btn-primary">
            <span className="mr-2">+</span>
            Add Job Title
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Search Job Titles
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Search by title, description..."
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Department
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="input w-full"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Level
              </label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="input w-full"
              >
                <option value="">All Levels</option>
                {JOB_LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Status
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-secondary">Include inactive</span>
              </label>
            </div>

            <div className="flex items-end">
              <button 
                onClick={fetchJobTitles}
                className="btn-secondary w-full"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center mr-3">
                <span className="text-blue-600 dark:text-blue-300 text-sm font-semibold">📋</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{filteredJobTitles.length}</p>
                <p className="text-sm text-secondary">Total Job Titles</p>
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
                  {filteredJobTitles.filter(jt => jt.isActive).length}
                </p>
                <p className="text-sm text-secondary">Active</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-800 rounded-lg flex items-center justify-center mr-3">
                <span className="text-yellow-600 dark:text-yellow-300 text-sm font-semibold">👥</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {filteredJobTitles.reduce((sum, jt) => sum + jt._count.employees, 0)}
                </p>
                <p className="text-sm text-secondary">Employees Assigned</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-800 rounded-lg flex items-center justify-center mr-3">
                <span className="text-purple-600 dark:text-purple-300 text-sm font-semibold">🏢</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {[...new Set(filteredJobTitles.map(jt => jt.department).filter(Boolean))].length}
                </p>
                <p className="text-sm text-secondary">Departments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Job Titles List */}
        <div className="card">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-secondary">Loading job titles...</p>
            </div>
          ) : filteredJobTitles.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-secondary">No job titles found matching your criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredJobTitles.map((jobTitle) => (
                <div key={jobTitle.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-primary">{jobTitle.title}</h3>
                        {jobTitle.level && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded">
                            {jobTitle.level}
                          </span>
                        )}
                        {jobTitle.department && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded">
                            {jobTitle.department}
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                          jobTitle.isActive 
                            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
                        }`}>
                          {jobTitle.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      {jobTitle.description && (
                        <p className="text-sm text-secondary mb-3">{jobTitle.description}</p>
                      )}

                      {jobTitle.responsibilities.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-primary mb-2">Key Responsibilities:</h4>
                          <ul className="text-sm text-secondary space-y-1">
                            {jobTitle.responsibilities.slice(0, 3).map((responsibility, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="mr-2">•</span>
                                <span>{responsibility}</span>
                              </li>
                            ))}
                            {jobTitle.responsibilities.length > 3 && (
                              <li className="text-blue-600 dark:text-blue-400">
                                +{jobTitle.responsibilities.length - 3} more responsibilities
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      <div className="mt-3 text-xs text-secondary">
                        {jobTitle._count.employees} employee{jobTitle._count.employees !== 1 ? 's' : ''} • {' '}
                        {jobTitle._count.contracts} contract{jobTitle._count.contracts !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {canManageJobTitles && (
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => openEditModal(jobTitle)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleJobTitleStatus(jobTitle)}
                          className={`${
                            jobTitle.isActive 
                              ? 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300' 
                              : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                          }`}
                        >
                          {jobTitle.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto">
          <div className="relative my-10 mx-4 sm:mx-auto w-full max-w-2xl bg-white dark:bg-gray-800 rounded-md shadow-lg border p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-primary mb-4">
                {editingJobTitle ? 'Edit Job Title' : 'Create New Job Title'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="input w-full"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Level
                    </label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      className="input w-full"
                    >
                      <option value="">Select Level</option>
                      {JOB_LEVELS.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="input w-full"
                    placeholder="Brief description of the role..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Responsibilities
                  </label>
                  <div className="space-y-2">
                    {formData.responsibilities.map((responsibility, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={responsibility}
                          onChange={(e) => handleResponsibilityChange(index, e.target.value)}
                          className="input flex-1"
                          placeholder="Enter a key responsibility..."
                        />
                        {formData.responsibilities.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeResponsibility(index)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addResponsibility}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                    >
                      + Add Responsibility
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={closeModals}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    {editingJobTitle ? 'Update' : 'Create'} Job Title
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