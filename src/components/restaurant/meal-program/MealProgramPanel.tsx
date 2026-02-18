'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useToastContext } from '@/components/ui/toast'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

// ---- Types ----
type Participant = {
  id: string | null        // null for employees not yet formally enrolled
  participantType: 'EMPLOYEE' | 'EXTERNAL'
  name: string
  employeeId: string | null
  isActive: boolean
  alreadyPurchasedToday: boolean
  isEnrolled: boolean
}

type EligibleItem = {
  id: string
  productId: string
  productName: string
  productBasePrice: number
  isActive: boolean
}

type MenuItem = {
  id: string
  name: string
  price: number
  category: string
}

type CashAddOn = {
  tempId: string
  productId: string | null
  productName: string
  unitPrice: number
  quantity: number
}

type Step = 'search' | 'select-item' | 'add-ons' | 'confirm' | 'complete'

interface MealProgramPanelProps {
  businessId: string
  soldByEmployeeId?: string
  allMenuItems: MenuItem[]
  onTransactionComplete?: (result: {
    orderId: string
    orderNumber: string
    subsidyAmount: number
    cashAmount: number
    totalAmount: number
    participantName: string
    items: { name: string; quantity: number; price: number }[]
    paymentMethod: string
  }) => void
  onCancel?: () => void
}

const SUBSIDY = 0.5

