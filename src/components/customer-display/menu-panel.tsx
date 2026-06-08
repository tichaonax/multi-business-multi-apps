'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface MenuItem {
  id: string
  itemType: 'menu_item' | 'product' | 'ayli_combo' | 'category'
  name: string
  price: number
  emoji: string | null
  imageId?: string | null
  imageUrl?: string | null
  adImageId?: string | null
  advertisingNote?: string | null
  category: string | null
  sizes?: Array<{ sizeName: string; basePrice: number }>
  salesScore: number
  displayScore: number
  menuNumber?: string | null
  spiceLevel?: number | null
  poolItems?: Array<{ name: string; emoji: string; pricePerKgSmall: number; pricePerKgMedium: number; pricePerKgLarge: number }>
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
      // The API already handles restaurant filtering (numbered items or all in fallback)
      setRegularItems(nonAyli.slice(0, MAX_ITEMS))
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
    ? regularItems.filter(i =>
        i.name.toLowerCase().includes(term) ||
        (i.menuNumber && i.menuNumber.toLowerCase() === term)
      )
    : regularItems
  const filteredAylic = term
    ? aylicItems.filter(i =>
        i.name.toLowerCase().includes(term) ||
        (i.menuNumber && i.menuNumber.toLowerCase() === term)
      )
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

function NoteBadge({ note }: { note: string }) {
  const text = note.slice(0, 80)
  const isBogo    = /bogo/i.test(note)
  const isPct     = /%/.test(note)
  const isSpecial = /special/i.test(note)

  const style = isBogo
    ? 'bg-amber-500/30 border-amber-400/50 text-amber-200'
    : isPct
    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
    : isSpecial
    ? 'bg-yellow-500/20 border-yellow-400/40 text-yellow-200'
    : 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300'

  const icon = isBogo ? '🔥' : isPct ? '🏷️' : isSpecial ? '⭐' : '💬'

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold uppercase tracking-wide mt-1 ${style}`}>
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  )
}

function Card({ item, isSpecial, isAyliView }: { item: MenuItem; isSpecial: boolean; isAyliView: boolean }) {
  const isAyli = item.itemType === 'ayli_combo'
  const bg = isSpecial
    ? 'bg-gradient-to-br from-amber-900/60 to-orange-900/40 border-amber-500/40'
    : isAyliView || isAyli
    ? 'bg-gradient-to-br from-emerald-900/50 to-teal-900/30 border-emerald-500/25'
    : 'bg-gray-800/80 border-white/8'

  const priceColour = isSpecial ? 'text-amber-300' : 'text-emerald-400'
  const priceShadow = isSpecial
    ? '0 0 20px rgba(252,211,77,0.5)'
    : '0 0 20px rgba(52,211,153,0.45)'

  return (
    <div className={`relative rounded-xl border flex flex-col overflow-hidden ${bg}`}>
      {/* Menu number circle badge — top-right corner */}
      {item.menuNumber && (
        <div className="absolute top-2 right-2 z-20 flex items-center justify-center w-16 h-16 rounded-full bg-white text-gray-900 font-black text-4xl leading-none shadow-xl">
          {item.menuNumber!.toUpperCase()}
        </div>
      )}

      {/* ── AYLI combo body — pool items + image shown simultaneously ── */}
      {isAyli ? (
        <div className="flex flex-col p-3 flex-1 min-h-0 gap-1">
          <div className="text-white font-bold text-2xl leading-snug line-clamp-1">{item.name}</div>
          <div className="text-emerald-300/70 text-[10px] font-semibold uppercase tracking-wide">
            ⚖️ Choose your own portions &amp; size
          </div>
          {/* Pool items list */}
          {(item.poolItems ?? []).length > 0 && (
            <div className="flex-shrink-0 space-y-1 my-1">
              {(item.poolItems ?? []).map((pi, i) => (
                <div key={i} className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-base flex-shrink-0">{pi.emoji}</span>
                    <span className="text-white/85 text-sm font-medium truncate">{pi.name}</span>
                  </div>
                  <span className="text-emerald-400 text-xs font-bold flex-shrink-0">
                    ${pi.pricePerKgMedium.toFixed(2)}/kg
                  </span>
                </div>
              ))}
            </div>
          )}
          {/* Food image fills remaining space */}
          {item.adImageId && (
            <div className="flex-1 min-h-0 rounded-lg overflow-hidden">
              <img
                src={`/api/images/${item.adImageId}`}
                alt={item.name}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
              />
            </div>
          )}
          {/* Sizes */}
          {item.sizes && item.sizes.length > 0 && (
            <div className="flex gap-2 pt-1 border-t border-white/10 flex-shrink-0">
              {item.sizes.map(s => (
                <div key={s.sizeName} className="flex items-baseline gap-0.5">
                  <span className="text-white/40 text-[9px] capitalize font-semibold">{s.sizeName[0]}</span>
                  <span className={`font-black text-lg leading-none ${priceColour}`}>{fmt(s.basePrice)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Regular item body ── */
        <div className="flex flex-col p-4 gap-2 flex-1 min-h-0">
          {/* Top: emoji/thumbnail + name */}
          <div className="flex items-start gap-2 flex-shrink-0">
            {(item.imageUrl || item.imageId) ? (
              <img
                src={item.imageUrl || `/api/images/${item.imageId}`}
                alt={item.name}
                className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <span className="text-3xl flex-shrink-0 leading-none">{item.emoji ?? '🍽️'}</span>
            )}
            <div className="min-w-0">
              <span className="text-white font-bold text-2xl leading-snug line-clamp-2">
                {item.name}
                {isSpecial && <span className="ml-1 text-amber-400 text-sm">⭐</span>}
              </span>
              {(item.spiceLevel ?? 0) > 0 && (
                <div className="text-sm mt-0.5">{'🌶️'.repeat(Math.min(item.spiceLevel!, 3))}</div>
              )}
            </div>
          </div>

          {/* Large image — ad image preferred, falls back to product image */}
          {(item.adImageId || item.imageUrl || item.imageId) && (
            <div className="flex-1 min-h-0 rounded-lg overflow-hidden">
              <img
                src={item.adImageId ? `/api/images/${item.adImageId}` : (item.imageUrl ?? `/api/images/${item.imageId}`)}
                alt={item.name}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
              />
            </div>
          )}

          {/* Advertising note badge */}
          {item.advertisingNote && <NoteBadge note={item.advertisingNote} />}

          {/* Price */}
          <div className="flex-shrink-0">
            <div
              className={`font-black text-3xl leading-none animate-pulse ${priceColour}`}
              style={{ textShadow: priceShadow }}
            >
              {fmt(item.price)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
