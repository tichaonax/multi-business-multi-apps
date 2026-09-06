import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { getStockStatus } from '@/lib/inventory/stock-status'
import { getBusinessImageCandidateIds } from '@/lib/business-image-gallery'

const TURNOVER_WINDOW_DAYS = 7

/**
 * GET /api/business/[businessId]/images/analytics
 *
 * MBM-294 Phase 10: "most-used images" + "images on high-turnover/low-stock
 * items". High-turnover is a starting definition (top-N by units sold in the
 * last 7 days, per §9.3/§12) — expected to be adjusted once seen against
 * real usage, not a locked spec.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId } = await params
  const isAdmin = isSystemAdmin(user)
  if (!isAdmin) {
    const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId, isActive: true } })
    if (!membership) return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const topN = Math.min(Math.max(parseInt(searchParams.get('topN') || '10', 10) || 10, 1), 50)

  const candidateIds = await getBusinessImageCandidateIds(businessId)
  if (candidateIds.length === 0) {
    return NextResponse.json({ success: true, mostUsed: [], highTurnoverImages: [], lowStockImages: [], turnoverWindowDays: TURNOVER_WINDOW_DAYS, topN })
  }

  // --- Most-used images: grouped straight from ProductImages, no need to
  // touch sales/stock data at all. ---
  const usageCounts = await prisma.productImages.groupBy({
    by: ['imageId'],
    where: { imageId: { in: candidateIds }, business_products: { businessId } },
    _count: { imageId: true },
    orderBy: { _count: { imageId: 'desc' } },
    take: topN,
  })
  const mostUsedIds = usageCounts.map(u => u.imageId).filter((id): id is string => !!id)
  const mostUsedImages = await prisma.images.findMany({ where: { id: { in: mostUsedIds } }, select: { id: true } })
  const mostUsed = usageCounts
    .filter(u => u.imageId && mostUsedImages.some(i => i.id === u.imageId))
    .map(u => ({ id: u.imageId as string, url: `/api/images/${u.imageId}`, usageCount: u._count.imageId }))

  // --- Turnover + low-stock: need every linked product's variants & recent sales. ---
  const links = await prisma.productImages.findMany({
    where: { imageId: { in: candidateIds }, business_products: { businessId } },
    select: {
      imageId: true,
      business_products: {
        select: {
          id: true, name: true,
          product_variants: { select: { id: true, stockQuantity: true, reorderLevel: true } },
        },
      },
    },
  })

  const productIds = Array.from(new Set(links.map(l => l.business_products.id)))
  const cutoff = new Date(Date.now() - TURNOVER_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  const recentOrderItems = productIds.length > 0
    ? await prisma.businessOrderItems.findMany({
        where: {
          product_variants: { productId: { in: productIds } },
          business_orders: { businessId, status: { not: 'CANCELLED' }, createdAt: { gte: cutoff } },
        },
        select: { quantity: true, product_variants: { select: { productId: true } } },
      })
    : []

  const unitsSoldByProduct = new Map<string, number>()
  for (const item of recentOrderItems) {
    const productId = item.product_variants?.productId
    if (!productId) continue
    unitsSoldByProduct.set(productId, (unitsSoldByProduct.get(productId) ?? 0) + item.quantity)
  }

  const stockStatusByProduct = new Map<string, ReturnType<typeof getStockStatus>>()
  const nameByProduct = new Map<string, string>()
  for (const link of links) {
    const p = link.business_products
    nameByProduct.set(p.id, p.name)
    if (!stockStatusByProduct.has(p.id)) {
      const stockQuantity = p.product_variants.reduce((sum, v) => sum + v.stockQuantity, 0)
      const reorderLevel = p.product_variants.reduce((max, v) => Math.max(max, v.reorderLevel), 0)
      stockStatusByProduct.set(p.id, getStockStatus({ stockQuantity, reorderLevel }))
    }
  }

  const topTurnoverProductIds = new Set(
    Array.from(unitsSoldByProduct.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([productId]) => productId)
  )

  const highTurnoverImageMap = new Map<string, { productId: string; productName: string; unitsSold: number }>()
  const lowStockImageMap = new Map<string, { productId: string; productName: string; stockLabel: string }>()
  for (const link of links) {
    if (!link.imageId) continue
    const p = link.business_products
    if (topTurnoverProductIds.has(p.id) && !highTurnoverImageMap.has(link.imageId)) {
      highTurnoverImageMap.set(link.imageId, {
        productId: p.id, productName: p.name, unitsSold: unitsSoldByProduct.get(p.id) ?? 0,
      })
    }
    const stock = stockStatusByProduct.get(p.id)
    if (stock && (stock.status === 'low' || stock.status === 'out') && !lowStockImageMap.has(link.imageId)) {
      lowStockImageMap.set(link.imageId, { productId: p.id, productName: p.name, stockLabel: stock.label })
    }
  }

  const highTurnoverImages = Array.from(highTurnoverImageMap.entries()).map(([imageId, info]) => ({
    id: imageId, url: `/api/images/${imageId}`, ...info,
  }))
  const lowStockImages = Array.from(lowStockImageMap.entries()).map(([imageId, info]) => ({
    id: imageId, url: `/api/images/${imageId}`, ...info,
  }))

  return NextResponse.json({
    success: true,
    mostUsed,
    highTurnoverImages,
    lowStockImages,
    turnoverWindowDays: TURNOVER_WINDOW_DAYS,
    topN,
  })
}
