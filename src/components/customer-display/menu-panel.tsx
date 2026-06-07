'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface MenuItem {
  id: string
  itemType: 'menu_item' | 'product' | 'ayli_combo' | 'category'
  name: string
  price: number
  emoji: string | null
  imageId?: string | null
  category: string | null
  sizes?: Array<{ sizeName: string; basePrice: number }>
  salesScore: number
  displayScore: number
}

interface MenuPanelProps {
  businessId: string
  businessType: 'restaurant' | 'grocery' | 'clothing'
  searchTerm: string
}

// 3 columns × 3 rows = 9 items per page
const PAGE_SIZE = 9
// Max total items tracked (~5 pages of 6)
const MAX_ITEMS = 30
const VIEW_INTERVAL_MS = 8000

function fmt(p: number) {
  return `$${p.toFixed(2)}`
}

export function MenuPanel({ businessId, businessType, searchTerm }: MenuPanelProps) {
  const [regularItems, setRegularItems] = useState<MenuItem[]>([])
  const [aylicItems, setAylicItems] = useState<MenuItem[]>([])
  const [dailySpecialId, setDailySpecialId] = useState<string | null>(null)
  const [cycleIndex, setCycleIndex] = useState(0)
  const cycleRef = useRef(0)

  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/business/${businessId}/display-smart-ads?businessType=${businessType}&all=true`
      )
      if (!res.ok) return
      const data = await res.json()
      setDailySpecialId(data.dailySpecial?.id ?? null)

      const all: MenuItem[] = [
        ...(data.dailySpecial ? [data.dailySpecial] : []),
        ...(data.items ?? []),
      ]
      // Restaurant: only items with real sales history (salesScore > 0)
      // Grocery/clothing: show all items sorted by score — they may not have 3-day sales but are still relevant
      const nonAyli = all.filter(i => i.itemType !== 'ayli_combo')
      setRegularItems(
        (businessType === 'restaurant'
          ? nonAyli.filter(i => i.salesScore > 0)
          : nonAyli
        ).slice(0, MAX_ITEMS)
      )
      setAylicItems(all.filter(i => i.itemType === 'ayli_combo'))
    } catch { /* silent */ }
  }, [businessId, businessType])

  useEffect(() => {
    fetchMenu()
    const t = setInterval(fetchMenu, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [fetchMenu])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'DISPLAY_REFRESH') fetchMenu()
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [fetchMenu])

  // Cycle timer
  useEffect(() => {
    const t = setInterval(() => {
      cycleRef.current += 1
      setCycleIndex(cycleRef.current)
    }, VIEW_INTERVAL_MS)
    return () => clearInterval(t)
  }, [])

  const term = searchTerm.trim().toLowerCase()

  // Filtered sets
  const filteredRegular = term
    ? regularItems.filter(i => i.name.toLowerCase().includes(term))
    : regularItems
  const filteredAylic = term
    ? aylicItems.filter(i => i.name.toLowerCase().includes(term))
    : aylicItems

  const hasAyli = filteredAylic.length > 0
  const regularPages = Math.max(1, Math.ceil(filteredRegular.length / PAGE_SIZE))

  // Determine current view
  let items: MenuItem[]
  let label: string
  let isAyliView = false

  if (term) {
    items = [...filteredRegular, ...filteredAylic].slice(0, PAGE_SIZE)
    label = `Search: "${searchTerm}"`
  } else if (hasAyli && cycleIndex % 2 === 1) {
    items = filteredAylic.slice(0, PAGE_SIZE)
    label = '🥗 As-You-Like-It Combos'
    isAyliView = true
  } else {
    const page = hasAyli
      ? Math.floor(cycleIndex / 2) % regularPages
      : cycleIndex % regularPages
    items = filteredRegular.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    const baseLabel = businessType === 'grocery' ? '🛒 Products'
      : businessType === 'clothing' ? '👕 Catalogue'
      : '🍽️ Menu'
    label = regularPages > 1
      ? `${baseLabel} — ${(hasAyli ? Math.floor(cycleIndex / 2) : cycleIndex) % regularPages + 1} / ${regularPages}`
      : baseLabel
  }

  return (
    <div className="h-full bg-gray-950 flex flex-col overflow-hidden">
      {/* Slim header */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-white/10 flex-shrink-0">
        <span className="text-white/50 text-xs font-semibold uppercase tracking-widest">{label}</span>
        {/* Page dots */}
        {!term && (hasAyli || regularPages > 1) && (
          <div className="flex gap-1 items-center">
            {Array.from({ length: regularPages + (hasAyli ? 1 : 0) }).map((_, i) => {
              const cur = cycleIndex % (regularPages * (hasAyli ? 2 : 1) + (hasAyli ? 0 : 0))
              const active = hasAyli ? (cur === 1 ? i === regularPages : i === Math.floor(cur / 2) % regularPages) : i === cur % regularPages
              return <div key={i} className={`rounded-full transition-all duration-300 ${active ? 'w-4 h-1.5 bg-white/50' : 'w-1.5 h-1.5 bg-white/15'}`} />
            })}
          </div>
        )}
      </div>

      {/* Full-height grid — cards stretch evenly to fill all available space */}
      <div className="flex-1 p-2 overflow-hidden">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white/20 text-xl">
            {term ? `No results for "${searchTerm}"`
              : businessType === 'restaurant' ? 'No items with sales history yet'
              : businessType === 'grocery' ? 'No products found'
              : 'No catalogue items found'}
          </div>
        ) : (
          <div
            className="grid grid-cols-3 gap-2 h-full"
            style={{ gridAutoRows: '1fr' }}
          >
            {items.map(item => (
              <Card
                key={item.id}
                item={item}
                isSpecial={item.id === dailySpecialId}
                isAyliView={isAyliView}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ item, isSpecial, isAyliView }: { item: MenuItem; isSpecial: boolean; isAyliView: boolean }) {
  const bg = isSpecial
    ? 'bg-gradient-to-br from-amber-900/60 to-orange-900/40 border-amber-500/40'
    : isAyliView
    ? 'bg-gradient-to-br from-emerald-900/50 to-teal-900/30 border-emerald-500/25'
    : 'bg-gray-800/80 border-white/8'

  const priceColour = isSpecial ? 'text-amber-300' : 'text-emerald-400'
  const priceShadow = isSpecial
    ? '0 0 20px rgba(252,211,77,0.5)'
    : '0 0 20px rgba(52,211,153,0.45)'

  return (
    <div className={`rounded-xl border flex flex-col justify-between p-4 overflow-hidden ${bg}`}>
      {/* Top: image or emoji + name */}
      <div className="flex items-start gap-2">
        {item.imageId ? (
          <img
            src={`/api/images/${item.imageId}`}
            alt={item.name}
            className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <span className="text-4xl flex-shrink-0 leading-none">{item.emoji ?? '🍽️'}</span>
        )}
        <span className="text-white font-bold text-2xl leading-snug line-clamp-2">
          {item.name}
          {isSpecial && <span className="ml-1 text-amber-400 text-sm">⭐</span>}
        </span>
      </div>

      {/* Bottom: price — large, animated, no quantity info */}
      {item.sizes && item.sizes.length > 0 ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {item.sizes.map(s => (
            <div key={s.sizeName} className="flex items-baseline gap-1">
              <span className="text-white/35 text-xs capitalize">{s.sizeName[0]}</span>
              <span
                className={`font-black text-2xl leading-none animate-pulse ${priceColour}`}
                style={{ textShadow: priceShadow }}
              >
                {fmt(s.basePrice)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`font-black text-4xl leading-none animate-pulse mt-2 ${priceColour}`}
          style={{ textShadow: priceShadow }}
        >
          {fmt(item.price)}
        </div>
      )}
    </div>
  )
}
