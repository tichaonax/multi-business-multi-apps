'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CreditCard, Banknote, Smartphone, UtensilsCrossed, Gift } from 'lucide-react'
import type { BusinessTypeConfig, PaymentMethod } from '../config/business-type-config'
import type { CartTotals } from '../hooks/useUniversalCart'
import { calcEcocashFee } from '@/lib/ecocash-utils'

export interface EcocashCheckoutData {
  ecocashTransactionCode: string
  ecocashFeeAmount: number
  totalWithFee: number
}

interface PaymentPanelProps {
  config: BusinessTypeConfig
  totals: CartTotals
  isProcessing: boolean
  onCheckout: (paymentMethod: PaymentMethod, amountPaid?: number, ecocashData?: EcocashCheckoutData) => void
  disabled?: boolean
  ecocashFeeType?: string    // 'FIXED' | 'PERCENTAGE'
  ecocashFeeValue?: number   // fee amount or percentage
  ecocashMinimumFee?: number // minimum fee floor (PERCENTAGE only)
}

const PAYMENT_METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  cash: <Banknote className="w-5 h-5" />,
  card: <CreditCard className="w-5 h-5" />,
  mobile: <Smartphone className="w-5 h-5" />,
  snap: <UtensilsCrossed className="w-5 h-5" />,
  loyalty: <Gift className="w-5 h-5" />,
  ecocash: <Image src="/images/ecocash-logo.png" alt="EcoCash" width={20} height={20} className="object-contain" />
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  mobile: 'Mobile Pay',
  snap: 'SNAP/EBT',
  loyalty: 'Loyalty Points',
  ecocash: 'EcoCash'
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
  disabled = false,
  ecocashFeeType = 'FIXED',
  ecocashFeeValue = 0,
  ecocashMinimumFee = 0
}: PaymentPanelProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash')
  const [cashAmount, setCashAmount] = useState<string>('')
  const [showCashInput, setShowCashInput] = useState(false)
  const [ecocashTxCode, setEcocashTxCode] = useState<string>('')

  // Calculate EcoCash fee and total
  const ecocashFeeAmount = selectedMethod === 'ecocash'
    ? calcEcocashFee(totals.total, ecocashFeeType, ecocashFeeValue, ecocashMinimumFee)
    : 0
  const ecocashTotal = totals.total + ecocashFeeAmount

  const handleCheckout = () => {
    if (isProcessing || disabled) return

    if (selectedMethod === 'ecocash') {
      onCheckout('ecocash', ecocashTotal, {
        ecocashTransactionCode: ecocashTxCode,
        ecocashFeeAmount,
        totalWithFee: ecocashTotal
      })
      setEcocashTxCode('')
      return
    }

    if (selectedMethod === 'cash' && cashAmount) {
      onCheckout(selectedMethod, parseFloat(cashAmount))
    } else {
      onCheckout(selectedMethod)
    }

    setCashAmount('')
    setShowCashInput(false)
  }

  const isDisabled = disabled || totals.total < 0 || isProcessing

  // EcoCash checkout disabled until txCode is entered
  const isCheckoutDisabled =
    isDisabled ||
    (selectedMethod === 'cash' && totals.total > 0 && !cashAmount) ||
    (selectedMethod === 'ecocash' && !ecocashTxCode.trim())

  const change =
    selectedMethod === 'cash' && cashAmount
      ? Math.max(0, parseFloat(cashAmount) - totals.total)
      : 0

  const checkoutTotal = selectedMethod === 'ecocash' ? ecocashTotal : totals.total

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
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
              if (method !== 'ecocash') setEcocashTxCode('')
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

        {/* Cash Amount Input */}
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
                step="0.10"
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

        {/* EcoCash fee breakdown + txCode input */}
        {selectedMethod === 'ecocash' && totals.total > 0 && (
          <div className="mt-4 space-y-3">
            {/* Fee breakdown */}
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-700 space-y-1 text-sm">
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Sub-total</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-orange-600 dark:text-orange-400">
                <span>
                  EcoCash Fee
                  {ecocashFeeType === 'PERCENTAGE'
                    ? ` (${ecocashFeeValue}%${ecocashMinimumFee > 0 ? `, min $${ecocashMinimumFee.toFixed(2)}` : ''})`
                    : ''}
                </span>
                <span>+${ecocashFeeAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 dark:text-white border-t border-green-200 dark:border-green-700 pt-1">
                <span>Customer Pays</span>
                <span>${ecocashTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Transaction code input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                EcoCash Transaction Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={ecocashTxCode}
                onChange={(e) => setEcocashTxCode(e.target.value)}
                placeholder="e.g. ECO1234567890"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={isDisabled}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter the confirmation code received on the business phone.
              </p>
            </div>
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
          disabled={isCheckoutDisabled}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
            isCheckoutDisabled
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
            <span>Complete Sale - ${checkoutTotal.toFixed(2)}</span>
          )}
        </button>
      </div>
    </div>
  )
}
