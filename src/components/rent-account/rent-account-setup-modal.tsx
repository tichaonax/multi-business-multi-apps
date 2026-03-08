'use client'

import { useState, useRef } from 'react'
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
  const [mode, setMode] = useState<'create' | 'update'>('create')
  const [done, setDone] = useState(false)
  const submittingRef = useRef(false)

  const handleSave = async () => {
    // Guard against double-click race condition
    if (submittingRef.current) return
    submittingRef.current = true

    const validationError = validateRentAccountFormData(formData)
    if (validationError) {
      setError(validationError)
      submittingRef.current = false
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      monthlyRentAmount: parseFloat(formData.monthlyRentAmount),
      operatingDaysPerMonth: parseInt(formData.operatingDaysPerMonth),
      rentDueDay: parseInt(formData.rentDueDay),
      landlordSupplierId: formData.landlordSupplierId,
      autoTransferOnEOD: formData.autoTransferOnEOD,
    }

    try {
      const res = await fetch(`/api/rent-account/${businessId}`, {
        method: mode === 'update' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        // If account already exists, auto-switch to update mode
        if (data.error?.toLowerCase().includes('already exists')) {
          setMode('update')
          setError('A rent account already exists for this business. You are now in update mode — adjust the fields and save.')
          submittingRef.current = false
          return
        }
        throw new Error(data.error || `Failed to ${mode} rent account`)
      }

      setDone(true)
      onSuccess()
    } catch (err: any) {
      setError(err.message)
      submittingRef.current = false
    } finally {
      setSaving(false)
    }
  }

  const isCreate = mode === 'create'
  const buttonLabel = done
    ? (isCreate ? 'Account Created ✓' : 'Account Updated ✓')
    : saving
      ? (isCreate ? 'Creating...' : 'Updating...')
      : (isCreate ? 'Create Rent Account' : 'Update Rent Account')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">
              🏠 {isCreate ? 'Create Rent Account' : 'Update Rent Account'}
            </h2>
            <p className="text-xs text-secondary mt-0.5">{businessName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ✕
          </button>
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
            disabled={saving || done}
          />
        </div>

        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || done}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {buttonLabel}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
