'use client'

import { useState, useEffect } from 'react'
import type { OnSuccessArg } from '@/types/ui'
import { DateInput } from '@/components/ui/date-input'
import { NationalIdInput } from '@/components/ui/national-id-input'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { DriverLicenseInput } from '@/components/ui/driver-license-input'
import { AddCompensationTypeModal } from './add-compensation-type-modal'
import { AddJobTitleModal } from './add-job-title-modal'

interface Business {
  id: string
  name: string
  type: string
}

interface JobTitle {
  id: string
  title: string
  department?: string
  level?: string
}

interface CompensationType {
  id: string
  name: string
  type: string
  baseAmount?: number
  frequency?: string
}


interface Employee {
  id: string
  fullName: string
  employeeNumber: string
}

interface BusinessAssignment {
  businessId: string
  role: string
  isPrimary: boolean
}

interface AddEmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (payload: OnSuccessArg) => void
  onError: (error: string) => void
  userId?: string // Optional userId for pre-population
}

export function AddEmployeeModal({ isOpen, onClose, onSuccess, onError, userId }: AddEmployeeModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingUserData, setLoadingUserData] = useState(false)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([])
  const [compensationTypes, setCompensationTypes] = useState<CompensationType[]>([])
  const [supervisors, setSupervisors] = useState<Employee[]>([])
  const [showAddCompensationTypeModal, setShowAddCompensationTypeModal] = useState(false)
  const [showAddJobTitleModal, setShowAddJobTitleModal] = useState(false)
  const [linkedUser, setLinkedUser] = useState<{ id: string; name: string; email: string } | null>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationalId: '',
    idFormatTemplateId: '',
    driverLicense: '',
    driverLicenseTemplateId: '',
    dateOfBirth: '',
    hireDate: '',
    jobTitleId: '',
    compensationTypeId: '',
    primaryBusinessId: '',
    supervisorId: '',
    employmentStatus: 'pendingContract',
    notes: ''
  })

  const [businessAssignments, setBusinessAssignments] = useState<BusinessAssignment[]>([])
  const [showAddAssignment, setShowAddAssignment] = useState(false)
  const [newAssignment, setNewAssignment] = useState({
    businessId: '',
    role: ''
  })

  useEffect(() => {
    if (isOpen) {
      loadFormData()
    }
  }, [isOpen])

  // Load user data if userId provided
  useEffect(() => {
    if (isOpen && userId) {
      loadUserData(userId)
    }
  }, [isOpen, userId])

  const loadUserData = async (userId: string) => {
    setLoadingUserData(true)
    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`)
      if (response.ok) {
        const users = await response.json()
        const user = users.find((u: any) => u.id === userId)

        if (user) {
          setLinkedUser({ id: user.id, name: user.name, email: user.email })

          // Parse name into firstName and lastName
          const nameParts = user.name.split(' ')
          const firstName = nameParts[0] || ''
          const lastName = nameParts.slice(1).join(' ') || nameParts[0] || ''

          // Pre-populate form
          setFormData(prev => ({
            ...prev,
            firstName,
            lastName,
            email: user.email || '',
            phone: user.phone || '' // If available
          }))
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      onError('Failed to load user data')
    } finally {
      setLoadingUserData(false)
    }
  }

  const loadFormData = async () => {
    try {
      // Load all businesses (admin endpoint)
      const businessesResponse = await fetch('/api/admin/businesses')
      if (businessesResponse.ok) {
        const businessesData = await businessesResponse.json()
        setBusinesses(businessesData)
      }

      // Load job titles
      const jobTitlesResponse = await fetch('/api/job-titles')
      if (jobTitlesResponse.ok) {
        const jobTitlesData = await jobTitlesResponse.json()
        setJobTitles(jobTitlesData)
      }

      // Load compensation types
      const compensationResponse = await fetch('/api/compensation-types')
      if (compensationResponse.ok) {
        const compensationData = await compensationResponse.json()
        setCompensationTypes(compensationData)
      }


      // Load potential supervisors (all active employees can be supervisors)
      const supervisorsResponse = await fetch('/api/employees?status=active&limit=100')
      if (supervisorsResponse.ok) {
        const supervisorsData = await supervisorsResponse.json()
        setSupervisors(supervisorsData.employees || [])
      }
    } catch (error) {
      console.error('Error loading form data:', error)
      onError('Failed to load form data')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.phone || 
          !formData.nationalId || !formData.hireDate || !formData.jobTitleId || 
          !formData.compensationTypeId || !formData.primaryBusinessId) {
        onError('Please fill in all required fields')
        setLoading(false)
        return
      }

      const employeeData = {
        ...formData,
        businessAssignments: businessAssignments.map(assignment => ({
          ...assignment,
          isPrimary: assignment.businessId === formData.primaryBusinessId
        })),
        userId: linkedUser?.id // Include userId if linked to user
      }

      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData)
      })

      if (response.ok) {
        const result = await response.json()
        const newEmployee = result.employee || result
        onSuccess(`Employee ${newEmployee.fullName} (${newEmployee.employeeNumber}) created successfully`)
        handleClose()
      } else {
        const errorData = await response.json()
        onError(errorData.error || 'Failed to create employee')
      }
    } catch (error) {
      console.error('Error creating employee:', error)
      onError('Error creating employee')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nationalId: '',
      idFormatTemplateId: '',
      driverLicense: '',
      driverLicenseTemplateId: '',
      dateOfBirth: '',
      hireDate: '',
      jobTitleId: '',
      compensationTypeId: '',
      primaryBusinessId: '',
      supervisorId: '',
      employmentStatus: 'pendingContract',
      notes: ''
    })
    setBusinessAssignments([])
    setShowAddAssignment(false)
    setNewAssignment({ businessId: '', role: '' })
    setLinkedUser(null)
    setLoadingUserData(false)
    onClose()
  }

  const addBusinessAssignment = () => {
    if (!newAssignment.businessId) return

    const business = businesses.find(b => b.id === newAssignment.businessId)
    if (!business) return

    // Check if assignment already exists
    const existsAlready = businessAssignments.some(a => a.businessId === newAssignment.businessId)
    if (existsAlready) {
      onError('This business is already assigned')
      return
    }

    // Don't add primary business to additional assignments
    if (newAssignment.businessId === formData.primaryBusinessId) {
      onError('Primary business cannot be added as additional assignment')
      return
    }

    setBusinessAssignments([...businessAssignments, {
      businessId: newAssignment.businessId,
      role: newAssignment.role || 'Employee',
      isPrimary: false
    }])

    setNewAssignment({ businessId: '', role: '' })
    setShowAddAssignment(false)
  }

  const removeBusinessAssignment = (businessId: string) => {
    setBusinessAssignments(businessAssignments.filter(a => a.businessId !== businessId))
  }

  const getBusinessName = (businessId: string) => {
    return businesses.find(b => b.id === businessId)?.name || 'Unknown Business'
  }

  const handleCompensationTypeChange = (value: string) => {
    if (value === '__create_new__') {
      setShowAddCompensationTypeModal(true)
    } else {
      setFormData({...formData, compensationTypeId: value})
    }
  }

  const handleJobTitleChange = (value: string) => {
    if (value === '__create_new__') {
      setShowAddJobTitleModal(true)
    } else {
      setFormData({...formData, jobTitleId: value})
    }
  }

  const handleNewCompensationTypeSuccess = (newCompensationType: any) => {
    // Add the new compensation type to the list
    setCompensationTypes(prev => [...prev, newCompensationType])
    // Auto-select the newly created compensation type
    setFormData({...formData, compensationTypeId: newCompensationType.id})
    // Close the modal
    setShowAddCompensationTypeModal(false)
    // Don't call parent onSuccess - just stay in employee creation flow
  }

  const handleNewJobTitleSuccess = (newJobTitle: any) => {
    // Add the new job title to the list
    setJobTitles(prev => [...prev, newJobTitle])
    // Auto-select the newly created job title
    setFormData({...formData, jobTitleId: newJobTitle.id})
    // Close the modal
    setShowAddJobTitleModal(false)
    // Don't call parent onSuccess - just stay in employee creation flow
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-primary">Add New Employee</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Loading User Data Spinner */}
          {loadingUserData && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading user data...</p>
            </div>
          )}

          {/* Form Content - only show when not loading */}
          {!loadingUserData && (
            <>
              {/* Linked User Indicator */}
              {linkedUser && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Linked to User Account
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        {linkedUser.name} ({linkedUser.email})
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    This employee will be automatically linked to the user account. Pre-populated fields can be edited if needed.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-medium text-primary mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <PhoneNumberInput
                  value={formData.phone}
                  onChange={(phone) => setFormData({...formData, phone})}
                  label="Phone Number *"
                  required
                />

                <NationalIdInput
                  value={formData.nationalId}
                  templateId={formData.idFormatTemplateId}
                  onChange={(nationalId, templateId) => setFormData({...formData, nationalId, idFormatTemplateId: templateId || ''})}
                  label="National ID *"
                  showTemplateSelector={true}
                  required
                />

                <DriverLicenseInput
                  value={formData.driverLicense}
                  templateId={formData.driverLicenseTemplateId}
                  onChange={(driverLicense, templateId) => setFormData({...formData, driverLicense, driverLicenseTemplateId: templateId || ''})}
                  label="Driver's License"
                  showTemplateSelector={true}
                />

                <DateInput
                  value={formData.dateOfBirth}
                  onChange={(dateOfBirth) => setFormData({...formData, dateOfBirth})}
                  label="Date of Birth"
                />
              </div>
            </div>

            {/* Employment Information */}
            <div>
              <h3 className="text-lg font-medium text-primary mb-4">Employment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DateInput
                  value={formData.hireDate}
                  onChange={(hireDate) => setFormData({...formData, hireDate})}
                  label="Hire Date *"
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Job Title *
                  </label>
                  <select
                    value={formData.jobTitleId}
                    onChange={(e) => handleJobTitleChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Job Title</option>
                    {[...jobTitles].sort((a, b) => a.title.localeCompare(b.title)).map((jobTitle) => (
                      <option key={jobTitle.id} value={jobTitle.id}>
                        {jobTitle.title}
                        {jobTitle.department && ` - ${jobTitle.department}`}
                        {jobTitle.level && ` (${jobTitle.level})`}
                      </option>
                    ))}
                    <option value="__create_new__" className="font-semibold text-blue-600">+ Create New Job Title...</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Compensation Type *
                  </label>
                  <div className="flex space-x-2">
                    <select
                      value={formData.compensationTypeId}
                      onChange={(e) => handleCompensationTypeChange(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Compensation Type</option>
                      {[...compensationTypes].sort((a, b) => a.name.localeCompare(b.name)).map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name} ({type.type})
                          {type.baseAmount && ` - $${type.baseAmount}`}
                          {type.frequency && ` ${type.frequency}`}
                        </option>
                      ))}
                      <option value="__create_new__" className="font-semibold text-blue-600">+ Create New...</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Supervisor
                  </label>
                  <select
                    value={formData.supervisorId}
                    onChange={(e) => setFormData({...formData, supervisorId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No Supervisor</option>
                    {[...supervisors].sort((a, b) => a.fullName.localeCompare(b.fullName)).map((supervisor) => (
                      <option key={supervisor.id} value={supervisor.id}>
                        {supervisor.fullName} ({supervisor.employeeNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Employment Status
                  </label>
                  <select
                    value={formData.employmentStatus}
                    onChange={(e) => setFormData({...formData, employmentStatus: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pendingContract">🟣 PENDING CONTRACT</option>
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Business Assignments */}
            <div>
              <h3 className="text-lg font-medium text-primary mb-4">Business Assignments</h3>
              
              {/* Primary Business */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-secondary mb-2">
                  Primary Business *
                </label>
                <select
                  value={formData.primaryBusinessId}
                  onChange={(e) => setFormData({...formData, primaryBusinessId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Primary Business</option>
                  {[...businesses].sort((a, b) => a.name.localeCompare(b.name)).map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name} ({business.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Additional Business Assignments */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-secondary">
                    Additional Business Assignments
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddAssignment(!showAddAssignment)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                  >
                    + Add Assignment
                  </button>
                </div>

                {/* Current assignments */}
                {businessAssignments.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {businessAssignments.map((assignment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <div>
                          <span className="font-medium text-primary">{getBusinessName(assignment.businessId)}</span>
                          {assignment.role && (
                            <span className="text-sm text-secondary ml-2">• {assignment.role}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeBusinessAssignment(assignment.businessId)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new assignment form */}
                {showAddAssignment && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">
                          Business
                        </label>
                        <select
                          value={newAssignment.businessId}
                          onChange={(e) => setNewAssignment({...newAssignment, businessId: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Business</option>
                          {businesses
                            .filter(b => b.id !== formData.primaryBusinessId && !businessAssignments.some(a => a.businessId === b.id))
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((business) => (
                            <option key={business.id} value={business.id}>
                              {business.name} ({business.type})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">
                          Role
                        </label>
                        <input
                          type="text"
                          value={newAssignment.role}
                          onChange={(e) => setNewAssignment({...newAssignment, role: e.target.value})}
                          placeholder="Employee role in this business"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={addBusinessAssignment}
                        disabled={!newAssignment.businessId}
                        className="btn-primary text-sm disabled:opacity-50"
                      >
                        Add Assignment
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddAssignment(false)
                          setNewAssignment({ businessId: '', role: '' })
                        }}
                        className="btn-secondary text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional notes about the employee..."
              />
            </div>

            {/* Submit buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Employee'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
            </>
          )}
        </div>
      </div>

      {/* Add Compensation Type Modal */}
      <AddCompensationTypeModal
        isOpen={showAddCompensationTypeModal}
        onClose={() => setShowAddCompensationTypeModal(false)}
        onSuccess={handleNewCompensationTypeSuccess}
        onError={onError}
      />

      {/* Add Job Title Modal */}
      <AddJobTitleModal
        isOpen={showAddJobTitleModal}
        onClose={() => setShowAddJobTitleModal(false)}
        onSuccess={handleNewJobTitleSuccess}
        onError={onError}
      />
    </div>
  )
}