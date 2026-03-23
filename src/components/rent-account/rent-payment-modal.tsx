'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/date-format'

interface RentPaymentModalProps {
  businessId: string
  accountId: string
  accountBalance: number
  monthlyRentAmount: number
  landlordSupplier: {
    id: string
    name: string
    contactPerson?: string | null
    phone?: string | null
  } | null
  onSuccess: () => void
  onClose: () => void
}

interface Category {
  id: string
  name: string
  emoji: string
}

export function RentPaymentModal({
  businessId,
  accountId,
  accountBalance,
  monthlyRentAmount,
  landlordSupplier,
  onSuccess,
  onClose,
}: RentPaymentModalProps) {
  const suggestedAmount = Math.min(accountBalance, monthlyRentAmount)
  const [amount, setAmount] = useState(suggestedAmount > 0 ? suggestedAmount.toFixed(2) : '')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCats, setLoadingCats] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alreadyPaidWarning, setAlreadyPaidWarning] = useState(false)

  const parsedAmount = parseFloat(amount) || 0
  const isUnderBalance = parsedAmount > accountBalance
  const isUnderRent = accountBalance < monthlyRentAmount

  // Load expense categories
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/expense-categories')
        if (res.ok) {
          const data = await res.json()
          const all: Category[] = []
          for (const domain of data.domains ?? []) {
            for (const cat of domain.expense_categories ?? []) {
              all.push({ id: cat.id, name: cat.name, emoji: cat.emoji ?? '📂' })
            }
          }
          setCategories(all)
          // Auto-select rent/property category if available
          const rentCat = all.find(c =>
            c.name.toLowerCase().includes('rent') ||
            c.name.toLowerCase().includes('property') ||
            c.name.toLowerCase().includes('lease')
          )
          if (rentCat) setCategoryId(rentCat.id)
        }
      } catch {
        // ignore
      } finally {
        setLoadingCats(false)
      }
    }
    load()
  }, [])

  // Check if rent was already paid this month
  useEffect(() => {
    const check = async () => {
      try {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
        const res = await fetch(
          `/api/expense-account/${accountId}/payments?startDate=${startOfMonth}&endDate=${endOfMonth}&limit=1`
        )
        if (res.ok) {
          const data = await res.json()
          if (data.total > 0) setAlreadyPaidWarning(true)
        }
      } catch {
        // ignore
      }
    }
    if (accountId) check()
  }, [accountId])

  const handleSubmit = async () => {
    if (!categoryId) {
      setError('Please select an expense category')
      return
    }
    if (parsedAmount <= 0) {
      setError('Amount must be greater than zero')
      return
    }
    if (parsedAmount > accountBalance) {
      setError(`Amount exceeds available balance (${formatCurrency(accountBalance)})`)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const body: any = {
        payeeType: landlordSupplier ? 'SUPPLIER' : 'NONE',
        categoryId,
        amount: parsedAmount,
        paymentDate,
        notes: notes || `Rent payment - ${new Date(paymentDate).toLocaleString('en-GB', { month: 'long', year: 'numeric' })}`,
        isFullPayment: true,
      }
      if (landlordSupplier) {
        body.payeeSupplierId = landlordSupplier.id
      }

      const res = await fetch(`/api/expense-account/${accountId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Payment failed')
      }

      onSuccess()
    } catch (e: any) {
      setError(e.message || 'Payment failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏠</span>
              <div>
                <h2 className="text-lg font-bold text-white">Pay Rent</h2>
                <p className="text-sm text-blue-100">From rent account balance</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white opacity-80 hover:opacity-100 text-xl">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Balance summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Available Balance</div>
              <div className={`text-lg font-bold ${isUnderRent ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {formatCurrency(accountBalance)}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Monthly Rent</div>
              <div className="text-lg font-bold text-gray-800 dark:text-gray-200">{formatCurrency(monthlyRentAmount)}</div>
            </div>
          </div>

          {/* Warnings */}
          {isUnderRent && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                ⚠️ Balance is {formatCurrency(monthlyRentAmount - accountBalance)} short of the monthly rent amount. Continue daily EOD transfers to build up the fund.
              </p>
            </div>
          )}

          {alreadyPaidWarning && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ A payment was already recorded this month. Make sure you're not duplicating a payment.
              </p>
            </div>
          )}

          {/* Payee */}
          {landlordSupplier && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Payee (Landlord)</label>
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200">
                🏢 {landlordSupplier.name}
                {landlordSupplier.contactPerson && <span className="text-gray-500 dark:text-gray-400"> · {landlordSupplier.contactPerson}</span>}
                {landlordSupplier.phone && <span className="text-gray-500 dark:text-gray-400"> · {landlordSupplier.phone}</span>}
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-700 dark:text-gray-300">$</span>
              <input
                type="number"
                step="0.10"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
            {suggestedAmount > 0 && parseFloat(amount) !== suggestedAmount && (
              <button
                onClick={() => setAmount(suggestedAmount.toFixed(2))}
                className="text-xs text-blue-600 dark:text-blue-400 underline mt-1"
              >
                Use suggested: {formatCurrency(suggestedAmount)}
              </button>
            )}
            {isUnderBalance && (
              <p className="text-xs text-red-500 mt-1">Exceeds available balance</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Expense Category <span className="text-red-500">*</span>
            </label>
            {loadingCats ? (
              <div className="text-sm text-gray-400">Loading categories…</div>
            ) : (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">— Select category —</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Payment Date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Rent payment - ${new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })}`}
              className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || parsedAmount <= 0 || !categoryId || isUnderBalance}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              {saving ? '💸 Processing…' : '💸 Pay Rent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
