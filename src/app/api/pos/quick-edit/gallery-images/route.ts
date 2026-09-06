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
 *
 * Also resolves and returns the human-readable category name (`resolvedName`)
 * and the exact ids to tag a fresh upload against (`uploadTarget`) — the
 * "Choose from Gallery" picker previously had no way to tell the user *which*
 * category it meant, or to let them upload straight into it (Phase 9 follow-up).
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
  let categoryName: string | null = null
  let subcategoryName: string | null = null

  if (sourceTable === 'BUSINESS_PRODUCT') {
    const product = await prisma.businessProducts.findUnique({
      where: { id: itemId },
      select: {
        categoryId: true, subcategoryId: true,
        business_categories: { select: { name: true, domainId: true } },
        inventory_subcategory: { select: { name: true } },
      },
    })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    categoryId = product.categoryId
    subcategoryId = product.subcategoryId
    domainId = product.business_categories?.domainId ?? null
    categoryName = product.business_categories?.name ?? null
    subcategoryName = product.inventory_subcategory?.name ?? null
  } else {
    const item = await prisma.barcodeInventoryItems.findUnique({
      where: { id: itemId },
      select: {
        categoryId: true, subcategoryId: true, domainId: true,
        business_category: { select: { name: true } },
        inventory_subcategory: { select: { name: true } },
      },
    })
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    categoryId = item.categoryId
    subcategoryId = item.subcategoryId
    domainId = item.domainId
    categoryName = item.business_category?.name ?? null
    subcategoryName = item.inventory_subcategory?.name ?? null
  }

  let domainName: string | null = null
  if (domainId) {
    const domain = await prisma.inventoryDomains.findUnique({ where: { id: domainId }, select: { name: true } })
    domainName = domain?.name ?? null
  }

  const uploadTarget = { domainId, categoryId, subcategoryId }
  // Most specific available name, regardless of whether that tier has any
  // images yet — this is what the picker shows the user so "no images for
  // this category" always names an actual category.
  const resolvedName = subcategoryName || categoryName || domainName || null

  const tiers: Array<{ label: 'subcategory' | 'category' | 'domain'; where: { subcategoryId?: string; categoryId?: string; domainId?: string }; name: string | null }> = []
  if (subcategoryId) tiers.push({ label: 'subcategory', where: { subcategoryId }, name: subcategoryName })
  if (categoryId) tiers.push({ label: 'category', where: { categoryId }, name: categoryName })
  if (domainId) tiers.push({ label: 'domain', where: { domainId }, name: domainName })

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
        tierName: tier.name,
        resolvedName,
        uploadTarget,
        images: rows.map(r => ({ id: r.id, imageId: r.imageId, url: `/api/images/${r.imageId}` })),
      })
    }
  }

  return NextResponse.json({ success: true, tier: null, tierName: null, resolvedName, uploadTarget, images: [] })
}
