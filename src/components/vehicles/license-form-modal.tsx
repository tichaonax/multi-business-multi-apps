'use client'

import { useState, useEffect } from 'react'
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
    renewalCost: license?.renewalCost?.toString() || '0',
    lateFee: license?.lateFee?.toString() || '0',
    // VehicleLicense type doesn't declare `notes` but the form supports it; use a
    // safe cast to avoid TypeScript errors while preserving runtime behavior.
    notes: (license as any)?.notes || '',
    isActive: license?.isActive ?? true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [authorities, setAuthorities] = useState<Array<{ id: string; name: string }>>([])
  const [showNewAuthorityInput, setShowNewAuthorityInput] = useState(false)
  const [newAuthorityName, setNewAuthorityName] = useState('')
  const toast = useToastContext()

  // Fetch issuing authorities on mount
  useEffect(() => {
    const fetchAuthorities = async () => {
      try {
        const response = await fetchWithValidation('/api/vehicles/issuing-authorities')
        if (response?.success && response.data) {
          setAuthorities(response.data)
        }
      } catch (err) {
        console.error('Error fetching issuing authorities:', err)
        // Don't show error toast, just log it - user can still type manually
      }
    }

    if (isOpen) {
      fetchAuthorities()
    }
  }, [isOpen])

  // Update form data when license prop changes
  useEffect(() => {
    setFormData({
      licenseType: license?.licenseType || 'REGISTRATION',
      licenseNumber: license?.licenseNumber || '',
      issueDate: license?.issueDate || '',
      expiryDate: license?.expiryDate || '',
      issuingAuthority: license?.issuingAuthority || '',
      renewalCost: license?.renewalCost?.toString() || '0',
      lateFee: license?.lateFee?.toString() || '0',
      notes: (license as any)?.notes || '',
      isActive: license?.isActive ?? true
    })
    setShowNewAuthorityInput(false)
    setNewAuthorityName('')
    setError('')
  }, [license])

  const handleAddNewAuthority = async () => {
    if (!newAuthorityName.trim()) {
      setError('Please enter an authority name')
      return
    }

    try {
      const response = await fetchWithValidation('/api/vehicles/issuing-authorities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAuthorityName.trim() })
      })

      if (response?.success && response.data) {
        // Add to local list
        setAuthorities(prev => [...prev, response.data].sort((a, b) => a.name.localeCompare(b.name)))
        // Set as selected
        setFormData(prev => ({ ...prev, issuingAuthority: response.data.name }))
        // Close input
        setShowNewAuthorityInput(false)
        setNewAuthorityName('')
        toast.push('Authority added successfully')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add authority'
      setError(msg)
      toast.push(msg)
    }
  }

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

    if (!formData.renewalCost || formData.renewalCost.trim() === '') {
      setError('Renewal cost is required')
      return
    }

    const renewalCostNum = parseFloat(formData.renewalCost)
    if (isNaN(renewalCostNum) || renewalCostNum < 0) {
      setError('Renewal cost must be 0 or greater')
      return
    }

    // Validate late fee if provided
    const lateFeeNum = parseFloat(formData.lateFee || '0')
    if (isNaN(lateFeeNum) || lateFeeNum < 0) {
      setError('Late fee must be 0 or greater')
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
      const url = '/api/vehicles/licenses'
      const method = license ? 'PUT' : 'POST'

      const payload = license
        ? {
            id: license.id,
            ...formData,
            vehicleId,
            renewalCost: parseFloat(formData.renewalCost),
            lateFee: parseFloat(formData.lateFee || '0')
          }
        : {
            ...formData,
            vehicleId,
            renewalCost: parseFloat(formData.renewalCost),
            lateFee: parseFloat(formData.lateFee || '0')
          }

      const body = await fetchWithValidation(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
            {!showNewAuthorityInput ? (
              <div className="space-y-2">
                <select
                  value={formData.issuingAuthority}
                  onChange={(e) => {
                    if (e.target.value === '__ADD_NEW__') {
                      setShowNewAuthorityInput(true)
                      setFormData({ ...formData, issuingAuthority: '' })
                    } else {
                      setFormData({ ...formData, issuingAuthority: e.target.value })
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary"
                >
                  <option value="">Select issuing authority</option>
                  {authorities.map((auth) => (
                    <option key={auth.id} value={auth.name}>
                      {auth.name}
                    </option>
                  ))}
                  <option value="__ADD_NEW__" className="font-semibold text-blue-600">
                    + Add New Authority
                  </option>
                </select>
                <p className="text-xs text-gray-500">e.g., ZIMRA, DMV, etc.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAuthorityName}
                    onChange={(e) => setNewAuthorityName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary"
                    placeholder="Enter new authority name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddNewAuthority()
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewAuthority}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewAuthorityInput(false)
                      setNewAuthorityName('')
                    }}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-gray-500">Enter the name of the new issuing authority</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Renewal Cost *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.renewalCost}
              onChange={(e) => setFormData({ ...formData, renewalCost: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary"
              placeholder="0"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Cost to renew this license (enter 0 if free)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Late Fee / Penalty
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.lateFee}
              onChange={(e) => setFormData({ ...formData, lateFee: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">Additional fee charged for late renewal (enter 0 if none)</p>
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