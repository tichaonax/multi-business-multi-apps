import React from 'react'

export interface ValidationResult {
  isValid: boolean
  currentBalance: number
  requiredAmount: number
  shortfall?: number
  message: string
}

interface BalanceValidationWarningProps {
  validation: ValidationResult | null
  businessName?: string
  transactionType?: 'loan' | 'payment' | 'advance'
  className?: string
}

export function BalanceValidationWarning({
  validation,
  businessName = 'Business',
  transactionType = 'transaction',
  className = ''
}: BalanceValidationWarningProps) {
  if (!validation) {
    return null
  }

  if (validation.isValid) {
    return (
      <div className={`bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 ${className}`}>
        <div className="flex items-center space-x-2">
          <span className="text-green-600 dark:text-green-400">✅</span>
          <div>
            <p className="text-sm text-green-800 dark:text-green-200 font-medium">
              Sufficient Funds Available
            </p>
            <p className="text-xs text-green-700 dark:text-green-300">
              Current balance: ${validation.currentBalance.toFixed(2)} | Required: ${validation.requiredAmount.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Invalid validation - show warning
  const getWarningIcon = () => {
    if (validation.currentBalance === 0) return '🚫'
    if (validation.shortfall && validation.shortfall >= validation.requiredAmount) return '❌'
    return '⚠️'
  }

  const getWarningColor = () => {
    if (validation.currentBalance === 0) return 'red'
    if (validation.shortfall && validation.shortfall >= validation.requiredAmount) return 'red'
    return 'orange'
  }

  const color = getWarningColor()
  const bgColor = color === 'red'
    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'

  const textColor = color === 'red'
    ? 'text-red-800 dark:text-red-200'
    : 'text-orange-800 dark:text-orange-200'

  const subtextColor = color === 'red'
    ? 'text-red-700 dark:text-red-300'
    : 'text-orange-700 dark:text-orange-300'

  return (
    <div className={`${bgColor} border rounded-lg p-3 ${className}`}>
      <div className="flex items-start space-x-2">
        <span className="text-lg">{getWarningIcon()}</span>
        <div className="flex-1">
          <p className={`text-sm font-medium ${textColor}`}>
            Insufficient Funds for {transactionType.charAt(0).toUpperCase() + transactionType.slice(1)}
          </p>
          <div className={`text-xs ${subtextColor} space-y-1 mt-1`}>
            <div>Current {businessName} Balance: <strong>${validation.currentBalance.toFixed(2)}</strong></div>
            <div>Required Amount: <strong>${validation.requiredAmount.toFixed(2)}</strong></div>
            {validation.shortfall && (
              <div className="font-medium">
                Shortfall: <strong>${validation.shortfall.toFixed(2)}</strong>
              </div>
            )}
          </div>

          {validation.currentBalance === 0 && (
            <div className={`text-xs ${subtextColor} mt-2 p-2 bg-white/50 dark:bg-black/20 rounded`}>
              💡 <strong>Action needed:</strong> This business account needs to be initialized with a starting balance before processing loans.
            </div>
          )}

          {validation.currentBalance > 0 && validation.shortfall && (
            <div className={`text-xs ${subtextColor} mt-2 p-2 bg-white/50 dark:bg-black/20 rounded`}>
              💡 <strong>Suggestion:</strong> Add ${validation.shortfall.toFixed(2)} to the business account or reduce the {transactionType} amount.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}