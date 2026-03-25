'use client'

import { useState, useEffect, useRef } from 'react'
import { EmojiPicker } from '@/components/common/emoji-picker'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { StarRating } from '@/components/ui/star-rating'

function fmtCurrency(amount: number) {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
const REQ_STATUS_COLORS: Record<string, string> = {
  PENDING:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  APPROVED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  PARTIAL:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  PAID:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  DENIED:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

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
  hasSpecialInstructions?: boolean
  specialInstructions?: string | null
  posBlocked?: boolean
  discontinued?: boolean
  supplierType?: string | null
}

interface SupplierEditorProps {
  supplier?: Supplier | null
  businessId: string
  onSave: (createdSupplierId?: string) => void
  onCancel: () => void
  initialName?: string
  focusField?: string  // Field to highlight and scroll to on open (e.g. 'taxId')
  viewOnly?: boolean   // When true: read-only view, no save button
  averageRating?: number | null  // Average star rating (null = no ratings yet → show default 2)
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

// Predefined supplier types with emojis
export const SUPPLIER_TYPES: { label: string; emoji: string }[] = [
  { label: 'Fresh Produce',       emoji: '🥦' },
  { label: 'Dry Goods',           emoji: '🌾' },
  { label: 'Beverages',           emoji: '🥤' },
  { label: 'Dairy',               emoji: '🧈' },
  { label: 'Meat & Poultry',      emoji: '🥩' },
  { label: 'Seafood',             emoji: '🐟' },
  { label: 'Bakery',              emoji: '🍞' },
  { label: 'Frozen Foods',        emoji: '❄️' },
  { label: 'Hardware',            emoji: '🔧' },
  { label: 'Electronics',         emoji: '⚡' },
  { label: 'Clothing',            emoji: '👕' },
  { label: 'Building Materials',  emoji: '🏗️' },
  { label: 'Cleaning Supplies',   emoji: '🧹' },
  { label: 'Stationery',          emoji: '📝' },
  { label: 'Packaging',           emoji: '📦' },
  { label: 'Pharmaceuticals',     emoji: '💊' },
  { label: 'Automotive',          emoji: '🚗' },
  { label: 'Agricultural',        emoji: '🌱' },
  { label: 'Chemicals',           emoji: '⚗️' },
  { label: 'Food & Catering',     emoji: '🍽️' },
  { label: 'General Merchandise', emoji: '🛒' },
  { label: 'Services',            emoji: '🛠️' },
]

export function getSupplierTypeEmoji(type: string | null | undefined): string {
  if (!type) return ''
  const match = SUPPLIER_TYPES.find(t => t.label.toLowerCase() === type.toLowerCase())
  return match ? match.emoji : '🏪'
}

export function SupplierEditor({ supplier, businessId, onSave, onCancel, initialName, focusField, viewOnly, averageRating }: SupplierEditorProps) {
  const taxIdRef = useRef<HTMLInputElement>(null)
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
    hasSpecialInstructions: false,
    specialInstructions: null,
    posBlocked: false,
    discontinued: false,
    supplierType: null,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentData, setPaymentData] = useState<{ summary: any; requests: any[] } | null>(null)
  const [loadingPayment, setLoadingPayment] = useState(false)

  // Inline rating
  const [localRating, setLocalRating] = useState(0)
  const [savingRating, setSavingRating] = useState(false)
  const [ratingSaved, setRatingSaved] = useState(false)
  const [ratingError, setRatingError] = useState<string | null>(null)

  const submitRating = async () => {
    if (!supplier?.id || !localRating) return
    setSavingRating(true)
    setRatingError(null)
    try {
      const res = await fetch(`/api/business/${businessId}/suppliers/${supplier.id}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: localRating }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setRatingError(data.error || 'Failed to save rating')
        return
      }
      setRatingSaved(true)
      setTimeout(() => setRatingSaved(false), 3000)
    } catch {
      setRatingError('Failed to save rating')
    } finally {
      setSavingRating(false)
    }
  }

  useEffect(() => {
    if (!supplier && initialName) {
      setFormData(prev => ({ ...prev, name: initialName }))
    }
  }, [initialName, supplier])

  // Scroll to and highlight the field that needs attention
  useEffect(() => {
    if (focusField === 'taxId' && taxIdRef.current) {
      setTimeout(() => {
        taxIdRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        taxIdRef.current?.focus()
      }, 200)
    }
  }, [focusField, supplier])

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
        hasSpecialInstructions: supplier.hasSpecialInstructions || false,
        specialInstructions: supplier.specialInstructions || null,
        posBlocked: supplier.posBlocked || false,
        discontinued: supplier.discontinued || false,
        supplierType: supplier.supplierType || null,
      })
    }
  }, [supplier])

  // Fetch payment history when opened in viewOnly mode
  useEffect(() => {
    if (!viewOnly || !supplier?.id || !businessId) return
    setLoadingPayment(true)
    fetch(`/api/business/${businessId}/suppliers/${supplier.id}/payment-history`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.success) {
          setPaymentData({ summary: data.data.summary, requests: data.data.requests })
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPayment(false))
  }, [viewOnly, supplier?.id, businessId])

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

    if (!formData.phone?.trim()) {
      setError('Phone number is required')
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full my-8" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            {supplier?.name ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                  {viewOnly ? 'Supplier Details' : 'Edit Supplier'}
                </p>
                <h2 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 leading-tight">
                  {supplier.emoji ? `${supplier.emoji} ` : ''}{supplier.name}
                </h2>
              </>
            ) : (
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Create Supplier
              </h2>
            )}
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
            {supplier && !viewOnly && (
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
          <div className="px-6 py-4 max-h-[calc(100vh-250px)] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Financial Summary Banner (viewOnly mode) */}
            {viewOnly && (
              <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Payment Financial Summary</p>
                {loadingPayment ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
                    Loading financial data...
                  </div>
                ) : paymentData ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2 bg-white dark:bg-slate-700 rounded text-center">
                        <div className="text-base font-bold text-slate-800 dark:text-slate-100">{fmtCurrency(paymentData.summary.totalRequested)}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Submitted</div>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-700 rounded text-center">
                        <div className="text-base font-bold text-blue-600 dark:text-blue-400">{fmtCurrency(paymentData.summary.totalApproved ?? 0)}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Approved</div>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-700 rounded text-center">
                        <div className="text-base font-bold text-green-600 dark:text-green-400">{fmtCurrency(paymentData.summary.totalPaid)}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Paid</div>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-700 rounded text-center">
                        <div className={`text-base font-bold ${paymentData.summary.totalOutstanding > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`}>
                          {fmtCurrency(paymentData.summary.totalOutstanding)}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">Outstanding</div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                      {paymentData.summary.pendingCount > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">⏳ {paymentData.summary.pendingCount} pending request{paymentData.summary.pendingCount !== 1 ? 's' : ''}</span>
                      )}
                      {paymentData.summary.lastPaymentDate && (
                        <span>Last payment: <strong>{fmtDate(paymentData.summary.lastPaymentDate)}</strong></span>
                      )}
                      {paymentData.summary.oldestPendingDate && (
                        <span>Oldest pending: <strong>{fmtDate(paymentData.summary.oldestPendingDate)}</strong></span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">No payment history available.</p>
                )}
              </div>
            )}

            {/* Rate this supplier — visible for existing suppliers in both edit and viewOnly modes */}
            {supplier?.id && (
              <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">Rate this Supplier</p>
                    <div className="flex items-center gap-2 mb-1">
                      <StarRating value={localRating > 0 ? localRating : (averageRating !== null && averageRating !== undefined ? Math.round(averageRating) : 2)} onChange={setLocalRating} size="md" />
                      {localRating > 0 && (
                        <button type="button" onClick={() => setLocalRating(0)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                          Clear
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-500">
                      {averageRating !== null && averageRating !== undefined
                        ? `Average: ${averageRating.toFixed(1)} stars`
                        : 'No ratings yet — default 2 stars'}
                    </p>
                  </div>
                  {localRating > 0 && (
                    <button
                      type="button"
                      onClick={submitRating}
                      disabled={savingRating}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg disabled:opacity-60"
                    >
                      {savingRating ? 'Saving...' : ratingSaved ? '✓ Saved' : 'Save Rating'}
                    </button>
                  )}
                </div>
                {ratingError && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">{ratingError}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Supplier Name — full width at top */}
              <div className="md:col-span-3 lg:col-span-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 read-only:bg-gray-50 dark:read-only:bg-gray-800/50"
                  readOnly={viewOnly}
                  required={!viewOnly}
                />
              </div>

              {/* Emoji picker — full width so results row has maximum space */}
              <div className="md:col-span-3 lg:col-span-4">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Emoji
                </label>
                <EmojiPicker
                  onSelect={viewOnly ? () => {} : (emoji) => handleInputChange('emoji', emoji)}
                  selectedEmoji={formData.emoji || undefined}
                  searchPlaceholder="Search supplier emoji..."
                  compact={true}
                  businessId={businessId}
                  context="supplier"
                  disabled={viewOnly}
                />
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.contactPerson || ''}
                  onChange={(e) => handleInputChange('contactPerson', e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 read-only:bg-gray-50 dark:read-only:bg-gray-800/50"
                  readOnly={viewOnly}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 read-only:bg-gray-50 dark:read-only:bg-gray-800/50"
                  readOnly={viewOnly}
                />
              </div>

              {/* Phone */}
              <div className="md:col-span-2 lg:col-span-2">
                <PhoneNumberInput
                  value={formData.phone || ''}
                  onChange={viewOnly ? () => {} : handlePhoneChange}
                  label={viewOnly ? 'Phone' : 'Phone *'}
                  readOnly={viewOnly}
                />
              </div>

              {/* Tax ID */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${focusField === 'taxId' ? 'text-yellow-600 dark:text-yellow-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                  TAX ID / EIN {focusField === 'taxId' && <span className="text-yellow-500">← Required for large payments</span>}
                </label>
                <input
                  ref={taxIdRef}
                  type="text"
                  value={formData.taxId || ''}
                  onChange={(e) => handleInputChange('taxId', e.target.value || null)}
                  placeholder="12-3456789"
                  readOnly={viewOnly}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 read-only:bg-gray-50 dark:read-only:bg-gray-800/50 ${
                    focusField === 'taxId'
                      ? 'border-yellow-400 dark:border-yellow-500 ring-2 ring-yellow-300 dark:ring-yellow-600'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>

              {/* Supplier Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Supplier Type
                </label>
                {viewOnly ? (
                  <div className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                    {formData.supplierType
                      ? `${getSupplierTypeEmoji(formData.supplierType)} ${formData.supplierType}`
                      : <span className="text-gray-400">Not set</span>}
                  </div>
                ) : (
                  <select
                    value={formData.supplierType || ''}
                    onChange={(e) => handleInputChange('supplierType', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">— Select type —</option>
                    {SUPPLIER_TYPES.map(t => (
                      <option key={t.label} value={t.label}>{t.emoji} {t.label}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Payment Terms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Terms
                </label>
                <select
                  value={formData.paymentTerms || ''}
                  onChange={(e) => handleInputChange('paymentTerms', e.target.value || null)}
                  disabled={viewOnly}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 disabled:bg-gray-50 dark:disabled:bg-gray-800/50"
                >
                  <option value="">Select...</option>
                  {PAYMENT_TERMS.map(term => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
              </div>

              {/* Credit Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Credit Limit
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.creditLimit || ''}
                  onChange={(e) => handleInputChange('creditLimit', e.target.value ? parseFloat(e.target.value) : null)}
                  readOnly={viewOnly}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 read-only:bg-gray-50 dark:read-only:bg-gray-800/50"
                />
              </div>

              {/* Account Balance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.accountBalance || 0}
                  onChange={(e) => handleInputChange('accountBalance', e.target.value ? parseFloat(e.target.value) : 0)}
                  readOnly={viewOnly}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 read-only:bg-gray-50 dark:read-only:bg-gray-800/50"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Amount owed to supplier
                </p>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-2 self-end pb-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  disabled={viewOnly}
                  className="rounded border-gray-300 disabled:opacity-60"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active Supplier
                </label>
              </div>

              {/* Discontinued */}
              <div className="flex items-center gap-2 self-end pb-2">
                <input
                  type="checkbox"
                  id="discontinued"
                  checked={formData.discontinued || false}
                  onChange={(e) => handleInputChange('discontinued', e.target.checked)}
                  disabled={viewOnly}
                  className="rounded border-gray-300 disabled:opacity-60"
                />
                <label htmlFor="discontinued" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Discontinued
                  <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 font-normal">(no new payment requests from anyone)</span>
                </label>
              </div>

              {/* POS Blocked */}
              <div className="flex items-center gap-2 self-end pb-2">
                <input
                  type="checkbox"
                  id="posBlocked"
                  checked={formData.posBlocked || false}
                  onChange={(e) => handleInputChange('posBlocked', e.target.checked)}
                  disabled={viewOnly}
                  className="rounded border-gray-300 disabled:opacity-60"
                />
                <label htmlFor="posBlocked" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Block POS from submitting payments
                  <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 font-normal">(managers can still pay directly)</span>
                </label>
              </div>

              {/* Special Instructions - full width */}
              <div className="md:col-span-3 lg:col-span-4">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="hasSpecialInstructions"
                    checked={formData.hasSpecialInstructions || false}
                    onChange={(e) => {
                      handleInputChange('hasSpecialInstructions', e.target.checked)
                      if (!e.target.checked) handleInputChange('specialInstructions', null)
                    }}
                    disabled={viewOnly}
                    className="rounded border-gray-300 disabled:opacity-60"
                  />
                  <label htmlFor="hasSpecialInstructions" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Special Instructions for POS
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 font-normal">(shown as a banner when POS submits a payment request)</span>
                  </label>
                </div>
                {formData.hasSpecialInstructions && (
                  <textarea
                    value={formData.specialInstructions || ''}
                    onChange={(e) => handleInputChange('specialInstructions', e.target.value || null)}
                    rows={2}
                    readOnly={viewOnly}
                    placeholder="e.g. Always request receipt, verify quantity before paying..."
                    className="w-full px-3 py-2 border border-amber-300 dark:border-amber-600 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-gray-900 dark:text-gray-100 read-only:opacity-70"
                  />
                )}
              </div>

              {/* Address - full width on md, half on lg (side-by-side with Notes) */}
              <div className="md:col-span-3 lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value || null)}
                  rows={2}
                  readOnly={viewOnly}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 read-only:bg-gray-50 dark:read-only:bg-gray-800/50"
                />
              </div>

              {/* Notes - full width on md, half on lg (side-by-side with Address) */}
              <div className="md:col-span-3 lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value || null)}
                  rows={2}
                  readOnly={viewOnly}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 read-only:bg-gray-50 dark:read-only:bg-gray-800/50"
                  placeholder="Additional notes about this supplier..."
                />
              </div>
            </div>

            {/* Recent Activity (viewOnly mode) */}
            {viewOnly && paymentData && paymentData.requests.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
                  Recent Payment Activity ({paymentData.requests.length} request{paymentData.requests.length !== 1 ? 's' : ''})
                </p>
                <div className="space-y-2">
                  {paymentData.requests.slice(0, 5).map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-1.5 py-0.5 text-xs rounded font-medium shrink-0 ${REQ_STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-600'}`}>
                          {req.status}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs shrink-0">{fmtDate(req.submittedAt)}</span>
                        {req.notes && (
                          <span className="text-gray-400 dark:text-gray-500 text-xs truncate">{req.notes}</span>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{fmtCurrency(req.amount)}</span>
                        {req.paidAmount > 0 && req.paidAmount < req.amount && (
                          <div className="text-xs text-green-600 dark:text-green-400">{fmtCurrency(req.paidAmount)} paid</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {paymentData.requests.length > 5 && (
                    <p className="text-xs text-slate-400 text-center pt-1">+ {paymentData.requests.length - 5} more request{paymentData.requests.length - 5 !== 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            {viewOnly ? (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            ) : (
              <>
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
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
