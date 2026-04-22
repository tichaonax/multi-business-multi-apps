'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'

interface Category {
  id: string
  name: string
  defaultDepreciationMethod?: string
  defaultUsefulLifeYears?: number | null
  defaultSalvageValuePct?: number | null
}

interface Props {
  businessId: string
  categories: Category[]
  onClose: () => void
  onSuccess: () => void
}

export default function AddAssetModal({ businessId, categories, onClose, onSuccess }: Props) {
  const { push: showToast, error: showError } = useToast()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    description: '',
    serialNumber: '',
    manufacturer: '',
    model: '',
    location: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    salvageValue: '',
    depreciationMethod: 'STRAIGHT_LINE',
    usefulLifeYears: '',
    notes: '',
  })

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const onCategoryChange = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId)
    setForm(prev => ({
      ...prev,
      categoryId,
      depreciationMethod: cat?.defaultDepreciationMethod || prev.depreciationMethod,
      usefulLifeYears: cat?.defaultUsefulLifeYears != null ? String(cat.defaultUsefulLifeYears) : prev.usefulLifeYears,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.purchaseDate || !form.purchasePrice) {
      showError('Name, purchase date and price are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, businessId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create asset')
      showToast(`Asset ${json.data.assetTag} created`)
      onSuccess()
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Error creating asset')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Asset</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asset Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select value={form.categoryId} onChange={e => onCategoryChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="">No Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Store Room"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serial Number</label>
              <input value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manufacturer</label>
              <input value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
              <input value={form.model} onChange={e => set('model', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Date *</label>
              <input type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Price *</label>
              <input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Depreciation Method</label>
              <select value={form.depreciationMethod} onChange={e => set('depreciationMethod', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="STRAIGHT_LINE">Straight-Line</option>
                <option value="DECLINING_BALANCE">Double-Declining Balance</option>
                <option value="NONE">None (Land / No Depreciation)</option>
              </select>
            </div>

            {form.depreciationMethod !== 'NONE' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Useful Life (years)</label>
                  <input type="number" min="1" value={form.usefulLifeYears} onChange={e => set('usefulLifeYears', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salvage Value</label>
                  <input type="number" min="0" step="0.01" value={form.salvageValue} onChange={e => set('salvageValue', e.target.value)} placeholder="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
              </>
            )}

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
