'use client'

import { useState, useEffect } from 'react'
import { LandlordSelect } from './landlord-select'

export interface RentAccountFormData {
  monthlyRentAmount: string
  operatingDaysPerMonth: string
  rentDueDay: string
  landlordSupplierId: string
  autoTransferOnEOD: boolean
}

interface RentAccountSetupFormProps {
  businessId: string
  businessType: string
  value: RentAccountFormData
  onChange: (data: RentAccountFormData) => void
  disabled?: boolean
}

export function RentAccountSetupForm({ businessId, businessType, value, onChange, disabled }: RentAccountSetupFormProps) {
  const [dailyAmount, setDailyAmount] = useState<number>(0)

  useEffect(() => {
    const monthly = parseFloat(value.monthlyRentAmount) || 0
    const days = parseInt(value.operatingDaysPerMonth) || 0
    setDailyAmount(days > 0 && monthly > 0 ? Math.ceil(monthly / days) : 0)
  }, [value.monthlyRentAmount, value.operatingDaysPerMonth])

  const set = (field: keyof RentAccountFormData, val: any) => {
    onChange({ ...value, [field]: val })
  }

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-60'

  return (
    <div className="space-y-4 pt-3 border-t border-orange-200 dark:border-orange-700">
      <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">🏠 Rent Account Configuration</p>

      {/* Monthly rent + operating days */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Monthly Rent Amount *</label>
          <input
            type="number"
            step="0.10"
            min="0.01"
            required
            disabled={disabled}
            value={value.monthlyRentAmount}
            onChange={e => set('monthlyRentAmount', e.target.value)}
            placeholder="e.g. 12500.00"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Operating Days / Month *</label>
          <input
            type="number"
            min="1"
            max="31"
            required
            disabled={disabled}
            value={value.operatingDaysPerMonth}
            onChange={e => set('operatingDaysPerMonth', e.target.value)}
            placeholder="30"
            className={inputCls}
          />
        </div>
      </div>

      {/* Daily transfer (read-only) + due day */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Daily Transfer (auto-calculated)</label>
          <div className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-sm font-mono text-green-700 dark:text-green-400">
            {dailyAmount > 0 ? dailyAmount.toFixed(2) : '—'}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Rent Due Day (1–28) *</label>
          <input
            type="number"
            min="1"
            max="28"
            required
            disabled={disabled}
            value={value.rentDueDay}
            onChange={e => set('rentDueDay', e.target.value)}
            placeholder="1"
            className={inputCls}
          />
        </div>
      </div>

      {/* Landlord select */}
      <div>
        <label className="block text-xs font-medium text-secondary mb-1">Landlord / Property Owner *</label>
        <LandlordSelect
          businessId={businessId}
          businessType={businessType}
          value={value.landlordSupplierId}
          onChange={id => set('landlordSupplierId', id)}
          disabled={disabled}
        />
      </div>

      {/* Auto-transfer toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
        <div>
          <p className="text-sm font-medium text-primary">Auto-transfer on EOD Close</p>
          <p className="text-xs text-secondary">Suggest daily rent transfer at end-of-day</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value.autoTransferOnEOD}
          disabled={disabled}
          onClick={() => set('autoTransferOnEOD', !value.autoTransferOnEOD)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            value.autoTransferOnEOD ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              value.autoTransferOnEOD ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  )
}

export function defaultRentAccountFormData(): RentAccountFormData {
  return {
    monthlyRentAmount: '',
    operatingDaysPerMonth: '30',
    rentDueDay: '1',
    landlordSupplierId: '',
    autoTransferOnEOD: true,
  }
}

export function validateRentAccountFormData(data: RentAccountFormData): string | null {
  if (!data.monthlyRentAmount || parseFloat(data.monthlyRentAmount) <= 0) {
    return 'Monthly rent amount must be greater than 0'
  }
  const days = parseInt(data.operatingDaysPerMonth)
  if (!days || days < 1 || days > 31) {
    return 'Operating days must be between 1 and 31'
  }
  const dueDay = parseInt(data.rentDueDay)
  if (!dueDay || dueDay < 1 || dueDay > 28) {
    return 'Rent due day must be between 1 and 28'
  }
  if (!data.landlordSupplierId) {
    return 'Please select or create a landlord'
  }
  return null
}
