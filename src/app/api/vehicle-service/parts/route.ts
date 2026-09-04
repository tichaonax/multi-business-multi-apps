import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { canManagePartsInventory } from '@/lib/vehicle-service/permissions'

const PART_DOMAIN_IDS = ['vsdom_parts', 'vsdom_workshop']

// GET /api/vehicle-service/parts
// Query: businessId (required), search, domainId, categoryId, subcategoryId,
// vehicleMake, vehicleModel, year, engineSpec, transmissionType, brandId,
// supplierId, locationId, condition, partType, minPrice, maxPrice,
// stockStatus (in_stock|low_stock|out_of_stock), page, limit
//
// Deliberately its own route rather than extending /api/universal/products —
// vehicle-compatibility filtering needs a join that's meaningless for every
// other business type (MBM-268), same reasoning as jobs/contractors/customers
// already having their own vehicle-service-scoped endpoints.
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    const search = searchParams.get('search')?.trim() || undefined
    const domainId = searchParams.get('domainId') || undefined
    const categoryId = searchParams.get('categoryId') || undefined
    const subcategoryId = searchParams.get('subcategoryId') || undefined
    const vehicleMake = searchParams.get('vehicleMake') || undefined
    const vehicleModel = searchParams.get('vehicleModel') || undefined
    const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined
    const engineSpec = searchParams.get('engineSpec') || undefined
    const transmissionType = searchParams.get('transmissionType') || undefined
    const brandId = searchParams.get('brandId') || undefined
    const supplierId = searchParams.get('supplierId') || undefined
    const locationId = searchParams.get('locationId') || undefined
    const condition = searchParams.get('condition') || undefined
    const partType = searchParams.get('partType') || undefined
    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined
    const stockStatus = searchParams.get('stockStatus') || undefined // in_stock | low_stock | out_of_stock
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 25))

    const compatibilityFilter = (vehicleMake || vehicleModel || year || engineSpec || transmissionType)
      ? {
          some: {
            ...(vehicleMake ? { vehicleMake: { equals: vehicleMake, mode: 'insensitive' as const } } : {}),
            ...(vehicleModel ? { vehicleModel: { equals: vehicleModel, mode: 'insensitive' as const } } : {}),
            ...(engineSpec ? { engineSpec: { contains: engineSpec, mode: 'insensitive' as const } } : {}),
            ...(transmissionType ? { transmissionType: { equals: transmissionType, mode: 'insensitive' as const } } : {}),
            ...(year ? { AND: [{ OR: [{ yearFrom: null }, { yearFrom: { lte: year } }] }, { OR: [{ yearTo: null }, { yearTo: { gte: year } }] }] } : {}),
          },
        }
      : undefined

    const where: any = {
      businessId,
      businessType: 'vehicle_service',
      isActive: true,
      business_categories: { domainId: domainId ? domainId : { in: PART_DOMAIN_IDS } },
      ...(categoryId ? { categoryId } : {}),
      ...(subcategoryId ? { subcategoryId } : {}),
      ...(brandId ? { brandId } : {}),
      ...(supplierId ? { supplierId } : {}),
      ...(locationId ? { locationId } : {}),
      ...(condition ? { condition } : {}),
      ...(partType ? { partType } : {}),
      ...(compatibilityFilter ? { vehicle_part_compatibility: compatibilityFilter } : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? { basePrice: { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) } }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
              { barcode: { contains: search, mode: 'insensitive' } },
              { product_variants: { some: { OR: [{ sku: { contains: search, mode: 'insensitive' } }, { barcode: { contains: search, mode: 'insensitive' } }] } } },
            ],
          }
        : {}),
    }

    const [total, products] = await Promise.all([
      prisma.businessProducts.count({ where }),
      prisma.businessProducts.findMany({
        where,
        include: {
          business_brands: { select: { id: true, name: true } },
          business_categories: { select: { id: true, name: true, emoji: true, domainId: true } },
          inventory_subcategory: { select: { id: true, name: true, emoji: true } },
          business_suppliers: { select: { id: true, name: true } },
          business_locations: { select: { id: true, name: true, locationCode: true } },
          product_variants: { select: { id: true, sku: true, barcode: true, price: true, stockQuantity: true, reorderLevel: true } },
          vehicle_part_compatibility: true,
          product_images: {
            where: { isPrimary: true },
            select: { id: true, imageUrl: true },
            take: 1,
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    // stockStatus needs the variant's own numbers, applied after fetch (a
    // WHERE clause across a to-many relation can't cleanly express
    // "the variant" for a part that — by this system's own design — always
    // has exactly one variant; simplest correct approach for that shape).
    const filtered = stockStatus
      ? products.filter(p => {
          const v = p.product_variants[0]
          if (!v) return stockStatus === 'out_of_stock'
          const qty = Number(v.stockQuantity)
          const reorder = Number(v.reorderLevel)
          if (stockStatus === 'out_of_stock') return qty <= 0
          if (stockStatus === 'low_stock') return qty > 0 && reorder > 0 && qty <= reorder
          if (stockStatus === 'in_stock') return qty > 0
          return true
        })
      : products

    return NextResponse.json({
      success: true,
      parts: filtered,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('List vehicle service parts error:', error)
    return NextResponse.json({ error: 'Failed to list parts' }, { status: 500 })
  }
}

// POST /api/vehicle-service/parts
// Body: { businessId, name, sku, categoryId, subcategoryId?, basePrice, costPrice?,
//         description?, brandId?, supplierId?, locationId?, condition?, partType?,
//         barcode?, reorderLevel?, initialQuantity?,
//         compatibility?: [{vehicleMake, vehicleModel?, yearFrom?, yearTo?, engineSpec?, transmissionType?}],
//         confirmCreateAnyway? }
//
// Creates the product with exactly one variant (the common shape for a
// parts catalog — one SKU per part) in the same transaction, plus an
// initial PURCHASE_RECEIVED movement when a starting quantity is given —
// mirrors the existing quick-stock-from-scan flow's transaction shape.
//
// Duplicate check runs first (name/SKU/brand/vehicle-compatibility/subcategory
// match) unless confirmCreateAnyway is set — and only a manager-tier caller
// (canManagePartsInventory) may set that flag, matching the requirements
// doc's "only managers and administrators may override" rule.
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      businessId, name, sku, categoryId, subcategoryId, basePrice, costPrice,
      description, brandId, supplierId, locationId, condition, partType,
      barcode, reorderLevel, initialQuantity, compatibility, confirmCreateAnyway,
    } = body as {
      businessId?: string; name?: string; sku?: string; categoryId?: string; subcategoryId?: string
      basePrice?: number; costPrice?: number; description?: string; brandId?: string; supplierId?: string
      locationId?: string; condition?: string; partType?: string; barcode?: string; reorderLevel?: number
      initialQuantity?: number
      compatibility?: Array<{ vehicleMake: string; vehicleModel?: string; yearFrom?: number; yearTo?: number; engineSpec?: string; transmissionType?: string }>
      confirmCreateAnyway?: boolean
    }

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (!sku) return NextResponse.json({ error: 'sku is required' }, { status: 400 })
    if (!categoryId) return NextResponse.json({ error: 'categoryId is required' }, { status: 400 })
    if (basePrice === undefined || basePrice === null || isNaN(Number(basePrice))) {
      return NextResponse.json({ error: 'basePrice is required' }, { status: 400 })
    }

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }
    const canManage = isSystemAdmin(user) || canManagePartsInventory(user, businessId)
    if (!canManage) return NextResponse.json({ error: 'You do not have permission to create parts' }, { status: 403 })

    const existingSku = await prisma.businessProducts.findFirst({ where: { businessId, sku } })
    if (existingSku) {
      return NextResponse.json({ error: 'A part with this SKU already exists', existingPart: existingSku }, { status: 409 })
    }

    if (!confirmCreateAnyway) {
      const vehicleMakes = (compatibility || []).map(c => c.vehicleMake).filter(Boolean)
      const candidates = await prisma.businessProducts.findMany({
        where: {
          businessId,
          businessType: 'vehicle_service',
          isActive: true,
          ...(subcategoryId ? { subcategoryId } : { categoryId }),
          OR: [
            { name: { contains: name, mode: 'insensitive' } },
            ...(brandId ? [{ brandId }] : []),
            ...(vehicleMakes.length > 0 ? [{ vehicle_part_compatibility: { some: { vehicleMake: { in: vehicleMakes, mode: 'insensitive' as const } } } }] : []),
          ],
        },
        include: {
          business_brands: { select: { name: true } },
          product_variants: { select: { stockQuantity: true } },
          vehicle_part_compatibility: true,
        },
        take: 5,
      })
      if (candidates.length > 0) {
        return NextResponse.json(
          {
            error: 'A similar inventory item already exists',
            possibleDuplicates: candidates,
            canOverride: canManage,
          },
          { status: 409 }
        )
      }
    } else if (!canManage) {
      // Backstop — the UI never offers the override to non-managers, but
      // never trust that alone.
      return NextResponse.json({ error: 'Only managers and administrators can create a part despite a possible duplicate' }, { status: 403 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date()
      const product = await tx.businessProducts.create({
        data: {
          id: randomUUID(),
          businessId,
          name,
          description: description || null,
          sku,
          barcode: barcode || null,
          brandId: brandId || null,
          categoryId,
          subcategoryId: subcategoryId || null,
          supplierId: supplierId || null,
          locationId: locationId || null,
          productType: 'PHYSICAL',
          condition: (condition as any) || 'NEW',
          partType: (partType as any) || null,
          basePrice: Number(basePrice),
          costPrice: costPrice !== undefined ? Number(costPrice) : null,
          businessType: 'vehicle_service',
          isInventoryTracked: true,
          updatedAt: now,
        },
      })

      const variant = await tx.productVariants.create({
        data: {
          id: randomUUID(),
          productId: product.id,
          sku,
          barcode: barcode || null,
          price: Number(basePrice),
          stockQuantity: initialQuantity ? Number(initialQuantity) : 0,
          reorderLevel: reorderLevel ? Number(reorderLevel) : 0,
          updatedAt: now,
        },
      })

      if (compatibility && compatibility.length > 0) {
        await tx.vehiclePartCompatibility.createMany({
          data: compatibility.filter(c => c.vehicleMake).map(c => ({
            id: randomUUID(),
            productId: product.id,
            vehicleMake: c.vehicleMake,
            vehicleModel: c.vehicleModel || null,
            yearFrom: c.yearFrom ?? null,
            yearTo: c.yearTo ?? null,
            engineSpec: c.engineSpec || null,
            transmissionType: c.transmissionType || null,
          })),
        })
      }

      if (initialQuantity && Number(initialQuantity) > 0) {
        await tx.businessStockMovements.create({
          data: {
            businessId,
            businessProductId: product.id,
            productVariantId: variant.id,
            movementType: 'PURCHASE_RECEIVED',
            quantity: Number(initialQuantity),
            unitCost: costPrice !== undefined ? Number(costPrice) : null,
            reference: 'Initial stock',
            employeeId: null,
            businessType: 'vehicle_service',
          },
        })
      }

      return { product, variant }
    })

    return NextResponse.json({ success: true, part: result.product, variant: result.variant })
  } catch (error) {
    console.error('Create vehicle service part error:', error)
    return NextResponse.json({ error: 'Failed to create part' }, { status: 500 })
  }
}
