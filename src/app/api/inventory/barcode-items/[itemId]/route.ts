import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

type RouteContext = { params: Promise<{ itemId: string }> }

/**
 * PATCH /api/inventory/barcode-items/[itemId]
 *
 * Updates a BarcodeInventoryItem — specifically allows setting/changing
 * domainId, categoryId, supplierId, sellingPrice, costPrice, customLabel.
 *
 * Also propagates domainId to the category if the category currently has null domainId.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { itemId } = await context.params
    const body = await request.json()
    const { domainId, categoryId, supplierId, sellingPrice, costPrice, customLabel } = body

    // Verify item exists and user has access to its business
    const item = await prisma.barcodeInventoryItems.findUnique({
      where: { id: itemId },
      select: { id: true, businessId: true, categoryId: true, domainId: true },
    })
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: { userId: user.id, businessId: item.businessId, isActive: true },
      })
      if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build update data — only include fields that were provided
    const data: any = {}
    if (domainId !== undefined)   data.domainId    = domainId   || null
    if (categoryId !== undefined) data.categoryId  = categoryId || null
    if (supplierId !== undefined) data.supplierId  = supplierId || null
    if (sellingPrice !== undefined) data.sellingPrice = Number(sellingPrice)
    if (costPrice !== undefined)    data.costPrice    = costPrice !== null ? Number(costPrice) : null
    if (customLabel !== undefined)  data.customLabel  = customLabel?.trim() || null

    const updated = await prisma.barcodeInventoryItems.update({
      where: { id: itemId },
      data,
    })

    // Propagate domainId to the category if it's currently null
    const effectiveCategoryId = categoryId !== undefined ? (categoryId || null) : item.categoryId
    const effectiveDomainId   = domainId   !== undefined ? (domainId   || null) : item.domainId
    if (effectiveDomainId && effectiveCategoryId) {
      await prisma.businessCategories.updateMany({
        where: { id: effectiveCategoryId, domainId: null },
        data: { domainId: effectiveDomainId },
      })
    }

    return NextResponse.json({ success: true, item: updated })
  } catch (error: any) {
    console.error('[barcode-items PATCH]', error)
    return NextResponse.json({ error: error.message || 'Update failed' }, { status: 500 })
  }
}
