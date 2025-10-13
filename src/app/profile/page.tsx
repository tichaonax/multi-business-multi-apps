'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { SessionUser } from '@/lib/permission-utils'
import { EmployeeContractViewer } from '@/components/contracts/employee-contract-viewer'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  businessMemberships: Array<{
    businessId: string
    role: string
    isActive: boolean
    business: {
      id: string
      name: string
      type: string
    }
    template?: {
      id: string
      name: string
    }
  }>
}

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  })
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    if (!session?.users?.id) return

    try {
      const response = await fetch(`/api/user/profile`)
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setFormData({
          name: data.name,
          email: data.email
        })
      } else {
        setError('Failed to load profile')
      }
    } catch (error) {
      setError('Error loading profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/user/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (response.ok) {
        setSuccess('Profile updated successfully')
        setProfile({ ...profile!, ...formData })
        setEditing(false)
        // Update the session with new name
        await update({ name: formData.name })
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError(data.error || 'Failed to update profile')
      }
    } catch (error) {
      setError('Error updating profile')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !profile) {
    return (
      <ContentLayout title="Profile Settings">
        <div className="card">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading profile...</p>
          </div>
        </div>
      </ContentLayout>
    )
  }

  if (!profile) {
    return (
      <ContentLayout title="Profile Settings">
        <div className="card">
          <div className="text-center py-8">
            <p className="text-gray-600">Profile not found</p>
          </div>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout 
      title="Profile Settings"
      subtitle="Manage your account information and preferences"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Profile Settings', isActive: true }
      ]}
    >
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex">
            <span className="text-red-400 mr-2">⚠️</span>
            <span className="text-red-700 dark:text-red-400 text-sm">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
          <div className="flex">
            <span className="text-green-400 mr-2">✅</span>
            <span className="text-green-700 dark:text-green-400 text-sm">{success}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Basic Information
              </h3>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="btn-secondary"
                >
                  Edit Profile
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{profile.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <p className="text-gray-900 dark:text-white">{profile.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Email changes require administrative approval
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  System Role
                </label>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Status
                </label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  profile.isActive 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {profile.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {editing && (
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setEditing(false)
                    setFormData({
                      name: profile.name,
                      email: profile.email
                    })
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="btn-primary disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Business Memberships */}
        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              Business Access
            </h3>
            
            {profile.businessMemberships.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                You don't have access to any businesses yet.
              </p>
            ) : (
              <div className="space-y-4">
                {profile.businessMemberships.map((membership) => (
                  <div
                    key={membership.businessId}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      membership.isActive 
                        ? 'bg-white dark:bg-gray-700 border-green-200 dark:border-green-600' 
                        : 'bg-gray-100 dark:bg-gray-600 border-gray-200 dark:border-gray-500'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {membership.businesses.name}
                        </h4>
                        <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {membership.businesses.type}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          membership.isActive 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {membership.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Role: <span className="font-medium">
                          {membership.template?.name || membership.role}
                        </span>
                        {membership.template && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                            Template
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Employee Contracts */}
        <EmployeeContractViewer />

        {/* Account Information */}
        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              Account Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Created
                </label>
                <p className="text-gray-900 dark:text-white">
                  {new Date(profile.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Memberships
                </label>
                <p className="text-gray-900 dark:text-white">
                  {profile.businessMemberships.filter(m => m.isActive).length} active, {' '}
                  {profile.businessMemberships.length} total
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ContentLayout>
  )
}