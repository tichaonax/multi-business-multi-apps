"use client"

import { useState } from 'react'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { useToastContext } from '@/components/ui/toast'
import { DateInput } from '@/components/ui/date-input'

interface CreatePayrollPeriodModalProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
  onSuccess: (message: string, periodId?: string) => void
  onError: (error: string) => void
}

export function CreatePayrollPeriodModal({
  isOpen,
  onClose,
  businessId,
  onSuccess,
  onError
}: CreatePayrollPeriodModalProps) {
  const [loading, setLoading] = useState(false)
  const toast = useToastContext()
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    periodStart: '',
    periodEnd: '',
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await fetchWithValidation('/api/payroll/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, ...formData })
      })

      // Success
      toast.push('Payroll period created successfully')
      try { onSuccess('Payroll period created successfully', result.id) } catch (e) { }
      onClose()
      setFormData({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        periodStart: '',
        periodEnd: '',
        notes: ''
      })
    } catch (error) {
      console.error('Create payroll period error:', error)
      // fetchWithValidation throws an Error with message from backend (body.error || body.message)
      const message = error instanceof Error ? error.message : 'Failed to create payroll period'
      toast.push(message)
      try { onError(message) } catch (e) { }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-primary mb-4">Create Payroll Period</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Year <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {[2024, 2025, 2026, 2027].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Month <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map((month, index) => (
                  <option key={index + 1} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Period Start <span className="text-red-500">*</span>
            </label>
            <DateInput
              value={formData.periodStart}
              onChange={(value) => setFormData({ ...formData, periodStart: value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Period End <span className="text-red-500">*</span>
            </label>
            <DateInput
              value={formData.periodEnd}
              onChange={(value) => setFormData({ ...formData, periodEnd: value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Optional notes about this payroll period"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-secondary bg-background border border-border rounded-md hover:bg-muted"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Period'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
