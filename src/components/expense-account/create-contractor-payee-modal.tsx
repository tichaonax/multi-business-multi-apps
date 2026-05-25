"use client"

import { useState, useEffect, useRef } from 'react'
import type { OnSuccessArg } from '@/types/ui'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { useToastContext } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-modal'
import { NationalIdInput } from '@/components/ui/national-id-input'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { ServiceCategoryPicker } from '@/components/common/service-category-picker'

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
  const notesRef = useRef<HTMLTextAreaElement>(null)

  const [formData, setFormData] = useState({
    fullName: '',
    nationalId: '',
    idFormatTemplateId: '',
    phone: '',
    taxId: '',
    notes: '',
    serviceType: '',
    emoji: '',
  })

  const [errors, setErrors] = useState({
    fullName: '',
    nationalId: '',
    phone: '',
    taxId: '',
    notes: '',
  })

  // Pre-fill name from search query when modal opens
  useEffect(() => {
    if (isOpen && initialName && !formData.fullName) {
      setFormData(prev => ({ ...prev, fullName: initialName }))
    }
  }, [isOpen, initialName])

  const validateForm = () => {
    const newErrors = { fullName: '', nationalId: '', phone: '', taxId: '', notes: '' }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters'
    } else if (formData.fullName.trim().length > 100) {
      newErrors.fullName = 'Full name must not exceed 100 characters'
    }

    if (!formData.nationalId.trim()) {
      newErrors.nationalId = 'National ID is required'
    } else if (formData.nationalId.trim().length > 50) {
      newErrors.nationalId = 'National ID must not exceed 50 characters'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (formData.phone.trim().length < 7) {
      newErrors.phone = 'Phone number must be at least 7 characters'
    } else if (formData.phone.trim().length > 20) {
      newErrors.phone = 'Phone number must not exceed 20 characters'
    }

    if (formData.taxId.trim().length > 50) {
      newErrors.taxId = 'TAX ID must not exceed 50 characters'
    }

    if (!formData.notes.trim()) {
      newErrors.notes = 'Notes are required — describe what this contractor does'
    }

    setErrors(newErrors)
    if (newErrors.notes) {
      toast.error(newErrors.notes)
      setTimeout(() => { notesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); notesRef.current?.focus() }, 100)
    }
    return !newErrors.fullName && !newErrors.nationalId && !newErrors.phone && !newErrors.taxId && !newErrors.notes
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
          taxId: formData.taxId.trim() || null,
          notes: formData.notes.trim() || null,
          serviceType: formData.serviceType || null,
          emoji: formData.emoji || null,
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
      setFormData({ fullName: '', nationalId: '', idFormatTemplateId: '', phone: '', taxId: '', notes: '', serviceType: '', emoji: '' })
      setErrors({ fullName: '', nationalId: '', phone: '', taxId: '', notes: '' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create contractor payee'
      toast.error(message)
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
    setFormData({ fullName: '', nationalId: '', idFormatTemplateId: '', phone: '', taxId: '', notes: '', serviceType: '', emoji: '' })
    setErrors({ fullName: '', nationalId: '', phone: '', taxId: '', notes: '' })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-primary mb-4">Create Contractor Payee</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Full Name (full width) */}
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

          {/* Row 2: National ID * + Phone * side by side */}
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Row 3: TAX ID (half-width left) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                TAX ID / EIN <span className="text-xs font-normal text-secondary">(Optional)</span>
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
          </div>

          {/* Row 4: Contractor Category (full width) */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Contractor Category</label>
            <ServiceCategoryPicker
              apiEndpoint="/api/contractor-categories"
              value={formData.serviceType || null}
              onChange={(name, emoji) => setFormData({ ...formData, serviceType: name, emoji })}
            />
          </div>

          {/* Row 5: Notes (full width, required) */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              ref={notesRef}
              value={formData.notes}
              onChange={(e) => { setFormData({ ...formData, notes: e.target.value }); setErrors({ ...errors, notes: '' }) }}
              rows={2}
              placeholder="What work does this contractor do? (required)"
              className={`w-full px-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-amber-500 focus:border-transparent ${errors.notes ? 'border-red-500' : 'border-border'}`}
            />
            {errors.notes && <p className="mt-1 text-sm text-red-500">{errors.notes}</p>}
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
              A unique ID will be generated automatically.
            </p>
            <div className="flex gap-3 shrink-0">
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
          </div>
        </form>
      </div>
    </div>
  )
}
