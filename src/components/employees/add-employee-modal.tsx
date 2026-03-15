'use client'

import { useState, useEffect } from 'react'
import type { OnSuccessArg } from '@/types/ui'
import { DateInput } from '@/components/ui/date-input'
import { NationalIdInput } from '@/components/ui/national-id-input'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { DriverLicenseInput } from '@/components/ui/driver-license-input'
import { SearchableSelect } from '@/components/ui/searchable-select'
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
  userId?: string
}

export function AddEmployeeModal({ isOpen, onClose, onSuccess, onError, userId }: AddEmployeeModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingUserData, setLoadingUserData] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
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
    address: '',
    hireDate: '',
    jobTitleId: '',
    compensationTypeId: '',
    primaryBusinessId: '',
    supervisorId: '',
    employmentStatus: 'pendingContract',
    notes: '',
    profilePhotoUrl: '',
  })

  const [businessAssignments, setBusinessAssignments] = useState<BusinessAssignment[]>([])
  const [showAddAssignment, setShowAddAssignment] = useState(false)
  const [newAssignment, setNewAssignment] = useState({ businessId: '', role: '' })

  useEffect(() => {
    if (isOpen) loadFormData()
  }, [isOpen])

  useEffect(() => {
    if (isOpen && userId) loadUserData(userId)
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
          const nameParts = user.name.split(' ')
          const firstName = nameParts[0] || ''
          const lastName = nameParts.slice(1).join(' ') || nameParts[0] || ''
          setFormData(prev => ({ ...prev, firstName, lastName, email: user.email || '', phone: user.phone || '' }))
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
      const [businessesRes, jobTitlesRes, compensationRes, supervisorsRes] = await Promise.all([
        fetch('/api/admin/businesses'),
        fetch('/api/job-titles'),
        fetch('/api/compensation-types'),
        fetch('/api/employees?limit=100'),
      ])

      if (businessesRes.ok) setBusinesses(await businessesRes.json())
      if (jobTitlesRes.ok) setJobTitles(await jobTitlesRes.json())
      if (compensationRes.ok) setCompensationTypes(await compensationRes.json())
      if (supervisorsRes.ok) {
        const data = await supervisorsRes.json()
        const eligible = (data.employees || []).filter((emp: any) => {
          const status = emp.employmentStatus?.toLowerCase() || ''
          return status === 'active' || status === 'pendingcontract' || status === 'pending_contract'
        })
        setSupervisors(eligible)
      }
    } catch (error) {
      console.error('Error loading form data:', error)
      onError('Failed to load form data')
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append('files', file)
      const res = await fetch('/api/universal/images', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        const url = data.data?.[0]?.url ?? data.url
        if (url) setFormData(prev => ({ ...prev, profilePhotoUrl: url }))
      } else {
        onError('Failed to upload photo')
      }
    } catch {
      onError('Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.firstName || !formData.lastName || !formData.phone ||
          !formData.nationalId || !formData.hireDate || !formData.jobTitleId ||
          !formData.compensationTypeId || !formData.primaryBusinessId) {
        onError('Please fill in all required fields')
        setLoading(false)
        return
      }

      if (formData.dateOfBirth) {
        const dob = new Date(formData.dateOfBirth)
        const minAge = new Date()
        minAge.setFullYear(minAge.getFullYear() - 18)
        if (dob > minAge) {
          onError('Employee must be at least 18 years old')
          setLoading(false)
          return
        }
      }

      const employeeData = {
        ...formData,
        businessAssignments: businessAssignments.map(a => ({
          ...a,
          isPrimary: a.businessId === formData.primaryBusinessId
        })),
        userId: linkedUser?.id
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
      firstName: '', lastName: '', email: '', phone: '',
      nationalId: '', idFormatTemplateId: '', driverLicense: '',
      driverLicenseTemplateId: '', dateOfBirth: '', address: '',
      hireDate: '', jobTitleId: '', compensationTypeId: '',
      primaryBusinessId: '', supervisorId: '', employmentStatus: 'pendingContract',
      notes: '', profilePhotoUrl: '',
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
    if (businessAssignments.some(a => a.businessId === newAssignment.businessId)) {
      onError('This business is already assigned')
      return
    }
    if (newAssignment.businessId === formData.primaryBusinessId) {
      onError('Primary business cannot be added as additional assignment')
      return
    }
    setBusinessAssignments([...businessAssignments, { businessId: newAssignment.businessId, role: newAssignment.role || 'Employee', isPrimary: false }])
    setNewAssignment({ businessId: '', role: '' })
    setShowAddAssignment(false)
  }

  const removeBusinessAssignment = (businessId: string) => {
    setBusinessAssignments(businessAssignments.filter(a => a.businessId !== businessId))
  }

  const getBusinessName = (businessId: string) =>
    businesses.find(b => b.id === businessId)?.name || 'Unknown Business'

  const handleNewCompensationTypeSuccess = (newComp: any) => {
    setCompensationTypes(prev => [...prev, newComp])
    setFormData(prev => ({ ...prev, compensationTypeId: newComp.id }))
    setShowAddCompensationTypeModal(false)
  }

  const handleNewJobTitleSuccess = (newJT: any) => {
    setJobTitles(prev => [...prev, newJT])
    setFormData(prev => ({ ...prev, jobTitleId: newJT.id }))
    setShowAddJobTitleModal(false)
  }

  // Build searchable select option arrays
  const jobTitleOptions = [
    ...[...jobTitles].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '')).map(jt => ({
      value: jt.id,
      label: jt.title + (jt.department ? ` — ${jt.department}` : '') + (jt.level ? ` (${jt.level})` : ''),
    })),
    { value: '__create_new__', label: '+ Create New Job Title...' },
  ]

  const compensationOptions = [
    ...[...compensationTypes].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')).map(ct => ({
      value: ct.id,
      label: (ct.name ?? '') + ` (${ct.type ?? ''})` + (ct.baseAmount ? ` — $${ct.baseAmount}` : '') + (ct.frequency ? ` ${ct.frequency}` : ''),
    })),
    { value: '__create_new__', label: '+ Create New Compensation Type...' },
  ]

  const supervisorOptions = [
    { value: '', label: 'No Supervisor' },
    ...[...supervisors].sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? '')).map(s => ({
      value: s.id,
      label: `${s.fullName} (${s.employeeNumber})`,
    })),
  ]

  const businessOptions = [
    ...[...businesses].filter(b => b != null).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')).map(b => ({
      value: b.id,
      label: `${b.name ?? 'Unknown'} (${b.type ?? ''})`,
    })),
  ]

  const additionalBusinessOptions = businesses
    .filter(b => b != null && b.id !== formData.primaryBusinessId && !businessAssignments.some(a => a.businessId === b.id))
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    .map(b => ({ value: b.id, label: `${b.name ?? 'Unknown'} (${b.type ?? ''})` }))

  const roleOptions = [
    { value: 'employee', label: 'Employee' },
    { value: 'restaurant-associate', label: 'Food Prep & POS Associate' },
    { value: 'grocery-associate', label: 'Grocery Shop Associate' },
    { value: 'clothing-associate', label: 'Clothing Shop Associate' },
    { value: 'business-manager', label: 'Business Manager' },
    { value: 'read-only', label: 'Read Only' },
    { value: 'business-owner', label: 'Business Owner' },
  ]

  const isAgeValid = !formData.dateOfBirth || (() => {
    const dob = new Date(formData.dateOfBirth)
    const minAge = new Date()
    minAge.setFullYear(minAge.getFullYear() - 18)
    return dob <= minAge
  })()

  const isFormValid =
    !!formData.firstName &&
    !!formData.lastName &&
    !!formData.phone &&
    !!formData.nationalId &&
    !!formData.hireDate &&
    !!formData.jobTitleId &&
    !!formData.compensationTypeId &&
    !!formData.primaryBusinessId &&
    isAgeValid

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-5xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold text-primary">Add New Employee</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingUserData ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading user data...</p>
            </div>
          ) : (
            <>
              {/* Linked User banner */}
              {linkedUser && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Linked to: {linkedUser.name} ({linkedUser.email})</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Pre-populated fields can be edited if needed.</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-0">

                  {/* ── LEFT COLUMN ── */}
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-base font-semibold text-primary mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">Personal Information</h3>

                      {/* Photo */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative flex-shrink-0">
                          {formData.profilePhotoUrl ? (
                            <img
                              src={formData.profilePhotoUrl}
                              alt="Profile"
                              className="w-20 h-20 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/expired-photo.svg' }}
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-300 dark:border-gray-600">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                          {uploadingPhoto && (
                            <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-secondary mb-1">Profile photo (optional)</p>
                          <label className="btn-secondary text-xs cursor-pointer">
                            {uploadingPhoto ? 'Uploading...' : formData.profilePhotoUrl ? 'Change Photo' : 'Upload Photo'}
                            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} disabled={uploadingPhoto} className="hidden" />
                          </label>
                          {formData.profilePhotoUrl && (
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, profilePhotoUrl: '' }))} className="ml-2 text-xs text-red-500 hover:text-red-700">Remove</button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-secondary mb-1">First Name *</label>
                          <input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary mb-1">Last Name *</label>
                          <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-sm font-medium text-secondary mb-1">Email</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <PhoneNumberInput
                          value={formData.phone}
                          onChange={(phone) => setFormData({ ...formData, phone })}
                          label="Phone Number *"
                          required
                        />
                      </div>

                      <div className="mt-3">
                        <NationalIdInput
                          value={formData.nationalId}
                          templateId={formData.idFormatTemplateId}
                          onChange={(nationalId, templateId) => setFormData({ ...formData, nationalId, idFormatTemplateId: templateId || '' })}
                          label="National ID *"
                          showTemplateSelector={true}
                          required
                        />
                      </div>

                      <div className="mt-3">
                        <DriverLicenseInput
                          value={formData.driverLicense}
                          templateId={formData.driverLicenseTemplateId}
                          onChange={(driverLicense, templateId) => setFormData({ ...formData, driverLicense, driverLicenseTemplateId: templateId || '' })}
                          label="Driver's License"
                          showTemplateSelector={true}
                        />
                      </div>

                      <div className="mt-3">
                        <DateInput
                          value={formData.dateOfBirth}
                          onChange={(dateOfBirth) => setFormData({ ...formData, dateOfBirth })}
                          label="Date of Birth"
                        />
                        {formData.dateOfBirth && (() => {
                          const dob = new Date(formData.dateOfBirth)
                          const minAge = new Date()
                          minAge.setFullYear(minAge.getFullYear() - 18)
                          return dob > minAge ? (
                            <p className="text-xs text-red-500 mt-1">Employee must be at least 18 years old</p>
                          ) : null
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* ── RIGHT COLUMN ── */}
                  <div className="space-y-5 mt-6 lg:mt-0">

                    {/* Employment Information */}
                    <div>
                      <h3 className="text-base font-semibold text-primary mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">Employment Information</h3>

                      <div className="grid grid-cols-2 gap-3">
                        <DateInput
                          value={formData.hireDate}
                          onChange={(hireDate) => setFormData({ ...formData, hireDate })}
                          label="Hire Date *"
                          required
                        />

                        <div>
                          <label className="block text-sm font-medium text-secondary mb-1">Job Title *</label>
                          <SearchableSelect
                            options={jobTitleOptions}
                            value={formData.jobTitleId}
                            onChange={(val) => {
                              if (val === '__create_new__') { setShowAddJobTitleModal(true) }
                              else { setFormData({ ...formData, jobTitleId: val }) }
                            }}
                            placeholder="Select Job Title"
                            searchPlaceholder="Search job titles..."
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-sm font-medium text-secondary mb-1">Compensation Type *</label>
                        <SearchableSelect
                          options={compensationOptions}
                          value={formData.compensationTypeId}
                          onChange={(val) => {
                            if (val === '__create_new__') { setShowAddCompensationTypeModal(true) }
                            else { setFormData({ ...formData, compensationTypeId: val }) }
                          }}
                          placeholder="Select Compensation Type"
                          searchPlaceholder="Search compensation types..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-sm font-medium text-secondary mb-1">Supervisor</label>
                          <SearchableSelect
                            options={supervisorOptions}
                            value={formData.supervisorId}
                            onChange={(val) => setFormData({ ...formData, supervisorId: val })}
                            placeholder="No Supervisor"
                            searchPlaceholder="Search employees..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-secondary mb-1">Employment Status</label>
                          <select
                            value={formData.employmentStatus}
                            onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="pendingContract">🟣 Pending Contract</option>
                            <option value="active">🟢 Active</option>
                            <option value="on_leave">🟡 On Leave</option>
                            <option value="suspended">🟠 Suspended</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Business Assignments */}
                    <div>
                      <h3 className="text-base font-semibold text-primary mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">Business Assignments</h3>

                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">Primary Business *</label>
                        <SearchableSelect
                          options={businessOptions}
                          value={formData.primaryBusinessId}
                          onChange={(val) => setFormData({ ...formData, primaryBusinessId: val })}
                          placeholder="Select Primary Business"
                          searchPlaceholder="Search businesses..."
                        />
                      </div>

                      {/* Additional Assignments */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-secondary">Additional Assignments</label>
                          <button type="button" onClick={() => setShowAddAssignment(!showAddAssignment)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium">
                            + Add Assignment
                          </button>
                        </div>

                        {businessAssignments.length > 0 && (
                          <div className="space-y-1.5 mb-2">
                            {businessAssignments.map((a, i) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                                <span className="text-primary">{getBusinessName(a.businessId)}{a.role && <span className="text-secondary ml-1.5 text-xs">• {a.role}</span>}</span>
                                <button type="button" onClick={() => removeBusinessAssignment(a.businessId)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                              </div>
                            ))}
                          </div>
                        )}

                        {showAddAssignment && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">Business</label>
                              <SearchableSelect
                                options={additionalBusinessOptions}
                                value={newAssignment.businessId}
                                onChange={(val) => setNewAssignment({ ...newAssignment, businessId: val })}
                                placeholder="Select Business"
                                searchPlaceholder="Search..."
                                emptyMessage="No available businesses"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">Role</label>
                              <SearchableSelect
                                options={roleOptions}
                                value={newAssignment.role}
                                onChange={(val) => setNewAssignment({ ...newAssignment, role: val })}
                                placeholder="Select Role"
                                searchPlaceholder="Search roles..."
                              />
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={addBusinessAssignment} disabled={!newAssignment.businessId} className="btn-primary text-xs disabled:opacity-50">Add</button>
                              <button type="button" onClick={() => { setShowAddAssignment(false); setNewAssignment({ businessId: '', role: '' }) }} className="btn-secondary text-xs">Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        placeholder="Optional notes about the employee..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">Address</label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        rows={2}
                        placeholder="Street, City, Province..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex gap-3 pt-5 mt-5 border-t border-gray-200 dark:border-gray-700">
                  <button type="submit" disabled={loading || !isFormValid} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? 'Creating...' : 'Create Employee'}
                  </button>
                  <button type="button" onClick={handleClose} disabled={loading} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      <AddCompensationTypeModal
        isOpen={showAddCompensationTypeModal}
        onClose={() => setShowAddCompensationTypeModal(false)}
        onSuccess={handleNewCompensationTypeSuccess}
        onError={onError}
      />

      <AddJobTitleModal
        isOpen={showAddJobTitleModal}
        onClose={() => setShowAddJobTitleModal(false)}
        onSuccess={handleNewJobTitleSuccess}
        onError={onError}
      />
    </div>
  )
}
