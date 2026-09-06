import { prisma } from '@/lib/prisma'

/**
 * A business's Image Gallery is the union of images it owns directly and
 * images it merely uses on one of its own products (MBM-294 §8.1) — shared
 * across the gallery list, detail, and analytics endpoints (Phases 8 & 10).
 */
export async function getBusinessImageCandidateIds(businessId: string): Promise<string[]> {
  const [ownImages, linkedImageRows] = await Promise.all([
    prisma.images.findMany({ where: { businessId }, select: { id: true } }),
    prisma.productImages.findMany({
      where: { business_products: { businessId } },
      select: { imageId: true },
      distinct: ['imageId'],
    }),
  ])
  const ids = new Set<string>()
  ownImages.forEach(i => ids.add(i.id))
  linkedImageRows.forEach(r => { if (r.imageId) ids.add(r.imageId) })
  return Array.from(ids)
}
