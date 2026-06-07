'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { SessionUser } from '@/lib/permission-utils'
import Link from 'next/link'

interface GlobalSettings {
  rotationIntervalSecs: number
  enableSmartDisplay: boolean
  enableSplitLayout: boolean
  maxItemsInRotation: number
}

interface DisplayItem {
  id: string
  itemType: 'menu_item' | 'ayli_combo'
  name: string
  price: number
  emoji: string | null
  sizes?: Array<{ sizeName: string; basePrice: number }>
  salesScore: number
  displayScore: number
  isFeatured: boolean
  isDailySpecial: boolean
  isHidden: boolean
  priorityBoost: number
  salesBreakdown: { today: number; yesterday: number; dayBefore: number }
}

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (score / max) * 100) : 0
  return (
    <div className="flex items-center gap-2 w-32">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">{score}</span>
    </div>
  )
}

export default function RestaurantDisplaySettingsPage() {
  const { data: session } = useSession()
  const { currentBusinessId, hasPermission, loading } = useBusinessPermissionsContext()
  const [isMounted, setIsMounted] = useState(false)

  const sessionUser = session?.user as SessionUser
  const isAdmin = sessionUser?.role === 'admin'
  const canAccess = isAdmin || hasPermission('canViewCustomerDisplay') || hasPermission('canManageCustomerDisplay')
  const canManage = isAdmin || hasPermission('canManageCustomerDisplay')

  const [settings, setSettings] = useState<GlobalSettings>({
    rotationIntervalSecs: 6,
    enableSmartDisplay: true,
    enableSplitLayout: true,
    maxItemsInRotation: 12,
  })
  const [items, setItems] = useState<DisplayItem[]>([])
  const [dailySpecial, setDailySpecial] = useState<DisplayItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => { setIsMounted(true) }, [])

  const load = useCallback(async () => {
    if (!currentBusinessId) return
    setDataLoading(true)
    try {
      const [adsRes, settingsRes] = await Promise.all([
        fetch(`/api/business/${currentBusinessId}/display-smart-ads?businessType=restaurant`),
        fetch(`/api/business/${currentBusinessId}/display-smart-ads/settings`),
      ])
      const adsData = await adsRes.json()
      const settingsData = await settingsRes.json()

      setSettings(settingsData)

      // Merge config state from adsData onto each item
      const allItems: DisplayItem[] = []
      if (adsData.dailySpecial) {
        allItems.push({ ...adsData.dailySpecial, isDailySpecial: true, isHidden: false, priorityBoost: adsData.dailySpecial.priorityBoost ?? 0 })
      }
      for (const item of (adsData.items ?? [])) {
        allItems.push({ ...item, isDailySpecial: false, isHidden: false, priorityBoost: item.priorityBoost ?? 0 })
      }
      // Also need hidden items — re-fetch with all items via a second request
      // For now, show all returned items (hidden items excluded by API; management screen shows them separately via configs)
      setDailySpecial(adsData.dailySpecial ?? null)
      setItems(adsData.items ?? [])
    } catch {
      // ignore
    } finally {
      setDataLoading(false)
    }
  }, [currentBusinessId])

  useEffect(() => { if (currentBusinessId) load() }, [currentBusinessId, load])

  async function saveSettings() {
    if (!currentBusinessId) return
    setSaving(true)
    try {
      await fetch(`/api/business/${currentBusinessId}/display-smart-ads/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      // Broadcast refresh to customer display
      const bc = new BroadcastChannel('customer-display')
      bc.postMessage({ type: 'DISPLAY_REFRESH', businessId: currentBusinessId, terminalId: null, payload: {} })
      bc.close()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  async function updateItemConfig(itemType: string, itemId: string, patch: Partial<{
    priorityBoost: number; isDailySpecial: boolean; isFeatured: boolean; isHidden: boolean
  }>) {
    if (!currentBusinessId) return
    await fetch(`/api/business/${currentBusinessId}/display-smart-ads/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemType, itemId, ...patch }),
    })
    load()
  }

  if (!isMounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl">🔒</div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">You don&apos;t have permission to manage display settings.</p>
        </div>
      </div>
    )
  }

  const allDisplayItems = dailySpecial
    ? [dailySpecial, ...items]
    : items
  const maxScore = Math.max(...allDisplayItems.map(i => i.displayScore), 1)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/restaurant/settings/pos" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm">
            ← Settings
          </Link>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">📺 Customer Display</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Control what appears on the customer-facing screen when no sale is in progress.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

        {/* Left: Global Settings */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Global Settings</h2>

            <div className="space-y-4">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700 dark:text-gray-300">Smart display enabled</span>
                <button
                  type="button"
                  disabled={!canManage}
                  onClick={() => canManage && setSettings(s => ({ ...s, enableSmartDisplay: !s.enableSmartDisplay }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${settings.enableSmartDisplay ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.enableSmartDisplay ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </label>

              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700 dark:text-gray-300">Daily Special left panel</span>
                <button
                  type="button"
                  disabled={!canManage}
                  onClick={() => canManage && setSettings(s => ({ ...s, enableSplitLayout: !s.enableSplitLayout }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${settings.enableSplitLayout ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.enableSplitLayout ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </label>

              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300 block mb-1">
                  Rotation speed (seconds)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={3} max={30} step={1}
                    value={settings.rotationIntervalSecs}
                    onChange={e => setSettings(s => ({ ...s, rotationIntervalSecs: Number(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-8 text-right text-gray-900 dark:text-gray-100">
                    {settings.rotationIntervalSecs}s
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300 block mb-1">
                  Max items in rotation
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={3} max={20} step={1}
                    value={settings.maxItemsInRotation}
                    onChange={e => setSettings(s => ({ ...s, maxItemsInRotation: Number(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-8 text-right text-gray-900 dark:text-gray-100">
                    {settings.maxItemsInRotation}
                  </span>
                </div>
              </div>
            </div>

            {canManage && (
              <button
                type="button"
                onClick={saveSettings}
                disabled={saving}
                className={`mt-5 w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                  saved
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                }`}
              >
                {saved ? '✓ Saved & display refreshed' : saving ? 'Saving…' : 'Save Settings'}
              </button>
            )}
          </div>

          {/* Score legend */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Score Formula</h3>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <div>Today × 3 + Yesterday × 2 + Day before × 1</div>
              <div>+ Priority boost × 10</div>
              <div className="text-gray-400 dark:text-gray-500 mt-2">Higher score = shown first in rotation</div>
            </div>
          </div>
        </div>

        {/* Right: Item Priority List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Item Priority</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">{allDisplayItems.length} items</span>
          </div>

          {dataLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading items…</div>
          ) : allDisplayItems.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No menu items found. Add products in the restaurant menu first.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {allDisplayItems.map(item => (
                <div key={`${item.itemType}:${item.id}`} className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    {/* Emoji + name */}
                    <div className="text-2xl flex-shrink-0">{item.emoji ?? '🍽️'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{item.name}</span>
                        {item.isDailySpecial && (
                          <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            ⭐ DAILY SPECIAL
                          </span>
                        )}
                        {item.isFeatured && !item.isDailySpecial && (
                          <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            ★ FEATURED
                          </span>
                        )}
                        {item.itemType === 'ayli_combo' && (
                          <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] px-1.5 py-0.5 rounded">
                            AYLI
                          </span>
                        )}
                      </div>

                      {/* Sales breakdown */}
                      <div className="flex items-center gap-3 mt-1">
                        <ScoreBar score={item.displayScore} max={maxScore} />
                        <div className="text-xs text-gray-400 dark:text-gray-500 space-x-2">
                          <span title="Today">T:{item.salesBreakdown.today}</span>
                          <span title="Yesterday">Y:{item.salesBreakdown.yesterday}</span>
                          <span title="Day before">D:{item.salesBreakdown.dayBefore}</span>
                        </div>
                      </div>

                      {/* Priority boost */}
                      <div className="flex items-center gap-2 mt-2">
                        <label className="text-xs text-gray-500 dark:text-gray-400">Boost:</label>
                        <input
                          type="number" min={0} max={100} step={5}
                          defaultValue={item.priorityBoost ?? 0}
                          onBlur={e => {
                            const val = Math.max(0, Math.min(100, Number(e.target.value)))
                            updateItemConfig(item.itemType, item.id, { priorityBoost: val })
                          }}
                          className="w-16 text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        title={item.isDailySpecial ? 'Remove daily special' : 'Set as daily special (clears previous)'}
                        onClick={() => updateItemConfig(item.itemType, item.id, { isDailySpecial: !item.isDailySpecial })}
                        className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                          item.isDailySpecial
                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                        }`}
                      >
                        ⭐ Special
                      </button>
                      <button
                        type="button"
                        title={item.isFeatured ? 'Remove from featured' : 'Feature this item (shown first in rotation)'}
                        onClick={() => updateItemConfig(item.itemType, item.id, { isFeatured: !item.isFeatured })}
                        className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                          item.isFeatured
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                        }`}
                      >
                        ★ Feature
                      </button>
                      <button
                        type="button"
                        title={item.isHidden ? 'Show on display' : 'Hide from display'}
                        onClick={() => updateItemConfig(item.itemType, item.id, { isHidden: !item.isHidden })}
                        className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                          item.isHidden
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30'
                        }`}
                      >
                        🚫 Hide
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
