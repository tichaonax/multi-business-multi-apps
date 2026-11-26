// MBM-345 follow-up: a thumbnail for each sale line, where one exists — the
// product's main image (isPrimary first, then sortOrder) or, for a line sold
// from an inventory item, that item's image. The smaller thumbnail is used
// when the image pipeline made one (MBM-297), else the image itself, exactly
// as the inventory list does (src/lib/inventory/product-catalog-view.ts).
// Two queries for any number of lines.
import { prisma } from '@/lib/prisma'

export interface SaleLineRef {
  productVariantId?: string | null
  attributes?: unknown
}

const url = (img: { id: string; thumbnailImageId: string | null } | null | undefined) =>
  img ? `/api/images/${img.thumbnailImageId || img.id}` : null

/** The thumbnail URL for each line, in the same order (null: no image) */
export async function saleLineThumbnails(lines: SaleLineRef[]): Promise<(string | null)[]> {
  const variantIds = [...new Set(lines.map(l => l.productVariantId).filter((v): v is string => !!v))]
  const invIds = [...new Set(lines.map(l => {
    const a = (l.attributes ?? {}) as Record<string, unknown>
    return !l.productVariantId && typeof a.inventoryItemId === 'string' ? a.inventoryItemId : null
  }).filter((v): v is string => !!v))]

  const [variants, items] = await Promise.all([
    variantIds.length
      ? prisma.productVariants.findMany({
          where: { id: { in: variantIds } },
          select: {
            id: true,
            business_products: {
              select: {
                product_images: {
                  orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                  take: 1,
                  select: { images: { select: { id: true, thumbnailImageId: true } } },
                },
              },
            },
          },
        })
      : [],
    invIds.length
      ? prisma.barcodeInventoryItems.findMany({
          where: { id: { in: invIds } },
          select: { id: true, image: { select: { id: true, thumbnailImageId: true } } },
        })
      : [],
  ])

  const byVariant = new Map(variants.map(v => [v.id, url(v.business_products?.product_images[0]?.images)]))
  const byItem = new Map(items.map(i => [i.id, url(i.image)]))

  return lines.map(l => {
    if (l.productVariantId) return byVariant.get(l.productVariantId) ?? null
    const a = (l.attributes ?? {}) as Record<string, unknown>
    return typeof a.inventoryItemId === 'string' ? byItem.get(a.inventoryItemId) ?? null : null
  })
}
