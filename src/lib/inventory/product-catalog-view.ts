/**
 * MBM-296 — unified view across the app's two independent, non-overlapping
 * product/inventory catalogs:
 *
 *   Catalog A: BusinessProducts (+ ProductVariants for price/stock)
 *              — restaurant/menu-style, service, and weight-sold items
 *   Catalog B: BarcodeInventoryItems
 *              — grocery/clothing/hardware retail items entered via the
 *                Bulk Stock Panel / Stock Take flow
 *
 * Every pricing/inventory report must query BOTH or it silently undercounts
 * whichever catalog it forgot — see MBM-296 plan §2.1. This module is the
 * one place that dual-catalog query lives.
 *
 * POS availability behaves differently per catalog when a selling price is
 * missing: Catalog A hides the product from the POS listing entirely
 * (src/app/api/universal/products/route.ts filters basePrice > 0), while
 * Catalog B leaves it visible and sellable at $0
 * (src/app/api/grocery/desk-products/route.ts maps a missing sellingPrice to
 * 0 rather than excluding the row). `posAvailabilityStatus` below captures
 * that difference explicitly rather than collapsing it into one boolean.
 */

import { prisma } from '@/lib/prisma'

export type CatalogSource = 'BUSINESS_PRODUCT' | 'PRODUCT_VARIANT' | 'BARCODE_ITEM'

export type PosAvailabilityStatus = 'AVAILABLE' | 'HIDDEN_NO_PRICE' | 'VISIBLE_AT_ZERO_PRICE' | 'INACTIVE'

export interface ProductRecord {
  id: string
  catalogSource: CatalogSource
  businessId: string
  productId: string // for PRODUCT_VARIANT this is the parent BusinessProducts.id; otherwise same as id
  name: string
  variantName: string | null
  sku: string | null
  barcode: string | null
  categoryId: string | null
  categoryName: string | null
  brandId: string | null
  brandName: string | null
  supplierId: string | null
  supplierName: string | null
  locationId: string | null
  locationName: string | null
  unitOfMeasure: string | null
  packSize: string | null
  costPrice: number | null
  sellingPrice: number | null
  quantityOnHand: number
  reorderLevel: number
  isActive: boolean
  isAvailable: boolean
  posAvailabilityStatus: PosAvailabilityStatus
  createdAt: Date
  imageUrl: string | null
  /** Deep-link to this item's edit/view screen — see buildInventoryItemLink(). */
  editItemId: string
}

function deriveCatalogAStatus(isActive: boolean, isAvailable: boolean, basePrice: number | null, isSoldByWeight: boolean): PosAvailabilityStatus {
  if (!isActive) return 'INACTIVE'
  if (!isAvailable) return 'INACTIVE'
  if (isSoldByWeight) return 'AVAILABLE'
  if (!basePrice || basePrice <= 0) return 'HIDDEN_NO_PRICE'
  return 'AVAILABLE'
}

function deriveCatalogBStatus(isActive: boolean, sellingPrice: number | null): PosAvailabilityStatus {
  if (!isActive) return 'INACTIVE'
  if (!sellingPrice || sellingPrice <= 0) return 'VISIBLE_AT_ZERO_PRICE'
  return 'AVAILABLE'
}

export interface GetUnifiedProductsParams {
  businessId: string
  categoryId?: string
  supplierId?: string
  locationId?: string
  search?: string
  includeInactive?: boolean
}

