'use client'

import { useState } from 'react'
import { RecordPaymentPayload, PaymentMethod, CustomerLayby } from '@/types/layby'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DollarSign, CreditCard } from 'lucide-react'

interface PaymentFormProps {
  layby: CustomerLayby
  onSubmit: (data: RecordPaymentPayload) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function PaymentForm({ layby, onSubmit, onCancel, loading }: PaymentFormProps) {
  const [formData, setFormData] = useState({
    amount: 0,
    paymentMethod: 'CASH' as PaymentMethod,
    paymentReference: '',
    notes: ''
  })

  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate amount
    if (formData.amount <= 0) {
      setError('Payment amount must be greater than 0')
      return
    }

    if (formData.amount > layby.balanceRemaining) {
      setError(`Payment amount cannot exceed balance remaining ($${layby.balanceRemaining.toFixed(2)})`)
      return
    }

    const payload: RecordPaymentPayload = {
      amount: formData.amount,
      paymentMethod: formData.paymentMethod,
      paymentReference: formData.paymentReference || undefined,
      notes: formData.notes || undefined
    }

    try {
      await onSubmit(payload)
    } catch (err: any) {
      setError(err.message || 'Failed to record payment')
    }
  }

  const handleAmountChange = (value: string) => {
    const amount = parseFloat(value) || 0
    setFormData({ ...formData, amount })
    setError('')
  }

  const setFullBalance = () => {
    setFormData({ ...formData, amount: layby.balanceRemaining })
    setError('')
  }

  const newBalance = layby.balanceRemaining - formData.amount
  const willComplete = newBalance <= 0

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Layby Info */}
      <div className="card p-4 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">Layby Information</h4>
          <span className="text-sm font-mono">{layby.laybyNumber}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-secondary">Customer:</p>
            <p className="font-medium">{layby.customer?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-secondary">Total Amount:</p>
            <p className="font-medium">${layby.totalAmount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-secondary">Total Paid:</p>
            <p className="font-medium text-green-600">${layby.totalPaid.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-secondary">Balance Remaining:</p>
            <p className="font-medium text-orange-600">${layby.balanceRemaining.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Payment Amount */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="amount">Payment Amount *</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={setFullBalance}
          >
            Pay Full Balance
          </Button>
        </div>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
          <Input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            max={layby.balanceRemaining}
            value={formData.amount || ''}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="pl-10"
            placeholder="0.00"
            required
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
        )}
      </div>

      {/* Payment Method */}
      <div>
        <Label htmlFor="paymentMethod">Payment Method *</Label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
          <select
            id="paymentMethod"
            value={formData.paymentMethod}
            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm pl-10"
            required
          >
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="STORE_CREDIT">Store Credit</option>
            <option value="CHECK">Check</option>
          </select>
        </div>
      </div>

      {/* Payment Reference */}
      <div>
        <Label htmlFor="paymentReference">Payment Reference (Optional)</Label>
        <Input
          id="paymentReference"
          value={formData.paymentReference}
          onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
          placeholder="Transaction ID, check number, etc."
        />
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Add payment notes..."
          rows={3}
        />
      </div>

      {/* Summary */}
      {formData.amount > 0 && (
        <div className="card p-4 bg-blue-50 dark:bg-blue-950">
          <h4 className="font-semibold mb-2">Payment Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Payment Amount:</span>
              <span className="font-semibold">${formData.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Current Balance:</span>
              <span>${layby.balanceRemaining.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-1">
              <span>New Balance:</span>
              <span className={newBalance <= 0 ? 'text-green-600' : ''}>
                ${newBalance.toFixed(2)}
              </span>
            </div>
          </div>
          {willComplete && (
            <div className="mt-3 p-2 bg-green-100 dark:bg-green-900 rounded text-green-800 dark:text-green-300 text-sm text-center">
              ✓ This payment will complete the layby!
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || formData.amount <= 0}>
          {loading ? 'Recording...' : 'Record Payment'}
        </Button>
      </div>
    </form>
  )
}
