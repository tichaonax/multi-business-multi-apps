'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Plus, Trash2, RotateCcw, ShoppingCart } from 'lucide-react'
import { useToastContext } from '@/components/ui/toast'
import { PayeeSelector } from './payee-selector'
import { CreateIndividualPayeeModal } from './create-individual-payee-modal'
import { SupplierEditor } from '@/components/suppliers/supplier-editor'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentTemplate {
  templateKey: string
  categoryId: string
  categoryName: string | null
  categoryEmoji: string | null
  subcategoryId: string | null
  subcategoryName: string | null
  subSubcategoryId: string | null
  lastUsed: string
}

interface SelectItem {
  id: string
  name: string
  emoji?: string | null
}

interface Payee {
  type: string
  id: string
  name: string
}

interface LineItem {
  id: string
  checked: boolean
  // Pre-filled from template (null = manual line)
  prefill: {
    categoryId: string       // ExpenseCategories.id
    categoryName: string
    categoryEmoji: string | null
    subcategoryId: string | null  // ExpenseSubcategories.id
    subcategoryName: string | null
    subSubcategoryId: string | null
  } | null
  // Manual 3-level selection
  // level1 = domain (e.g. "Restaurant") — not sent to API, used to load level2
  // level2 = expense category → goes to batch.subcategoryId → API's categoryId
  // level3 = expense subcategory → goes to batch.subSubcategoryId → API's subcategoryId
  level1Id: string
  level2Id: string
  level3Id: string
  level2Items: SelectItem[]
  level3Items: SelectItem[]
  loadingLevel2: boolean
  loadingLevel3: boolean
  // User-entered
  payee: Payee | null
  amount: string
  paymentDate: string
  touched: boolean
}

interface Props {
  isOpen: boolean
  onClose: () => void
  accountId: string
  accountBalance: number
  onSuccess: () => void
  defaultCategoryBusinessType?: string
  businessId?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultDomainName(businessType: string): string {
  const map: Record<string, string> = {
    restaurant: 'Restaurant',
    grocery: 'Groceries',
    clothing: 'Clothing',
    hardware: 'Hardware',
    construction: 'Construction',
    vehicles: 'Vehicle',
  }
  return map[businessType] || ''
}

function getTodayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function makeLine(prefill: LineItem['prefill'] = null, level1Id = ''): LineItem {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    checked: false,
    prefill,
    level1Id,
    level2Id: '',
    level3Id: '',
    level2Items: [],
    level3Items: [],
    loadingLevel2: false,
    loadingLevel3: false,
    payee: null,
    amount: '',
    paymentDate: getTodayString(),
    touched: false,
  }
}

// ─── Local searchable select ──────────────────────────────────────────────────
// Uses fixed positioning so it is never clipped by the modal's overflow-y-auto body.

