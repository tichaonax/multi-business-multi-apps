'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface DisplaySettings {
  rotationIntervalSecs: number
  enableSplitLayout: boolean
  maxItemsInRotation: number
}

interface DisplayItem {
  id: string
  itemType: 'menu_item' | 'product' | 'ayli_combo' | 'category'
  name: string
  price: number
  emoji: string | null
  category?: string | null
  sizes?: Array<{ sizeName: string; basePrice: number }>
  salesScore: number
  displayScore: number
  isFeatured: boolean
  salesBreakdown: { today: number; yesterday: number; dayBefore: number }
}

interface SmartProductDisplayProps {
  businessId: string
  businessType: 'restaurant' | 'grocery' | 'clothing'
}

function fmt(p: number) { return `$${p.toFixed(2)}` }

/** Compact daily special card — designed for the narrow left panel */
function DailySpecialCard({ item }: { item: DisplayItem }) {
  return (
    <div className="relative rounded-2xl overflow-hidden h-full
      bg-gradient-to-br from-amber-900 via-orange-900 to-red-900
      border border-amber-500/40 flex flex-col justify-between p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">⭐</span>
        <span className="bg-amber-400 text-gray-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
          Today&apos;s Special
        </span>
      </div>
      <div className="flex items-center gap-3 flex-1 min-h-0">
        <span className="text-5xl flex-shrink-0">{item.emoji ?? '🍽️'}</span>
        <div className="min-w-0">
          <div className="text-white font-bold text-lg leading-tight line-clamp-2 mb-2">{item.name}</div>
          {item.sizes && item.sizes.length > 0 ? (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {item.sizes.map(s => (
                <div key={s.sizeName} className="flex items-baseline gap-1">
                  <span className="text-white/40 text-[10px] capitalize">{s.sizeName[0]}</span>
                  <span className="text-amber-300 font-black text-xl leading-none animate-pulse"
                    style={{ textShadow: '0 0 16px rgba(252,211,77,0.55)' }}>
                    {fmt(s.basePrice)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="font-black text-amber-300 text-3xl leading-none animate-pulse"
              style={{ textShadow: '0 0 24px rgba(252,211,77,0.6)' }}>
              {fmt(item.price)}
            </div>
          )}
        </div>
      </div>
      {item.salesBreakdown.today > 0 && (
        <div className="text-amber-200/60 text-xs mt-2">🔥 {item.salesBreakdown.today} served today</div>
      )}
    </div>
  )
}

/** Rotating item card for the left panel — vertical layout, large fonts */
function RotatingCard({ item }: { item: DisplayItem }) {
  const isAyli = item.itemType === 'ayli_combo'
  return (
    <div className={`
      relative h-full rounded-xl border flex flex-col p-4 overflow-hidden
      ${isAyli
        ? 'bg-gradient-to-br from-emerald-900/60 to-teal-900/40 border-emerald-500/30'
        : 'bg-gradient-to-br from-gray-800 to-gray-900 border-white/8'}
    `}>
      {item.isFeatured && (
        <div className="absolute top-2 right-2 bg-amber-400 text-gray-900 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide">
          Featured
        </div>
      )}

      {/* Top 60%: emoji + name */}
      <div className="flex-[3] flex flex-col justify-start" style={{ flex: 3 }}>
        <div className="text-5xl mb-2">{item.emoji ?? '🍽️'}</div>
        <div className="text-white font-bold text-3xl leading-snug line-clamp-2">
          {item.name}
        </div>
      </div>

      {/* Bottom 40%: price */}
      <div className="flex flex-col justify-start pt-2" style={{ flex: 2 }}>
        {item.sizes && item.sizes.length > 0 ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {item.sizes.map(s => (
              <div key={s.sizeName} className="flex items-baseline gap-1">
                <span className="text-white/40 text-xs capitalize">{s.sizeName[0]}</span>
                <span className="text-emerald-400 font-black text-3xl leading-none animate-pulse"
                  style={{ textShadow: '0 0 20px rgba(52,211,153,0.45)' }}>
                  {fmt(s.basePrice)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="font-black text-emerald-400 text-5xl leading-none animate-pulse"
            style={{ textShadow: '0 0 30px rgba(52,211,153,0.5)' }}>
            {fmt(item.price)}
          </div>
        )}
        {item.salesBreakdown.today > 0 && (
          <div className="text-[11px] text-emerald-300/60 font-semibold mt-1">
            {item.salesBreakdown.today} sold today
          </div>
        )}
      </div>
    </div>
  )
}

export function SmartProductDisplay({ businessId, businessType }: SmartProductDisplayProps) {
  const [settings, setSettings] = useState<DisplaySettings>({
    rotationIntervalSecs: 6,
    enableSplitLayout: true,
    maxItemsInRotation: 12,
  })
  const [dailySpecial, setDailySpecial] = useState<DisplayItem | null>(null)
  const [items, setItems] = useState<DisplayItem[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [fade, setFade] = useState(true) // true = visible
  const [isLoading, setIsLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/business/${businessId}/display-smart-ads?businessType=${businessType}`)
      if (!res.ok) return
      const data = await res.json()
      setSettings(data.settings ?? settings)
      setDailySpecial(data.dailySpecial ?? null)
      setItems(data.items ?? [])
      setCurrentIdx(0)
    } catch { /* silent */ }
    finally { setIsLoading(false) }
  }, [businessId, businessType])

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [fetchData])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'DISPLAY_REFRESH') fetchData()
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [fetchData])

  // Advance the window of 3 by 1 item each tick
  useEffect(() => {
    if (items.length <= 3) return
    const ms = (settings.rotationIntervalSecs || 6) * 1000
    intervalRef.current = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setCurrentIdx(prev => (prev + 1) % items.length)
        setFade(true)
      }, 350)
    }, ms)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [items.length, settings.rotationIntervalSecs])

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-900">
        <div className="text-white/30 text-lg animate-pulse">Loading…</div>
      </div>
    )
  }

  if (items.length === 0 && !dailySpecial) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-white/25">
          <div className="text-5xl mb-3">🍽️</div>
          <div className="text-lg font-bold">Welcome</div>
          <div className="text-sm mt-1">Ask staff for today&apos;s menu</div>
        </div>
      </div>
    )
  }

  // Pick 3 consecutive items from the rotation pool
  const n = items.length
  const visible = n === 0 ? [] : [
    items[currentIdx % n],
    items[(currentIdx + 1) % n],
    items[(currentIdx + 2) % n],
  ].filter(Boolean)

  // If daily special takes up some space, show fewer rotating items
  const slotCount = dailySpecial ? 2 : 3
  const rotatingItems = visible.slice(0, slotCount)

  return (
    <div className="h-full w-full bg-gray-950 p-2 flex flex-col gap-2">
      {/* Daily special — top slot (only if set) */}
      {dailySpecial && (
        <div className="flex-shrink-0" style={{ height: '34%' }}>
          <DailySpecialCard item={dailySpecial} />
        </div>
      )}

      {/* 3 (or 2) rotating item slots — fill remaining height */}
      <div
        className="flex-1 flex flex-col gap-2 transition-opacity duration-350"
        style={{ opacity: fade ? 1 : 0 }}
      >
        {rotatingItems.map((item, i) => (
          <div key={`${item.id}-${i}`} className="flex-1">
            <RotatingCard item={item} />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {n > 3 && (
        <div className="flex justify-center gap-1 py-0.5 flex-shrink-0">
          {Array.from({ length: Math.min(n, 8) }).map((_, i) => (
            <div key={i}
              className={`rounded-full transition-all ${
                i === currentIdx % Math.min(n, 8) ? 'w-3 h-1.5 bg-white/60' : 'w-1.5 h-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
