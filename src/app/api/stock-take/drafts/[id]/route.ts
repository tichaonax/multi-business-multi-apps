import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

/**
 * PUT /api/stock-take/drafts/[id]
 * Saves (replaces) all items in the draft. Also updates title/lastSyncedAt if provided.
 * Body: {
 *   title?,
 *   lastSyncedAt?,
 *   items: [{
 *     barcode?, name, categoryId?, supplierId?, description?,
 *     newQuantity, sellingPrice, costPrice?, sku?,
 *     isExistingItem, systemQuantity?, physicalCount?, displayOrder
 *   }]
 * }
 *
 * DELETE /api/stock-take/drafts/[id]
 * Hard-deletes the draft and all its items (cascade).
 */

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params

    const draft = await prisma.stockTakeDrafts.findUnique({
      where: { id },
      include: { items: { orderBy: { displayOrder: 'asc' } } },
    })
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    if (draft.createdById !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    return NextResponse.json({ success: true, draft })
  } catch (error) {
    console.error('[stock-take/drafts/:id GET]', error)
    return NextResponse.json({ error: 'Failed to fetch draft' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    const body = await request.json()
    const { title, lastSyncedAt, isStockTakeMode, items } = body

    const draft = await prisma.stockTakeDrafts.findUnique({ where: { id } })
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    if (draft.createdById !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (draft.status !== 'DRAFT') return NextResponse.json({ error: 'Draft already submitted' }, { status: 409 })

    if (!Array.isArray(items)) return NextResponse.json({ error: 'items array is required' }, { status: 400 })

    // Replace all items — delete + bulk insert + metadata update
    // Use sequential operations (no transaction) to avoid timeout on large inventories
    await prisma.stockTakeDraftItems.deleteMany({ where: { draftId: id } })

    if (items.length > 0) {
      // Insert in chunks of 500 to avoid parameter limits
      const CHUNK = 500
      for (let i = 0; i < items.length; i += CHUNK) {
        await prisma.stockTakeDraftItems.createMany({
          data: items.slice(i, i + CHUNK).map((item: any, relIdx: number) => ({
            draftId: id,
            barcode: item.barcode?.trim() || null,
            name: item.name?.trim() || '',
            categoryId: item.categoryId || null,
            domainId: item.domainId || null,
            supplierId: item.supplierId || null,
            description: item.description?.trim() || null,
            newQuantity: Number(item.newQuantity) || 0,
            sellingPrice: Number(item.sellingPrice) || 0,
            costPrice: item.costPrice !== undefined && item.costPrice !== '' ? Number(item.costPrice) : null,
            sku: item.sku?.trim() || null,
            isExistingItem: Boolean(item.isExistingItem),
            systemQuantity: item.systemQuantity !== undefined ? Number(item.systemQuantity) : null,
            physicalCount: item.physicalCount !== undefined && item.physicalCount !== '' ? Number(item.physicalCount) : null,
            displayOrder: item.displayOrder ?? (i + relIdx),
          })),
        })
      }
    }

    // Update draft metadata
    await prisma.stockTakeDrafts.update({
      where: { id },
      data: {
        title: title !== undefined ? (title?.trim() || null) : draft.title,
        lastSyncedAt: lastSyncedAt ? new Date(lastSyncedAt) : draft.lastSyncedAt,
        ...(isStockTakeMode === true ? { isStockTakeMode: true } : {}),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[stock-take/drafts PUT]', error)
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params

    const draft = await prisma.stockTakeDrafts.findUnique({ where: { id } })
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

    const isOwner = draft.createdById === user.id
    const isManager = isSystemAdmin(user) || hasPermission(user, 'canAccessFinancialData', draft.businessId)
    if (!isOwner && !isManager) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Items cascade-delete via FK
    await prisma.stockTakeDrafts.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[stock-take/drafts DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 })
  }
}
