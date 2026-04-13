/**
 * Low-Stock Notifier
 *
 * Call checkAndNotifyLowStock() after any stock movement that may reduce
 * a BarcodeInventoryItem or ProductVariant below its reorder level.
 *
 * Recipients: every active business member + their supervisor (if different).
 * Notification type: LOW_STOCK — renders with 📦 icon, blue unread highlight.
 */

import { PrismaClient } from '@prisma/client'
import { emitNotification } from '@/lib/notifications/notification-emitter'

/**
 * Check a BarcodeInventoryItem and notify if stock is at or below reorderLevel.
 * Safe to call unconditionally — does nothing when reorderLevel is 0 or stock is fine.
 */
export async function checkAndNotifyLowStockForBarcodeItem(
  prisma: PrismaClient,
  itemId: string,
  businessId: string
): Promise<void> {
  try {
    const item = await prisma.barcodeInventoryItems.findUnique({
      where: { id: itemId },
      select: { name: true, stockQuantity: true, reorderLevel: true },
    })

    if (!item || item.reorderLevel <= 0 || item.stockQuantity > item.reorderLevel) return

    const userIds = await getBusinessUserIds(prisma, businessId)
    if (userIds.length === 0) return

    const isOut = item.stockQuantity === 0
    await emitNotification({
      userIds,
      type: 'LOW_STOCK',
      title: isOut ? `Out of stock: ${item.name}` : `Low stock: ${item.name}`,
      message: isOut
        ? `${item.name} is out of stock. Reorder level is ${item.reorderLevel} units.`
        : `${item.name} has only ${item.stockQuantity} unit(s) left (reorder level: ${item.reorderLevel}).`,
      linkUrl: `/admin/reports/reorder`,
      metadata: { itemId, businessId, currentStock: item.stockQuantity, reorderLevel: item.reorderLevel },
    })
  } catch (err) {
    // Non-critical — never block the caller
    console.error('[low-stock-notifier] checkAndNotifyLowStockForBarcodeItem failed:', err)
  }
}

/**
 * Check a ProductVariant and notify if stock is at or below reorderLevel.
 */
export async function checkAndNotifyLowStockForVariant(
  prisma: PrismaClient,
  variantId: string,
  businessId: string
): Promise<void> {
  try {
    const variant = await prisma.productVariants.findUnique({
      where: { id: variantId },
      select: {
        stockQuantity: true,
        reorderLevel: true,
        business_products: { select: { name: true } },
      },
    })

    if (!variant || (variant.reorderLevel ?? 0) <= 0) return
    const stock = Number(variant.stockQuantity ?? 0)
    const level = Number(variant.reorderLevel ?? 0)
    if (stock > level) return

    const name = variant.business_products?.name ?? 'Unknown product'
    const userIds = await getBusinessUserIds(prisma, businessId)
    if (userIds.length === 0) return

    const isOut = stock === 0
    await emitNotification({
      userIds,
      type: 'LOW_STOCK',
      title: isOut ? `Out of stock: ${name}` : `Low stock: ${name}`,
      message: isOut
        ? `${name} is out of stock. Reorder level is ${level} units.`
        : `${name} has only ${stock} unit(s) left (reorder level: ${level}).`,
      linkUrl: `/admin/reports/reorder`,
      metadata: { variantId, businessId, currentStock: stock, reorderLevel: level },
    })
  } catch (err) {
    console.error('[low-stock-notifier] checkAndNotifyLowStockForVariant failed:', err)
  }
}

/**
 * Collect userIds for all active business members + their supervisors.
 * Deduplicates so each user only receives one notification.
 */
async function getBusinessUserIds(prisma: PrismaClient, businessId: string): Promise<string[]> {
  // All active members of the business
  const memberships = await prisma.businessMemberships.findMany({
    where: { businessId, isActive: true },
    select: { userId: true },
  })

  const memberUserIds = memberships.map((m) => m.userId)

  // Find supervisors of employees whose userId is in the member list
  const employees = await prisma.employees.findMany({
    where: { userId: { in: memberUserIds }, isActive: true, supervisorId: { not: null } },
    select: { supervisorId: true },
  })

  const supervisorEmployeeIds = employees
    .map((e) => e.supervisorId)
    .filter((id): id is string => id !== null)

  let supervisorUserIds: string[] = []
  if (supervisorEmployeeIds.length > 0) {
    const supervisors = await prisma.employees.findMany({
      where: { id: { in: supervisorEmployeeIds }, isActive: true, userId: { not: null } },
      select: { userId: true },
    })
    supervisorUserIds = supervisors
      .map((s) => s.userId)
      .filter((id): id is string => id !== null)
  }

  // Deduplicate
  return [...new Set([...memberUserIds, ...supervisorUserIds])]
}
