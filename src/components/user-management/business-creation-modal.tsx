'use client'

import { useState } from 'react'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { getDefaultPageOptions } from '@/lib/business-default-pages'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

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
    couponsEnabled?: boolean
    receiptReturnPolicy?: string
    taxEnabled?: boolean
    taxIncludedInPrice?: boolean
    taxRate?: string
    taxLabel?: string
    defaultPage?: string
    slogan?: string
    showSlogan?: boolean
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
  const { hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const [formData, setFormData] = useState({
    name: initial?.name || '',
    type: initial?.type || 'other',
    description: initial?.description || '',
    address: initial?.address || '',
    phone: initial?.phone || '',
    ecocashEnabled: initial?.ecocashEnabled !== undefined ? initial.ecocashEnabled : false,
    couponsEnabled: initial?.couponsEnabled !== undefined ? initial.couponsEnabled : false,
    receiptReturnPolicy: initial?.receiptReturnPolicy || 'All sales are final, returns not accepted',
    taxEnabled: initial?.taxEnabled !== undefined ? initial.taxEnabled : false,
    taxIncludedInPrice: initial?.taxIncludedInPrice !== undefined ? initial.taxIncludedInPrice : true,
    taxRate: initial?.taxRate || '',
    taxLabel: initial?.taxLabel || '',
    defaultPage: initial?.defaultPage || '',
    slogan: initial?.slogan || 'Where Customer Is King',
    showSlogan: initial?.showSlogan !== undefined ? initial.showSlogan : true
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
      <div className="bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg border border-gray-200 dark:border-neutral-700">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-neutral-800 p-6 border-b border-gray-200 dark:border-neutral-700">
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

        <form onSubmit={handleSubmit} className="text-primary">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 mb-3">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
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
                  <label className="block text-sm font-medium text-primary mb-1">
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-primary mb-1">
                    Description
                  </label>
                  <textarea
                    className="input-field"
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the business"
                  />
                </div>
              </div>
            </div>

            {/* Contact & Location */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 mb-3">Contact & Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Business Address
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
                    label="Business Phone"
                    placeholder="77 123 4567"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 mb-3">Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-md border border-gray-200 dark:border-neutral-700">
                  <div className="flex-1">
                    <label htmlFor="ecocashEnabled" className="block text-sm font-medium text-gray-900 dark:text-neutral-100">
                      Accepts Eco-Cash
                    </label>
                    <span className="block text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      Show Eco-Cash logo on customer display
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    id="ecocashEnabled"
                    checked={formData.ecocashEnabled}
                    onChange={(e) => setFormData({ ...formData, ecocashEnabled: e.target.checked })}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-neutral-700 dark:border-neutral-600 ml-3"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-md border border-gray-200 dark:border-neutral-700">
                  <div className="flex-1">
                    <label htmlFor="couponsEnabled" className="block text-sm font-medium text-gray-900 dark:text-neutral-100">
                      Enable Coupons
                    </label>
                    <span className="block text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      Allow coupon codes at POS
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    id="couponsEnabled"
                    checked={formData.couponsEnabled}
                    onChange={(e) => setFormData({ ...formData, couponsEnabled: e.target.checked })}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-neutral-700 dark:border-neutral-600 ml-3"
                  />
                </div>
              </div>
            </div>

            {/* Branding */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 mb-3">Branding</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Business Slogan
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    className="input-field"
                    value={formData.slogan}
                    onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                    placeholder="Where Customer Is King"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="showSlogan"
                      checked={formData.showSlogan}
                      onChange={(e) => setFormData({ ...formData, showSlogan: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-neutral-700 dark:border-neutral-600"
                    />
                    <label htmlFor="showSlogan" className="text-sm text-gray-700 dark:text-gray-300">
                      Show on customer display
                    </label>
                  </div>
                </div>
                {(hasPermission('canChangeDefaultPage') || isSystemAdmin) && (
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Default Landing Page
                    </label>
                    <select
                      className="input-field"
                      value={formData.defaultPage}
                      onChange={(e) => setFormData({ ...formData, defaultPage: e.target.value })}
                    >
                      <option value="">Home (Default)</option>
                      {getDefaultPageOptions(formData.type).map(option => (
                        <option key={option.value} value={option.value}>
                          {option.icon} {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Page shown when users select this business
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Receipt & Tax */}
            <div className="pt-4 border-t border-gray-200 dark:border-neutral-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 mb-3">Receipt & Tax</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Return Policy Message
                  </label>
                  <textarea
                    value={formData.receiptReturnPolicy}
                    onChange={(e) => setFormData({...formData, receiptReturnPolicy: e.target.value})}
                    rows={2}
                    className="input-field"
                    placeholder="All sales are final, returns not accepted"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-md border border-gray-200 dark:border-neutral-700">
                  <div className="flex-1">
                    <label htmlFor="taxEnabled" className="block text-sm font-medium text-gray-900 dark:text-neutral-100">
                      Enable Tax Calculation
                    </label>
                    <span className="block text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      When enabled, tax will be applied to sales
                    </span>
                  </div>
                  <input
                    id="taxEnabled"
                    type="checkbox"
                    checked={formData.taxEnabled}
                    onChange={(e) => setFormData({...formData, taxEnabled: e.target.checked})}
                    className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 ml-3"
                  />
                </div>
                {formData.taxEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-md border border-gray-200 dark:border-neutral-700">
                    <div className="flex-1">
                      <label htmlFor="taxIncluded" className="block text-sm font-medium text-gray-900 dark:text-neutral-100">
                        Tax Included in Price
                      </label>
                      <span className="block text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        {formData.taxIncludedInPrice
                          ? 'Tax is embedded in product prices'
                          : 'Tax calculated separately at checkout'}
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
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">
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
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">
                        Tax Label
                      </label>
                      <input
                        type="text"
                        value={formData.taxLabel}
                        onChange={(e) => setFormData({...formData, taxLabel: e.target.value})}
                        className="input-field"
                        placeholder="e.g., VAT, Sales Tax, GST"
                      />
                    </div>
                  </div>
                </div>
                )}
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-neutral-800 border-t border-gray-200 dark:border-neutral-700 px-6 py-4 flex justify-end space-x-3">
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
