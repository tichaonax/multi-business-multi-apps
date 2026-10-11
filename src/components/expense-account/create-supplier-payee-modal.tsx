"use client"

import { useState, useEffect } from 'react'
import type { OnSuccessArg } from '@/types/ui'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { useToastContext } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-modal'
import { ModalPortal } from '@/components/ui/modal-portal'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { SupplierCategoryPicker } from '@/components/suppliers/supplier-editor'

interface CreateSupplierPayeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (payload: OnSuccessArg & { payee?: any }) => void
  onError?: (error: string) => void
  initialName?: string
}

// Creates a real BusinessSuppliers record with no business association —
// for expense accounts (e.g. petty cash) that aren't linked to a business.
// Unlike CreateContractorPayeeModal (which creates a Persons record), this
// gives the payee the supplier-specific fields (productsSupplied, supplier
// category) rather than a contractor's single service-type field.
export function CreateSupplierPayeeModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
  initialName,
}: CreateSupplierPayeeModalProps) {
  const [loading, setLoading] = useState(false)
  const toast = useToastContext()
  const customConfirm = useConfirm()

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    taxId: '',
    address: '',
    productsSupplied: '',
    notes: '',
    supplierType: '',
    emoji: '',
  })

  const [errors, setErrors] = useState({
    name: '',
    phone: '',
    notes: '',
  })

  useEffect(() => {
    if (isOpen && initialName && !formData.name) {
      setFormData(prev => ({ ...prev, name: initialName }))
    }
  }, [isOpen, initialName])

  const validateForm = () => {
    const newErrors = { name: '', phone: '', notes: '' }

    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required'
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    }
    if (!formData.notes.trim()) {
      newErrors.notes = 'Notes are required — describe what this supplier provides'
    }

    setErrors(newErrors)
    if (newErrors.notes) toast.error(newErrors.notes)
    return !newErrors.name && !newErrors.phone && !newErrors.notes
  }

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', taxId: '', address: '', productsSupplied: '', notes: '', supplierType: '', emoji: '' })
    setErrors({ name: '', phone: '', notes: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const result = await fetchWithValidation('/api/expense-account/payees/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          taxId: formData.taxId.trim() || null,
          address: formData.address.trim() || null,
          productsSupplied: formData.productsSupplied.trim() || null,
          notes: formData.notes.trim(),
          supplierType: formData.supplierType || null,
          emoji: formData.emoji || null,
        }),
      })

      toast.push('Supplier created successfully')
      try {
        const created = result?.data?.payee || result?.data
        onSuccess({ message: 'Supplier created successfully', id: created?.id, refresh: true, payee: created })
      } catch (e) {}

      onClose()
      resetForm()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create supplier'
      toast.error(message)
      try { onError?.(message) } catch (e) {}
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    const hasChanges = formData.name.trim() !== '' || formData.phone.trim() !== '' || formData.email.trim() !== ''
    if (hasChanges) {
      const confirmed = await customConfirm('You have unsaved changes. Are you sure you want to cancel?')
      if (!confirmed) return
    }
    onClose()
    resetForm()
  }

  if (!isOpen) return null

  return (
    <ModalPortal>
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-hidden flex flex-col">
        <h2 className="text-xl font-bold text-primary p-6 pb-4 shrink-0">Create Supplier Payee</h2>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 space-y-4 overflow-y-auto flex-1 min-h-0">
            {/* Row 1: Supplier Name (full width) */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setErrors({ ...errors, name: '' }) }}
                className={`w-full px-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-border'
                }`}
                placeholder="e.g., ABC Hardware Supplies"
                required
                maxLength={100}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Row 2: Phone * + Email side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <PhoneNumberInput
                  value={formData.phone}
                  onChange={(value) => { setFormData({ ...formData, phone: value }); setErrors({ ...errors, phone: '' }) }}
                  error={errors.phone}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Email <span className="text-xs font-normal text-secondary">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Row 3: TAX ID */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  TAX ID / EIN <span className="text-xs font-normal text-secondary">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  placeholder="e.g., 12-3456789"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  maxLength={50}
                />
              </div>
            </div>

            {/* Row 4: Supplier Category (full width) */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Supplier Category</label>
              <SupplierCategoryPicker
                value={formData.supplierType || null}
                onChange={(name, emoji) => setFormData({ ...formData, supplierType: name, emoji })}
              />
            </div>

            {/* Row 5: Products/Services Supplied (full width) */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Products / Services Supplied <span className="text-xs font-normal text-secondary">(Optional)</span>
              </label>
              <textarea
                value={formData.productsSupplied}
                onChange={(e) => setFormData({ ...formData, productsSupplied: e.target.value })}
                rows={2}
                placeholder="e.g., cement, timber, roofing sheets..."
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {/* Row 6: Address (full width) */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Address <span className="text-xs font-normal text-secondary">(Optional)</span>
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {/* Row 7: Notes (full width, required) */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => { setFormData({ ...formData, notes: e.target.value }); setErrors({ ...errors, notes: '' }) }}
                rows={2}
                placeholder="What does this supplier provide? (required)"
                className={`w-full px-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-amber-500 focus:border-transparent ${errors.notes ? 'border-red-500' : 'border-border'}`}
              />
              {errors.notes && <p className="mt-1 text-sm text-red-500">{errors.notes}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 p-6 pt-2 shrink-0">
            <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
              A unique supplier number will be generated automatically.
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
                {loading ? 'Creating...' : 'Create Supplier'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  )
}
