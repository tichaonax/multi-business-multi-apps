'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { stripEmoji } from '@/lib/strip-emoji'

// MBM-289: a promoted item's dwell time is multiplied by this before advancing —
// fixed constant, not admin-configurable (see plan's Decisions).
const PROMO_DWELL_MULTIPLIER = 1.5

interface DisplaySettings {
  rotationIntervalSecs: number
  enableSplitLayout: boolean
  maxItemsInRotation: number
  specialShowPercentage: number
  leftPanelCardCount: number
}

interface TodaysSpecialData {
  specialId: string
  productId: string
  productName: string
  menuNumber: string | null
  basePrice: number
  specialPrice: number
  includeWifi: boolean
  bulletPoints: string[]
  imageUrl: string | null  // final ready-to-use URL (product file path or /api/images/[id])
  addOns: Array<{ addOnId: string; productId: string; productName: string; quantity: number; unitPrice: number; imageUrl: string | null }>
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
  originalPrice?: number
  isPromoActive?: boolean
  promoDiscountPercent?: number | null
}

interface SmartProductDisplayProps {
  businessId: string
  businessType: 'restaurant' | 'grocery' | 'clothing'
}

function fmt(p: number) { return `$${p.toFixed(2)}` }

/** Full-height today's special card using new DailySpecial data format */
function DailySpecialCard({ special }: { special: TodaysSpecialData }) {
  const saving = special.basePrice - special.specialPrice

  return (
    <div className="relative rounded-2xl overflow-hidden h-full
      bg-gradient-to-br from-amber-950 via-orange-950 to-red-950
      border-2 border-amber-500/60 flex flex-col">

      {/* Pulsing badge */}
      <div className="flex items-center justify-center gap-2 py-2 px-4 bg-amber-500/20 border-b border-amber-500/30 flex-shrink-0">
        <span className="text-base">⭐</span>
        <span className="bg-amber-400 text-gray-900 text-[11px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
          Today&apos;s Special
        </span>
      </div>

      {/* Product image — only render if we have one, otherwise skip the slot entirely */}
      {special.imageUrl && (
        <div className="w-full flex-shrink-0 relative" style={{ height: '36%' }}>
          <img
            src={special.imageUrl}
            alt={special.productName}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
          />
          {/* Menu number — top-right, same size as rotating cards */}
          {special.menuNumber && (
            <div className="absolute top-2 right-2 z-20 flex items-center justify-center w-16 h-16 rounded-full bg-white text-gray-900 font-black text-4xl leading-none shadow-xl">
              {special.menuNumber.toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Details */}
      <div className="flex-1 min-h-0 flex flex-col p-4 gap-2 overflow-hidden">
        {/* Product name — menu number only shown here if there's no image */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {special.menuNumber && !special.imageUrl && (
            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-white text-gray-900 font-black text-4xl leading-none shadow-xl">
              {special.menuNumber.toUpperCase()}
            </div>
          )}
          <div className="text-white font-bold text-xl leading-tight line-clamp-1">
            {stripEmoji(special.productName)}
          </div>
        </div>

        {/* Bullet points */}
        {special.bulletPoints.length > 0 && (
          <ul className="space-y-1 flex-shrink-0">
            {special.bulletPoints.slice(0, 3).map((bp, i) => (
              <li key={i} className="text-amber-100/90 text-sm flex items-center gap-1.5">
                <span className="text-amber-400 font-bold flex-shrink-0">•</span>
                <span className="line-clamp-1">{bp}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Add-ons — always shown with emoji from product name + inline image */}
        {special.addOns.length > 0 && (
          <div className="flex-1 min-h-0 space-y-1.5 overflow-hidden">
            {special.addOns.slice(0, 3).map(a => (
              <div key={a.addOnId} className="flex items-center gap-2">
                {a.imageUrl ? (
                  <img
                    src={a.imageUrl}
                    alt={a.productName}
                    className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-amber-400/50"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-amber-800/50 flex items-center justify-center flex-shrink-0 text-lg">
                    🎁
                  </div>
                )}
                <span className="text-amber-100 text-base font-semibold line-clamp-1">
                  {a.productName}
                </span>
                {a.quantity > 1 && (
                  <span className="text-amber-400 text-sm flex-shrink-0">×{a.quantity}</span>
                )}
                <span className="text-green-400 text-xs ml-auto flex-shrink-0 font-bold">FREE</span>
              </div>
            ))}
          </div>
        )}

        {/* Price section */}
        <div className="flex-shrink-0">
          <div className="font-black text-amber-300 text-4xl leading-none animate-pulse"
            style={{ textShadow: '0 0 24px rgba(252,211,77,0.6)' }}>
            {fmt(special.specialPrice)}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-white/50 text-sm line-through">{fmt(special.basePrice)}</span>
            {saving > 0.005 && (
              <span className="text-green-400 text-sm font-bold">save {fmt(saving)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Rotating item card for the left panel — with image cycling, menu number, spice level */
function RotatingCard({ item }: { item: DisplayItem }) {
  const isAyli = item.itemType === 'ayli_combo'

  // Build ordered image list: productImages first, then adImageId if not already included.
  // `productImages` entries are already full, ready-to-use URLs (ProductImages.imageUrl,
  // e.g. "/api/images/{id}"), but `adImageId` is a bare Images.id — must be converted to
  // the same "/api/images/{id}" form here, or the cycling <img src> below 404s once it
  // reaches the ad image (this is exactly what MenuPanel on the right side already does
  // correctly for the same field, which is why the ad image showed there but not here).
  const allImageIds = (() => {
    const ids = [...(item.productImages ?? [])]
    const adImageUrl = item.adImageId ? `/api/images/${item.adImageId}` : null
    if (adImageUrl && !ids.includes(adImageUrl)) ids.push(adImageUrl)
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
            <div className="text-white font-bold text-2xl leading-snug line-clamp-1 mb-1">{stripEmoji(item.name)}</div>
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
                    <span className="text-lg flex-shrink-0">{pi.emoji}</span>
                    <span className="text-white/90 text-base font-medium truncate">{pi.name}</span>
                  </div>
                  <span className="text-emerald-400 text-sm font-bold flex-shrink-0">
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

          {/* Text content — always flex-shrink-0 at the bottom.
              When there's no image, nothing pushes this block down, so without
              a menu number it sits flush at the top; with one, it needs enough
              top clearance to clear the absolutely-positioned circle badge
              (64px + 8px offset) or the name/price can render underneath it. */}
          <div className={`flex-shrink-0 px-4 pb-4 ${!hasImage && item.menuNumber ? 'pt-20' : 'pt-4'}`}>
            {/* No fallback category-emoji block here on purpose — it was pushing
                the price below the card's visible bounds on a no-image item. The
                name/price just fill the space directly instead. */}
            {/* Up to 2 lines — a single line was cutting names off far too early on
                this narrow panel. Safe to wrap here (unlike before): when there's no
                image, pt-20 above already pushes this whole block below the badge's
                bottom edge (72px) regardless of how many lines the name takes; when
                there IS an image, the name sits below it, already clear of the badge
                for the same reason. So a wrapped second line never runs under it. */}
            <div className="text-white font-bold text-xl leading-snug line-clamp-2 mb-1">{stripEmoji(item.name)}</div>
            {(item.spiceLevel ?? 0) > 0 && (
              <div className="text-sm mb-1">{'🌶️'.repeat(Math.min(item.spiceLevel!, 3))}</div>
            )}
            {item.isPromoActive ? (
              item.originalPrice != null ? (
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-black text-red-400 text-4xl leading-none" style={{ textShadow: '0 0 20px rgba(248,113,113,0.5)' }}>
                    {fmt(item.price)}
                  </span>
                  <span className="text-white/50 text-xl line-through">{fmt(item.originalPrice)}</span>
                  <span className="bg-red-500 text-white text-xs font-black uppercase tracking-wide px-1.5 py-0.5 rounded">Sale</span>
                </div>
              ) : (
                <span className="bg-red-500 text-white text-2xl font-black uppercase tracking-wide px-2 py-1 rounded">
                  {item.promoDiscountPercent}% OFF
                </span>
              )
            ) : (
              <div className="font-black text-emerald-400 text-4xl leading-none"
                style={{ textShadow: '0 0 20px rgba(52,211,153,0.4)' }}>
                {fmt(item.price)}
              </div>
            )}
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
    specialShowPercentage: 25,
    leftPanelCardCount: 2,
  })
  const [dailySpecial, setDailySpecial] = useState<TodaysSpecialData | null>(null)
  const [items, setItems] = useState<DisplayItem[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [fade, setFade] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

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

  // MBM-289: promoted items appear more often — one full lap through every item in
  // score order, then promoted items get a second lap appended, so they show twice
  // per full cycle instead of once. Appending (not duplicating in place) keeps a
  // promoted item's two occurrences far apart in the sequence, so they're never both
  // in the visible window at once (which an adjacent duplicate could cause).
  const rotationSequence = [...items, ...items.filter(item => item.isPromoActive)]

  const slotCount = Math.min(3, Math.max(1, settings.leftPanelCardCount || 2))

  // Rotation tick — only advances the rotating cards, special is always pinned.
  // Variable dwell time (not a fixed setInterval): a promoted item gets more display
  // time, not just more frequent appearances — this effect re-schedules a single
  // setTimeout each time currentIdx changes, using a longer delay whenever the
  // currently-visible slot(s) include an active promotion.
  useEffect(() => {
    const n = rotationSequence.length
    if (n <= 2) return
    const visibleNow = Array.from({ length: Math.min(slotCount, n) }, (_, i) => rotationSequence[(currentIdx + i) % n])
    const hasPromo = visibleNow.some(it => it?.isPromoActive)
    const baseMs = (settings.rotationIntervalSecs || 6) * 1000
    const dwellMs = hasPromo ? baseMs * PROMO_DWELL_MULTIPLIER : baseMs
    const timeoutId = setTimeout(() => {
      setFade(false)
      setTimeout(() => {
        setCurrentIdx(prev => (prev + 1) % n)
        setFade(true)
      }, 350)
    }, dwellMs)
    return () => clearTimeout(timeoutId)
  }, [rotationSequence.length, currentIdx, slotCount, settings.rotationIntervalSecs])

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

  // Never show more slots than there are UNIQUE items (not rotationSequence's
  // expanded length) — filling every slot by wrapping the modulo would repeat the
  // same card simultaneously, which duplicating a promoted item for frequency must
  // not do.
  const n = rotationSequence.length
  const visibleCount = Math.min(slotCount, items.length)
  const visible = n === 0 ? [] : Array.from({ length: visibleCount }, (_, i) =>
    rotationSequence[(currentIdx + i) % n]
  )

  const showSpecial = !!(dailySpecial && settings.specialShowPercentage > 0)

  return (
    <div className="h-full w-full bg-gray-950 p-2 flex flex-col gap-2 overflow-hidden">
      {/* Today's Special — always pinned at top when enabled */}
      {showSpecial && (
        <div className="flex-shrink-0" style={{ height: '47%' }}>
          <DailySpecialCard special={dailySpecial!} />
        </div>
      )}

      {/* Rotating cards below the special (or full height when no special) */}
      <div
        className="flex-1 min-h-0 grid gap-2 transition-opacity duration-350"
        style={{
          opacity: fade ? 1 : 0,
          gridTemplateRows: `repeat(${visible.length || slotCount}, 1fr)`,
        }}
      >
        {visible.map((item, i) => (
          <div key={`${item.id}-${i}`} className="min-h-0 overflow-hidden">
            <RotatingCard item={item} />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {n > slotCount && (
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
