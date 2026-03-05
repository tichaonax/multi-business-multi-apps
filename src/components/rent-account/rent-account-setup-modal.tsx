'use client'

import { useState } from 'react'
import {
  RentAccountSetupForm,
  defaultRentAccountFormData,
  validateRentAccountFormData,
  type RentAccountFormData,
} from './rent-account-setup-form'

interface RentAccountSetupModalProps {
  businessId: string
  businessType: string
  businessName: string
  onSuccess: () => void
  onClose: () => void
}

export function RentAccountSetupModal({
  businessId,
  businessType,
  businessName,
  onSuccess,
  onClose,
}: RentAccountSetupModalProps) {
  const [formData, setFormData] = useState<RentAccountFormData>(defaultRentAccountFormData())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    const validationError = validateRentAccountFormData(formData)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/rent-account/${businessId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyRentAmount: parseFloat(formData.monthlyRentAmount),
          operatingDaysPerMonth: parseInt(formData.operatingDaysPerMonth),
          rentDueDay: parseInt(formData.rentDueDay),
          landlordSupplierId: formData.landlordSupplierId,
          autoTransferOnEOD: formData.autoTransferOnEOD,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create rent account')

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">🏠 Create Rent Account</h2>
            <p className="text-xs text-secondary mt-0.5">{businessName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <RentAccountSetupForm
            businessId={businessId}
            businessType={businessType}
            value={formData}
            onChange={setFormData}
            disabled={saving}
          />
        </div>

        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Rent Account'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
