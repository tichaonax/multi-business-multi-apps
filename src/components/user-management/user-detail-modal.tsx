'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface UserDetailModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string | null
}

interface UserDetails {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  lastAccessedAt?: string
  businessMemberships: Array<{
    businessId: string
    role: string
    isActive: boolean
    business: {
      name: string
      type: string
    }
  }>
}

export function UserDetailModal({ isOpen, onClose, userId }: UserDetailModalProps) {
  const { data: session } = useSession()
  const [user, setUser] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails()
    }
  }, [isOpen, userId])

  const fetchUserDetails = async () => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/users/${userId}`)
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else if (response.status === 403) {
        setError('You do not have permission to view user details.')
      } else if (response.status === 404) {
        setError('User not found.')
      } else {
        setError('Failed to load user details.')
      }
    } catch (error) {
      console.error('Error fetching user details:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">User Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading user details...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {user && !loading && !error && (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{user.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <p className="mt-1 text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1 text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString()} at {new Date(user.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                {user.lastAccessedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Access</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(user.lastAccessedAt).toLocaleDateString()} at {new Date(user.lastAccessedAt).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Business Memberships */}
            {user.businessMemberships && user.businessMemberships.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Memberships</h3>
                <div className="space-y-3">
                  {user.businessMemberships.map((membership, index) => (
                    <div key={index} className="bg-white rounded-md p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{membership.business.name}</h4>
                          <p className="text-sm text-gray-600">
                            {membership.business.type} • Role: {membership.role}
                          </p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          membership.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {membership.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No business memberships */}
            {(!user.businessMemberships || user.businessMemberships.length === 0) && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Business Memberships</h3>
                <p className="text-sm text-gray-600">This user is not currently assigned to any businesses.</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}