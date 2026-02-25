'use client'

import { useState, useEffect } from 'react'
import { SalesPerfBadge } from '@/components/pos/SalesPerfBadge'
import type { SalesPerfThresholds } from '@/components/pos/SalesPerfBadge'

interface SalesPerformanceSettingsProps {
  businessId: string
  businessType: string
  posLink: string
}

export function SalesPerformanceSettings({
  businessId,
  businessType,
  posLink,
}: SalesPerformanceSettingsProps) {
  const [fairMin, setFairMin] = useState(100)
  const [goodMin, setGoodMin] = useState(150)
  const [maxBar, setMaxBar]   = useState(200)

  const [loading, setSaving]   = useState(false)
  const [fetching, setFetching] = useState(true)
  const [success, setSuccess]  = useState(false)
  const [error, setError]      = useState<string | null>(null)

  // Load current thresholds from API
  useEffect(() => {
    if (!businessId) return
    setFetching(true)
    fetch(`/api/universal/business-config?businessId=${businessId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((cfg) => {
        const t = cfg?.data?.pos?.salesPerformanceThresholds
        if (t?.fairMin) setFairMin(t.fairMin)
        if (t?.goodMin) setGoodMin(t.goodMin)
        if (t?.maxBar)  setMaxBar(t.maxBar)
      })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [businessId])

  // Live preview thresholds derived from current input values
  const previewThresholds: SalesPerfThresholds = { fairMin, goodMin, maxBar }

  // Client-side validation
  const validationError =
    fairMin < 1            ? 'Fair minimum must be at least 1' :
    goodMin <= fairMin     ? 'Good minimum must be greater than Fair minimum' :
    maxBar < goodMin       ? 'Progress bar max must be ≥ Good minimum' :
    null

  const handleSave = async () => {
    if (validationError) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Read full current config first to avoid clobbering other settings
      const getRes = await fetch(`/api/universal/business-config?businessId=${businessId}`)
      const current = getRes.ok ? await getRes.json() : {}
      const currentPos = current?.data?.pos ?? {}

      const res = await fetch('/api/universal/business-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          businessType,
          pos: {
            ...currentPos,
            salesPerformanceThresholds: { fairMin, goodMin, maxBar },
          },
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body?.error || `Save failed (${res.status})`)
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (e: any) {
      setError(e.message ?? 'Unexpected error')
    } finally {
      setSaving(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading settings…
      </div>
    )
  }

  // Sample sales values for the live preview
  const previewSamples = [
    Math.round(fairMin * 0.5),
    fairMin,
    goodMin,
    Math.round(maxBar * 0.9),
  ]

  return (
    <div className="max-w-xl space-y-8">

      {/* ── Threshold Inputs ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            📊 Sales Performance Thresholds
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Set the daily sales targets that define 🔴 Low / 🟡 Fair / 🟢 Good for this business.
          </p>
        </div>

        {/* Low label — auto-derived */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">🔴 Low</div>
            <div className="text-xs text-gray-400">Anything below Fair minimum</div>
          </div>
          <span className="text-sm text-gray-400 italic">auto: &lt; ${fairMin}</span>
        </div>

        {/* Fair Min */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              🟡 Fair minimum
            </label>
            <div className="text-xs text-gray-400 mt-0.5">Sales reach this amount = Fair</div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 text-sm">$</span>
            <input
              type="number"
              min={1}
              value={fairMin}
              onChange={(e) => setFairMin(Number(e.target.value))}
              className="w-24 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Good Min */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              🟢 Good minimum
            </label>
            <div className="text-xs text-gray-400 mt-0.5">Sales reach this amount = Good</div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 text-sm">$</span>
            <input
              type="number"
              min={1}
              value={goodMin}
              onChange={(e) => setGoodMin(Number(e.target.value))}
              className="w-24 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Max Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              📊 Progress bar max
            </label>
            <div className="text-xs text-gray-400 mt-0.5">Bar fills to 100% at this amount</div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 text-sm">$</span>
            <input
              type="number"
              min={1}
              value={maxBar}
              onChange={(e) => setMaxBar(Number(e.target.value))}
              className="w-24 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Validation error */}
        {validationError && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
            <span>⚠️</span>
            <span>{validationError}</span>
          </div>
        )}
      </div>

      {/* ── Live Preview ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Live Preview</h3>
        <div className="space-y-2">
          {previewSamples.map((sampleSales) => (
            <div
              key={sampleSales}
              className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300 w-20">
                ${sampleSales.toFixed(2)}
              </span>
              <SalesPerfBadge sales={sampleSales} thresholds={previewThresholds} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Save button + feedback ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={!!validationError || loading}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Saving…' : 'Save Settings'}
        </button>

        {success && (
          <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            ✅ Saved! Changes take effect on next POS load.
          </span>
        )}
        {error && (
          <span className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            ❌ {error}
          </span>
        )}
      </div>
    </div>
  )
}
