'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Trash2, ShoppingCart, Car } from 'lucide-react'
import { useToastContext } from '@/components/ui/toast'

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_TYPES = [
  { value: 'FUEL', label: 'Fuel / Petrol' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'REPAIR', label: 'Repairs' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'REGISTRATION', label: 'Registration' },
  { value: 'TOLLS', label: 'Tolls' },
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

interface FlatCategory {
  id: string
  name: string
  emoji: string
}

interface ExpenseLine {
  id: string
  expenseType: string
  amount: string
  notes: string
  // Fuel-specific (only shown when expenseType = FUEL)
  fuelQuantity: string
  fuelType: string
  // Optional mileage
  mileageAtExpense: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  accountId: string
  accountBalance: number
  onSuccess: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayString(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function VehicleExpenseModal({
  isOpen,
  onClose,
  accountId,
  accountBalance,
  onSuccess,
}: Props) {
  const toast = useToastContext()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(false)

  const [categories, setCategories] = useState<FlatCategory[]>([])

  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [expenseLines, setExpenseLines] = useState<ExpenseLine[]>([makeExpenseLine()])
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // ── Fetch data on open ────────────────────────────────────────────────────

  const fetchVehicles = useCallback(async () => {
    setLoadingVehicles(true)
    try {
      const res = await fetch('/api/vehicles?isActive=true&limit=100', {
        credentials: 'include',
      })
      if (res.ok) {
        const json = await res.json()
        setVehicles(json.data ?? [])
      }
    } catch {
      // non-fatal
    } finally {
      setLoadingVehicles(false)
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    if (categories.length > 0) return
    try {
      const res = await fetch('/api/expense-categories/hierarchical', {
        credentials: 'include',
      })
      if (res.ok) {
        const json = await res.json()
        const flat: FlatCategory[] = []
        const domains: any[] = Array.isArray(json) ? json : json.data ?? []
        for (const domain of domains) {
          const cats: any[] = domain.categories ?? domain.expenseCategories ?? []
          for (const c of cats) {
            flat.push({ id: c.id, name: c.name, emoji: c.emoji ?? '💰' })
          }
        }
        setCategories(flat)
      }
    } catch {
      // non-fatal
    }
  }, [categories.length])

  useEffect(() => {
    if (isOpen) {
      setSelectedVehicleId('')
      setSelectedCategoryId('')
      setExpenseLines([makeExpenseLine()])
      setTouched(false)
      setSubmitting(false)
      fetchVehicles()
      fetchCategories()
    }
  }, [isOpen, fetchVehicles, fetchCategories])

  // ── Line helpers ──────────────────────────────────────────────────────────

  const updateLine = (id: string, patch: Partial<ExpenseLine>) => {
    setExpenseLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    )
  }

  const removeLine = (id: string) => {
    setExpenseLines((prev) => prev.filter((l) => l.id !== id))
  }

  const addLine = () => {
    setExpenseLines((prev) => [...prev, makeExpenseLine()])
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const total = expenseLines.reduce((sum, l) => {
    const n = parseFloat(l.amount)
    return sum + (isNaN(n) ? 0 : n)
  }, 0)

  const balanceExceeded = total > accountBalance

  const lineError = (l: ExpenseLine): string | null => {
    if (!l.expenseType) return 'Expense type required'
    if (!l.amount || isNaN(parseFloat(l.amount)) || parseFloat(l.amount) <= 0)
      return 'Valid amount required'
    return null
  }

  const lineErrors = expenseLines.map(lineError)
  const hasLineErrors = lineErrors.some((e) => e !== null)

  const canSubmit =
    !!selectedVehicleId &&
    !!selectedCategoryId &&
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
    const category = categories.find((c) => c.id === selectedCategoryId)

    const key = `expense-batch-${accountId}`
    let existing: any[] = []
    try {
      const saved = sessionStorage.getItem(key)
      if (saved) existing = JSON.parse(saved)
    } catch {
      existing = []
    }

    // Each expense line becomes a separate batch item with vehicleExpense metadata
    const newItems = expenseLines.map((l) => ({
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      payeeType: 'NONE',
      payeeName: '',
      payeeId: '',
      categoryId: '',                          // no domain selection
      categoryName: category?.name ?? '',
      categoryEmoji: category?.emoji ?? '🚗',
      subcategoryId: selectedCategoryId,       // ExpenseCategories.id → used as API's categoryId
      subcategoryName: category?.name ?? '',
      subSubcategoryId: undefined,
      subSubcategoryName: undefined,
      amount: parseFloat(l.amount),
      paymentDate: today,
      notes: l.notes.trim() || undefined,
      paymentType: 'REGULAR',
      isFullPayment: true,
      // Vehicle expense metadata — picked up by the enhanced payments API
      vehicleExpense: {
        vehicleId: selectedVehicleId,
        expenseType: l.expenseType,
        ...(l.expenseType === 'FUEL' && l.fuelQuantity
          ? { fuelQuantity: parseFloat(l.fuelQuantity) }
          : {}),
        ...(l.expenseType === 'FUEL' && l.fuelType
          ? { fuelType: l.fuelType }
          : {}),
        ...(l.mileageAtExpense
          ? { mileageAtExpense: parseInt(l.mileageAtExpense, 10) }
          : {}),
      },
    }))

    sessionStorage.setItem(key, JSON.stringify([...existing, ...newItems]))
    setSubmitting(false)

    toast.push(
      `${newItems.length} vehicle expense${newItems.length !== 1 ? 's' : ''} added to queue`
    )

    onSuccess()
    onClose()
  }

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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Vehicle Expenses
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Add to queue — processed when you submit the payment batch.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Vehicle + Category selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vehicle <span className="text-red-500">*</span>
              </label>
              {loadingVehicles ? (
                <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
              ) : (
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className={`w-full text-sm border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:text-gray-100 ${
                    touched && !selectedVehicleId
                      ? 'border-red-400'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Select vehicle…</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {vehicleLabel(v)}
                    </option>
                  ))}
                </select>
              )}
              {touched && !selectedVehicleId && (
                <p className="text-xs text-red-500 mt-1">Vehicle required</p>
              )}
              {vehicles.length === 0 && !loadingVehicles && (
                <p className="text-xs text-gray-400 mt-1">No active vehicles found</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expense Account Category <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className={`w-full text-sm border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:text-gray-100 ${
                  touched && !selectedCategoryId
                    ? 'border-red-400'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
              {touched && !selectedCategoryId && (
                <p className="text-xs text-red-500 mt-1">Category required</p>
              )}
            </div>
          </div>

          {/* Expense lines */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Expenses
            </h3>

            {expenseLines.map((line, idx) => {
              const err = touched ? lineError(line) : null
              const isFuel = line.expenseType === 'FUEL'

              return (
                <div
                  key={line.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 space-y-3"
                >
                  {/* Line header */}
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
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Type
                      </label>
                      <select
                        value={line.expenseType}
                        onChange={(e) =>
                          updateLine(line.id, {
                            expenseType: e.target.value,
                            // Reset fuel fields when type changes away from FUEL
                            ...(e.target.value !== 'FUEL'
                              ? { fuelQuantity: '', fuelType: 'DIESEL' }
                              : {}),
                          })
                        }
                        className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 dark:text-gray-100"
                      >
                        {EXPENSE_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
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
                        onChange={(e) => updateLine(line.id, { amount: e.target.value })}
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
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="Litres / Gallons"
                          value={line.fuelQuantity}
                          onChange={(e) =>
                            updateLine(line.id, { fuelQuantity: e.target.value })
                          }
                          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Fuel Type
                        </label>
                        <select
                          value={line.fuelType}
                          onChange={(e) => updateLine(line.id, { fuelType: e.target.value })}
                          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 dark:text-gray-100"
                        >
                          {FUEL_TYPES.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
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
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 45200"
                        value={line.mileageAtExpense}
                        onChange={(e) =>
                          updateLine(line.id, { mileageAtExpense: e.target.value })
                        }
                        className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Notes (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Morning fill-up"
                        value={line.notes}
                        onChange={(e) => updateLine(line.id, { notes: e.target.value })}
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
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              Balance: <span className="font-medium">${accountBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </span>
            <span className={`font-semibold ${balanceExceeded ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
              Total: ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
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
    </div>
  )
}
