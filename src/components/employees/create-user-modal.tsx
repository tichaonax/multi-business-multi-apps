'use client'

import { useState } from 'react'
import { SessionUser } from '@/lib/permission-utils'

interface Employee {
  id: string
  fullName: string
  firstName: string
  lastName: string
  employeeNumber: string
  email: string | null
  phone: string
  employmentStatus: string
  isActive: boolean
  currentContract?: {
    id: string
    status: string
    employeeSignedAt: string | null
  } | null
  contracts?: Array<{
    id: string
    status: string
    employeeSignedAt: string | null
  }>
  jobTitle: {
    title: string
    department: string | null
    level: string | null
  }
  primaryBusiness: {
    id: string
    name: string
    type: string
  }
  businessAssignments: Array<{
    business: {
      id: string
      name: string
      type: string
    }
    role: string | null
    isPrimary: boolean
  }>
}

interface CreateUserModalProps {
  employee: Employee
  currentUser: SessionUser
  isOpen: boolean
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (error: string) => void
}

export function CreateUserModal({
  employee,
  currentUser,
  isOpen,
  onClose,
  onSuccess,
  onError
}: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    email: employee.email || '',
    password: '',
    role: 'user',
    sendInvite: true,
    generatePassword: true
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Check if employee is eligible for user account creation
  // CRITICAL: Only allow user account creation for employees with SIGNED active contracts
  // Calculate current contract from contracts array if not provided directly
  const contracts = employee.contracts || []
  const activeContract = contracts.find(c => c.status === 'active')
  const currentContract = employee.currentContract || activeContract

  const isEligibleForUserAccount = employee.employmentStatus === 'active' &&
                                   currentContract?.status === 'active' &&
                                   currentContract?.employeeSignedAt;

  if (!isOpen) return null

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const generateRandomPassword = () => {
    const password = Math.random().toString(36).slice(-12) + 
                    Math.random().toString(36).slice(-8).toUpperCase() +
                    '123!@#'
    setFormData(prev => ({ ...prev, password }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email) {
      onError('Email address is required')
      return
    }

    if (!formData.sendInvite && !formData.password) {
      onError('Password is required when not sending invite')
      return
    }

    setLoading(true)
    
    try {
      const apiUrl = `/api/employees/${employee.id}/create-user`
      const requestBody = {
        email: formData.email,
        password: formData.sendInvite ? null : formData.password,
        role: formData.role,
        sendInvite: formData.sendInvite
      }

      // CRITICAL DEBUG LOGGING
      console.log('🚨 DEBUG: CreateUserModal API Call')
      console.log('Employee ID:', employee.id)
      console.log('Employee Name:', employee.fullName)
      console.log('API URL:', apiUrl)
      console.log('Request Body:', requestBody)

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      if (response.ok) {
        let message = result.message
        if (result.temporaryPassword) {
          message += ` Temporary password: ${result.temporaryPassword}`
        }
        onSuccess(message)
        onClose()
      } else {
        onError(result.error || 'Failed to create user account')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      onError('Failed to create user account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-primary">Create System User Account</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {/* Eligibility Warning */}
        {!isEligibleForUserAccount && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Cannot Create User Account
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>
                    User accounts can only be created for employees who have:
                  </p>
                  <ul className="list-disc list-inside mt-1">
                    <li><strong>SIGNED an active contract</strong> (contract must be signed by employee)</li>
                    <li><strong>Active employment status</strong> (current: <strong>{employee.employmentStatus.replace('_', ' ').toUpperCase()}</strong>)</li>
                    <li><strong>Active contract status</strong> (current: <strong>{currentContract?.status?.toUpperCase() || 'NO CONTRACT'}</strong>)</li>
                  </ul>
                  <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-300">
                    Employee must sign their contract first before user account creation is allowed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Employee Information */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <h3 className="text-lg font-medium text-primary mb-3">Employee Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary">Full Name</label>
              <p className="text-primary font-medium">{employee.fullName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary">Employee Number</label>
              <p className="text-primary font-medium">{employee.employeeNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary">Job Title</label>
              <p className="text-primary">{employee.jobTitle.title}</p>
              {employee.jobTitle.department && (
                <p className="text-xs text-secondary">{employee.jobTitle.department}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary">Primary Business</label>
              <p className="text-primary">{employee.primaryBusiness.name}</p>
              <p className="text-xs text-secondary capitalize">{employee.primaryBusiness.type}</p>
            </div>
            {employee.businessAssignments.length > 0 && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-secondary">Business Assignments</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {employee.businessAssignments.map((assignment, idx) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded"
                    >
                      {assignment.business.name}
                      {assignment.role && ` (${assignment.role})`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create User Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className={`space-y-6 ${!isEligibleForUserAccount ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Email Address */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="user@example.com"
                required
              />
              <p className="text-xs text-secondary mt-1">
                This will be the login email for the user account
              </p>
            </div>

            {/* System Role */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                System Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="input w-full"
              >
                <option value="user">Standard User</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrator</option>
              </select>
              <p className="text-xs text-secondary mt-1">
                Business permissions will be inherited from employee assignments
              </p>
            </div>

            {/* Account Setup Options */}
            <div className="space-y-4">
              <h4 className="font-medium text-primary">Account Setup</h4>
              
              {/* Send Invite Option */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="sendInvite"
                  checked={formData.sendInvite}
                  onChange={handleInputChange}
                  className="mt-1"
                />
                <div className="ml-3">
                  <label className="text-sm font-medium text-primary">
                    Send invitation email
                  </label>
                  <p className="text-xs text-secondary">
                    Generate temporary password and require user to set new password on first login
                  </p>
                </div>
              </div>

              {/* Password Setup */}
              {!formData.sendInvite && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-secondary">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Generate Random Password
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="input w-full pr-10"
                      placeholder="Enter secure password"
                      required={!formData.sendInvite}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Business Permissions Preview */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h5 className="font-medium text-primary mb-2">Business Access Preview</h5>
              <p className="text-sm text-secondary mb-3">
                User will automatically get access to the following businesses:
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary">{employee.primaryBusiness.name}</span>
                  <span className="text-xs bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200 px-2 py-1 rounded">
                    Primary
                  </span>
                </div>
                {employee.businessAssignments.map((assignment, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-primary">{assignment.business.name}</span>
                    <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      {assignment.role || 'Employee'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !isEligibleForUserAccount}
            >
              {loading ? 'Creating Account...' :
               !isEligibleForUserAccount ? 'Cannot Create Account' :
               'Create User Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}