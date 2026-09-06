import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { getStockStatus, StockStatusLevel } from '@/lib/inventory/stock-status'
import { getBusinessImageCandidateIds } from '@/lib/business-image-gallery'

/**
 * GET /api/business/[businessId]/images
 *
 * Business Image Gallery list/browse (MBM-294 §9.2, Phase 8). A business's
 * gallery is the union of (a) `Images` rows uploaded directly under this
 * business and (b) any image reachable via this business's own
 * `ProductImages` rows — covering shared/global reference images (e.g. the
 * category-import pool) that a product here happens to use (§8.1).
 *
 * Query params (all optional):
 *   hasInventory=true|false   — image is/isn't linked to any product here
 *   stockStatus=in|low|out    — at least one linked product matches
 *   search=text               — linked product name/SKU contains text
 *   tag=name                  — exact tag name (case-insensitive)
 *   uploadedBy=userId
 *   limit=50 (max 200), offset=0
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId } = await params
  const isAdmin = isSystemAdmin(user)
  if (!isAdmin) {
    const membership = await prisma.businessMemberships.findFirst({
      where: { userId: user.id, businessId, isActive: true },
    })
    if (!membership) return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const hasInventoryParam = searchParams.get('hasInventory')
  const stockStatusParam = searchParams.get('stockStatus') as StockStatusLevel | null
  const search = searchParams.get('search')?.trim() || null
  const tag = searchParams.get('tag')?.trim() || null
  const uploadedBy = searchParams.get('uploadedBy') || null
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

  // Candidate image ids: directly owned by this business, or used by any of
  // this business's own products (§8.1's union logic).
  const candidateIds = new Set<string>(await getBusinessImageCandidateIds(businessId))
  if (candidateIds.size === 0) {
    return NextResponse.json({ success: true, images: [], total: 0 })
  }

  // Pull every ProductImages row (within this business) for the candidate
  // images, with enough product/variant data to compute stock + search.
  const productLinks = await prisma.productImages.findMany({
    where: { imageId: { in: Array.from(candidateIds) }, business_products: { businessId } },
    select: {
      imageId: true,
      isPrimary: true,
      business_products: {
        select: {
          id: true,
          name: true,
          sku: true,
          product_variants: { select: { stockQuantity: true, reorderLevel: true } },
        },
      },
    },
  })

  const linksByImage = new Map<string, typeof productLinks>()
  for (const link of productLinks) {
    if (!link.imageId) continue
    const list = linksByImage.get(link.imageId) ?? []
    list.push(link)
    linksByImage.set(link.imageId, list)
  }

  function summarizeLinks(links: typeof productLinks) {
    const statuses = new Set<StockStatusLevel>()
    const products: Array<{ id: string; name: string; sku: string | null; stockQuantity: number; status: StockStatusLevel }> = []
    for (const link of links) {
      const p = link.business_products
      const stockQuantity = p.product_variants.reduce((sum, v) => sum + v.stockQuantity, 0)
      const reorderLevel = p.product_variants.reduce((max, v) => Math.max(max, v.reorderLevel), 0)
      const { status } = getStockStatus({ stockQuantity, reorderLevel })
      statuses.add(status)
      products.push({ id: p.id, name: p.name, sku: p.sku, stockQuantity, status })
    }
    return { statuses, products }
  }

  let matchingIds = Array.from(candidateIds)

  if (hasInventoryParam === 'true') {
    matchingIds = matchingIds.filter(id => (linksByImage.get(id)?.length ?? 0) > 0)
  } else if (hasInventoryParam === 'false') {
    matchingIds = matchingIds.filter(id => (linksByImage.get(id)?.length ?? 0) === 0)
  }

  if (stockStatusParam && ['in', 'low', 'out'].includes(stockStatusParam)) {
    matchingIds = matchingIds.filter(id => summarizeLinks(linksByImage.get(id) ?? []).statuses.has(stockStatusParam))
  }

  if (search) {
    const needle = search.toLowerCase()
    matchingIds = matchingIds.filter(id =>
      (linksByImage.get(id) ?? []).some(link =>
        link.business_products.name.toLowerCase().includes(needle) ||
        (link.business_products.sku ?? '').toLowerCase().includes(needle)
      )
    )
  }

  if (tag) {
    const tagRows = await prisma.imageTags.findMany({
      where: { imageId: { in: matchingIds }, tags: { businessId, name: { equals: tag, mode: 'insensitive' } } },
      select: { imageId: true },
    })
    const tagged = new Set(tagRows.map(r => r.imageId))
    matchingIds = matchingIds.filter(id => tagged.has(id))
  }

  if (uploadedBy) {
    const uploaderRows = await prisma.images.findMany({ where: { id: { in: matchingIds }, uploadedBy }, select: { id: true } })
    const uploaderSet = new Set(uploaderRows.map(r => r.id))
    matchingIds = matchingIds.filter(id => uploaderSet.has(id))
  }

  const total = matchingIds.length

  const images = await prisma.images.findMany({
    where: { id: { in: matchingIds } },
    select: {
      id: true, mimeType: true, size: true, createdAt: true, uploadedBy: true,
      uploader: { select: { name: true } },
      image_tags: { select: { tags: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
  })

  const results = images.map(img => {
    const links = linksByImage.get(img.id) ?? []
    const summary = summarizeLinks(links)
    return {
      id: img.id,
      url: `/api/images/${img.id}`,
      mimeType: img.mimeType,
      size: img.size,
      createdAt: img.createdAt,
      uploadedBy: img.uploadedBy,
      uploaderName: img.uploader?.name ?? null,
      tags: img.image_tags.map(t => t.tags.name),
      linkedItemCount: links.length,
      stockStatuses: Array.from(summary.statuses),
    }
  })

  return NextResponse.json({ success: true, images: results, total, limit, offset })
}
