'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, Trash2, Lock, CheckCircle, AlertCircle } from 'lucide-react'

interface ManualItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  discountAmount: number
}

interface ManualEntryTabProps {
  businessId: string
  businessType: string
}

function generateTempId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// Get past 7 days as YYYY-MM-DD strings
function getPast7Days(): string[] {
  const days: string[] = []
  const now = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

export function ManualEntryTab({ businessId, businessType }: ManualEntryTabProps) {
  const [transactionDate, setTransactionDate] = useState('')
  const [isDateClosed, setIsDateClosed] = useState(false)
  const [closedBy, setClosedBy] = useState<string | null>(null)
  const [checkingDate, setCheckingDate] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<ManualItem[]>([
    { id: generateTempId(), name: '', quantity: 1, unitPrice: 0, discountAmount: 0 },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [successOrder, setSuccessOrder] = useState<{ orderNumber: string; totalAmount: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const availableDates = getPast7Days()

  // Check if selected date's books are closed
  useEffect(() => {
    if (!transactionDate || !businessId) {
      setIsDateClosed(false)
      setClosedBy(null)
      return
    }

    let cancelled = false
    setCheckingDate(true)

    fetch(`/api/universal/close-books?businessId=${businessId}&date=${transactionDate}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return
        setIsDateClosed(data.isClosed || false)
        setClosedBy(data.closedBy || null)
      })
      .catch(() => {
        if (!cancelled) setIsDateClosed(false)
      })
      .finally(() => {
        if (!cancelled) setCheckingDate(false)
      })

    return () => { cancelled = true }
  }, [transactionDate, businessId])

  const addItem = () => {
    setItems(prev => [...prev, { id: generateTempId(), name: '', quantity: 1, unitPrice: 0, discountAmount: 0 }])
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev)
  }

  const updateItem = (id: string, field: keyof ManualItem, value: string | number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const subtotal = items.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice) - item.discountAmount
  }, 0)

  const canSubmit =
    transactionDate &&
    !isDateClosed &&
    !submitting &&
    items.every(item => item.name.trim() && item.quantity > 0 && item.unitPrice >= 0) &&
    items.length > 0

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/universal/orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          businessType,
          transactionDate,
          paymentMethod,
          notes: notes || 'Manual entry from book records',
          items: items.map(({ name, quantity, unitPrice, discountAmount }) => ({
            name,
            quantity,
            unitPrice,
            discountAmount: discountAmount || 0,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create manual order')
        return
      }

      setSuccessOrder({
        orderNumber: data.data.orderNumber,
        totalAmount: data.data.totalAmount,
      })
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setSuccessOrder(null)
    setError(null)
    setItems([{ id: generateTempId(), name: '', quantity: 1, unitPrice: 0, discountAmount: 0 }])
    setNotes('')
  }

  // Success state
  if (successOrder) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Order Created</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Order <span className="font-mono font-bold">{successOrder.orderNumber}</span> has been recorded
            for <span className="font-semibold">{transactionDate}</span>.
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            Total: ${successOrder.totalAmount.toFixed(2)}
          </p>
          <div className="flex gap-3 justify-center pt-4">
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Enter Another Order
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        Manual Transaction Entry
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Enter transactions from book records when the system was unavailable.
      </p>

      {/* Date Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Transaction Date
        </label>
        <select
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Select a date...</option>
          {availableDates.map(date => (
            <option key={date} value={date}>{date} {date === availableDates[0] ? '(Today)' : ''}</option>
          ))}
        </select>

        {checkingDate && (
          <p className="text-sm text-gray-500 mt-1">Checking date status...</p>
        )}

        {isDateClosed && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <Lock className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-400">
              Books closed for this date{closedBy ? ` by ${closedBy}` : ''}. No entries allowed.
            </span>
          </div>
        )}
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Items
          </label>
          <button
            onClick={addItem}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-5">{index + 1}.</span>
              <input
                type="text"
                placeholder="Item name"
                value={item.name}
                onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="number"
                placeholder="Qty"
                min={1}
                value={item.quantity}
                onChange={(e) => updateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
              />
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  placeholder="Price"
                  min={0}
                  step={0.01}
                  value={item.unitPrice || ''}
                  onChange={(e) => updateItem(item.id, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-24 pl-5 pr-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                disabled={items.length === 1}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Payment Method
        </label>
        <div className="flex gap-2">
          {['CASH', 'CARD', 'MOBILE'].map(method => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={`px-3 py-1.5 text-sm rounded-lg border ${
                paymentMethod === method
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes (optional)
        </label>
        <input
          type="text"
          placeholder="e.g., Book records page 12"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      {/* Subtotal */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center text-lg font-bold text-gray-900 dark:text-white">
          <span>Total</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {items.filter(i => i.name.trim()).length} item(s)
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`w-full py-3 rounded-lg font-medium text-white ${
          canSubmit
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        {submitting ? 'Creating Order...' : 'Submit Manual Order'}
      </button>
    </div>
  )
}
