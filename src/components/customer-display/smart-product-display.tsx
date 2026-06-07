'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface DisplaySettings {
  rotationIntervalSecs: number
  enableSplitLayout: boolean
  maxItemsInRotation: number
}

interface SalesBreakdown {
  today: number
  yesterday: number
  dayBefore: number
}

interface DisplayItem {
  id: string
  itemType: 'menu_item' | 'product' | 'ayli_combo' | 'category'
  name: string
  price: number
  emoji: string | null
  category?: string | null
  sizes?: Array<{ sizeName: string; basePrice: number }>
  stockQuantity?: number | null
  activeBales?: number
  salesScore: number
  displayScore: number
  isFeatured: boolean
  salesBreakdown: SalesBreakdown
}

interface SmartProductDisplayProps {
  businessId: string
  businessType: 'restaurant' | 'grocery' | 'clothing'
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

function SalesBar({ breakdown }: { breakdown: SalesBreakdown }) {
  const max = Math.max(breakdown.today, breakdown.yesterday, breakdown.dayBefore, 1)
  return (
    <div className="flex items-end gap-1 h-6">
      {[
        { val: breakdown.dayBefore, label: '2d', color: 'bg-blue-300' },
        { val: breakdown.yesterday, label: 'Yest', color: 'bg-blue-400' },
        { val: breakdown.today, label: 'Today', color: 'bg-blue-600' },
      ].map(({ val, label, color }) => (
        <div key={label} className="flex flex-col items-center gap-0.5">
          <div className={`w-3 rounded-t ${color}`} style={{ height: `${Math.max(4, (val / max) * 20)}px` }} />
          <span className="text-[8px] text-white/50 leading-none">{label}</span>
        </div>
      ))}
    </div>
  )
}

function ItemCard({ item, large = false }: { item: DisplayItem; large?: boolean }) {
  const hasSales = item.salesBreakdown.today > 0 || item.salesBreakdown.yesterday > 0

  return (
    <div className={`
      relative flex flex-col justify-between rounded-2xl overflow-hidden
      bg-gradient-to-br from-gray-800 to-gray-900
      border border-white/10
      ${large ? 'h-full p-8' : 'h-full p-5'}
    `}>
      {item.isFeatured && (
        <div className="absolute top-3 right-3 bg-amber-400 text-gray-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
          Featured
        </div>
      )}

      <div>
        {/* Emoji */}
        <div className={`${large ? 'text-7xl mb-4' : 'text-5xl mb-3'}`}>
          {item.emoji ?? '🍽️'}
        </div>

        {/* Name */}
        <div className={`font-bold text-white leading-tight ${large ? 'text-3xl mb-2' : 'text-xl mb-1'}`}>
          {item.name}
        </div>

        {/* Category tag */}
        {item.category && item.category !== 'ayli-combos' && (
          <div className="text-sm text-white/50 mb-2 capitalize">{item.category}</div>
        )}

        {/* Price — large animated display */}
        {!item.sizes && (
          <div className={`font-black text-emerald-400 leading-none tracking-tight animate-pulse
            ${large ? 'text-7xl mt-3' : 'text-5xl mt-2'}`}
            style={{ textShadow: '0 0 40px rgba(52,211,153,0.5)' }}>
            {formatPrice(item.price)}
          </div>
        )}

        {/* AYLI size tiers */}
        {item.sizes && item.sizes.length > 0 && (
          <div className="flex gap-3 flex-wrap mt-3">
            {item.sizes.map(s => (
              <div key={s.sizeName} className="bg-white/10 rounded-xl px-4 py-2 text-center">
                <div className="text-white/50 text-xs capitalize mb-1">{s.sizeName}</div>
                <div className="text-emerald-400 font-black text-3xl leading-none animate-pulse"
                  style={{ textShadow: '0 0 30px rgba(52,211,153,0.45)' }}>
                  {formatPrice(s.basePrice)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Clothing: active bales */}
        {item.activeBales !== undefined && (
          <div className="text-white/60 text-sm mt-2">{item.activeBales} bales available</div>
        )}
      </div>

      <div className="flex items-end justify-between mt-4">

        {/* Sales bar */}
        {hasSales && (
          <div className="ml-auto">
            <SalesBar breakdown={item.salesBreakdown} />
          </div>
        )}

        {/* Today's sold count badge */}
        {item.salesBreakdown.today > 0 && (
          <div className="absolute top-3 left-3 bg-emerald-500/80 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {item.salesBreakdown.today} sold today
          </div>
        )}
      </div>
    </div>
  )
}

function DailySpecialCard({ item }: { item: DisplayItem }) {
  return (
    <div className="relative h-full rounded-2xl overflow-hidden bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 border border-amber-500/30 flex flex-col justify-between p-8">
      {/* Animated badge */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">⭐</span>
        <div className="bg-amber-400 text-gray-900 text-sm font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
          Today&apos;s Special
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="text-8xl mb-5">{item.emoji ?? '🍽️'}</div>
        <div className="text-4xl font-black text-white leading-tight mb-3">{item.name}</div>

        {item.sizes && item.sizes.length > 0 ? (
          <div className="flex flex-col gap-2 mt-2">
            {item.sizes.map(s => (
              <div key={s.sizeName} className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-2">
                <span className="text-white/70 capitalize">{s.sizeName}</span>
                <span className="text-amber-300 font-black text-4xl animate-pulse leading-none"
                  style={{ textShadow: '0 0 30px rgba(252,211,77,0.5)' }}>
                  {formatPrice(s.basePrice)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="font-black text-amber-300 text-8xl leading-none animate-pulse"
            style={{ textShadow: '0 0 50px rgba(252,211,77,0.6)' }}>
            {formatPrice(item.price)}
          </div>
        )}
      </div>

      {item.salesBreakdown.today > 0 && (
        <div className="mt-6 text-amber-200/70 text-sm">
          🔥 {item.salesBreakdown.today} served today
        </div>
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
  const [fade, setFade] = useState<'in' | 'out'>('in')
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
    } catch {
      // silent — keep existing data
    } finally {
      setIsLoading(false)
    }
  }, [businessId, businessType])

  // Initial fetch + 5-minute refresh
  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [fetchData])

  // Listen for DISPLAY_REFRESH message
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'DISPLAY_REFRESH') fetchData()
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [fetchData])

  // Card rotation
  useEffect(() => {
    if (items.length <= 1) return
    const ms = (settings.rotationIntervalSecs || 6) * 1000

    intervalRef.current = setInterval(() => {
      setFade('out')
      setTimeout(() => {
        setCurrentIdx(prev => (prev + 1) % items.length)
        setFade('in')
      }, 400)
    }, ms)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [items, settings.rotationIntervalSecs])

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-900">
        <div className="text-white/30 text-2xl animate-pulse">Loading menu…</div>
      </div>
    )
  }

  if (items.length === 0 && !dailySpecial) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-white/30">
          <div className="text-6xl mb-4">🍽️</div>
          <div className="text-2xl font-bold">Welcome</div>
          <div className="text-lg mt-2">Ask our staff for today&apos;s menu</div>
        </div>
      </div>
    )
  }

  const useSplitLayout = settings.enableSplitLayout && !!dailySpecial && businessType === 'restaurant'
  const currentItem = items[currentIdx] ?? null

  return (
    <div className="h-full w-full bg-gray-950 p-4 flex gap-4">
      {/* Left panel: Daily Special (restaurant split layout only) */}
      {useSplitLayout && dailySpecial && (
        <div className="w-[40%] flex-shrink-0">
          <DailySpecialCard item={dailySpecial} />
        </div>
      )}

      {/* Right panel (or full-width): rotating cards */}
      <div className={`${useSplitLayout ? 'flex-1' : 'w-full'} flex flex-col gap-4`}>
        {/* Full-width daily special when no split layout (non-restaurant or split disabled) */}
        {!useSplitLayout && dailySpecial && businessType === 'restaurant' && (
          <div className="h-1/2">
            <DailySpecialCard item={dailySpecial} />
          </div>
        )}

        {/* Rotating main card */}
        {currentItem && (
          <div
            className="flex-1 transition-opacity duration-400"
            style={{ opacity: fade === 'in' ? 1 : 0 }}
          >
            <ItemCard item={currentItem} large={!useSplitLayout && !dailySpecial} />
          </div>
        )}

        {/* Dot navigation */}
        {items.length > 1 && (
          <div className="flex justify-center gap-1.5 py-1">
            {items.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  i === currentIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/25'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
