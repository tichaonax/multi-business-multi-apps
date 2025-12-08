'use client'

import { useState, useEffect } from 'react'
import { NationalIdInput } from '@/components/ui/national-id-input'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'

interface EditIndividualPayeeModalProps {
  payeeId: string
  onClose: () => void
  onSuccess: () => void
}

export function EditIndividualPayeeModal({
  payeeId,
  onClose,
  onSuccess
}: EditIndividualPayeeModalProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    nationalId: '',
    idFormatTemplateId: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    isActive: true
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPayeeDetails()
  }, [payeeId])

  const fetchPayeeDetails = async () => {
    try {
      const response = await fetch(`/api/payees/PERSON/${payeeId}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const result = await response.json()
        const payee = result.data.payee

        setFormData({
          fullName: payee.fullName || '',
          nationalId: payee.nationalId || '',
          idFormatTemplateId: payee.idFormatTemplateId || '',
          phone: payee.phone || '',
          email: payee.email || '',
          address: payee.address || '',
          notes: payee.notes || '',
          isActive: payee.isActive
        })
      } else {
        setError('Failed to load payee details')
      }
    } catch (error) {
      console.error('Error fetching payee:', error)
      setError('Failed to load payee details')
    } finally {
      setLoading(false)
    }
  }

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
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update payee')
      }
    } catch (error) {
      console.error('Error updating payee:', error)
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Edit Individual Payee</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={submitting}
            >
              ✕
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-secondary">Loading...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded">
                  {error}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="input w-full px-4 py-2.5 text-base"
                  required
                  disabled={submitting}
                />
              </div>

              {/* National ID */}
              <div>
                <label className="block text-sm font-medium mb-2">National ID</label>
                <NationalIdInput
                  value={formData.nationalId}
                  onChange={(value) => setFormData({ ...formData, nationalId: value })}
                  templateId={formData.idFormatTemplateId}
                  onTemplateChange={(templateId) =>
                    setFormData({ ...formData, idFormatTemplateId: templateId })
                  }
                  disabled={submitting}
                  required={false}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <PhoneNumberInput
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value })}
                  disabled={submitting}
                  required={false}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input w-full px-4 py-2.5 text-base"
                  disabled={submitting}
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input w-full px-4 py-2.5 text-base"
                  rows={2}
                  disabled={submitting}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input w-full px-4 py-2.5 text-base"
                  rows={3}
                  disabled={submitting}
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                  disabled={submitting}
                />
                <label htmlFor="isActive" className="text-sm font-medium">
                  Active
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                >
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