export function MealProgramPanel({
  businessId,
  soldByEmployeeId,
  allMenuItems,
  onTransactionComplete,
  onCancel,
}: MealProgramPanelProps) {
  const toast = useToastContext()
  const { hasPermission: hasBizPermission, currentBusiness } = useBusinessPermissionsContext()
  const canManageProgram = hasBizPermission('canManageEmployees') || hasBizPermission('canManageMenu') || hasBizPermission('canManageInventory')

  const [step, setStep] = useState<Step>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Participant[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [eligibleItems, setEligibleItems] = useState<EligibleItem[]>([])
  const [eligibleItemsLoading, setEligibleItemsLoading] = useState(false)

  // Selected subsidised item
  const [subsidizedItem, setSubsidizedItem] = useState<{
    productId: string | null
    productName: string
    unitPrice: number
    isEligibleItem: boolean
  } | null>(null)

  // Cash add-ons
  const [cashAddOns, setCashAddOns] = useState<CashAddOn[]>([])

  // Item selection UI state
  const [itemTab, setItemTab] = useState<'eligible' | 'menu'>('eligible')
  const [menuSearch, setMenuSearch] = useState('')
  const [eligibleSearch, setEligibleSearch] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [completedResult, setCompletedResult] = useState<any>(null)

  // ---- Search participants ----
  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim() || !businessId) {
        setSearchResults([])
        return
      }
      setSearchLoading(true)
      try {
        const res = await fetch(
          `/api/restaurant/meal-program/participants?businessId=${businessId}&search=${encodeURIComponent(q)}`
        )
        const data = await res.json()
        if (data.success) {
          // Map API shape → Participant type. Employees without a record are shown
          // and will be auto-enrolled on their first transaction.
          const mapped: Participant[] = (data.data || []).map((p: any) => ({
            id: p.participantRecordId || null,
            participantType: p.participantType,
            name: p.fullName || p.name || 'Unknown',
            employeeId: p.employeeId || null,
            isActive: p.isActive ?? true,
            alreadyPurchasedToday: p.alreadyPurchasedToday ?? false,
            isEnrolled: !!p.participantRecordId,
          }))
          setSearchResults(mapped)
        }
      } catch {
        toast.push('Search failed', { type: 'error' })
      } finally {
        setSearchLoading(false)
      }
    },
    [businessId, toast]
  )

  useEffect(() => {
    const timer = setTimeout(() => doSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery, doSearch])

  // ---- Load eligible items ----
  const loadEligibleItems = useCallback(async () => {
    setEligibleItemsLoading(true)
    try {
      const res = await fetch(
        `/api/restaurant/meal-program/eligible-items?businessId=${businessId}&includeInactive=false`
      )
      const data = await res.json()
      if (data.success) setEligibleItems(data.data || [])
    } catch {
      // non-critical; fall through
    } finally {
      setEligibleItemsLoading(false)
    }
  }, [businessId])

  // Reload eligible items whenever we enter the select-item step
  useEffect(() => {
    if (step === 'select-item') loadEligibleItems()
  }, [step, loadEligibleItems])

  // ---- Step handlers ----
  function selectParticipant(p: Participant) {
    if (!p.isActive) {
      toast.push(`${p.name} is inactive and cannot use the meal program`, { type: 'error' })
      return
    }
    if (p.alreadyPurchasedToday) {
      toast.push(`${p.name} already used their daily subsidy today`, { type: 'warning' })
      return
    }
    setSelectedParticipant(p)
    setStep('select-item')
  }

  function selectSubsidizedItem(item: {
    productId: string | null
    productName: string
    unitPrice: number
    isEligibleItem: boolean
  }) {
    setSubsidizedItem(item)
    setStep('add-ons')
  }

  function addCashAddOn(item: { productId: string | null; productName: string; unitPrice: number }) {
    setCashAddOns((prev) => {
      const existing = prev.find((c) => c.productId && c.productId === item.productId)
      if (existing) {
        return prev.map((c) =>
          c.tempId === existing.tempId ? { ...c, quantity: c.quantity + 1 } : c
        )
      }
      return [
        ...prev,
        {
          tempId: `addon-${Date.now()}-${Math.random()}`,
          productId: item.productId,
          productName: item.productName,
          unitPrice: item.unitPrice,
          quantity: 1,
        },
      ]
    })
  }

  function updateAddOnQty(tempId: string, qty: number) {
    if (qty <= 0) {
      setCashAddOns((prev) => prev.filter((c) => c.tempId !== tempId))
    } else {
      setCashAddOns((prev) => prev.map((c) => (c.tempId === tempId ? { ...c, quantity: qty } : c)))
    }
  }

  // ---- Totals ----
  const subsidyCashPortion = subsidizedItem
    ? Math.max(0, subsidizedItem.unitPrice - SUBSIDY)
    : 0
  const addOnsTotal = cashAddOns.reduce((s, c) => s + c.unitPrice * c.quantity, 0)
  const totalCash = subsidyCashPortion + addOnsTotal
  const totalAmount = SUBSIDY + totalCash

  // ---- Submit ----
  async function handleConfirm() {
    if (!selectedParticipant || !subsidizedItem) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/restaurant/meal-program/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          ...(selectedParticipant.id
            ? { participantId: selectedParticipant.id }
            : { employeeId: selectedParticipant.employeeId }),
          subsidizedItem: {
            productId: subsidizedItem.productId,
            productName: subsidizedItem.productName,
            unitPrice: subsidizedItem.unitPrice,
            isEligibleItem: subsidizedItem.isEligibleItem,
          },
          cashItems: cashAddOns.map((c) => ({
            productId: c.productId,
            productName: c.productName,
            unitPrice: c.unitPrice,
            quantity: c.quantity,
          })),
          soldByEmployeeId,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setCompletedResult(data.data)
        setStep('complete')
        // Build items list for receipt
        const receiptItems = [
          { name: subsidizedItem.productName, quantity: 1, price: subsidizedItem.unitPrice },
          ...cashAddOns.map((c) => ({ name: c.productName, quantity: c.quantity, price: c.unitPrice })),
        ]
        onTransactionComplete?.({
          ...data.data,
          items: receiptItems,
          paymentMethod: 'EXPENSE_ACCOUNT',
        })
      } else {
        toast.push(data.error || 'Transaction failed', { type: 'error' })
      }
    } catch {
      toast.push('Transaction failed', { type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  function handleReset() {
    setStep('search')
    setSearchQuery('')
    setSearchResults([])
    setSelectedParticipant(null)
    setSubsidizedItem(null)
    setCashAddOns([])
    setCompletedResult(null)
  }

  // ---- Menu search filtered ----
  const router = useRouter()

  const filteredEligible = eligibleItems.filter(
    (e) =>
      !eligibleSearch ||
      e.productName.toLowerCase().includes(eligibleSearch.toLowerCase())
  )

  const filteredMenu = allMenuItems.filter(
    (m) =>
      !menuSearch ||
      m.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
      m.category.toLowerCase().includes(menuSearch.toLowerCase())
  )

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-amber-500 text-white px-4 py-3 flex items-center justify-between">
        <div className="font-semibold text-lg">🍱 Meal Program</div>
        {onCancel && (
          <button onClick={onCancel} className="text-white/80 hover:text-white text-sm underline">
            Cancel
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* ---- STEP: Search participant ---- */}
        {step === 'search' && (
          <div>
            <p className="text-sm text-secondary mb-3">Search for an employee or registered guest</p>
            <input
              type="text"
              placeholder="Name or employee number…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 mb-3"
            />
            {searchLoading && (
              <p className="text-xs text-secondary text-center py-3">Searching…</p>
            )}
            {!searchLoading && searchQuery && searchResults.length === 0 && (
              <div className="text-center py-3">
                <p className="text-xs text-secondary">No enrolled participants found</p>
                <p className="text-xs text-gray-400 mt-1">
                  Employees must be registered under Meal Program → Participants first
                </p>
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-center">
              {canManageProgram && (
                <button
                  onClick={() => router.push('/restaurant/meal-program/participants')}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline"
                >
                  <span>➕</span> Manage participants
                </button>
              )}
            </div>
            <div className="space-y-2">
              {searchResults.map((p) => (
                <button
                  key={p.id ?? p.employeeId}
                  onClick={() => selectParticipant(p)}
                  disabled={!p.isActive || p.alreadyPurchasedToday}
                  className={`w-full text-left p-3 border rounded-lg transition-colors ${
                    !p.isActive || p.alreadyPurchasedToday
                      ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800/30'
                      : 'hover:bg-amber-50 dark:hover:bg-amber-900/20 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-primary">{p.name}</div>
                      <div className="text-xs text-secondary">
                        {p.participantType === 'EMPLOYEE' ? '👤 Employee' : '🙋 External Guest'}
                      </div>
                    </div>
                    <div>
                      {p.alreadyPurchasedToday ? (
                        <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-full">
                          Used today
                        </span>
                      ) : !p.isActive ? (
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-1 rounded-full">
                          Inactive
                        </span>
                      ) : (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                          ✓ Eligible
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---- STEP: Select subsidised item ---- */}
        {step === 'select-item' && selectedParticipant && (
          <div>
            <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div className="text-sm font-medium text-amber-800 dark:text-amber-300">
                👤 {selectedParticipant.name}
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400">
                $0.50 subsidy available today
              </div>
            </div>

            <p className="text-xs text-secondary mb-3">Choose the item to subsidise:</p>

            {/* Tab: Eligible vs Any menu item */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-3">
              <button
                onClick={() => setItemTab('eligible')}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  itemTab === 'eligible'
                    ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                🍱 Eligible Items (FREE)
              </button>
              <button
                onClick={() => setItemTab('menu')}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  itemTab === 'menu'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                📋 Any Item (Upgrade)
              </button>
            </div>

            {itemTab === 'eligible' && (
              <div>
                {eligibleItemsLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-secondary text-xs">
                    <span className="animate-spin">⏳</span> Loading items…
                  </div>
                ) : eligibleItems.length === 0 ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="text-3xl">🍱</div>
                    <p className="text-xs text-secondary">
                      No eligible items configured.{' '}
                      <button className="text-amber-600 underline" onClick={() => setItemTab('menu')}>
                        Use any menu item instead
                      </button>
                    </p>
                    {canManageProgram && (
                      <button
                        onClick={() => router.push('/restaurant/meal-program/eligible-items')}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-100 transition-colors"
                      >
                        ⚙️ Configure eligible items
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* Search */}
                    <div className="relative mb-3">
                      <input
                        type="text"
                        placeholder="Search eligible items…"
                        value={eligibleSearch}
                        onChange={(e) => setEligibleSearch(e.target.value)}
                        className="w-full pl-7 pr-7 py-1.5 border rounded-lg text-xs bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                      {eligibleSearch && (
                        <button onClick={() => setEligibleSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">✕</button>
                      )}
                    </div>
                    {/* Card grid */}
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                      {filteredEligible.map((item) => (
                        <button
                          key={item.id}
                          onClick={() =>
                            selectSubsidizedItem({
                              productId: item.productId,
                              productName: item.productName,
                              unitPrice: item.productBasePrice,
                              isEligibleItem: true,
                            })
                          }
                          className="text-left p-3 border border-green-200 dark:border-green-800 rounded-lg bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 hover:shadow-md transition-all"
                        >
                          <div className="font-semibold text-xs text-primary line-clamp-2 mb-1">{item.productName}</div>
                          <div className="text-xs text-secondary mb-1">${item.productBasePrice.toFixed(2)}</div>
                          <span className="text-xs font-bold text-green-700 dark:text-green-300">
                            {item.productBasePrice <= 0.5 ? '✅ FREE' : `Pay $${Math.max(0, item.productBasePrice - 0.5).toFixed(2)}`}
                          </span>
                        </button>
                      ))}
                      {filteredEligible.length === 0 && (
                        <p className="col-span-2 text-center text-xs text-secondary py-4">No items match your search</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {itemTab === 'menu' && (
              <div>
                <div className="text-xs text-secondary bg-blue-50 dark:bg-blue-900/20 p-2 rounded mb-2">
                  $0.50 subsidy applied; participant pays the rest
                </div>
                {/* Search */}
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="Search menu…"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    className="w-full pl-7 pr-7 py-1.5 border rounded-lg text-xs bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                  {menuSearch && (
                    <button onClick={() => setMenuSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">✕</button>
                  )}
                </div>
                {/* Card grid */}
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {filteredMenu.map((item) => (
                    <button
                      key={item.id}
                      onClick={() =>
                        selectSubsidizedItem({
                          productId: item.id,
                          productName: item.name,
                          unitPrice: item.price,
                          isEligibleItem: false,
                        })
                      }
                      className="text-left p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:shadow-md transition-all"
                    >
                      <div className="font-semibold text-xs text-primary line-clamp-2 mb-1">{item.name}</div>
                      <div className="text-xs text-secondary mb-1">${item.price.toFixed(2)}</div>
                      {item.price > 0.5 ? (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          Pay ${(item.price - 0.5).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-green-600 dark:text-green-400">FREE ✅</span>
                      )}
                    </button>
                  ))}
                  {filteredMenu.length === 0 && (
                    <p className="col-span-2 text-center text-xs text-secondary py-4">No items match your search</p>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => setStep('search')}
              className="mt-4 text-xs text-secondary underline"
            >
              ← Change participant
            </button>
          </div>
        )}

        {/* ---- STEP: Add cash add-ons ---- */}
        {step === 'add-ons' && subsidizedItem && (
          <div>
            <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs">
              <div className="font-medium text-amber-800 dark:text-amber-300">
                Subsidised: {subsidizedItem.productName}
              </div>
              <div className="text-amber-600 dark:text-amber-400">
                ${SUBSIDY.toFixed(2)} from expense + ${subsidyCashPortion.toFixed(2)} cash
              </div>
            </div>

            <p className="text-xs text-secondary mb-2">Add more items (full cash price):</p>
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search to add…"
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                className="w-full pl-7 pr-7 py-1.5 border rounded-lg text-xs bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
              {menuSearch && (
                <button onClick={() => setMenuSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">✕</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto mb-3">
              {filteredMenu.map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    addCashAddOn({ productId: item.id, productName: item.name, unitPrice: item.price })
                  }
                  className="text-left p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow transition-all"
                >
                  <div className="font-medium text-xs text-primary line-clamp-2 mb-1">{item.name}</div>
                  <div className="text-xs font-bold text-green-600">+${item.price.toFixed(2)}</div>
                </button>
              ))}
              {filteredMenu.length === 0 && (
                <p className="col-span-2 text-center text-xs text-secondary py-3">No items match</p>
              )}
            </div>

            {cashAddOns.length > 0 && (
              <div className="border rounded-lg p-2 mb-3 space-y-1">
                {cashAddOns.map((c) => (
                  <div key={c.tempId} className="flex items-center justify-between text-xs">
                    <span className="text-primary flex-1 truncate">{c.productName}</span>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => updateAddOnQty(c.tempId, c.quantity - 1)}
                        className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded text-center"
                      >
                        −
                      </button>
                      <span className="w-4 text-center">{c.quantity}</span>
                      <button
                        onClick={() => updateAddOnQty(c.tempId, c.quantity + 1)}
                        className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded text-center"
                      >
                        +
                      </button>
                      <span className="text-secondary w-14 text-right">
                        ${(c.unitPrice * c.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep('select-item')}
                className="flex-1 py-2 border rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep('confirm')}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium"
              >
                Review Order →
              </button>
            </div>
          </div>
        )}

        {/* ---- STEP: Confirm ---- */}
        {step === 'confirm' && selectedParticipant && subsidizedItem && (
          <div>
            <h3 className="font-semibold text-primary mb-3 text-sm">Confirm Order</h3>

            <div className="text-xs space-y-1 mb-4 border rounded-lg p-3">
              <div className="flex justify-between">
                <span className="text-secondary">Participant</span>
                <span className="font-medium text-primary">{selectedParticipant.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">{subsidizedItem.productName}</span>
                <span className="text-primary">${subsidizedItem.unitPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Expense account (−$0.50)</span>
                <span>−$0.50</span>
              </div>
              {cashAddOns.map((c) => (
                <div key={c.tempId} className="flex justify-between">
                  <span className="text-secondary">
                    {c.productName} ×{c.quantity}
                  </span>
                  <span className="text-primary">${(c.unitPrice * c.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-1 mt-1">
                <div className="flex justify-between text-xs text-secondary">
                  <span>Expense account</span>
                  <span>${SUBSIDY.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-primary">
                  <span>Cash from customer</span>
                  <span>${totalCash.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep('add-ons')}
                disabled={submitting}
                className="flex-1 py-2.5 border rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                ← Edit
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? 'Processing…' : '✓ Complete Sale'}
              </button>
            </div>
          </div>
        )}

        {/* ---- STEP: Complete ---- */}
        {step === 'complete' && completedResult && (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="font-semibold text-primary mb-1">Sale Complete</h3>
            <p className="text-xs text-secondary mb-4">
              Order #{completedResult.orderNumber}
            </p>
            <div className="text-xs space-y-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-left mb-4">
              <div className="flex justify-between">
                <span className="text-secondary">Participant</span>
                <span className="text-primary">{completedResult.participantName}</span>
              </div>
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Expense subsidy</span>
                <span>−${Number(completedResult.subsidyAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-primary">
                <span>Cash collected</span>
                <span>${Number(completedResult.cashAmount).toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold"
            >
              New Transaction
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
