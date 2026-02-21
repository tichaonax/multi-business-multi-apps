'use client'

import { useState, useEffect } from 'react'
import { X, DollarSign, Wifi, ShoppingBag } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  description: string | null
  spendThreshold: number
  rewardType: 'CREDIT' | 'FREE_WIFI'
  rewardAmount: number
  rewardProductId: string | null
  wifiTokenConfigId: string | null
  rewardValidDays: number
  isActive: boolean
}

interface Product {
  id: string
  name: string
  basePrice: number
}

interface WifiConfig {
  id: string
  name: string
  durationValue: number
  durationUnit: string
}

interface CampaignFormProps {
  campaign: Campaign | null
  businessId: string
  onSave: () => void
  onClose: () => void
}

const EMPTY_FORM = {
  name: '',
  description: '',
  spendThreshold: '',
  hasCredit: true,
  creditAmount: '',
  hasProduct: false,
  productId: '',
  hasWifi: false,
  wifiConfigId: '',
  rewardValidDays: '30'
}

export function CampaignForm({ campaign, businessId, onSave, onClose }: CampaignFormProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [wifiConfigs, setWifiConfigs] = useState<WifiConfig[]>([])

  // Load products and wifi configs when form opens
  useEffect(() => {
    // Universal products API — returns { success, data: [...] } with basePrice field
    fetch(`/api/universal/products?businessId=${businessId}&limit=500`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          // Only show active, non-WiFi products with a price > 0
          const filtered = (d.data || []).filter((p: any) =>
            p.isActive !== false && !p.isWiFiToken && !p.isR710Token && Number(p.basePrice) > 0
          )
          setProducts(filtered)
        }
      })
      .catch(() => {})

    // R710 token configs — returns { configs: [...] }
    fetch(`/api/r710/token-configs?businessId=${businessId}`)
      .then(r => r.json())
      .then(d => { if (d.configs) setWifiConfigs(d.configs) })
      .catch(() => {})
  }, [businessId])

  useEffect(() => {
    if (campaign) {
      setForm({
        name: campaign.name,
        description: campaign.description || '',
        spendThreshold: String(campaign.spendThreshold),
        hasCredit: Number(campaign.rewardAmount) > 0,
        creditAmount: Number(campaign.rewardAmount) > 0 ? String(campaign.rewardAmount) : '',
        hasProduct: !!campaign.rewardProductId,
        productId: campaign.rewardProductId || '',
        hasWifi: !!campaign.wifiTokenConfigId,
        wifiConfigId: campaign.wifiTokenConfigId || '',
        rewardValidDays: String(campaign.rewardValidDays)
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [campaign])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.name.trim() || !form.spendThreshold) {
      setError('Campaign name and spend threshold are required.')
      return
    }
    if (!form.hasCredit && !form.hasProduct && !form.hasWifi) {
      setError('Select at least one reward: Credit, Free Item, or Free WiFi.')
      return
    }
    if (form.hasCredit && (!form.creditAmount || Number(form.creditAmount) <= 0)) {
      setError('Enter a valid credit amount greater than $0.')
      return
    }
    if (form.hasCredit) {
      const credit = Number(form.creditAmount)
      const threshold = parseFloat(form.spendThreshold)
      const maxAllowed = Math.min(5, threshold * 0.10)
      if (credit > maxAllowed) {
        setError(`Credit cannot exceed $5 or 10% of the spend threshold ($${maxAllowed.toFixed(2)}).`)
        return
      }
    }
    if (form.hasProduct && !form.productId) {
      setError('Select a product for the free item reward.')
      return
    }
    if (form.hasWifi && !form.wifiConfigId) {
      setError('Select a WiFi package for the free WiFi reward.')
      return
    }

    setSaving(true)
    try {
      const url = campaign
        ? `/api/business/${businessId}/promo-campaigns/${campaign.id}`
        : `/api/business/${businessId}/promo-campaigns`

      const method = campaign ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          spendThreshold: parseFloat(form.spendThreshold),
          rewardType: form.hasCredit ? 'CREDIT' : 'FREE_WIFI',
          rewardAmount: form.hasCredit ? parseFloat(form.creditAmount) : 0,
          rewardProductId: form.hasProduct ? form.productId : null,
          wifiTokenConfigId: form.hasWifi ? form.wifiConfigId : null,
          rewardValidDays: parseInt(form.rewardValidDays) || 30
        })
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to save campaign')
      onSave()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save campaign')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-lg font-semibold text-primary">
            {campaign ? 'Edit Campaign' : 'New Campaign'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-primary mb-1">Campaign Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Monthly Loyalty Reward"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-primary text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional details about this campaign"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-primary text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Monthly Spend Threshold *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.spendThreshold}
                onChange={e => setForm(f => ({ ...f, spendThreshold: e.target.value }))}
                placeholder="50.00"
                className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-primary text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-secondary mt-1">Customer must spend at least this amount in a calendar month</p>
          </div>

          {/* Rewards section — at least one required */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Rewards * <span className="text-xs font-normal text-secondary">(select at least one)</span></label>
            <div className="space-y-2">

              {/* Dollar Credit */}
              <div>
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    form.hasCredit
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                  onClick={() => setForm(f => ({ ...f, hasCredit: !f.hasCredit }))}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    form.hasCredit ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                  }`}>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-primary">Dollar Credit</div>
                    <div className="text-xs text-secondary">Applied as discount on next purchase</div>
                  </div>
                  <input type="checkbox" checked={form.hasCredit} onChange={() => {}} className="w-4 h-4 text-blue-600 pointer-events-none" />
                </div>
                {form.hasCredit && (
                  <div className="ml-11 mt-1.5 relative" onClick={e => e.stopPropagation()}>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.creditAmount}
                      onChange={e => setForm(f => ({ ...f, creditAmount: e.target.value }))}
                      placeholder="5.00"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-primary text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {/* Free Menu Item */}
              <div>
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    form.hasProduct
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                  onClick={() => setForm(f => ({ ...f, hasProduct: !f.hasProduct }))}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    form.hasProduct ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                  }`}>
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-primary">Free Menu Item</div>
                    <div className="text-xs text-secondary">A specific product added free to the order</div>
                  </div>
                  <input type="checkbox" checked={form.hasProduct} onChange={() => {}} className="w-4 h-4 text-purple-600 pointer-events-none" />
                </div>
                {form.hasProduct && (
                  <div className="ml-11 mt-1.5" onClick={e => e.stopPropagation()}>
                    <select
                      value={form.productId}
                      onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-primary text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select a product...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (${Number(p.basePrice).toFixed(2)})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Free WiFi */}
              <div>
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    form.hasWifi
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                  onClick={() => setForm(f => ({ ...f, hasWifi: !f.hasWifi }))}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    form.hasWifi ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                  }`}>
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-primary">Free WiFi Access</div>
                    <div className="text-xs text-secondary">A token from the selected WiFi package</div>
                  </div>
                  <input type="checkbox" checked={form.hasWifi} onChange={() => {}} className="w-4 h-4 text-green-600 pointer-events-none" />
                </div>
                {form.hasWifi && (
                  <div className="ml-11 mt-1.5" onClick={e => e.stopPropagation()}>
                    <select
                      value={form.wifiConfigId}
                      onChange={e => setForm(f => ({ ...f, wifiConfigId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-primary text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Select a WiFi package...</option>
                      {wifiConfigs.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.durationValue} {c.durationUnit.split('_')[0]})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1">Reward Valid (days)</label>
            <input
              type="number"
              min="1"
              max="365"
              value={form.rewardValidDays}
              onChange={e => setForm(f => ({ ...f, rewardValidDays: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-primary text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-secondary mt-1">How many days customers have to use their reward</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-secondary hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : campaign ? 'Save Changes' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
