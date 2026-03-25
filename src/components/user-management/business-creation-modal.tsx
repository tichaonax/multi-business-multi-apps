'use client'

import { useState, useEffect } from 'react'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { getDefaultPageOptions } from '@/lib/business-default-pages'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { RentAccountSetupModal } from '@/components/rent-account/rent-account-setup-modal'
import { RentAccountManageModal } from '@/components/rent-account/rent-account-manage-modal'

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
    ecocashFeeType?: string
    ecocashFeeValue?: string
    ecocashMinimumFee?: string
    couponsEnabled?: boolean
    promosEnabled?: boolean
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

const ECOCASH_DEFAULT_FEES: Record<string, string> = {
  restaurant: '0.20',
  grocery: '0.50',
  clothing: '0.50',
  hardware: '0.50',
}

export function BusinessCreationModal({ onClose, onSuccess, onError, initial, method = 'POST', id }: BusinessCreationModalProps) {
  const { hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const [formData, setFormData] = useState({
    name: initial?.name || '',
    type: initial?.type || 'other',
    description: initial?.description || '',
    address: initial?.address || '',
    phone: initial?.phone || '',
    ecocashEnabled: initial?.ecocashEnabled !== undefined ? initial.ecocashEnabled : false,
    ecocashFeeType: initial?.ecocashFeeType || 'FIXED',
    ecocashFeeValue: initial?.ecocashFeeValue || '',
    ecocashMinimumFee: initial?.ecocashMinimumFee || '',
    couponsEnabled: initial?.couponsEnabled !== undefined ? initial.couponsEnabled : false,
    promosEnabled: initial?.promosEnabled !== undefined ? initial.promosEnabled : false,
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
  const [hasRentAccount, setHasRentAccount] = useState(false)
  const [showRentSetupModal, setShowRentSetupModal] = useState(false)
  const [showRentManageModal, setShowRentManageModal] = useState(false)

  // When editing an existing business, fetch missing ecocash fields directly from business-config.
  // The parent (manage page) may have a stale compiled version that omits ecocashMinimumFee.
  useEffect(() => {
    if (method === 'PUT' && id) {
      fetch(`/api/universal/business-config?businessId=${id}`)
        .then(r => r.json())
        .then(data => {
          const cfg = data?.data
          if (!cfg) return
          setFormData(prev => ({
            ...prev,
            ecocashEnabled: cfg.ecocashEnabled !== undefined ? cfg.ecocashEnabled : prev.ecocashEnabled,
            ecocashFeeType: cfg.ecocashFeeType || prev.ecocashFeeType,
            ecocashFeeValue: cfg.ecocashFeeValue !== undefined ? String(cfg.ecocashFeeValue) : prev.ecocashFeeValue,
            ecocashMinimumFee: cfg.ecocashMinimumFee !== undefined ? String(cfg.ecocashMinimumFee) : prev.ecocashMinimumFee,
          }))
        })
        .catch(() => {/* silently ignore, initial values remain */})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (method === 'PUT' && id) {
      fetch(`/api/rent-account/${id}/balance`)
        .then(r => r.ok ? r.json() : { hasRentAccount: false })
        .then(data => setHasRentAccount(!!data.hasRentAccount))
        .catch(() => setHasRentAccount(false))
    }
  }, [method, id])

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
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg w-full max-w-5xl shadow-lg border border-gray-200 dark:border-neutral-700">
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
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

              {/* ── LEFT: Basic Info + Contact + Rent ── */}
              <div className="space-y-5">

                {/* Basic Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 mb-3">Basic Information</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
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
                          Business Type {method !== 'PUT' && <span className="text-red-500">*</span>}
                        </label>
                        {method === 'PUT' ? (
                          <div className="input-field bg-gray-50 dark:bg-neutral-700/50 text-secondary cursor-not-allowed capitalize">
                            {formData.type}
                          </div>
                        ) : (
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
                        )}
                      </div>
                    </div>
                    <div>
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
                  <div className="space-y-3">
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

                {/* Rent Account - Edit mode only */}
                {method === 'PUT' && id && (
                  <div className="pt-4 border-t border-gray-200 dark:border-neutral-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 mb-3">🏠 Rent Account</h3>
                    {hasRentAccount ? (
                      <button
                        type="button"
                        onClick={() => setShowRentManageModal(true)}
                        className="w-full px-4 py-2.5 text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-md hover:bg-orange-100 dark:hover:bg-orange-900/30 text-left flex items-center gap-2"
                      >
                        <span>⚙️ Manage Rent Account</span>
                        <span className="ml-auto text-xs text-orange-500">Active ✓</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowRentSetupModal(true)}
                        className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-neutral-700 border border-dashed border-gray-300 dark:border-neutral-600 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-600 text-left flex items-center gap-2"
                      >
                        <span>+ Create Rent Account</span>
                        <span className="ml-auto text-xs text-gray-400">Not set up</span>
                      </button>
                    )}
                  </div>
                )}

              </div>{/* end LEFT */}

              {/* ── RIGHT: Features + Branding + Receipt & Tax ── */}
              <div className="space-y-5">

                {/* Features */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 mb-3">Features</h3>
                  <div className="space-y-2">
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
                        onChange={(e) => {
                          const enabled = e.target.checked
                          const defaultFee = ECOCASH_DEFAULT_FEES[formData.type] || '0.00'
                          setFormData({
                            ...formData,
                            ecocashEnabled: enabled,
                            ecocashFeeValue: enabled && !formData.ecocashFeeValue ? defaultFee : formData.ecocashFeeValue
                          })
                        }}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-neutral-700 dark:border-neutral-600 ml-3"
                      />
                    </div>

                    {/* EcoCash fee configuration — shown only when ecocashEnabled */}
                    {formData.ecocashEnabled && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800 ml-4">
                        <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-2">EcoCash Fee Configuration</p>
                        <div className="flex gap-3 items-end">
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Fee Type</label>
                            <select
                              value={formData.ecocashFeeType}
                              onChange={(e) => setFormData({ ...formData, ecocashFeeType: e.target.value })}
                              className="px-2 py-1.5 text-sm border rounded bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 text-primary"
                            >
                              <option value="FIXED">Fixed Amount ($)</option>
                              <option value="PERCENTAGE">Percentage (%)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Fee Value {formData.ecocashFeeType === 'FIXED' ? '($)' : '(%)'}
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.ecocashFeeValue}
                              onChange={(e) => setFormData({ ...formData, ecocashFeeValue: e.target.value })}
                              placeholder="0.00"
                              className="w-24 px-2 py-1.5 text-sm border rounded bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 text-primary"
                            />
                          </div>
                          {formData.ecocashFeeType === 'PERCENTAGE' && (
                            <div>
                              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                Min Fee ($)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.ecocashMinimumFee}
                                onChange={(e) => setFormData({ ...formData, ecocashMinimumFee: e.target.value })}
                                placeholder="0.00"
                                className="w-24 px-2 py-1.5 text-sm border rounded bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 text-primary"
                              />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                          {formData.ecocashFeeType === 'FIXED'
                            ? `A fixed $${formData.ecocashFeeValue || '0.00'} fee is added to every EcoCash transaction.`
                            : `${formData.ecocashFeeValue || '0'}% of the sale total is added as an EcoCash fee${formData.ecocashMinimumFee ? `, minimum $${formData.ecocashMinimumFee}` : ''}.`}
                        </p>
                      </div>
                    )}

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
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-md border border-gray-200 dark:border-neutral-700">
                      <div className="flex-1">
                        <label htmlFor="promosEnabled" className="block text-sm font-medium text-gray-900 dark:text-neutral-100">
                          Enable Customer Promos
                        </label>
                        <span className="block text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          Allow spend-based campaign rewards
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        id="promosEnabled"
                        checked={formData.promosEnabled}
                        onChange={(e) => setFormData({ ...formData, promosEnabled: e.target.checked })}
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
                  <div className="space-y-3">
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

              </div>{/* end RIGHT */}

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

    {/* Rent Account modals rendered outside the main modal to avoid z-index clipping */}
    {method === 'PUT' && id && showRentSetupModal && (
      <RentAccountSetupModal
        businessId={id}
        businessType={formData.type}
        businessName={formData.name}
        onSuccess={() => {
          setShowRentSetupModal(false)
          setHasRentAccount(true)
        }}
        onClose={() => setShowRentSetupModal(false)}
      />
    )}
    {method === 'PUT' && id && showRentManageModal && (
      <RentAccountManageModal
        businessId={id}
        businessType={formData.type}
        businessName={formData.name}
        onSuccess={() => setShowRentManageModal(false)}
        onClose={() => setShowRentManageModal(false)}
      />
    )}
  </>
  )
}
