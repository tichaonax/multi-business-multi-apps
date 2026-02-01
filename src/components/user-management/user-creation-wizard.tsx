'use client'

import React, { useState } from 'react'
import { SessionUser, getActiveBusinessMemberships, isSystemAdmin } from '@/lib/permission-utils'
import { BUSINESS_PERMISSION_PRESETS, BusinessPermissions, BusinessType, CORE_PERMISSIONS, BUSINESS_TYPE_MODULES, USER_LEVEL_PERMISSIONS } from '@/types/permissions'

interface UserCreationWizardProps {
  currentUser: SessionUser
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (error: string) => void
}

interface UserCreationStep1Data {
  name: string
  email: string
  systemRole: 'admin' | 'manager' | 'employee' | 'user'
  password: string
  sendInvite: boolean
  linkToEmployee: boolean
  selectedEmployeeId: string
}

interface BusinessAssignment {
  businessId: string
  businessName: string
  businessType?: string
  role: keyof typeof BUSINESS_PERMISSION_PRESETS
  customPermissions: Partial<BusinessPermissions>
  useCustomPermissions: boolean
  selectedTemplate?: string // Permission template ID
}

interface PermissionTemplate {
  id: string
  name: string
  businessType: string
  permissions: Partial<BusinessPermissions>
}

interface UserForCloning {
  userId: string
  userName: string
  userEmail: string
  businessPermissions: {
    businessId: string
    businessName: string
    businessType: string
    role: string
    permissions: Partial<BusinessPermissions>
  }[]
}

