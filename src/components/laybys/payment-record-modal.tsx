'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { X, DollarSign, CreditCard, Smartphone, Building2, Loader2 } from 'lucide-react'

interface PaymentRecordModalProps {
  laybyId: string
  laybyNumber: string
  customerName: string
  totalAmount: number
  paidAmount: number
  balanceRemaining: number
  depositAmount?: number
  onClose: () => void
  onSuccess: () => void
}

type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER'

export function PaymentRecordModal({
  laybyId,
  laybyNumber,
  customerName,
  totalAmount,
  paidAmount,
  balanceRemaining,
  depositAmount,
  onClose,
  onSuccess
}: PaymentRecordModalProps) {
  // Pre-fill deposit amount if this is the first payment
  const suggestedAmount = paidAmount === 0 && depositAmount ? depositAmount.toFixed(2) : ''

  const [formData, setFormData] = useState({
    amount: suggestedAmount,
    paymentMethod: 'CASH' as PaymentMethod,
    referenceNumber: '',
    notes: paidAmount === 0 ? 'Initial deposit' : ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const paymentAmount = parseFloat(formData.amount)

    // Validation
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setError('Please enter a valid payment amount')
      return
    }

    if (paymentAmount > balanceRemaining) {
      setError(`Payment amount cannot exceed balance remaining ($${balanceRemaining.toFixed(2)})`)
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/laybys/${laybyId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: paymentAmount,
          paymentMethod: formData.paymentMethod,
          referenceNumber: formData.referenceNumber || undefined,
          notes: formData.notes || undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to record payment')
      }

      // Success
      onSuccess()
    } catch (err) {
      console.error('Error recording payment:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const paymentMethods = [
    { value: 'CASH', label: 'Cash', icon: <DollarSign className="h-4 w-4" /> },
    { value: 'CARD', label: 'Card', icon: <CreditCard className="h-4 w-4" /> },
    { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: <Smartphone className="h-4 w-4" /> },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: <Building2 className="h-4 w-4" /> }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Record Payment</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Layby {laybyNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Info */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
            <p className="font-semibold text-gray-900 dark:text-white">{customerName}</p>
          </div>

          {/* First Payment Notice */}
          {paidAmount === 0 && depositAmount && (
            <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">Initial Deposit Required</h3>
              <p className="text-sm text-orange-800 dark:text-orange-200">
                Collecting the initial deposit of <span className="font-bold">${depositAmount.toFixed(2)}</span> to activate this layby.
              </p>
            </div>
          )}

          {/* Balance Summary */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Current Balance</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Total Amount</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">${totalAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Total Paid</p>
                <p className="text-lg font-bold text-green-600">${paidAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Remaining</p>
                <p className="text-lg font-bold text-orange-600">${balanceRemaining.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <Label htmlFor="amount">Payment Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={balanceRemaining}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="pl-7"
                required
                disabled={loading}
              />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Maximum: ${balanceRemaining.toFixed(2)}
            </p>
          </div>

          {/* Payment Method */}
          <div>
            <Label>Payment Method *</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, paymentMethod: method.value as PaymentMethod })}
                  className={`flex items-center gap-2 p-3 border rounded-lg transition-colors ${
                    formData.paymentMethod === method.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                  disabled={loading}
                >
                  {method.icon}
                  <span className="font-medium">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reference Number (Optional for Card/Mobile Money/Bank Transfer) */}
          {formData.paymentMethod !== 'CASH' && (
            <div>
              <Label htmlFor="referenceNumber">Reference Number (Optional)</Label>
              <Input
                id="referenceNumber"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                placeholder="Transaction reference, last 4 digits, etc."
                disabled={loading}
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes about this payment..."
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-900 dark:text-red-100 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Recording...
                </>
              ) : (
                'Record Payment'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
