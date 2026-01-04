'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { SystemAdminRoute } from '@/components/auth/system-admin-route'
import { UserCreationWizard } from '@/components/user-management/user-creation-wizard'
import { MultiBusinessUserTable } from '@/components/user-management/multi-business-user-table'
import { UserEditModal } from '@/components/user-management/user-edit-modal'
import { UserDeactivationModal } from '@/components/user-management/user-deactivation-modal'
import { BusinessCreationModal } from '@/components/user-management/business-creation-modal'
import { BusinessPermissionModal } from '@/components/user-management/business-permission-modal'
import { AddEmployeeModal } from '@/components/employees/add-employee-modal'
import { ContentLayout } from '@/components/layout/content-layout'
import { SessionUser } from '@/lib/permission-utils'

interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  passwordResetRequired: boolean
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
    isActive: boolean
    templateId?: string
    template?: {
      id: string
      name: string
    }
    business: {
      id: string
      name: string
      type: string
    }
  }>
}

export default function AdminUsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [showCreateBusiness, setShowCreateBusiness] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null)
  const [managingPermissions, setManagingPermissions] = useState<{ user: User; businessId: string } | null>(null)
  const [creatingEmployeeForUser, setCreatingEmployeeForUser] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        setError('Failed to load users')
      }
    } catch (error) {
      setError('Error loading users')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSuccess = (message: string) => {
    setSuccess(message)
    setShowCreateWizard(false)
    loadUsers()
  }

  const handleCreateError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
  }

  const handleEditSuccess = (message: string) => {
    setSuccess(message)
    setEditingUser(null)
    loadUsers() // Reload users to reflect changes
  }

  const handleEditError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleManagePermissions = (user: User, businessId: string) => {
    setManagingPermissions({ user, businessId })
  }

  const handleDeactivateUser = (user: User) => {
    setDeactivatingUser(user)
  }

  const handleDeactivationSuccess = (message: string) => {
    setSuccess(message)
    setDeactivatingUser(null)
    loadUsers()
  }

  const handleDeactivationError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleCreateEmployee = (userId: string) => {
    setCreatingEmployeeForUser(userId)
  }

  const handleEmployeeCreationSuccess = (result: any) => {
    const message = typeof result === 'string' ? result : result.message || 'Employee created successfully'
    setSuccess(message)
    setCreatingEmployeeForUser(null)
    loadUsers() // Reload to show new employee status
  }

  const handleEmployeeCreationError = (errorMessage: string) => {
    setError(errorMessage)
  }

  return (
    <SystemAdminRoute>
      <ContentLayout
        title="👥 User Management"
        subtitle="Manage system users and their business access"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin', href: '/admin' },
          { label: 'Users', isActive: true }
        ]}
        headerActions={
          <div className="flex space-x-3">
            <button
              onClick={() => setShowCreateBusiness(true)}
              className="btn-secondary"
            >
              + Add Business
            </button>
            <button
              onClick={() => setShowCreateWizard(true)}
              className="btn-primary"
            >
              + Create User
            </button>
          </div>
        }
      >

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex">
              <span className="text-red-400 mr-2">⚠️</span>
              <span className="text-red-700 dark:text-red-400 text-sm">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex">
              <span className="text-green-400 mr-2">✅</span>
              <span className="text-green-700 dark:text-green-400 text-sm">{success}</span>
            </div>
          </div>
        )}

        {/* User Creation Wizard */}
        {showCreateWizard && session?.user && (
          <UserCreationWizard
            currentUser={session.user as SessionUser}
            onClose={() => setShowCreateWizard(false)}
            onSuccess={handleCreateSuccess}
            onError={handleCreateError}
          />
        )}

        {/* Business Creation Modal */}
        {showCreateBusiness && (
          <BusinessCreationModal
            onClose={() => setShowCreateBusiness(false)}
            onSuccess={(result) => {
              // The modal now returns an object { message?, business? }
              if (result?.message) {
                setSuccess(result.message)
                setTimeout(() => setSuccess(''), 5000)
              }
              // We don't auto-switch here (admin users page) but callers
              // could use result.business?.id when needed.
            }}
            onError={(error) => {
              setError(error)
              setTimeout(() => setError(''), 5000)
            }}
          />
        )}

        {/* User Edit Modal */}
        {editingUser && session?.user && (
          <UserEditModal
            user={editingUser}
            currentUser={session.user as SessionUser}
            onClose={() => setEditingUser(null)}
            onSuccess={handleEditSuccess}
            onError={handleEditError}
          />
        )}

        {/* User Deactivation Modal */}
        {deactivatingUser && session?.user && (
          <UserDeactivationModal
            user={deactivatingUser}
            currentUser={session.user as SessionUser}
            onClose={() => setDeactivatingUser(null)}
            onSuccess={handleDeactivationSuccess}
            onError={handleDeactivationError}
          />
        )}

        {/* Business Permission Management Modal */}
        {managingPermissions && session?.user && (() => {
          const businessMembership = managingPermissions.user.businessMemberships?.find((m: any) => m.businessId === managingPermissions.businessId)
          if (!businessMembership) return null
          
          return (
            <BusinessPermissionModal
              user={managingPermissions.user}
              membership={{
                businessId: businessMembership.businessId,
                businessName: businessMembership.business?.name || 'Unknown Business',
                businessType: businessMembership.business?.type || 'unknown',
                role: businessMembership.role,
                permissions: businessMembership.permissions,
                templateId: businessMembership.templateId,
                template: businessMembership.template,
                isActive: businessMembership.isActive
              }}
              currentUser={session.user as SessionUser}
              onClose={() => setManagingPermissions(null)}
              onSuccess={(message) => {
                setSuccess(message)
                setManagingPermissions(null)
                // Removed loadUsers() to prevent race condition - permissions are already updated
              }}
              onError={(error) => {
                setError(error)
              }}
            />
          )
        })()}

        {/* Multi-Business Users Table */}
        {loading ? (
          <div className="card">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading users...</p>
            </div>
          </div>
        ) : session?.user ? (
          <MultiBusinessUserTable
            users={users}
            currentUser={session.user as SessionUser}
            onEditUser={handleEditUser}
            onManagePermissions={handleManagePermissions}
            onDeactivateUser={handleDeactivateUser}
            onCreateEmployee={handleCreateEmployee}
          />
        ) : null}

        {/* Employee Creation Modal */}
        {creatingEmployeeForUser && (
          <AddEmployeeModal
            isOpen={true}
            userId={creatingEmployeeForUser}
            onClose={() => setCreatingEmployeeForUser(null)}
            onSuccess={handleEmployeeCreationSuccess}
            onError={handleEmployeeCreationError}
          />
        )}
      </ContentLayout>
    </SystemAdminRoute>
  )
}