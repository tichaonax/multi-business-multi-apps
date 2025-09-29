 'use client'

import { useState, useEffect } from 'react'
import { SessionUser } from '@/lib/permission-utils'
import type { Employee } from '@/types/employee'

interface AvailableUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  businessMemberships: Array<{
    business: {
      name: string
      type: string
    }
    role: string
  }>
}

interface ManageUserAccountModalProps {
  employee: Employee
  currentUser: SessionUser
  isOpen: boolean
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (error: string) => void
}

export function ManageUserAccountModal({
  employee,
  currentUser,
  isOpen,
  onClose,
  onSuccess,
  onError
}: ManageUserAccountModalProps) {
  const [mode, setMode] = useState<'view' | 'link' | 'unlink' | 'revoke'>('view')
  const [loading, setLoading] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [revokeReason, setRevokeReason] = useState('')
  const [revokeNotes, setRevokeNotes] = useState('')

  if (!isOpen) return null

  useEffect(() => {
    if (mode === 'link') {
      fetchAvailableUsers()
    }
  }, [mode])

  const fetchAvailableUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users?availableForLinking=true')
      if (response.ok) {
        const users = await response.json()
        setAvailableUsers(users.filter((u: any) => !u.employee))
      }
    } catch (error) {
      console.error('Error fetching available users:', error)
      onError('Failed to load available users')
    } finally {
      setLoading(false)
    }
  }

  const handleLinkUser = async () => {
    if (!selectedUserId) {
      onError('Please select a user to link')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/users/${selectedUserId}/link-employee`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employee.id })
      })

      const result = await response.json()
      if (response.ok) {
        onSuccess(result.message)
        onClose()
      } else {
        onError(result.error)
      }
    } catch (error) {
      onError('Failed to link user to employee')
    } finally {
      setLoading(false)
    }
  }

  const handleUnlinkUser = async () => {
    if (!employee.user) return

    setLoading(true)
    try {
      const response = await fetch(`/api/users/${employee.user.id}/link-employee`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (response.ok) {
        onSuccess(result.message)
        onClose()
      } else {
        onError(result.error)
      }
    } catch (error) {
      onError('Failed to unlink user from employee')
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeAccount = async () => {
    if (!employee.user) return

    if (!revokeReason.trim()) {
      onError('Please provide a reason for revoking the account')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/users/${employee.user.id}/revoke-account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: revokeReason, 
          notes: revokeNotes 
        })
      })

      const result = await response.json()
      if (response.ok) {
        onSuccess(result.message)
        onClose()
      } else {
        onError(result.error)
      }
    } catch (error) {
      onError('Failed to revoke user account')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-primary">Manage User Account</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {/* Employee Info */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-primary">{employee.fullName}</h3>
              <p className="text-sm text-secondary">{employee.employeeNumber}</p>
            </div>
            <div className="text-right">
              {employee.user ? (
                <div>
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200 rounded">
                    Has User Account
                  </span>
                  <p className="text-xs text-secondary mt-1">{employee.user.email}</p>
                </div>
              ) : (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200 rounded">
                  No User Account
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {mode === 'view' && (
            <div className="space-y-4">
              {employee.user ? (
                <div>
                  <h4 className="font-medium text-primary mb-3">Linked User Account</h4>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-primary">{employee.user.name}</p>
                        <p className="text-sm text-secondary">{employee.user.email}</p>
                        <p className="text-xs text-secondary capitalize">Role: {employee.user.role}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                        employee.user.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
                      }`}>
                        {employee.user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => setMode('unlink')}
                      className="btn-secondary"
                    >
                      Unlink Account
                    </button>
                    <button
                      onClick={() => setMode('revoke')}
                      className="btn-danger"
                    >
                      Revoke Account
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="font-medium text-primary mb-3">No User Account</h4>
                  <p className="text-secondary mb-6">
                    This employee does not have a system user account. You can link an existing user or create a new account.
                  </p>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setMode('link')}
                      className="btn-secondary"
                    >
                      Link Existing User
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'link' && (
            <div>
              <h4 className="font-medium text-primary mb-4">Link Existing User</h4>
              
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input w-full"
                />
              </div>

              {/* Available Users List */}
              <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded">
                {loading ? (
                  <div className="p-4 text-center text-secondary">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-secondary">No available users found</div>
                ) : (
                  filteredUsers.map(user => (
                    <div
                      key={user.id}
                      className={`p-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        selectedUserId === user.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          checked={selectedUserId === user.id}
                          onChange={() => setSelectedUserId(user.id)}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-primary">{user.name}</p>
                          <p className="text-sm text-secondary">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 px-2 py-1 rounded">
                              {user.role}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              user.isActive 
                                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
                            }`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setMode('view')}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkUser}
                  disabled={!selectedUserId || loading}
                  className="btn-primary"
                >
                  {loading ? 'Linking...' : 'Link User'}
                </button>
              </div>
            </div>
          )}

          {mode === 'unlink' && (
            <div>
              <h4 className="font-medium text-primary mb-4">Unlink User Account</h4>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Warning:</strong> This will unlink the user account from the employee record. 
                  Both the user account and employee record will remain active, but they will no longer be connected.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setMode('view')}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnlinkUser}
                  disabled={loading}
                  className="btn-danger"
                >
                  {loading ? 'Unlinking...' : 'Unlink User'}
                </button>
              </div>
            </div>
          )}

          {mode === 'revoke' && (
            <div>
              <h4 className="font-medium text-primary mb-4">Revoke User Account</h4>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <strong>Warning:</strong> This will deactivate the user account and remove all system access. 
                  The employee record will be preserved and can be linked to a different user account later.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Reason for Revocation <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">Select a reason...</option>
                    <option value="Employee terminated">Employee terminated</option>
                    <option value="Security concern">Security concern</option>
                    <option value="Role change">Role change</option>
                    <option value="Administrative cleanup">Administrative cleanup</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={revokeNotes}
                    onChange={(e) => setRevokeNotes(e.target.value)}
                    rows={3}
                    className="input w-full"
                    placeholder="Optional additional details..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setMode('view')}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevokeAccount}
                  disabled={loading}
                  className="btn-danger"
                >
                  {loading ? 'Revoking...' : 'Revoke Account'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}