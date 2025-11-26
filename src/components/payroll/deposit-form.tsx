'use client'

import { useState, useEffect } from 'react'
import { useAlert } from '@/components/ui/confirm-modal'

interface Business {
  id: string
  name: string
  type: string
  balance: number
}

interface DepositFormProps {
  onSuccess?: () => void
}

export function DepositForm({ onSuccess }: DepositFormProps) {
  const customAlert = useAlert()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loadingBusinesses, setLoadingBusinesses] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    sourceBusinessId: '',
    amount: '',
    transactionType: 'MANUAL_TRANSFER' as 'MANUAL_TRANSFER' | 'PAYROLL_EXPENSE',
    customNote: '',
  })

  const [errors, setErrors] = useState({
    sourceBusinessId: '',
    amount: '',
  })

  useEffect(() => {
    fetchBusinesses()
  }, [])

  const fetchBusinesses = async () => {
    try {
      const response = await fetch('/api/businesses', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        // Filter businesses with accounts that have balance
        const businessList = data.businesses || []
        const businessesWithAccounts = businessList.filter((b: any) => b.business_accounts)

        // Transform to expected format with balance
        const transformedBusinesses = businessesWithAccounts.map((b: any) => ({
          id: b.id,
          name: b.name,
          type: b.type,
          balance: b.business_accounts?.balance || 0
        }))

        setBusinesses(transformedBusinesses)
      }
    } catch (error) {
      console.error('Error fetching businesses:', error)
    } finally {
      setLoadingBusinesses(false)
    }
  }

  const selectedBusiness = businesses.find(b => b.id === formData.sourceBusinessId)

  const generateAutoNote = () => {
    if (!selectedBusiness) return ''

    const noteType = formData.transactionType === 'PAYROLL_EXPENSE'
      ? 'payroll expense'
      : 'manual transfer'

    return `Deposit from ${selectedBusiness.name} ${noteType}`
  }

  const displayNote = formData.customNote.trim() || generateAutoNote()

  const validateForm = () => {
    const newErrors = {
      sourceBusinessId: '',
      amount: '',
    }

    if (!formData.sourceBusinessId) {
      newErrors.sourceBusinessId = 'Please select a business'
    }

    const amount = parseFloat(formData.amount)
    if (!formData.amount || isNaN(amount)) {
      newErrors.amount = 'Please enter a valid amount'
    } else if (amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    } else if (amount > 999999999.99) {
      newErrors.amount = 'Amount exceeds maximum allowed value'
    } else if (selectedBusiness && amount > selectedBusiness.balance) {
      newErrors.amount = `Insufficient balance. Available: $${selectedBusiness.balance.toFixed(2)}`
    }

    setErrors(newErrors)
    return !newErrors.sourceBusinessId && !newErrors.amount
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/payroll/account/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sourceBusinessId: formData.sourceBusinessId,
          amount: parseFloat(formData.amount),
          transactionType: formData.transactionType,
          customNote: formData.customNote.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        customAlert({
          title: 'Success',
          message: `Deposit of $${parseFloat(formData.amount).toFixed(2)} created successfully`,
          type: 'success',
        })

        // Reset form
        setFormData({
          sourceBusinessId: '',
          amount: '',
          transactionType: 'MANUAL_TRANSFER',
          customNote: '',
        })

        if (onSuccess) {
          onSuccess()
        }
      } else {
        customAlert({
          title: 'Error',
          message: data.error || 'Failed to create deposit',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Error creating deposit:', error)
      customAlert({
        title: 'Error',
        message: 'An error occurred while creating the deposit',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Business Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Source Business <span className="text-red-500">*</span>
        </label>
        {loadingBusinesses ? (
          <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-600 rounded"></div>
        ) : (
          <select
            value={formData.sourceBusinessId}
            onChange={(e) => {
              setFormData({ ...formData, sourceBusinessId: e.target.value })
              setErrors({ ...errors, sourceBusinessId: '' })
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.sourceBusinessId ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select a business...</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name} ({business.type}) - Balance: {formatCurrency(business.balance)}
              </option>
            ))}
          </select>
        )}
        {errors.sourceBusinessId && (
          <p className="mt-1 text-sm text-red-500">{errors.sourceBusinessId}</p>
        )}
      </div>

      {/* Business Balance Display */}
      {selectedBusiness && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800 font-medium">{selectedBusiness.name}</p>
              <p className="text-xs text-blue-600">Business Type: {selectedBusiness.type}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-600">Available Balance</p>
              <p className="text-lg font-bold text-blue-900">
                {formatCurrency(selectedBusiness.balance)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Amount Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Deposit Amount <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) => {
              setFormData({ ...formData, amount: e.target.value })
              setErrors({ ...errors, amount: '' })
            }}
            className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.amount ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0.00"
          />
        </div>
        {errors.amount && (
          <p className="mt-1 text-sm text-red-500">{errors.amount}</p>
        )}
        {selectedBusiness && formData.amount && !errors.amount && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Remaining balance after deposit: {formatCurrency(selectedBusiness.balance - parseFloat(formData.amount || '0'))}
          </p>
        )}
      </div>

      {/* Transaction Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Transaction Type
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              value="MANUAL_TRANSFER"
              checked={formData.transactionType === 'MANUAL_TRANSFER'}
              onChange={(e) => setFormData({ ...formData, transactionType: e.target.value as any })}
              className="mr-2"
            />
            <span className="text-sm">Manual Transfer</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="PAYROLL_EXPENSE"
              checked={formData.transactionType === 'PAYROLL_EXPENSE'}
              onChange={(e) => setFormData({ ...formData, transactionType: e.target.value as any })}
              className="mr-2"
            />
            <span className="text-sm">Payroll Expense</span>
          </label>
        </div>
      </div>

      {/* Custom Note (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Custom Note (Optional)
        </label>
        <textarea
          value={formData.customNote}
          onChange={(e) => setFormData({ ...formData, customNote: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={2}
          placeholder="Leave empty to use auto-generated note"
        />
      </div>

      {/* Auto-Generated Note Preview */}
      {displayNote && (
        <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction Note:</p>
          <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{displayNote}</p>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={() => {
            setFormData({
              sourceBusinessId: '',
              amount: '',
              transactionType: 'MANUAL_TRANSFER',
              customNote: '',
            })
            setErrors({ sourceBusinessId: '', amount: '' })
          }}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={submitting || loadingBusinesses}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Creating...' : 'Create Deposit'}
        </button>
      </div>
    </form>
  )
}
