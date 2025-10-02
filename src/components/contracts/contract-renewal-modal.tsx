'use client'

import { useState } from 'react'
import { X, Calendar, RotateCcw, Clock, FileText } from 'lucide-react'
import { DateInput } from '@/components/ui/date-input'

interface ContractRenewalModalProps {
  contract: {
    id: string
    contractNumber: string
    employeeName: string
    startDate: string
    endDate?: string
    contractDurationMonths?: number
    jobTitle: string
    baseSalary: number
  }
  isOpen: boolean
  onClose: () => void
  onRenew: (renewalData: RenewalData) => Promise<void>
}

interface RenewalData {
  renewalType: 'same_duration' | 'extend_months' | 'custom_dates'
  extendMonths?: number
  customStartDate?: string
  customEndDate?: string
  notes?: string
}

export function ContractRenewalModal({
  contract,
  isOpen,
  onClose,
  onRenew
}: ContractRenewalModalProps) {
  const [renewalType, setRenewalType] = useState<'same_duration' | 'extend_months' | 'custom_dates'>('same_duration')
  const [extendMonths, setExtendMonths] = useState(12)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  // Calculate renewal dates for preview
  const calculateRenewalDates = () => {
    const originalStart = new Date(contract.startDate)
    const originalEnd = contract.endDate ? new Date(contract.endDate) : null

    let newStartDate: Date
    let newEndDate: Date | null = null

    if (renewalType === 'custom_dates') {
      newStartDate = customStartDate ? new Date(customStartDate) : new Date()
      newEndDate = customEndDate ? new Date(customEndDate) : null
    } else {
      // Start date is the day after original contract ends, or today if no end date
      newStartDate = originalEnd
        ? new Date(originalEnd.getTime() + 24 * 60 * 60 * 1000)
        : new Date()

      if (renewalType === 'same_duration' && originalEnd && originalStart) {
        // Calculate original duration and apply it
        const originalDuration = originalEnd.getTime() - originalStart.getTime()
        newEndDate = new Date(newStartDate.getTime() + originalDuration)
      } else if (renewalType === 'extend_months') {
        // Extend by specified months
        newEndDate = new Date(newStartDate)
        newEndDate.setMonth(newEndDate.getMonth() + extendMonths)
      }
    }

    return { newStartDate, newEndDate }
  }

  const { newStartDate, newEndDate } = calculateRenewalDates()

  const getOriginalDuration = () => {
    if (!contract.endDate) return 'No end date'
    const start = new Date(contract.startDate)
    const end = new Date(contract.endDate)
    const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    return `${months} months`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)

      const renewalData: RenewalData = {
        renewalType,
        ...(renewalType === 'extend_months' && { extendMonths }),
        ...(renewalType === 'custom_dates' && {
          customStartDate: customStartDate,
          customEndDate: customEndDate
        }),
        notes: notes.trim() || undefined
      }

      await onRenew(renewalData)
      onClose()
    } catch (error) {
      console.error('Error renewing contract:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <RotateCcw className="h-6 w-6 text-green-600" />
              <div>
                <h2 className="text-xl font-semibold text-primary">Renew Contract</h2>
                <p className="text-sm text-secondary">Create a new contract with the same terms</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Current Contract Info */}
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <h3 className="font-medium text-primary mb-3">Current Contract</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-secondary">Employee:</span>
                  <div className="font-medium">{contract.employeeName}</div>
                </div>
                <div>
                  <span className="text-secondary">Contract #:</span>
                  <div className="font-medium">{contract.contractNumber}</div>
                </div>
                <div>
                  <span className="text-secondary">Position:</span>
                  <div className="font-medium">{contract.jobTitle}</div>
                </div>
                <div>
                  <span className="text-secondary">Salary:</span>
                  <div className="font-medium">${contract.baseSalary.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-secondary">Start Date:</span>
                  <div className="font-medium">{new Date(contract.startDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <span className="text-secondary">End Date:</span>
                  <div className="font-medium">
                    {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'No end date'}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-secondary">Original Duration:</span>
                  <div className="font-medium">{getOriginalDuration()}</div>
                </div>
              </div>
            </div>

            {/* Renewal Options */}
            <div className="space-y-4">
              <h3 className="font-medium text-primary">Renewal Options</h3>

              <div className="space-y-3">
                {/* Same Duration */}
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                  <input
                    type="radio"
                    name="renewalType"
                    value="same_duration"
                    checked={renewalType === 'same_duration'}
                    onChange={(e) => setRenewalType(e.target.value as any)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-sm">Same Duration</div>
                    <div className="text-xs text-secondary">
                      Renew for the same duration as the original contract ({getOriginalDuration()})
                    </div>
                  </div>
                </label>

                {/* Extend by Months */}
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                  <input
                    type="radio"
                    name="renewalType"
                    value="extend_months"
                    checked={renewalType === 'extend_months'}
                    onChange={(e) => setRenewalType(e.target.value as any)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Extend by Months</div>
                    <div className="text-xs text-secondary mb-2">
                      Specify the number of months for the new contract
                    </div>
                    {renewalType === 'extend_months' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={extendMonths}
                          onChange={(e) => setExtendMonths(parseInt(e.target.value) || 12)}
                          className="w-20 px-2 py-1 border rounded text-sm"
                        />
                        <span className="text-sm text-secondary">months</span>
                      </div>
                    )}
                  </div>
                </label>

                {/* Custom Dates */}
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                  <input
                    type="radio"
                    name="renewalType"
                    value="custom_dates"
                    checked={renewalType === 'custom_dates'}
                    onChange={(e) => setRenewalType(e.target.value as any)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Custom Dates</div>
                    <div className="text-xs text-secondary mb-2">
                      Specify exact start and end dates
                    </div>
                    {renewalType === 'custom_dates' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-secondary mb-1">Start Date</label>
                          <DateInput
                            value={customStartDate}
                            onChange={setCustomStartDate}
                            required
                            className="w-full text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-secondary mb-1">End Date</label>
                          <DateInput
                            value={customEndDate}
                            onChange={setCustomEndDate}
                            required
                            className="w-full text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="font-medium text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Renewal Preview
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-green-700 dark:text-green-300">New Start Date:</span>
                  <div className="font-medium text-green-900 dark:text-green-100">
                    {newStartDate.toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-green-700 dark:text-green-300">New End Date:</span>
                  <div className="font-medium text-green-900 dark:text-green-100">
                    {newEndDate ? newEndDate.toLocaleDateString() : 'No end date'}
                  </div>
                </div>
                {newEndDate && (
                  <div className="col-span-2">
                    <span className="text-green-700 dark:text-green-300">Duration:</span>
                    <div className="font-medium text-green-900 dark:text-green-100">
                      {Math.round((newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60 * 24))} days
                      ({Math.round((newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))} months)
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Renewal Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this renewal..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <RotateCcw className="h-4 w-4" />
                {loading ? 'Renewing...' : 'Renew Contract'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}