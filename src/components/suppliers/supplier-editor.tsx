'use client'

import { useState, useEffect } from 'react'
import { EmojiPicker } from '@/components/common/emoji-picker'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'

interface Supplier {
  id?: string
  businessId?: string
  supplierNumber?: string
  name: string
  emoji?: string | null
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  taxId?: string | null
  address?: string | null
  paymentTerms?: string | null
  creditLimit?: number | null
  accountBalance?: number
  notes?: string | null
  isActive?: boolean
}

interface SupplierEditorProps {
  supplier?: Supplier | null
  businessId: string
  onSave: (createdSupplierId?: string) => void
  onCancel: () => void
}

const PAYMENT_TERMS = [
  'Net 30',
  'Net 60',
  'Net 90',
  'COD',
  'Prepaid',
  'Due on Receipt',
  'Custom'
]

export function SupplierEditor({ supplier, businessId, onSave, onCancel }: SupplierEditorProps) {
  const [formData, setFormData] = useState<Supplier>({
    name: '',
    emoji: null,
    contactPerson: null,
    email: null,
    phone: null,
    taxId: null,
    address: null,
    paymentTerms: null,
    creditLimit: null,
    accountBalance: 0,
    notes: null,
    isActive: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        emoji: supplier.emoji || null,
        contactPerson: supplier.contactPerson || null,
        email: supplier.email || null,
        phone: supplier.phone || null,
        taxId: supplier.taxId || null,
        address: supplier.address || null,
        paymentTerms: supplier.paymentTerms || null,
        creditLimit: supplier.creditLimit || null,
        accountBalance: supplier.accountBalance || 0,
        notes: supplier.notes || null,
        isActive: supplier.isActive !== false,
      })
    }
  }, [supplier])

  const handleInputChange = (field: keyof Supplier, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePhoneChange = (fullPhoneNumber: string) => {
    handleInputChange('phone', fullPhoneNumber || null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setError(null)

    if (!formData.name.trim()) {
      setError('Supplier name is required')
      return
    }

    try {
      setLoading(true)

      const url = supplier?.id
        ? `/api/business/${businessId}/suppliers/${supplier.id}`
        : `/api/business/${businessId}/suppliers`

      const method = supplier?.id ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Failed to save supplier')
        return
      }

      // Pass the created/updated supplier ID back
      const supplierId = data.supplier?.id || supplier?.id
      onSave(supplierId)
    } catch (error) {
      console.error('Error saving supplier:', error)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full my-8" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {supplier ? 'Edit Supplier' : 'Create Supplier'}
            </h2>
            {supplier?.supplierNumber && (
              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Supplier Number: {supplier.supplierNumber}
                </p>
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded" title="Shared across same business type">
                  SHARED
                </span>
              </div>
            )}
            {!supplier && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm">
                  <p className="font-medium text-purple-900 dark:text-purple-100 mb-1">
                    📦 Shared Supplier
                  </p>
                  <p className="text-purple-700 dark:text-purple-300">
                    This supplier will be available to all businesses of the same type. Changes will be visible across all connected businesses.
                  </p>
                </div>
              </div>
            )}
            {supplier && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="text-sm">
                  <p className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                    ⚠️ Editing Shared Supplier
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    Changes to this supplier will affect all businesses of the same type that use it.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Emoji Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Emoji (Optional)
                </label>
                <EmojiPicker
                  onSelect={(emoji) => handleInputChange('emoji', emoji)}
                  selectedEmoji={formData.emoji || undefined}
                  searchPlaceholder="Search supplier emoji..."
                  compact={true}
                  businessId={businessId}
                  context="supplier"
                />
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson || ''}
                    onChange={(e) => handleInputChange('contactPerson', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <PhoneNumberInput
                    value={formData.phone || ''}
                    onChange={handlePhoneChange}
                    label="Phone"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    TAX ID / EIN
                  </label>
                  <input
                    type="text"
                    value={formData.taxId || ''}
                    onChange={(e) => handleInputChange('taxId', e.target.value || null)}
                    placeholder="12-3456789"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={formData.paymentTerms || ''}
                    onChange={(e) => handleInputChange('paymentTerms', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select...</option>
                    {PAYMENT_TERMS.map(term => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address
                  </label>
                  <textarea
                    value={formData.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value || null)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Financial Information */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Financial Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Credit Limit
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.creditLimit || ''}
                      onChange={(e) => handleInputChange('creditLimit', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Account Balance
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.accountBalance || 0}
                      onChange={(e) => handleInputChange('accountBalance', e.target.value ? parseFloat(e.target.value) : 0)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Current amount owed to this supplier
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value || null)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder="Additional notes about this supplier..."
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active Supplier
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
              )}
              {loading ? 'Saving...' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
