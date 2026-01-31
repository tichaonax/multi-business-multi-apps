'use client'

import { useState } from 'react'
import { CreditCard, Banknote, Smartphone, UtensilsCrossed, Gift } from 'lucide-react'
import type { BusinessTypeConfig, PaymentMethod } from '../config/business-type-config'
import type { CartTotals } from '../hooks/useUniversalCart'

interface PaymentPanelProps {
  config: BusinessTypeConfig
  totals: CartTotals
  isProcessing: boolean
  onCheckout: (paymentMethod: PaymentMethod, amountPaid?: number) => void
  disabled?: boolean
}

const PAYMENT_METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  cash: <Banknote className="w-5 h-5" />,
  card: <CreditCard className="w-5 h-5" />,
  mobile: <Smartphone className="w-5 h-5" />,
  snap: <UtensilsCrossed className="w-5 h-5" />,
  loyalty: <Gift className="w-5 h-5" />
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  mobile: 'Mobile Pay',
  snap: 'SNAP/EBT',
  loyalty: 'Loyalty Points'
}

/**
 * Universal Payment Panel
 * Adapts payment methods based on business type configuration
 */
export function PaymentPanel({
  config,
  totals,
  isProcessing,
  onCheckout,
  disabled = false
}: PaymentPanelProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash')
  const [cashAmount, setCashAmount] = useState<string>('')
  const [showCashInput, setShowCashInput] = useState(false)

  const handleCheckout = () => {
    if (selectedMethod === 'cash' && cashAmount) {
      const amount = parseFloat(cashAmount)
      onCheckout(selectedMethod, amount)
    } else {
      onCheckout(selectedMethod)
    }

    // Reset after checkout
    setCashAmount('')
    setShowCashInput(false)
  }

  const isDisabled = disabled || totals.total <= 0 || isProcessing

  const change =
    selectedMethod === 'cash' && cashAmount
      ? Math.max(0, parseFloat(cashAmount) - totals.total)
      : 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 mt-4">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Payment
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select payment method
        </p>
      </div>

      {/* Payment Method Selection */}
      <div className="p-4 space-y-3">
        {config.paymentMethods.map((method) => (
          <button
            key={method}
            onClick={() => {
              setSelectedMethod(method)
              setShowCashInput(method === 'cash')
            }}
            disabled={isDisabled}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
              selectedMethod === method
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            } ${
              isDisabled
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
            }`}
          >
            <div
              className={`flex-shrink-0 ${
                selectedMethod === method
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {PAYMENT_METHOD_ICONS[method]}
            </div>
            <div className="flex-1 text-left">
              <p
                className={`font-medium ${
                  selectedMethod === method
                    ? 'text-blue-900 dark:text-blue-100'
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                {PAYMENT_METHOD_LABELS[method]}
              </p>
            </div>
            <div
              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 ${
                selectedMethod === method
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              {selectedMethod === method && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </div>
          </button>
        ))}

        {/* Cash Amount Input - only show if total > 0 */}
        {showCashInput && selectedMethod === 'cash' && totals.total > 0 && (
          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Amount Received
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min={totals.total}
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder={totals.total.toFixed(2)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isDisabled}
              />
            </div>
            {change > 0 && (
              <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Change
                </span>
                <span className="text-lg font-bold text-green-900 dark:text-green-100">
                  ${change.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Free item notice */}
        {selectedMethod === 'cash' && totals.total === 0 && (
          <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-800 dark:text-green-200">
            ✅ Free item - no payment required
          </div>
        )}
      </div>

      {/* Checkout Button */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleCheckout}
          disabled={isDisabled || (selectedMethod === 'cash' && totals.total > 0 && !cashAmount)}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
            isDisabled || (selectedMethod === 'cash' && totals.total > 0 && !cashAmount)
              ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 active:scale-95'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            <span>Complete Sale - ${totals.total.toFixed(2)}</span>
          )}
        </button>
      </div>
    </div>
  )
}
