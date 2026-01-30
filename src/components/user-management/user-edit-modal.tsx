'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { SessionUser, getActiveBusinessMemberships, isSystemAdmin, hasUserPermission, getUserLevelPermissions } from '@/lib/permission-utils'
import {
  BUSINESS_PERMISSION_PRESETS,
  BusinessPermissions,
  UserLevelPermissions,
  BusinessType,
  CORE_PERMISSIONS,
  USER_LEVEL_PERMISSIONS,
  BUSINESS_TYPE_MODULES,
  DEFAULT_USER_PERMISSIONS
} from '@/types/permissions'

interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  passwordResetRequired: boolean
  permissions?: Partial<UserLevelPermissions>
  employee?: {
    id: string
    fullName: string
    employeeNumber: string
    employmentStatus: string
  }
  businessMemberships?: Array<{
    businessId: string
    role: string
    permissions: any
    templateId?: string
    isActive: boolean
    template?: {
      id: string
      name: string
    }
    business: {
      id: string
      name: string
      type?: string
    }
  }>
}

interface UserEditModalProps {
  user: User
  currentUser: SessionUser
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (error: string) => void
}

interface BusinessMembershipEdit {
  businessId: string
  businessName: string
  businessType?: BusinessType
  role: keyof typeof BUSINESS_PERMISSION_PRESETS
  isActive: boolean
  useCustomPermissions: boolean
  customPermissions: Partial<BusinessPermissions>
  selectedTemplate?: string // Permission template ID
}

interface PermissionTemplate {
  id: string
  name: string
  businessType: BusinessType
  permissions: Partial<BusinessPermissions>
}

