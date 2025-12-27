'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { isSystemAdmin } from '@/lib/permission-utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAlert } from '@/components/ui/confirm-modal'

interface TestResult {
  success: boolean
  message: string
  firmwareVersion?: string
  model?: string
  online?: boolean
  authenticated?: boolean
}

export default function RegisterR710DevicePage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout>
          <RegisterR710DeviceContent />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function RegisterR710DeviceContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const alert = useAlert()
  const user = session?.user as any
  const [formData, setFormData] = useState({
    ipAddress: '',
    adminUsername: 'admin',
    adminPassword: '',
    description: ''
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error for this field
    setErrors(prev => ({ ...prev, [name]: '' }))
    // Clear test result when form changes
    if (testResult) {
      setTestResult(null)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.ipAddress) {
      newErrors.ipAddress = 'IP address is required'
    } else {
      // Basic IP validation
      const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/
      if (!ipPattern.test(formData.ipAddress)) {
        newErrors.ipAddress = 'Invalid IP address format'
      }
    }

    if (!formData.adminUsername) {
      newErrors.adminUsername = 'Admin username is required'
    }

    if (!formData.adminPassword) {
      newErrors.adminPassword = 'Admin password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const testConnection = async () => {
    if (!validateForm()) {
      return
    }

    try {
      setTesting(true)
      setTestResult(null)

      const response = await fetch('/api/admin/r710/devices/test-new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ipAddress: formData.ipAddress,
          adminUsername: formData.adminUsername,
          adminPassword: formData.adminPassword
        })
      })

      const data = await response.json()

      if (response.ok && data.online && data.authenticated) {
        setTestResult({
          success: true,
          message: 'Connection successful! Device is online and authenticated.',
          firmwareVersion: data.firmwareVersion,
          model: data.model,
          online: data.online,
          authenticated: data.authenticated
        })
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Connection test failed',
          online: data.online,
          authenticated: data.authenticated
        })
      }
    } catch (error) {
      console.error('Test connection error:', error)
      setTestResult({
        success: false,
        message: 'Failed to test connection. Please check the IP address and try again.'
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Require successful connection test before registration
    if (!testResult || !testResult.success) {
      await alert({
        title: 'Test Connection Required',
        description: 'Please test the connection successfully before registering the device.'
      })
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch('/api/admin/r710/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        await alert({
          title: 'Success!',
          description: 'R710 device registered successfully!'
        })
        router.push('/r710-portal/devices')
      } else {
        await alert({
          title: 'Registration Failed',
          description: data.message || data.error || 'Unknown error occurred'
        })
      }
    } catch (error) {
      console.error('Registration error:', error)
      await alert({
        title: 'Error',
        description: 'Failed to register device. Please try again.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Check if user is admin
  if (!isSystemAdmin(user)) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
            Admin Access Required
          </h3>
          <p className="text-yellow-800 dark:text-yellow-300">
            Only system administrators can register R710 devices.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <Link href="/r710-portal/devices" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Register R710 Device
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 ml-8">
          Add a new Ruckus R710 wireless access point to the device registry
        </p>
      </div>

      {/* Registration Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* IP Address */}
          <div>
            <label htmlFor="ipAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              IP Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="ipAddress"
              name="ipAddress"
              value={formData.ipAddress}
              onChange={handleChange}
              placeholder="192.168.1.100"
              className={`w-full px-3 py-2 border ${errors.ipAddress ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white`}
            />
            {errors.ipAddress && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.ipAddress}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              The static IP address of the R710 device on your network
            </p>
          </div>

          {/* Admin Username */}
          <div>
            <label htmlFor="adminUsername" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Admin Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="adminUsername"
              name="adminUsername"
              value={formData.adminUsername}
              onChange={handleChange}
              placeholder="admin"
              className={`w-full px-3 py-2 border ${errors.adminUsername ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white`}
            />
            {errors.adminUsername && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.adminUsername}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Default is usually "admin"
            </p>
          </div>

          {/* Admin Password */}
          <div>
            <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Admin Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="adminPassword"
              name="adminPassword"
              value={formData.adminPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className={`w-full px-3 py-2 border ${errors.adminPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white`}
            />
            {errors.adminPassword && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.adminPassword}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Password will be encrypted before storage
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Main building R710 - Floor 2"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Optional description to help identify this device
            </p>
          </div>

          {/* Test Connection Button */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={testConnection}
              disabled={testing}
              className="w-full inline-flex justify-center items-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Testing Connection...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Test Connection
                </>
              )}
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-md ${testResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
              <div className="flex items-start">
                {testResult.success ? (
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <div className="flex-1">
                  <h4 className={`text-sm font-medium ${testResult.success ? 'text-green-900 dark:text-green-200' : 'text-red-900 dark:text-red-200'}`}>
                    {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                  </h4>
                  <p className={`text-sm mt-1 ${testResult.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                    {testResult.message}
                  </p>
                  {testResult.success && testResult.firmwareVersion && (
                    <div className="mt-2 text-xs text-green-700 dark:text-green-400">
                      <p><strong>Model:</strong> {testResult.model || 'R710'}</p>
                      <p><strong>Firmware:</strong> {testResult.firmwareVersion}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Link
              href="/r710-portal/devices"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || !testResult || !testResult.success}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering...
                </>
              ) : (
                'Register Device'
              )}
            </button>
          </div>

          {!testResult && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              ⓘ You must test the connection successfully before registering
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
