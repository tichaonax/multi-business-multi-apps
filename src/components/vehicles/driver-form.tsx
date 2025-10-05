 'use client'

import { useState } from 'react'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { DriverLicenseInput } from '@/components/ui/driver-license-input'
import { useDateFormat } from '@/contexts/settings-context'
import { useToastContext } from '@/components/ui/toast'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { parseDateFromFormat } from '@/lib/country-codes'
import { CreateDriverData } from '@/types/vehicle'

interface DriverFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function DriverForm({ onSuccess, onCancel }: DriverFormProps) {
  const { defaultCountry, format: globalDateFormat } = useDateFormat()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const toast = useToastContext()

  const [formData, setFormData] = useState<CreateDriverData>({
    fullName: '',
    licenseNumber: '',
    licenseExpiry: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      // Parse date strings from global format back to ISO (YYYY-MM-DD)
      const licenseExpiryISO = parseDateFromFormat(formData.licenseExpiry || '', defaultCountry) || ''
      const dobISO = parseDateFromFormat(formData.dateOfBirth || '', defaultCountry) || ''

      const payload = { ...formData, licenseExpiry: licenseExpiryISO, dateOfBirth: dobISO }

      const result = await fetchWithValidation('/api/vehicles/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (onSuccess) onSuccess()
      toast.push('Driver registered')
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
              onChange={(val) => setFormData(prev => ({ ...prev, licenseNumber: val }))}
              required
              className="w-full"
            />
          </div>

          {/* License Expiry */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              License Expiry Date *
            </label>
            <input
              name="licenseExpiry"
              required
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
            <input
              type="text"
              name="userId"
              value={formData.userId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder="User ID (if applicable)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank if driver doesn't have a user account
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