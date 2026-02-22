"use client"

import { useState, useEffect } from 'react'
import type { OnSuccessArg } from '@/types/ui'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { useToastContext } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-modal'
import { NationalIdInput } from '@/components/ui/national-id-input'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'

interface CreateContractorPayeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (payload: OnSuccessArg & { payee?: any }) => void
  onError?: (error: string) => void
  initialName?: string
}

export function CreateContractorPayeeModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
  initialName
}: CreateContractorPayeeModalProps) {
  const [loading, setLoading] = useState(false)
  const toast = useToastContext()
  const customConfirm = useConfirm()

  const [formData, setFormData] = useState({
    fullName: '',
    nationalId: '',
    idFormatTemplateId: '',
    phone: '',
    taxId: ''
  })

  const [errors, setErrors] = useState({
    fullName: '',
    nationalId: '',
    phone: '',
    taxId: ''
  })

  // Pre-fill name from search query when modal opens
  useEffect(() => {
    if (isOpen && initialName && !formData.fullName) {
      setFormData(prev => ({ ...prev, fullName: initialName }))
    }
  }, [isOpen, initialName])

  const validateForm = () => {
    const newErrors = { fullName: '', nationalId: '', phone: '', taxId: '' }

    // Full name — required
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters'
    } else if (formData.fullName.trim().length > 100) {
      newErrors.fullName = 'Full name must not exceed 100 characters'
    }

    // National ID — required for contractors
    if (!formData.nationalId.trim()) {
      newErrors.nationalId = 'National ID is required'
    } else if (formData.nationalId.trim().length > 50) {
      newErrors.nationalId = 'National ID must not exceed 50 characters'
    }

    // Phone — required for contractors
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (formData.phone.trim().length < 7) {
      newErrors.phone = 'Phone number must be at least 7 characters'
    } else if (formData.phone.trim().length > 20) {
      newErrors.phone = 'Phone number must not exceed 20 characters'
    }

    // TAX ID — optional but max length check
    if (formData.taxId.trim().length > 50) {
      newErrors.taxId = 'TAX ID must not exceed 50 characters'
    }

    setErrors(newErrors)
    return !newErrors.fullName && !newErrors.nationalId && !newErrors.phone && !newErrors.taxId
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      // Contractors are created as Persons via the same individuals endpoint
      const result = await fetchWithValidation('/api/expense-account/payees/individuals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          nationalId: formData.nationalId.trim() || null,
          idFormatTemplateId: formData.idFormatTemplateId || null,
          phone: formData.phone.trim() || null,
          taxId: formData.taxId.trim() || null
        })
      })

      toast.push('Contractor payee created successfully')
      try {
        const created = result?.data?.payee || result?.data
        onSuccess({
          message: 'Contractor payee created successfully',
          id: created?.id,
          refresh: true,
          payee: created
        })
      } catch (e) {}

      onClose()
      setFormData({ fullName: '', nationalId: '', idFormatTemplateId: '', phone: '', taxId: '' })
      setErrors({ fullName: '', nationalId: '', phone: '', taxId: '' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create contractor payee'
      toast.push(message)
      try { onError?.(message) } catch (e) {}
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    const hasChanges = formData.fullName.trim() !== '' ||
                       formData.nationalId.trim() !== '' ||
                       formData.phone.trim() !== '' ||
                       formData.taxId.trim() !== ''

    if (hasChanges) {
      const confirmed = await customConfirm('You have unsaved changes. Are you sure you want to cancel?')
      if (!confirmed) return
    }

    onClose()
    setFormData({ fullName: '', nationalId: '', idFormatTemplateId: '', phone: '', taxId: '' })
    setErrors({ fullName: '', nationalId: '', phone: '', taxId: '' })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-primary mb-4">Create Contractor Payee</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name — required */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => {
                setFormData({ ...formData, fullName: e.target.value })
                setErrors({ ...errors, fullName: '' })
              }}
              className={`w-full px-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                errors.fullName ? 'border-red-500' : 'border-border'
              }`}
              placeholder="e.g., John Doe"
              required
              maxLength={100}
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>
            )}
          </div>

          {/* National ID — required */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              National ID <span className="text-red-500">*</span>
            </label>
            <NationalIdInput
              value={formData.nationalId}
              templateId={formData.idFormatTemplateId}
              onChange={(nationalId, templateId) => {
                setFormData({ ...formData, nationalId, idFormatTemplateId: templateId || '' })
                setErrors({ ...errors, nationalId: '' })
              }}
              error={errors.nationalId}
            />
          </div>

          {/* Phone — required */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <PhoneNumberInput
              value={formData.phone}
              onChange={(value) => {
                setFormData({ ...formData, phone: value })
                setErrors({ ...errors, phone: '' })
              }}
              error={errors.phone}
            />
          </div>

          {/* TAX ID — optional */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              TAX ID / EIN
            </label>
            <input
              type="text"
              value={formData.taxId}
              onChange={(e) => {
                setFormData({ ...formData, taxId: e.target.value })
                setErrors({ ...errors, taxId: '' })
              }}
              placeholder="e.g., 12-3456789"
              className={`w-full px-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                errors.taxId ? 'border-red-500' : 'border-border'
              }`}
              maxLength={50}
            />
            {errors.taxId && (
              <p className="mt-1 text-sm text-red-500">{errors.taxId}</p>
            )}
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Note:</span> This creates a new contractor payee for expense account payments. A unique ID will be generated automatically.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-secondary bg-background border border-border rounded-md hover:bg-muted"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Contractor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
