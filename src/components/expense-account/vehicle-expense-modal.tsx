'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Trash2, ShoppingCart, Car } from 'lucide-react'
import { useToastContext } from '@/components/ui/toast'

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_TYPES = [
  { value: 'FUEL', label: 'Fuel / Petrol' },
  { value: 'MAINTENANCE', label: 'Maintenance / Repairs' },
  { value: 'OIL', label: 'Oil Change' },
  { value: 'TIRE', label: 'Tires' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'TOLL', label: 'Tolls' },
  { value: 'PARKING', label: 'Parking' },
  { value: 'OTHER', label: 'Other' },
] as const

const FUEL_TYPES = [
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'GASOLINE', label: 'Petrol / Gasoline' },
  { value: 'ELECTRIC', label: 'Electric' },
  { value: 'HYBRID', label: 'Hybrid' },
] as const

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string
  year: number
  make: string
  model: string
  licensePlate: string
  currentMileage: number
  mileageUnit: string
  isActive: boolean
}

interface SelectItem {
  id: string
  name: string
  emoji?: string | null
}

interface ExpenseLine {
  id: string
  expenseType: string
  amount: string
  notes: string
  fuelQuantity: string
  fuelType: string
  mileageAtExpense: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  accountId: string
  accountBalance: number
  onSuccess: () => void
  canManageVehicles?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function makeExpenseLine(): ExpenseLine {
  return {
    id: `vline-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    expenseType: 'FUEL',
    amount: '',
    notes: '',
    fuelQuantity: '',
    fuelType: 'DIESEL',
    mileageAtExpense: '',
  }
}

function vehicleLabel(v: Vehicle): string {
  return `${v.year} ${v.make} ${v.model} [${v.licensePlate}]`
}

// ─── Searchable select (fixed positioning to escape overflow-y-auto) ──────────

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
      <div className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-400 bg-gray-50 dark:bg-gray-800 animate-pulse">
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
        className={`w-full text-sm border rounded-lg px-3 py-2 text-left flex items-center justify-between gap-1 transition-colors
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

// ─── Quick-add inline form ────────────────────────────────────────────────────
// Appears below a dropdown to let users create a new category/sub-category
// without opening a separate modal.

function QuickAddPanel({
  label,
  onSubmit,
  onClose,
}: {
  label: string
  onSubmit: (name: string, emoji: string) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSubmit(name.trim(), emoji.trim())
      setName('')
      setEmoji('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-1.5 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
      <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">Add {label}</p>
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <input
          type="text"
          value={emoji}
          onChange={e => setEmoji(e.target.value)}
          placeholder="😀"
          maxLength={2}
          className="w-12 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-center bg-white dark:bg-gray-900 dark:text-gray-100"
        />
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={`${label} name…`}
          required
          autoFocus
          className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-900 dark:text-gray-100"
        />
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
        >
          {saving ? '…' : 'Add'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </form>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VehicleExpenseModal({
  isOpen,
  onClose,
  accountId,
  accountBalance,
  onSuccess,
  canManageVehicles = false,
}: Props) {
  const toast = useToastContext()
  const router = useRouter()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(false)

  // Vehicle category hierarchy — auto-locked to the "Vehicle" expense category
  const [vehicleCategoryId, setVehicleCategoryId] = useState('')       // auto-found, not user-selected
  const [vehicleSubcats, setVehicleSubcats] = useState<SelectItem[]>([]) // level 2 under Vehicle
  const [vehicleSubSubcats, setVehicleSubSubcats] = useState<SelectItem[]>([]) // level 3
  const [loadingSubcats, setLoadingSubcats] = useState(false)
  const [loadingSubSubcats, setLoadingSubSubcats] = useState(false)
  const [selectedSubcatId, setSelectedSubcatId] = useState('')
  const [selectedSubSubcatId, setSelectedSubSubcatId] = useState('')
  const [showAddSubcat, setShowAddSubcat] = useState(false)
  const [showAddSubSubcat, setShowAddSubSubcat] = useState(false)

  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [expenseLines, setExpenseLines] = useState<ExpenseLine[]>([makeExpenseLine()])
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [existingQueueTotal, setExistingQueueTotal] = useState(0)

  // ── Fetch vehicles ─────────────────────────────────────────────────────────

  const fetchVehicles = useCallback(async () => {
    setLoadingVehicles(true)
    try {
      const res = await fetch('/api/vehicles?isActive=true&limit=100', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setVehicles(json.data ?? [])
      }
    } catch { /* non-fatal */ }
    finally { setLoadingVehicles(false) }
  }, [])

  // ── Find the "Vehicle" expense category and load its subcategories ──────────

  const fetchVehicleCategory = useCallback(async () => {
    if (vehicleCategoryId) return // already found
    try {
      const res = await fetch('/api/expense-categories/hierarchical', { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      const domains: any[] = json.domains ?? []

      // Find the expense_category named "Vehicle" across all domains
      let found: { id: string; name: string; emoji: string | null } | null = null
      for (const domain of domains) {
        for (const cat of (domain.expense_categories ?? [])) {
          if (cat.name?.toLowerCase() === 'vehicle' || cat.name?.toLowerCase().includes('vehicle')) {
            found = cat
            break
          }
        }
        if (found) break
      }

      if (!found) return
      setVehicleCategoryId(found.id)

      // Load subcategories of the Vehicle expense category
      setLoadingSubcats(true)
      const subcatRes = await fetch(`/api/expense-categories/${found.id}/subcategories`, { credentials: 'include' })
      if (subcatRes.ok) {
        const subcatJson = await subcatRes.json()
        const items: SelectItem[] = (subcatJson.subcategories ?? []).map((s: any) => ({
          id: s.id, name: s.name, emoji: s.emoji ?? null,
        }))
        setVehicleSubcats(items)
      }
    } catch { /* non-fatal */ }
    finally { setLoadingSubcats(false) }
  }, [vehicleCategoryId])

  // ── Load sub-subcategories when subcategory changes ────────────────────────

  const loadSubSubcats = useCallback(async (subcatId: string) => {
    setVehicleSubSubcats([])
    setSelectedSubSubcatId('')
    if (!subcatId) return
    setLoadingSubSubcats(true)
    try {
      const res = await fetch(`/api/expense-categories/subcategories/${subcatId}/sub-subcategories`, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        const items: SelectItem[] = (json.subSubcategories ?? []).map((s: any) => ({
          id: s.id, name: s.name, emoji: s.emoji ?? null,
        }))
        setVehicleSubSubcats(items)
      }
    } catch { /* non-fatal */ }
    finally { setLoadingSubSubcats(false) }
  }, [])

  const handleSubcatChange = (id: string) => {
    setSelectedSubcatId(id)
    setShowAddSubSubcat(false)
    loadSubSubcats(id)
  }

  // ── Quick-add handlers ────────────────────────────────────────────────────

  const handleAddSubcat = async (name: string, emoji: string) => {
    if (!vehicleCategoryId) return
    const res = await fetch('/api/expense-categories/subcategories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ categoryId: vehicleCategoryId, name, emoji: emoji || null }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.push(err.message || err.error || 'Failed to create category')
      return
    }
    const json = await res.json()
    const created = json.subcategory
    const newItem: SelectItem = { id: created.id, name: created.name, emoji: created.emoji ?? null }
    setVehicleSubcats(prev => [...prev, newItem])
    setSelectedSubcatId(created.id)
    loadSubSubcats(created.id)
    setShowAddSubcat(false)
  }

  const handleAddSubSubcat = async (name: string, emoji: string) => {
    if (!selectedSubcatId) return
    const res = await fetch('/api/expense-categories/sub-subcategories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ subcategoryId: selectedSubcatId, name, emoji: emoji || null }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.push(err.message || err.error || 'Failed to create sub-category')
      return
    }
    const json = await res.json()
    const created = json.subSubcategory
    const newItem: SelectItem = { id: created.id, name: created.name, emoji: created.emoji ?? null }
    setVehicleSubSubcats(prev => [...prev, newItem])
    setSelectedSubSubcatId(created.id)
    setShowAddSubSubcat(false)
  }

  useEffect(() => {
    if (isOpen) {
      setSelectedVehicleId('')
      setSelectedSubcatId('')
      setSelectedSubSubcatId('')
      setVehicleSubSubcats([])
      setExpenseLines([makeExpenseLine()])
      setTouched(false)
      setSubmitting(false)
      // Calculate how much is already committed in the queue so we know real available balance
      try {
        const saved = sessionStorage.getItem(`expense-batch-${accountId}`)
        if (saved) {
          const existing = JSON.parse(saved)
          const qTotal = existing.reduce((s: number, item: any) => s + (Number(item.amount) || 0), 0)
          setExistingQueueTotal(qTotal)
        } else {
          setExistingQueueTotal(0)
        }
      } catch {
        setExistingQueueTotal(0)
      }
      fetchVehicles()
      fetchVehicleCategory()
    }
  }, [isOpen, accountId, fetchVehicles, fetchVehicleCategory])

  // ── Line helpers ──────────────────────────────────────────────────────────

  const updateLine = (id: string, patch: Partial<ExpenseLine>) =>
    setExpenseLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))

  const removeLine = (id: string) =>
    setExpenseLines(prev => prev.filter(l => l.id !== id))

  const addLine = () =>
    setExpenseLines(prev => [...prev, makeExpenseLine()])

  // ── Derived values ────────────────────────────────────────────────────────

  const total = expenseLines.reduce((sum, l) => {
    const n = parseFloat(l.amount)
    return sum + (isNaN(n) ? 0 : n)
  }, 0)

  const availableBalance = accountBalance - existingQueueTotal
  const balanceExceeded = total > availableBalance

  const lineError = (l: ExpenseLine): string | null => {
    if (!l.expenseType) return 'Expense type required'
    if (!l.amount || isNaN(parseFloat(l.amount)) || parseFloat(l.amount) <= 0)
      return 'Valid amount required'
    return null
  }

  const lineErrors = expenseLines.map(lineError)
  const hasLineErrors = lineErrors.some(e => e !== null)

  // vehicleCategoryId is auto-found — subcategory is optional (falls back to vehicleCategoryId)
  const canSubmit =
    !!selectedVehicleId &&
    !!vehicleCategoryId &&
    expenseLines.length > 0 &&
    !hasLineErrors &&
    !balanceExceeded &&
    !submitting

  // ── Add to queue ──────────────────────────────────────────────────────────

  const handleAddToQueue = () => {
    setTouched(true)
    if (!canSubmit) return

    setSubmitting(true)
    const today = getTodayString()

    // Determine category names for display
    const subcat = vehicleSubcats.find(s => s.id === selectedSubcatId)
    const subSubcat = vehicleSubSubcats.find(s => s.id === selectedSubSubcatId)

    const key = `expense-batch-${accountId}`
    let existing: any[] = []
    try {
      const saved = sessionStorage.getItem(key)
      if (saved) existing = JSON.parse(saved)
    } catch { existing = [] }

    const newItems = expenseLines.map(l => ({
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      payeeType: 'NONE',
      payeeName: '',
      payeeId: '',
      categoryId: '',
      categoryName: '',
      categoryEmoji: '🚗',
      // If subcategory selected: use it; else fall back to Vehicle category
      subcategoryId: selectedSubcatId || vehicleCategoryId,
      subcategoryName: subcat?.name ?? 'Vehicle',
      subSubcategoryId: selectedSubSubcatId || undefined,
      subSubcategoryName: subSubcat?.name || undefined,
      amount: parseFloat(l.amount),
      paymentDate: today,
      notes: l.notes.trim() || undefined,
      paymentType: 'REGULAR',
      isFullPayment: true,
      vehicleExpense: {
        vehicleId: selectedVehicleId,
        expenseType: l.expenseType,
        ...(l.expenseType === 'FUEL' && l.fuelQuantity ? { fuelQuantity: parseFloat(l.fuelQuantity) } : {}),
        ...(l.expenseType === 'FUEL' && l.fuelType ? { fuelType: l.fuelType } : {}),
        ...(l.mileageAtExpense ? { mileageAtExpense: parseInt(l.mileageAtExpense, 10) } : {}),
      },
    }))

    sessionStorage.setItem(key, JSON.stringify([...existing, ...newItems]))
    setSubmitting(false)
    toast.push(`${newItems.length} vehicle expense${newItems.length !== 1 ? 's' : ''} added to queue`)
    onSuccess()
    onClose()
  }

  // ── Vehicle items for SearchableSelect ────────────────────────────────────

  const vehicleItems: SelectItem[] = vehicles.map(v => ({ id: v.id, name: vehicleLabel(v) }))

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Car size={20} className="text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Vehicle Expenses</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Add to queue — processed when you submit the payment batch.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── No-vehicle empty state ─────────────────────────────────────── */}
          {!loadingVehicles && vehicles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Car size={32} className="text-gray-400" />
              </div>

              {canManageVehicles ? (
                <>
                  <div>
                    <p className="text-base font-medium text-gray-800 dark:text-gray-200">
                      No vehicles registered yet
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Register a vehicle in Fleet Management before logging vehicle expenses.
                    </p>
                  </div>
                  <button
                    onClick={() => { onClose(); router.push('/vehicles') }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Car size={16} />
                    Go to Fleet Management
                  </button>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    After registering a vehicle, come back to log expenses.
                  </p>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-base font-medium text-gray-800 dark:text-gray-200">No vehicles available</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                      No vehicles have been registered. Contact your manager or administrator to set up vehicles.
                    </p>
                  </div>
                  <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    Close
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Main form ─────────────────────────────────────────────────── */}
          {(loadingVehicles || vehicles.length > 0) && (
          <>
            {/* Vehicle selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vehicle <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                items={vehicleItems}
                value={selectedVehicleId}
                onChange={setSelectedVehicleId}
                placeholder="Select vehicle…"
                loading={loadingVehicles}
                error={touched && !selectedVehicleId}
              />
              {touched && !selectedVehicleId && (
                <p className="text-xs text-red-500 mt-1">Vehicle required</p>
              )}
            </div>

            {/* Category cascade — locked to Vehicle, show subcategory + sub-subcategory */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category <span className="text-xs font-normal text-gray-400">(optional)</span>
                  </label>
                  {vehicleCategoryId && (
                    <button
                      type="button"
                      onClick={() => { setShowAddSubcat(v => !v); setShowAddSubSubcat(false) }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
                    >
                      {showAddSubcat ? '✕ Cancel' : '+ New'}
                    </button>
                  )}
                </div>
                <SearchableSelect
                  items={vehicleSubcats}
                  value={selectedSubcatId}
                  onChange={handleSubcatChange}
                  placeholder="Vehicle (all expenses)…"
                  loading={loadingSubcats}
                />
                {showAddSubcat && (
                  <QuickAddPanel
                    label="Category"
                    onSubmit={handleAddSubcat}
                    onClose={() => setShowAddSubcat(false)}
                  />
                )}
              </div>

              {selectedSubcatId && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sub-category <span className="text-xs font-normal text-gray-400">(optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => { setShowAddSubSubcat(v => !v); setShowAddSubcat(false) }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
                    >
                      {showAddSubSubcat ? '✕ Cancel' : '+ New'}
                    </button>
                  </div>
                  <SearchableSelect
                    items={vehicleSubSubcats}
                    value={selectedSubSubcatId}
                    onChange={setSelectedSubSubcatId}
                    placeholder={loadingSubSubcats ? 'Loading…' : 'Select sub-category…'}
                    loading={loadingSubSubcats}
                  />
                  {showAddSubSubcat && (
                    <QuickAddPanel
                      label="Sub-category"
                      onSubmit={handleAddSubSubcat}
                      onClose={() => setShowAddSubSubcat(false)}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Expense lines */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Expenses</h3>

              {expenseLines.map((line, idx) => {
                const err = touched ? lineError(line) : null
                const isFuel = line.expenseType === 'FUEL'

                return (
                  <div key={line.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Expense {idx + 1}
                      </span>
                      {expenseLines.length > 1 && (
                        <button
                          onClick={() => removeLine(line.id)}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Type + Amount */}
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Type</label>
                        <select
                          value={line.expenseType}
                          onChange={e => updateLine(line.id, {
                            expenseType: e.target.value,
                            ...(e.target.value !== 'FUEL' ? { fuelQuantity: '', fuelType: 'DIESEL' } : {}),
                          })}
                          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 dark:text-gray-100"
                        >
                          {EXPENSE_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-36">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="0.00"
                          value={line.amount}
                          onChange={e => updateLine(line.id, { amount: e.target.value })}
                          className={`w-full text-sm border rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 dark:text-gray-100 ${
                            touched && (!line.amount || parseFloat(line.amount) <= 0)
                              ? 'border-red-400'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Fuel-specific fields */}
                    {isFuel && (
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Fuel Quantity (optional)
                          </label>
                          <input
                            type="number" min="0" step="0.1" placeholder="Litres / Gallons"
                            value={line.fuelQuantity}
                            onChange={e => updateLine(line.id, { fuelQuantity: e.target.value })}
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 dark:text-gray-100"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Fuel Type</label>
                          <select
                            value={line.fuelType}
                            onChange={e => updateLine(line.id, { fuelType: e.target.value })}
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 dark:text-gray-100"
                          >
                            {FUEL_TYPES.map(f => (
                              <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Mileage + Notes */}
                    <div className="flex gap-3">
                      <div className="w-40">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Mileage at Expense (optional)
                        </label>
                        <input
                          type="number" min="0" step="1" placeholder="e.g. 45200"
                          value={line.mileageAtExpense}
                          onChange={e => updateLine(line.id, { mileageAtExpense: e.target.value })}
                          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Notes (optional)</label>
                        <input
                          type="text" placeholder="e.g. Morning fill-up"
                          value={line.notes}
                          onChange={e => updateLine(line.id, { notes: e.target.value })}
                          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>

                    {err && <p className="text-xs text-red-500">{err}</p>}
                  </div>
                )
              })}

              <button
                onClick={addLine}
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 py-1"
              >
                <Plus size={16} />
                Add Expense
              </button>
            </div>
          </>
          )}
        </div>

        {/* Footer — only shown when there are vehicles */}
        {(loadingVehicles || vehicles.length > 0) && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-1 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              Available: <span className="font-medium">${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </span>
            <span className={`font-semibold ${balanceExceeded ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
              This batch: ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {existingQueueTotal > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
              ${existingQueueTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} already queued from account balance of ${accountBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          )}

          {balanceExceeded && (
            <p className="text-xs text-red-500 mb-2">
              Total exceeds available balance of ${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}.
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
        )}

      </div>
    </div>
  )
}
