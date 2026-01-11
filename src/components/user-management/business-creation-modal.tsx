'use client'

import { useState } from 'react'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'

interface BusinessCreationModalProps {
  onClose: () => void
  // onSuccess now receives the full server response so callers can access
  // the created business object (if present) as well as the message.
  onSuccess: (result: { message?: string; business?: any }) => void
  onError: (error: string) => void
  // Optional: initial values for edit mode
  initial?: {
    name?: string
    type?: string
    description?: string
    address?: string
    phone?: string
    ecocashEnabled?: boolean
    receiptReturnPolicy?: string
    taxIncludedInPrice?: boolean
    taxRate?: string
    taxLabel?: string
  }
  // Optional: HTTP method override for the form (default POST). Use 'PUT' for edit.
  method?: 'POST' | 'PUT'
  // Optional: resource id when using PUT
  id?: string
}

const BUSINESS_TYPES = [
  'construction',
  'restaurant',
  'grocery',
  'clothing',
  'hardware',
  'consulting',
  'retail',
  'services',
  'other'
]

export function BusinessCreationModal({ onClose, onSuccess, onError, initial, method = 'POST', id }: BusinessCreationModalProps) {
  const [formData, setFormData] = useState({
    name: initial?.name || '',
    type: initial?.type || 'other',
    description: initial?.description || '',
    address: initial?.address || '',
    phone: initial?.phone || '',
    ecocashEnabled: initial?.ecocashEnabled !== undefined ? initial.ecocashEnabled : false,
    receiptReturnPolicy: initial?.receiptReturnPolicy || 'All sales are final, returns not accepted',
    taxIncludedInPrice: initial?.taxIncludedInPrice !== undefined ? initial.taxIncludedInPrice : true,
    taxRate: initial?.taxRate || '',
    taxLabel: initial?.taxLabel || ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.type) {
      onError('Business name and type are required')
      return
    }

    setLoading(true)
    try {
      const url = method === 'PUT' && id ? `/api/admin/businesses/${id}` : '/api/admin/businesses'
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (response.ok) {
        // Pass the whole payload back to the caller so they can access
        // the created/updated business id/object and perform follow-up actions
        onSuccess({ message: data.message, business: data.business })
        onClose()
      } else {
        onError(data.error || `Failed to ${method === 'PUT' ? 'update' : 'create'} business`)
      }
    } catch (error) {
      onError(method === 'PUT' ? 'Error updating business' : 'Error creating business')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg border border-gray-200 dark:border-neutral-700">
        <div className="p-6 border-b border-gray-200 dark:border-neutral-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-primary">{method === 'PUT' ? 'Edit Business' : 'Create New Business'}</h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 dark:text-neutral-300 dark:hover:text-neutral-100"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-primary">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter business name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Business Type <span className="text-red-500">*</span>
            </label>
            <select
              className="input-field"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              required
            >
              {BUSINESS_TYPES.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Description (Optional)
            </label>
            <textarea
              className="input-field"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the business"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Business Address (Optional)
            </label>
            <input
              type="text"
              className="input-field"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter business address"
            />
          </div>

          <div>
            <PhoneNumberInput
              value={formData.phone}
              onChange={(full) => setFormData({ ...formData, phone: full })}
              label="Business Phone (Optional)"
              placeholder="77 123 4567"
              className="w-full"
            />
          </div>

          {/* Eco-Cash Support */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-800 rounded-md border border-gray-200 dark:border-neutral-700">
            <div className="flex-1">
              <label htmlFor="ecocashEnabled" className="block text-sm font-medium text-gray-900 dark:text-neutral-100">
                Accepts Eco-Cash
              </label>
              <span className="block text-xs text-gray-600 dark:text-gray-400 mt-1">
                Display Eco-Cash logo on customer display when enabled
              </span>
            </div>
            <input
              type="checkbox"
              id="ecocashEnabled"
              checked={formData.ecocashEnabled}
              onChange={(e) => setFormData({ ...formData, ecocashEnabled: e.target.checked })}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-neutral-700 dark:border-neutral-600"
            />
          </div>

          {/* Receipt Configuration Section */}
          <div className="pt-4 border-t border-gray-200 dark:border-neutral-700 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-neutral-100">Receipt Configuration</h3>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Return Policy Message
              </label>
              <textarea
                value={formData.receiptReturnPolicy}
                onChange={(e) => setFormData({...formData, receiptReturnPolicy: e.target.value})}
                rows={2}
                className="input-field"
                placeholder="All sales are final, returns not accepted"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This message will be printed on all receipts
              </p>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-800 rounded-md border border-gray-200 dark:border-neutral-700">
              <div className="flex-1">
                <label htmlFor="taxIncluded" className="block text-sm font-medium text-gray-900 dark:text-neutral-100">
                  Tax Included in Price
                </label>
                <span className="block text-xs text-gray-600 dark:text-gray-400 mt-1">
                  When enabled, tax is included in product prices. When disabled, tax will be calculated separately at checkout.
                </span>
              </div>
              <input
                id="taxIncluded"
                type="checkbox"
                checked={formData.taxIncludedInPrice}
                onChange={(e) => setFormData({...formData, taxIncludedInPrice: e.target.checked})}
                className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 ml-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.taxRate}
                onChange={(e) => setFormData({...formData, taxRate: e.target.value})}
                className="input-field"
                placeholder="e.g., 13.50"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.taxIncludedInPrice
                  ? 'The tax percentage embedded in your prices (for display purposes only)'
                  : 'Tax will be calculated and added at checkout'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Tax Label
              </label>
              <input
                type="text"
                value={formData.taxLabel}
                onChange={(e) => setFormData({...formData, taxLabel: e.target.value})}
                className="input-field"
                placeholder="e.g., VAT, Sales Tax, GST"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                How the tax will be labeled on receipts (optional)
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (method === 'PUT' ? 'Saving...' : 'Creating...') : (method === 'PUT' ? 'Save Changes' : 'Create Business')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}