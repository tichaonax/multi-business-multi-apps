'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SessionUser, isSystemAdmin } from '@/lib/permission-utils'

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
    joinedAt?: string | Date
    lastAccessedAt?: string | Date
  }>
}

interface MultiBusinessUserTableProps {
  users: User[]
  currentUser: SessionUser
  onEditUser?: (user: User) => void
  onManagePermissions?: (user: User, businessId: string) => void
  onDeactivateUser?: (user: User) => void
}

export function MultiBusinessUserTable({ 
  users, 
  currentUser, 
  onEditUser, 
  onManagePermissions,
  onDeactivateUser
}: MultiBusinessUserTableProps) {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'current' | 'all'>('current')

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers)
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
    } else {
      newExpanded.add(userId)
    }
    setExpandedUsers(newExpanded)
  }

  // Filter users based on view mode
  const filteredUsers = viewMode === 'current' 
    ? users.filter(user => user.businessMemberships?.some(m => m.isActive) || false)
    : users

  const currentUserBusinessIds = currentUser.businessMemberships?.map(m => m.businessId) || []

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('current')}
            className={`px-3 py-1 text-sm rounded-md ${
              viewMode === 'current' 
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Current Business Users
          </button>
          {isSystemAdmin(currentUser) && (
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 text-sm rounded-md ${
                viewMode === 'all' 
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All System Users
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <span>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
          </span>
          <span>•</span>
          <span>
            {filteredUsers.filter(u => u.employee).length} employee{filteredUsers.filter(u => u.employee).length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">User</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">System Role</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Business Access</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    currentUser={currentUser}
                    expanded={expandedUsers.has(user.id)}
                    onToggleExpand={() => toggleUserExpansion(user.id)}
                    onEdit={onEditUser}
                    onManagePermissions={onManagePermissions}
                    onDeactivateUser={onDeactivateUser}
                    currentUserBusinessIds={currentUserBusinessIds}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

interface UserRowProps {
  user: User
  currentUser: SessionUser
  expanded: boolean
  onToggleExpand: () => void
  onEdit?: (user: User) => void
  onManagePermissions?: (user: User, businessId: string) => void
  onDeactivateUser?: (user: User) => void
  currentUserBusinessIds: string[]
}

function UserRow({
  user,
  currentUser,
  expanded,
  onToggleExpand,
  onEdit,
  onManagePermissions,
  onDeactivateUser,
  currentUserBusinessIds
}: UserRowProps) {
  const activeMemberships = user.businessMemberships?.filter(m => m.isActive) || []
  const userBusinessIds = activeMemberships.map(m => m.businessId)

  // Determine primary business (first one created/joined or most recently accessed)
  const primaryMembership = activeMemberships.length > 0
    ? activeMemberships.reduce((primary, current) => {
        // If current has more recent lastAccess, it's primary
        if (current.lastAccessedAt && primary.lastAccessedAt) {
          return new Date(current.lastAccessedAt) > new Date(primary.lastAccessedAt) ? current : primary
        }
        // If only one has lastAccess, that one is primary
        if (current.lastAccessedAt && !primary.lastAccessedAt) return current
        if (!current.lastAccessedAt && primary.lastAccessedAt) return primary
        // If neither has lastAccess, use first joined (or first in array)
        if (current.joinedAt && primary.joinedAt) {
          return new Date(current.joinedAt) < new Date(primary.joinedAt) ? current : primary
        }
        return primary
      })
    : null
  
  // Debug logging
  // if (user.name === 'hxi') {
  //   console.log('Debug user hxi:', {
  //     totalMemberships: user.businessMemberships.length,
  //     activeMemberships: activeMemberships.length,
  //     memberships: user.businessMemberships,
  //     activeMembershipsData: activeMemberships
  //   })
  // }
  
  // Check if current user can manage this user in any shared business
  const canManageInAnyBusiness = currentUserBusinessIds.some(businessId => 
    userBusinessIds.includes(businessId)
  ) || isSystemAdmin(currentUser)

  return (
    <>
      <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
        <td className="py-3 px-4">
          <div className="flex items-center space-x-3">
            <button 
              onClick={onToggleExpand}
              className={`transform transition-transform ${expanded ? 'rotate-90' : ''}`}
            >
              {activeMemberships.length > 1 ? '▶' : ''}
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                {user.employee && (
                  <Link href={`/employees/${user.employee.id}`}>
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded border border-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700 cursor-pointer transition-colors">
                      <span className="mr-1">👷</span>
                      Employee
                    </span>
                  </Link>
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{user.email}</div>
              {user.employee && (
                <Link href={`/employees/${user.employee.id}`}>
                  <div className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer transition-colors">
                    Employee: {user.employee.employeeNumber} - {user.employee.fullName}
                  </div>
                </Link>
              )}
              {user.passwordResetRequired && (
                <span className="text-xs text-orange-600">Password reset required</span>
              )}
            </div>
          </div>
        </td>
        
        <td className="py-3 px-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
            {user.role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
        </td>
        
        <td className="py-3 px-4">
          <div className="flex flex-col gap-1">
            {activeMemberships.length === 0 ? (
              <span className="text-sm text-gray-500 dark:text-gray-400">0 businesses</span>
            ) : (
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {activeMemberships.length} business{activeMemberships.length === 1 ? '' : 'es'}
                </div>
                <div className="flex flex-wrap gap-1">
                  {activeMemberships.slice(0, 2).map((membership) => (
                    <span
                      key={membership.businessId}
                      className={`inline-flex items-center px-2 py-1 rounded text-xs gap-1 ${
                        membership.businessId === primaryMembership?.businessId
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      }`}
                    >
                      {membership.businessId === primaryMembership?.businessId && (
                        <span className="text-xs">⭐</span>
                      )}
                      {membership.businesses?.name || 'Unknown Business'}
                    </span>
                  ))}
                  {activeMemberships.length > 2 && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      +{activeMemberships.length - 2} more
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </td>
        
        <td className="py-3 px-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {user.isActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        
        <td className="py-3 px-4">
          <div className="flex space-x-2">
            {canManageInAnyBusiness && onEdit && (
              <button 
                onClick={() => onEdit(user)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
              >
                Edit
              </button>
            )}
            {canManageInAnyBusiness && onDeactivateUser && (
              <button 
                onClick={() => onDeactivateUser(user)}
                className={`text-sm ${
                  user.isActive 
                    ? 'text-red-600 hover:text-red-800' 
                    : 'text-green-600 hover:text-green-800'
                }`}
              >
                {user.isActive ? 'Deactivate' : 'Reactivate'}
              </button>
            )}
            {activeMemberships.length > 0 && (
              <button 
                onClick={onToggleExpand}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 text-sm"
              >
                {expanded ? 'Collapse' : 'Details'}
              </button>
            )}
          </div>
        </td>
      </tr>
      
      {/* Expanded Row - Business Details */}
      {expanded && (
        <tr>
          <td colSpan={5} className="py-0">
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-l-4 border-blue-200 dark:border-blue-600">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Business Memberships</h4>
              <div className="space-y-2">
                {user.businessMemberships.map((membership) => (
                  <div
                    key={membership.businessId}
                    className={`flex items-center justify-between p-3 rounded border ${
                      membership.isActive ? 'bg-white dark:bg-gray-700 border-green-200 dark:border-green-600' : 'bg-gray-100 dark:bg-gray-600 border-gray-200 dark:border-gray-500'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center gap-1">
                          {membership.businessId === primaryMembership?.businessId && (
                            <span className="text-sm">⭐</span>
                          )}
                          <span className="font-medium text-gray-900 dark:text-white">{membership.businesses?.name || 'Unknown Business'}</span>
                          {membership.businessId === primaryMembership?.businessId && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                              Primary
                            </span>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${
                          membership.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {membership.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Role: <span className="font-medium text-gray-900 dark:text-white">{membership.template?.name || membership.role}</span>
                        {membership.template && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                            Template
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {canManageInAnyBusiness && onManagePermissions && membership.isActive && (
                      <button
                        onClick={() => onManagePermissions(user, membership.businessId)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                      >
                        Manage Permissions
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}