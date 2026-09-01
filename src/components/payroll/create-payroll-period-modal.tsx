"use client"

import { useState } from 'react'
import type { OnSuccessArg } from '@/types/ui'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { useToastContext } from '@/components/ui/toast'
import { DateInput } from '@/components/ui/date-input'

interface CreatePayrollPeriodModalProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
  isUmbrella?: boolean
  targetAllEmployees?: boolean
  onSuccess: (payload: OnSuccessArg) => void
  onError: (error: string) => void
}

function getMonthDates(year: number, month: number) {
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { periodStart: firstDay, periodEnd: lastDayStr }
}

// A payroll period can only be for a month that's already fully ended (the
// API enforces this too — see POST /api/payroll/periods) — this is the most
// recently completed one, i.e. what an admin almost always actually means
// when creating a new period right after a month closes.
function getMostRecentCompletedMonth(now: Date) {
  const currentMonth = now.getMonth() + 1 // 1-based
  const currentYear = now.getFullYear()
  return currentMonth === 1
    ? { year: currentYear - 1, month: 12 }
    : { year: currentYear, month: currentMonth - 1 }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function CreatePayrollPeriodModal({
  isOpen,
  onClose,
  businessId,
  isUmbrella = false,
  targetAllEmployees = false,
  onSuccess,
  onError
}: CreatePayrollPeriodModalProps) {
  const [loading, setLoading] = useState(false)
  const toast = useToastContext()
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  // Selectable years: this year and the two before it — never a future year.
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear]
  // For the current year, only months strictly before this one are
  // selectable (a fully-completed month); any earlier year allows all 12.
  const monthOptionsFor = (year: number) =>
    year === currentYear
      ? MONTH_NAMES.map((label, i) => ({ value: i + 1, label })).filter((m) => m.value < currentMonth)
      : MONTH_NAMES.map((label, i) => ({ value: i + 1, label }))

  const [formData, setFormData] = useState(() => {
    const { year, month } = getMostRecentCompletedMonth(now)
    return { year, month, ...getMonthDates(year, month), notes: '' }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await fetchWithValidation('/api/payroll/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, ...formData, targetAllEmployees: !!targetAllEmployees })
      })

      // Success
      toast.push('Payroll period created successfully')
  try { onSuccess({ message: 'Payroll period created successfully', id: result.id, refresh: false }) } catch (e) { }
      onClose()
      const { year: resetYear, month: resetMonth } = getMostRecentCompletedMonth(new Date())
      setFormData({ year: resetYear, month: resetMonth, ...getMonthDates(resetYear, resetMonth), notes: '' })
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
                onChange={(e) => {
                  const year = parseInt(e.target.value)
                  // If the currently selected month isn't valid for the
                  // newly selected year (e.g. year becomes this year and
                  // the month was set to one still in progress or later),
                  // clamp down to the latest valid month for it instead.
                  const validMonths = monthOptionsFor(year)
                  const month = validMonths.some((m) => m.value === formData.month)
                    ? formData.month
                    : validMonths[validMonths.length - 1].value
                  setFormData({ ...formData, year, month, ...getMonthDates(year, month) })
                }}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {yearOptions.map(year => (
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
                onChange={(e) => { const month = parseInt(e.target.value); setFormData({ ...formData, month, ...getMonthDates(formData.year, month) }) }}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {monthOptionsFor(formData.year).map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
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
              onChange={(value) => {
                // Auto-sync year and month from periodStart date
                // AND auto-set periodEnd to last day of that month
                if (value) {
                  try {
                    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
                    if (match) {
                      const year = parseInt(match[1], 10)
                      const month = parseInt(match[2], 10)
                      const lastDay = new Date(year, month, 0).getDate()
                      const lastDayOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
                      setFormData({ ...formData, periodStart: value, periodEnd: lastDayOfMonth, year, month })
                      return
                    }
                  } catch (e) { /* ignore */ }
                }
                setFormData({ ...formData, periodStart: value })
              }}
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
