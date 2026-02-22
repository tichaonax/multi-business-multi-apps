"use client"

import { useState, useEffect, useRef } from 'react'
import type { OnSuccessArg } from '@/types/ui'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { useToastContext } from '@/components/ui/toast'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import { DateInput } from '@/components/ui/date-input'
import { PayeeSelector } from './payee-selector'
import { SearchableCategorySelector } from './searchable-category-selector'
import { CreateIndividualPayeeModal } from './create-individual-payee-modal'
import { SupplierEditor } from '@/components/suppliers/supplier-editor'
import { getTodayLocalDateString } from '@/lib/date-utils'

// Searchable select dropdown (same pattern as payment-form)
function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  loading = false,
}: {
  value: string
  options: { id: string; label: string }[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.id === value)
  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (disabled && !loading) {
    return (
      <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed">
        {placeholder}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-background text-secondary">
        Loading...
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) setTimeout(() => inputRef.current?.focus(), 0)
        }}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between bg-background"
      >
        <span className={selected ? 'text-primary' : 'text-secondary'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search..."
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-primary"
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {value && (
              <button type="button" onClick={() => { onChange(''); setIsOpen(false); setSearch('') }}
                className="w-full px-3 py-2 text-left text-sm text-secondary hover:bg-gray-100 dark:hover:bg-gray-700">
                Clear selection
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-secondary">No matches found</div>
            ) : (
              filtered.map(option => (
                <button key={option.id} type="button"
                  onClick={() => { onChange(option.id); setIsOpen(false); setSearch('') }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                    option.id === value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium' : 'text-primary'
                  }`}>
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Quick inline modal for creating subcategory/sub-subcategory
function QuickCreateModal({
  isOpen,
  title,
  placeholder,
  onClose,
  onSubmit,
  loading,
}: {
  isOpen: boolean
  title: string
  placeholder: string
  onClose: () => void
  onSubmit: (name: string, emoji: string) => void
  loading: boolean
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📂')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[10001] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-5 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-primary mb-3">{title}</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-14 px-2 py-2 text-xl text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              maxLength={2}
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-primary focus:ring-2 focus:ring-blue-500"
              placeholder={placeholder}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="px-3 py-1.5 text-sm text-secondary border border-border rounded-md hover:bg-muted">
              Cancel
            </button>
            <button type="button" onClick={() => { if (name.trim()) { onSubmit(name.trim(), emoji); setName(''); setEmoji('📂') } }}
              disabled={loading || !name.trim()}
              className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

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
  businessId?: string
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
  defaultCategoryBusinessType,
  businessId,
}: QuickPaymentModalProps) {
  const isPersonalAccount = accountType === 'PERSONAL'
  const [loading, setLoading] = useState(false)
  const [showIndividualModal, setShowIndividualModal] = useState(false)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [payeeSearchQuery, setPayeeSearchQuery] = useState('')
  const [payeeRefreshTrigger, setPayeeRefreshTrigger] = useState(0)
  const [showCreateSubcategory, setShowCreateSubcategory] = useState(false)
  const [showCreateSubSubcategory, setShowCreateSubSubcategory] = useState(false)
  const [creatingSubItem, setCreatingSubItem] = useState(false)
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

  const handleCreateSupplierSuccess = (createdSupplierId?: string) => {
    setPayeeRefreshTrigger(prev => prev + 1)
    setShowSupplierModal(false)
  }

  const handleCreateSubcategory = async (name: string, emoji: string) => {
    if (!formData.categoryId) return
    setCreatingSubItem(true)
    try {
      const res = await fetch('/api/expense-categories/flat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, emoji, color: '#3B82F6', domainId: formData.categoryId, requiresSubcategory: false, isUserCreated: true }),
      })
      const data = await res.json()
      if (res.ok && data.data?.category) {
        await loadSubcategories(formData.categoryId)
        setFormData(prev => ({ ...prev, subcategoryId: data.data.category.id, subSubcategoryId: '' }))
        setShowCreateSubcategory(false)
      }
    } catch (error) {
      console.error('Error creating subcategory:', error)
    } finally {
      setCreatingSubItem(false)
    }
  }

  const handleCreateSubSubcategory = async (name: string, emoji: string) => {
    if (!formData.subcategoryId) return
    setCreatingSubItem(true)
    try {
      const res = await fetch('/api/expense-categories/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ categoryId: formData.subcategoryId, name, emoji }),
      })
      const data = await res.json()
      if (res.ok && data.subcategory) {
        await loadSubSubcategories(formData.subcategoryId)
        setFormData(prev => ({ ...prev, subSubcategoryId: data.subcategory.id }))
        setShowCreateSubSubcategory(false)
      }
    } catch (error) {
      console.error('Error creating sub-subcategory:', error)
    } finally {
      setCreatingSubItem(false)
    }
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
                onCreateIndividual={canCreatePayees ? (query) => { setPayeeSearchQuery(query || ''); setShowIndividualModal(true) } : undefined}
                onCreateSupplier={canCreatePayees && businessId ? (query) => { setPayeeSearchQuery(query || ''); setShowSupplierModal(true) } : undefined}
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
          {(subcategories.length > 0 || formData.categoryId) && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-secondary">
                  Subcategory {selectedCategory?.requiresSubcategory && <span className="text-red-500">*</span>}
                </label>
                {formData.categoryId && (
                  <button type="button" onClick={() => setShowCreateSubcategory(true)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium">
                    + Create New
                  </button>
                )}
              </div>
              <SearchableSelect
                value={formData.subcategoryId}
                options={subcategories.map(s => ({ id: s.id, label: `${s.emoji} ${s.name}` }))}
                onChange={(val) => setFormData({ ...formData, subcategoryId: val, subSubcategoryId: '' })}
                placeholder="Select a subcategory..."
                loading={loadingSubcategories}
                disabled={!formData.categoryId}
              />
            </div>
          )}

          {/* Sub-Subcategory Selection (if subcategory has sub-subcategories) */}
          {(subSubcategories.length > 0 || formData.subcategoryId) && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-secondary">
                  Sub-Subcategory
                </label>
                {formData.subcategoryId && (
                  <button type="button" onClick={() => setShowCreateSubSubcategory(true)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium">
                    + Create New
                  </button>
                )}
              </div>
              <SearchableSelect
                value={formData.subSubcategoryId}
                options={subSubcategories.map(s => ({ id: s.id, label: `${s.emoji} ${s.name}` }))}
                onChange={(val) => setFormData({ ...formData, subSubcategoryId: val })}
                placeholder="Select a sub-subcategory..."
                disabled={!formData.subcategoryId}
              />
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
              className="px-4 py-2 text-sm font-medium text-secondary bg-background border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
        initialName={payeeSearchQuery}
      />

      {/* Create Supplier Modal */}
      {showSupplierModal && businessId && (
        <SupplierEditor
          businessId={businessId}
          onSave={handleCreateSupplierSuccess}
          onCancel={() => setShowSupplierModal(false)}
          initialName={payeeSearchQuery}
        />
      )}

      {/* Quick create modals for subcategory and sub-subcategory */}
      <QuickCreateModal
        isOpen={showCreateSubcategory}
        title="Create Subcategory"
        placeholder="e.g., Dairy Products"
        onClose={() => setShowCreateSubcategory(false)}
        onSubmit={handleCreateSubcategory}
        loading={creatingSubItem}
      />
      <QuickCreateModal
        isOpen={showCreateSubSubcategory}
        title="Create Sub-subcategory"
        placeholder="e.g., Whole Milk"
        onClose={() => setShowCreateSubSubcategory(false)}
        onSubmit={handleCreateSubSubcategory}
        loading={creatingSubItem}
      />
    </div>
  )
}
