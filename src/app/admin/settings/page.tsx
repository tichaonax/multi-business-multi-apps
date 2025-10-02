'use client'

import { useState, useEffect } from 'react'
import { SystemAdminRoute } from '@/components/auth/system-admin-route'
import { BUSINESS_PERMISSION_PRESETS } from '@/types/permissions'
import { ContentLayout } from '@/components/layout/content-layout'
import { COUNTRY_CODES } from '@/lib/country-codes'

interface SystemSettings {
  allowSelfRegistration: boolean
  defaultRegistrationRole: string
  defaultRegistrationPermissions: any
  requireAdminApproval: boolean
  maxUsersPerBusiness: number
  globalDateFormat: string
  defaultCountryCode: string
  defaultIdFormatTemplateId: string
  defaultMileageUnit: string
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [idFormatTemplates, setIdFormatTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadSettings()
    loadIdFormatTemplates()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      } else {
        setError('Failed to load settings')
      }
    } catch (error) {
      setError('Error loading settings')
    } finally {
      setLoading(false)
    }
  }

  const loadIdFormatTemplates = async () => {
    try {
      const response = await fetch('/api/id-format-templates?isActive=true')
      if (response.ok) {
        const templates = await response.json()
        setIdFormatTemplates(templates)
      } else {
        console.error('Failed to load ID format templates')
      }
    } catch (error) {
      console.error('Error loading ID format templates:', error)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
      } else {
        setError(data.error || 'Failed to save settings')
      }
    } catch (error) {
      setError('Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = (updates: Partial<SystemSettings>) => {
    if (settings) {
      setSettings({ ...settings, ...updates })
    }
  }

  if (loading) {
    return (
      <SystemAdminRoute>
        <ContentLayout title="⚙️ System Settings">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-secondary mt-2">Loading settings...</p>
          </div>
        </ContentLayout>
      </SystemAdminRoute>
    )
  }

  return (
    <SystemAdminRoute>
      <ContentLayout
        title="⚙️ System Settings"
        subtitle="Configure business registration and user defaults"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin', href: '/admin' },
          { label: 'Settings', isActive: true }
        ]}
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

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Registration Settings */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4 text-primary">Registration Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="allowSelfRegistration"
                  checked={settings?.allowSelfRegistration || false}
                  onChange={(e) => updateSettings({ allowSelfRegistration: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="allowSelfRegistration" className="text-sm font-medium text-primary">
                  Allow Self Registration
                </label>
              </div>
              <p className="text-sm text-secondary ml-6">
                When enabled, users can register themselves with default permissions. 
                When disabled, only admins can create user accounts.
              </p>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="requireAdminApproval"
                  checked={settings?.requireAdminApproval || false}
                  onChange={(e) => updateSettings({ requireAdminApproval: e.target.checked })}
                  className="rounded"
                  disabled={!settings?.allowSelfRegistration}
                />
                <label htmlFor="requireAdminApproval" className="text-sm font-medium text-primary">
                  Require Admin Approval
                </label>
              </div>
              <p className="text-sm text-secondary ml-6">
                When enabled, self-registered users require admin approval before accessing the system.
              </p>
            </div>
          </div>

          {/* Default User Settings */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4 text-primary">Default User Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Default Registration Role
                </label>
                <select
                  className="input-field max-w-xs"
                  value={settings?.defaultRegistrationRole || 'employee'}
                  onChange={(e) => updateSettings({ 
                    defaultRegistrationRole: e.target.value,
                    defaultRegistrationPermissions: BUSINESS_PERMISSION_PRESETS[e.target.value as keyof typeof BUSINESS_PERMISSION_PRESETS]
                  })}
                >
                  {Object.keys(BUSINESS_PERMISSION_PRESETS)
                    .filter(role => role !== 'business-owner' && role !== 'system-admin')
                    .map(role => (
                    <option key={role} value={role}>
                      {role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-600 mt-1">
                  Role assigned to self-registered users. Business owners and system admins cannot be default roles.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Maximum Users Per Business
                </label>
                <input
                  type="number"
                  className="input-field max-w-xs"
                  value={settings?.maxUsersPerBusiness || 50}
                  onChange={(e) => updateSettings({ maxUsersPerBusiness: parseInt(e.target.value) })}
                  min="1"
                  max="1000"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Maximum number of users allowed in a single business.
                </p>
              </div>
            </div>
          </div>

          {/* Date Format Settings */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4 text-primary">Date Format Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Global Date Format
                </label>
                <select
                  className="input-field max-w-xs"
                  value={settings?.globalDateFormat || 'dd/mm/yyyy'}
                  onChange={(e) => updateSettings({ globalDateFormat: e.target.value })}
                >
                  <option value="dd/mm/yyyy">DD/MM/YYYY (Zimbabwe, UK)</option>
                  <option value="mm/dd/yyyy">MM/DD/YYYY (US, Canada)</option>
                  <option value="yyyy/mm/dd">YYYY/MM/DD (China, Japan)</option>
                  <option value="yyyy-mm-dd">YYYY-MM-DD (ISO Standard)</option>
                  <option value="dd.mm.yyyy">DD.MM.YYYY (Germany)</option>
                  <option value="dd-mm-yyyy">DD-MM-YYYY (Netherlands)</option>
                </select>
                <p className="text-sm text-gray-600 mt-1">
                  This format will be used for all date inputs throughout the application. 
                  Example: {settings?.globalDateFormat === 'dd/mm/yyyy' ? '12/11/1964' : 
                           settings?.globalDateFormat === 'mm/dd/yyyy' ? '11/12/1964' :
                           settings?.globalDateFormat === 'yyyy/mm/dd' ? '1964/11/12' :
                           settings?.globalDateFormat === 'yyyy-mm-dd' ? '1964-11-12' :
                           settings?.globalDateFormat === 'dd.mm.yyyy' ? '12.11.1964' :
                           settings?.globalDateFormat === 'dd-mm-yyyy' ? '12-11-1964' : '12/11/1964'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Default Country for New Users
                </label>
                <select
                  className="input-field max-w-xs"
                  value={settings?.defaultCountryCode || 'ZW'}
                  onChange={(e) => updateSettings({ defaultCountryCode: e.target.value })}
                >
                  {COUNTRY_CODES.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.name} ({country.dateFormat})
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-600 mt-1">
                  Default country selection for phone numbers and regional settings for new users.
                </p>
              </div>
            </div>
          </div>

          {/* ID Format Settings */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4 text-primary">ID Format Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Default ID Format Template
                </label>
                <select
                  className="input-field max-w-xs"
                  value={settings?.defaultIdFormatTemplateId || ''}
                  onChange={(e) => updateSettings({ defaultIdFormatTemplateId: e.target.value })}
                >
                  <option value="">Select a default ID format...</option>
                  {idFormatTemplates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.countryCode}) - {template.example}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-600 mt-1">
                  Default ID format template used when creating new contractors and employees.
                  Users can override this selection when entering ID numbers.
                </p>
                {settings?.defaultIdFormatTemplateId && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      <strong>Selected:</strong> {idFormatTemplates.find(t => t.id === settings.defaultIdFormatTemplateId)?.name || 'Loading...'}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      <strong>Pattern:</strong> {idFormatTemplates.find(t => t.id === settings.defaultIdFormatTemplateId)?.example || 'Loading...'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Vehicle Settings */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4 text-primary">Vehicle Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Default Mileage Unit
                </label>
                <select
                  className="input-field max-w-xs"
                  value={settings?.defaultMileageUnit || 'km'}
                  onChange={(e) => updateSettings({ defaultMileageUnit: e.target.value })}
                >
                  <option value="km">Kilometers (km)</option>
                  <option value="miles">Miles</option>
                </select>
                <p className="text-sm text-gray-600 mt-1">
                  Default unit for vehicle mileage. Can be overridden for individual vehicles during creation.
                  Once a vehicle has mileage entries, the unit becomes readonly (admin-only changes).
                </p>
                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    <strong>Note:</strong> Different vehicles can use different units. No automatic conversion
                    is performed when changing units - existing values are assumed to be correct.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Permission Preview */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4 text-primary">Default Permission Preview</h2>
            <p className="text-sm text-secondary mb-4">
              These are the permissions that will be assigned to new users with the "{settings?.defaultRegistrationRole?.replace('-', ' ')}" role:
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {settings?.defaultRegistrationPermissions && Object.entries(settings.defaultRegistrationPermissions).map(([permission, enabled]) => (
                  <div key={permission} className={`flex items-center space-x-2 ${enabled ? 'text-green-700' : 'text-gray-500'}`}>
                    <span>{enabled ? '✅' : '❌'}</span>
                    <span>{permission}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={loadSettings}
              className="btn-secondary"
            >
              Reset Changes
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </ContentLayout>
    </SystemAdminRoute>
  )
}