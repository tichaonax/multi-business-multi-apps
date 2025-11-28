'use client'

import { useState, useEffect } from 'react'
import { useAlert } from '@/components/ui/confirm-modal'
import { DateInput } from '@/components/ui/date-input'

interface Business {
  id: string
  name: string
  type: string
  balance: number
}

interface DepositFormProps {
  accountId: string
  onSuccess?: () => void
}

export function DepositForm({ accountId, onSuccess }: DepositFormProps) {
  const customAlert = useAlert()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loadingBusinesses, setLoadingBusinesses] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    sourceType: 'MANUAL' as 'BUSINESS' | 'MANUAL' | 'OTHER',
    sourceBusinessId: '',
    amount: '',
    depositDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    transactionType: 'DEPOSIT' as string,
    manualNote: '',
  })

  const [errors, setErrors] = useState({
    sourceBusinessId: '',
    amount: '',
    depositDate: '',
  })

  useEffect(() => {
    if (formData.sourceType === 'BUSINESS') {
      fetchBusinesses()
    }
  }, [formData.sourceType])

  const fetchBusinesses = async () => {
    try {
      setLoadingBusinesses(true)
      const response = await fetch('/api/businesses', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        const businessList = data.businesses || []
        const businessesWithAccounts = businessList.filter((b: any) => b.business_accounts)

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
    if (formData.sourceType === 'BUSINESS' && selectedBusiness) {
      return `Deposit from ${selectedBusiness.name} business account`
    }
    if (formData.sourceType === 'OTHER') {
      return 'Deposit from external source'
    }
    return 'Manual deposit'
  }

  const displayNote = formData.manualNote.trim() || generateAutoNote()

  const validateForm = () => {
    const newErrors = {
      sourceBusinessId: '',
      amount: '',
      depositDate: '',
    }

    // Validate business selection if source is BUSINESS
    if (formData.sourceType === 'BUSINESS' && !formData.sourceBusinessId) {
      newErrors.sourceBusinessId = 'Please select a business'
    }

    // Validate amount
    const amount = parseFloat(formData.amount)
    if (!formData.amount || isNaN(amount)) {
      newErrors.amount = 'Please enter a valid amount'
    } else if (amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    } else if (amount > 999999999.99) {
      newErrors.amount = 'Amount exceeds maximum allowed value'
    } else if (formData.sourceType === 'BUSINESS' && selectedBusiness && amount > selectedBusiness.balance) {
      newErrors.amount = `Insufficient business balance. Available: $${selectedBusiness.balance.toFixed(2)}`
    }

    // Validate deposit date
    if (!formData.depositDate) {
      newErrors.depositDate = 'Please select a deposit date'
    } else {
      const depositDate = new Date(formData.depositDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (depositDate > today) {
        newErrors.depositDate = 'Deposit date cannot be in the future'
      }
    }

    setErrors(newErrors)
    return !newErrors.sourceBusinessId && !newErrors.amount && !newErrors.depositDate
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`/api/expense-account/${accountId}/deposits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sourceType: formData.sourceType,
          sourceBusinessId: formData.sourceType === 'BUSINESS' ? formData.sourceBusinessId : undefined,
          amount: parseFloat(formData.amount),
          depositDate: formData.depositDate,
          transactionType: formData.transactionType,
          manualNote: formData.manualNote.trim() || undefined,
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
          sourceType: 'MANUAL',
          sourceBusinessId: '',
          amount: '',
          depositDate: new Date().toISOString().split('T')[0],
          transactionType: 'DEPOSIT',
          manualNote: '',
        })
        setErrors({ sourceBusinessId: '', amount: '', depositDate: '' })

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
      {/* Source Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Deposit Source <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, sourceType: 'BUSINESS', sourceBusinessId: '' })}
            className={`p-3 border-2 rounded-lg transition-colors ${
              formData.sourceType === 'BUSINESS'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            <div className="text-2xl mb-1">🏢</div>
            <div className="text-sm font-medium">Business</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Transfer from business account</div>
          </button>

          <button
            type="button"
            onClick={() => setFormData({ ...formData, sourceType: 'MANUAL', sourceBusinessId: '' })}
            className={`p-3 border-2 rounded-lg transition-colors ${
              formData.sourceType === 'MANUAL'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            <div className="text-2xl mb-1">✋</div>
            <div className="text-sm font-medium">Manual</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Manual cash or bank deposit</div>
          </button>

          <button
            type="button"
            onClick={() => setFormData({ ...formData, sourceType: 'OTHER', sourceBusinessId: '' })}
            className={`p-3 border-2 rounded-lg transition-colors ${
              formData.sourceType === 'OTHER'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            <div className="text-2xl mb-1">💼</div>
            <div className="text-sm font-medium">Other</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">External source</div>
          </button>
        </div>
      </div>

      {/* Business Selection (only if source type is BUSINESS) */}
      {formData.sourceType === 'BUSINESS' && (
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
                errors.sourceBusinessId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
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
      )}

      {/* Business Balance Display */}
      {selectedBusiness && formData.sourceType === 'BUSINESS' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">{selectedBusiness.name}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Business Type: {selectedBusiness.type}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-600 dark:text-blue-400">Available Balance</p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-200">
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
            max="999999999.99"
            value={formData.amount}
            onChange={(e) => {
              setFormData({ ...formData, amount: e.target.value })
              setErrors({ ...errors, amount: '' })
            }}
            className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="0.00"
          />
        </div>
        {errors.amount && (
          <p className="mt-1 text-sm text-red-500">{errors.amount}</p>
        )}
        {selectedBusiness && formData.amount && !errors.amount && formData.sourceType === 'BUSINESS' && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Remaining business balance after deposit: {formatCurrency(selectedBusiness.balance - parseFloat(formData.amount || '0'))}
          </p>
        )}
      </div>

      {/* Deposit Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Deposit Date <span className="text-red-500">*</span>
        </label>
        <DateInput
          value={formData.depositDate}
          onChange={(value) => {
            setFormData({ ...formData, depositDate: value })
            setErrors({ ...errors, depositDate: '' })
          }}
          required
        />
        {errors.depositDate && (
          <p className="mt-1 text-sm text-red-500">{errors.depositDate}</p>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          You can record past deposits, but future dates are not allowed
        </p>
      </div>

      {/* Custom Note (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Custom Note (Optional)
        </label>
        <textarea
          value={formData.manualNote}
          onChange={(e) => setFormData({ ...formData, manualNote: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={2}
          placeholder="Leave empty to use auto-generated note"
          maxLength={500}
        />
      </div>

      {/* Auto-Generated Note Preview */}
      {displayNote && (
        <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Deposit Note:</p>
          <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{displayNote}</p>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => {
            setFormData({
              sourceType: 'MANUAL',
              sourceBusinessId: '',
              amount: '',
              depositDate: new Date().toISOString().split('T')[0],
              transactionType: 'DEPOSIT',
              manualNote: '',
            })
            setErrors({ sourceBusinessId: '', amount: '', depositDate: '' })
          }}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={submitting || (formData.sourceType === 'BUSINESS' && loadingBusinesses)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Creating...' : 'Create Deposit'}
        </button>
      </div>
    </form>
  )
}
