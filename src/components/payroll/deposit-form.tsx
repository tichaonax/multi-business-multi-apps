'use client'

import { useState, useEffect } from 'react'
import { useAlert } from '@/components/ui/confirm-modal'

type SourceType = 'FROM_EXPENSE_ACCOUNT' | 'FROM_BUSINESS_ACCOUNT'

interface Business {
  id: string
  name: string
  type: string
  balance: number
}

interface ExpenseAccount {
  id: string
  accountName: string
  accountNumber: string
  balance: number
}

interface DepositFormProps {
  onSuccess?: () => void
}

export function DepositForm({ onSuccess }: DepositFormProps) {
  const customAlert = useAlert()
  const [sourceType, setSourceType] = useState<SourceType>('FROM_EXPENSE_ACCOUNT')
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [expenseAccounts, setExpenseAccounts] = useState<ExpenseAccount[]>([])
  const [loadingBusinesses, setLoadingBusinesses] = useState(false)
  const [loadingExpenseAccounts, setLoadingExpenseAccounts] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    sourceBusinessId: '',
    sourceExpenseAccountId: '',
    amount: '',
    customNote: '',
  })

  const [errors, setErrors] = useState({
    source: '',
    amount: '',
  })

  // Load expense accounts on mount (default tab)
  useEffect(() => {
    fetchExpenseAccounts()
  }, [])

  const fetchExpenseAccounts = async () => {
    if (expenseAccounts.length > 0) return
    setLoadingExpenseAccounts(true)
    try {
      const response = await fetch('/api/expense-account', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        const list: any[] = data.data?.accounts || []
        setExpenseAccounts(
          list
            .filter((a) => (a.balance || 0) > 0)
            .map((a) => ({
              id: a.id,
              accountName: a.accountName,
              accountNumber: a.accountNumber,
              balance: a.balance || 0,
            }))
        )
      }
    } catch (error) {
      console.error('Error fetching expense accounts:', error)
    } finally {
      setLoadingExpenseAccounts(false)
    }
  }

  const fetchBusinesses = async () => {
    if (businesses.length > 0) return
    setLoadingBusinesses(true)
    try {
      const response = await fetch('/api/businesses', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        const businessList = data.businesses || []
        setBusinesses(
          businessList
            .filter((b: any) => b.business_accounts && (b.business_accounts?.balance || 0) > 0)
            .map((b: any) => ({
              id: b.id,
              name: b.name,
              type: b.type,
              balance: b.business_accounts?.balance || 0,
            }))
        )
      }
    } catch (error) {
      console.error('Error fetching businesses:', error)
    } finally {
      setLoadingBusinesses(false)
    }
  }

  const handleSourceTypeChange = (type: SourceType) => {
    setSourceType(type)
    setErrors({ source: '', amount: '' })
    if (type === 'FROM_BUSINESS_ACCOUNT') fetchBusinesses()
    if (type === 'FROM_EXPENSE_ACCOUNT') fetchExpenseAccounts()
  }

  const selectedBusiness = businesses.find((b) => b.id === formData.sourceBusinessId)
  const selectedExpenseAccount = expenseAccounts.find((a) => a.id === formData.sourceExpenseAccountId)

  const selectedName =
    sourceType === 'FROM_EXPENSE_ACCOUNT'
      ? selectedExpenseAccount?.accountName
      : selectedBusiness?.name

  const selectedBalance =
    sourceType === 'FROM_EXPENSE_ACCOUNT'
      ? selectedExpenseAccount?.balance ?? null
      : selectedBusiness?.balance ?? null

  const generateAutoNote = () => {
    if (!selectedName) return ''
    if (sourceType === 'FROM_EXPENSE_ACCOUNT') {
      return `💵 Payroll funding from ${selectedName} (${selectedExpenseAccount?.accountNumber})`
    }
    return `💵 Payroll funding from ${selectedName}`
  }

  const displayNote = formData.customNote.trim() || generateAutoNote()

  const validateForm = () => {
    const newErrors = { source: '', amount: '' }

    if (sourceType === 'FROM_EXPENSE_ACCOUNT' && !formData.sourceExpenseAccountId) {
      newErrors.source = 'Please select an expense account'
    }
    if (sourceType === 'FROM_BUSINESS_ACCOUNT' && !formData.sourceBusinessId) {
      newErrors.source = 'Please select a business'
    }

    const amount = parseFloat(formData.amount)
    if (!formData.amount || isNaN(amount)) {
      newErrors.amount = 'Please enter a valid amount'
    } else if (amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    } else if (amount > 999999999.99) {
      newErrors.amount = 'Amount exceeds maximum allowed value'
    } else if (selectedBalance !== null && amount > selectedBalance) {
      newErrors.amount = `Insufficient balance. Available: ${formatCurrency(selectedBalance)}`
    }

    setErrors(newErrors)
    return !newErrors.source && !newErrors.amount
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setSubmitting(true)

    try {
      const body: any = {
        amount: parseFloat(formData.amount),
        customNote: formData.customNote.trim() || undefined,
      }

      if (sourceType === 'FROM_EXPENSE_ACCOUNT') {
        body.sourceExpenseAccountId = formData.sourceExpenseAccountId
        body.transactionType = 'PAYROLL_FUNDING'
      } else {
        body.sourceBusinessId = formData.sourceBusinessId
        body.transactionType = 'MANUAL_TRANSFER'
      }

      const response = await fetch('/api/payroll/account/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok) {
        customAlert({
          title: 'Success',
          description: `Deposit of ${formatCurrency(parseFloat(formData.amount))} created successfully`,
        })
        setFormData({
          sourceBusinessId: '',
          sourceExpenseAccountId: '',
          amount: '',
          customNote: '',
        })
        // Refresh expense accounts list to show updated balance
        setExpenseAccounts([])
        if (sourceType === 'FROM_EXPENSE_ACCOUNT') fetchExpenseAccounts()
        if (onSuccess) onSuccess()
      } else {
        customAlert({ title: 'Error', description: data.error || 'Failed to create deposit' })
      }
    } catch (error) {
      console.error('Error creating deposit:', error)
      customAlert({ title: 'Error', description: 'An error occurred while creating the deposit' })
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount)

  const isLoading = sourceType === 'FROM_EXPENSE_ACCOUNT' ? loadingExpenseAccounts : loadingBusinesses

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Source Type Toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Deposit Source
        </label>
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          {([
            { value: 'FROM_EXPENSE_ACCOUNT' as SourceType, label: '💼 From Expense Account' },
            { value: 'FROM_BUSINESS_ACCOUNT' as SourceType, label: '🏦 From Business Account' },
          ]).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleSourceTypeChange(value)}
              className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                sourceType === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Expense Account Dropdown */}
      {sourceType === 'FROM_EXPENSE_ACCOUNT' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Expense Account <span className="text-red-500">*</span>
          </label>
          {loadingExpenseAccounts ? (
            <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-600 rounded"></div>
          ) : (
            <select
              value={formData.sourceExpenseAccountId}
              onChange={(e) => {
                setFormData({ ...formData, sourceExpenseAccountId: e.target.value })
                setErrors({ ...errors, source: '' })
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.source ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
            >
              <option value="">Select an expense account...</option>
              {expenseAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountName} ({account.accountNumber}) — Balance: {formatCurrency(account.balance)}
                </option>
              ))}
            </select>
          )}
          {errors.source && <p className="mt-1 text-sm text-red-500">{errors.source}</p>}
        </div>
      )}

      {/* Business Account Dropdown */}
      {sourceType === 'FROM_BUSINESS_ACCOUNT' && (
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
                setErrors({ ...errors, source: '' })
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.source ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
            >
              <option value="">Select a business...</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name} ({business.type}) — Balance: {formatCurrency(business.balance)}
                </option>
              ))}
            </select>
          )}
          {errors.source && <p className="mt-1 text-sm text-red-500">{errors.source}</p>}
        </div>
      )}

      {/* Selected Source Balance Display */}
      {selectedName && selectedBalance !== null && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">{selectedName}</p>
            <div className="text-right">
              <p className="text-xs text-blue-600 dark:text-blue-400">Available Balance</p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{formatCurrency(selectedBalance)}</p>
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
            className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
              errors.amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="0.00"
          />
        </div>
        {errors.amount && <p className="mt-1 text-sm text-red-500">{errors.amount}</p>}
        {selectedBalance !== null && formData.amount && !errors.amount && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Remaining balance after deposit:{' '}
            {formatCurrency(selectedBalance - parseFloat(formData.amount || '0'))}
          </p>
        )}
      </div>

      {/* Custom Note */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Custom Note (Optional)
        </label>
        <textarea
          value={formData.customNote}
          onChange={(e) => setFormData({ ...formData, customNote: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          rows={2}
          placeholder="Leave empty to use auto-generated note"
        />
      </div>

      {/* Note Preview */}
      {displayNote && (
        <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
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
              sourceExpenseAccountId: '',
              amount: '',
              customNote: '',
            })
            setErrors({ source: '', amount: '' })
          }}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={submitting || isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Creating...' : 'Create Deposit'}
        </button>
      </div>
    </form>
  )
}