export async function getUnifiedProducts(params: GetUnifiedProductsParams): Promise<ProductRecord[]> {
  const { businessId, categoryId, supplierId, locationId, search, includeInactive = false } = params

  const [variants, barcodeItems] = await Promise.all([
    prisma.productVariants.findMany({
      where: {
        business_products: {
          businessId,
          ...(includeInactive ? {} : { isActive: true }),
          ...(categoryId ? { categoryId } : {}),
          ...(supplierId ? { supplierId } : {}),
          ...(locationId ? { locationId } : {}),
          ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }, { barcode: { contains: search, mode: 'insensitive' } }] } : {}),
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        price: true,
        stockQuantity: true,
        reorderLevel: true,
        isActive: true,
        isAvailable: true,
        createdAt: true,
        business_products: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            costPrice: true,
            basePrice: true,
            isSoldByWeight: true,
            isActive: true,
            isAvailable: true,
            createdAt: true,
            categoryId: true,
            business_categories: { select: { name: true } },
            brandId: true,
            business_brands: { select: { name: true } },
            supplierId: true,
            business_suppliers: { select: { name: true } },
            locationId: true,
            business_locations: { select: { name: true } },
            attributes: true,
            product_images: {
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
              take: 1,
              select: { imageId: true },
            },
          },
        },
      },
    }),
    prisma.barcodeInventoryItems.findMany({
      where: {
        businessId,
        ...(includeInactive ? {} : { isActive: true }),
        ...(categoryId ? { categoryId } : {}),
        ...(supplierId ? { supplierId } : {}),
        ...(locationId ? { locationId } : {}),
        ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }, { barcodeData: { contains: search, mode: 'insensitive' } }] } : {}),
      },
      select: {
        id: true,
        name: true,
        sku: true,
        barcodeData: true,
        costPrice: true,
        sellingPrice: true,
        stockQuantity: true,
        reorderLevel: true,
        isActive: true,
        createdAt: true,
        categoryId: true,
        business_category: { select: { name: true } },
        supplierId: true,
        business_supplier: { select: { name: true } },
        locationId: true,
        business_location: { select: { name: true } },
        imageId: true,
      },
    }),
  ])

  const records: ProductRecord[] = []

  for (const v of variants) {
    const bp = v.business_products
    const costPrice = bp.costPrice ? parseFloat(bp.costPrice.toString()) : null
    // A variant's own selling price takes priority; falls back to the
    // parent product's basePrice for single-variant products where the
    // variant's own `price` was never set.
    const sellingPrice = v.price ? parseFloat(v.price.toString()) : bp.basePrice ? parseFloat(bp.basePrice.toString()) : null
    const attrs = (bp.attributes as Record<string, unknown> | null) ?? null
    records.push({
      id: v.id,
      catalogSource: 'PRODUCT_VARIANT',
      businessId,
      productId: bp.id,
      name: bp.name,
      variantName: v.name,
      sku: v.sku ?? bp.sku,
      barcode: v.barcode ?? bp.barcode,
      categoryId: bp.categoryId,
      categoryName: bp.business_categories?.name ?? null,
      brandId: bp.brandId,
      brandName: bp.business_brands?.name ?? null,
      supplierId: bp.supplierId,
      supplierName: bp.business_suppliers?.name ?? null,
      locationId: bp.locationId,
      locationName: bp.business_locations?.name ?? null,
      unitOfMeasure: (attrs?.unitOfMeasure as string) ?? null,
      packSize: (attrs?.packSize as string) ?? null,
      costPrice,
      sellingPrice,
      quantityOnHand: v.stockQuantity ?? 0,
      reorderLevel: v.reorderLevel ?? 0,
      isActive: v.isActive && bp.isActive,
      isAvailable: v.isAvailable && bp.isAvailable,
      posAvailabilityStatus: deriveCatalogAStatus(v.isActive && bp.isActive, v.isAvailable && bp.isAvailable, sellingPrice, bp.isSoldByWeight),
      createdAt: v.createdAt,
      imageUrl: bp.product_images[0]?.imageId ? `/api/images/${bp.product_images[0].imageId}` : null,
      editItemId: bp.id,
    })
  }

  for (const item of barcodeItems) {
    const costPrice = item.costPrice ? parseFloat(item.costPrice.toString()) : null
    const sellingPrice = item.sellingPrice ? parseFloat(item.sellingPrice.toString()) : null
    records.push({
      id: item.id,
      catalogSource: 'BARCODE_ITEM',
      businessId,
      productId: item.id,
      name: item.name,
      variantName: null,
      sku: item.sku,
      barcode: item.barcodeData,
      categoryId: item.categoryId,
      categoryName: item.business_category?.name ?? null,
      brandId: null,
      brandName: null,
      supplierId: item.supplierId,
      supplierName: item.business_supplier?.name ?? null,
      locationId: item.locationId,
      locationName: item.business_location?.name ?? null,
      unitOfMeasure: null,
      packSize: null,
      costPrice,
      sellingPrice,
      quantityOnHand: item.stockQuantity ?? 0,
      reorderLevel: item.reorderLevel ?? 0,
      isActive: item.isActive,
      isAvailable: item.isActive,
      posAvailabilityStatus: deriveCatalogBStatus(item.isActive, sellingPrice),
      createdAt: item.createdAt,
      imageUrl: item.imageId ? `/api/images/${item.imageId}` : null,
      editItemId: `inv_${item.id}`,
    })
  }

  return records
}
