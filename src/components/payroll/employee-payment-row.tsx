'use client'

import { useState, useEffect } from 'react'

interface Employee {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  fullName: string
  nationalId: string
}

interface EmployeePaymentRowProps {
  employee: Employee
  defaultAmount?: number
  isSelected: boolean
  onToggle: (employeeId: string, selected: boolean) => void
  onAmountChange: (employeeId: string, amount: number) => void
  onNoteChange: (employeeId: string, note: string) => void
  disabled?: boolean
}

export function EmployeePaymentRow({
  employee,
  defaultAmount = 0,
  isSelected,
  onToggle,
  onAmountChange,
  onNoteChange,
  disabled = false,
}: EmployeePaymentRowProps) {
  const [amount, setAmount] = useState(defaultAmount.toString())
  const [note, setNote] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)

  useEffect(() => {
    setAmount(defaultAmount.toString())
  }, [defaultAmount])

  const handleAmountChange = (value: string) => {
    setAmount(value)
    const numAmount = parseFloat(value) || 0
    onAmountChange(employee.id, numAmount)
  }

  const handleNoteChange = (value: string) => {
    setNote(value)
    onNoteChange(employee.id, value)
  }

  const handleToggle = () => {
    onToggle(employee.id, !isSelected)
  }

  const displayName = employee.fullName || `${employee.firstName} ${employee.lastName}`

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start space-x-4">
        {/* Checkbox */}
        <div className="flex items-center pt-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleToggle}
            disabled={disabled}
            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Employee Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">{displayName}</h3>
              <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                <span>ID: {employee.employeeNumber}</span>
                <span>•</span>
                <span>NID: {employee.nationalId}</span>
              </div>
            </div>
          </div>

          {/* Payment Controls - Only show when selected */}
          {isSelected && (
            <div className="mt-3 space-y-3">
              {/* Amount Input */}
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      disabled={disabled}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:bg-gray-600 disabled:cursor-not-allowed"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Note Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowNoteInput(!showNoteInput)}
                  disabled={disabled}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    showNoteInput || note
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={showNoteInput ? 'Hide note' : 'Add note'}
                >
                  📝 Note
                </button>
              </div>

              {/* Note Input - Collapsible */}
              {showNoteInput && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Adjustment Note (optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => handleNoteChange(e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:bg-gray-600 disabled:cursor-not-allowed"
                    rows={2}
                    placeholder="Reason for adjustment (if amount differs from standard)"
                  />
                </div>
              )}

              {/* Quick Amount Buttons */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">Quick amounts:</span>
                {[500, 1000, 1500, 2000].map((quickAmount) => (
                  <button
                    key={quickAmount}
                    type="button"
                    onClick={() => handleAmountChange(quickAmount.toString())}
                    disabled={disabled}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 dark:bg-gray-600 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ${quickAmount}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Amount Display (when selected) */}
        {isSelected && amount && parseFloat(amount) > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-600 dark:text-gray-400">Amount</p>
            <p className="text-lg font-bold text-green-600">
              ${parseFloat(amount).toFixed(2)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
