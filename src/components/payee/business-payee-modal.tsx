'use client'

import { useState, useEffect } from 'react'

const BUSINESS_TYPES = [
  { value: 'clothing', label: 'Clothing' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'construction', label: 'Construction' },
  { value: 'services', label: 'Services' },
  { value: 'retail', label: 'Retail' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'other', label: 'Other' },
]

interface BusinessPayeeModalProps {
  /** If provided, modal opens in edit mode for this business ID */
  payeeId?: string
  onClose: () => void
  onSuccess: () => void
}

export function BusinessPayeeModal({ payeeId, onClose, onSuccess }: BusinessPayeeModalProps) {
  const isEdit = !!payeeId

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    phone: '',
    address: '',
  })
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isEdit) {
      fetch(`/api/payees/businesses/${payeeId}`, { credentials: 'include' })
        .then(r => r.json())
        .then(result => {
          if (result.success) {
            const b = result.data
            setFormData({
              name: b.name || '',
              type: b.type || '',
              phone: b.phone || '',
              address: b.address || '',
            })
          } else {
            setError('Failed to load business details')
          }
        })
        .catch(() => setError('Failed to load business details'))
        .finally(() => setLoading(false))
    }
  }, [payeeId, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const url = isEdit ? `/api/payees/businesses/${payeeId}` : '/api/payees/businesses'
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      })

      if (response.ok) {
        onSuccess()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save business payee')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const set = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFormData(prev => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">{isEdit ? 'Edit Business Payee' : 'Add Business Payee'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={submitting}>✕</button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="mt-2 text-secondary">Loading...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={set('name')}
                  className="input w-full px-4 py-2.5"
                  placeholder="e.g. Acme Supplies Ltd"
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Business Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={set('type')}
                  className="input w-full px-4 py-2.5"
                  required
                  disabled={submitting}
                >
                  <option value="">Select type…</option>
                  {BUSINESS_TYPES.map(bt => (
                    <option key={bt.value} value={bt.value}>{bt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={set('phone')}
                  className="input w-full px-4 py-2.5"
                  placeholder="+263 77 123 4567"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={set('address')}
                  className="input w-full px-4 py-2.5"
                  rows={2}
                  placeholder="Optional"
                  disabled={submitting}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Business Payee'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
