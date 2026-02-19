"use client"

import { useState, useEffect } from 'react'
import type { OnSuccessArg } from '@/types/ui'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { useToastContext } from '@/components/ui/toast'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import { DateInput } from '@/components/ui/date-input'
import { PayeeSelector } from './payee-selector'
import { SearchableCategorySelector } from './searchable-category-selector'
import { CreateIndividualPayeeModal } from './create-individual-payee-modal'
import { getTodayLocalDateString } from '@/lib/date-utils'

interface ExpenseCategory {
  id: string
  name: string
  emoji: string
  color: string
  requiresSubcategory?: boolean
  subcategories?: ExpenseSubcategory[]
}

interface ExpenseSubcategory {
  id: string
  name: string
  emoji: string
  subSubcategories?: ExpenseSubSubcategory[]
}

interface ExpenseSubSubcategory {
  id: string
  name: string
  emoji: string
}

function getDefaultDomainName(businessType: string): string {
  const map: Record<string, string> = {
    restaurant: 'Restaurant',
    grocery: 'Groceries',
    clothing: 'Clothing',
    hardware: 'Hardware',
    construction: 'Construction',
    vehicles: 'Vehicle',
  }
  return map[businessType] || 'Business'
}

interface QuickPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  accountName: string
  currentBalance: number
  onSuccess: (payload: OnSuccessArg) => void
  onError: (error: string) => void
  canCreatePayees?: boolean
  canChangeCategory?: boolean
  accountType?: string
  defaultCategoryBusinessType?: string
}

