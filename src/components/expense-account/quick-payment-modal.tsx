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
import { CreateContractorPayeeModal } from './create-contractor-payee-modal'
import { SupplierEditor } from '@/components/suppliers/supplier-editor'
import { getTodayLocalDateString } from '@/lib/date-utils'
import type { BusinessMembership } from '@/types/permissions'

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
  isDomainCategory?: boolean
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
    services: 'Services',
    retail: 'Retail',
    consulting: 'Consulting',
  }
  return map[businessType] || 'Business'
}

// Domains that belong to specific business types — filtered out for non-business (home) accounts
const BUSINESS_DOMAIN_NAMES = new Set([
  'Restaurant', 'Groceries', 'Clothing', 'Hardware', 'Construction',
  'Vehicle', 'Services', 'Retail', 'Consulting', 'Business (General)',
])

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
  /** All businesses the user can access — enables the Business selector dropdown */
  businesses?: BusinessMembership[]
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
  businesses,
  presetPayee = null,
}: QuickPaymentModalProps) {
  const isPersonalAccount = accountType === 'PERSONAL'
  const isRentAccount = accountType === 'RENT'
  // No business or business-type means this is a home/personal general account
  const isHomeAccount = !businessId && !defaultCategoryBusinessType

  // Active account — may be overridden when user switches business via the Business selector
  const [activeAccountId, setActiveAccountId] = useState(accountId)
  const [activeAccountName, setActiveAccountName] = useState(accountName)
  const [activeBalance, setActiveBalance] = useState(currentBalance)
  const [activeBusinessType, setActiveBusinessType] = useState(defaultCategoryBusinessType)
  const [selectedBusinessId, setSelectedBusinessId] = useState(businessId || '')
  const [selectedDropdownValue, setSelectedDropdownValue] = useState(businessId || '')
  // True when the Business dropdown is visible but nothing has been selected yet
  const businessNotSelected = !!(businesses && businesses.length > 1 && !selectedDropdownValue)
  // For supplier creation: prefer the account's own businessId, fall back to the currently
  // selected business (user switched via dropdown), then the first available membership.
  // Personal/home accounts have no businessId but users may still be members of businesses.
  const supplierBusinessId =
    businessId ||
    (selectedBusinessId && !selectedBusinessId.startsWith('domain:') ? selectedBusinessId : null) ||
    businesses?.find(b => !b.isUmbrellaBusiness)?.businessId ||
    null
  const [activeDomainOverride, setActiveDomainOverride] = useState<string | null>(null)
  const [activeDomainOverrideId, setActiveDomainOverrideId] = useState<string | null>(null)
  const [domainOverrideItems, setDomainOverrideItems] = useState<ExpenseCategory[]>([])
  const [loadingDomainOverrideItems, setLoadingDomainOverrideItems] = useState(false)
  // Sub-items = expense_sub_subcategories loaded when category selected in domain-override mode
  const [domainOverrideSubItems, setDomainOverrideSubItems] = useState<{ id: string; name: string; emoji: string }[]>([])
  const [loadingDomainOverrideSubItems, setLoadingDomainOverrideSubItems] = useState(false)
  const [loadingBusinessSwitch, setLoadingBusinessSwitch] = useState(false)

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
  const [showContractorModal, setShowContractorModal] = useState(false)
  const [payeeSearchQuery, setPayeeSearchQuery] = useState('')
  const [payeeRefreshTrigger, setPayeeRefreshTrigger] = useState(0)
  const [showCreateSubcategory, setShowCreateSubcategory] = useState(false)
  const [showCreateSubSubcategory, setShowCreateSubSubcategory] = useState(false)
  const [showCreateGlobalCategory, setShowCreateGlobalCategory] = useState(false)
  const [creatingSubItem, setCreatingSubItem] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingSubcategories, setLoadingSubcategories] = useState(false)
  const [payeeErrorMessage, setPayeeErrorMessage] = useState<string | null>(null)
  const [loadingSupplierForEdit, setLoadingSupplierForEdit] = useState(false)
  const [supplierForEdit, setSupplierForEdit] = useState<any | null>(null)
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false)
  const toast = useToastContext()

  // Saved payment notes
  const [savedNotes, setSavedNotes] = useState<{ id: string; note: string; usageCount: number }[]>([])
  const [noteMode, setNoteMode] = useState<'saved' | 'type'>('type')
  const [saveNote, setSaveNote] = useState(false)

  // Classification suggestion
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [isApplyingSuggestion, setIsApplyingSuggestion] = useState(false)
  const [suggestions, setSuggestions] = useState<{
    domainId: string; domainName: string; domainEmoji: string | null
    categoryId: string; categoryName: string; categoryEmoji: string | null
    subcategoryId: string; subcategoryName: string; subcategoryEmoji: string | null
    score: number
  }[]>([])

  // Skip cascade effects when applying a suggestion (prevents clearing fields mid-apply)
  const skipCascadeRef = useRef(false)
  const customAlert = useAlert()
  const customConfirm = useConfirm()

  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [subcategories, setSubcategories] = useState<ExpenseSubcategory[]>([])
  const [subSubcategories, setSubSubcategories] = useState<ExpenseSubSubcategory[]>([])

  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])

  const [formData, setFormData] = useState({
    payee: presetPayee ?? null as { type: string; id: string; name: string } | null,
    categoryId: '',
    subcategoryId: '',
    subSubcategoryId: '',
    amount: '',
    paymentDate: getTodayLocalDateString(),
    notes: '',
    paymentChannel: 'CASH' as 'CASH' | 'ECOCASH',
    priority: 'NORMAL' as 'NORMAL' | 'URGENT',
    projectId: '',
  })

  const [errors, setErrors] = useState({
    payee: '',
    categoryId: '',
    amount: '',
    paymentDate: '',
    notes: '',
  })

  const fetchSavedNotes = () => {
    fetch('/api/expense-account/payment-notes', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setSavedNotes(d.data || []))
      .catch(() => {})
  }

  useEffect(() => {
    if (isOpen && businessId) {
      fetch(`/api/projects?businessId=${businessId}&status=active`, { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setProjects(data.map((p: any) => ({ id: p.id, name: p.name })))
        })
        .catch(() => {})
    }
  }, [isOpen, businessId])

  useEffect(() => {
    if (isOpen) {
      loadCategories()
      fetchLiveBalance()
      fetchSavedNotes()
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
      const res = await fetch(`/api/expense-account/${activeAccountId}/balance`, { credentials: 'include' })
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

  // Switch business: fetch that business's primary GENERAL account, update active account + domain
  const handleBusinessSwitch = async (biz: BusinessMembership) => {
    if (biz.businessId === selectedBusinessId) return
    setLoadingBusinessSwitch(true)
    try {
      const res = await fetch(`/api/expense-account?businessId=${biz.businessId}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        const accounts: any[] = data?.data?.accounts ?? []
        const primary = accounts.find((a: any) => a.accountType === 'GENERAL') ?? accounts[0]
        if (primary) {
          setActiveAccountId(primary.id)
          setActiveAccountName(primary.accountName)
          setActiveBalance(primary.balance)
          setLiveBalance(null)
        }
      }
    } catch {}
    setSelectedBusinessId(biz.businessId)
    setSelectedDropdownValue(biz.businessId)
    setActiveDomainOverride(null)
    setActiveDomainOverrideId(null)
    setDomainOverrideItems([])
    setDomainOverrideSubItems([])
    setActiveBusinessType(biz.businessType)
    setFormData(prev => ({ ...prev, categoryId: '', subcategoryId: '', subSubcategoryId: '' }))
    setSubcategories([])
    setSubSubcategories([])
    setLoadingBusinessSwitch(false)
  }

  // Auto-select domain matching business type when categories load (skip in domain-override mode)
  useEffect(() => {
    if (categories.length > 0 && !activeDomainOverride) {
      if (activeBusinessType && !formData.categoryId) {
        const domainName = getDefaultDomainName(activeBusinessType)
        const match = categories.find(c => c.name === domainName)
        if (match) setFormData(prev => ({ ...prev, categoryId: match.id }))
      } else if (isPersonalAccount && !selectedDropdownValue) {
        // Auto-activate Personal Expenses domain for personal accounts (checked before isHomeAccount
        // because a personal account with no businessId also satisfies isHomeAccount)
        const personalDomain = domainOptions.find(d => d.name === 'Personal Expenses')
        if (personalDomain) {
          const dropVal = `domain:${personalDomain.id}`
          setSelectedDropdownValue(dropVal)
          setActiveDomainOverride(personalDomain.name)
          setActiveDomainOverrideId(personalDomain.id)
          setFormData(prev => ({ ...prev, categoryId: '', subcategoryId: '', subSubcategoryId: '' }))
          setDomainOverrideItems([])
          setLoadingDomainOverrideItems(true)
          fetch(`/api/expense-categories/${personalDomain.id}/subcategories`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => setDomainOverrideItems(d.subcategories || []))
            .catch(() => {})
            .finally(() => setLoadingDomainOverrideItems(false))
        }
      } else if (isHomeAccount && !selectedDropdownValue) {
        // Auto-activate Home domain override for home accounts
        const homeDomain = domainOptions.find(d => d.name === 'Home')
        if (homeDomain) {
          const dropVal = `domain:${homeDomain.id}`
          setSelectedDropdownValue(dropVal)
          setActiveDomainOverride(homeDomain.name)
          setActiveDomainOverrideId(homeDomain.id)
          setFormData(prev => ({ ...prev, categoryId: '', subcategoryId: '', subSubcategoryId: '' }))
          setDomainOverrideItems([])
          setLoadingDomainOverrideItems(true)
          fetch(`/api/expense-categories/${homeDomain.id}/subcategories`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => setDomainOverrideItems(d.subcategories || []))
            .catch(() => {})
            .finally(() => setLoadingDomainOverrideItems(false))
        }
      }
    }
  }, [categories, activeBusinessType, activeDomainOverride])

  // Load subcategories when category changes (skip for RENT and domain-override mode — those handle loading directly)
  useEffect(() => {
    if (skipCascadeRef.current) return
    if (activeDomainOverride) return
    if (formData.categoryId) {
      if (isRentAccount) return
      loadSubcategories(formData.categoryId)
      setFormData(prev => ({ ...prev, subcategoryId: '', subSubcategoryId: '' }))
      setSubSubcategories([])
    } else {
      setSubcategories([])
      setSubSubcategories([])
    }
  }, [formData.categoryId, activeDomainOverride])

  // Load sub-subcategories when subcategory changes (normal mode only — domain-override handles this in onChange directly)
  const activeDomainOverrideRef = useRef(activeDomainOverride)
  useEffect(() => { activeDomainOverrideRef.current = activeDomainOverride }, [activeDomainOverride])

  useEffect(() => {
    if (skipCascadeRef.current) return
    if (activeDomainOverrideRef.current) return
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

        if (data.domains && Array.isArray(data.domains)) {
          data.domains.forEach((domain: any) => {
            if (domain.expense_categories && Array.isArray(domain.expense_categories)) {
              domain.expense_categories.forEach((cat: any) => {
                flattenedCategories.push({
                  id: cat.id,
                  name: cat.name,
                  emoji: cat.emoji,
                  color: cat.color || '#000000',
                  requiresSubcategory: cat.requiresSubcategory ?? false,
                  isDomainCategory: cat.isDomainCategory ?? false,
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
      paymentDate: '',
      notes: '',
    }

    if (!formData.payee) {
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

    if (!formData.notes.trim()) {
      newErrors.notes = 'Please describe what this payment is for'
    }

    setErrors(newErrors)
    return !newErrors.payee && !newErrors.categoryId && !newErrors.amount && !newErrors.paymentDate && !newErrors.notes
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (loading) return
    setLoading(true)

    if (!(await validateForm())) {
      setLoading(false)
      return
    }

    try {
      // Save note if requested (type mode + save checkbox)
      if (noteMode === 'type' && formData.notes.trim() && saveNote) {
        fetch('/api/expense-account/payment-notes', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ note: formData.notes.trim() }),
        }).then(() => fetchSavedNotes()).catch(() => {})
      }

      // Construct the payment payload with correct field names based on payee type
      const topCat = categories.find(c => c.id === formData.categoryId)
      const isDomain = topCat?.isDomainCategory ?? false
      // Domain hierarchy:  categoryId=domain → subcategoryId=ExpenseCategory → subSubcategoryId=ExpenseSubcategory
      // Global hierarchy:  categoryId=ExpenseCategory → subcategoryId=ExpenseSubcategory (no level 3)
      const resolvedCategoryId  = isDomain ? (formData.subcategoryId || formData.categoryId) : formData.categoryId
      const resolvedSubcategoryId = isDomain ? (formData.subSubcategoryId || null) : (formData.subcategoryId || null)
      const selectedCat = isDomain
        ? (formData.subcategoryId ? subcategories.find(s => s.id === formData.subcategoryId) : topCat)
        : topCat
      const payment = {
        payeeType: formData.payee!.type,
        payeeName: formData.payee!.name,
        payeeUserId: formData.payee?.type === 'USER' ? formData.payee.id : undefined,
        payeeEmployeeId: formData.payee?.type === 'EMPLOYEE' ? formData.payee.id : undefined,
        payeePersonId: formData.payee?.type === 'PERSON' ? formData.payee.id : undefined,
        payeeBusinessId: formData.payee?.type === 'BUSINESS' ? formData.payee.id : undefined,
        payeeSupplierId: formData.payee?.type === 'SUPPLIER' ? formData.payee.id : undefined,
        categoryId: resolvedCategoryId,
        categoryName: selectedCat?.name || undefined,
        subcategoryId: resolvedSubcategoryId,
        amount: parseFloat(formData.amount),
        paymentDate: formData.paymentDate,
        notes: formData.notes || null,
        paymentChannel: formData.paymentChannel,
        priority: formData.priority,
        projectId: formData.projectId || undefined,
        isFullPayment: true,
        status: 'SUBMITTED'
      }

      const result = await fetchWithValidation(`/api/expense-account/${activeAccountId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments: [payment] })
      })

      // Success — message depends on whether the payment was immediately submitted or queued
      const paymentStatus = result.data?.payments?.[0]?.status
      const successMessage = paymentStatus === 'SUBMITTED' ? 'Payment submitted successfully' : 'Payment added to queue'
      setPayeeErrorMessage(null)
      toast.push(successMessage)
      try {
        onSuccess({
          message: successMessage,
          id: result.data?.payments?.[0]?.id,
          refresh: true
        })
      } catch (e) {}

      // Trigger notification/queue refresh for all listeners (Letwin's issue)
      window.dispatchEvent(new CustomEvent('pending-actions:refresh'));

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
      paymentChannel: 'CASH',
      priority: 'NORMAL',
      projectId: '',
    })
    setErrors({
      payee: '',
      categoryId: '',
      amount: '',
      paymentDate: '',
      notes: '',
    })
    setPayeeErrorMessage(null)
    setSupplierForEdit(null)
    setSubcategories([])
    setSubSubcategories([])
    setNoteMode('type')
    setSaveNote(false)
    setIsApplyingSuggestion(false)
    setSuggestions([])
    setSuggestOpen(false)
  }

  const handleSuggest = async () => {
    const q = formData.notes.trim()
    if (q.length < 2) return
    setSuggestLoading(true)
    setSuggestions([])
    setSuggestOpen(true)
    try {
      // Scope suggestions to the selected domain/business — prevents cross-business noise
      // Domain-override: use the override ID directly.
      // Normal business: derive the matching domain from the active business type.
      const derivedDomainId = activeDomainOverrideId
        ?? (activeBusinessType
          ? domainOptions.find(d => d.name === getDefaultDomainName(activeBusinessType))?.id ?? null
          : null)
      const domainParam = derivedDomainId ? `&domainId=${encodeURIComponent(derivedDomainId)}` : ''
      const res = await fetch(`/api/expense-categories/suggest?q=${encodeURIComponent(q)}${domainParam}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions ?? [])
      }
    } catch {
      // Silently fail — user can still pick manually
    } finally {
      setSuggestLoading(false)
    }
  }

  const applySuggestion = async (s: typeof suggestions[0]) => {
    setSuggestOpen(false)
    // Block cascade effects from clearing fields while we apply each level
    skipCascadeRef.current = true
    setIsApplyingSuggestion(true)
    try {
      if (activeDomainOverride) {
        // ── Domain-override mode ────────────────────────────────────────────────
        // formData.categoryId = ExpenseCategory.id (s.categoryId)
        // formData.subcategoryId = ExpenseSubcategory.id (s.subcategoryId)
        // formData.subSubcategoryId = ExpenseSubSubcategory.id (optional, 4th level)

        // Step 1: pick the Category (load its Subcategories first so the dropdown is ready)
        const res1 = await fetch(`/api/expense-categories/${s.categoryId}/subcategories`, { credentials: 'include' })
        if (res1.ok) {
          const d = await res1.json()
          setSubcategories(d.subcategories ?? [])
        }
        setFormData(prev => ({ ...prev, categoryId: s.categoryId, subcategoryId: '', subSubcategoryId: '' }))

        // Step 2: pick the Subcategory (load its Sub-items from domain-override API)
        const res2 = await fetch(`/api/expense-categories/sub-subcategories/${s.subcategoryId}/items`, { credentials: 'include' })
        if (res2.ok) {
          const d = await res2.json()
          setDomainOverrideSubItems(d.items ?? [])
        }
        setFormData(prev => ({ ...prev, subcategoryId: s.subcategoryId, subSubcategoryId: '' }))

      } else {
        // ── Normal mode (domain selected in Domain picker) ──────────────────────
        // formData.categoryId = ExpenseDomain.id (s.domainId)
        // formData.subcategoryId = ExpenseCategory.id (s.categoryId)
        // formData.subSubcategoryId = ExpenseSubcategory.id (s.subcategoryId)

        // Step 1: pick the Domain — load its Categories (ExpenseCategories for the domain)
        const res1 = await fetch(`/api/expense-categories/${s.domainId}/subcategories`, { credentials: 'include' })
        if (res1.ok) {
          const d = await res1.json()
          setSubcategories(d.subcategories ?? [])
        }
        setFormData(prev => ({ ...prev, categoryId: s.domainId, subcategoryId: '', subSubcategoryId: '' }))

        // Step 2: pick the Category — load its Subcategories (ExpenseSubcategories for the category)
        // Uses the same API with an ExpenseCategory.id which falls back to the subcategory path
        const res2 = await fetch(`/api/expense-categories/${s.categoryId}/subcategories`, { credentials: 'include' })
        if (res2.ok) {
          const d = await res2.json()
          setSubSubcategories(d.subcategories ?? [])
        }
        setFormData(prev => ({ ...prev, subcategoryId: s.categoryId, subSubcategoryId: s.subcategoryId }))
      }
    } finally {
      setIsApplyingSuggestion(false)
      requestAnimationFrame(() => { skipCascadeRef.current = false })
    }
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

  const handleCreateContractorSuccess = (payload: any) => {
    if (payload.payee) {
      setFormData({
        ...formData,
        payee: { type: payload.payee.type, id: payload.payee.id, name: payload.payee.name },
      })
      setErrors({ ...errors, payee: '' })
      setPayeeRefreshTrigger(prev => prev + 1)
    }
    setShowContractorModal(false)
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
      if (activeDomainOverride) {
        // Domain-override: formData.categoryId is an expenseCategories.id; create expenseSubcategories under it
        const res = await fetch('/api/expense-categories/subcategories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ categoryId: formData.categoryId, name, emoji }),
        })
        const data = await res.json()
        if (res.ok && data.subcategory) {
          await loadSubcategories(formData.categoryId)
          setFormData(prev => ({ ...prev, subcategoryId: data.subcategory.id, subSubcategoryId: '' }))
          setShowCreateSubcategory(false)
        }
      } else {
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
      const res = await fetch('/api/expense-categories/sub-subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subcategoryId: formData.subcategoryId, name, emoji }),
      })
      const data = await res.json()
      if (res.ok && data.subSubcategory) {
        if (activeDomainOverride) {
          // Domain-override mode: reload domainOverrideSubItems (picker reads this state)
          const itemsRes = await fetch(`/api/expense-categories/sub-subcategories/${formData.subcategoryId}/items`, { credentials: 'include' })
          if (itemsRes.ok) {
            const itemsData = await itemsRes.json()
            setDomainOverrideSubItems(itemsData.items || [])
          }
        } else {
          await loadSubSubcategories(formData.subcategoryId)
        }
        setFormData(prev => ({ ...prev, subSubcategoryId: data.subSubcategory.id }))
        setShowCreateSubSubcategory(false)
      }
    } catch (error) {
      console.error('Error creating sub-subcategory:', error)
    } finally {
      setCreatingSubItem(false)
    }
  }

  const handleCreateGlobalCategory = async (name: string, emoji: string) => {
    setCreatingSubItem(true)
    try {
      const res = await fetch('/api/expense-categories/flat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, emoji, color: '#3B82F6', requiresSubcategory: false, isUserCreated: true }),
      })
      const data = await res.json()
      if (res.ok && data.data?.category) {
        await loadCategories()
        setFormData(prev => ({ ...prev, categoryId: data.data.category.id, subcategoryId: '', subSubcategoryId: '' }))
        setShowCreateGlobalCategory(false)
      }
    } catch (error) {
      console.error('Error creating category:', error)
    } finally {
      setCreatingSubItem(false)
    }
  }

  const selectedCategory = categories.find(c => c.id === formData.categoryId)
  const domainOptions = categories.filter(c => c.isDomainCategory)
  // When a domain group is selected from the Business dropdown, restrict the Domain picker to that domain only
  const visibleDomainOptions = activeDomainOverride
    ? domainOptions.filter(d => d.name === activeDomainOverride)
    : isHomeAccount
      ? domainOptions.filter(d => !BUSINESS_DOMAIN_NAMES.has(d.name))
      : domainOptions
  const globalCategories = categories.filter(c => !c.isDomainCategory)
  const selectedIsDomain = selectedCategory?.isDomainCategory ?? false

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md sm:max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-primary">Quick Payment</h2>
          <p className="text-sm text-secondary">
            from {activeAccountName} (Balance:{' '}
            {balanceLoading || loadingBusinessSwitch ? (
              <span className="text-secondary font-semibold">Loading...</span>
            ) : (
              <span className={`font-semibold ${(liveBalance ?? activeBalance) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${(liveBalance ?? activeBalance).toFixed(2)}
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
          {/* Business selector — shown when multiple businesses available or for personal accounts */}
          {(isPersonalAccount || (businesses && businesses.length > 1)) && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-secondary mb-1">Business</label>
              <SearchableSelect
                value={selectedDropdownValue}
                disabled={loadingBusinessSwitch}
                loading={loadingBusinessSwitch}
                placeholder="Select business or domain..."
                options={isPersonalAccount
                  ? domainOptions
                      .filter(d => d.name === 'Personal Expenses')
                      .map(d => ({ id: `domain:${d.id}`, label: '🏠 Personal Expenses' }))
                  : [
                      ...(!isHomeAccount ? businesses.filter(b => !b.isUmbrellaBusiness).map(b => ({
                        id: b.businessId,
                        label: b.businessName,
                      })) : []),
                      ...domainOptions
                        .filter(d => !isHomeAccount || !BUSINESS_DOMAIN_NAMES.has(d.name))
                        .map(d => ({
                        id: `domain:${d.id}`,
                        label: `${d.name} Business Domains`,
                      })),
                    ]}
                onChange={(val) => {
                  setSelectedDropdownValue(val)
                  if (val.startsWith('domain:')) {
                    const domainId = val.replace('domain:', '')
                    const cat = domainOptions.find(c => c.id === domainId)
                    if (cat) {
                      setActiveDomainOverride(cat.name)
                      setActiveDomainOverrideId(domainId)
                      setFormData(prev => ({ ...prev, categoryId: '', subcategoryId: '', subSubcategoryId: '' }))
                      setSubcategories([])
                      setSubSubcategories([])
                      setDomainOverrideItems([])
                      setLoadingDomainOverrideItems(true)
                      fetch(`/api/expense-categories/${domainId}/subcategories`, { credentials: 'include' })
                        .then(r => r.json())
                        .then(d => setDomainOverrideItems(d.subcategories || []))
                        .catch(() => {})
                        .finally(() => setLoadingDomainOverrideItems(false))
                    }
                  } else {
                    setActiveDomainOverride(null)
                    const biz = businesses.find(b => b.businessId === val)
                    if (biz) handleBusinessSwitch(biz)
                  }
                }}
              />
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-secondary">
                Payee <span className="text-red-500">*</span>
              </label>
            </div>
            {isRentAccount && presetPayee ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-md">
                <span className="text-lg">🏠</span>
                <span className="text-sm font-medium text-primary">{presetPayee.name}</span>
                <span className="ml-auto text-xs text-orange-600 dark:text-orange-400 font-medium">Landlord · Fixed</span>
              </div>
            ) : (
              <PayeeSelector
                value={formData.payee}
                onChange={(payee) => {
                  setFormData({ ...formData, payee })
                  setErrors({ ...errors, payee: '' })
                  setPayeeErrorMessage(null)
                }}
                onCreateIndividual={canCreatePayees ? (query) => { setPayeeSearchQuery(query || ''); setShowIndividualModal(true) } : undefined}
                onCreateSupplier={canCreatePayees ? (query) => { setPayeeSearchQuery(query || ''); setShowSupplierModal(true) } : undefined}
                onCreateContractor={canCreatePayees ? (query) => { setPayeeSearchQuery(query || ''); setShowContractorModal(true) } : undefined}
                error={errors.payee}
                refreshTrigger={payeeRefreshTrigger}
              />
            )}
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
                  {/* Domain + Category */}
                  {(activeDomainOverride ? (
                      // ── Business-domain mode ──────────────────────────────────
                      // domainOverrideItems = expense_categories (General Construction, Structural Work…)
                      // subcategories = expense_subcategories under selected expense_category (Masonry, Steel…)
                      // subSubcategories = expense_sub_subcategories (Brickwork, Blockwork…)
                      <>
                        {isApplyingSuggestion && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 animate-pulse">💡 Applying suggestion…</p>
                        )}
                        {/* Domain picker — expense_categories of the selected business domain */}
                        <div>
                          <label className="block text-sm font-medium text-secondary mb-1">
                            Domain
                          </label>
                          <SearchableSelect
                            value={formData.categoryId}
                            options={domainOverrideItems.map(s => ({ id: s.id, label: `${s.emoji || ''} ${s.name}`.trim() }))}
                            onChange={(val) => {
                              console.log('[DomainOverride] Domain picked, categoryId=', val)
                              setFormData(prev => ({ ...prev, categoryId: val, subcategoryId: '', subSubcategoryId: '' }))
                              setErrors(prev => ({ ...prev, categoryId: '' }))
                              setSubcategories([])
                              setSubSubcategories([])
                              setDomainOverrideSubItems([])
                              if (val) {
                                setLoadingSubcategories(true)
                                fetch(`/api/expense-categories/${val}/subcategories`, { credentials: 'include' })
                                  .then(r => { console.log('[DomainOverride] subcategories status=', r.status); return r.json() })
                                  .then(d => { console.log('[DomainOverride] subcategories data=', d); setSubcategories(d.subcategories || []) })
                                  .catch(e => console.error('[DomainOverride] subcategories error=', e))
                                  .finally(() => setLoadingSubcategories(false))
                              }
                            }}
                            placeholder={loadingDomainOverrideItems ? 'Loading…' : 'Select a domain…'}
                            loading={loadingDomainOverrideItems}
                            disabled={isApplyingSuggestion || loadingDomainOverrideItems || businessNotSelected}
                          />
                        </div>

                        {/* Category picker — expense_subcategories under selected expense_category */}
                        {formData.categoryId && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-sm font-medium text-secondary">
                                Category
                              </label>
                              <button type="button" onClick={() => setShowCreateSubcategory(true)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium">
                                + Create New
                              </button>
                            </div>
                            <SearchableSelect
                              value={formData.subcategoryId}
                              options={subcategories.map(s => ({ id: s.id, label: `${s.emoji} ${s.name}` }))}
                              onChange={(val) => {
                                console.log('[DomainOverride] Category picked, subcategoryId=', val)
                                setFormData(prev => ({ ...prev, subcategoryId: val, subSubcategoryId: '' }))
                                setDomainOverrideSubItems([])
                                if (val) {
                                  setLoadingDomainOverrideSubItems(true)
                                  fetch(`/api/expense-categories/sub-subcategories/${val}/items`, { credentials: 'include' })
                                    .then(r => { console.log('[DomainOverride] sub-items status=', r.status); return r.json() })
                                    .then(d => { console.log('[DomainOverride] sub-items data=', d); setDomainOverrideSubItems(d.items || []) })
                                    .catch(e => console.error('[DomainOverride] sub-items error=', e))
                                    .finally(() => setLoadingDomainOverrideSubItems(false))
                                }
                              }}
                              placeholder={loadingSubcategories ? 'Loading…' : 'Select a category…'}
                              loading={loadingSubcategories}
                              disabled={isApplyingSuggestion || !formData.categoryId || businessNotSelected}
                            />
                          </div>
                        )}

                        {/* Sub-Category picker — expense_sub_subcategories */}
                        {formData.subcategoryId && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-sm font-medium text-secondary">
                                Sub-Category
                              </label>
                              <button type="button" onClick={() => setShowCreateSubSubcategory(true)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium">
                                + Create New
                              </button>
                            </div>
                            <SearchableSelect
                              value={formData.subSubcategoryId}
                              options={domainOverrideSubItems.map(s => ({ id: s.id, label: `${s.emoji} ${s.name}` }))}
                              onChange={(val) => setFormData(prev => ({ ...prev, subSubcategoryId: val }))}
                              placeholder={loadingDomainOverrideSubItems ? 'Loading…' : 'Select a sub-category…'}
                              loading={loadingDomainOverrideSubItems}
                              disabled={isApplyingSuggestion || !formData.subcategoryId || loadingDomainOverrideSubItems || businessNotSelected}
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      // ── Normal mode ───────────────────────────────────────────
                      <>
                        {isApplyingSuggestion && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 animate-pulse">💡 Applying suggestion…</p>
                        )}
                        {/* Domain picker */}
                        <div>
                          <label className="block text-sm font-medium text-secondary mb-1">
                            Domain
                          </label>
                          {loadingCategories ? (
                            <div className="text-sm text-secondary">Loading...</div>
                          ) : (
                            <select
                              value={selectedIsDomain ? formData.categoryId : ''}
                              onChange={(e) => {
                                const domainId = e.target.value
                                setFormData({ ...formData, categoryId: domainId, subcategoryId: '', subSubcategoryId: '' })
                                setErrors({ ...errors, categoryId: '' })
                              }}
                              disabled={isApplyingSuggestion || !canChangeCategory || businessNotSelected}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">— Select domain —</option>
                              {visibleDomainOptions.map(d => (
                                <option key={d.id} value={d.id}>{d.emoji} {d.name}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Global Category picker — only shown when no domain selected */}
                        {!selectedIsDomain && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-sm font-medium text-secondary">
                                Category <span className="text-red-500">*</span>
                              </label>
                              <button type="button" onClick={() => setShowCreateGlobalCategory(true)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium">
                                + New Category
                              </button>
                            </div>
                            {loadingCategories ? (
                              <div className="text-sm text-secondary">Loading categories...</div>
                            ) : (
                              <SearchableCategorySelector
                                categories={globalCategories}
                                value={formData.categoryId}
                                onChange={(categoryId) => {
                                  setFormData({ ...formData, categoryId })
                                  setErrors({ ...errors, categoryId: '' })
                                }}
                                error={errors.categoryId}
                                disabled={!canChangeCategory || businessNotSelected}
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
                              disabled={isApplyingSuggestion || !formData.categoryId || businessNotSelected}
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
                              disabled={isApplyingSuggestion || !formData.subcategoryId || businessNotSelected}
                            />
                          </div>
                        )}
                      </>
                    )
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
                {!errors.amount && formData.amount && parseFloat(formData.amount) > (liveBalance ?? activeBalance) && (
                  <p className="text-xs text-yellow-500 mt-1">
                    Warning: Insufficient funds. Available balance: ${(liveBalance ?? activeBalance).toFixed(2)}. The check will be done on approval.
                  </p>
                )}
              </div>

              {/* Payment Channel */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Payment Method</label>
                <div className="flex gap-2">
                  {(['CASH', 'ECOCASH'] as const).map(ch => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentChannel: ch })}
                      className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors ${
                        formData.paymentChannel === ch
                          ? ch === 'ECOCASH'
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-blue-600 text-white border-blue-600'
                          : 'bg-background text-secondary border-border hover:bg-muted'
                      }`}
                    >
                      {ch === 'CASH' ? '💵 Cash' : '📱 EcoCash'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Priority</label>
                <div className="flex gap-2">
                  {(['NORMAL', 'URGENT'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p })}
                      className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors ${
                        formData.priority === p
                          ? p === 'URGENT'
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-gray-600 text-white border-gray-600'
                          : 'bg-background text-secondary border-border hover:bg-muted'
                      }`}
                    >
                      {p === 'URGENT' ? '🚨 Urgent' : '✅ Normal'}
                    </button>
                  ))}
                </div>
                {formData.priority === 'URGENT' && (
                  <p className="text-xs text-red-500 mt-1">Urgent requests are prioritised by the cashier.</p>
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
                  label=""
                  error={errors.paymentDate}
                  max={getTodayLocalDateString()}
                />
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-secondary">
                    What is this payment for? <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    disabled={formData.notes.trim().length < 3 || businessNotSelected}
                    onClick={handleSuggest}
                    className="text-xs px-2 py-1 rounded border border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Get domain/category suggestions based on your description"
                  >
                    💡 Suggest Classification
                  </button>
                </div>
                {/* Mode toggle */}
                <div className="flex gap-2 mb-2">
                  {(['saved', 'type'] as const).map(mode => (
                    <button key={mode} type="button"
                      onClick={() => { setNoteMode(mode); setFormData({ ...formData, notes: '' }); setSaveNote(false) }}
                      className={`px-3 py-1.5 text-xs rounded border transition-colors ${noteMode === mode
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 font-semibold'
                        : 'border-border hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      {mode === 'saved' ? 'Saved phrases' : 'Type a note'}
                    </button>
                  ))}
                </div>
                {errors.notes && (
                  <p className="text-xs text-red-600 dark:text-red-400 mb-1">{errors.notes}</p>
                )}

                {noteMode === 'saved' && (
                  <select
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a saved phrase...</option>
                    {savedNotes.map(n => (
                      <option key={n.id} value={n.note}>{n.note}</option>
                    ))}
                    {savedNotes.length === 0 && <option disabled>No saved phrases yet — use "Type a note" to add one</option>}
                  </select>
                )}

                {noteMode === 'type' && (() => {
                  const q = formData.notes.trim().toLowerCase()
                  const matches = q.length >= 2 ? savedNotes.filter(n => n.note.toLowerCase().includes(q)) : []
                  const exactMatch = savedNotes.find(n => n.note.toLowerCase() === q)
                  return (
                    <div className="space-y-1.5">
                      <textarea
                        value={formData.notes}
                        onChange={e => { setFormData({ ...formData, notes: e.target.value }); setSaveNote(false); setErrors(prev => ({ ...prev, notes: '' })) }}
                        className={`w-full px-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 ${errors.notes ? 'border-red-400' : 'border-border'}`}
                        rows={2}
                        placeholder="e.g. School fees Term 1 — Chisamba Primary"
                        maxLength={500}
                        autoFocus
                      />
                      {matches.length > 0 && (
                        <div className="border border-border rounded bg-background shadow-sm overflow-hidden">
                          <p className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-b border-border">Matching saved phrases — click to use:</p>
                          {matches.map(n => (
                            <button key={n.id} type="button"
                              onClick={() => { setFormData({ ...formData, notes: n.note }); setNoteMode('saved') }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left">
                              <span className="text-primary flex-1">{n.note}</span>
                              <span className="ml-auto text-xs text-blue-600 dark:text-blue-400">Use this</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {formData.notes.trim() && !exactMatch && (
                        <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                          <input type="checkbox" checked={saveNote} onChange={e => setSaveNote(e.target.checked)} className="rounded" />
                          Save "{formData.notes.trim().slice(0, 40)}{formData.notes.trim().length > 40 ? '…' : ''}" for future payments
                        </label>
                      )}
                      {exactMatch && <p className="text-xs text-amber-600 dark:text-amber-400">This phrase is already saved.</p>}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Link to Project (optional, shown only when business has projects) */}
          {projects.length > 0 && (
            <div className="px-4 pb-3">
              <label className="block text-sm font-medium text-secondary mb-1">Link to Project (optional)</label>
              <SearchableSelect
                value={formData.projectId}
                options={projects.map(p => ({ id: p.id, label: p.name }))}
                onChange={(value) => setFormData({ ...formData, projectId: value })}
                placeholder="No project linked"
              />
            </div>
          )}

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

      {/* Create Contractor Payee Modal */}
      <CreateContractorPayeeModal
        isOpen={showContractorModal}
        onClose={() => setShowContractorModal(false)}
        onSuccess={handleCreateContractorSuccess}
        onError={(error) => console.error('Create contractor error:', error)}
      />

      {/* Create Supplier Modal */}
      {showSupplierModal && supplierBusinessId && (
        <SupplierEditor
          businessId={supplierBusinessId}
          onSave={handleCreateSupplierSuccess}
          onCancel={() => setShowSupplierModal(false)}
          initialName={payeeSearchQuery}
        />
      )}

      {/* Edit Supplier Modal — opened when a payee error occurs */}
      {showEditSupplierModal && supplierBusinessId && supplierForEdit && (
        <SupplierEditor
          businessId={supplierBusinessId}
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
      <QuickCreateModal
        isOpen={showCreateGlobalCategory}
        title="Create Category"
        placeholder="e.g., Gym Membership"
        onClose={() => setShowCreateGlobalCategory(false)}
        onSubmit={handleCreateGlobalCategory}
        loading={creatingSubItem}
      />

      {/* Classification Suggestion Modal */}
      {suggestOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-base font-semibold text-primary">💡 Suggested Classifications</h3>
              <button type="button" onClick={() => setSuggestOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
            </div>
            <div className="p-4">
              <p className="text-xs text-secondary mb-3">
                Based on: <span className="font-medium text-primary">"{formData.notes.trim()}"</span>
              </p>
              {suggestLoading && (
                <p className="text-sm text-secondary py-4 text-center">Searching taxonomy…</p>
              )}
              {!suggestLoading && suggestions.length === 0 && (
                <p className="text-sm text-secondary py-4 text-center">No matches found — please select manually.</p>
              )}
              {!suggestLoading && suggestions.length > 0 && (
                <ul className="space-y-2">
                  {suggestions.map((s, i) => (
                    <li key={`${s.subcategoryId}-${i}`}>
                      <button
                        type="button"
                        onClick={() => applySuggestion(s)}
                        className="w-full text-left px-3 py-2.5 rounded-md border border-border hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <div className="text-xs text-secondary mb-0.5">
                          {s.domainEmoji} {s.domainName} › {s.categoryEmoji} {s.categoryName}
                        </div>
                        <div className="text-sm font-medium text-primary">
                          {s.subcategoryEmoji} {s.subcategoryName}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
