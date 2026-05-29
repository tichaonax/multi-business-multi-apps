import { PrismaClient } from '@prisma/client'

/**
 * Recalculate importedQty for the given order/tracking references and
 * auto-lock any that have reached their originalQty threshold.
 *
 * Called after: move-to-business, item quantity edit.
 * Uses raw SQL because the Prisma client may not be regenerated yet.
 */
export async function recalcAndAutoLock(
  prisma: PrismaClient | any,
  orderNumbers: string[],
  trackingNumbers: string[],
): Promise<void> {
  const now = new Date()

  // Process ORDER references
  for (const orderNumber of orderNumbers) {
    if (!orderNumber) continue
    const rows: any[] = await prisma.$queryRaw`
      SELECT id, "originalQty", "isLocked" FROM warehouse_reference_locks
      WHERE "referenceType" = 'ORDER' AND "referenceValue" = ${orderNumber}
      LIMIT 1
    `
    if (rows.length === 0) continue
    const lock = rows[0]

    const aggRows: any[] = await prisma.$queryRaw`
      SELECT COALESCE(SUM(quantity), 0)::int AS total
      FROM warehouse_items
      WHERE "orderNumber" = ${orderNumber} AND status = 'MOVED_TO_BUSINESS'
    `
    const importedQty = Number(aggRows[0]?.total ?? 0)

    const shouldAutoLock =
      !lock.isLocked &&
      lock.originalQty != null &&
      importedQty >= Number(lock.originalQty)

    if (shouldAutoLock) {
      await prisma.$executeRaw`
        UPDATE warehouse_reference_locks
        SET "importedQty" = ${importedQty}, "isLocked" = true, "autoLocked" = true,
            "lockedAt" = ${now}, "updatedAt" = ${now}
        WHERE id = ${lock.id}
      `
    } else {
      await prisma.$executeRaw`
        UPDATE warehouse_reference_locks
        SET "importedQty" = ${importedQty}, "updatedAt" = ${now}
        WHERE id = ${lock.id}
      `
    }
  }

  // Process TRACKING references
  for (const trackingNumber of trackingNumbers) {
    if (!trackingNumber) continue
    const rows: any[] = await prisma.$queryRaw`
      SELECT id, "originalQty", "isLocked" FROM warehouse_reference_locks
      WHERE "referenceType" = 'TRACKING' AND "referenceValue" = ${trackingNumber}
      LIMIT 1
    `
    if (rows.length === 0) continue
    const lock = rows[0]

    const aggRows: any[] = await prisma.$queryRaw`
      SELECT COALESCE(SUM(quantity), 0)::int AS total
      FROM warehouse_items
      WHERE "trackingNumber" = ${trackingNumber} AND status = 'MOVED_TO_BUSINESS'
    `
    const importedQty = Number(aggRows[0]?.total ?? 0)

    const shouldAutoLock =
      !lock.isLocked &&
      lock.originalQty != null &&
      importedQty >= Number(lock.originalQty)

    if (shouldAutoLock) {
      await prisma.$executeRaw`
        UPDATE warehouse_reference_locks
        SET "importedQty" = ${importedQty}, "isLocked" = true, "autoLocked" = true,
            "lockedAt" = ${now}, "updatedAt" = ${now}
        WHERE id = ${lock.id}
      `
    } else {
      await prisma.$executeRaw`
        UPDATE warehouse_reference_locks
        SET "importedQty" = ${importedQty}, "updatedAt" = ${now}
        WHERE id = ${lock.id}
      `
    }
  }
}
