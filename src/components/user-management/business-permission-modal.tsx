'use client'

import { useState, useEffect } from 'react'
import { SessionUser } from '@/lib/permission-utils'
import { BusinessPermissions, BusinessType, CORE_PERMISSIONS, BUSINESS_TYPE_MODULES } from '@/types/permissions'

interface BusinessMembership {
  businessId: string
  businessName: string
  businessType: string
  role: string
  permissions: Partial<BusinessPermissions>
  templateId?: string
  template?: {
    id: string
    name: string
  }
  isActive: boolean
}

interface BusinessPermissionModalProps {
  user: {
    id: string
    name: string
    email: string
  }
  membership: BusinessMembership
  currentUser: SessionUser
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (error: string) => void
}

export function BusinessPermissionModal({ 
  user, 
  membership, 
  currentUser, 
  onClose, 
  onSuccess, 
  onError 
}: BusinessPermissionModalProps) {
  const [loading, setLoading] = useState(false)
  const [permissions, setPermissions] = useState<Partial<BusinessPermissions>>(membership.permissions)
  const [hasChanges, setHasChanges] = useState(false)

  const updatePermission = (key: string, value: boolean) => {
    const newPermissions = {
      ...permissions,
      [key]: value
    }
    setPermissions(newPermissions)
    setHasChanges(true)
  }

  const resetToTemplate = async () => {
    if (membership.templateId) {
      try {
        const response = await fetch(`/api/admin/permission-templates/${membership.templateId}`)
        if (response.ok) {
          const template = await response.json()
          setPermissions(template.template.permissions)
          setHasChanges(true)
        }
      } catch (error) {
        onError('Failed to load template permissions')
      }
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}/business-permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: membership.businessId,
          permissions
        })
      })

      const data = await response.json()
      if (response.ok) {
        onSuccess(data.message || 'Business permissions updated successfully')
        onClose()
      } else {
        onError(data.error || 'Failed to update business permissions')
      }
    } catch (error) {
      onError('Error updating business permissions')
    } finally {
      setLoading(false)
    }
  }

  const businessType = membership.businessType as BusinessType || 'other'
  const businessTypeModules = BUSINESS_TYPE_MODULES[businessType] || []
  
  // Convert business type modules to object format for consistency
  const businessTypePermissions: Record<string, any> = {}
  businessTypeModules.forEach((module, index) => {
    businessTypePermissions[`businessType${index}`] = module.permissions
  })
  
  const availablePermissions = {
    ...CORE_PERMISSIONS,
    ...businessTypePermissions
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Manage Business Permissions
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {user.name} • {membership.businessName}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-400">
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Current Role/Template Info */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Current Assignment</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Role:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {membership.template?.name || membership.role}
              </span>
              {membership.template && (
                <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                  Template
                </span>
              )}
            </div>
            {membership.template && (
              <div className="mt-2">
                <button
                  onClick={resetToTemplate}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  Reset to template defaults
                </button>
              </div>
            )}
          </div>

          {/* Permission Categories */}
          <div className="space-y-6">
            {/* Core Permissions */}
            {Object.entries(CORE_PERMISSIONS).map(([category, categoryPermissions]) => (
              <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 capitalize">
                  {category.replace(/([A-Z])/g, ' $1').trim()} Permissions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryPermissions.map((permission) => (
                    <label key={permission.key} className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={permissions[permission.key as keyof BusinessPermissions] || false}
                        onChange={(e) => updatePermission(permission.key, e.target.checked)}
                        className="mt-0.5 rounded border-gray-300 dark:border-gray-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {permission.label}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {permission.key}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* Business-Type Specific Permissions */}
            {businessTypeModules.map((module, index) => (
              <div key={`${businessType}-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                  {module.title}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {module.permissions.map((permission) => (
                    <label key={permission.key} className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={permissions[permission.key as keyof BusinessPermissions] || false}
                        onChange={(e) => updatePermission(permission.key, e.target.checked)}
                        className="mt-0.5 rounded border-gray-300 dark:border-gray-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {permission.label}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {permission.key}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end space-x-3">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={loading || !hasChanges}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}