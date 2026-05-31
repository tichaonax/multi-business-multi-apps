'use client'

import { useEffect, useState } from 'react'

interface Rule {
  id: string
  categoryName: string
  ruleType: string
  pricePerKg: number
  emoji: string
  isActive: boolean
}

interface Props {
  businessId: string
}

const RULE_TYPES = ['PURCHASE', 'SALE']

export function WeightPricingSettings({ businessId }: Props) {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newRule, setNewRule] = useState({ categoryName: '', ruleType: 'PURCHASE', pricePerKg: '', emoji: '📦' })

  useEffect(() => {
    fetch(`/api/weight-pricing-rules?businessId=${businessId}`)
      .then((r) => r.json())
      .then((data) => setRules(data))
      .finally(() => setLoading(false))
  }, [businessId])

  async function handleAdd() {
    if (!newRule.categoryName.trim() || !newRule.pricePerKg) return
    setSaving(true)
    try {
      const res = await fetch('/api/weight-pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          categoryName: newRule.categoryName.trim(),
          ruleType: newRule.ruleType,
          pricePerKg: parseFloat(newRule.pricePerKg),
          emoji: newRule.emoji || '📦',
        }),
      })
      if (!res.ok) { const err = await res.json(); alert(err.error ?? 'Failed'); return }
      const rule = await res.json()
      setRules((prev) => [...prev, rule])
      setNewRule({ categoryName: '', ruleType: 'PURCHASE', pricePerKg: '', emoji: '📦' })
      setShowAdd(false)
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
      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this pricing rule?')) return
    await fetch(`/api/weight-pricing-rules/${id}`, { method: 'DELETE' })
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  if (loading) return <div className="text-sm text-gray-400 py-4">Loading rules…</div>

  return (
    <div className="space-y-3">
      {rules.length === 0 && !showAdd && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No pricing rules configured yet.</p>
      )}

      {rules.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400 w-12">Icon</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Category</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Type</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400">$/kg</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Active</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rules.map((rule) => (
                <tr key={rule.id} className={rule.isActive ? '' : 'opacity-50'}>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={rule.emoji ?? '📦'}
                      onChange={(e) => setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, emoji: e.target.value } : r))}
                      onBlur={(e) => patchRule(rule.id, { emoji: e.target.value || '📦' })}
                      className="w-10 text-center text-lg bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded focus:outline-none focus:border-blue-400"
                      maxLength={2}
                      title="Click to change emoji"
                    />
                  </td>
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{rule.categoryName}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      rule.ruleType === 'PURCHASE'
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    }`}>
                      {rule.ruleType}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-900 dark:text-gray-100">
                    {Number(rule.pricePerKg).toFixed(2)}
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
                    <button onClick={() => handleDelete(rule.id)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd ? (
        <div className="flex flex-wrap gap-2 items-end p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Icon</label>
            <input
              type="text"
              value={newRule.emoji}
              onChange={(e) => setNewRule((p) => ({ ...p, emoji: e.target.value }))}
              className="text-lg text-center border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-800 w-14"
              maxLength={2}
              placeholder="📦"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category name</label>
            <input
              type="text"
              value={newRule.categoryName}
              onChange={(e) => setNewRule((p) => ({ ...p, categoryName: e.target.value }))}
              placeholder="e.g. Whole Chicken"
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
            <select
              value={newRule.ruleType}
              onChange={(e) => setNewRule((p) => ({ ...p, ruleType: e.target.value }))}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {RULE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Price / kg</label>
            <input
              type="number" step="0.01" min="0"
              value={newRule.pricePerKg}
              onChange={(e) => setNewRule((p) => ({ ...p, pricePerKg: e.target.value }))}
              placeholder="0.00"
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-28 font-mono"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving || !newRule.categoryName.trim() || !newRule.pricePerKg}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewRule({ categoryName: '', ruleType: 'PURCHASE', pricePerKg: '', emoji: '📦' }) }}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          + Add pricing rule
        </button>
      )}
    </div>
  )
}
