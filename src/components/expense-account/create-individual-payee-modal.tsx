"use client"

import { useState } from 'react'
import type { OnSuccessArg } from '@/types/ui'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { useToastContext } from '@/components/ui/toast'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import { NationalIdInput } from '@/components/ui/national-id-input'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'

interface CreateIndividualPayeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (payload: OnSuccessArg & { payee?: any }) => void
  onError?: (error: string) => void
}

export function CreateIndividualPayeeModal({
  isOpen,
  onClose,
  onSuccess,
  onError
}: CreateIndividualPayeeModalProps) {
  const [loading, setLoading] = useState(false)
  const toast = useToastContext()
  const customAlert = useAlert()
  const customConfirm = useConfirm()

  const [formData, setFormData] = useState({
    fullName: '',
    nationalId: '',
    idFormatTemplateId: '', // Track selected ID format template
    phone: ''
  })

  const [errors, setErrors] = useState({
    fullName: '',
    nationalId: '',
    phone: ''
  })

  const validateForm = () => {
    const newErrors = {
      fullName: '',
      nationalId: '',
      phone: ''
    }

    // Validate full name
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters'
    } else if (formData.fullName.trim().length > 100) {
      newErrors.fullName = 'Full name must not exceed 100 characters'
    }

    // Validate national ID (optional, but if provided must be valid)
    if (formData.nationalId && formData.nationalId.length > 0) {
      // National ID validation is handled by the NationalIdInput component
      // We just check if it's not too long
      if (formData.nationalId.length > 50) {
        newErrors.nationalId = 'National ID must not exceed 50 characters'
      }
    }

    // Validate phone (optional, but if provided must be valid)
    if (formData.phone && formData.phone.length > 0) {
      // Phone validation is handled by the PhoneNumberInput component
      // We just check basic format
      if (formData.phone.length < 7) {
        newErrors.phone = 'Phone number must be at least 7 characters'
      } else if (formData.phone.length > 20) {
        newErrors.phone = 'Phone number must not exceed 20 characters'
      }
    }

    setErrors(newErrors)
    return !newErrors.fullName && !newErrors.nationalId && !newErrors.phone
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const result = await fetchWithValidation('/api/expense-account/payees/individuals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          nationalId: formData.nationalId.trim() || null,
          idFormatTemplateId: formData.idFormatTemplateId || null,
          phone: formData.phone.trim() || null
        })
      })

      // Success
      toast.push('Individual payee created successfully')
      try {
        const created = result?.data?.payee || result?.data
        onSuccess({
            message: 'Individual payee created successfully',
            id: created?.id,
            refresh: true,
            payee: created // Return the created payee
          })
      } catch (e) {}

      onClose()

      // Reset form
      setFormData({
        fullName: '',
        nationalId: '',
        idFormatTemplateId: '',
        phone: ''
      })
      setErrors({ fullName: '', nationalId: '', phone: '' })
    } catch (error) {
      console.error('Create individual payee error:', error)
      const message = error instanceof Error ? error.message : 'Failed to create individual payee'
      toast.push(message)
      try {
        onError?.(message)
      } catch (e) {}
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    // Check if form has unsaved changes
    const hasChanges = formData.fullName.trim() !== '' ||
                       formData.nationalId.trim() !== '' ||
                       formData.idFormatTemplateId.trim() !== '' ||
                       formData.phone.trim() !== ''

    if (hasChanges) {
      const confirmed = await customConfirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      )
      if (!confirmed) return
    }

    onClose()

    // Reset form
    setFormData({
      fullName: '',
      nationalId: '',
      idFormatTemplateId: '',
      phone: ''
    })
    setErrors({ fullName: '', nationalId: '', phone: '' })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-primary mb-4">Create Individual Payee</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              className={`w-full px-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              National ID (Optional)
            </label>
            <NationalIdInput
              value={formData.nationalId}
              templateId={formData.idFormatTemplateId}
              onChange={(nationalId, templateId) => {
                setFormData({
                  ...formData,
                  nationalId: nationalId,
                  idFormatTemplateId: templateId || ''
                })
                setErrors({ ...errors, nationalId: '' })
              }}
              error={errors.nationalId}
            />
            <p className="text-xs text-secondary mt-1">
              National ID number for identification purposes
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Phone Number (Optional)
            </label>
            <PhoneNumberInput
              value={formData.phone}
              onChange={(value) => {
                setFormData({ ...formData, phone: value })
                setErrors({ ...errors, phone: '' })
              }}
              error={errors.phone}
            />
            <p className="text-xs text-secondary mt-1">
              Contact phone number
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-semibold">Note:</span> This creates a new individual (contractor, vendor, or person) that can be used as a payee for expense account payments. A unique ID will be generated automatically.
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Individual'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