export function QuickPaymentModal({
  isOpen,
  onClose,
  accountId,
  accountName,
  currentBalance,
  onSuccess,
  onError,
  canCreatePayees = false,
  canChangeCategory = true,
  accountType = 'GENERAL',
  defaultCategoryBusinessType
}: QuickPaymentModalProps) {
  const isPersonalAccount = accountType === 'PERSONAL'
  const [loading, setLoading] = useState(false)
  const [showIndividualModal, setShowIndividualModal] = useState(false)
  const [payeeRefreshTrigger, setPayeeRefreshTrigger] = useState(0)
  const [skipPayee, setSkipPayee] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingSubcategories, setLoadingSubcategories] = useState(false)
  const toast = useToastContext()
  const customAlert = useAlert()
  const customConfirm = useConfirm()

  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [subcategories, setSubcategories] = useState<ExpenseSubcategory[]>([])
  const [subSubcategories, setSubSubcategories] = useState<ExpenseSubSubcategory[]>([])

  const [formData, setFormData] = useState({
    payee: null as { type: string; id: string; name: string } | null,
    categoryId: '',
    subcategoryId: '',
    subSubcategoryId: '',
    amount: '',
    paymentDate: getTodayLocalDateString(),
    notes: '',
  })

  const [errors, setErrors] = useState({
    payee: '',
    categoryId: '',
    amount: '',
    paymentDate: '',
  })

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  // Auto-select category matching business type when categories load
  useEffect(() => {
    if (categories.length > 0 && defaultCategoryBusinessType && !formData.categoryId) {
      const domainName = getDefaultDomainName(defaultCategoryBusinessType)
      const match = categories.find(c => c.name === domainName)
      if (match) {
        setFormData(prev => ({ ...prev, categoryId: match.id }))
      }
    }
  }, [categories, defaultCategoryBusinessType])

  // Load subcategories when category changes
  useEffect(() => {
    if (formData.categoryId) {
      loadSubcategories(formData.categoryId)
      setFormData(prev => ({ ...prev, subcategoryId: '', subSubcategoryId: '' }))
      setSubSubcategories([])
    } else {
      setSubcategories([])
      setSubSubcategories([])
    }
  }, [formData.categoryId])

  // Load sub-subcategories when subcategory changes
  useEffect(() => {
    if (formData.subcategoryId) {
      loadSubSubcategories(formData.subcategoryId)
      setFormData(prev => ({ ...prev, subSubcategoryId: '' }))
    } else {
      setSubSubcategories([])
    }
  }, [formData.subcategoryId])

  const loadCategories = async () => {
    try {
      setLoadingCategories(true)
      const response = await fetch('/api/expense-categories/hierarchical', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        const flattenedCategories: ExpenseCategory[] = []

        if (data.domains && Array.isArray(data.domains)) {
          data.domains.forEach((domain: any) => {
            if (isPersonalAccount && domain.name !== 'Personal') return
            if (domain.expense_categories && Array.isArray(domain.expense_categories)) {
              domain.expense_categories.forEach((cat: any) => {
                flattenedCategories.push({
                  id: cat.id,
                  name: cat.name,
                  emoji: cat.emoji,
                  color: cat.color || '#000000',
                  requiresSubcategory: cat.requiresSubcategory ?? false,
                })
              })
            }
          })
        }

        setCategories(flattenedCategories)

        // For PERSONAL accounts: auto-select the first Personal category
        if (isPersonalAccount && flattenedCategories.length > 0) {
          setFormData(prev => ({ ...prev, categoryId: flattenedCategories[0].id }))
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const loadSubcategories = async (categoryId: string) => {
    try {
      setLoadingSubcategories(true)
      const response = await fetch(`/api/expense-categories/${categoryId}/subcategories`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setSubcategories(data.subcategories || [])
      }
    } catch (error) {
      console.error('Error loading subcategories:', error)
    } finally {
      setLoadingSubcategories(false)
    }
  }

  const loadSubSubcategories = async (subcategoryId: string) => {
    try {
      const response = await fetch(`/api/expense-categories/subcategories/${subcategoryId}/sub-subcategories`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setSubSubcategories(data.subSubcategories || [])
      }
    } catch (error) {
      console.error('Error loading sub-subcategories:', error)
    }
  }

  const validateForm = async () => {
    const newErrors = {
      payee: '',
      categoryId: '',
      amount: '',
      paymentDate: ''
    }

    if (!skipPayee && !formData.payee) {
      newErrors.payee = 'Please select a payee'
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Please select a category'
    }

    const amount = parseFloat(formData.amount)
    if (!formData.amount || isNaN(amount)) {
      newErrors.amount = 'Please enter a valid amount'
    } else if (amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    } else if (amount > 999999999.99) {
      newErrors.amount = 'Amount exceeds maximum allowed value'
    } else if (amount > currentBalance) {
      newErrors.amount = `Insufficient funds. Available balance: $${currentBalance.toFixed(2)}`
    } else if (formData.payee?.type === 'PERSON') {
      // Validate payment amount for individuals without national ID
      try {
        console.log('[QuickPaymentModal] Validating person payment:', {
          payeeId: formData.payee.id,
          payeeName: formData.payee.name,
          amount
        })

        const [settingsRes, personRes] = await Promise.all([
          fetch('/api/admin/settings'),
          fetch(`/api/persons/${formData.payee.id}`)
        ])

        console.log('[QuickPaymentModal] API responses:', {
          settingsOk: settingsRes.ok,
          personOk: personRes.ok
        })

        if (settingsRes.ok && personRes.ok) {
          const settings = await settingsRes.json()
          const personData = await personRes.json()
          const maxPaymentWithoutId = settings.maxPaymentWithoutId || 100

          console.log('[QuickPaymentModal] Validation data:', {
            personNationalId: personData.nationalId,
            maxPaymentWithoutId,
            amount,
            willBlock: !personData.nationalId && amount >= maxPaymentWithoutId
          })

          if (personData && !personData.nationalId && amount >= maxPaymentWithoutId) {
            newErrors.amount = `Cannot pay $${maxPaymentWithoutId.toFixed(2)} or more to ${formData.payee.name} without a national ID. Maximum allowed: $${(maxPaymentWithoutId - 0.01).toFixed(2)}. Please add their national ID or reduce the amount.`
            console.log('[QuickPaymentModal] Validation BLOCKED - error set:', newErrors.amount)
          } else {
            console.log('[QuickPaymentModal] Validation PASSED')
          }
        }
      } catch (error) {
        console.error('[QuickPaymentModal] Error validating payee:', error)
      }
    }

    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Please select a payment date'
    } else {
      const paymentDate = new Date(formData.paymentDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (paymentDate > today) {
        newErrors.paymentDate = 'Payment date cannot be in the future'
      }
    }

    setErrors(newErrors)
    return !newErrors.payee && !newErrors.categoryId && !newErrors.amount && !newErrors.paymentDate
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!(await validateForm())) {
      return
    }

    setLoading(true)

    try {
      // Construct the payment payload with correct field names based on payee type
      const payment = {
        payeeType: skipPayee ? 'NONE' : formData.payee!.type,
        payeeUserId: !skipPayee && formData.payee?.type === 'USER' ? formData.payee.id : undefined,
        payeeEmployeeId: !skipPayee && formData.payee?.type === 'EMPLOYEE' ? formData.payee.id : undefined,
        payeePersonId: !skipPayee && formData.payee?.type === 'PERSON' ? formData.payee.id : undefined,
        payeeBusinessId: !skipPayee && formData.payee?.type === 'BUSINESS' ? formData.payee.id : undefined,
        // Form "category" = domain, "subcategory" = actual category, "sub-subcategory" = subcategory
        categoryId: formData.subcategoryId || formData.categoryId,
        subcategoryId: formData.subSubcategoryId || null,
        amount: parseFloat(formData.amount),
        paymentDate: formData.paymentDate,
        notes: formData.notes || null,
        isFullPayment: true,
        status: 'SUBMITTED'
      }

      const result = await fetchWithValidation(`/api/expense-account/${accountId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments: [payment] })
      })

      // Success
      toast.push('Payment created successfully')
      try {
        onSuccess({
          message: 'Payment created successfully',
          id: result.data?.payments?.[0]?.id,
          refresh: true
        })
      } catch (e) {}

      onClose()

      // Reset form
      resetForm()
    } catch (error) {
      console.error('Create payment error:', error)
      const message = error instanceof Error ? error.message : 'Failed to create payment'
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
      payee: null,
      categoryId: '',
      subcategoryId: '',
      subSubcategoryId: '',
      amount: '',
      paymentDate: getTodayLocalDateString(),
      notes: '',
    })
    setErrors({
      payee: '',
      categoryId: '',
      amount: '',
      paymentDate: '',
    })
    setSubcategories([])
    setSubSubcategories([])
  }

  const handleCancel = async () => {
    // Check if form has unsaved changes
    const hasChanges = formData.payee !== null ||
                       formData.categoryId !== '' ||
                       formData.amount !== '' ||
                       formData.notes !== ''

    if (hasChanges) {
      const confirmed = await customConfirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      )
      if (!confirmed) return
    }

    onClose()
    resetForm()
  }

  const handleCreateIndividualSuccess = (payload: any) => {
    if (payload.payee) {
      setFormData({
        ...formData,
        payee: {
          type: 'PERSON',
          id: payload.payee.id,
          name: payload.payee.fullName
        }
      })
      setErrors({ ...errors, payee: '' })
      setPayeeRefreshTrigger(prev => prev + 1)
    }
    setShowIndividualModal(false)
  }

  const selectedCategory = categories.find(c => c.id === formData.categoryId)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-primary mb-2">Quick Payment</h2>
        <p className="text-sm text-secondary mb-4">
          from {accountName} (Balance: ${currentBalance.toFixed(2)})
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payee Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-secondary">
                Payee {!isPersonalAccount && <span className="text-red-500">*</span>}
              </label>
              {isPersonalAccount && (
                <label className="flex items-center gap-1.5 text-xs text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipPayee}
                    onChange={(e) => {
                      setSkipPayee(e.target.checked)
                      if (e.target.checked) setFormData(prev => ({ ...prev, payee: null }))
                      setErrors(prev => ({ ...prev, payee: '' }))
                    }}
                    className="rounded"
                  />
                  No specific payee
                </label>
              )}
            </div>
            {!skipPayee && (
              <PayeeSelector
                value={formData.payee}
                onChange={(payee) => {
                  setFormData({ ...formData, payee })
                  setErrors({ ...errors, payee: '' })
                }}
                onCreateIndividual={canCreatePayees ? () => setShowIndividualModal(true) : undefined}
                error={errors.payee}
                refreshTrigger={payeeRefreshTrigger}
              />
            )}
          </div>

          {/* Category Selection — hidden for Personal accounts (auto-set) */}
          {!isPersonalAccount && (
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            {loadingCategories ? (
              <div className="text-sm text-secondary">Loading categories...</div>
            ) : (
              <SearchableCategorySelector
                categories={categories}
                value={formData.categoryId}
                onChange={(categoryId) => {
                  setFormData({ ...formData, categoryId })
                  setErrors({ ...errors, categoryId: '' })
                }}
                error={errors.categoryId}
                disabled={!canChangeCategory}
              />
            )}
          </div>
          )}

          {/* Subcategory Selection (if category has subcategories) */}
          {subcategories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Subcategory {selectedCategory?.requiresSubcategory && <span className="text-red-500">*</span>}
              </label>
              {loadingSubcategories ? (
                <div className="text-sm text-secondary">Loading subcategories...</div>
              ) : (
                <select
                  value={formData.subcategoryId}
                  onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a subcategory...</option>
                  {subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.emoji} {subcategory.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Sub-Subcategory Selection (if subcategory has sub-subcategories) */}
          {subSubcategories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Sub-Subcategory
              </label>
              <select
                value={formData.subSubcategoryId}
                onChange={(e) => setFormData({ ...formData, subSubcategoryId: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a sub-subcategory...</option>
                {subSubcategories.map((subSubcategory) => (
                  <option key={subSubcategory.id} value={subSubcategory.id}>
                    {subSubcategory.emoji} {subSubcategory.name}
                  </option>
                ))}
              </select>
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
              Payment Date <span className="text-red-500">*</span>
            </label>
            <DateInput
              value={formData.paymentDate}
              onChange={(value) => {
                setFormData({ ...formData, paymentDate: value })
                setErrors({ ...errors, paymentDate: '' })
              }}
              error={errors.paymentDate}
              max={getTodayLocalDateString()}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="Add any additional notes..."
              maxLength={500}
            />
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
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Payment'}
            </button>
          </div>
        </form>
      </div>

      {/* Create Individual Payee Modal */}
      <CreateIndividualPayeeModal
        isOpen={showIndividualModal}
        onClose={() => setShowIndividualModal(false)}
        onSuccess={handleCreateIndividualSuccess}
        onError={(error) => console.error('Create individual error:', error)}
      />
    </div>
  )
}