function SearchableSelect({
  items,
  value,
  onChange,
  placeholder = 'Select…',
  error = false,
  disabled = false,
  loading = false,
}: {
  items: SelectItem[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  error?: boolean
  disabled?: boolean
  loading?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const selected = items.find(i => i.id === value)
  const filtered = search
    ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : items

  const open = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
    setIsOpen(true)
  }

  const close = () => { setIsOpen(false); setSearch('') }

  if (loading) {
    return (
      <div className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-gray-400 bg-gray-50 dark:bg-gray-800 animate-pulse">
        Loading…
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => isOpen ? close() : open()}
        className={`w-full text-sm border rounded-md px-2 py-1.5 text-left flex items-center justify-between gap-1 transition-colors
          ${error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}
          ${disabled
            ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed text-gray-400'
            : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500'
          }
        `}
      >
        <span className={selected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
          {selected
            ? [selected.emoji, selected.name].filter(Boolean).join(' ')
            : placeholder
          }
        </span>
        <svg className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown — fixed so it clears overflow-y-auto clip */}
      {isOpen && dropdownPos && (
        <div
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden"
        >
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              autoFocus
              className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-center text-gray-500 dark:text-gray-400">No results</div>
            ) : (
              filtered.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { onChange(item.id); close() }}
                  className={`w-full text-sm text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                    ${value === item.id ? 'bg-blue-50 dark:bg-blue-900/20 font-medium text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}
                  `}
                >
                  {[item.emoji, item.name].filter(Boolean).join(' ')}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={close} />
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SmartQuickPaymentModal({
  isOpen,
  onClose,
  accountId,
  accountBalance,
  onSuccess,
  defaultCategoryBusinessType,
  businessId,
}: Props) {
  const toast = useToastContext()

  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [lines, setLines] = useState<LineItem[]>([])
  const [allCategories, setAllCategories] = useState<SelectItem[]>([])
  const [defaultLevel1Id, setDefaultLevel1Id] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createPayeeForLineId, setCreatePayeeForLineId] = useState<string | null>(null)
  const [createSupplierForLineId, setCreateSupplierForLineId] = useState<string | null>(null)
  const [payeeRefreshTrigger, setPayeeRefreshTrigger] = useState(0)

  // ── Fetch flat category list (domain + global categories) ─────────────────

  const fetchCategories = useCallback(async () => {
    if (allCategories.length > 0) return
    try {
      const res = await fetch('/api/expense-categories/hierarchical', { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      // API returns { domains: [{ expense_categories: [...] }] }
      const flat: SelectItem[] = []
      const domains: any[] = json.domains ?? []
      for (const domain of domains) {
        for (const c of (domain.expense_categories ?? [])) {
          flat.push({ id: c.id, name: c.name, emoji: c.emoji ?? null })
        }
      }
      setAllCategories(flat)
      // Auto-select matching domain for business type
      if (defaultCategoryBusinessType) {
        const domainName = getDefaultDomainName(defaultCategoryBusinessType)
        const match = flat.find(c => c.name === domainName)
        if (match) setDefaultLevel1Id(match.id)
      }
    } catch { /* non-fatal */ }
  }, [allCategories.length, defaultCategoryBusinessType])

  // ── Fetch templates ───────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/payment-templates`, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        const templates: PaymentTemplate[] = json.data ?? []
        setLines(
          templates.map(t =>
            makeLine({
              categoryId: t.categoryId,
              categoryName: t.categoryName ?? '',
              categoryEmoji: t.categoryEmoji,
              subcategoryId: t.subcategoryId,
              subcategoryName: t.subcategoryName,
              subSubcategoryId: t.subSubcategoryId,
            })
          )
        )
      }
    } catch { /* non-fatal */ }
    finally { setLoadingTemplates(false) }
  }, [accountId])

  useEffect(() => {
    if (isOpen) {
      setLines([])
      setSubmitting(false)
      fetchTemplates()
      fetchCategories()
    }
  }, [isOpen, fetchTemplates, fetchCategories])

  // ── Line helpers ──────────────────────────────────────────────────────────

  const updateLine = (id: string, patch: Partial<LineItem>) =>
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))

  const removeLine = (id: string) =>
    setLines(prev => prev.filter(l => l.id !== id))

  // Load expense categories for a given domain
  const loadLevel2 = async (lineId: string, level1Id: string) => {
    updateLine(lineId, { loadingLevel2: true, level2Id: '', level2Items: [], level3Id: '', level3Items: [] })
    try {
      const res = await fetch(`/api/expense-categories/${level1Id}/subcategories`, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        const items: SelectItem[] = (json.subcategories ?? []).map((s: any) => ({
          id: s.id, name: s.name, emoji: s.emoji ?? null,
        }))
        updateLine(lineId, { level2Items: items, loadingLevel2: false })
      } else {
        updateLine(lineId, { loadingLevel2: false })
      }
    } catch {
      updateLine(lineId, { loadingLevel2: false })
    }
  }

  // Load expense subcategories for a given expense category
  const loadLevel3 = async (lineId: string, level2Id: string) => {
    updateLine(lineId, { loadingLevel3: true, level3Id: '', level3Items: [] })
    try {
      const res = await fetch(`/api/expense-categories/subcategories/${level2Id}/sub-subcategories`, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        const items: SelectItem[] = (json.subSubcategories ?? []).map((s: any) => ({
          id: s.id, name: s.name, emoji: s.emoji ?? null,
        }))
        updateLine(lineId, { level3Items: items, loadingLevel3: false })
      } else {
        updateLine(lineId, { loadingLevel3: false })
      }
    } catch {
      updateLine(lineId, { loadingLevel3: false })
    }
  }

  const handleLevel1Change = (lineId: string, id: string) => {
    updateLine(lineId, { level1Id: id, level2Id: '', level2Items: [], level3Id: '', level3Items: [] })
    if (id) loadLevel2(lineId, id)
  }

  const handleLevel2Change = (lineId: string, id: string) => {
    updateLine(lineId, { level2Id: id, level3Id: '', level3Items: [] })
    if (id) loadLevel3(lineId, id)
  }

  const resetLine = (id: string) => {
    // Clear prefill, set default domain, reload level2
    updateLine(id, {
      prefill: null,
      level1Id: defaultLevel1Id,
      level2Id: '', level2Items: [],
      level3Id: '', level3Items: [],
      payee: null, amount: '', paymentDate: getTodayString(), touched: false,
    })
    if (defaultLevel1Id) loadLevel2(id, defaultLevel1Id)
  }

  const addBlankLine = () => {
    const newLine = makeLine(null, defaultLevel1Id)
    setLines(prev => [...prev, newLine])
    // Pre-load level2 for the default domain — updater functions in React 18
    // batching guarantee newLine is already in prev by the time loadLevel2's
    // updateLine runs its own setLines updater.
    if (defaultLevel1Id) loadLevel2(newLine.id, defaultLevel1Id)
  }

  // ── Payee creation ────────────────────────────────────────────────────────

  const handleCreateIndividualSuccess = (payload: any) => {
    if (payload.payee && createPayeeForLineId) {
      updateLine(createPayeeForLineId, {
        payee: { type: 'PERSON', id: payload.payee.id, name: payload.payee.fullName },
      })
      setPayeeRefreshTrigger(prev => prev + 1)
    }
    setCreatePayeeForLineId(null)
  }

  const handleCreateSupplierSuccess = async (supplierId?: string) => {
    const lineId = createSupplierForLineId
    setCreateSupplierForLineId(null)
    if (!supplierId || !lineId) {
      setPayeeRefreshTrigger(prev => prev + 1)
      return
    }
    // Fetch supplier name using the single-supplier endpoint to avoid pagination issues
    let supplierName = 'New Supplier'
    try {
      const res = await fetch(`/api/business/${businessId}/suppliers/${supplierId}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        // GET /api/business/[id]/suppliers/[id] returns { supplier: { id, name, ... } }
        if (data.supplier?.name) supplierName = data.supplier.name
      }
    } catch { /* use fallback name */ }
    updateLine(lineId, {
      payee: { type: 'SUPPLIER', id: supplierId, name: supplierName },
    })
    setPayeeRefreshTrigger(prev => prev + 1)
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const checkedLines = lines.filter(l => l.checked)

  const checkedTotal = checkedLines.reduce((sum, l) => {
    const n = parseFloat(l.amount)
    return sum + (isNaN(n) ? 0 : n)
  }, 0)

  const balanceExceeded = checkedTotal > accountBalance

  const lineError = (l: LineItem): string | null => {
    if (!l.checked) return null
    // For manual lines: need at least level1 (domain/category)
    // effective expense category = level2 if set, else level1 (global category)
    const effectiveId = l.prefill ? l.prefill.categoryId : (l.level2Id || l.level1Id)
    if (!effectiveId) return 'Category required'
    if (!l.payee) return 'Payee required'
    if (!l.amount || isNaN(parseFloat(l.amount)) || parseFloat(l.amount) <= 0)
      return 'Valid amount required'
    return null
  }

  const hasErrors = checkedLines.some(l => lineError(l) !== null)
  const canSubmit = checkedLines.length > 0 && !hasErrors && !balanceExceeded && !submitting

  // ── Add to queue ──────────────────────────────────────────────────────────

  const handleAddToQueue = () => {
    setLines(prev => prev.map(l => ({ ...l, touched: true })))
    if (!canSubmit) return

    setSubmitting(true)
    const key = `expense-batch-${accountId}`
    let existing: any[] = []
    try {
      const saved = sessionStorage.getItem(key)
      if (saved) existing = JSON.parse(saved)
    } catch { existing = [] }

    const newItems = checkedLines.map(l => {
      const uniqueId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`

      if (l.prefill) {
        // Pre-filled: template.categoryId = ExpenseCategories.id → batch.subcategoryId
        return {
          id: uniqueId,
          payeeType: l.payee!.type,
          payeeName: l.payee!.name,
          payeeId: l.payee!.id,
          categoryId: '',
          categoryName: '',
          categoryEmoji: l.prefill.categoryEmoji ?? '',
          subcategoryId: l.prefill.categoryId,           // ExpenseCategories.id
          subcategoryName: l.prefill.categoryName,
          subSubcategoryId: l.prefill.subcategoryId ?? undefined,
          subSubcategoryName: l.prefill.subcategoryName ?? undefined,
          amount: parseFloat(l.amount),
          paymentDate: l.paymentDate || getTodayString(),
          paymentType: 'REGULAR',
          isFullPayment: true,
        }
      } else {
        // Manual:
        // - level2Id = expense category (if domain was selected) → batch.subcategoryId
        // - level1Id as fallback (global category, no domain) → batch.subcategoryId
        // - level3Id = expense subcategory → batch.subSubcategoryId
        return {
          id: uniqueId,
          payeeType: l.payee!.type,
          payeeName: l.payee!.name,
          payeeId: l.payee!.id,
          categoryId: '',
          categoryName: '',
          categoryEmoji: '',
          subcategoryId: l.level2Id || l.level1Id || undefined,
          subcategoryName: undefined,
          subSubcategoryId: l.level3Id || undefined,
          subSubcategoryName: undefined,
          amount: parseFloat(l.amount),
          paymentDate: l.paymentDate || getTodayString(),
          paymentType: 'REGULAR',
          isFullPayment: true,
        }
      }
    })

    sessionStorage.setItem(key, JSON.stringify([...existing, ...newItems]))
    setSubmitting(false)
    toast.push(`${newItems.length} item${newItems.length !== 1 ? 's' : ''} added to queue`)
    onSuccess()
    onClose()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Daily Expenses</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Select items to pay, enter amounts, then add to queue.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">

          {loadingTemplates && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {!loadingTemplates && lines.length === 0 && (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              <p className="text-sm">No recent payments found.</p>
              <p className="text-sm">Add a line below to get started.</p>
            </div>
          )}

          {!loadingTemplates && lines.map(line => {
            const err = line.touched ? lineError(line) : null
            const effectiveId = line.prefill ? line.prefill.categoryId : (line.level2Id || line.level1Id)

            return (
              <div
                key={line.id}
                className={`rounded-lg border p-3 transition-colors ${
                  line.checked
                    ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex items-start gap-3">

                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={line.checked}
                    onChange={e => updateLine(line.id, { checked: e.target.checked, touched: false })}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer flex-shrink-0"
                  />

                  {/* Main fields */}
                  <div className="flex-1 min-w-0 space-y-2">

                    {/* Category section */}
                    {line.prefill ? (
                      /* Pre-filled badges (from recent history) */
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-sm font-medium text-gray-700 dark:text-gray-300">
                          {line.prefill.categoryEmoji && <span>{line.prefill.categoryEmoji}</span>}
                          {line.prefill.categoryName}
                        </span>
                        {line.prefill.subcategoryName && (
                          <>
                            <span className="text-gray-400 text-xs">›</span>
                            <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-600 dark:text-gray-400">
                              {line.prefill.subcategoryName}
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      /* Manual 3-level cascading searchable selectors */
                      <div className="space-y-1.5">
                        {/* Level 1: domain / top-level category */}
                        <SearchableSelect
                          items={allCategories}
                          value={line.level1Id}
                          onChange={id => handleLevel1Change(line.id, id)}
                          placeholder="Category…"
                          error={line.touched && !effectiveId}
                        />
                        {/* Level 2: expense category within domain */}
                        {line.level1Id && (
                          <SearchableSelect
                            items={line.level2Items}
                            value={line.level2Id}
                            onChange={id => handleLevel2Change(line.id, id)}
                            placeholder="Subcategory (optional)…"
                            loading={line.loadingLevel2}
                          />
                        )}
                        {/* Level 3: expense sub-subcategory — only shown when level2 has children */}
                        {line.level2Id && (line.loadingLevel3 || line.level3Items.length > 0) && (
                          <SearchableSelect
                            items={line.level3Items}
                            value={line.level3Id}
                            onChange={id => updateLine(line.id, { level3Id: id })}
                            placeholder="Sub-subcategory (optional)…"
                            loading={line.loadingLevel3}
                          />
                        )}
                      </div>
                    )}

                    {/* Payee + Amount */}
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 min-w-0">
                        <PayeeSelector
                          value={line.payee}
                          onChange={payee => updateLine(line.id, { payee })}
                          onCreateIndividual={() => setCreatePayeeForLineId(line.id)}
                          onCreateSupplier={businessId ? () => setCreateSupplierForLineId(line.id) : undefined}
                          error={line.touched && line.checked && !line.payee ? 'Payee required' : undefined}
                          refreshTrigger={payeeRefreshTrigger}
                        />
                      </div>
                      <div className="w-32 flex-shrink-0">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="Amount"
                          value={line.amount}
                          onChange={e => updateLine(line.id, { amount: e.target.value })}
                          className={`w-full text-sm border rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 dark:text-gray-100 ${
                            line.touched && line.checked && (!line.amount || parseFloat(line.amount) <= 0)
                              ? 'border-red-400'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Payment date per line */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">Date:</label>
                      <input
                        type="date"
                        value={line.paymentDate}
                        max={getTodayString()}
                        onChange={e => updateLine(line.id, { paymentDate: e.target.value || getTodayString() })}
                        className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {err && <p className="text-xs text-red-500">{err}</p>}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-1 flex-shrink-0 mt-0.5">
                    {line.prefill && (
                      <button
                        onClick={() => resetLine(line.id)}
                        title="Reset to manual entry"
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => removeLine(line.id)}
                      title="Remove line"
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Add line */}
          {!loadingTemplates && (
            <button
              onClick={addBlankLine}
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-1"
            >
              <Plus size={16} />
              Add Line
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {checkedLines.length} item{checkedLines.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-4">
              <span className="text-gray-500 dark:text-gray-400">
                Balance: <span className="font-medium">${accountBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </span>
              <span className={`font-semibold ${balanceExceeded ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
                Total: ${checkedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {balanceExceeded && (
            <p className="text-xs text-red-500 mb-2">
              Total exceeds available balance of ${accountBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}.
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleAddToQueue}
              disabled={!canSubmit}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={16} />
              Add to Queue
            </button>
          </div>
        </div>

      </div>

      {/* Create individual payee */}
      <CreateIndividualPayeeModal
        isOpen={createPayeeForLineId !== null}
        onClose={() => setCreatePayeeForLineId(null)}
        onSuccess={handleCreateIndividualSuccess}
      />

      {/* Create supplier */}
      {createSupplierForLineId !== null && businessId && (
        <SupplierEditor
          businessId={businessId}
          onSave={handleCreateSupplierSuccess}
          onCancel={() => setCreateSupplierForLineId(null)}
        />
      )}
    </div>
  )
}
