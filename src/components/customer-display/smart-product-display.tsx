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
  // New fields
  menuNumber?: string | null
  productImages?: string[]  // array of imageIds
  adImageId?: string | null
  spiceLevel?: number | null
  preparationTime?: number | null
  poolItems?: Array<{ name: string; emoji: string; pricePerKgSmall: number; pricePerKgMedium: number; pricePerKgLarge: number }>
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

/** Rotating item card for the left panel — with image cycling, menu number, spice level */
function RotatingCard({ item }: { item: DisplayItem }) {
  const isAyli = item.itemType === 'ayli_combo'

  // Build ordered image list: productImages first, then adImageId if not already included
  const allImageIds = (() => {
    const ids = [...(item.productImages ?? [])]
    if (item.adImageId && !ids.includes(item.adImageId)) ids.push(item.adImageId)
    return ids
  })()

  const [imgIdx, setImgIdx] = useState(0)
  const imgRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cycle through images every 2.5 seconds when there are multiple (regular items only)
  useEffect(() => {
    setImgIdx(0)
    if (isAyli || allImageIds.length <= 1) return
    imgRef.current = setInterval(() => {
      setImgIdx(prev => (prev + 1) % allImageIds.length)
    }, 2500)
    return () => { if (imgRef.current) clearInterval(imgRef.current) }
  }, [allImageIds.length, item.id, isAyli])

  const currentImageId = allImageIds[imgIdx] ?? null
  const hasImage = !!currentImageId

  return (
    // min-h-0 is critical: overrides flex item default min-height:auto so all cards stay equal height
    <div className={`
      relative h-full min-h-0 rounded-xl border flex flex-col overflow-hidden
      ${isAyli
        ? 'bg-gradient-to-br from-emerald-900/60 to-teal-900/40 border-emerald-500/30'
        : 'bg-gradient-to-br from-gray-800 to-gray-900 border-white/8'}
    `}>
      {/* Menu number circle badge — top-right */}
      {item.menuNumber && (
        <div className="absolute top-2 right-2 z-20 flex items-center justify-center w-16 h-16 rounded-full bg-white text-gray-900 font-black text-4xl leading-none shadow-xl">
          {item.menuNumber!.toUpperCase()}
        </div>
      )}

      {/* Featured badge — offset if menu number present */}
      {item.isFeatured && !item.menuNumber && (
        <div className="absolute top-2 right-2 z-20 bg-amber-400 text-gray-900 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide">
          Featured
        </div>
      )}

      {/* ── AYLI combo: pool items listed, image fills remaining space ── */}
      {isAyli ? (
        <div className="flex flex-col p-4 flex-1 min-h-0">
          {/* Header — always visible */}
          <div className="flex-shrink-0">
            <div className="text-white font-bold text-2xl leading-snug line-clamp-1 mb-1">{item.name}</div>
            <div className="text-emerald-300/80 text-xs font-semibold mb-2 uppercase tracking-wide">
              ⚖️ Build your own — choose portions &amp; size
            </div>
          </div>

          {/* Pool items — flex-shrink-0 so they always show (not clipped to 0) */}
          {(item.poolItems ?? []).length > 0 && (
            <div className="flex-shrink-0 space-y-1 mb-2">
              {(item.poolItems ?? []).map((pi, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base flex-shrink-0">{pi.emoji}</span>
                    <span className="text-white/90 text-sm font-medium truncate">{pi.name}</span>
                  </div>
                  <span className="text-emerald-400 text-xs font-bold flex-shrink-0">
                    ${pi.pricePerKgMedium.toFixed(2)}/kg
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Ad image fills all remaining space below pool items */}
          {item.adImageId && (
            <div className="flex-1 min-h-0 rounded-lg overflow-hidden">
              <img
                src={`/api/images/${item.adImageId}`}
                alt={item.name}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
              />
            </div>
          )}

          {/* Sizes pinned to bottom */}
          {item.sizes && item.sizes.length > 0 && (
            <div className="flex gap-3 pt-1 border-t border-white/10 flex-shrink-0 mt-auto">
              {item.sizes.map(s => (
                <div key={s.sizeName} className="flex items-baseline gap-1">
                  <span className="text-white/40 text-[10px] capitalize font-semibold">{s.sizeName[0]}</span>
                  <span className="text-emerald-400 font-black text-lg leading-none">{fmt(s.basePrice)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Regular item — image fills flex-1, text pinned at bottom */}
          {hasImage && (
            <div className="flex-1 min-h-0">
              <img
                key={currentImageId}
                src={currentImageId}
                alt={item.name}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              {allImageIds.length > 1 && (
                <div className="absolute bottom-[40%] left-0 right-0 flex justify-center gap-1 pb-1">
                  {allImageIds.map((_, i) => (
                    <div key={i} className={`rounded-full transition-all ${i === imgIdx ? 'w-2.5 h-1.5 bg-white/80' : 'w-1.5 h-1.5 bg-white/30'}`} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Text content — always flex-shrink-0 at the bottom */}
          <div className="flex-shrink-0 p-4">
            {!hasImage && <div className="text-5xl mb-2">{item.emoji ?? '🍽️'}</div>}
            <div className="text-white font-bold text-2xl leading-snug line-clamp-2 mb-1">{item.name}</div>
            {(item.spiceLevel ?? 0) > 0 && (
              <div className="text-sm mb-1">{'🌶️'.repeat(Math.min(item.spiceLevel!, 3))}</div>
            )}
            <div className="font-black text-emerald-400 text-4xl leading-none"
              style={{ textShadow: '0 0 20px rgba(52,211,153,0.4)' }}>
              {fmt(item.price)}
            </div>
            {(item.preparationTime ?? 0) > 0 && (
              <div className="text-[10px] text-white/40 mt-1">⏱ {item.preparationTime} min</div>
            )}
          </div>
        </>
      )}
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
    <div className="h-full w-full bg-gray-950 p-2 flex flex-col gap-2 overflow-hidden">
      {/* Daily special — top slot (only if set) */}
      {dailySpecial && (
        <div className="flex-shrink-0" style={{ height: '34%' }}>
          <DailySpecialCard item={dailySpecial} />
        </div>
      )}

      {/* 3 (or 2) rotating item slots — CSS grid guarantees truly equal rows */}
      <div
        className="flex-1 min-h-0 grid gap-2 transition-opacity duration-350"
        style={{
          opacity: fade ? 1 : 0,
          gridTemplateRows: `repeat(${rotatingItems.length}, 1fr)`,
        }}
      >
        {rotatingItems.map((item, i) => (
          <div key={`${item.id}-${i}`} className="min-h-0 overflow-hidden">
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
