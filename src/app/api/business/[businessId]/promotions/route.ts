import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { computeStatus, isOpenPromotion } from '@/lib/promotions/resolve-active-promotions'

type SourceTable = 'BARCODE_ITEM' | 'BUSINESS_PRODUCT' | 'BALE_CATEGORY'

async function resolveItemName(sourceTable: SourceTable, itemId: string, businessId: string): Promise<{ name: string; currentPrice: number } | null> {
  if (sourceTable === 'BARCODE_ITEM') {
    const item = await prisma.barcodeInventoryItems.findFirst({ where: { id: itemId, businessId }, select: { name: true, sellingPrice: true } })
    return item ? { name: item.name, currentPrice: Number(item.sellingPrice ?? 0) } : null
  }
  if (sourceTable === 'BUSINESS_PRODUCT') {
    const item = await prisma.businessProducts.findFirst({ where: { id: itemId, businessId }, select: { name: true, basePrice: true } })
    return item ? { name: item.name, currentPrice: Number(item.basePrice ?? 0) } : null
  }
  // BALE_CATEGORY
  const cat = await prisma.clothingBaleCategories.findFirst({ where: { id: itemId }, select: { name: true } })
  return cat ? { name: cat.name, currentPrice: 0 } : null
}

// GET /api/business/[businessId]/promotions?businessType=grocery|clothing
export async function GET(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId } = await params
  const permissions = getEffectivePermissions(user, businessId)
  if (user.role !== 'admin' && !permissions.canManagePromotions) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await prisma.productPromotions.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
  })

  const now = new Date()
  const enriched = await Promise.all(rows.map(async row => {
    const target = await resolveItemName(row.sourceTable as SourceTable, row.itemId, businessId)
    return {
      id: row.id,
      itemType: row.itemType,
      itemId: row.itemId,
      sourceTable: row.sourceTable,
      itemName: target?.name ?? '(item no longer exists)',
      currentPrice: target?.currentPrice ?? 0,
      discountType: row.discountType,
      discountValue: Number(row.discountValue),
      startAt: row.startAt,
      endAt: row.endAt,
      isPaused: row.isPaused,
      status: computeStatus(row, now),
      createdByName: row.createdByName,
      createdAt: row.createdAt,
    }
  }))

  return NextResponse.json({ promotions: enriched })
}

// POST /api/business/[businessId]/promotions — create a new promotional sale
export async function POST(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId } = await params
  const permissions = getEffectivePermissions(user, businessId)
  if (user.role !== 'admin' && !permissions.canManagePromotions) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { itemType, itemId, sourceTable, discountType, discountValue, startAt, endAt } = body

  if (!itemType || !itemId || !sourceTable || !discountType || discountValue == null || !startAt || !endAt) {
    return NextResponse.json({ error: 'itemType, itemId, sourceTable, discountType, discountValue, startAt, and endAt are required' }, { status: 400 })
  }
  if (!['product', 'category'].includes(itemType)) {
    return NextResponse.json({ error: 'itemType must be product or category' }, { status: 400 })
  }
  if (!['FIXED_PRICE', 'PERCENT_OFF'].includes(discountType)) {
    return NextResponse.json({ error: 'discountType must be FIXED_PRICE or PERCENT_OFF' }, { status: 400 })
  }
  if (itemType === 'category' && discountType !== 'PERCENT_OFF') {
    return NextResponse.json({ error: 'Category-level promotions (clothing bale categories) only support percent-off, since bales in a category have different prices' }, { status: 400 })
  }
  if (discountType === 'PERCENT_OFF' && (discountValue <= 0 || discountValue >= 100)) {
    return NextResponse.json({ error: 'Percent off must be between 1 and 99' }, { status: 400 })
  }
  if (discountType === 'FIXED_PRICE' && discountValue <= 0) {
    return NextResponse.json({ error: 'Fixed price must be greater than 0' }, { status: 400 })
  }

  const start = new Date(startAt)
  const end = new Date(endAt)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: 'endAt must be after startAt' }, { status: 400 })
  }

  const target = await resolveItemName(sourceTable, itemId, businessId)
  if (!target) return NextResponse.json({ error: 'Item not found for this business' }, { status: 404 })

  // Not allowed: an item can only have one open (active-or-scheduled, non-ended,
  // non-paused) promotion at a time. Pause/end the existing one first.
  const existing = await prisma.productPromotions.findMany({
    where: { businessId, itemType, itemId },
  })
  const now = new Date()
  const conflicting = existing.find(p => isOpenPromotion(p, now) && new Date(p.endAt) >= start && new Date(p.startAt) <= end)
  if (conflicting) {
    return NextResponse.json({
      error: `This item already has an active or scheduled promotion (${conflicting.discountType === 'FIXED_PRICE' ? `$${Number(conflicting.discountValue).toFixed(2)}` : `${conflicting.discountValue}% off`}, ends ${new Date(conflicting.endAt).toLocaleString()}). Pause or end it before starting a new one.`,
    }, { status: 409 })
  }

  const created = await prisma.productPromotions.create({
    data: {
      businessId, itemType, itemId, sourceTable,
      discountType, discountValue,
      startAt: start, endAt: end,
      createdById: user.id,
      createdByName: user.name ?? '',
    },
  })

  return NextResponse.json({ success: true, promotion: created }, { status: 201 })
}
