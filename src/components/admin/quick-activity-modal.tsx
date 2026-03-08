'use client'

import { useState, useRef, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

interface BusinessConfig {
  businessId: string
  businessName: string
  businessType: string
  selected: boolean
  budget: string
  maxItems: number
}

interface LogEntry {
  id: string
  label: string
  amount: number
  success: boolean
}

interface BizRun {
  count: number
  spent: number
  budget: number
  entries: LogEntry[]
  status: 'idle' | 'running' | 'done' | 'stopped' | 'skipped'
  note?: string
}

interface Props {
  businesses: { businessId: string; businessName: string; businessType: string; isActive: boolean }[]
  onClose: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function toConfigs(businesses: Props['businesses']): BusinessConfig[] {
  return businesses
    .filter(b => b.isActive && b.businessType !== 'umbrella')
    .map(b => ({ ...b, selected: false, budget: '', maxItems: 5 }))
}

// ── Component ──────────────────────────────────────────────────────────────

export function QuickActivityModal({ businesses, onClose }: Props) {
  const [tab, setTab] = useState<'sales' | 'expenses'>('sales')

  const [salesConfigs, setSalesConfigs] = useState<BusinessConfig[]>(() => toConfigs(businesses))
  const [expConfigs, setExpConfigs]     = useState<BusinessConfig[]>(() => toConfigs(businesses))

  const [salesRuns, setSalesRuns] = useState<Record<string, BizRun>>({})
  const [expRuns, setExpRuns]     = useState<Record<string, BizRun>>({})

  const [isRunning, setIsRunning] = useState(false)
  const runningRef = useRef(false)

  // ── Progress updaters ──────────────────────────────────────────────────

  const updateSalesRun = useCallback(
    (bId: string, upd: Partial<BizRun> | ((prev: BizRun) => Partial<BizRun>)) => {
      setSalesRuns(prev => {
        const cur: BizRun = prev[bId] ?? { count: 0, spent: 0, budget: 0, entries: [], status: 'idle' }
        const patch = typeof upd === 'function' ? upd(cur) : upd
        return { ...prev, [bId]: { ...cur, ...patch } }
      })
    },
    []
  )

  const updateExpRun = useCallback(
    (bId: string, upd: Partial<BizRun> | ((prev: BizRun) => Partial<BizRun>)) => {
      setExpRuns(prev => {
        const cur: BizRun = prev[bId] ?? { count: 0, spent: 0, budget: 0, entries: [], status: 'idle' }
        const patch = typeof upd === 'function' ? upd(cur) : upd
        return { ...prev, [bId]: { ...cur, ...patch } }
      })
    },
    []
  )

  // ── Sales loop ─────────────────────────────────────────────────────────

  async function runSalesForBusiness(cfg: BusinessConfig) {
    const budget = parseFloat(cfg.budget)
    if (isNaN(budget) || budget <= 0) return

    updateSalesRun(cfg.businessId, { status: 'running', budget, count: 0, spent: 0, entries: [] })

    // Fetch products — mirror exactly how the restaurant/universal POS loads menu items
    const prodRes  = await fetch(
      `/api/universal/products?businessId=${cfg.businessId}&isAvailable=true&isActive=true&includeVariants=true&limit=500`
    )
    const prodData = await prodRes.json()
    const allProducts: any[] = prodData.data || []

    type SellableItem = { productVariantId: string | null; productId: string; name: string; price: number }
    const sellable: SellableItem[] = []
    for (const p of allProducts) {
      const basePrice = Number(p.basePrice ?? 0)
      if (basePrice <= 0) continue

      const variants: any[] = p.variants || []
      if (variants.length === 0) {
        // No variants (e.g. restaurant menu items) — order with productVariantId: null
        sellable.push({ productVariantId: null, productId: p.id, name: p.name, price: basePrice })
      } else {
        for (const v of variants) {
          const price = Number(v.price ?? basePrice)
          if (price > 0 && v.isAvailable !== false) {
            sellable.push({ productVariantId: v.id, productId: p.id, name: p.name, price })
          }
        }
      }
    }

    if (sellable.length === 0) {
      updateSalesRun(cfg.businessId, { status: 'skipped', note: 'No sellable products found' })
      return
    }

    const minPrice = Math.min(...sellable.map(s => s.price))
    let remaining = budget
    let budgetExhausted = false

    while (remaining >= minPrice && runningRef.current) {
      // Only pick items we can afford at least 1 unit of
      const affordable = sellable.filter(s => s.price <= remaining)
      if (affordable.length === 0) { budgetExhausted = true; break }

      const itemCount = randBetween(1, cfg.maxItems)
      const orderItems: { productVariantId: string | null; productId: string; name: string; unitPrice: number; quantity: number }[] = []
      let orderTotal = 0

      for (let i = 0; i < itemCount; i++) {
        const item = pick(affordable)
        // Skip if this variant is already in the order (orders API validates unique variants)
        if (item.productVariantId && orderItems.some(o => o.productVariantId === item.productVariantId)) continue
        // First item always qty=1 to guarantee at least one item is added; extras get random qty
        const qty = orderItems.length === 0 ? 1 : randBetween(1, 3)
        const lineTotal = item.price * qty
        // After the first item is secured, don't overshoot the budget
        if (orderItems.length > 0 && orderTotal + lineTotal > remaining * 1.15) break
        orderItems.push({ productVariantId: item.productVariantId, productId: item.productId, name: item.name, unitPrice: item.price, quantity: qty })
        orderTotal += lineTotal
      }

      if (orderItems.length === 0) break

      const orderRes  = await fetch('/api/universal/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId:    cfg.businessId,
          businessType:  cfg.businessType,
          paymentMethod: 'CASH',
          paymentStatus: 'PAID',
          orderType:     'SALE',
          totalAmount:   orderTotal,
          subtotal:      orderTotal,
          taxAmount:     0,
          discountAmount: 0,
          attributes:    { posOrder: true },
          items: orderItems.map(i => ({
            productVariantId: i.productVariantId,
            quantity:         i.quantity,
            unitPrice:        i.unitPrice,
            discountAmount:   0,
            attributes:       { productId: i.productId, productName: i.name },
          })),
        }),
      })
      const orderData = await orderRes.json()

      if (orderRes.ok && orderData.success) {
        const total       = Number(orderData.data?.totalAmount ?? orderTotal)
        const itemSummary = orderItems.map(i => `${i.name} x${i.quantity}`).join(', ')
        remaining -= total
        updateSalesRun(cfg.businessId, prev => ({
          count:   prev.count + 1,
          spent:   prev.spent + total,
          entries: [
            { id: orderData.data?.orderNumber ?? String(Date.now()), label: `${orderData.data?.orderNumber} — ${itemSummary}`, amount: total, success: true },
            ...prev.entries,
          ].slice(0, 50),
        }))
      } else {
        updateSalesRun(cfg.businessId, prev => ({
          status:  'done',
          note:    `Stopped: ${orderData.error ?? 'order failed'}`,
          entries: [
            { id: String(Date.now()), label: `Order failed: ${orderData.error ?? 'Unknown error'}`, amount: 0, success: false },
            ...prev.entries,
          ].slice(0, 50),
        }))
        return
      }

      if (remaining < minPrice) { budgetExhausted = true; break }
      await sleep(2000)
    }

    const salesNaturalEnd = budgetExhausted || remaining < minPrice
    updateSalesRun(cfg.businessId, prev => ({
      status: salesNaturalEnd ? 'done' : 'stopped',
      note:   `${salesNaturalEnd ? 'Budget exhausted' : 'Stopped'} — $${prev.spent.toFixed(2)} spent`,
    }))
  }

  // ── Expense loop ───────────────────────────────────────────────────────

  async function runExpenseForBusiness(cfg: BusinessConfig) {
    const budget = parseFloat(cfg.budget)
    if (isNaN(budget) || budget <= 0) return

    updateExpRun(cfg.businessId, { status: 'running', budget, count: 0, spent: 0, entries: [] })

    // Resolve primary expense account
    const accRes  = await fetch(`/api/expense-account?businessId=${cfg.businessId}`)
    const accData = await accRes.json()
    const accounts: any[] = accData.data?.accounts || []
    const primaryAcc = accounts
      .filter(a => a.isActive && a.accountType !== 'LOAN' && a.accountType !== 'RENT')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]

    if (!primaryAcc) {
      updateExpRun(cfg.businessId, { status: 'skipped', note: 'No active expense account found' })
      return
    }

    // Check business account balance
    const bizRes  = await fetch(`/api/business/${cfg.businessId}/account`)
    const bizData = await bizRes.json()
    const bizBalance = Number(bizData.data?.account?.balance ?? 0)

    if (bizBalance <= 0) {
      updateExpRun(cfg.businessId, { status: 'skipped', note: 'Business account has no funds' })
      return
    }

    // Fetch payees
    const payeeRes  = await fetch(`/api/expense-account/payees?businessId=${cfg.businessId}`)
    const payeeData = await payeeRes.json()
    const pd = payeeData.data || payeeData

    type Payee = { payeeType: string; id: string; label: string }
    const payees: Payee[] = [
      ...((pd.users        || []).map((u: any) => ({ payeeType: 'USER',     id: u.id, label: u.name }))),
      ...((pd.employees    || []).map((e: any) => ({ payeeType: 'EMPLOYEE', id: e.id, label: e.fullName || `${e.firstName} ${e.lastName}` }))),
      ...((pd.persons      || []).map((p: any) => ({ payeeType: 'PERSON',   id: p.id, label: p.fullName }))),
      ...((pd.businesses   || []).map((b: any) => ({ payeeType: 'BUSINESS', id: b.id, label: b.name }))),
    ]

    if (payees.length === 0) {
      updateExpRun(cfg.businessId, { status: 'skipped', note: 'No payees found' })
      return
    }

    // Fetch expense categories (flat list from domains)
    const catRes  = await fetch('/api/expense-categories')
    const catData = await catRes.json()
    const categories: { id: string; name: string }[] = (catData.domains || [])
      .flatMap((d: any) => d.expense_categories || [])

    if (categories.length === 0) {
      updateExpRun(cfg.businessId, { status: 'skipped', note: 'No expense categories found' })
      return
    }

    const MIN_EXPENSE = 5
    let remaining = budget
    let expBudgetExhausted = false

    while (remaining >= MIN_EXPENSE && runningRef.current) {
      // Re-check live business balance before each expense
      const balRes  = await fetch(`/api/business/${cfg.businessId}/account`)
      const balData = await balRes.json()
      const liveBal = Number(balData.data?.account?.balance ?? 0)

      if (liveBal < MIN_EXPENSE) {
        updateExpRun(cfg.businessId, { status: 'done', note: 'Business account balance too low to continue' })
        return
      }

      const maxAmount = Math.min(remaining, 200, liveBal)
      if (maxAmount < MIN_EXPENSE) { expBudgetExhausted = true; break }

      // Random amount between MIN_EXPENSE and maxAmount (2 decimal places)
      const amount = Math.round(randBetween(MIN_EXPENSE * 100, maxAmount * 100)) / 100
      const payee   = pick(payees)
      const category = pick(categories)

      // Step 1: Deposit from business account → expense account
      const depRes  = await fetch(`/api/expense-account/${primaryAcc.id}/deposits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType:       'BUSINESS',
          sourceBusinessId: cfg.businessId,
          amount,
          manualNote:       'Quick-sim funding',
        }),
      })
      const depData = await depRes.json()

      if (!depRes.ok) {
        updateExpRun(cfg.businessId, prev => ({
          status:  'done',
          note:    `Stopped: ${depData.error ?? 'deposit failed'}`,
          entries: [
            { id: String(Date.now()), label: `Deposit failed: ${depData.error ?? 'Unknown'}`, amount: 0, success: false },
            ...prev.entries,
          ].slice(0, 50),
        }))
        return
      }

      // Step 2: Create expense payment
      const paymentBody: Record<string, any> = {
        categoryId: category.id,
        amount,
        status:     'SUBMITTED',
        notes:      'Quick-sim expense',
        payeeType:  payee.payeeType,
      }
      if (payee.payeeType === 'USER')     paymentBody.payeeUserId     = payee.id
      if (payee.payeeType === 'EMPLOYEE') paymentBody.payeeEmployeeId = payee.id
      if (payee.payeeType === 'PERSON')   paymentBody.payeePersonId   = payee.id
      if (payee.payeeType === 'BUSINESS') paymentBody.payeeBusinessId = payee.id

      const payRes  = await fetch(`/api/expense-account/${primaryAcc.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentBody),
      })
      const payData = await payRes.json()

      if (payRes.ok && payData.success) {
        remaining -= amount
        updateExpRun(cfg.businessId, prev => ({
          count:   prev.count + 1,
          spent:   prev.spent + amount,
          entries: [
            { id: String(Date.now()), label: `${payee.label} — ${category.name}`, amount, success: true },
            ...prev.entries,
          ].slice(0, 50),
        }))
      } else {
        updateExpRun(cfg.businessId, prev => ({
          status:  'done',
          note:    `Stopped: ${payData.error ?? 'payment failed'}`,
          entries: [
            { id: String(Date.now()), label: `Payment failed: ${payData.error ?? 'Unknown'}`, amount: 0, success: false },
            ...prev.entries,
          ].slice(0, 50),
        }))
        return
      }

      await sleep(2000)
    }

    const expNaturalEnd = expBudgetExhausted || remaining < MIN_EXPENSE
    updateExpRun(cfg.businessId, prev => ({
      status: expNaturalEnd ? 'done' : 'stopped',
      note:   `${expNaturalEnd ? 'Budget exhausted' : 'Stopped'} — $${prev.spent.toFixed(2)} spent`,
    }))
  }

  // ── Action handlers ────────────────────────────────────────────────────

  async function handleStart() {
    if (isRunning) return
    runningRef.current = true
    setIsRunning(true)

    const selected = (tab === 'sales' ? salesConfigs : expConfigs)
      .filter(c => c.selected && parseFloat(c.budget) > 0)

    await Promise.all(
      selected.map(cfg =>
        tab === 'sales' ? runSalesForBusiness(cfg) : runExpenseForBusiness(cfg)
      )
    )

    runningRef.current = false
    setIsRunning(false)
  }

  function handleStop() {
    runningRef.current = false
    setIsRunning(false)
  }

  function handleReset() {
    runningRef.current = false
    setIsRunning(false)
    if (tab === 'sales') setSalesRuns({})
    else setExpRuns({})
  }

  // ── Derived state ──────────────────────────────────────────────────────

  const configs    = tab === 'sales' ? salesConfigs : expConfigs
  const setConfigs = tab === 'sales' ? setSalesConfigs : setExpConfigs
  const runs       = tab === 'sales' ? salesRuns : expRuns
  const anySelected = configs.some(c => c.selected && parseFloat(c.budget) > 0)

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Quick Activity Simulator</h2>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl font-bold leading-none disabled:opacity-40"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          {(['sales', 'expenses'] as const).map(t => (
            <button
              key={t}
              onClick={() => { if (!isRunning) setTab(t) }}
              className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              } disabled:cursor-not-allowed`}
              disabled={isRunning}
            >
              {t === 'sales' ? 'Sales' : 'Expenses'}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Config table */}
          <div>
            {/* Column headers */}
            <div
              className="grid text-xs font-medium text-gray-400 dark:text-gray-500 uppercase mb-1 px-2"
              style={{ gridTemplateColumns: tab === 'sales' ? '1.5rem 1fr 7rem 7rem' : '1.5rem 1fr 7rem' }}
            >
              <span />
              <span>Business</span>
              <span>Budget ($)</span>
              {tab === 'sales' && <span>Max items</span>}
            </div>

            {configs.map((cfg, i) => (
              <div
                key={cfg.businessId}
                className="grid items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700/40"
                style={{ gridTemplateColumns: tab === 'sales' ? '1.5rem 1fr 7rem 7rem' : '1.5rem 1fr 7rem' }}
              >
                <input
                  type="checkbox"
                  checked={cfg.selected}
                  onChange={e =>
                    setConfigs(prev => prev.map((c, j) => j === i ? { ...c, selected: e.target.checked } : c))
                  }
                  disabled={isRunning}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{cfg.businessName}</span>
                <input
                  type="number"
                  min="1"
                  placeholder="0"
                  value={cfg.budget}
                  onChange={e =>
                    setConfigs(prev => prev.map((c, j) => j === i ? { ...c, budget: e.target.value } : c))
                  }
                  disabled={isRunning || !cfg.selected}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                {tab === 'sales' && (
                  <select
                    value={cfg.maxItems}
                    onChange={e =>
                      setConfigs(prev => prev.map((c, j) => j === i ? { ...c, maxItems: Number(e.target.value) } : c))
                    }
                    disabled={isRunning || !cfg.selected}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-40"
                  >
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={handleStart}
              disabled={isRunning || !anySelected}
              className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? 'Running…' : `Start ${tab === 'sales' ? 'Sales' : 'Expenses'}`}
            </button>
            <button
              onClick={handleStop}
              disabled={!isRunning}
              className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-40 transition-colors"
            >
              Stop
            </button>
            <button
              onClick={handleReset}
              disabled={isRunning}
              className="px-4 py-2 text-sm font-medium bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-40 transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Progress section */}
          {Object.keys(runs).length > 0 && (
            <div className="space-y-5 border-t border-gray-200 dark:border-gray-700 pt-4">
              {Object.entries(runs).map(([bizId, run]) => {
                const pct = run.budget > 0 ? Math.min(100, (run.spent / run.budget) * 100) : 0
                const bizName = configs.find(c => c.businessId === bizId)?.businessName ?? bizId
                return (
                  <div key={bizId} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{bizName}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          run.status === 'running' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                          run.status === 'done'    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                          run.status === 'skipped' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                          run.status === 'stopped' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {run.status}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {run.count} {tab === 'sales' ? 'orders' : 'payments'} &bull; ${run.spent.toFixed(2)} / ${run.budget.toFixed(2)}
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {run.note && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic">{run.note}</p>
                    )}

                    {run.entries.length > 0 && (
                      <div className="max-h-36 overflow-y-auto text-xs bg-gray-50 dark:bg-gray-900/60 rounded p-2 space-y-0.5">
                        {run.entries.map(e => (
                          <div
                            key={e.id}
                            className={`flex justify-between gap-2 ${
                              e.success ? 'text-gray-700 dark:text-gray-300' : 'text-red-500 dark:text-red-400'
                            }`}
                          >
                            <span className="truncate">{e.success ? '✓' : '✗'} {e.label}</span>
                            {e.success && <span className="shrink-0 tabular-nums">${e.amount.toFixed(2)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
