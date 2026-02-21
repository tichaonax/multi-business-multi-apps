'use client'

import { useState, useEffect, useRef } from 'react'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import { DateInput } from '@/components/ui/date-input'
import { PayeeSelector } from './payee-selector'
import { CreateIndividualPayeeModal } from './create-individual-payee-modal'
import { SupplierEditor } from '@/components/suppliers/supplier-editor'
import { CreateCategoryModal } from './create-category-modal'
import { PaymentBatchList } from './payment-batch-list'
import { getTodayLocalDateString } from '@/lib/date-utils'

interface ExpenseCategory {
  id: string
  name: string
  emoji: string
  color: string
  requiresSubcategory?: boolean  // If false, subcategories are optional
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

interface BatchPayment {
  id: string
  payeeType: string
  payeeName: string
  payeeId: string
  categoryId: string
  categoryName: string
  categoryEmoji: string
  subcategoryId?: string
  subcategoryName?: string
  subSubcategoryId?: string
  subSubcategoryName?: string
  amount: number
  paymentDate: string
  notes?: string
  receiptNumber?: string
  receiptServiceProvider?: string
  receiptReason?: string
  isFullPayment?: boolean
  paymentType?: string
  loanId?: string
  interestAmount?: number
  transferLedgerId?: string
}

// Quick inline create modal for subcategory/sub-subcategory
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-5 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">{title}</h3>
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
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder={placeholder}
              maxLength={50}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  onSubmit(name.trim(), emoji.trim() || '📂')
                  setName('')
                  setEmoji('📂')
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { onClose(); setName(''); setEmoji('📂') }}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (name.trim()) {
                  onSubmit(name.trim(), emoji.trim() || '📂')
                  setName('')
                  setEmoji('📂')
                }
              }}
              className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading || !name.trim()}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Searchable dropdown component for category selection
