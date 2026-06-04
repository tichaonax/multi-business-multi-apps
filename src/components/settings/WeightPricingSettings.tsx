'use client'

import { useEffect, useState } from 'react'

type PurchaseType = 'LIVESTOCK' | 'GOODS'

interface Rule {
  id: string
  categoryName: string
  ruleType: string
  purchaseType: string
  pricePerKg: number
  emoji: string
  isActive: boolean
  derivedFromUnitPrice?: number | null
  derivedFromUnitCount?: number | null
  derivedFromSampleWeightKg?: number | null
  _count?: { business_products: number }
}

interface Props {
  businessId: string
  section: 'sale' | 'purchase'
}

function calcPricePerKg(count: number, pricePerUnit: number, totalWeightKg: number): number | null {
  if (count <= 0 || pricePerUnit <= 0 || totalWeightKg <= 0) return null
  return (count * pricePerUnit) / totalWeightKg
}

export function WeightPricingSettings({ businessId, section }: Props) {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Purchase tab state
  const [purchaseTab, setPurchaseTab] = useState<PurchaseType>('LIVESTOCK')

  // Add-form state
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newEmoji, setNewEmoji] = useState('📦')
  // Purchase-form extras
  const [newPurchaseType, setNewPurchaseType] = useState<PurchaseType>('LIVESTOCK')
  const [showCalc, setShowCalc] = useState(false)
  const [calc, setCalc] = useState({ unitCount: '', totalWeightKg: '', pricePerUnit: '' })

  const calcResult = calcPricePerKg(
    parseFloat(calc.unitCount),
    parseFloat(calc.pricePerUnit),
    parseFloat(calc.totalWeightKg),
  )

  useEffect(() => {
    fetch(`/api/weight-pricing-rules?businessId=${businessId}`)
      .then(r => r.json())
      .then(data => setRules(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [businessId])

  function resetAdd() {
    setShowAdd(false)
    setShowCalc(false)
    setNewName('')
    setNewPrice('')
    setNewEmoji('📦')
    setNewPurchaseType('LIVESTOCK')
    setCalc({ unitCount: '', totalWeightKg: '', pricePerUnit: '' })
  }

  async function handleAdd() {
    if (!newName.trim() || !newPrice) return
    setSaving(true)
    try {
      const ruleType = section === 'sale' ? 'SALE' : 'PURCHASE'
      const purchaseType = section === 'sale' ? 'GOODS' : newPurchaseType
      const body: Record<string, unknown> = {
        businessId,
        categoryName: newName.trim(),
        ruleType,
        purchaseType,
        pricePerKg: parseFloat(newPrice),
        emoji: newEmoji || '📦',
      }
      if (section === 'purchase' && newPurchaseType === 'LIVESTOCK' && calcResult != null && parseFloat(newPrice) === calcResult) {
        body.derivedFromUnitCount = parseFloat(calc.unitCount)
        body.derivedFromUnitPrice = parseFloat(calc.pricePerUnit)
        body.derivedFromSampleWeightKg = parseFloat(calc.totalWeightKg)
      }
      const res = await fetch('/api/weight-pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const err = await res.json(); alert(err.error ?? 'Failed'); return }
      const rule = await res.json()
      setRules(prev => [...prev, rule])
      resetAdd()
    } finally {
      setSaving(false)
    }
  }

  async function patchRule(id: string, data: Partial<Rule>) {
    const res = await fetch(`/api/weight-pricing-rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setRules(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this pricing preset?')) return
    await fetch(`/api/weight-pricing-rules/${id}`, { method: 'DELETE' })
    setRules(prev => prev.filter(r => r.id !== id))
  }

  if (loading) return <div className="text-sm text-gray-400 py-4">Loading…</div>

  // ─── SALE SECTION ─────────────────────────────────────────────────────────
  if (section === 'sale') {
    const saleRules = rules.filter(r => r.ruleType === 'SALE')

    return (
      <div className="space-y-3">
        {saleRules.length > 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400 w-12">Icon</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Preset name</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400">$/kg</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Linked items</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Active</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {saleRules.map(rule => (
                  <tr key={rule.id} className={rule.isActive ? '' : 'opacity-50'}>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={rule.emoji ?? '📦'}
                        onChange={e => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, emoji: e.target.value } : r))}
                        onBlur={e => patchRule(rule.id, { emoji: e.target.value || '📦' })}
                        className="w-10 text-center text-lg bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded focus:outline-none focus:border-blue-400"
                        maxLength={2}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{rule.categoryName}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-900 dark:text-gray-100">
                      ${Number(rule.pricePerKg).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {rule._count?.business_products != null && rule._count.business_products > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                          {rule._count.business_products} item{rule._count.business_products !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => patchRule(rule.id, { isActive: !rule.isActive })}
                        className={`w-9 h-5 rounded-full transition-colors ${rule.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${rule.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => handleDelete(rule.id)} className="text-red-500 hover:text-red-700 text-xs">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {saleRules.length === 0 && !showAdd && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No selling presets yet. Add one to enable scale-based pricing at the POS.
          </p>
        )}

        {showAdd ? (
          <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 space-y-3">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">New selling preset</p>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Icon</label>
                <input
                  type="text"
                  value={newEmoji}
                  onChange={e => setNewEmoji(e.target.value)}
                  className="text-lg text-center border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-800 w-14"
                  maxLength={2}
                  placeholder="📦"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Preset name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Beef Mince, Fish Fillets"
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-44"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Price / kg</label>
                <input
                  type="number" step="0.01" min="0"
                  value={newPrice}
                  onChange={e => setNewPrice(e.target.value)}
                  placeholder="0.00"
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-28 font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={saving || !newName.trim() || !newPrice}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
                >
                  {saving ? 'Saving…' : 'Add Preset'}
                </button>
                <button onClick={resetAdd} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            + Add selling preset
          </button>
        )}
      </div>
    )
  }

  // ─── PURCHASE SECTION ──────────────────────────────────────────────────────
  const PURCHASE_TABS: { key: PurchaseType; label: string; emoji: string }[] = [
    { key: 'LIVESTOCK', label: 'Livestock', emoji: '🐄' },
    { key: 'GOODS', label: 'Goods', emoji: '🥦' },
  ]

  const tabRules = rules.filter(r => r.ruleType === 'PURCHASE' && r.purchaseType === purchaseTab)

  return (
    <div className="space-y-3">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {PURCHASE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setPurchaseTab(tab.key); resetAdd() }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              purchaseTab === tab.key
                ? 'bg-white dark:bg-gray-800 border border-b-white dark:border-b-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 -mb-px'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {tabRules.length === 0 && !showAdd && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No {purchaseTab === 'LIVESTOCK' ? 'livestock' : 'goods'} purchase presets yet.
        </p>
      )}

      {tabRules.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400 w-12">Icon</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Category</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400">$/kg</th>
                {purchaseTab === 'LIVESTOCK' && (
                  <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Derived from</th>
                )}
                <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Active</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {tabRules.map(rule => (
                <tr key={rule.id} className={rule.isActive ? '' : 'opacity-50'}>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={rule.emoji ?? '📦'}
                      onChange={e => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, emoji: e.target.value } : r))}
                      onBlur={e => patchRule(rule.id, { emoji: e.target.value || '📦' })}
                      className="w-10 text-center text-lg bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded focus:outline-none focus:border-blue-400"
                      maxLength={2}
                    />
                  </td>
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{rule.categoryName}</td>
                  <td className="px-3 py-2 text-right font-mono text-gray-900 dark:text-gray-100">
                    ${Number(rule.pricePerKg).toFixed(2)}
                  </td>
                  {purchaseTab === 'LIVESTOCK' && (
                    <td className="px-3 py-2 text-xs text-gray-400">
                      {rule.derivedFromUnitCount != null && rule.derivedFromUnitPrice != null && rule.derivedFromSampleWeightKg != null
                        ? `${rule.derivedFromUnitCount} × $${Number(rule.derivedFromUnitPrice).toFixed(2)} / ${Number(rule.derivedFromSampleWeightKg).toFixed(3)} kg`
                        : '—'}
                    </td>
                  )}
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => patchRule(rule.id, { isActive: !rule.isActive })}
                      className={`w-9 h-5 rounded-full transition-colors ${rule.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${rule.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => handleDelete(rule.id)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd ? (
        <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Icon</label>
              <input
                type="text"
                value={newEmoji}
                onChange={e => setNewEmoji(e.target.value)}
                className="text-lg text-center border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-800 w-14"
                maxLength={2}
                placeholder="📦"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={purchaseTab === 'LIVESTOCK' ? 'e.g. Whole Chicken' : 'e.g. Tomatoes'}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Price / kg
                {calcResult != null && newPrice === calcResult.toFixed(4) && (
                  <span className="ml-1 text-green-600 dark:text-green-400">(from calculator)</span>
                )}
              </label>
              <input
                type="number" step="0.0001" min="0"
                value={newPrice}
                onChange={e => setNewPrice(e.target.value)}
                placeholder="0.00"
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-28 font-mono"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving || !newName.trim() || !newPrice}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save Preset'}
              </button>
              <button onClick={resetAdd} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </div>

          {/* Price Calculator — LIVESTOCK only */}
          {purchaseTab === 'LIVESTOCK' && (
            <div>
              {!showCalc ? (
                <button
                  onClick={() => setShowCalc(true)}
                  className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
                >
                  🧮 Calculate $/kg from unit price (e.g. 5 chickens × $6/bird ÷ total weight)
                </button>
              ) : (
                <div className="mt-2 p-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10 space-y-3">
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                    Price Calculator — $/kg = (count × price/unit) ÷ total weight
                  </p>
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Count (animals)</label>
                      <input
                        type="number" min="1" step="1"
                        value={calc.unitCount}
                        onChange={e => setCalc(p => ({ ...p, unitCount: e.target.value }))}
                        placeholder="5"
                        className="w-20 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Price / unit ($)</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={calc.pricePerUnit}
                        onChange={e => setCalc(p => ({ ...p, pricePerUnit: e.target.value }))}
                        placeholder="6.00"
                        className="w-24 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Total weight (kg)</label>
                      <input
                        type="number" min="0" step="0.001"
                        value={calc.totalWeightKg}
                        onChange={e => setCalc(p => ({ ...p, totalWeightKg: e.target.value }))}
                        placeholder="14.500"
                        className="w-28 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div className="flex flex-col items-start gap-1">
                      {calcResult != null ? (
                        <>
                          <span className="text-xs text-gray-500 dark:text-gray-400">Result</span>
                          <span className="text-lg font-mono font-bold text-orange-700 dark:text-orange-300">
                            ${calcResult.toFixed(4)}/kg
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Enter values above</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { if (calcResult != null) { setNewPrice(calcResult.toFixed(4)); setShowCalc(false) } }}
                      disabled={calcResult == null}
                      className="px-3 py-1.5 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-40"
                    >
                      Use this price
                    </button>
                    <button
                      onClick={() => { setShowCalc(false); setCalc({ unitCount: '', totalWeightKg: '', pricePerUnit: '' }) }}
                      className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          + Add {purchaseTab === 'LIVESTOCK' ? 'livestock' : 'goods'} purchase preset
        </button>
      )}
    </div>
  )
}
