'use client'

import { useState } from 'react'
import { VehicleLicense } from '@/types/vehicle'
import { DateInput } from '@/components/ui/date-input'
import { X } from 'lucide-react'
import { useToastContext } from '@/components/ui/toast'
import fetchWithValidation from '@/lib/fetchWithValidation'

interface LicenseFormModalProps {
  vehicleId: string
  license?: VehicleLicense
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

const LICENSE_TYPES = [
  { value: 'REGISTRATION', label: 'Registration' },
  { value: 'RADIO', label: 'Radio License' },
  { value: 'ROAD_USE', label: 'Road Use' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'INSPECTION', label: 'Inspection' }
]

export function LicenseFormModal({ vehicleId, license, isOpen, onClose, onSave }: LicenseFormModalProps) {
  const [formData, setFormData] = useState({
    licenseType: license?.licenseType || 'REGISTRATION',
    licenseNumber: license?.licenseNumber || '',
    issueDate: license?.issueDate || '',
    expiryDate: license?.expiryDate || '',
    issuingAuthority: license?.issuingAuthority || '',
    notes: license?.notes || '',
    isActive: license?.isActive ?? true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const toast = useToastContext()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.licenseNumber.trim()) {
      setError('License number is required')
      return
    }

    if (!formData.issueDate) {
      setError('Effective date is required')
      return
    }

    if (!formData.expiryDate) {
      setError('Expiry date is required')
      return
    }

    // Validate effective date is before expiry date
    const effectiveDate = new Date(formData.issueDate)
    const expiryDate = new Date(formData.expiryDate)

    if (effectiveDate >= expiryDate) {
      setError('Effective date must be before expiry date')
      return
    }

    // Check for overlapping licenses of the same type
    try {
      const checkBody = await fetchWithValidation(`/api/vehicles/licenses?vehicleId=${vehicleId}&licenseType=${formData.licenseType}`)

      if (checkBody?.success) {
        const existingLicenses = checkBody.data.filter((l: any) => license ? l.id !== license.id : true)

        const hasOverlap = existingLicenses.some((existingLicense: any) => {
          const existingStart = new Date(existingLicense.issueDate)
          const existingEnd = new Date(existingLicense.expiryDate)

          return (effectiveDate <= existingEnd && expiryDate >= existingStart)
        })

        if (hasOverlap) {
          const msg = `A ${formData.licenseType.replace('_', ' ')} license already exists for this period. Please check the dates.`
          setError(msg)
          try { toast.push(msg) } catch (e) {}
          return
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error checking for overlapping licenses'
      console.error('Error checking for overlapping licenses:', err)
      try { toast.push(msg) } catch (e) {}
      // Continue with submission if check fails
    }

    setLoading(true)
    setError('')

    try {
      const url = license
        ? `/api/vehicles/licenses?id=${license.id}`
        : '/api/vehicles/licenses'

      const method = license ? 'PUT' : 'POST'

      const body = await fetchWithValidation(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, vehicleId })
      })

      const successMsg = body?.message || (license ? 'License updated' : 'License created')
      try { toast.push(successMsg) } catch (e) {}
      onSave()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred'
      setError(msg)
      try { toast.push(msg) } catch (e) {}
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-primary">
            {license ? 'Edit License' : 'Add New License'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              License Type *
            </label>
            <select
              value={formData.licenseType}
              onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary"
              required
            >
              {LICENSE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              License Number *
            </label>
            <input
              type="text"
              value={formData.licenseNumber}
              onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary"
              placeholder="Enter license number"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Effective Date *
            </label>
            <DateInput
              value={formData.issueDate}
              onChange={(value) => setFormData({ ...formData, issueDate: value })}
              placeholder="Select effective date"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Date when the license becomes valid</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Expiry Date *
            </label>
            <DateInput
              value={formData.expiryDate}
              onChange={(value) => setFormData({ ...formData, expiryDate: value })}
              placeholder="Select expiry date"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Date when the license expires</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Issuing Authority
            </label>
            <input
              type="text"
              value={formData.issuingAuthority}
              onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary"
              placeholder="Enter issuing authority"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary"
              placeholder="Additional notes"
              rows={3}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-primary">
              Active license
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : license ? 'Update License' : 'Add License'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}