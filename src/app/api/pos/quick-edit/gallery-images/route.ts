import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/pos/quick-edit/gallery-images?sourceTable=BUSINESS_PRODUCT|BARCODE_ITEM&itemId=...
 *
 * Resolves the item's own category chain, then returns the reference images
 * already linked to it (MBM-294 §3.3) — falling back one tier at a time
 * (subcategory -> category -> domain) so a picker still shows something
 * useful even when the specific subcategory has nothing yet. A category with
 * zero linked images is a normal empty state, never an error (§3.6).
 */
export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const sourceTable = searchParams.get('sourceTable')
  const itemId = searchParams.get('itemId')
  if (!itemId || (sourceTable !== 'BUSINESS_PRODUCT' && sourceTable !== 'BARCODE_ITEM')) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  let categoryId: string | null = null
  let subcategoryId: string | null = null
  let domainId: string | null = null

  if (sourceTable === 'BUSINESS_PRODUCT') {
    const product = await prisma.businessProducts.findUnique({
      where: { id: itemId },
      select: { categoryId: true, subcategoryId: true, business_categories: { select: { domainId: true } } },
    })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    categoryId = product.categoryId
    subcategoryId = product.subcategoryId
    domainId = product.business_categories?.domainId ?? null
  } else {
    const item = await prisma.barcodeInventoryItems.findUnique({
      where: { id: itemId },
      select: { categoryId: true, subcategoryId: true, domainId: true },
    })
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    categoryId = item.categoryId
    subcategoryId = item.subcategoryId
    domainId = item.domainId
  }

  const tiers: Array<{ label: 'subcategory' | 'category' | 'domain'; where: { subcategoryId?: string; categoryId?: string; domainId?: string } }> = []
  if (subcategoryId) tiers.push({ label: 'subcategory', where: { subcategoryId } })
  if (categoryId) tiers.push({ label: 'category', where: { categoryId } })
  if (domainId) tiers.push({ label: 'domain', where: { domainId } })

  for (const tier of tiers) {
    const rows = await prisma.categoryReferenceImages.findMany({
      where: tier.where,
      select: { id: true, imageId: true },
      distinct: ['imageId'],
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    if (rows.length > 0) {
      return NextResponse.json({
        success: true,
        tier: tier.label,
        images: rows.map(r => ({ id: r.id, imageId: r.imageId, url: `/api/images/${r.imageId}` })),
      })
    }
  }

  return NextResponse.json({ success: true, tier: null, images: [] })
}