function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  loading = false,
  error = false,
}: {
  value: string
  options: { id: string; label: string }[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  error?: boolean
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

  const handleSelect = (id: string) => {
    onChange(id)
    setIsOpen(false)
    setSearch('')
  }

  const borderClass = error
    ? 'border-red-500'
    : 'border-gray-300 dark:border-gray-600'

  if (disabled && !loading) {
    return (
      <div className={`w-full px-3 py-2 border ${borderClass} rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed`}>
        {placeholder}
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`w-full px-3 py-2 border ${borderClass} rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400`}>
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
        className={`w-full px-3 py-2 border ${borderClass} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between bg-white dark:bg-gray-800`}
      >
        <span className={selected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search..."
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {value && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className="w-full px-3 py-2 text-left text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Clear selection
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No matches found</div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                    option.id === value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
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

interface PaymentFormProps {
  accountId: string
  businessId?: string
  currentBalance: number
  onSuccess?: () => void
  onAddFunds?: () => void
  canCreatePayees?: boolean
  accountType?: string
  defaultCategoryBusinessType?: string
  accountInfo?: {
    accountName: string
    isSibling: boolean
    siblingNumber: number | null
    parentAccountId: string | null
  }
  batchRefreshKey?: number
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

export function PaymentForm({
  accountId,
  businessId,
  currentBalance,
  onSuccess,
  onAddFunds,
  canCreatePayees = false,
  accountType = 'GENERAL',
  defaultCategoryBusinessType,
  accountInfo,
  batchRefreshKey = 0,
}: PaymentFormProps) {
  const isPersonalAccount = accountType === 'PERSONAL'
  const customAlert = useAlert()
  const customConfirm = useConfirm()

  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [subcategories, setSubcategories] = useState<ExpenseSubcategory[]>([])
  const [subSubcategories, setSubSubcategories] = useState<ExpenseSubSubcategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingSubcategories, setLoadingSubcategories] = useState(false)
  const [loadingSubSubcategories, setLoadingSubSubcategories] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showIndividualModal, setShowIndividualModal] = useState(false)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showCreateSubcategory, setShowCreateSubcategory] = useState(false)
  const [showCreateSubSubcategory, setShowCreateSubSubcategory] = useState(false)
  const [creatingSubItem, setCreatingSubItem] = useState(false)
  const [showReceiptSection, setShowReceiptSection] = useState(false)
  const [payeeRefreshTrigger, setPayeeRefreshTrigger] = useState(0)  // Increment to refresh payee list
  const [skipPayee, setSkipPayee] = useState(false)  // Personal accounts: no specific payee
  const [categoryRefreshTrigger, setCategoryRefreshTrigger] = useState(0)  // Increment to refresh category list
  const [loans, setLoans] = useState<{ id: string; loanNumber: string; principalAmount: number; remainingBalance: number; dueDate: string | null; status: string; lender: { name: string } }[]>([])
  const [loadingLoans, setLoadingLoans] = useState(false)
  const [personalDomainId, setPersonalDomainId] = useState('')

  const [batchPayments, setBatchPayments] = useState<BatchPayment[]>([])
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const restoringEditRef = useRef(false) // Flag to prevent useEffects from wiping values during edit restore

  const [formData, setFormData] = useState({
    payee: null as { type: string; id: string; name: string } | null,
    categoryId: '',
    subcategoryId: '',
    subSubcategoryId: '',
    amount: '',
    paymentDate: getTodayLocalDateString(),
    notes: '',
    receiptNumber: '',
    receiptServiceProvider: '',
    receiptReason: '',
    isFullPayment: true,
    paymentType: 'REGULAR' as 'REGULAR' | 'LOAN_REPAYMENT',
    loanId: '',
    interestAmount: '0',
  })

  const [errors, setErrors] = useState({
    payee: '',
    categoryId: '',
    amount: '',
    paymentDate: ''
  })

  // Load categories on mount and when categoryRefreshTrigger changes
  useEffect(() => {
    loadCategories()
  }, [categoryRefreshTrigger])

  // Auto-select category matching business type when categories load (general accounts)
  useEffect(() => {
    if (categories.length > 0 && defaultCategoryBusinessType && !formData.categoryId) {
      const domainName = getDefaultDomainName(defaultCategoryBusinessType)
      const match = categories.find(c => c.name === domainName)
      if (match) {
        setFormData(prev => ({ ...prev, categoryId: match.id }))
      }
    }
  }, [categories, defaultCategoryBusinessType])

  // For personal accounts: auto-set categoryId to personalDomainId so loadSubcategories
  // fetches the 20 personal ExpenseCategories into subcategories[] automatically
  useEffect(() => {
    if (isPersonalAccount && personalDomainId && !formData.categoryId) {
      setFormData(prev => ({ ...prev, categoryId: personalDomainId }))
    }
  }, [personalDomainId])

  // Load batch from sessionStorage — re-runs when batchRefreshKey changes (e.g. vehicle expense added)
  useEffect(() => {
    const saved = sessionStorage.getItem(`expense-batch-${accountId}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setBatchPayments(parsed)
      } catch (e) {
        console.error('Failed to load batch from sessionStorage:', e)
      }
    }
  }, [accountId, batchRefreshKey])

  // Save batch to sessionStorage
  useEffect(() => {
    if (batchPayments.length > 0) {
      sessionStorage.setItem(`expense-batch-${accountId}`, JSON.stringify(batchPayments))
    } else {
      sessionStorage.removeItem(`expense-batch-${accountId}`)
    }
  }, [batchPayments, accountId])

  // Load subcategories when category changes
  useEffect(() => {
    if (formData.categoryId) {
      loadSubcategories(formData.categoryId)
      if (!restoringEditRef.current) {
        setFormData(prev => ({ ...prev, subcategoryId: '', subSubcategoryId: '' }))
        setSubSubcategories([])
      }
    } else {
      setSubcategories([])
      setSubSubcategories([])
      restoringEditRef.current = false
    }
  }, [formData.categoryId])

  // Load sub-subcategories when subcategory changes
  useEffect(() => {
    if (formData.subcategoryId) {
      loadSubSubcategories(formData.subcategoryId)
      if (!restoringEditRef.current) {
        setFormData(prev => ({ ...prev, subSubcategoryId: '' }))
      }
    } else {
      setSubSubcategories([])
    }
    restoringEditRef.current = false
  }, [formData.subcategoryId])

  // Load active loans when loan repayment type is selected
  useEffect(() => {
    if (formData.paymentType === 'LOAN_REPAYMENT' && loans.length === 0) {
      loadLoans()
    }
  }, [formData.paymentType])

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
          // The hierarchical API returns a single fake wrapper with all categories inside.
          // Domains (like "Personal") appear as category entries with name = "Personal".
          if (isPersonalAccount) {
            // Find the "Personal" domain entry inside expense_categories and capture its ID.
            // The existing loadSubcategories(personalDomainId) flow will then fetch the 20 personal categories.
            const allCats = data.domains[0]?.expense_categories || []
            const personalEntry = allCats.find((c: any) => c.name === 'Personal')
            if (personalEntry) {
              setPersonalDomainId(personalEntry.id)
            }
            // categories[] stays empty for personal accounts (category column shows locked label)
          } else {
            data.domains.forEach((domain: any) => {
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
        }

        flattenedCategories.sort((a, b) => a.name.localeCompare(b.name))
        setCategories(flattenedCategories)

        // Personal accounts: categoryId is auto-set via the personalDomainId useEffect
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const loadSubcategories = async (categoryId: string) => {
    if (!categoryId) {
      setSubcategories([])
      return
    }

    try {
      setLoadingSubcategories(true)
      const response = await fetch(`/api/expense-categories/${categoryId}/subcategories`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        const subs = data.subcategories || []
        subs.sort((a: ExpenseSubcategory, b: ExpenseSubcategory) => a.name.localeCompare(b.name))
        setSubcategories(subs)
      }
    } catch (error) {
      console.error('Error loading subcategories:', error)
      setSubcategories([])
    } finally {
      setLoadingSubcategories(false)
    }
  }

  const loadSubSubcategories = async (subcategoryId: string) => {
    if (!subcategoryId) {
      setSubSubcategories([])
      return
    }

    try {
      setLoadingSubSubcategories(true)
      const response = await fetch(`/api/expense-categories/subcategories/${subcategoryId}/sub-subcategories`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        const subSubs = data.subSubcategories || []
        subSubs.sort((a: ExpenseSubSubcategory, b: ExpenseSubSubcategory) => a.name.localeCompare(b.name))
        setSubSubcategories(subSubs)
      }
    } catch (error) {
      console.error('Error loading sub-subcategories:', error)
      setSubSubcategories([])
    } finally {
      setLoadingSubSubcategories(false)
    }
  }

  const loadLoans = async () => {
    try {
      setLoadingLoans(true)
      const res = await fetch(`/api/expense-account/${accountId}/loans`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setLoans((data.data?.loans || []).filter((l: any) => l.status === 'ACTIVE'))
      }
    } catch (e) {
      console.error('Error loading loans:', e)
    } finally {
      setLoadingLoans(false)
    }
  }

  const selectedCategory = categories.find(c => c.id === formData.categoryId)
  const selectedSubcategory = subcategories.find(s => s.id === formData.subcategoryId)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const calculateAvailableBalance = () => {
    const totalBatch = batchPayments.reduce((sum, p) => sum + p.amount, 0)
    return currentBalance - totalBatch
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

    if (isPersonalAccount ? !formData.subcategoryId : !formData.categoryId) {
      newErrors.categoryId = isPersonalAccount ? 'Please select a personal category' : 'Please select a category'
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
        console.log('[PaymentForm] Validating person payment:', {
          payeeId: formData.payee.id,
          payeeName: formData.payee.name,
          amount
        })

        const [settingsRes, personRes] = await Promise.all([
          fetch('/api/admin/settings'),
          fetch(`/api/persons/${formData.payee.id}`)
        ])

        console.log('[PaymentForm] API responses:', {
          settingsOk: settingsRes.ok,
          personOk: personRes.ok
        })

        if (settingsRes.ok && personRes.ok) {
          const settings = await settingsRes.json()
          const personData = await personRes.json()
          const maxPaymentWithoutId = settings.maxPaymentWithoutId || 100

          console.log('[PaymentForm] Validation data:', {
            personNationalId: personData.nationalId,
            maxPaymentWithoutId,
            amount,
            willBlock: !personData.nationalId && amount >= maxPaymentWithoutId
          })

          if (personData && !personData.nationalId && amount >= maxPaymentWithoutId) {
            newErrors.amount = `Cannot pay $${maxPaymentWithoutId.toFixed(2)} or more to ${formData.payee.name} without a national ID. Maximum allowed: $${(maxPaymentWithoutId - 0.01).toFixed(2)}. Please add their national ID or reduce the amount.`
            console.log('[PaymentForm] Validation BLOCKED - error set:', newErrors.amount)
          } else {
            console.log('[PaymentForm] Validation PASSED')
          }
        }
      } catch (error) {
        console.error('[PaymentForm] Error validating payee:', error)
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

  const handleAddToBatch = async () => {
    if (!(await validateForm())) {
      return
    }

    const amount = parseFloat(formData.amount)
    const availableBalance = calculateAvailableBalance()

    // Check if adding this payment would cause negative balance
    if (amount > availableBalance) {
      customAlert({
        title: 'Insufficient Funds',
        description: `Adding this payment would exceed available balance. Available: ${formatCurrency(availableBalance)}. You can add funds before continuing.`
      })
      return
    }

    const category = categories.find(c => c.id === formData.categoryId)
    const subcategory = subcategories.find(s => s.id === formData.subcategoryId)
    const subSubcategory = subSubcategories.find(s => s.id === formData.subSubcategoryId)

    const payment: BatchPayment = {
      id: editingPaymentId || `temp-${Date.now()}-${Math.random()}`,
      payeeType: skipPayee ? 'NONE' : formData.payee!.type,
      payeeName: skipPayee ? 'No specific payee' : formData.payee!.name,
      payeeId: skipPayee ? '' : formData.payee!.id,
      categoryId: formData.categoryId,
      categoryName: category?.name || '',
      categoryEmoji: category?.emoji || '',
      subcategoryId: formData.subcategoryId || undefined,
      subcategoryName: subcategory?.name || undefined,
      subSubcategoryId: formData.subSubcategoryId || undefined,
      subSubcategoryName: subSubcategory?.name || undefined,
      amount,
      paymentDate: formData.paymentDate,
      notes: formData.notes.trim() || undefined,
      receiptNumber: formData.receiptNumber.trim() || undefined,
      receiptServiceProvider: formData.receiptServiceProvider.trim() || undefined,
      receiptReason: formData.receiptReason.trim() || undefined,
      isFullPayment: formData.isFullPayment,
      paymentType: formData.paymentType,
      loanId: formData.paymentType === 'LOAN_REPAYMENT' ? formData.loanId : undefined,
      interestAmount: formData.paymentType === 'LOAN_REPAYMENT' ? parseFloat(formData.interestAmount || '0') : undefined,
      transferLedgerId: undefined,
    }

    if (editingPaymentId) {
      // Update existing payment
      setBatchPayments(prev => prev.map(p => p.id === editingPaymentId ? payment : p))
      setEditingPaymentId(null)
    } else {
      // Add new payment
      setBatchPayments(prev => [...prev, payment])
    }

    // Reset form
    resetForm()
  }

  const resetForm = (full = false) => {
    if (full) {
      setFormData({
        payee: null,
        categoryId: '',
        subcategoryId: '',
        subSubcategoryId: '',
        amount: '',
        paymentDate: getTodayLocalDateString(),
        notes: '',
        receiptNumber: '',
        receiptServiceProvider: '',
        receiptReason: '',
        isFullPayment: true,
        paymentType: 'REGULAR',
        loanId: '',
        interestAmount: '0',
      })
    } else {
      // Keep category and subcategory for faster repeat entries
      setFormData(prev => ({
        ...prev,
        payee: null,
        subSubcategoryId: '',
        amount: '',
        notes: '',
        receiptNumber: '',
        receiptServiceProvider: '',
        receiptReason: '',
        isFullPayment: true,
        paymentType: 'REGULAR',
        loanId: '',
        interestAmount: '0',
      }))
    }
    setErrors({ payee: '', categoryId: '', amount: '', paymentDate: '' })
    setShowReceiptSection(false)
    setEditingPaymentId(null)
  }

  const handleEditPayment = (payment: BatchPayment) => {
    restoringEditRef.current = true
    setFormData({
      payee: { type: payment.payeeType, id: payment.payeeId, name: payment.payeeName },
      categoryId: payment.categoryId,
      subcategoryId: payment.subcategoryId || '',
      subSubcategoryId: payment.subSubcategoryId || '',
      amount: payment.amount.toString(),
      paymentDate: payment.paymentDate,
      notes: payment.notes || '',
      receiptNumber: payment.receiptNumber || '',
      receiptServiceProvider: payment.receiptServiceProvider || '',
      receiptReason: payment.receiptReason || '',
      isFullPayment: payment.isFullPayment ?? true,
      paymentType: (payment.paymentType as 'REGULAR' | 'LOAN_REPAYMENT') || 'REGULAR',
      loanId: payment.loanId || '',
      interestAmount: payment.interestAmount?.toString() || '0',
    })
    setEditingPaymentId(payment.id)
    if (payment.receiptNumber || payment.receiptServiceProvider || payment.receiptReason) {
      setShowReceiptSection(true)
    }
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeletePayment = async (paymentId: string) => {
    const confirmed = await customConfirm('Are you sure you want to remove this payment from the batch?')
    if (confirmed) {
      setBatchPayments(prev => prev.filter(p => p.id !== paymentId))
      if (editingPaymentId === paymentId) {
        resetForm(true)
      }
    }
  }

  const handleClearAll = async () => {
    const confirmed = await customConfirm(
      `Are you sure you want to clear all ${batchPayments.length} payment(s) from the batch?`
    )
    if (confirmed) {
      setBatchPayments([])
      resetForm(true)
    }
  }

  const handleSubmitBatch = async () => {
    if (batchPayments.length === 0) {
      customAlert({
        title: 'No Payments',
        description: 'Please add at least one payment to the batch'
      })
      return
    }

    const totalAmount = batchPayments.reduce((sum, p) => sum + p.amount, 0)
    if (totalAmount > currentBalance) {
      customAlert({
        title: 'Insufficient Funds',
        description: `Batch total (${formatCurrency(totalAmount)}) exceeds account balance (${formatCurrency(currentBalance)})`
      })
      return
    }

    const confirmed = await customConfirm(
      `Submit batch of ${batchPayments.length} payment(s) totaling ${formatCurrency(totalAmount)}?`
    )

    if (!confirmed) return

    setSubmitting(true)

    try {
      // Map form fields to DB fields:
      // Form "category" = ExpenseDomains (domainId), form "subcategory" = ExpenseCategories (categoryId),
      // form "sub-subcategory" = ExpenseSubcategories (subcategoryId)
      // The payment table expects: categoryId → ExpenseCategories, subcategoryId → ExpenseSubcategories
      const paymentsPayload = batchPayments.map(p => ({
        payeeType: p.payeeType,
        payeeUserId: p.payeeType === 'USER' ? p.payeeId : undefined,
        payeeEmployeeId: p.payeeType === 'EMPLOYEE' ? p.payeeId : undefined,
        payeePersonId: p.payeeType === 'PERSON' ? p.payeeId : undefined,
        payeeBusinessId: p.payeeType === 'BUSINESS' ? p.payeeId : undefined,
        payeeSupplierId: p.payeeType === 'SUPPLIER' ? p.payeeId : undefined,
        categoryId: p.subcategoryId || p.categoryId,
        subcategoryId: p.subSubcategoryId || null,
        amount: p.amount,
        paymentDate: p.paymentDate,
        notes: p.notes || null,
        receiptNumber: p.receiptNumber || null,
        receiptServiceProvider: p.receiptServiceProvider || null,
        receiptReason: p.receiptReason || null,
        isFullPayment: p.isFullPayment,
        paymentType: p.paymentType || 'REGULAR',
        loanId: p.loanId || null,
        interestAmount: p.interestAmount ?? null,
        status: 'SUBMITTED',
        // Forward vehicle expense metadata if present (added by VehicleExpenseModal)
        vehicleExpense: (p as any).vehicleExpense || undefined,
      }))

      const response = await fetch(`/api/expense-account/${accountId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ payments: paymentsPayload }),
      })

      const data = await response.json()

      if (response.ok) {
        customAlert({
          title: 'Success',
          description: `Successfully submitted ${batchPayments.length} payment(s)`,
        })

        // Clear batch
        setBatchPayments([])
        sessionStorage.removeItem(`expense-batch-${accountId}`)
        resetForm(true)

        if (onSuccess) {
          onSuccess()
        }
      } else {
        customAlert({
          title: 'Error',
          description: data.error || 'Failed to submit payments',
        })
      }
    } catch (error) {
      console.error('Error submitting batch:', error)
      customAlert({
        title: 'Error',
        description: 'An error occurred while submitting payments',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateIndividualSuccess = (payload: any) => {
    if (payload.payee) {
      // Set the newly created payee as selected
      setFormData({
        ...formData,
        payee: {
          type: 'PERSON',
          id: payload.payee.id,
          name: payload.payee.fullName
        }
      })
      // Trigger payee list refresh
      setPayeeRefreshTrigger(prev => prev + 1)
    }
  }

  const handleCreateSupplierSuccess = async (supplierId?: string) => {
    setShowSupplierModal(false)
    if (!supplierId) {
      setPayeeRefreshTrigger(prev => prev + 1)
      return
    }

    // Fetch the created supplier's name to auto-select it
    let supplierName = 'New Supplier'
    try {
      const res = await fetch(`/api/business/${businessId}/suppliers`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        const found = (data.data || []).find((s: any) => s.id === supplierId)
        if (found) supplierName = found.name
      }
    } catch (e) {
      // ignore, still auto-select with fallback name
    }

    setFormData(prev => ({
      ...prev,
      payee: { type: 'SUPPLIER', id: supplierId, name: supplierName }
    }))
    setPayeeRefreshTrigger(prev => prev + 1)
  }

  const handleCreateCategorySuccess = (payload: any) => {
    if (payload.category) {
      // Set the newly created category as selected
      setFormData({
        ...formData,
        categoryId: payload.category.id,
        subcategoryId: '',
        subSubcategoryId: ''
      })
      // Trigger category list refresh
      setCategoryRefreshTrigger(prev => prev + 1)
    }
  }

  // Create a new subcategory (ExpenseCategories) under the selected domain
  const handleCreateSubcategory = async (name: string, emoji: string) => {
    if (!formData.categoryId) return
    setCreatingSubItem(true)
    try {
      const res = await fetch('/api/expense-categories/flat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          emoji,
          color: '#3B82F6',
          domainId: formData.categoryId,  // = personalDomainId for personal accounts
          requiresSubcategory: false,
          isUserCreated: true,
        }),
      })
      const data = await res.json()
      if (res.ok && data.data?.category) {
        await loadSubcategories(formData.categoryId)
        setFormData(prev => ({ ...prev, subcategoryId: data.data.category.id, subSubcategoryId: '' }))
        setShowCreateSubcategory(false)
      } else {
        customAlert({ title: 'Error', description: data.error || 'Failed to create subcategory' })
      }
    } catch (error) {
      console.error('Error creating subcategory:', error)
    } finally {
      setCreatingSubItem(false)
    }
  }

  // Create a new sub-subcategory (ExpenseSubcategories) under the selected category
  const handleCreateSubSubcategory = async (name: string, emoji: string) => {
    if (!formData.subcategoryId) return
    setCreatingSubItem(true)
    try {
      const res = await fetch('/api/expense-categories/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          categoryId: formData.subcategoryId,
          name,
          emoji,
        }),
      })
      const data = await res.json()
      if (res.ok && data.subcategory) {
        await loadSubSubcategories(formData.subcategoryId)
        setFormData(prev => ({ ...prev, subSubcategoryId: data.subcategory.id }))
        setShowCreateSubSubcategory(false)
      } else {
        customAlert({ title: 'Error', description: data.error || 'Failed to create sub-subcategory' })
      }
    } catch (error) {
      console.error('Error creating sub-subcategory:', error)
    } finally {
      setCreatingSubItem(false)
    }
  }

  const availableBalance = calculateAvailableBalance()
  const totalBatchAmount = batchPayments.reduce((sum, p) => sum + p.amount, 0)
  const hasInsufficientFunds = availableBalance < 0

  // Show loading overlay while categories are loading
  if (loadingCategories) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading payment form...</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Fetching categories and payees
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Entry Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {editingPaymentId ? 'Edit Payment' : 'Add Payment to Batch'}
        </h3>

        {/* Sibling Account Indicator */}
        {accountInfo?.isSibling && (
          <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                SIBLING ACCOUNT
              </span>
              <span className="text-sm text-purple-700 dark:text-purple-300">
                #{accountInfo.siblingNumber} of {accountInfo.accountName}
              </span>
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              💡 This is a sibling account for entering historical expense data. Payments here will be merged back into the parent account later.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Payee Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                onCreateSupplier={canCreatePayees ? () => setShowSupplierModal(true) : undefined}
                error={errors.payee}
                refreshTrigger={payeeRefreshTrigger}
              />
            )}
          </div>

          {/* Category, Subcategory & Sub-subcategory */}
          {isPersonalAccount ? (
            /* Personal account: locked "Personal" label + 20 personal categories + sub-categories */
            <div className="grid grid-cols-3 gap-4">
              {/* Locked Category label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <div className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                  👤 Personal
                </div>
              </div>

              {/* Personal Category picker — shows subcategories[] which loadSubcategories(personalDomainId) populates */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Personal Category <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCreateSubcategory(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  >
                    + Create New
                  </button>
                </div>
                <SearchableSelect
                  value={formData.subcategoryId}
                  options={subcategories.map(s => ({ id: s.id, label: `${s.emoji} ${s.name}` }))}
                  onChange={(val) => {
                    setFormData({ ...formData, subcategoryId: val, subSubcategoryId: '' })
                    setErrors({ ...errors, categoryId: '' })
                  }}
                  placeholder="Select category..."
                  loading={loadingSubcategories}
                  error={!!errors.categoryId}
                />
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-red-500">{errors.categoryId}</p>
                )}
              </div>

              {/* Sub-category picker — shows subSubcategories[] which loadSubSubcategories(subcategoryId) populates */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Subcategory
                  </label>
                  {formData.subcategoryId && (
                    <button
                      type="button"
                      onClick={() => setShowCreateSubSubcategory(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      + Create New
                    </button>
                  )}
                </div>
                <SearchableSelect
                  value={formData.subSubcategoryId}
                  options={subSubcategories.map(s => ({ id: s.id, label: `${s.emoji} ${s.name}` }))}
                  onChange={(val) => setFormData({ ...formData, subSubcategoryId: val })}
                  placeholder="None"
                  disabled={!formData.subcategoryId}
                  loading={loadingSubSubcategories}
                />
              </div>
            </div>
          ) : (
            /* General account: standard category → subcategory → sub-subcategory */
            (() => {
              const selectedCategory = categories.find(c => c.id === formData.categoryId)
              const showSubcategories = selectedCategory?.requiresSubcategory !== false

              return (
                <div className={`grid ${showSubcategories ? 'grid-cols-3' : 'grid-cols-1'} gap-4`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCategoryModal(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        + Create New
                      </button>
                    </div>
                    <SearchableSelect
                      value={formData.categoryId}
                      options={categories.map(c => ({ id: c.id, label: `${c.emoji} ${c.name}` }))}
                      onChange={(val) => {
                        setFormData({ ...formData, categoryId: val, subcategoryId: '', subSubcategoryId: '' })
                        setErrors({ ...errors, categoryId: '' })
                      }}
                      placeholder="Select category..."
                      error={!!errors.categoryId}
                    />
                    {errors.categoryId && (
                      <p className="mt-1 text-sm text-red-500">{errors.categoryId}</p>
                    )}
                    {selectedCategory && !selectedCategory.requiresSubcategory && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        ✓ This category doesn't require subcategories
                      </p>
                    )}
                  </div>

                  {showSubcategories && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Subcategory
                          </label>
                          {formData.categoryId && (
                            <button
                              type="button"
                              onClick={() => setShowCreateSubcategory(true)}
                              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                            >
                              + Create New
                            </button>
                          )}
                        </div>
                        <SearchableSelect
                          value={formData.subcategoryId}
                          options={subcategories.map(s => ({ id: s.id, label: `${s.emoji} ${s.name}` }))}
                          onChange={(val) => setFormData({ ...formData, subcategoryId: val, subSubcategoryId: '' })}
                          placeholder="None"
                          disabled={!formData.categoryId}
                          loading={loadingSubcategories}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Sub-subcategory
                          </label>
                          {formData.subcategoryId && (
                            <button
                              type="button"
                              onClick={() => setShowCreateSubSubcategory(true)}
                              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                            >
                              + Create New
                            </button>
                          )}
                        </div>
                        <SearchableSelect
                          value={formData.subSubcategoryId}
                          options={subSubcategories.map(s => ({ id: s.id, label: `${s.emoji} ${s.name}` }))}
                          onChange={(val) => setFormData({ ...formData, subSubcategoryId: val })}
                          placeholder="None"
                          disabled={!formData.subcategoryId}
                          loading={loadingSubSubcategories}
                        />
                      </div>
                    </>
                  )}
                </div>
              )
            })()
          )}

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount <span className="text-red-500">*</span>
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <DateInput
                value={formData.paymentDate}
                onChange={(value) => {
                  setFormData({ ...formData, paymentDate: value })
                  setErrors({ ...errors, paymentDate: '' })
                }}
                required
              />
              {errors.paymentDate && (
                <p className="mt-1 text-sm text-red-500">{errors.paymentDate}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="Additional notes about this payment"
              maxLength={500}
            />
          </div>

          {/* Loan Repayment Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Classification
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  checked={formData.paymentType === 'REGULAR'}
                  onChange={() => setFormData({ ...formData, paymentType: 'REGULAR', loanId: '', interestAmount: '0' })}
                  className="mr-2"
                />
                <span className="text-sm">Regular Payment</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  checked={formData.paymentType === 'LOAN_REPAYMENT'}
                  onChange={() => setFormData({ ...formData, paymentType: 'LOAN_REPAYMENT' })}
                  className="mr-2"
                />
                <span className="text-sm">Loan Repayment</span>
              </label>
            </div>
            {formData.paymentType === 'LOAN_REPAYMENT' && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Loan <span className="text-red-500">*</span>
                  </label>
                  {loadingLoans ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">Loading loans...</div>
                  ) : loans.length === 0 ? (
                    <div className="text-sm text-amber-600 dark:text-amber-400">No active loans found for this account</div>
                  ) : (
                    <select
                      value={formData.loanId}
                      onChange={(e) => setFormData({ ...formData, loanId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a loan...</option>
                      {loans.map((loan) => (
                        <option key={loan.id} value={loan.id}>
                          {loan.loanNumber} — {loan.lender.name} (${loan.remainingBalance.toFixed(2)} remaining)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Interest Amount (optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.interestAmount}
                      onChange={(e) => setFormData({ ...formData, interestAmount: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Interest portion of this payment. Principal = total amount − interest.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Receipt Section (Collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setShowReceiptSection(!showReceiptSection)}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showReceiptSection ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Receipt Information (Optional)
            </button>

            {showReceiptSection && (
              <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Receipt Number
                  </label>
                  <input
                    type="text"
                    value={formData.receiptNumber}
                    onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., RCP-2025-001"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Service Provider
                  </label>
                  <input
                    type="text"
                    value={formData.receiptServiceProvider}
                    onChange={(e) => setFormData({ ...formData, receiptServiceProvider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Name of service provider or vendor"
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reason for Payment
                  </label>
                  <textarea
                    value={formData.receiptReason}
                    onChange={(e) => setFormData({ ...formData, receiptReason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Reason or purpose for this payment"
                    maxLength={500}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={formData.isFullPayment}
                        onChange={() => setFormData({ ...formData, isFullPayment: true })}
                        className="mr-2"
                      />
                      <span className="text-sm">Full Payment</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!formData.isFullPayment}
                        onChange={() => setFormData({ ...formData, isFullPayment: false })}
                        className="mr-2"
                      />
                      <span className="text-sm">Partial Payment</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Available Balance Display */}
          <div className={`p-4 rounded-lg ${availableBalance < 0 ? 'bg-red-50 dark:bg-red-900/10 border-2 border-red-500' : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Available Balance</p>
                <p className={`text-2xl font-bold ${availableBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-900 dark:text-blue-200'}`}>
                  {formatCurrency(availableBalance)}
                </p>
                {batchPayments.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Current balance ({formatCurrency(currentBalance)}) - Batch total ({formatCurrency(totalBatchAmount)})
                  </p>
                )}
              </div>
              {hasInsufficientFunds && onAddFunds && (
                <button
                  type="button"
                  onClick={onAddFunds}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Add Funds
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => resetForm(true)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              {editingPaymentId ? 'Cancel Edit' : 'Reset'}
            </button>
            <button
              type="button"
              onClick={handleAddToBatch}
              disabled={hasInsufficientFunds && !editingPaymentId}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingPaymentId ? 'Update Payment' : 'Add to Batch'}
            </button>
          </div>
        </div>
      </div>

      {/* Batch Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Payment Batch
          </h3>
          {batchPayments.length > 0 && (
            <button
              onClick={handleSubmitBatch}
              disabled={submitting || hasInsufficientFunds}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? 'Submitting...' : `Submit ${batchPayments.length} Payment${batchPayments.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>

        <PaymentBatchList
          payments={batchPayments}
          currentBalance={currentBalance}
          onEdit={handleEditPayment}
          onDelete={handleDeletePayment}
          onClearAll={handleClearAll}
          disabled={submitting}
        />
      </div>

      {/* Create Individual Payee Modal */}
      <CreateIndividualPayeeModal
        isOpen={showIndividualModal}
        onClose={() => setShowIndividualModal(false)}
        onSuccess={handleCreateIndividualSuccess}
        onError={(error) => console.error('Create individual error:', error)}
      />

      {/* Create Supplier Modal */}
      {showSupplierModal && businessId && (
        <SupplierEditor
          businessId={businessId}
          onSave={handleCreateSupplierSuccess}
          onCancel={() => setShowSupplierModal(false)}
        />
      )}

      {/* Create Category Modal */}
      <CreateCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSuccess={handleCreateCategorySuccess}
        onError={(error) => console.error('Create category error:', error)}
      />

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
