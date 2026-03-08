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

// ── Rent account category presets ──────────────────────────────────────────
// Maps: formData.categoryId = domainId, .subcategoryId = categoryId, .subSubcategoryId = subcategoryId
const RENT_CATEGORY_PRESETS: Record<string, { domainId: string; categoryId: string; subcategoryId: string; displayDomain: string; displayCategory: string }> = {
  restaurant: {
    domainId: 'domain-restaurant',
    categoryId: 'cat-restaurant-general-operating',
    subcategoryId: 'subcat-restaurant-general-operating-rent',
    displayDomain: 'Restaurant',
    displayCategory: 'General Operating',
  },
}
const DEFAULT_RENT_CATEGORY_PRESET = {
  domainId: 'domain-business',
  categoryId: 'cat-business-property-facilities',
  subcategoryId: 'subcat-business-property-facilities-rent',
  displayDomain: 'Business (General)',
  displayCategory: 'Property & Facilities',
}
function getRentCategoryPreset(businessType?: string) {
  if (!businessType) return DEFAULT_RENT_CATEGORY_PRESET
  return RENT_CATEGORY_PRESETS[businessType] ?? DEFAULT_RENT_CATEGORY_PRESET
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
  /** When set, the payee is locked to this value and shown as read-only (e.g. rent account → landlord) */
  presetPayee?: { type: string; id: string; name: string } | null
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
  presetPayee = null,
}: QuickPaymentModalProps) {
  const isPersonalAccount = accountType === 'PERSONAL'
  const isRentAccount = accountType === 'RENT'
  const [loading, setLoading] = useState(false)
  const [liveBalance, setLiveBalance] = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [rentDueInfo, setRentDueInfo] = useState<{
    monthlyRent: number
    paidThisMonth: number
    outstanding: number
  } | null>(null)
  const [rentDueLoading, setRentDueLoading] = useState(false)
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
  const [payeeErrorMessage, setPayeeErrorMessage] = useState<string | null>(null)
  const [loadingSupplierForEdit, setLoadingSupplierForEdit] = useState(false)
  const [supplierForEdit, setSupplierForEdit] = useState<any | null>(null)
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false)
  const toast = useToastContext()
  const customAlert = useAlert()
  const customConfirm = useConfirm()

  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [subcategories, setSubcategories] = useState<ExpenseSubcategory[]>([])
  const [subSubcategories, setSubSubcategories] = useState<ExpenseSubSubcategory[]>([])

  const [formData, setFormData] = useState({
    payee: presetPayee ?? null as { type: string; id: string; name: string } | null,
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
      fetchLiveBalance()
      if (isRentAccount && businessId) {
        fetchRentDueInfo()
        // Preset the locked category chain (no clearing effects will fire because of guards below)
        const preset = getRentCategoryPreset(defaultCategoryBusinessType)
        setFormData(prev => ({
          ...prev,
          categoryId: preset.domainId,
          subcategoryId: preset.categoryId,
          subSubcategoryId: preset.subcategoryId,
        }))
      }
    } else {
      setLiveBalance(null)
      setRentDueInfo(null)
    }
  }, [isOpen])

  const fetchLiveBalance = async () => {
    setBalanceLoading(true)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/balance`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        // Use calculatedBalance (SUM-based) which is always authoritative
        const value = data.data?.calculatedBalance ?? data.data?.balance ?? null
        if (value !== null) setLiveBalance(Number(value))
      }
    } catch {
      // Silently fall back to the currentBalance prop
    } finally {
      setBalanceLoading(false)
    }
  }

  const fetchRentDueInfo = async () => {
    if (!businessId) return
    setRentDueLoading(true)
    try {
      const res = await fetch(`/api/rent-account/${businessId}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.hasRentAccount && data.config) {
          setRentDueInfo({
            monthlyRent: data.config.monthlyRentAmount,
            paidThisMonth: data.paidThisMonth ?? 0,
            outstanding: data.outstanding ?? data.config.monthlyRentAmount,
          })
        }
      }
    } catch {
      // Silently fail — rent summary is informational only
    } finally {
      setRentDueLoading(false)
    }
  }

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

  // Load subcategories when category changes (skip for RENT — chain is preset and locked)
  useEffect(() => {
    if (formData.categoryId) {
      if (isRentAccount) return
      loadSubcategories(formData.categoryId)
      setFormData(prev => ({ ...prev, subcategoryId: '', subSubcategoryId: '' }))
      setSubSubcategories([])
    } else {
      setSubcategories([])
      setSubSubcategories([])
    }
  }, [formData.categoryId])

  // Load sub-subcategories when subcategory changes (skip for RENT — chain is preset and locked)
  useEffect(() => {
    if (formData.subcategoryId) {
      if (isRentAccount) return
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

        // When a business type is known, only show that domain + global (non-domain) categories.
        // This prevents restaurant users from seeing Business/Personal/Clothing/etc. domain entries.
        const targetDomainName = defaultCategoryBusinessType
          ? getDefaultDomainName(defaultCategoryBusinessType)
          : null

        if (data.domains && Array.isArray(data.domains)) {
          data.domains.forEach((domain: any) => {
            if (domain.expense_categories && Array.isArray(domain.expense_categories)) {
              domain.expense_categories.forEach((cat: any) => {
                // Skip other domain entries when a target domain is known
                if (targetDomainName && cat.isDomainCategory && cat.name !== targetDomainName) return
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

        // Deduplicate by name (keeps first occurrence — removes e.g. duplicate "Transportation" globals)
        const seen = new Set<string>()
        const deduped = flattenedCategories.filter(c => {
          if (seen.has(c.name)) return false
          seen.add(c.name)
          return true
        })

        setCategories(deduped)

        // For PERSONAL accounts: auto-select the first Personal category
        if (isPersonalAccount && deduped.length > 0) {
          setFormData(prev => ({ ...prev, categoryId: deduped[0].id }))
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
      // Compare date strings only — avoids timezone/clock-skew false positives
      const todayStr = new Date().toLocaleDateString('en-CA') // 'YYYY-MM-DD' in local TZ
      if (formData.paymentDate > todayStr) {
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
        payeeSupplierId: !skipPayee && formData.payee?.type === 'SUPPLIER' ? formData.payee.id : undefined,
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
      setPayeeErrorMessage(null)
      toast.push('Payment added to queue')
      try {
        onSuccess({
          message: 'Payment added to queue',
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
      toast.error(message)
      // Show Edit Payee button if the error is payee-related
      const isPayeeError = /supplier|person|national.?id|payee.*id|id.*required/i.test(message)
      setPayeeErrorMessage(isPayeeError ? message : null)
      try {
        onError(message)
      } catch (e) {}
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    const rentPreset = isRentAccount ? getRentCategoryPreset(defaultCategoryBusinessType) : null
    setFormData({
      payee: presetPayee ?? null,
      categoryId: rentPreset?.domainId ?? '',
      subcategoryId: rentPreset?.categoryId ?? '',
      subSubcategoryId: rentPreset?.subcategoryId ?? '',
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
    setPayeeErrorMessage(null)
    setSupplierForEdit(null)
    setSubcategories([])
    setSubSubcategories([])
  }

  const handleCancel = async () => {
    // Check if form has unsaved changes
    // For RENT accounts: payee and category chain are always preset — only treat amount/notes as changes
    const hasChanges = isRentAccount
      ? (formData.amount !== '' || formData.notes !== '')
      : (formData.payee !== null || formData.categoryId !== '' || formData.amount !== '' || formData.notes !== '')

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

  const handleEditPayeeClick = async () => {
    if (!formData.payee || !canCreatePayees) return
    if (formData.payee.type === 'SUPPLIER' && businessId) {
      setLoadingSupplierForEdit(true)
      try {
        const res = await fetch(`/api/business/${businessId}/suppliers/${formData.payee.id}`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setSupplierForEdit(data.supplier || data)
        } else {
          // Fallback: open with minimal data
          setSupplierForEdit({ id: formData.payee.id, name: formData.payee.name })
        }
      } catch {
        setSupplierForEdit({ id: formData.payee.id, name: formData.payee.name })
      } finally {
        setLoadingSupplierForEdit(false)
      }
      setShowEditSupplierModal(true)
    }
  }

  const handleEditSupplierSuccess = (updatedSupplierId?: string) => {
    setPayeeRefreshTrigger(prev => prev + 1)
    setShowEditSupplierModal(false)
    setSupplierForEdit(null)
    setPayeeErrorMessage(null)
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
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md sm:max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-primary">Quick Payment</h2>
          <p className="text-sm text-secondary">
            from {accountName} (Balance:{' '}
            {balanceLoading ? (
              <span className="text-secondary font-semibold">Loading...</span>
            ) : (
              <span className={`font-semibold ${(liveBalance ?? currentBalance) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${(liveBalance ?? currentBalance).toFixed(2)}
              </span>
            )})
          </p>
        </div>

        {/* Rent Due Summary Banner */}
        {isRentAccount && (
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
            {(() => {
              // Rent collected this month is due on the 1st of NEXT month
              const now = new Date()
              const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
              const dueMonthLabel = dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              return (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">🏠</span>
                    <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                      Rent Due — {dueMonthLabel}
                    </span>
                    <span className="text-xs text-orange-600 dark:text-orange-400 ml-auto">
                      collecting for 1st of next month
                    </span>
                  </div>
                  {rentDueLoading ? (
                    <div className="text-xs text-secondary">Loading rent summary…</div>
                  ) : rentDueInfo ? (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white dark:bg-gray-800 rounded-md py-2 px-1">
                        <div className="text-xs text-secondary mb-0.5">Monthly Rent</div>
                        <div className="text-sm font-bold text-primary">${rentDueInfo.monthlyRent.toFixed(2)}</div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-md py-2 px-1">
                        <div className="text-xs text-secondary mb-0.5">Paid This Month</div>
                        <div className={`text-sm font-bold ${rentDueInfo.paidThisMonth > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                          ${rentDueInfo.paidThisMonth.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-md py-2 px-1">
                        <div className="text-xs text-secondary mb-0.5">Outstanding</div>
                        <div className={`text-sm font-bold ${rentDueInfo.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          ${rentDueInfo.outstanding.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              )
            })()}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* ── Payee — full width ───────────────────────────────────── */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-secondary">
                Payee {!isPersonalAccount && <span className="text-red-500">*</span>}
              </label>
              {isPersonalAccount && !isRentAccount && (
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
            {isRentAccount && presetPayee ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-md">
                <span className="text-lg">🏠</span>
                <span className="text-sm font-medium text-primary">{presetPayee.name}</span>
                <span className="ml-auto text-xs text-orange-600 dark:text-orange-400 font-medium">Landlord · Fixed</span>
              </div>
            ) : !skipPayee ? (
              <PayeeSelector
                value={formData.payee}
                onChange={(payee) => {
                  setFormData({ ...formData, payee })
                  setErrors({ ...errors, payee: '' })
                  setPayeeErrorMessage(null)
                }}
                onCreateIndividual={canCreatePayees ? (query) => { setPayeeSearchQuery(query || ''); setShowIndividualModal(true) } : undefined}
                onCreateSupplier={canCreatePayees && businessId ? (query) => { setPayeeSearchQuery(query || ''); setShowSupplierModal(true) } : undefined}
                error={errors.payee}
                refreshTrigger={payeeRefreshTrigger}
              />
            ) : null}
            {payeeErrorMessage && formData.payee && canCreatePayees && (
              <div className="mt-2 flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-md">
                <span className="text-yellow-600 dark:text-yellow-400 text-xs flex-1">
                  ⚠️ Payee is missing required information.
                </span>
                <button
                  type="button"
                  onClick={handleEditPayeeClick}
                  disabled={loadingSupplierForEdit}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                >
                  {loadingSupplierForEdit ? 'Loading…' : '✏️ Edit Payee'}
                </button>
              </div>
            )}
          </div>

          {/* ── Two-column grid on desktop ───────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

            {/* LEFT column: Category → Subcategory → Sub-Subcategory */}
            <div className="space-y-4">

              {isRentAccount ? (
                // RENT account: show locked category chain badges
                (() => {
                  const preset = getRentCategoryPreset(defaultCategoryBusinessType)
                  return (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-md">
                          <span className="text-sm font-medium text-primary">{preset.displayDomain}</span>
                          <span className="ml-auto text-xs text-orange-600 dark:text-orange-400 font-medium">Fixed</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">Subcategory</label>
                        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-md">
                          <span className="text-sm font-medium text-primary">{preset.displayCategory}</span>
                          <span className="ml-auto text-xs text-orange-600 dark:text-orange-400 font-medium">Fixed</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">Sub-Subcategory</label>
                        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-md">
                          <span className="text-lg">🏠</span>
                          <span className="text-sm font-medium text-primary">Rent</span>
                          <span className="ml-auto text-xs text-orange-600 dark:text-orange-400 font-medium">Fixed</span>
                        </div>
                      </div>
                    </div>
                  )
                })()
              ) : (
                <>
                  {/* Category — hidden for Personal accounts */}
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

                  {/* Subcategory */}
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

                  {/* Sub-Subcategory */}
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
                </>
              )}
            </div>

            {/* RIGHT column: Amount → Date → Notes */}
            <div className="space-y-4">

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
                {!errors.amount && formData.amount && parseFloat(formData.amount) > (liveBalance ?? currentBalance) && (
                  <p className="text-xs text-yellow-500 mt-1">
                    Warning: Insufficient funds. Available balance: ${(liveBalance ?? currentBalance).toFixed(2)}. The check will be done on approval.
                  </p>
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
                  rows={3}
                  placeholder="Add any additional notes..."
                  maxLength={500}
                />
              </div>
            </div>
          </div>

          {/* ── Actions — full width ─────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
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

      {/* Edit Supplier Modal — opened when a payee error occurs */}
      {showEditSupplierModal && businessId && supplierForEdit && (
        <SupplierEditor
          businessId={businessId}
          supplier={supplierForEdit}
          focusField="taxId"
          onSave={handleEditSupplierSuccess}
          onCancel={() => { setShowEditSupplierModal(false); setSupplierForEdit(null) }}
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
