import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin, hasPermission, hasUserPermission } from '@/lib/permission-utils'
import { emitNotification } from '@/lib/notifications/notification-emitter'

/**
 * POST /api/inventory/zero-out
 *
 * Allows users with canZeroOutInventory permission to edit sell price and/or
 * stock quantity of an inventory item. All changes are written to AuditLogs.
 * Notifies all admins and managers of the business in real-time.
 *
 * Body: { itemId, businessId, sellPrice?: number | null, stockQuantity?: number | null }
 *   - itemId with prefix "inv_" → BarcodeInventoryItems
 *   - itemId without prefix     → BusinessProducts (variant stockQuantity)
 *   - omit a field to leave it unchanged
 */

/** Sends INVENTORY_ZERO_OUT notification to all system admins + business managers/owners */
async function notifyManagersAndAdmins(params: {
  actorId: string
  actorName: string | null | undefined
  businessId: string
  itemName: string
  oldValues: Record<string, any>
  newValues: Record<string, any>
}) {
  const { actorId, actorName, businessId, itemName, oldValues, newValues } = params

  // Build a readable summary of what changed
  const changes: string[] = []
  if ('sellPrice' in newValues) {
    changes.push(`price $${Number(oldValues.sellPrice ?? 0).toFixed(2)} → $${Number(newValues.sellPrice).toFixed(2)}`)
  }
  if ('stockQuantity' in newValues) {
    changes.push(`qty ${oldValues.stockQuantity ?? 0} → ${newValues.stockQuantity}`)
  }
  const changeSummary = changes.join(', ')

  // Find system admins
  const adminUsers = await prisma.users.findMany({
    where: { role: 'admin', isActive: true },
    select: { id: true },
  })

  // Find business managers and owners via memberships
  const membershipUsers = await prisma.businessMemberships.findMany({
    where: {
      businessId,
      isActive: true,
      role: { in: ['business-owner', 'business-manager'] },
    },
    select: { userId: true },
  })

  // Merge, deduplicate, exclude the actor
  const recipientSet = new Set<string>([
    ...adminUsers.map(u => u.id),
    ...membershipUsers.map(m => m.userId),
  ])
  recipientSet.delete(actorId)
  const userIds = [...recipientSet]

  if (userIds.length === 0) return

  await emitNotification({
    userIds,
    type: 'INVENTORY_ZERO_OUT',
    title: '⚠️ Inventory Values Edited',
    message: `${actorName || 'A user'} edited "${itemName}": ${changeSummary}`,
    linkUrl: '/admin/audit-logs',
    metadata: { businessId, itemName, oldValues, newValues, actorId },
  })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { itemId, businessId, sellPrice, stockQuantity } = body

    if (!itemId || !businessId) {
      return NextResponse.json({ error: 'itemId and businessId are required' }, { status: 400 })
    }

    const canZeroOut =
      isSystemAdmin(user) ||
      hasUserPermission(user, 'canZeroOutInventory') ||
      hasPermission(user, 'canZeroOutInventory', businessId)

    if (!canZeroOut) {
      return NextResponse.json({ error: 'Forbidden: canZeroOutInventory permission required' }, { status: 403 })
    }

    const isBarcodeItem = itemId.startsWith('inv_')
    const rawId = isBarcodeItem ? itemId.replace(/^inv_/, '') : itemId

    if (isBarcodeItem) {
      const existing = await prisma.barcodeInventoryItems.findFirst({
        where: { id: rawId, businessId },
      })
      if (!existing) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }

      const oldValues: Record<string, any> = {}
      const newValues: Record<string, any> = {}
      const updateData: Record<string, any> = { updatedAt: new Date() }

      if (sellPrice !== undefined) {
        oldValues.sellPrice = existing.sellingPrice ? parseFloat(existing.sellingPrice.toString()) : null
        newValues.sellPrice = sellPrice
        updateData.sellingPrice = sellPrice
      }
      if (stockQuantity !== undefined) {
        oldValues.stockQuantity = existing.stockQuantity
        newValues.stockQuantity = stockQuantity
        updateData.stockQuantity = stockQuantity
      }

      await prisma.barcodeInventoryItems.update({ where: { id: rawId }, data: updateData })

      await prisma.auditLogs.create({
        data: {
          userId: user.id,
          action: 'zero_out_inventory',
          entityType: 'inventory_item',
          entityId: rawId,
          oldValues,
          newValues,
          metadata: { businessId, itemName: existing.name, itemType: 'barcodeInventoryItem' },
        },
      })

      // Notify managers and admins (non-blocking)
      notifyManagersAndAdmins({
        actorId: user.id,
        actorName: user.name,
        businessId,
        itemName: existing.name,
        oldValues,
        newValues,
      }).catch(e => console.error('[zero-out] notification error', e))

      return NextResponse.json({ success: true, itemId, itemName: existing.name })
    } else {
      const existing = await prisma.businessProducts.findFirst({
        where: { id: rawId, businessId },
        include: { product_variants: { take: 1 } },
      })
      if (!existing) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }

      const oldValues: Record<string, any> = {}
      const newValues: Record<string, any> = {}

      if (sellPrice !== undefined) {
        oldValues.sellPrice = existing.basePrice ? parseFloat(existing.basePrice.toString()) : null
        newValues.sellPrice = sellPrice
        await prisma.businessProducts.update({
          where: { id: rawId },
          data: { basePrice: sellPrice, updatedAt: new Date() },
        })
      }

      if (stockQuantity !== undefined && existing.product_variants.length > 0) {
        const variant = existing.product_variants[0]
        oldValues.stockQuantity = variant.stockQuantity
        newValues.stockQuantity = stockQuantity
        await prisma.productVariants.update({
          where: { id: variant.id },
          data: { stockQuantity, updatedAt: new Date() },
        })
      }

      await prisma.auditLogs.create({
        data: {
          userId: user.id,
          action: 'zero_out_inventory',
          entityType: 'inventory_item',
          entityId: rawId,
          oldValues,
          newValues,
          metadata: { businessId, itemName: existing.name, itemType: 'businessProduct' },
        },
      })

      // Notify managers and admins (non-blocking)
      notifyManagersAndAdmins({
        actorId: user.id,
        actorName: user.name,
        businessId,
        itemName: existing.name,
        oldValues,
        newValues,
      }).catch(e => console.error('[zero-out] notification error', e))

      return NextResponse.json({ success: true, itemId, itemName: existing.name })
    }
  } catch (error) {
    console.error('[inventory/zero-out POST]', error)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}
