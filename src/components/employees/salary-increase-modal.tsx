'use client'

import { useState } from 'react'
import { hasPermission, SessionUser } from '@/lib/permission-utils'
import { DateInput } from '@/components/ui/date-input'

interface SalaryIncreaseModalProps {
  employee: {
    id: string
    fullName: string
    currentSalary?: number
    compensationType?: {
      name: string
      type: string
      frequency?: string
    }
  }
  currentUser: SessionUser
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (error: string) => void
}

export function SalaryIncreaseModal({ 
  employee, 
  currentUser, 
  onClose, 
  onSuccess, 
  onError 
}: SalaryIncreaseModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    increasePercentage: '',
    increaseType: 'merit',
    effectiveDate: new Date().toISOString().split('T')[0], // Today's date
    reason: '',
    performancePeriod: '',
    notes: ''
  })

  // Check permissions
  if (!hasPermission(currentUser, 'canApproveSalaryIncreases')) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mx-4 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Insufficient Permissions
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don't have permission to approve salary increases.
          </p>
          <div className="flex justify-end">
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.increasePercentage || !formData.effectiveDate || !formData.reason) {
      onError('Please fill in all required fields')
      return
    }

    const percentage = parseFloat(formData.increasePercentage)
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      onError('Increase percentage must be between 0 and 100')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/employees/${employee.id}/salary-increases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (response.ok) {
        onSuccess(data.message || 'Salary increase approved successfully')
        onClose()
      } else {
        onError(data.error || 'Failed to create salary increase')
      }
    } catch (error) {
      onError('Error creating salary increase')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get salary amounts in correct format
  const getSalaryAmounts = () => {
    if (!employee.currentSalary) return null

    const frequency = employee.compensationType?.frequency || 'monthly'
    const currentSalary = employee.currentSalary

    if (frequency === 'monthly') {
      return {
        annualSalary: currentSalary * 12,
        monthlySalary: currentSalary,
        isMonthly: true
      }
    } else {
      return {
        annualSalary: currentSalary,
        monthlySalary: currentSalary / 12,
        isMonthly: false
      }
    }
  }

  const calculateNewSalary = () => {
    const salaryAmounts = getSalaryAmounts()
    if (!salaryAmounts || !formData.increasePercentage) return null

    const percentage = parseFloat(formData.increasePercentage)
    if (isNaN(percentage)) return null

    // Calculate increase based on the stored salary amount (which could be monthly or annual)
    const increaseAmount = (employee.currentSalary! * percentage) / 100
    const newStoredSalary = employee.currentSalary! + increaseAmount

    // Calculate display amounts
    const frequency = employee.compensationType?.frequency || 'monthly'
    let newAnnualSalary, newMonthlySalary

    if (frequency === 'monthly') {
      newMonthlySalary = newStoredSalary
      newAnnualSalary = newStoredSalary * 12
    } else {
      newAnnualSalary = newStoredSalary
      newMonthlySalary = newStoredSalary / 12
    }

    return {
      increaseAmount,
      newSalary: newStoredSalary,
      newAnnualSalary,
      newMonthlySalary,
      frequency
    }
  }

  const calculation = calculateNewSalary()
  const salaryAmounts = getSalaryAmounts()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Salary Increase - {employee.fullName}
              </h2>
              <div className="mt-2">
                {employee.currentSalary && salaryAmounts ? (
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                      <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        Current Salary:
                      </span>
                      <span className="text-lg font-bold text-blue-900 dark:text-blue-100 ml-2">
                        ${salaryAmounts.annualSalary.toLocaleString()}/year
                      </span>
                      <span className="text-sm text-blue-600 dark:text-blue-400 ml-1">
                        (${salaryAmounts.monthlySalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}/month)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                    <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                      ⚠️ No current salary found in active contract
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-400"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Current Salary Information Section */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Current Salary Information
          </h3>
          {employee.currentSalary && salaryAmounts ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Annual Salary
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  ${salaryAmounts.annualSalary.toLocaleString()}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Monthly Amount
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  ${salaryAmounts.monthlySalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Payment Frequency
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {employee.compensationType?.frequency || 'Monthly'}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Source
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Active Contract
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    No Current Salary Information
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    No active contract with salary information found for this employee.
                    Please ensure the employee has an active contract with a base salary before proceeding with a salary increase.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Increase Percentage <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  className="input-field pr-8"
                  value={formData.increasePercentage}
                  onChange={(e) => setFormData({ ...formData, increasePercentage: e.target.value })}
                  placeholder="e.g. 5.0"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Increase Type
              </label>
              <select
                className="input-field"
                value={formData.increaseType}
                onChange={(e) => setFormData({ ...formData, increaseType: e.target.value })}
              >
                <option value="merit">Merit Increase</option>
                <option value="promotion">Promotion</option>
                <option value="market_adjustment">Market Adjustment</option>
                <option value="cost_of_living">Cost of Living</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <DateInput
                label="Effective Date"
                value={formData.effectiveDate}
                onChange={(isoDate, countryCode) => {
                  setFormData({ ...formData, effectiveDate: isoDate })
                }}
                required
                className=""
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Performance Period
              </label>
              <input
                type="text"
                className="input-field"
                value={formData.performancePeriod}
                onChange={(e) => setFormData({ ...formData, performancePeriod: e.target.value })}
                placeholder="e.g. Q1 2024, Annual Review 2024"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason/Merit Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              className="input-field"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Describe the reason for this salary increase (performance, achievements, etc.)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Notes
            </label>
            <textarea
              rows={2}
              className="input-field"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional comments or details"
            />
          </div>

          {calculation && salaryAmounts && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                Salary Calculation Preview
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 dark:text-blue-300">Current Annual:</span>
                  <div className="font-medium text-blue-900 dark:text-blue-100">
                    ${salaryAmounts.annualSalary.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300">Annual Increase:</span>
                  <div className="font-medium text-green-600 dark:text-green-400">
                    +${(calculation.increaseAmount * (calculation.frequency === 'monthly' ? 12 : 1)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300">New Annual:</span>
                  <div className="font-bold text-blue-900 dark:text-blue-100">
                    ${calculation.newAnnualSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300">New Monthly:</span>
                  <div className="font-bold text-blue-900 dark:text-blue-100">
                    ${calculation.newMonthlySalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Approve Salary Increase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}