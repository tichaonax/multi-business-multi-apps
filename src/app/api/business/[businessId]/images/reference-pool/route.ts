import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

/**
 * GET /api/business/[businessId]/images/reference-pool
 *
 * Browses the shared, business-agnostic category-image pool (MBM-294 Phase 3
 * import) for this business's own business type — separate from the
 * business's own Image Gallery (`GET .../images`), which only shows images
 * already in use. This is what makes the imported pool actually discoverable
 * without having to open a specific product first.
 *
 * Query params: domainId (optional filter), limit (max 200), offset.
 * Also always returns the domain list (with per-domain image counts) so the
 * UI can render a filter dropdown without a second round-trip.
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

  const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { type: true } })
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const domainId = searchParams.get('domainId') || undefined
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '48', 10) || 48, 1), 200)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

  const [domainCounts, rows, total] = await Promise.all([
    prisma.categoryReferenceImages.groupBy({
      by: ['domainId'],
      where: { businessType: business.type, domainId: { not: null } },
      _count: { imageId: true },
    }),
    prisma.categoryReferenceImages.findMany({
      where: { businessType: business.type, ...(domainId ? { domainId } : {}) },
      select: { imageId: true, domainId: true },
      distinct: ['imageId'],
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.categoryReferenceImages.findMany({
      where: { businessType: business.type, ...(domainId ? { domainId } : {}) },
      select: { imageId: true },
      distinct: ['imageId'],
    }).then(r => r.length),
  ])

  const domainIds = domainCounts.map(d => d.domainId).filter((id): id is string => !!id)
  const domains = domainIds.length > 0
    ? await prisma.inventoryDomains.findMany({ where: { id: { in: domainIds } }, select: { id: true, name: true, emoji: true } })
    : []
  const domainOptions = domains
    .map(d => ({ ...d, count: domainCounts.find(c => c.domainId === d.id)?._count.imageId ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name))

  // Separate from `domains` above (which only lists categories that already
  // have pool images, for the browse filter) — the bulk-upload picker needs
  // every category for this business type, including ones with nothing in
  // the pool yet, so a brand-new category can receive its first images.
  const allDomains = await prisma.inventoryDomains.findMany({
    where: { businessType: business.type },
    select: { id: true, name: true, emoji: true },
    orderBy: { name: 'asc' },
  })

  // How many of THIS business's own products already use each pool image —
  // shown as a badge on the thumbnail so attaching one is visibly confirmed
  // without having to switch to "My Gallery" to see it.
  const imageIds = rows.map(r => r.imageId)
  const usageCounts = imageIds.length > 0
    ? await prisma.productImages.groupBy({
        by: ['imageId'],
        where: { imageId: { in: imageIds }, business_products: { businessId } },
        _count: { imageId: true },
      })
    : []
  const usageByImageId = new Map(usageCounts.map(u => [u.imageId, u._count.imageId]))

  const images = rows.map(r => ({
    id: r.imageId,
    url: `/api/images/${r.imageId}`,
    linkedItemCount: usageByImageId.get(r.imageId) ?? 0,
  }))

  return NextResponse.json({ success: true, images, total, limit, offset, domains: domainOptions, allDomains })
}
