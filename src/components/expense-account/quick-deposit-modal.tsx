"use client"

import { useState, useEffect } from 'react'
import type { OnSuccessArg } from '@/types/ui'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { useToastContext } from '@/components/ui/toast'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import { DateInput } from '@/components/ui/date-input'
import { getTodayLocalDateString } from '@/lib/date-utils'

interface Business {
  id: string
  name: string
  type: string
  balance: number
}

interface QuickDepositModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  accountName: string
  onSuccess: (payload: OnSuccessArg) => void
  onError: (error: string) => void
}

export function QuickDepositModal({
  isOpen,
  onClose,
  accountId,
  accountName,
  onSuccess,
  onError
}: QuickDepositModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingBusinesses, setLoadingBusinesses] = useState(false)
  const toast = useToastContext()
  const customAlert = useAlert()
  const customConfirm = useConfirm()

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [formData, setFormData] = useState({
    sourceType: 'MANUAL' as 'BUSINESS' | 'MANUAL' | 'OTHER',
    sourceBusinessId: '',
    amount: '',
    depositDate: getTodayLocalDateString(),
    manualNote: '',
  })

  const [errors, setErrors] = useState({
    sourceBusinessId: '',
    amount: '',
    depositDate: '',
  })

  useEffect(() => {
    if (formData.sourceType === 'BUSINESS' && businesses.length === 0) {
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
          balance: Number(b.business_accounts?.balance || 0)
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
    } else if (formData.sourceType === 'BUSINESS' && selectedBusiness && amount > Number(selectedBusiness.balance)) {
      newErrors.amount = `Insufficient business balance. Available: $${Number(selectedBusiness.balance).toFixed(2)}`
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

    setLoading(true)

    try {
      const result = await fetchWithValidation(`/api/expense-account/${accountId}/deposits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: formData.sourceType,
          sourceBusinessId: formData.sourceType === 'BUSINESS' ? formData.sourceBusinessId : undefined,
          amount: parseFloat(formData.amount),
          depositDate: formData.depositDate,
          transactionType: 'DEPOSIT',
          notes: formData.manualNote.trim() || generateAutoNote(),
        })
      })

      // Success
      toast.push('Deposit created successfully')
      try {
        onSuccess({
          message: 'Deposit created successfully',
          id: result.data?.id,
          refresh: true
        })
      } catch (e) {}

      onClose()

      // Reset form
      resetForm()
    } catch (error) {
      console.error('Create deposit error:', error)
      const message = error instanceof Error ? error.message : 'Failed to create deposit'
      toast.push(message)
      try {
        onError(message)
      } catch (e) {}
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      sourceType: 'MANUAL',
      sourceBusinessId: '',
      amount: '',
      depositDate: getTodayLocalDateString(),
      manualNote: '',
    })
    setErrors({
      sourceBusinessId: '',
      amount: '',
      depositDate: '',
    })
  }

  const handleCancel = async () => {
    // Check if form has unsaved changes
    const hasChanges = formData.amount !== '' ||
                       formData.manualNote !== '' ||
                       formData.sourceBusinessId !== ''

    if (hasChanges) {
      const confirmed = await customConfirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      )
      if (!confirmed) return
    }

    onClose()
    resetForm()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-primary mb-2">Quick Deposit</h2>
        <p className="text-sm text-secondary mb-4">
          to {accountName}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source Type */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Deposit Source <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.sourceType}
              onChange={(e) => {
                const newSourceType = e.target.value as 'BUSINESS' | 'MANUAL' | 'OTHER'
                setFormData({
                  ...formData,
                  sourceType: newSourceType,
                  sourceBusinessId: '' // Reset business selection
                })
                setErrors({ ...errors, sourceBusinessId: '' })
              }}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="MANUAL">Manual Entry</option>
              <option value="BUSINESS">From Business Account</option>
              <option value="OTHER">Other Source</option>
            </select>
          </div>

          {/* Business Selection (if source is BUSINESS) */}
          {formData.sourceType === 'BUSINESS' && (
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Select Business <span className="text-red-500">*</span>
              </label>
              {loadingBusinesses ? (
                <div className="text-sm text-secondary">Loading businesses...</div>
              ) : (
                <>
                  <select
                    value={formData.sourceBusinessId}
                    onChange={(e) => {
                      setFormData({ ...formData, sourceBusinessId: e.target.value })
                      setErrors({ ...errors, sourceBusinessId: '' })
                    }}
                    className={`w-full px-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.sourceBusinessId ? 'border-red-500' : 'border-border'
                    }`}
                  >
                    <option value="">Select a business...</option>
                    {businesses.map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.name} (Balance: ${Number(business.balance).toFixed(2)})
                      </option>
                    ))}
                  </select>
                  {errors.sourceBusinessId && (
                    <p className="text-xs text-red-500 mt-1">{errors.sourceBusinessId}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary">
                $
              </span>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => {
                  setFormData({ ...formData, amount: e.target.value })
                  setErrors({ ...errors, amount: '' })
                }}
                className={`w-full pl-8 pr-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.amount ? 'border-red-500' : 'border-border'
                }`}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Deposit Date <span className="text-red-500">*</span>
            </label>
            <DateInput
              value={formData.depositDate}
              onChange={(value) => {
                setFormData({ ...formData, depositDate: value })
                setErrors({ ...errors, depositDate: '' })
              }}
              error={errors.depositDate}
              max={getTodayLocalDateString()}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.manualNote}
              onChange={(e) => setFormData({ ...formData, manualNote: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder={generateAutoNote()}
              maxLength={500}
            />
            <p className="text-xs text-secondary mt-1">
              Leave blank to use auto-generated note
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-secondary bg-background border border-border rounded-md hover:bg-muted"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Deposit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
