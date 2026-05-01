'use client'

import { useState, useEffect, useRef } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { DateInput } from '@/components/ui/date-input'
import { PayeeSelector } from './payee-selector'
import { CreateCategoryModal } from './create-category-modal'
import { CreateIndividualPayeeModal } from './create-individual-payee-modal'
import { SupplierEditor } from '@/components/suppliers/supplier-editor'
import { LineItemsInput, type LineItem } from './line-items-input'

// ── Quick create modal (name + emoji) ─────────────────────────────────────────
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

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit(name.trim(), emoji.trim() || '📂')
      setName('')
      setEmoji('📂')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-5 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-primary mb-3">{title}</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              className="w-14 px-2 py-2 text-xl text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              maxLength={2}
            />
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-primary focus:ring-2 focus:ring-blue-500"
              placeholder={placeholder}
              maxLength={50}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) handleSubmit() }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { onClose(); setName(''); setEmoji('📂') }}
              disabled={loading}
              className="px-3 py-1.5 text-sm text-secondary border border-border rounded-lg hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !name.trim()}
              className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Searchable select ──────────────────────────────────────────────────────────
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
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (loading) {
    return (
      <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-background text-secondary text-sm">
        Loading...
      </div>
    )
  }

  if (disabled) {
    return (
      <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 text-sm cursor-not-allowed">
        {selected?.label || placeholder}
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
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-left flex items-center justify-between bg-white dark:bg-gray-800 text-sm"
      >
        <span className={selected ? 'text-primary' : 'text-secondary'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-56 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-primary focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="overflow-y-auto max-h-44">
            {value && (
              <button
                type="button"
                onClick={() => { onChange(''); setIsOpen(false); setSearch('') }}
                className="w-full px-3 py-2 text-left text-sm text-secondary hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Clear
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-secondary">No matches</div>
            ) : (
              filtered.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => { onChange(o.id); setIsOpen(false); setSearch('') }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                    o.id === value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 font-medium' : 'text-primary'
                  }`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface PaymentDetail {
  id: string
  payeeType: string
  payeeUser?: { id: string; name: string } | null
  payeeEmployee?: { id: string; fullName: string } | null
  payeePerson?: { id: string; fullName: string } | null
  payeeBusiness?: { id: string; name: string } | null
  payeeSupplier?: { id: string; name: string } | null
  category?: { id: string; name: string; emoji: string; domainId: string | null } | null
  subcategory?: { id: string; name: string; emoji: string } | null
  subSubcategory?: { id: string; name: string; emoji: string } | null
  amount: number
  paymentDate: string
  notes: string | null
  status: string
  receiptNumber: string | null
  receiptServiceProvider: string | null
  receiptReason: string | null
  paymentChannel: string
  priority: string
  projectId: string | null
  createdAt: string
  lineItems?: LineItem[] | null
}

interface EditPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  paymentId: string
  isAdmin: boolean
  onSuccess: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function toDateInput(iso: string) {
  return iso.slice(0, 10)
}

function isWithin7Days(createdAt: string) {
  const diffMs = Date.now() - new Date(createdAt).getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) <= 7
}

// ── Component ──────────────────────────────────────────────────────────────────
export function EditPaymentModal({
  isOpen,
  onClose,
  accountId,
  paymentId,
  isAdmin,
  onSuccess,
}: EditPaymentModalProps) {
  const toast = useToastContext()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [payment, setPayment] = useState<PaymentDetail | null>(null)

  // Basic form fields
  const [amount, setAmount] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [notes, setNotes] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [receiptServiceProvider, setReceiptServiceProvider] = useState('')
  const [receiptReason, setReceiptReason] = useState('')
  const [paymentChannel, setPaymentChannel] = useState<'CASH' | 'ECOCASH'>('CASH')
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT'>('NORMAL')
  const [projectId, setProjectId] = useState('')
  const [projects, setProjects] = useState<{ id: string; label: string }[]>([])

  // Payee
  const [payee, setPayee] = useState<{ type: string; id: string; name: string } | null>(null)
  const [originalPayee, setOriginalPayee] = useState<{ type: string; id: string; name: string } | null>(null)
  const [payeeChangeReason, setPayeeChangeReason] = useState('')
  const [showCreateIndividualModal, setShowCreateIndividualModal] = useState(false)
  const [showCreateSupplierModal, setShowCreateSupplierModal] = useState(false)
  const [payeeSearchQuery, setPayeeSearchQuery] = useState('')
  const [payeeRefreshKey, setPayeeRefreshKey] = useState(0)
  const [businessId, setBusinessId] = useState('')

  // Category — 3-level hierarchy
  // topId: domain ID or global ExpenseCategory ID (shown in top dropdown)
  // isDomainPath: true when topId is a domain
  // midId: ExpenseCategory.id under domain (domain path only)
  // subId: ExpenseSubcategory.id
  const [topId, setTopId] = useState('')
  const [isDomainPath, setIsDomainPath] = useState(false)
  const [midId, setMidId] = useState('')
  const [subId, setSubId] = useState('')

  const [topOptions, setTopOptions] = useState<{ id: string; label: string }[]>([])
  const [midOptions, setMidOptions] = useState<{ id: string; label: string }[]>([])
  const [subOptions, setSubOptions] = useState<{ id: string; label: string }[]>([])
  const [subSubId, setSubSubId] = useState('')
  const [subSubOptions, setSubSubOptions] = useState<{ id: string; label: string }[]>([])
  const [loadingMid, setLoadingMid] = useState(false)
  const [loadingSub, setLoadingSub] = useState(false)
  const [loadingSubSub, setLoadingSubSub] = useState(false)

  // Create modals
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false)
  const [showCreateMidModal, setShowCreateMidModal] = useState(false)
  const [showCreateSubModal, setShowCreateSubModal] = useState(false)
  const [creatingItem, setCreatingItem] = useState(false)

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([])

  // Classification suggestion
  const [suggestQuery, setSuggestQuery] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<{
    domainId: string; domainName: string; domainEmoji: string | null
    categoryId: string; categoryName: string; categoryEmoji: string | null
    subcategoryId: string; subcategoryName: string; subcategoryEmoji: string | null
    subSubcategoryId: string | null; subSubcategoryName: string | null; subSubcategoryEmoji: string | null
    score: number
  }[]>([])

  // Refs for pre-fill values across async boundaries
  const prefillMidId = useRef('')
  const prefillSubId = useRef('')
  const prefillSubSubId = useRef('')

  // ── Reload helpers ────────────────────────────────────────────────────────────
  const reloadTopOptions = async () => {
    try {
      const res = await fetch('/api/expense-categories/hierarchical', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      const flat: { id: string; label: string }[] = []
      for (const domain of data.domains ?? []) {
        for (const cat of domain.expense_categories ?? []) {
          const label = cat.isDomainCategory
            ? (cat.name === 'Personal Expenses'
                ? `🏠 Personal Expenses`
                : `${cat.emoji || ''} ${cat.name} Business Domains`.trim())
            : `${cat.emoji || '📂'} ${cat.name}`
          flat.push({ id: cat.id, label })
        }
      }
      setTopOptions(flat)
    } catch {}
  }

  const reloadMidOptions = async (domainId: string) => {
    try {
      const res = await fetch(`/api/expense-categories/${domainId}/subcategories`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      const opts = (data.subcategories ?? []).map((s: any) => ({
        id: s.id,
        label: `${s.emoji || '📂'} ${s.name}`,
      }))
      setMidOptions(opts)
    } catch {}
  }

  const reloadSubOptions = async (categoryId: string) => {
    try {
      const res = await fetch(
        `/api/expense-categories/${categoryId}/subcategories`,
        { credentials: 'include' }
      )
      if (!res.ok) return
      const data = await res.json()
      const opts = (data.subcategories ?? []).map((s: any) => ({
        id: s.id,
        label: `${s.emoji || '📂'} ${s.name}`,
      }))
      setSubOptions(opts)
    } catch {}
  }

  // ── Create handlers ───────────────────────────────────────────────────────────
  const handleCreateCategorySuccess = async (payload: any) => {
    if (!payload.category) return
    await reloadTopOptions()
    setTopId(payload.category.id)
    setMidId('')
    setSubId('')
    setMidOptions([])
    setSubOptions([])
    setShowCreateCategoryModal(false)
  }

  // Create a new ExpenseCategory under the selected domain (mid level)
  const handleCreateSubcategory = async (name: string, emoji: string) => {
    if (!topId) return
    setCreatingItem(true)
    try {
      const res = await fetch('/api/expense-categories/flat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          emoji,
          color: '#3B82F6',
          domainId: topId,
          requiresSubcategory: false,
          isUserCreated: true,
        }),
      })
      const data = await res.json()
      if (res.ok && data.data?.category) {
        await reloadMidOptions(topId)
        setMidId(data.data.category.id)
        setSubId('')
        setSubOptions([])
        setShowCreateMidModal(false)
      } else {
        toast.error(data.error || 'Failed to create subcategory')
      }
    } catch {
      toast.error('Failed to create subcategory')
    } finally {
      setCreatingItem(false)
    }
  }

  // Create a new ExpenseSubcategory under the selected ExpenseCategory (sub level)
  const handleCreateSubSubcategory = async (name: string, emoji: string) => {
    if (!midId) return
    setCreatingItem(true)
    try {
      const res = await fetch('/api/expense-categories/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ categoryId: midId, name, emoji }),
      })
      const data = await res.json()
      if (res.ok && data.subcategory) {
        await reloadSubOptions(midId)
        setSubId(data.subcategory.id)
        setShowCreateSubModal(false)
      } else {
        toast.error(data.error || 'Failed to create sub-subcategory')
      }
    } catch {
      toast.error('Failed to create sub-subcategory')
    } finally {
      setCreatingItem(false)
    }
  }

  // ── Load top-level category options ──────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    reloadTopOptions()
  }, [isOpen])

  // ── Load all projects ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    fetch('/api/projects', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProjects(data.map((p: any) => ({ id: p.id, label: p.name })))
        }
      })
      .catch(() => {})
  }, [isOpen])

  // ── Load payment data ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setPayeeChangeReason('')
    setTopId('')
    setIsDomainPath(false)
    setMidId('')
    setSubId('')
    setMidOptions([])
    setSubOptions([])
    setSubSubId('')
    setSubSubOptions([])
    prefillMidId.current = ''
    prefillSubId.current = ''
    prefillSubSubId.current = ''
    setSuggestions([])
    setSuggestOpen(false)
    setSuggestQuery('')

    fetch(`/api/expense-account/${accountId}/payments/${paymentId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const p: PaymentDetail = data.data?.payment
        if (!p) return
        setPayment(p)
        setBusinessId((data.data?.payment?.expenseAccount?.businessId) || '')
        setAmount(String(p.amount))
        setAdjustmentReason('')
        setPaymentDate(toDateInput(p.paymentDate))
        setNotes(p.notes || '')
        setReceiptNumber(p.receiptNumber || '')
        setReceiptServiceProvider(p.receiptServiceProvider || '')
        setReceiptReason(p.receiptReason || '')
        setPaymentChannel(p.paymentChannel === 'ECOCASH' ? 'ECOCASH' : 'CASH')
        setPriority(p.priority === 'URGENT' ? 'URGENT' : 'NORMAL')
        setProjectId(p.projectId || '')
        setLineItems(Array.isArray(p.lineItems) ? p.lineItems : [])

        // Set payee
        const payeeName =
          p.payeeUser?.name || p.payeeEmployee?.fullName || p.payeePerson?.fullName ||
          p.payeeBusiness?.name || p.payeeSupplier?.name || ''
        const payeeId =
          p.payeeUser?.id || p.payeeEmployee?.id || p.payeePerson?.id ||
          p.payeeBusiness?.id || p.payeeSupplier?.id || ''
        const payeeVal = payeeId ? { type: p.payeeType, id: payeeId, name: payeeName } : null
        setPayee(payeeVal)
        setOriginalPayee(payeeVal)

        // Set category pre-fill
        if (p.category?.domainId) {
          // Domain path: top=domain, mid=ExpenseCategory, sub=ExpenseSubcategory, subSub=ExpenseSubSubcategory
          prefillMidId.current = p.category.id
          prefillSubId.current = p.subcategory?.id || ''
          prefillSubSubId.current = p.subSubcategory?.id || ''
          setTopId(p.category.domainId)
        } else if (p.category?.id) {
          // Global path: top=ExpenseCategory, no mid/sub
          setTopId(p.category.id)
        }
      })
      .catch(() => toast.error('Failed to load payment'))
      .finally(() => setLoading(false))
  }, [isOpen, accountId, paymentId])

  // ── Load mid options when topId changes ───────────────────────────────────────
  // 200 → domain path; 404 → global category (no mid level)
  useEffect(() => {
    if (!topId) {
      setIsDomainPath(false)
      setMidOptions([])
      setMidId('')
      setSubOptions([])
      setSubId('')
      return
    }
    setLoadingMid(true)
    fetch(`/api/expense-categories/${topId}/subcategories`, { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error('not-a-domain')
        return r.json()
      })
      .then(data => {
        const opts = (data.subcategories ?? []).map((s: any) => ({
          id: s.id,
          label: `${s.emoji || '📂'} ${s.name}`,
        }))
        setIsDomainPath(true)
        setMidOptions(opts)
        if (prefillMidId.current) {
          setMidId(prefillMidId.current)
          prefillMidId.current = ''
        }
      })
      .catch(() => {
        setIsDomainPath(false)
        setMidOptions([])
        setMidId('')
        setSubOptions([])
        setSubId('')
      })
      .finally(() => setLoadingMid(false))
  }, [topId])

  // ── Load sub options when midId changes ───────────────────────────────────────
  useEffect(() => {
    if (!midId) {
      setSubOptions([])
      setSubId('')
      setSubSubOptions([])
      setSubSubId('')
      return
    }
    setLoadingSub(true)
    fetch(`/api/expense-categories/${midId}/subcategories`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const opts = (data.subcategories ?? []).map((s: any) => ({
          id: s.id,
          label: `${s.emoji || '📂'} ${s.name}`,
        }))
        setSubOptions(opts)
        if (prefillSubId.current) {
          setSubId(prefillSubId.current)
          prefillSubId.current = ''
        }
      })
      .catch(() => { setSubOptions([]); setSubId('') })
      .finally(() => setLoadingSub(false))
  }, [midId])

  // ── Load sub-sub options when subId changes ───────────────────────────────────
  useEffect(() => {
    if (!subId) {
      setSubSubOptions([])
      setSubSubId('')
      return
    }
    setLoadingSubSub(true)
    fetch(`/api/expense-categories/subcategories/${subId}/sub-subcategories`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const opts = (data.subSubcategories ?? []).map((s: any) => ({
          id: s.id,
          label: `${s.emoji || '📂'} ${s.name}`,
        }))
        setSubSubOptions(opts)
        if (prefillSubSubId.current) {
          setSubSubId(prefillSubSubId.current)
          prefillSubSubId.current = ''
        }
      })
      .catch(() => { setSubSubOptions([]); setSubSubId('') })
      .finally(() => setLoadingSubSub(false))
  }, [subId])

  // ── Category change handlers ──────────────────────────────────────────────────
  const handleTopChange = (id: string) => {
    setSuggestOpen(false)
    setTopId(id)
    setMidId('')
    setSubId('')
    setSubSubId('')
    setMidOptions([])
    setSubOptions([])
    setSubSubOptions([])
  }

  const handleMidChange = (id: string) => {
    setMidId(id)
    setSubId('')
    setSubSubId('')
    setSubOptions([])
    setSubSubOptions([])
  }

  const handleSubChange = (id: string) => {
    setSubId(id)
    setSubSubId('')
    setSubSubOptions([])
  }

  // ── Suggest classification ────────────────────────────────────────────────────
  const handleSuggest = async () => {
    const q = suggestQuery.trim()
    if (q.length < 2) return
    setSuggestLoading(true)
    setSuggestions([])
    setSuggestOpen(true)
    try {
      // If the user already has a domain selected, scope suggestions to that domain only
      const domainParam = isDomainPath && topId ? `&domainId=${encodeURIComponent(topId)}` : ''
      const res = await fetch(`/api/expense-categories/suggest?q=${encodeURIComponent(q)}${domainParam}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions ?? [])
      }
    } catch {}
    finally { setSuggestLoading(false) }
  }

  const applySuggestion = (s: typeof suggestions[0]) => {
    setSuggestOpen(false)
    prefillSubSubId.current = s.subSubcategoryId ?? ''
    prefillSubId.current = s.subcategoryId
    if (topId === s.domainId && isDomainPath) {
      // Domain already selected — setTopId would be a no-op and the useEffect wouldn't re-fire.
      // Cascade from midId which triggers the sub options load, then subSub loads from subId.
      handleMidChange(s.categoryId)
    } else {
      prefillMidId.current = s.categoryId
      handleTopChange(s.domainId)
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────────
  const payeeChanged =
    isAdmin &&
    payee !== null &&
    originalPayee !== null &&
    (payee.id !== originalPayee.id || payee.type !== originalPayee.type)

  // domain path: categoryId=midId (ExpenseCategory), subcategoryId=subId (ExpenseSubcategory)
  // global path: categoryId=topId (ExpenseCategory), subcategoryId=null
  const apiCategoryId = isDomainPath ? midId : topId
  const apiSubcategoryId = isDomainPath ? (subId || null) : null

  // ── Save ──────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!payment) return
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    if (payeeChanged && !payeeChangeReason.trim()) {
      toast.error('A reason is required when changing the payee')
      return
    }
    const isDownwardAdjustment = parsedAmount < payment.amount && payment.status === 'SUBMITTED'
    if (isDownwardAdjustment && !adjustmentReason.trim()) {
      toast.error('Please provide an adjustment reason when reducing the amount')
      return
    }

    setSaving(true)
    try {
      const body: any = {
        amount: parsedAmount,
        paymentDate,
        notes: notes || null,
        receiptNumber: receiptNumber || null,
        receiptServiceProvider: receiptServiceProvider || null,
        receiptReason: receiptReason || null,
      }
      if (isDownwardAdjustment) body.adjustmentReason = adjustmentReason.trim()

      if (apiCategoryId) body.categoryId = apiCategoryId
      if (apiSubcategoryId !== undefined) body.subcategoryId = apiSubcategoryId
      if (isDomainPath) body.subSubcategoryId = subSubId || null
      body.paymentChannel = paymentChannel
      body.priority = priority
      body.projectId = projectId || null
      body.lineItems = lineItems.length > 0 ? lineItems : null

      if (payeeChanged && payee) {
        body.payeeType = payee.type
        body.payeeUserId = payee.type === 'USER' ? payee.id : undefined
        body.payeeEmployeeId = payee.type === 'EMPLOYEE' ? payee.id : undefined
        body.payeePersonId = payee.type === 'PERSON' ? payee.id : undefined
        body.payeeBusinessId = payee.type === 'BUSINESS' ? payee.id : undefined
        body.payeeSupplierId = payee.type === 'SUPPLIER' ? payee.id : undefined
        body.payeeChangeReason = payeeChangeReason.trim()
      }

      const res = await fetch(`/api/expense-account/${accountId}/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to update payment')
        return
      }

      toast.push('Payment updated successfully')
      onSuccess()
      onClose()
    } catch {
      toast.error('Failed to update payment')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const withinWindow = payment ? (isAdmin || isWithin7Days(payment.createdAt)) : true
  const isHydrating = loadingMid || loadingSub || loadingSubSub
  const parsedAmountValue = parseFloat(amount)
  const isDownwardChange = payment !== null && !isNaN(parsedAmountValue) && parsedAmountValue < payment.amount
  const isBalanceAffecting = payment?.status === 'SUBMITTED'
  const adjustmentDifference = isDownwardChange && payment ? payment.amount - parsedAmountValue : 0

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-hidden">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-2xl min-w-0 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-primary">Edit Payment</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : !withinWindow ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <p className="text-sm">This payment is older than 7 days and can no longer be edited.</p>
              <p className="text-sm mt-1">Only admins can edit older payments.</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 text-sm border border-border rounded-md hover:bg-muted"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">

              {/* ── Payee — full width, always visible ───────────────────── */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-secondary">Payee</label>
                  {!isAdmin && <span className="text-xs text-gray-400 italic">Admin only</span>}
                </div>
                {isAdmin ? (
                  <>
                    <PayeeSelector
                      value={payee}
                      onChange={setPayee}
                      onCreateIndividual={(query) => { setPayeeSearchQuery(query || ''); setShowCreateIndividualModal(true) }}
                      onCreateSupplier={(query) => { setPayeeSearchQuery(query || ''); setShowCreateSupplierModal(true) }}
                      refreshTrigger={payeeRefreshKey}
                    />
                    {payeeChanged && (
                      <div className="mt-2">
                        <label className="text-xs font-medium text-secondary">
                          Reason for change <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={payeeChangeReason}
                          onChange={e => setPayeeChangeReason(e.target.value)}
                          placeholder="Explain why the payee is being changed..."
                          rows={2}
                          className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-border rounded-md text-sm text-gray-500">
                    {payee?.name || '—'}
                    {payee?.type && (
                      <span className="ml-2 text-xs text-gray-400">({payee.type})</span>
                    )}
                  </div>
                )}
              </div>

              {/* ── Amount ───────────────────────────────────────────────── */}
              <div>
                <label className="text-sm font-medium text-secondary">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    min="0.01"
                    step="0.01"
                    disabled={isHydrating}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                {isBalanceAffecting && (
                  <p className="text-xs text-gray-400 mt-1">
                    Amount can only be decreased. To increase, create a new payment.
                  </p>
                )}
              </div>

              {/* ── Payment Date ─────────────────────────────────────────── */}
              <div>
                <label className="text-sm font-medium text-secondary">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <DateInput
                  value={paymentDate}
                  onChange={(isoDate) => setPaymentDate(isoDate)}
                  label=""
                  compact={true}
                  disabled={isHydrating}
                  className="mt-1"
                />
              </div>

              {/* ── Adjustment impact + reason — full width, shown when reducing amount ── */}
              {isDownwardChange && isBalanceAffecting && (
                <div className="md:col-span-2 space-y-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                      Reducing by ${adjustmentDifference.toFixed(2)}
                    </p>
                    <ul className="text-blue-700 dark:text-blue-300 space-y-0.5 text-xs list-disc list-inside">
                      <li>Expense account will be credited ${adjustmentDifference.toFixed(2)}</li>
                      {businessId && (
                        <li>Business account will be credited ${adjustmentDifference.toFixed(2)}</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary">
                      Adjustment Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={adjustmentReason}
                      onChange={e => setAdjustmentReason(e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="Why is the amount being reduced? (e.g. Supplier corrected the invoice)"
                      className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-0.5 text-right">{adjustmentReason.length}/500</p>
                  </div>
                </div>
              )}

              {/* ── Business selector (top level) ──────────────────────────── */}
              <div className={!isDomainPath && !loadingMid ? 'md:col-span-2' : ''}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-secondary">Business</label>
                  <button
                    type="button"
                    onClick={() => setShowCreateCategoryModal(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  >
                    + Create New
                  </button>
                </div>
                <SearchableSelect
                  value={topId}
                  options={topOptions}
                  onChange={handleTopChange}
                  placeholder="Select category..."
                  disabled={isHydrating}
                />
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={suggestQuery}
                    onChange={e => setSuggestQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && suggestQuery.trim().length >= 2) handleSuggest() }}
                    placeholder="Describe expense to suggest category…"
                    className="flex-1 px-3 py-1.5 text-xs border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-amber-400 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={handleSuggest}
                    disabled={suggestLoading || suggestQuery.trim().length < 2}
                    className="px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-40 whitespace-nowrap"
                  >
                    {suggestLoading ? '⏳' : '💡 Suggest'}
                  </button>
                </div>
              </div>

              {/* ── Domain — right column when domain path ───────────────── */}
              {(isDomainPath || loadingMid) && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-secondary">Domain</label>
                    {topId && isDomainPath && (
                      <button
                        type="button"
                        onClick={() => setShowCreateMidModal(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        + Create New
                      </button>
                    )}
                  </div>
                  <SearchableSelect
                    value={midId}
                    options={midOptions}
                    onChange={handleMidChange}
                    placeholder="Select subcategory..."
                    loading={loadingMid}
                    disabled={!topId || (!loadingMid && midOptions.length === 0)}
                  />
                </div>
              )}

              {/* ── Category (level 3) — full width when domain path + midId ── */}
              {isDomainPath && midId && (
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-secondary">Category</label>
                    <button
                      type="button"
                      onClick={() => setShowCreateSubModal(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      + Create New
                    </button>
                  </div>
                  <SearchableSelect
                    value={subId}
                    options={subOptions}
                    onChange={handleSubChange}
                    placeholder="Select sub-category..."
                    loading={loadingSub}
                    disabled={!midId}
                  />
                </div>
              )}

              {/* ── Sub-Category (level 4) — full width when domain path + subId ── */}
              {isDomainPath && subId && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-secondary">Sub-Category</label>
                  <SearchableSelect
                    value={subSubId}
                    options={subSubOptions}
                    onChange={setSubSubId}
                    placeholder="Select item..."
                    loading={loadingSubSub}
                    disabled={!subId || loadingSubSub}
                  />
                </div>
              )}

              {/* ── Line Items ──────────────────────────────────────────── */}
              <div className="md:col-span-2">
                <LineItemsInput
                  domainId={isDomainPath ? topId : null}
                  value={lineItems}
                  onChange={setLineItems}
                  totalAmount={parseFloat(amount) || undefined}
                />
              </div>

              {/* ── Receipt Number ───────────────────────────────────────── */}
              <div>
                <label className="text-sm font-medium text-secondary">Receipt Number</label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={e => setReceiptNumber(e.target.value)}
                  placeholder="Optional"
                  disabled={isHydrating}
                  className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* ── Receipt Service Provider ─────────────────────────────── */}
              <div>
                <label className="text-sm font-medium text-secondary">Receipt Service Provider</label>
                <input
                  type="text"
                  value={receiptServiceProvider}
                  onChange={e => setReceiptServiceProvider(e.target.value)}
                  placeholder="e.g., M-Pesa, Bank, Cash"
                  disabled={isHydrating}
                  className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* ── Receipt Reason ───────────────────────────────────────── */}
              <div>
                <label className="text-sm font-medium text-secondary">Receipt Reason</label>
                <input
                  type="text"
                  value={receiptReason}
                  onChange={e => setReceiptReason(e.target.value)}
                  placeholder="Optional"
                  disabled={isHydrating}
                  className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* ── Notes — full width ───────────────────────────────────── */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-secondary">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional"
                  disabled={isHydrating}
                  className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* ── Payment Method ───────────────────────────────────────── */}
              <div>
                <label className="text-sm font-medium text-secondary">Payment Method</label>
                <div className="flex gap-2 mt-1">
                  {(['CASH', 'ECOCASH'] as const).map(ch => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setPaymentChannel(ch)}
                      disabled={isHydrating}
                      className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors disabled:opacity-50 ${
                        paymentChannel === ch
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

              {/* ── Priority ─────────────────────────────────────────────── */}
              <div>
                <label className="text-sm font-medium text-secondary">Priority</label>
                <div className="flex gap-2 mt-1">
                  {(['NORMAL', 'URGENT'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      disabled={isHydrating}
                      className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors disabled:opacity-50 ${
                        priority === p
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
              </div>

              {/* ── Link to Project — full width ──────────────────────────── */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-secondary">Link to Project (optional)</label>
                <SearchableSelect
                  value={projectId}
                  options={projects}
                  onChange={setProjectId}
                  placeholder="No project linked"
                  disabled={isHydrating}
                />
              </div>

              {/* ── Actions — full width ─────────────────────────────────── */}
              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-secondary bg-background border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || loading || loadingMid || loadingSub}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : loading ? 'Loading...' : isDownwardChange && isBalanceAffecting ? 'Save & Adjust Balance' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create category modal (top level) ─────────────────────────────────── */}
      <CreateCategoryModal
        isOpen={showCreateCategoryModal}
        onClose={() => setShowCreateCategoryModal(false)}
        onSuccess={handleCreateCategorySuccess}
        onError={msg => toast.error(msg)}
      />

      {/* ── Quick create: subcategory under domain ────────────────────────────── */}
      <QuickCreateModal
        isOpen={showCreateMidModal}
        title="Create Subcategory"
        placeholder="Subcategory name..."
        onClose={() => setShowCreateMidModal(false)}
        onSubmit={handleCreateSubcategory}
        loading={creatingItem}
      />

      {/* ── Quick create: sub-subcategory under category ──────────────────────── */}
      <QuickCreateModal
        isOpen={showCreateSubModal}
        title="Create Sub-category"
        placeholder="Sub-category name..."
        onClose={() => setShowCreateSubModal(false)}
        onSubmit={handleCreateSubSubcategory}
        loading={creatingItem}
      />

      {/* ── Create individual payee ───────────────────────────────────────────── */}
      <CreateIndividualPayeeModal
        isOpen={showCreateIndividualModal}
        onClose={() => setShowCreateIndividualModal(false)}
        onSuccess={(payload: any) => {
          if (payload.payee) {
            setPayee({ type: 'PERSON', id: payload.payee.id, name: payload.payee.fullName })
            setPayeeRefreshKey(k => k + 1)
          }
          setShowCreateIndividualModal(false)
        }}
        initialName={payeeSearchQuery}
      />

      {/* ── Classification suggestion overlay ────────────────────────────────── */}
      {suggestOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-base font-semibold text-primary">💡 Suggested Classifications</h3>
              <button
                type="button"
                onClick={() => setSuggestOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-secondary mb-3">
                Based on: <span className="font-medium text-primary">"{suggestQuery.trim()}"</span>
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
                          {s.subSubcategoryId
                            ? <>{s.domainEmoji} {s.domainName} › {s.categoryEmoji} {s.categoryName} › {s.subcategoryEmoji} {s.subcategoryName}</>
                            : <>{s.domainEmoji} {s.domainName} › {s.categoryEmoji} {s.categoryName}</>
                          }
                        </div>
                        <div className="text-sm font-medium text-primary">
                          {s.subSubcategoryId
                            ? <>{s.subSubcategoryEmoji} {s.subSubcategoryName}</>
                            : <>{s.subcategoryEmoji} {s.subcategoryName}</>
                          }
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

      {/* ── Create supplier ───────────────────────────────────────────────────── */}
      {showCreateSupplierModal && businessId && (
        <SupplierEditor
          supplier={undefined}
          businessId={businessId}
          onSave={(supplierId?: string) => {
            setShowCreateSupplierModal(false)
            setPayeeRefreshKey(k => k + 1)
            if (supplierId) {
              setPayee({ type: 'SUPPLIER', id: supplierId, name: 'New Supplier' })
            }
          }}
          onCancel={() => setShowCreateSupplierModal(false)}
          initialName={payeeSearchQuery}
        />
      )}
    </>
  )
}
