 'use client'

import { useState } from 'react'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { DriverLicenseInput } from '@/components/ui/driver-license-input'
import { UserEmployeeSearch } from '@/components/ui/user-employee-search'
import { useDateFormat } from '@/contexts/settings-context'
import { COUNTRY_CODES, formatDateByFormat } from '@/lib/country-codes'
import { useToastContext } from '@/components/ui/toast'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { parseDateFromFormat } from '@/lib/country-codes'
import { CreateDriverData } from '@/types/vehicle'

interface DriverFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

interface SearchResult {
  id: string
  type: 'user' | 'employee'
  name: string
  email?: string
  phone?: string
  employeeNumber?: string
  hasUserAccount: boolean
  driverLicenseNumber?: string
  driverLicenseTemplateId?: string
  dateOfBirth?: string
  address?: string
  userId?: string
}

export function DriverForm({ onSuccess, onCancel }: DriverFormProps) {
  const { defaultCountry, format: globalDateFormat } = useDateFormat()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedPerson, setSelectedPerson] = useState<SearchResult | null>(null)
  const [upgradeToUser, setUpgradeToUser] = useState(false)

  const toast = useToastContext()

  const [formData, setFormData] = useState<CreateDriverData>({
    fullName: '',
    licenseNumber: '',
    licenseCountryOfIssuance: '',
    licenseExpiry: '',
    driverLicenseTemplateId: '',
    phoneNumber: '',
    emailAddress: '',
    emergencyContact: '',
    emergencyPhone: '',
    userId: '',
    dateOfBirth: '',
    address: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePersonSelect = (person: SearchResult) => {
    setSelectedPerson(person)

    // Pre-populate form fields
    const updates: Partial<CreateDriverData> = {
      fullName: person.name,
      emailAddress: person.email || '',
      phoneNumber: person.phone || '',
      address: person.address || '',
      userId: person.userId || ''
    }

    // If employee has driver license data, pre-populate
    if (person.driverLicenseNumber) {
      updates.licenseNumber = person.driverLicenseNumber
    }
    if (person.driverLicenseTemplateId) {
      updates.driverLicenseTemplateId = person.driverLicenseTemplateId
    }

    // Format date of birth for display
    if (person.dateOfBirth) {
      try {
        const formatted = formatDateByFormat(person.dateOfBirth, globalDateFormat)
        updates.dateOfBirth = formatted
      } catch (e) {
        console.warn('Failed to format date of birth', e)
      }
    }

    setFormData(prev => ({
      ...prev,
      ...updates
    }))

    // Reset upgrade checkbox when selecting a new person
    setUpgradeToUser(false)
  }

  const handlePersonClear = () => {
    setSelectedPerson(null)
    setUpgradeToUser(false)
    setFormData({
      fullName: '',
      licenseNumber: '',
      licenseCountryOfIssuance: '',
      licenseExpiry: '',
      driverLicenseTemplateId: '',
      phoneNumber: '',
      emailAddress: '',
      emergencyContact: '',
      emergencyPhone: '',
      userId: '',
      dateOfBirth: '',
      address: ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      // Parse date strings from global format back to ISO (YYYY-MM-DD)
      const licenseExpiryISO = parseDateFromFormat(formData.licenseExpiry || '', defaultCountry) || ''
      const dobISO = parseDateFromFormat(formData.dateOfBirth || '', defaultCountry) || ''

      const payload: any = {
        ...formData,
        licenseExpiry: licenseExpiryISO,
        dateOfBirth: dobISO
      }

      // Add upgrade flag and employee ID if applicable
      if (selectedPerson?.type === 'employee' && !selectedPerson.hasUserAccount && upgradeToUser) {
        payload.upgradeEmployeeToUser = true
        payload.employeeId = selectedPerson.id
      }

      const result = await fetchWithValidation('/api/vehicles/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (onSuccess) onSuccess()
      toast.push('Driver registered successfully')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      try { toast.push(message) } catch (e) { }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="card p-6 max-w-full overflow-x-hidden">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-primary">Register New Driver</h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-secondary hover:text-primary transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Search for existing user/employee */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md">
          <h3 className="text-sm font-medium text-primary mb-3">
            Select Existing User or Employee (Optional)
          </h3>
          <UserEmployeeSearch
            onSelect={handlePersonSelect}
            onClear={handlePersonClear}
            selectedResult={selectedPerson}
            placeholder="Search by name, email, or employee number..."
          />

          {/* Upgrade to User checkbox */}
          {selectedPerson?.type === 'employee' && !selectedPerson.hasUserAccount && (
            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={upgradeToUser}
                  onChange={(e) => setUpgradeToUser(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-primary">
                    Create User Account for this Employee
                  </div>
                  <div className="text-xs text-secondary mt-1">
                    Enable this employee to log trips and access the vehicle management system.
                    A temporary password will be generated and they will be required to reset it on first login.
                  </div>
                </div>
              </label>
            </div>
          )}

          {selectedPerson && (
            <div className="mt-3 text-xs text-gray-500">
              Pre-populated fields can still be edited before submitting the form
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Full Name *
            </label>
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder="John Smith"
            />
          </div>

          {/* License Number */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Driver's License Number *
            </label>
            <DriverLicenseInput
              value={formData.licenseNumber}
              templateId={formData.driverLicenseTemplateId}
              onChange={(val) => setFormData(prev => ({ ...prev, licenseNumber: val }))}
              onTemplateChange={(templateId) => setFormData(prev => ({ ...prev, driverLicenseTemplateId: templateId }))}
              required
              className="w-full"
            />
          </div>

          {/* Country of Issuance */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Country of Issuance *
            </label>
            <select
              name="licenseCountryOfIssuance"
              required
              value={formData.licenseCountryOfIssuance}
              onChange={(e) => setFormData(prev => ({ ...prev, licenseCountryOfIssuance: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
            >
              <option value="">Select country...</option>
              {COUNTRY_CODES.map(country => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.name}
                </option>
              ))}
            </select>
          </div>

          {/* License Expiry */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              License Expiry Date
            </label>
            <input
              name="licenseExpiry"
              value={formData.licenseExpiry}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder={globalDateFormat}
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Date of Birth
            </label>
            <input
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder={globalDateFormat}
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Phone Number
            </label>
            <PhoneNumberInput
              value={formData.phoneNumber || ''}
              onChange={(full) => setFormData(prev => ({ ...prev, phoneNumber: full }))}
              placeholder="77 123 4567"
              className="w-full"
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="emailAddress"
              value={formData.emailAddress}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder="john@example.com"
            />
          </div>

          {/* Emergency Contact */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Emergency Contact Name
            </label>
            <input
              type="text"
              name="emergencyContact"
              value={formData.emergencyContact}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder="Jane Smith"
            />
          </div>

          {/* Emergency Phone */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Emergency Phone Number
            </label>
            <PhoneNumberInput
              value={formData.emergencyPhone || ''}
              onChange={(full) => setFormData(prev => ({ ...prev, emergencyPhone: full }))}
              placeholder="77 123 4567"
              className="w-full"
            />
          </div>

          {/* User ID - Optional for linking to existing users */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Link to User Account (Optional)
            </label>
            {selectedPerson ? (
              <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-primary">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span className="text-sm">
                    {formData.userId ? (
                      <span className="font-medium">Linked to {selectedPerson.name}</span>
                    ) : (
                      <span className="text-gray-600 dark:text-gray-400">No user account</span>
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <input
                type="text"
                name="userId"
                value={formData.userId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
                placeholder="User ID (if applicable)"
              />
            )}
            <p className="text-xs text-gray-500 mt-1">
              {selectedPerson
                ? 'System-linked user account (automatically set from selected person)'
                : 'Leave blank if driver doesn\'t have a user account'
              }
            </p>
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">
            Address
          </label>
          <textarea
            name="address"
            rows={3}
            value={formData.address}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
            placeholder="Full address..."
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-secondary bg-gray-200 dark:bg-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors w-full sm:w-auto"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
          >
            {isSubmitting ? 'Registering...' : 'Register Driver'}
          </button>
        </div>
      </form>
    </div>
  )
}