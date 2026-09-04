import { prisma } from '@/lib/prisma'

export interface ActivePromotion {
  id: string
  itemType: string
  itemId: string
  discountType: 'FIXED_PRICE' | 'PERCENT_OFF'
  discountValue: number
  endAt: Date
}

export interface PricedResult {
  price: number
  originalPrice: number
  isPromoActive: boolean
  promoEndsAt: string | null
  discountType: 'FIXED_PRICE' | 'PERCENT_OFF' | null
}

/**
 * Whether a promotion is in effect right now. Deliberately computed fresh every
 * call rather than trusted from a stored status field — a missed cron or stale
 * cache must never keep charging (or displaying) a discounted price past its
 * scheduled end, or hide one that just started.
 */
export function isEffectivelyActive(
  promo: { isPaused: boolean; startAt: Date; endAt: Date },
  now: Date = new Date()
): boolean {
  return !promo.isPaused && now >= promo.startAt && now <= promo.endAt
}

export type PromotionStatus = 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'ENDED'

/** Admin-list display status — same inputs as isEffectivelyActive, just more granular. */
export function computeStatus(
  promo: { isPaused: boolean; startAt: Date; endAt: Date },
  now: Date = new Date()
): PromotionStatus {
  if (now > promo.endAt) return 'ENDED'
  if (promo.isPaused) return 'PAUSED'
  if (now < promo.startAt) return 'SCHEDULED'
  return 'ACTIVE'
}

/** A promo counts as "blocking a new one" if it isn't already over. */
export function isOpenPromotion(
  promo: { isPaused: boolean; endAt: Date },
  now: Date = new Date()
): boolean {
  return !promo.isPaused && now <= promo.endAt
}

/**
 * Batched lookup of every currently-active promotion for a business, keyed by
 * `${itemType}:${itemId}` for O(1) lookup per item. Callers should fetch once per
 * request (not per item) and pass the result into applyPromotion() for each item.
 */
export async function getActivePromotions(
  businessId: string,
  now: Date = new Date()
): Promise<Map<string, ActivePromotion>> {
  const rows = await prisma.productPromotions.findMany({
    where: {
      businessId,
      isPaused: false,
      startAt: { lte: now },
      endAt: { gte: now },
    },
    orderBy: { createdAt: 'desc' },
  })

  const map = new Map<string, ActivePromotion>()
  for (const row of rows) {
    const key = `${row.itemType}:${row.itemId}`
    // orderBy createdAt desc + first-write-wins means the most recently created
    // promo for an item takes precedence — shouldn't matter in practice since
    // saving a new promo while one is active is rejected, but stay defensive.
    if (map.has(key)) continue
    map.set(key, {
      id: row.id,
      itemType: row.itemType,
      itemId: row.itemId,
      discountType: row.discountType as 'FIXED_PRICE' | 'PERCENT_OFF',
      discountValue: Number(row.discountValue),
      endAt: row.endAt,
    })
  }
  return map
}

/**
 * Applies a resolved promotion (or lack thereof) to a base price. `promo` should
 * be `activePromotions.get(`${itemType}:${itemId}`)` — undefined means no active
 * promotion, in which case the original price passes through unchanged.
 */
export function applyPromotion(originalPrice: number, promo: ActivePromotion | undefined): PricedResult {
  if (!promo) {
    return { price: originalPrice, originalPrice, isPromoActive: false, promoEndsAt: null, discountType: null }
  }
  const price = promo.discountType === 'FIXED_PRICE'
    ? promo.discountValue
    : Math.max(0, originalPrice * (1 - promo.discountValue / 100))
  return {
    price: Math.round(price * 100) / 100,
    originalPrice,
    isPromoActive: true,
    promoEndsAt: promo.endAt.toISOString(),
    discountType: promo.discountType,
  }
}
