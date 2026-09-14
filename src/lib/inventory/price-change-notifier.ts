/**
 * Price-Change Notifier
 *
 * Piggybacks on the same audit trail that records every price change
 * (`recordPriceChangeIfDifferent` in price-history.ts) to alert the people
 * who should know when a price moves: this business's managers/admins, plus
 * every system admin — the same "responsible party" audience the low-stock
 * notifier already uses (see low-stock-notifier.ts), minus employees who
 * have no oversight role, and minus whoever made the change themselves.
 */

import { prisma } from '@/lib/prisma'
import { emitNotification } from '@/lib/notifications/notification-emitter'

export interface PriceChangeNotifyParams {
  businessId: string
  productName: string
  priceType: 'SELLING' | 'COST'
  oldPrice: number
  newPrice: number
  changedByUserId: string | null
  changedByName: string | null
  reason?: string | null
}

export async function notifyManagersOfPriceChange(params: PriceChangeNotifyParams): Promise<void> {
  try {
    const { businessId, productName, priceType, oldPrice, newPrice, changedByUserId, changedByName, reason } = params

    const memberships = await prisma.businessMemberships.findMany({
      where: { businessId, isActive: true },
      select: { userId: true },
    })
    const memberIds = memberships.map((m) => m.userId)

    const managers = memberIds.length > 0
      ? await prisma.users.findMany({
          where: { id: { in: memberIds }, isActive: true, role: { in: ['admin', 'manager'] } },
          select: { id: true },
        })
      : []

    // System admins get notified everywhere, same rationale as low-stock-notifier
    // (MBM-268) — they often manage a business without a BusinessMemberships row.
    const systemAdmins = await prisma.users.findMany({
      where: { role: 'admin', isActive: true },
      select: { id: true },
    })

    const userIds = [...new Set([...managers.map((m) => m.id), ...systemAdmins.map((a) => a.id)])]
      .filter((id) => id !== changedByUserId)

    if (userIds.length === 0) return

    const direction = newPrice > oldPrice ? 'increased' : 'decreased'
    const priceLabel = priceType === 'COST' ? 'Cost price' : 'Selling price'

    await emitNotification({
      userIds,
      type: 'PRICE_CHANGED',
      title: `${priceLabel} changed: ${productName}`,
      message: `${changedByName ?? 'Someone'} ${direction} the ${priceLabel.toLowerCase()} of ${productName} from $${oldPrice.toFixed(2)} to $${newPrice.toFixed(2)}${reason ? ` — ${reason}` : ''}.`,
      linkUrl: `/grocery/reports/price-changes`,
      metadata: { businessId, productName, priceType, oldPrice, newPrice, reason: reason ?? null },
    })
  } catch (err) {
    // Non-critical — never block the price update itself
    console.error('[price-change-notifier] Failed to notify managers:', err)
  }
}
