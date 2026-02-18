'use client'

import { useState, useEffect, useRef } from 'react'
import { Lock, CheckCircle, AlertCircle, Trash2, Calendar } from 'lucide-react'
import type { ManualCartItem } from './manual-entry-tab'
import { useDateFormat } from '@/contexts/settings-context'
import { formatDateByFormat } from '@/lib/country-codes'

const MANUAL_ENTRY_LOOKBACK_DAYS = 30
const DROPDOWN_SHOW_DAYS = 7

// Get past days as YYYY-MM-DD strings (local timezone)
function getPastDays(): string[] {
  const days: string[] = []
  const now = new Date()
  for (let i = 0; i < MANUAL_ENTRY_LOOKBACK_DAYS; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    days.push(`${yyyy}-${mm}-${dd}`)
  }
  return days
}

interface ManualOrderSummaryProps {
  businessId: string
  businessType: string
  items: ManualCartItem[]
  onUpdateQuantity: (id: string, qty: number) => void
  onRemoveItem: (id: string) => void
  onClearAll: () => void
}

export function ManualOrderSummary({
  businessId,
  businessType,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearAll,
}: ManualOrderSummaryProps) {
  const { format: globalDateFormat } = useDateFormat()
  const [transactionDate, setTransactionDate] = useState('')
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [notes, setNotes] = useState('')
  const [closedDatesSet, setClosedDatesSet] = useState<Set<string>>(new Set())
  const [loadingDates, setLoadingDates] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [successOrder, setSuccessOrder] = useState<{ orderNumber: string; totalAmount: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const allDates = getPastDays()

  // Fetch all closed dates on mount
  useEffect(() => {
    if (!businessId) { setLoadingDates(false); return }
    let cancelled = false
    setLoadingDates(true)

    fetch(`/api/universal/close-books?businessId=${businessId}&days=${MANUAL_ENTRY_LOOKBACK_DAYS}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return
        // Convert UTC dates from API to local dates to match the dropdown
        // e.g., API returns "2026-02-09" (UTC) → browser in UTC-6 shows as Feb 8
        const closed = new Set<string>((data.closedDates || []).map((d: any) => {
          const utc = new Date(d.date + 'T00:00:00Z')
          const yyyy = utc.getFullYear()
          const mm = String(utc.getMonth() + 1).padStart(2, '0')
          const dd = String(utc.getDate()).padStart(2, '0')
          return `${yyyy}-${mm}-${dd}`
        }))
        setClosedDatesSet(closed)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingDates(false) })

    return () => { cancelled = true }
  }, [businessId])

  const availableDates = allDates.filter(d => !closedDatesSet.has(d))
  const dropdownDates = availableDates.slice(0, DROPDOWN_SHOW_DAYS)

  // Format an ISO date string (yyyy-mm-dd) to the global display format
  const displayDate = (isoDate: string) => formatDateByFormat(isoDate + 'T12:00:00Z', globalDateFormat)

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const canSubmit =
    transactionDate &&
    !submitting &&
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
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            productVariantId: item.productVariantId || undefined,
            discountAmount: 0,
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
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setSuccessOrder(null)
    setError(null)
    setTransactionDate('')
    setPaymentMethod('CASH')
    setNotes('')
    onClearAll()
  }

  // Success state
  if (successOrder) {
    return (
      <div className="card bg-white dark:bg-gray-900 p-4 rounded-lg shadow sticky top-20 self-start">
        <div className="text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Order Created</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-mono font-bold">{successOrder.orderNumber}</span>
            <br />recorded for {displayDate(transactionDate)}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            ${successOrder.totalAmount.toFixed(2)}
          </p>
          <button
            onClick={handleReset}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Enter Another Order
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-white dark:bg-gray-900 p-4 rounded-lg shadow sticky top-20 self-start">
      <h2 className="text-lg font-bold text-orange-600 dark:text-orange-400 mb-3">
        Manual Order
      </h2>

      {/* Date Selection */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Transaction Date
        </label>
        <div className="relative mb-1">
          <button
            type="button"
            onClick={() => dateInputRef.current?.showPicker?.()}
            disabled={loadingDates}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left flex items-center justify-between"
          >
            <span className={transactionDate ? '' : 'text-gray-400 dark:text-gray-500'}>
              {transactionDate ? displayDate(transactionDate) : 'Pick date...'}
            </span>
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={transactionDate}
            onChange={(e) => {
              const val = e.target.value
              if (val && availableDates.includes(val)) {
                setTransactionDate(val)
                setError(null)
              } else if (val && allDates.includes(val) && closedDatesSet.has(val)) {
                setError('That date is closed.')
              } else if (val) {
                setError(`Date must be within the past ${MANUAL_ENTRY_LOOKBACK_DAYS} days.`)
              }
            }}
            min={allDates[allDates.length - 1]}
            max={allDates[0]}
            className="absolute inset-0 opacity-0 pointer-events-none"
            tabIndex={-1}
          />
        </div>
        <select
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          disabled={loadingDates}
        >
          <option value="">{loadingDates ? 'Loading...' : 'Or pick from list...'}</option>
          {dropdownDates.map(date => (
            <option key={date} value={date}>
              {displayDate(date)} {date === allDates[0] ? '(Today)' : ''}
            </option>
          ))}
        </select>
        {!loadingDates && availableDates.length === 0 && (
          <div className="flex items-center gap-1 mt-1 p-1.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
            <Lock className="w-3 h-3 text-yellow-600 flex-shrink-0" />
            <span className="text-yellow-700 dark:text-yellow-400">
              All dates in the past {MANUAL_ENTRY_LOOKBACK_DAYS} days are closed. Release a day first.
            </span>
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
        {items.length === 0 ? (
          <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
            Click menu items to add them
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="border-b border-gray-100 dark:border-gray-700 pb-2 last:border-b-0">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {item.name}
                    {item.isCustom && (
                      <span className="ml-1 text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-1 py-0.5 rounded">
                        Custom
                      </span>
                    )}
                  </div>
                  <div className="text-green-600 text-sm">${Number(item.price).toFixed(2)}</div>
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1 text-red-400 hover:text-red-600 ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  className="w-7 h-7 bg-gray-200 dark:bg-gray-600 rounded text-center hover:bg-gray-300 dark:hover:bg-gray-500 text-sm"
                >
                  -
                </button>
                <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="w-7 h-7 bg-gray-200 dark:bg-gray-600 rounded text-center hover:bg-gray-300 dark:hover:bg-gray-500 text-sm"
                >
                  +
                </button>
                <span className="ml-auto font-medium text-sm">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Clear All */}
      {items.length > 0 && (
        <button
          onClick={onClearAll}
          className="text-xs text-red-500 hover:text-red-700 mb-2"
        >
          Clear All Items
        </button>
      )}

      {/* Payment Method */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Payment
        </label>
        <div className="flex gap-1">
          {['CASH', 'CARD', 'MOBILE'].map(method => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={`flex-1 px-2 py-1 text-xs rounded border ${
                paymentMethod === method
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      {/* Total */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mb-3">
        <div className="flex justify-between items-center text-lg font-bold text-gray-900 dark:text-white">
          <span>Total</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-500">
          {items.length} item(s)
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1 p-2 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 dark:text-red-400">{error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleReset}
          type="button"
          disabled={submitting}
          className={`flex-1 py-2.5 rounded-lg font-medium text-sm border ${
            submitting
              ? 'text-gray-400 bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 cursor-not-allowed'
              : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600'
          }`}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`flex-1 py-2.5 rounded-lg font-medium text-white text-sm ${
            canSubmit
              ? 'bg-orange-600 hover:bg-orange-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {submitting ? 'Creating...' : !transactionDate ? 'Select Date' : items.length === 0 ? 'Add Items' : 'Submit Order'}
        </button>
      </div>
    </div>
  )
}
