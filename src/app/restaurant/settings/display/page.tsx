'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { getImageFileFromClipboardEvent } from '@/hooks/use-clipboard-image-paste'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { SessionUser } from '@/lib/permission-utils'
import Link from 'next/link'

interface GlobalSettings {
  rotationIntervalSecs: number
  enableSmartDisplay: boolean
  enableSplitLayout: boolean
  maxItemsInRotation: number
  leftPanelCardCount: number
  rightPanelColumns: number
  rightPanelRows: number
}

interface DisplayItem {
  id: string
  itemType: 'menu_item' | 'ayli_combo'
  name: string
  price: number
  emoji: string | null
  imageUrl: string | null
  menuNumber: string | null
  sizes?: Array<{ sizeName: string; basePrice: number }>
  salesScore: number
  displayScore: number
  isFeatured: boolean
  isDailySpecial: boolean
  isHidden: boolean
  priorityBoost: number
  adImageId: string | null
  advertisingNote: string | null
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
    enableSmartDisplay: false,
    enableSplitLayout: true,
    maxItemsInRotation: 12,
    leftPanelCardCount: 2,
    rightPanelColumns: 2,
    rightPanelRows: 4,
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
        // all=true: this is a management screen (Item Priority), not the customer-facing
        // feed — it must see every item, hidden ones included, so a hidden item can
        // actually be found again and un-hidden. Also bypasses the maxItemsInRotation cap.
        fetch(`/api/business/${currentBusinessId}/display-smart-ads?businessType=restaurant&all=true`),
        fetch(`/api/business/${currentBusinessId}/display-smart-ads/settings`),
      ])
      const adsData = await adsRes.json()
      const settingsData = await settingsRes.json()

      setSettings(settingsData)

      // Merge config state from adsData onto each item
      const allItems: DisplayItem[] = []
      if (adsData.dailySpecial) {
        // The dailySpecial payload is built separately server-side and doesn't carry a
        // real isHidden value — defaulting to false here is a rare-case simplification
        // (a hidden daily special isn't a scenario the UI otherwise models).
        allItems.push({ ...adsData.dailySpecial, isDailySpecial: true, isHidden: false, priorityBoost: adsData.dailySpecial.priorityBoost ?? 0, adImageId: adsData.dailySpecial.adImageId ?? null, advertisingNote: adsData.dailySpecial.advertisingNote ?? null })
      }
      for (const item of (adsData.items ?? [])) {
        allItems.push({ ...item, isDailySpecial: false, priorityBoost: item.priorityBoost ?? 0, adImageId: item.adImageId ?? null, advertisingNote: item.advertisingNote ?? null })
      }
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
    priorityBoost: number; isFeatured: boolean; isHidden: boolean
    advertisingImageId: string | null; advertisingNote: string | null
  }>) {
    if (!currentBusinessId) return
    await fetch(`/api/business/${currentBusinessId}/display-smart-ads/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemType, itemId, ...patch }),
    })
    load()
  }

  // Shared by both the file-picker input and the per-row paste handler below —
  // a page-wide clipboard-paste listener can't tell which item's row the user
  // meant (this is a list of many independent upload targets, not one active
  // item), so each row's own onPaste calls this directly instead.
  async function uploadAdImage(itemType: string, itemId: string, file: File) {
    const fd = new FormData()
    fd.append('files', file)
    fd.append('businessId', currentBusinessId ?? '')
    const res = await fetch('/api/universal/images', { method: 'POST', body: fd })
    if (res.ok) {
      const data = await res.json()
      const imageId = data.data?.[0]?.filename
      if (imageId) await updateItemConfig(itemType, itemId, { advertisingImageId: imageId })
    }
  }

  // Today's Special is a real, separate system (DailySpecial + day override) — not a
  // per-item flag — so it's set/cleared via the daily-special endpoints, not the generic
  // display config PUT. Only ever one special active per day; setting a new one replaces
  // whatever was there, and it reverts to "no special" the next day unless set again.
  async function toggleDailySpecial(productId: string, isCurrentlySpecial: boolean) {
    if (!currentBusinessId) return
    if (isCurrentlySpecial) {
      // Must explicitly disable (not just delete the override) — if today's special is
      // coming from the weekly schedule rather than an override, deleting a (possibly
      // nonexistent) override row does nothing and the scheduled special stays active.
      await fetch('/api/restaurant/daily-special/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: currentBusinessId, isDisabled: true }),
      })
    } else {
      await fetch('/api/restaurant/daily-special/quick-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: currentBusinessId, productId }),
      })
    }
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

              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300 block mb-1">
                  Rotating cards (left panel)
                </label>
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">Fewer cards means each one — and its image — is bigger</div>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={1} max={3} step={1}
                    value={settings.leftPanelCardCount}
                    onChange={e => setSettings(s => ({ ...s, leftPanelCardCount: Number(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-8 text-right text-gray-900 dark:text-gray-100">
                    {settings.leftPanelCardCount}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300 block mb-1">
                  Menu grid columns (right panel)
                </label>
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">Fewer columns means each item card is wider</div>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={1} max={3} step={1}
                    value={settings.rightPanelColumns}
                    onChange={e => setSettings(s => ({ ...s, rightPanelColumns: Number(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-8 text-right text-gray-900 dark:text-gray-100">
                    {settings.rightPanelColumns}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300 block mb-1">
                  Menu grid rows (right panel)
                </label>
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">Fewer rows means each item card is taller</div>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={1} max={5} step={1}
                    value={settings.rightPanelRows}
                    onChange={e => setSettings(s => ({ ...s, rightPanelRows: Number(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-8 text-right text-gray-900 dark:text-gray-100">
                    {settings.rightPanelRows}
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
                    {/* Menu number badge — same circular style as Menu Numbers / Menu Availability */}
                    {item.menuNumber && (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-black text-xs leading-none flex-shrink-0">
                        {item.menuNumber.toUpperCase()}
                      </span>
                    )}
                    {/* Primary image (falls back to emoji when the item has no photo) + name */}
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-gray-100 dark:bg-gray-700" />
                    ) : (
                      <div className="text-2xl flex-shrink-0">{item.emoji ?? '🍽️'}</div>
                    )}
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
                          <span title="Today">T:{item.salesBreakdown?.today ?? 0}</span>
                          <span title="Yesterday">Y:{item.salesBreakdown?.yesterday ?? 0}</span>
                          <span title="Day before">D:{item.salesBreakdown?.dayBefore ?? 0}</span>
                        </div>
                      </div>

                      {/* Priority boost */}
                      <div className="flex items-center gap-2 mt-2">
                        <label className="text-xs text-gray-500 dark:text-gray-400">Boost:</label>
                        <input
                          type="number" min={0} max={100} step={5}
                          defaultValue={item.priorityBoost ?? 0}
                          disabled={!canManage}
                          onBlur={e => {
                            const val = Math.max(0, Math.min(100, Number(e.target.value)))
                            updateItemConfig(item.itemType, item.id, { priorityBoost: val })
                          }}
                          className="w-16 text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* Display image — defaults to the item's own primary/catalog photo when one
                          exists; "Add ad image" / "Use a different photo" overrides it with a
                          dedicated promo image. The override is what advertisingImageId stores —
                          removing it just falls back to the catalog photo, it doesn't blank the ad. */}
                      <div className="mt-2 flex items-center gap-3 flex-wrap">
                        {item.adImageId ? (
                          <>
                            <img src={`/api/images/${item.adImageId}`} alt="ad" className="w-24 h-16 object-cover rounded border border-gray-200 dark:border-gray-600" />
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">Dedicated ad photo</span>
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => updateItemConfig(item.itemType, item.id, { advertisingImageId: null })}
                                  className="text-xs text-red-500 hover:underline"
                                >
                                  {item.imageUrl ? 'Remove (use catalog photo instead)' : 'Remove image'}
                                </button>
                              )}
                            </div>
                          </>
                        ) : item.imageUrl ? (
                          <>
                            <img src={item.imageUrl} alt="" className="w-24 h-16 object-cover rounded border border-gray-200 dark:border-gray-600" />
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">Using catalog photo</span>
                              {canManage && (
                                <div
                                  tabIndex={0}
                                  onPaste={e => {
                                    const file = getImageFileFromClipboardEvent(e)
                                    if (file) { e.preventDefault(); uploadAdImage(item.itemType, item.id, file) }
                                  }}
                                  className="flex flex-col items-start gap-0.5 outline-none focus:ring-2 focus:ring-blue-400 rounded"
                                >
                                  <label className="cursor-pointer text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                    📷 Use a different ad photo
                                    <input
                                      type="file" accept="image/*" className="hidden"
                                      onChange={e => {
                                        const file = e.target.files?.[0]
                                        if (file) uploadAdImage(item.itemType, item.id, file)
                                        e.target.value = ''
                                      }}
                                    />
                                  </label>
                                  <span className="text-[10px] text-gray-400 dark:text-gray-500">click here, then paste (Ctrl+V)</span>
                                </div>
                              )}
                            </div>
                          </>
                        ) : canManage ? (
                          <div
                            tabIndex={0}
                            onPaste={e => {
                              const file = getImageFileFromClipboardEvent(e)
                              if (file) { e.preventDefault(); uploadAdImage(item.itemType, item.id, file) }
                            }}
                            className="flex flex-col items-start gap-0.5 outline-none focus:ring-2 focus:ring-blue-400 rounded"
                          >
                            <label className="cursor-pointer text-xs text-blue-600 dark:text-blue-400 hover:underline">
                              📷 Add ad image
                              <input
                                type="file" accept="image/*" className="hidden"
                                onChange={e => {
                                  const file = e.target.files?.[0]
                                  if (file) uploadAdImage(item.itemType, item.id, file)
                                  e.target.value = ''
                                }}
                              />
                            </label>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">click here, then paste (Ctrl+V)</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">No ad image</span>
                        )}
                      </div>

                      {/* Advertising note */}
                      <div className="mt-2">
                        <input
                          type="text"
                          placeholder="Ad note (e.g. BOGO, 20% off…)"
                          defaultValue={item.advertisingNote ?? ''}
                          disabled={!canManage}
                          onBlur={e => updateItemConfig(item.itemType, item.id, { advertisingNote: e.target.value.trim() || null })}
                          className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      {item.itemType === 'menu_item' && (
                        <button
                          type="button"
                          title={item.isDailySpecial ? "Remove today's special" : "Set as today's special (replaces whatever is currently set)"}
                          onClick={() => toggleDailySpecial(item.id, item.isDailySpecial)}
                          className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                            item.isDailySpecial
                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                          }`}
                        >
                          ⭐ Special
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!canManage}
                        title={item.isFeatured ? 'Remove from featured' : 'Feature this item (shown first in rotation)'}
                        onClick={() => canManage && updateItemConfig(item.itemType, item.id, { isFeatured: !item.isFeatured })}
                        className={`text-xs px-2 py-1 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          item.isFeatured
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                        }`}
                      >
                        ★ Feature
                      </button>
                      <button
                        type="button"
                        disabled={!canManage}
                        title={item.isHidden ? 'Show on display' : 'Hide from display'}
                        onClick={() => canManage && updateItemConfig(item.itemType, item.id, { isHidden: !item.isHidden })}
                        className={`text-xs px-2 py-1 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