export function UserEditModal({ user, currentUser, onClose, onSuccess, onError }: UserEditModalProps) {
  const { update: updateSession } = useSession()
  const [loading, setLoading] = useState(false)
  
  // Basic user info
  const [basicInfo, setBasicInfo] = useState({
    name: user.name,
    email: user.email,
    systemRole: user.role,
    isActive: user.isActive
  })

  // User-level permissions (business-agnostic)
  const [userLevelPermissions, setUserLevelPermissions] = useState<Partial<UserLevelPermissions>>({})

  // Business memberships
  const [businessMemberships, setBusinessMemberships] = useState<BusinessMembershipEdit[]>([])
  const [availableBusinesses, setAvailableBusinesses] = useState<any[]>([])
  const [loadingBusinesses, setLoadingBusinesses] = useState(false)
  const [showBusinessSelector, setShowBusinessSelector] = useState(false)
  const [permissionTemplates, setPermissionTemplates] = useState<PermissionTemplate[]>([])
  const [collapsedPermissions, setCollapsedPermissions] = useState<{[key: number]: boolean}>({})
  const [userLevelPermissionsCollapsed, setUserLevelPermissionsCollapsed] = useState(true)

  const loadAvailableBusinesses = async () => {
    setLoadingBusinesses(true)
    try {
      const response = await fetch('/api/admin/businesses')
      if (response.ok) {
        const businesses = await response.json()
        const mappedBusinesses = businesses.map((b: any) => ({
          businessId: b.id,
          businessName: b.name,
          businessType: b.type
        }))
        setAvailableBusinesses(mappedBusinesses)
      } else {
        onError('Failed to load businesses')
      }
    } catch (error) {
      onError('Error loading businesses')
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

  useEffect(() => {
    // Initialize user-level permissions from user data
    const currentUserPermissions = user.permissions || {}
    setUserLevelPermissions(currentUserPermissions)

    // Initialize business memberships from user data
    const initialMemberships = (user.businessMemberships || []).map((membership, index) => {
      const roleKey = membership.role as keyof typeof BUSINESS_PERMISSION_PRESETS
      const defaultPermissions = BUSINESS_PERMISSION_PRESETS[roleKey] || BUSINESS_PERMISSION_PRESETS.employee
      const currentPermissions = membership.permissions as Partial<BusinessPermissions>

      // Check if current permissions differ from default role permissions
      // or if a template is assigned (which indicates custom permissions)
      const hasCustomPermissions = !!membership.templateId ||
        JSON.stringify(currentPermissions) !== JSON.stringify(defaultPermissions)

      return {
        businessId: membership.businessId,
        businessName: membership.businesses?.name || 'Unknown Business',
        businessType: (membership.businesses?.type as BusinessType) || 'other',
        role: roleKey,
        isActive: membership.isActive,
        useCustomPermissions: hasCustomPermissions,
        customPermissions: currentPermissions,
        selectedTemplate: membership.templateId || undefined
      }
    })
    setBusinessMemberships(initialMemberships)
    
    // Initialize collapsed state - collapsed if user already has custom permissions
    const initialCollapsedState: {[key: number]: boolean} = {}
    initialMemberships.forEach((membership, index) => {
      // Default collapsed if user already has custom permissions or template assigned
      initialCollapsedState[index] = membership.useCustomPermissions || !!membership.selectedTemplate
    })
    setCollapsedPermissions(initialCollapsedState)

    // Load available businesses and permission templates
    loadAvailableBusinesses()
    loadPermissionTemplates()
  }, [user])

  const handleSave = async () => {
    setLoading(true)
    try {
      console.log('🔄 Updating user:', user.id)
      console.log('📤 Request data:', { basicInfo, userLevelPermissions, businessMemberships: businessMemberships.length })
      
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basicInfo,
          userLevelPermissions,
          businessMemberships
        })
      })
      
      console.log('📥 Response status:', response.status, response.statusText)
      console.log('📥 Response content-type:', response.headers.get('content-type'))

      let data
      try {
        data = await response.json()
        console.log('📄 Response data:', data)
      } catch (parseError) {
        console.error('❌ Failed to parse response JSON:', parseError)
        const errorMsg = response.ok ? 'Server returned invalid response format' : 'Server error'
        onError(errorMsg)
        return
      }
      
      if (response.ok) {
        // If the current user updated their own permissions, refresh their session
        if (currentUser.id === user.id) {
          console.log('🔄 Refreshing session for current user after permission update')
          try {
            await updateSession()
            console.log('✅ Session refreshed successfully')
          } catch (sessionError) {
            console.error('❌ Failed to refresh session:', sessionError)
            // Don't fail the whole operation if session refresh fails
            // Continue with the success flow
          }
        }

        // Always call onSuccess if the API call was successful
        try {
          onSuccess(data.message || 'User updated successfully')
          onClose()
        } catch (successError) {
          console.error('❌ Error in success callback:', successError)
          // Even if success callback fails, don't show error to user
          // since the API operation actually succeeded
          onClose()
        }
      } else {
        // Provide more specific error messages based on status code
        let errorMsg = data.error || 'Failed to update user'
        if (response.status === 401) {
          errorMsg = 'You are not authorized to perform this action. Please log in again.'
        } else if (response.status === 403) {
          errorMsg = 'You do not have permission to update this user.'
        } else if (response.status === 404) {
          errorMsg = 'User not found.'
        } else if (response.status === 400) {
          errorMsg = data.error || 'Invalid request data.'
        }
        onError(errorMsg)
      }
    } catch (error) {
      console.error('❌ Unexpected error in handleSave:', error)
      onError(error instanceof Error ? error.message : 'Error updating user')
    } finally {
      setLoading(false)
    }
  }

  const updateBusinessMembership = (index: number, updates: Partial<BusinessMembershipEdit>) => {
    const updated = businessMemberships.map((membership, i) => 
      i === index ? { ...membership, ...updates } : membership
    )
    setBusinessMemberships(updated)
  }

  const addBusinessMembership = async () => {
    // Ensure businesses are loaded
    if (availableBusinesses.length === 0) {
      await loadAvailableBusinesses()
    }
    
    // Check if there are unassigned businesses (only consider active memberships)
    const assignedBusinessIds = businessMemberships.filter(m => m.isActive).map(m => m.businessId)
    console.log('DEBUG - Current assigned business IDs:', assignedBusinessIds)
    console.log('DEBUG - Available businesses:', availableBusinesses.map(b => ({ id: b.businessId, name: b.businessName })))
    const unassignedBusinesses = availableBusinesses.filter(b => !assignedBusinessIds.includes(b.businessId))
    console.log('DEBUG - Unassigned businesses after filtering:', unassignedBusinesses.map(b => ({ id: b.businessId, name: b.businessName })))
    
    if (unassignedBusinesses.length === 0) {
      onError('No businesses available to add - all businesses are already assigned to this user')
      return
    }
    
    // Show business selector
    setShowBusinessSelector(true)
  }

  const selectBusinessForAssignment = (selectedBusiness: any, role: keyof typeof BUSINESS_PERMISSION_PRESETS = 'employee') => {
    const newMembership = {
      businessId: selectedBusiness.businessId,
      businessName: selectedBusiness.businessName,
      businessType: selectedBusiness.businessType || 'other',
      role: role,
      isActive: true,
      useCustomPermissions: false,
      customPermissions: {}
    }
    
    setBusinessMemberships([...businessMemberships, newMembership])
    setShowBusinessSelector(false)
  }

  const removeBusinessMembership = (index: number) => {
    setBusinessMemberships(businessMemberships.filter((_, i) => i !== index))
  }

  const togglePermissionsCollapse = (index: number) => {
    setCollapsedPermissions(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  const canAddMoreBusinesses = businessMemberships.length < availableBusinesses.length

  return (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit User: {user.name}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-400">✕</button>
          </div>

          {/* Top Save/Cancel Buttons */}
          <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-600">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={basicInfo.name}
                  onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={basicInfo.email}
                  onChange={(e) => setBasicInfo({ ...basicInfo, email: e.target.value })}
                  disabled // Email changes require special handling
                />
                <p className="text-xs text-gray-500 mt-1">Email changes require additional verification</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {isSystemAdmin(currentUser) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    System Role
                  </label>
                  <select
                    className="input-field"
                    value={basicInfo.systemRole}
                    onChange={(e) => setBasicInfo({ ...basicInfo, systemRole: e.target.value })}
                  >
                    <option value="user">User</option>
                    <option value="salesperson">Salesperson</option>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">System Admin</option>
                  </select>
                </div>
              )}

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={basicInfo.isActive}
                    onChange={(e) => setBasicInfo({ ...basicInfo, isActive: e.target.checked })}
                    className="rounded mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">User is active</span>
                </label>
              </div>
            </div>
          </div>

          {/* User-Level Permissions (Business-Agnostic) */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">User-Level Permissions</h3>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300 rounded-full">
                  Business-Agnostic
                </span>
                <button
                  onClick={() => setUserLevelPermissionsCollapsed(!userLevelPermissionsCollapsed)}
                  className="flex items-center px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-500 hover:border-gray-300 dark:hover:border-gray-400 transition-colors duration-150"
                >
                  {userLevelPermissionsCollapsed ? (
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

            {!userLevelPermissionsCollapsed && (
              <div className="space-y-6">
                <UserLevelPermissionsEditor
                  permissions={userLevelPermissions}
                  onChange={setUserLevelPermissions}
                  currentUser={currentUser}
                />
              </div>
            )}

            {userLevelPermissionsCollapsed && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                  User-level permissions are collapsed. Click "Expand Permissions" above to view and edit Personal Finance, Vehicle Management, and System Administration permissions.
                </div>
              </div>
            )}
          </div>

          {/* Business Memberships */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Business Access</h3>
              {canAddMoreBusinesses && (
                <button 
                  onClick={addBusinessMembership}
                  className="btn-primary text-sm"
                >
                  + Add Business
                </button>
              )}
            </div>

            {businessMemberships.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-gray-500 dark:text-gray-400">No business assignments</p>
                <button onClick={addBusinessMembership} className="btn-primary mt-2">
                  Add First Business Assignment
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {businessMemberships.map((membership, index) => (
                  <div key={`${membership.businessId}-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{membership.businessName}</h4>
                        {membership.businessType && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full capitalize">
                            {membership.businessType.replace('-', ' ')}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={() => removeBusinessMembership(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Business Role
                        </label>
                        <select
                          className="input-field"
                          value={membership.selectedTemplate ? `template-${membership.selectedTemplate}` : membership.role}
                          onChange={(e) => {
                            const value = e.target.value
                            const isTemplate = value.startsWith('template-')
                            
                            if (isTemplate) {
                              const templateId = value.replace('template-', '')
                              const template = permissionTemplates.find(t => t.id === templateId)
                              if (template) {
                                updateBusinessMembership(index, { 
                                  selectedTemplate: templateId,
                                  role: 'employee', // Default role when using template
                                  useCustomPermissions: true,
                                  customPermissions: template.permissions
                                })
                                // Expand section when template is selected
                                setCollapsedPermissions(prev => ({
                                  ...prev,
                                  [index]: false
                                }))
                              }
                            } else {
                              updateBusinessMembership(index, { 
                                selectedTemplate: undefined,
                                role: value as keyof typeof BUSINESS_PERMISSION_PRESETS,
                                useCustomPermissions: false,
                                customPermissions: {}
                              })
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
                          {permissionTemplates.filter(t => t.businessType === (membership.businessType || 'other')).length > 0 && (
                            <optgroup label="Permission Templates">
                              {permissionTemplates
                                .filter(t => t.businessType === (membership.businessType || 'other'))
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

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Status
                        </label>
                        <select
                          className="input-field"
                          value={membership.isActive ? 'active' : 'inactive'}
                          onChange={(e) => updateBusinessMembership(index, { 
                            isActive: e.target.value === 'active' 
                          })}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>

                      <div className="flex items-end">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={membership.useCustomPermissions}
                            disabled={membership.useCustomPermissions && collapsedPermissions[index]}
                            onChange={(e) => {
                              const isEnabling = e.target.checked
                              updateBusinessMembership(index, { 
                                useCustomPermissions: isEnabling 
                              })
                              // If enabling custom permissions for first time, expand the section
                              if (isEnabling) {
                                setCollapsedPermissions(prev => ({
                                  ...prev,
                                  [index]: false
                                }))
                              }
                            }}
                            className={`rounded mr-2 ${membership.useCustomPermissions && collapsedPermissions[index] ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                          <span className={`text-sm ${membership.useCustomPermissions && collapsedPermissions[index] ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                            Custom permissions
                            {membership.useCustomPermissions && collapsedPermissions[index] && (
                              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(expand below to disable)</span>
                            )}
                          </span>
                        </label>
                      </div>
                    </div>

                    {membership.useCustomPermissions && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center space-x-3">
                            {membership.selectedTemplate ? (
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  Template: {permissionTemplates.find(t => t.id === membership.selectedTemplate)?.name}
                                </span>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Using permission template. You can still make additional customizations.
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Custom permissions will override the default <span className="font-medium capitalize">{membership.role.replace('-', ' ')}</span> role permissions.
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => togglePermissionsCollapse(index)}
                              className="flex items-center px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-500 hover:border-gray-300 dark:hover:border-gray-400 transition-colors duration-150"
                            >
                              {collapsedPermissions[index] ? (
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
                            <button
                              onClick={() => {
                                if (membership.selectedTemplate) {
                                  const template = permissionTemplates.find(t => t.id === membership.selectedTemplate)
                                  if (template) {
                                    updateBusinessMembership(index, { 
                                      customPermissions: { ...template.permissions }
                                    })
                                  }
                                } else {
                                  const presetPermissions = BUSINESS_PERMISSION_PRESETS[membership.role] || BUSINESS_PERMISSION_PRESETS.employee
                                  updateBusinessMembership(index, { 
                                    customPermissions: { ...presetPermissions }
                                  })
                                }
                              }}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            >
                              {membership.selectedTemplate 
                                ? 'Reset to template defaults'
                                : `Reset to ${membership.role.replace('-', ' ')} defaults`
                              }
                            </button>
                          </div>
                        </div>
                        {!collapsedPermissions[index] && (
                          <CustomPermissionsEditor
                            permissions={membership.customPermissions}
                            businessType={membership.businessType as BusinessType || 'other'}
                            currentRole={membership.role}
                            onChange={(newPermissions) => updateBusinessMembership(index, {
                              customPermissions: newPermissions
                            })}
                          />
                        )}
                        {collapsedPermissions[index] && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                            Custom permissions are collapsed. Click "Expand" above to view and edit permissions.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Password Reset */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Security Actions</h3>
            <div className="flex space-x-4">
              <button className="btn-secondary">
                Force Password Reset
              </button>
              <button className="btn-secondary">
                Send Password Reset Email
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end space-x-3">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Business Selector Modal */}
      {showBusinessSelector && (
        <BusinessSelectorModal
          availableBusinesses={availableBusinesses}
          assignedBusinessIds={businessMemberships.filter(m => m.isActive).map(m => m.businessId)}
          onSelect={selectBusinessForAssignment}
          onClose={() => setShowBusinessSelector(false)}
        />
      )}
    </div>
  )
}

interface BusinessSelectorModalProps {
  availableBusinesses: any[]
  assignedBusinessIds: string[]
  onSelect: (business: any, role: keyof typeof BUSINESS_PERMISSION_PRESETS) => void
  onClose: () => void
}

function BusinessSelectorModal({ 
  availableBusinesses, 
  assignedBusinessIds, 
  onSelect, 
  onClose 
}: BusinessSelectorModalProps) {
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [selectedRole, setSelectedRole] = useState<keyof typeof BUSINESS_PERMISSION_PRESETS>('employee')
  
  const unassignedBusinesses = availableBusinesses.filter(b => !assignedBusinessIds.includes(b.businessId))
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedBusiness = unassignedBusinesses.find(b => b.businessId === selectedBusinessId)
    if (selectedBusiness) {
      onSelect(selectedBusiness, selectedRole)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mx-4">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Business Assignment</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-400">✕</button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Business <span className="text-red-500">*</span>
            </label>
            <select
              className="input-field"
              value={selectedBusinessId}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
              required
            >
              <option value="">Choose a business...</option>
              {unassignedBusinesses.map(business => (
                <option key={business.businessId} value={business.businessId}>
                  {business.businessName} ({business.businessType})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              className="input-field"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as keyof typeof BUSINESS_PERMISSION_PRESETS)}
            >
              <option value="salesperson">Salesperson</option>
              <option value="employee">Employee</option>
              <option value="business-manager">Manager</option>
              <option value="business-owner">Business Owner</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface CustomPermissionsEditorProps {
  permissions: Partial<BusinessPermissions>
  businessType: BusinessType
  onChange: (permissions: Partial<BusinessPermissions>) => void
  currentRole: keyof typeof BUSINESS_PERMISSION_PRESETS  // NEW - needed to determine visibility
}

function CustomPermissionsEditor({ permissions, businessType, onChange, currentRole }: CustomPermissionsEditorProps) {
  const updatePermission = (key: string, value: boolean) => {
    onChange({
      ...permissions,
      [key]: value
    })
  }

  // Get business-type specific modules
  const businessTypeModules = BUSINESS_TYPE_MODULES[businessType] || []

  // Business-level permissions (tied to business membership)
  const corePermissionGroups = [
    { title: 'Business Management', permissions: CORE_PERMISSIONS.coreBusinessManagement },
    { title: 'User Management', permissions: CORE_PERMISSIONS.userManagement },
    { title: 'Employee Management', permissions: CORE_PERMISSIONS.employeeManagement },
    { title: 'Data Management', permissions: CORE_PERMISSIONS.dataManagement },
    { title: 'Payroll Management', permissions: CORE_PERMISSIONS.payrollManagement },
    { title: 'WiFi Portal Integration', permissions: CORE_PERMISSIONS.wifiPortalIntegration },
  ]

  // ⚠️ CRITICAL: Only show Manager Payroll Actions for business-owner and business-manager roles
  // Employees should NEVER see these options
  const showManagerPayrollActions = ['business-owner', 'business-manager'].includes(currentRole)

  const allPermissionGroups = [
    ...corePermissionGroups,
    ...(showManagerPayrollActions ? [
      {
        title: 'Manager Payroll Actions',
        permissions: CORE_PERMISSIONS.managerPayrollActions,
        managerOnly: true,
        requiresExplicitGrant: true  // Show badge indicating explicit assignment needed
      }
    ] : []),
    ...businessTypeModules
  ]

  return (
    <div className="space-y-4">
      {allPermissionGroups.map((group) => (
        <div key={group.title} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">{group.title}</h4>
            <div className="flex items-center gap-2">
              {(group as any).managerOnly && (
                <span className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300 rounded-full">
                  Managers Only
                </span>
              )}
              {(group as any).requiresExplicitGrant && (
                <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 rounded-full">
                  Explicit Assignment Required
                </span>
              )}
              {businessTypeModules.includes(group) && (
                <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded-full">
                  {businessType.charAt(0).toUpperCase() + businessType.slice(1)} Specific
                </span>
              )}
            </div>
          </div>

          {/* Show helper text for manager payroll actions */}
          {(group as any).requiresExplicitGrant && (
            <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-200">
              ⚠️ These permissions are NOT granted by default to Managers. They must be explicitly enabled.
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {group.permissions.map((permission) => (
              <label key={permission.key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={!!permissions[permission.key as keyof BusinessPermissions]}
                  onChange={(e) => updatePermission(permission.key, e.target.checked)}
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

interface UserLevelPermissionsEditorProps {
  permissions: Partial<UserLevelPermissions>
  onChange: (permissions: Partial<UserLevelPermissions>) => void
  currentUser: SessionUser
}

function UserLevelPermissionsEditor({ permissions, onChange, currentUser }: UserLevelPermissionsEditorProps) {
  const updatePermission = (key: keyof UserLevelPermissions, value: boolean) => {
    onChange({
      ...permissions,
      [key]: value
    })
  }

  // Only show user-level permissions if current user can manage them
  if (!isSystemAdmin(currentUser)) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Only system administrators can modify user-level permissions.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(USER_LEVEL_PERMISSIONS).map(([groupKey, group]) => (
        <div key={groupKey} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">{group.title}</h4>
            <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300 rounded-full">
              Business-Agnostic
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{group.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {group.permissions.map((permission) => (
              <label key={permission.key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={permissions[permission.key as keyof UserLevelPermissions] || false}
                  onChange={(e) => updatePermission(permission.key as keyof UserLevelPermissions, e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{permission.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
        <div className="flex items-start space-x-2">
          <div className="w-4 h-4 bg-purple-500 rounded-full flex-shrink-0 mt-0.5"></div>
          <div>
            <p className="text-sm text-purple-800 dark:text-purple-200 font-medium">
              User-Level Permissions
            </p>
            <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
              These permissions apply to the user regardless of which business they are currently accessing.
              Personal Finance and Vehicle Management are examples of user-level capabilities that work across all businesses.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}