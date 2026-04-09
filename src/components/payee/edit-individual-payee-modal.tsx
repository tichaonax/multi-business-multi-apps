'use client'

import { useState, useEffect } from 'react'
import { NationalIdInput } from '@/components/ui/national-id-input'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'

interface EditIndividualPayeeModalProps {
  payeeId: string
  onClose: () => void
  onSuccess: () => void
}

export function EditIndividualPayeeModal({ payeeId, onClose, onSuccess }: EditIndividualPayeeModalProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    nationalId: '',
    idFormatTemplateId: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    isActive: true,
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/payees/PERSON/${payeeId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(result => {
        if (result.success) {
          const p = result.data.payee
          setFormData({
            fullName: p.fullName || '',
            nationalId: p.nationalId || '',
            idFormatTemplateId: p.idFormatTemplateId || '',
            phone: p.phone || '',
            email: p.email || '',
            address: p.address || '',
            notes: p.notes || '',
            isActive: p.isActive,
          })
        } else {
          setError('Failed to load payee details')
        }
      })
      .catch(() => setError('Failed to load payee details'))
      .finally(() => setLoading(false))
  }, [payeeId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const response = await fetch(`/api/payees/individuals/${payeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      })
      if (response.ok) {
        onSuccess()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update payee')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const set = (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFormData(prev => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-semibold">Edit Individual Payee</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={submitting}>✕</button>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="mt-2 text-secondary">Loading...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300 rounded text-sm">
                  {error}
                </div>
              )}

              {/* Row 1: Full Name + Active */}
              <div className="grid grid-cols-3 gap-4 items-end">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={set('fullName')}
                    className="input w-full px-4 py-2.5"
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded"
                    disabled={submitting}
                  />
                  <label htmlFor="isActive" className="text-sm font-medium">Active</label>
                </div>
              </div>

              {/* Row 2: National ID */}
              <div>
                <label className="block text-sm font-medium mb-1">National ID</label>
                <NationalIdInput
                  value={formData.nationalId}
                  onChange={value => setFormData(prev => ({ ...prev, nationalId: value }))}
                  templateId={formData.idFormatTemplateId}
                  onTemplateChange={templateId => setFormData(prev => ({ ...prev, idFormatTemplateId: templateId }))}
                  disabled={submitting}
                  required={false}
                />
              </div>

              {/* Row 3: Phone + Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <PhoneNumberInput
                    value={formData.phone}
                    onChange={value => setFormData(prev => ({ ...prev, phone: value }))}
                    disabled={submitting}
                    required={false}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={set('email')}
                    className="input w-full px-4 py-2.5"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Row 4: Address + Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={set('address')}
                    className="input w-full px-4 py-2"
                    rows={2}
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={set('notes')}
                    className="input w-full px-4 py-2"
                    rows={2}
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