export function UserCreationWizard({ currentUser, onClose, onSuccess, onError }: UserCreationWizardProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  // Step 1: Basic user information
  const [basicInfo, setBasicInfo] = useState<UserCreationStep1Data>({
    name: '',
    email: '',
    systemRole: 'user',
    password: '',
    sendInvite: true,
    linkToEmployee: false,
    selectedEmployeeId: ''
  })

  // Step 2: Business assignments
  const [businessAssignments, setBusinessAssignments] = useState<BusinessAssignment[]>([])
  const [availableBusinesses, setAvailableBusinesses] = useState<any[]>([])
  const [loadingBusinesses, setLoadingBusinesses] = useState(false)
  const [permissionTemplates, setPermissionTemplates] = useState<PermissionTemplate[]>([])
  const [usersForCloning, setUsersForCloning] = useState<UserForCloning[]>([])
  const [loadingUsersForCloning, setLoadingUsersForCloning] = useState(false)

  // Employee selection
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [employeeSearch, setEmployeeSearch] = useState('')

  const loadAvailableBusinesses = async () => {
    setLoadingBusinesses(true)
    try {
      const response = await fetch('/api/admin/businesses')
      if (response.ok) {
        const businesses = await response.json()
        const mappedBusinesses = businesses.map((b: any) => ({
          businessId: b.id,
          businessName: b.name,
          businessType: b.type || 'other'
        }))
        setAvailableBusinesses(mappedBusinesses)
      } else {
        const error = await response.text()
        onError('Failed to load businesses: ' + error)
      }
      } catch (error) {
        const message = error && typeof error === 'object' && 'message' in error ? (error as any).message : String(error)
        onError('Error loading businesses: ' + message)
    } finally {
      setLoadingBusinesses(false)
    }
  }

  const loadPermissionTemplates = async () => {
    try {
      const response = await fetch('/api/admin/permission-templates')
      if (response.ok) {
        const templates = await response.json()
        setPermissionTemplates(templates)
      }
    } catch (error) {
      console.error('Error loading permission templates:', error)
    }
  }

  const loadUsersForCloning = async () => {
    setLoadingUsersForCloning(true)
    try {
      // First get all users
      const usersResponse = await fetch('/api/admin/users')
      if (!usersResponse.ok) {
        console.error('Failed to load users for cloning')
        return
      }
      const users = await usersResponse.json()

      // For each user, we already have their businessMemberships with permissions
      const clonableUsers: UserForCloning[] = users
        .filter((u: any) => u.businessMemberships && u.businessMemberships.length > 0)
        .map((u: any) => ({
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
          businessPermissions: u.businessMemberships.map((m: any) => ({
            businessId: m.businessId,
            businessName: m.businesses?.name || m.business?.name || 'Unknown',
            businessType: m.businesses?.type || m.business?.type || 'other',
            role: m.role,
            permissions: m.permissions || {}
          }))
        }))

      setUsersForCloning(clonableUsers)
    } catch (error) {
      console.error('Error loading users for cloning:', error)
    } finally {
      setLoadingUsersForCloning(false)
    }
  }

  const loadAvailableEmployees = async () => {
    setLoadingEmployees(true)
    try {
      const response = await fetch('/api/employees/available-for-users')
      if (response.ok) {
        const employees = await response.json()
        setAvailableEmployees(employees)
      } else {
        onError('Failed to load available employees')
      }
    } catch (error) {
      onError('Error loading employees')
    } finally {
      setLoadingEmployees(false)
    }
  }

  const handleEmployeeSelection = (employeeId: string) => {
    const selectedEmployee = availableEmployees.find(emp => emp.id === employeeId)
    if (selectedEmployee) {
      setBasicInfo(prev => ({
        ...prev,
        selectedEmployeeId: employeeId,
        name: selectedEmployee.fullName,
        email: selectedEmployee.email || ''
      }))
    }
  }

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (basicInfo.linkToEmployee && !basicInfo.selectedEmployeeId) {
      onError('Please select an employee to link to this user account')
      return
    }
    if (!basicInfo.name || !basicInfo.email || (!basicInfo.password && !basicInfo.sendInvite)) {
      onError('Please fill in all required fields')
      return
    }
    
    setStep(2)

    // Load businesses, templates, and users for cloning when moving to step 2
    if (availableBusinesses.length === 0) {
      await loadAvailableBusinesses()
    }
    if (permissionTemplates.length === 0) {
      loadPermissionTemplates()
    }
    if (usersForCloning.length === 0) {
      loadUsersForCloning()
    }
  }

  const addBusinessAssignment = async () => {
    
    let businessesToUse = availableBusinesses
    
    if (businessesToUse.length === 0) {
      setLoadingBusinesses(true)
      try {
        const response = await fetch('/api/admin/businesses')
        if (response.ok) {
          const businesses = await response.json()
              businessesToUse = businesses.map((b: any) => ({
                businessId: b.id,
                businessName: b.name,
                businessType: b.type || 'other'
              }))
          setAvailableBusinesses(businessesToUse)
        } else {
          const errorText = await response.text()
          onError('Failed to load businesses: ' + errorText)
          return
        }
      } catch (error) {
        const message = (error && typeof (error as any).message === 'string') ? (error as any).message : String(error)
        onError('Error loading businesses: ' + message)
        return
      } finally {
        setLoadingBusinesses(false)
      }
    }
    
    if (businessesToUse.length === 0) {
      onError('No businesses available. Please create a business first.')
      return
    }
    
    const firstAvailableBusiness = businessesToUse[0]
    setBusinessAssignments([...businessAssignments, {
      businessId: firstAvailableBusiness.businessId,
      businessName: firstAvailableBusiness.businessName,
      businessType: firstAvailableBusiness.businessType || 'other',
      role: 'employee',
      customPermissions: {},
      useCustomPermissions: false
    }])
  }

  const updateBusinessAssignment = (index: number, updates: Partial<BusinessAssignment>) => {
    const updated = businessAssignments.map((assignment, i) => 
      i === index ? { ...assignment, ...updates } : assignment
    )
    setBusinessAssignments(updated)
  }

  const removeBusinessAssignment = (index: number) => {
    setBusinessAssignments(businessAssignments.filter((_, i) => i !== index))
  }

  const handleFinalSubmit = async () => {
    // System admins can create users without business assignments
    if (!isSystemAdmin(currentUser) && businessAssignments.length === 0) {
      onError('User must be assigned to at least one business')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: basicInfo.name,
          email: basicInfo.email,
          password: basicInfo.password,
          systemRole: basicInfo.systemRole,
          sendInvite: basicInfo.sendInvite,
          businessAssignments,
          linkToEmployee: basicInfo.linkToEmployee,
          employeeId: basicInfo.linkToEmployee ? basicInfo.selectedEmployeeId : undefined
        })
      })

      const data = await response.json()
      if (response.ok) {
        onSuccess(data.message + (data.temporaryPassword ? ` Temp password: ${data.temporaryPassword}` : ''))
        onClose()
      } else {
        onError(data.error || 'Failed to create user')
      }
    } catch (error) {
      onError('Error creating user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New User</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-400">✕</button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex mt-4">
            <div className={`flex-1 text-center pb-2 border-b-2 ${step >= 1 ? 'border-blue-500 text-blue-600' : 'border-gray-200 text-gray-400'}`}>
              1. Basic Information
            </div>
            <div className={`flex-1 text-center pb-2 border-b-2 ${step >= 2 ? 'border-blue-500 text-blue-600' : 'border-gray-200 text-gray-400'}`}>
              2. Business Access
            </div>
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name *
                    {basicInfo.linkToEmployee && (
                      <span className="text-xs text-gray-500 ml-2">(from selected employee)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    className={`input-field ${basicInfo.linkToEmployee ? 'bg-gray-50 dark:bg-gray-700' : ''}`}
                    value={basicInfo.name}
                    readOnly={basicInfo.linkToEmployee}
                    onChange={(e) => !basicInfo.linkToEmployee && setBasicInfo({ ...basicInfo, name: e.target.value })}
                    placeholder={basicInfo.linkToEmployee ? 'Select an employee above' : 'Enter full name'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address *
                    {basicInfo.linkToEmployee && (
                      <span className="text-xs text-gray-500 ml-2">(from selected employee)</span>
                    )}
                  </label>
                  <input
                    type="email"
                    required
                    className={`input-field ${basicInfo.linkToEmployee ? 'bg-gray-50 dark:bg-gray-700' : ''}`}
                    value={basicInfo.email}
                    readOnly={basicInfo.linkToEmployee}
                    onChange={(e) => !basicInfo.linkToEmployee && setBasicInfo({ ...basicInfo, email: e.target.value })}
                    placeholder={basicInfo.linkToEmployee ? 'Select an employee above' : 'Enter email address'}
                  />
                </div>
              </div>

              {isSystemAdmin(currentUser) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    System Role
                  </label>
                  <select
                    className="input-field"
                    value={basicInfo.systemRole}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBasicInfo({ ...basicInfo, systemRole: e.target.value as UserCreationStep1Data['systemRole'] })}
                  >
                    <option value="user">User</option>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">System Admin</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    System role affects cross-business permissions. Most users should be "User".
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="linkToEmployee"
                  checked={basicInfo.linkToEmployee}
                  onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                    const isLinking = e.target.checked
                    setBasicInfo({ ...basicInfo, linkToEmployee: isLinking, selectedEmployeeId: '', name: '', email: '' })
                    if (isLinking && availableEmployees.length === 0) {
                      await loadAvailableEmployees()
                    }
                  }}
                  className="rounded"
                />
                <label htmlFor="linkToEmployee" className="text-sm text-gray-700 dark:text-gray-300">
                  Create user account for an existing employee
                </label>
              </div>

              {basicInfo.linkToEmployee && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Employee *
                  </label>
                  {loadingEmployees ? (
                    <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-md">
                      <div className="animate-pulse">Loading employees...</div>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Search employees by name, email, or employee number..."
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        className="input-field mb-2"
                      />
                      <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                        {availableEmployees.filter(emp => 
                            (emp.fullName || '').toLowerCase().includes(employeeSearch.toLowerCase()) ||
                            (emp.employeeNumber || '').toLowerCase().includes(employeeSearch.toLowerCase()) ||
                            ((emp.email || '').toLowerCase().includes(employeeSearch.toLowerCase()))
                          ).map(employee => (
                          <div
                            key={employee.id}
                            onClick={() => handleEmployeeSelection(employee.id)}
                            className={`p-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                              basicInfo.selectedEmployeeId === employee.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                          >
                            <div className="flex items-center">
                              <input
                                type="radio"
                                checked={basicInfo.selectedEmployeeId === employee.id}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleEmployeeSelection(employee.id)}
                                className="mr-3"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white">{employee.fullName}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{employee.employeeNumber}</p>
                                {employee.email && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400">{employee.email}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 px-2 py-1 rounded">
                                    {employee.employmentStatus}
                                  </span>
                                  {employee.jobTitle && (
                                    <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                      {typeof employee.jobTitle === 'string' ? employee.jobTitle : (employee.jobTitle?.title || '')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {availableEmployees.filter(emp => 
                            (emp.fullName || '').toLowerCase().includes(employeeSearch.toLowerCase()) ||
                            (emp.employeeNumber || '').toLowerCase().includes(employeeSearch.toLowerCase()) ||
                            ((emp.email || '').toLowerCase().includes(employeeSearch.toLowerCase()))
                          ).length === 0 && (
                          <div className="p-3 text-center text-gray-500">
                            {employeeSearch ? 'No employees match your search' : 'No employees available for linking'}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    This will create a user account for the selected employee and link them together.
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="sendInvite"
                    checked={basicInfo.sendInvite}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBasicInfo({ ...basicInfo, sendInvite: e.target.checked })}
                    className="rounded"
                  />
                <label htmlFor="sendInvite" className="text-sm text-gray-700 dark:text-gray-300">
                  Send invitation email (generates temporary password)
                </label>
              </div>

              {!basicInfo.sendInvite && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required={!basicInfo.sendInvite}
                    className="input-field"
                    value={basicInfo.password}
                    onChange={(e) => setBasicInfo({ ...basicInfo, password: e.target.value })}
                    minLength={6}
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {isSystemAdmin(currentUser) && basicInfo.systemRole === 'admin' ? 'Next: Review' : 'Next: Assign Businesses'}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Business Access</h3>
                  <div className="flex space-x-2">
                    <button 
                      onClick={loadAvailableBusinesses}
                      className="btn-secondary text-sm"
                      disabled={loadingBusinesses}
                    >
                      {loadingBusinesses ? 'Loading...' : '🔄 Refresh'}
                    </button>
                    <button 
                      onClick={addBusinessAssignment}
                      className="btn-primary text-sm"
                      disabled={businessAssignments.length >= availableBusinesses.length || loadingBusinesses}
                    >
                      + Add Business
                    </button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  Assign this user to businesses and set their role/permissions in each one.
                </p>
              </div>

              {loadingBusinesses ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading businesses...</p>
                </div>
              ) : businessAssignments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No business assignments yet.</p>
                  <div className="space-y-3">
                    {availableBusinesses.length > 0 ? (
                      <button onClick={addBusinessAssignment} className="btn-primary">
                        Add First Business Assignment
                      </button>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600">No businesses available for assignment.</p>
                        <button 
                          onClick={addBusinessAssignment}
                          className="btn-primary"
                          disabled={loadingBusinesses}
                        >
                          {loadingBusinesses ? 'Loading...' : 'Load and Add First Business Assignment'}
                        </button>
                        {isSystemAdmin(currentUser) && (
                          <p className="text-sm text-blue-600">System admins can create users without business assignments.</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {businessAssignments.map((assignment, index) => (
                    <BusinessAssignmentCard
                      key={index}
                      assignment={assignment}
                      availableBusinesses={availableBusinesses}
                      permissionTemplates={permissionTemplates}
                      usersForCloning={usersForCloning}
                      loadingUsersForCloning={loadingUsersForCloning}
                      onUpdate={(updates) => updateBusinessAssignment(index, updates)}
                      onRemove={() => removeBusinessAssignment(index)}
                      canRemove={businessAssignments.length > 1}
                    />
                  ))}
                </div>
              )}

              <div className="flex justify-between pt-6">
                <button 
                  onClick={() => setStep(1)} 
                  className="btn-secondary"
                >
                  ← Back
                </button>
                <button 
                  onClick={handleFinalSubmit}
                  disabled={loading || (!isSystemAdmin(currentUser) && businessAssignments.length === 0)}
                  className="btn-primary"
                >
                  {loading ? 'Creating User...' : 'Create User'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface BusinessAssignmentCardProps {
  assignment: BusinessAssignment
  availableBusinesses: any[]
  permissionTemplates: PermissionTemplate[]
  usersForCloning: UserForCloning[]
  loadingUsersForCloning: boolean
  onUpdate: (updates: Partial<BusinessAssignment>) => void
  onRemove: () => void
  canRemove: boolean
}

function BusinessAssignmentCard({
  assignment,
  availableBusinesses,
  permissionTemplates,
  usersForCloning,
  loadingUsersForCloning,
  onUpdate,
  onRemove,
  canRemove
}: BusinessAssignmentCardProps) {
  const [showCustomPermissions, setShowCustomPermissions] = useState(assignment.useCustomPermissions)
  // Default collapsed if already has custom permissions or template, expanded otherwise
  const [isCollapsed, setIsCollapsed] = useState(assignment.useCustomPermissions || !!assignment.selectedTemplate)
  const [cloneFromUserId, setCloneFromUserId] = useState<string>('')
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-4">
        <h4 className="font-medium text-gray-900 dark:text-white">Business Assignment</h4>
        {canRemove && (
          <button 
            onClick={onRemove}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Business
          </label>
          <select
            className="input-field"
            value={assignment.businessId}
            onChange={(e) => {
              const business = availableBusinesses.find(b => b.businessId === e.target.value)
              onUpdate({ 
                businessId: e.target.value,
                businessName: business?.businessName || '',
                businessType: business?.businessType || 'other'
              })
            }}
          >
            {availableBusinesses.map(business => (
              <option key={business.businessId} value={business.businessId}>
                {business.businessName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Business Role
          </label>
          <select
            className="input-field"
            value={assignment.selectedTemplate || assignment.role}
            onChange={(e) => {
              const value = e.target.value
              const isTemplate = value.startsWith('template-')

              if (isTemplate) {
                const templateId = value.replace('template-', '')
                const template = permissionTemplates.find(t => t.id === templateId)
                if (template) {
                  onUpdate({
                    selectedTemplate: templateId,
                    role: 'employee', // Default role when using template
                    useCustomPermissions: true,
                    customPermissions: template.permissions
                  })
                  // Enable and expand custom permissions section when template is selected
                  setShowCustomPermissions(true)
                  setIsCollapsed(false)
                }
              } else {
                onUpdate({
                  selectedTemplate: undefined,
                  role: value as keyof typeof BUSINESS_PERMISSION_PRESETS,
                  useCustomPermissions: false,
                  customPermissions: {}
                })
                // Disable custom permissions when standard role is selected
                setShowCustomPermissions(false)
              }
            }}
          >
            <optgroup label="Standard Roles">
              {Object.keys(BUSINESS_PERMISSION_PRESETS).map(role => (
                <option key={role} value={role}>
                  {role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </optgroup>
            {permissionTemplates.filter(t => t.businessType === (assignment.businessType || 'other')).length > 0 && (
              <optgroup label="Permission Templates">
                {permissionTemplates
                  .filter(t => t.businessType === (assignment.businessType || 'other'))
                  .map(template => (
                    <option key={template.id} value={`template-${template.id}`}>
                      {template.name}
                    </option>
                  ))
                }
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {/* Clone from User Section */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Clone Permissions from Existing User
        </label>
        <div className="flex gap-2 items-start">
          <select
            className="input-field flex-1"
            value={cloneFromUserId}
            onChange={(e) => setCloneFromUserId(e.target.value)}
            disabled={loadingUsersForCloning}
          >
            <option value="">-- Select a user to clone from --</option>
            {usersForCloning
              .filter(user => {
                // Show users who have permissions for the selected business
                return user.businessPermissions.some(bp => bp.businessId === assignment.businessId)
              })
              .map(user => (
                <option key={user.userId} value={user.userId}>
                  {user.userName} ({user.userEmail})
                </option>
              ))
            }
          </select>
          <button
            type="button"
            onClick={() => {
              if (!cloneFromUserId) return
              const sourceUser = usersForCloning.find(u => u.userId === cloneFromUserId)
              if (!sourceUser) return

              // Find permissions for the current business
              const businessPerms = sourceUser.businessPermissions.find(
                bp => bp.businessId === assignment.businessId
              )
              if (businessPerms) {
                onUpdate({
                  role: businessPerms.role as keyof typeof BUSINESS_PERMISSION_PRESETS,
                  useCustomPermissions: true,
                  customPermissions: businessPerms.permissions,
                  selectedTemplate: undefined
                })
                setShowCustomPermissions(true)
                setIsCollapsed(false)
              }
            }}
            disabled={!cloneFromUserId || loadingUsersForCloning}
            className="btn-primary text-sm whitespace-nowrap"
          >
            Clone
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {loadingUsersForCloning
            ? 'Loading users...'
            : usersForCloning.filter(u => u.businessPermissions.some(bp => bp.businessId === assignment.businessId)).length === 0
              ? 'No users with permissions for this business'
              : 'Select a user to copy their permissions for this business'}
        </p>
      </div>

      <div className="mt-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={showCustomPermissions}
            disabled={showCustomPermissions && isCollapsed}
            onChange={(e) => {
              const isEnabling = e.target.checked
              setShowCustomPermissions(isEnabling)
              onUpdate({ useCustomPermissions: isEnabling })
              // If enabling custom permissions for first time, expand the section
              if (isEnabling) {
                setIsCollapsed(false)
              }
            }}
            className={`rounded mr-2 ${showCustomPermissions && isCollapsed ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <span className={`text-sm ${showCustomPermissions && isCollapsed ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
            Customize permissions for this business
            {showCustomPermissions && isCollapsed && (
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(expand below to disable)</span>
            )}
          </span>
        </label>
      </div>

      {showCustomPermissions && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center space-x-2">
              {assignment.selectedTemplate ? (
                <>
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    Template: {permissionTemplates.find(t => t.id === assignment.selectedTemplate)?.name}
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Using permission template. You can make additional customizations.
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Custom permissions will override the default role permissions for this business.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {/* Save as Template Button */}
              {Object.keys(assignment.customPermissions || {}).length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSaveTemplateDialog(true)}
                  className="flex items-center px-3 py-1.5 text-sm font-medium bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 rounded-md border border-green-200 dark:border-green-600 hover:bg-green-200 dark:hover:bg-green-700 transition-colors duration-150"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save as Template
                </button>
              )}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex items-center px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-500 hover:border-gray-300 dark:hover:border-gray-400 transition-colors duration-150"
              >
                {isCollapsed ? (
                  <>
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Expand Permissions
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Collapse Permissions
                  </>
                )}
              </button>
            </div>
          </div>
          {!isCollapsed && (
            <CustomPermissionsEditor 
              permissions={assignment.customPermissions}
              businessType={assignment.businessType as BusinessType || 'other'}
              onChange={(newPermissions) => onUpdate({ 
                customPermissions: newPermissions 
              })}
            />
          )}
          {isCollapsed && (
            <div className="text-sm text-gray-500 dark:text-gray-400 italic">
              Custom permissions are collapsed. Click "Expand" above to view and edit permissions.
            </div>
          )}
        </div>
      )}

      {/* Save as Template Dialog */}
      {showSaveTemplateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Save Permissions as Template
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="input-field"
                  placeholder="e.g., Restaurant Shift Manager"
                  autoFocus
                />
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p>Business Type: <strong className="capitalize">{assignment.businessType || 'other'}</strong></p>
                <p className="mt-1">
                  This template will be available for {assignment.businessType || 'all'} businesses.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowSaveTemplateDialog(false)
                  setTemplateName('')
                }}
                className="btn-secondary"
                disabled={savingTemplate}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!templateName.trim()) return
                  setSavingTemplate(true)
                  try {
                    const response = await fetch('/api/admin/permission-templates', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: templateName.trim(),
                        businessType: assignment.businessType || 'other',
                        permissions: assignment.customPermissions
                      })
                    })
                    const data = await response.json()
                    if (response.ok) {
                      alert('Template saved successfully!')
                      setShowSaveTemplateDialog(false)
                      setTemplateName('')
                    } else {
                      alert(data.error || 'Failed to save template')
                    }
                  } catch (error) {
                    alert('Failed to save template')
                  } finally {
                    setSavingTemplate(false)
                  }
                }}
                className="btn-primary"
                disabled={!templateName.trim() || savingTemplate}
              >
                {savingTemplate ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface CustomPermissionsEditorProps {
  permissions: Partial<BusinessPermissions>
  businessType: BusinessType
  onChange: (permissions: Partial<BusinessPermissions>) => void
}

function CustomPermissionsEditor({ permissions, businessType, onChange }: CustomPermissionsEditorProps) {
  const updatePermission = (key: string, value: boolean) => {
    onChange({
      ...permissions,
      [key]: value
    })
  }

  // Get business-type specific modules
  const businessTypeModules = BUSINESS_TYPE_MODULES[businessType] || []
  
  // Core permissions (always shown)
  const corePermissionGroups = [
    { title: 'Business Management', permissions: CORE_PERMISSIONS.coreBusinessManagement },
    { title: 'Personal Finance', permissions: USER_LEVEL_PERMISSIONS.personalFinance.permissions },
    { title: 'Business Expense Categories', permissions: USER_LEVEL_PERMISSIONS.businessExpenseCategories.permissions },
    { title: 'User Management', permissions: CORE_PERMISSIONS.userManagement },
    { title: 'Employee Management', permissions: CORE_PERMISSIONS.employeeManagement },
    { title: 'Vehicle Management', permissions: USER_LEVEL_PERMISSIONS.vehicleManagement.permissions },
    { title: 'Data Management', permissions: CORE_PERMISSIONS.dataManagement },
    { title: 'System Administration', permissions: USER_LEVEL_PERMISSIONS.systemAdministration.permissions },
  ]

  const allPermissionGroups = [
    ...corePermissionGroups,
    ...businessTypeModules
  ]

  return (
    <div className="space-y-4">
      {allPermissionGroups.map((group) => (
        <div key={group.title} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">{group.title}</h4>
            {businessTypeModules.some(m => m.title === group.title) && (
              <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded-full">
                {businessType.charAt(0).toUpperCase() + businessType.slice(1)} Specific
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {group.permissions.map((permission: { key: string; label: string }) => (
              <label key={permission.key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={!!(permissions as any)[permission.key]
                    || false}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updatePermission(permission.key, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{permission.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full flex-shrink-0 mt-0.5"></div>
          <div>
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
              Business Type: {businessType.charAt(0).toUpperCase() + businessType.slice(1)}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {businessTypeModules.length > 0 
                ? `Showing ${businessTypeModules.length} business-specific permission groups plus core permissions.`
                : 'Showing core permissions only. No specific modules available for this business type.'
              }
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Note:</strong> Custom permissions override role defaults. Ensure permissions are logically consistent and appropriate for this business type.
        </p>
      </div>
    </div>
  )
}