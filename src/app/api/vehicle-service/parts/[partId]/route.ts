import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { canManagePartsInventory, canSetPartPricing } from '@/lib/vehicle-service/permissions'

// GET /api/vehicle-service/parts/[partId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { partId } = await params
    const part = await prisma.businessProducts.findUnique({
      where: { id: partId },
      include: {
        business_brands: { select: { id: true, name: true } },
        business_categories: { select: { id: true, name: true, emoji: true, domainId: true, domain: { select: { id: true, name: true, emoji: true } } } },
        inventory_subcategory: { select: { id: true, name: true, emoji: true } },
        business_suppliers: { select: { id: true, name: true, phone: true, email: true } },
        business_locations: { select: { id: true, name: true, locationCode: true } },
        product_variants: true,
        vehicle_part_compatibility: { orderBy: { createdAt: 'asc' } },
        business_stock_movements: { orderBy: { createdAt: 'desc' }, take: 50, include: { employees: { select: { fullName: true } } } },
        product_images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
      },
    })
    if (!part) return NextResponse.json({ error: 'Part not found' }, { status: 404 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId: part.businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    return NextResponse.json({ success: true, part })
  } catch (error) {
    console.error('Get vehicle service part error:', error)
    return NextResponse.json({ error: 'Failed to fetch part' }, { status: 500 })
  }
}

// PATCH /api/vehicle-service/parts/[partId]
// Body: any editable field. costPrice/basePrice changes require canSetPartPricing
// (Manager tier) — the one place technicians must never be able to reach,
// per the requirements doc's explicit restriction.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { partId } = await params
    const existing = await prisma.businessProducts.findUnique({ where: { id: partId }, select: { businessId: true } })
    if (!existing) return NextResponse.json({ error: 'Part not found' }, { status: 404 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId: existing.businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }
    if (!isSystemAdmin(user) && !canManagePartsInventory(user, existing.businessId)) {
      return NextResponse.json({ error: 'You do not have permission to edit parts' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name, description, brandId, subcategoryId, supplierId, locationId,
      condition, partType, barcode, basePrice, costPrice, isActive,
    } = body as Record<string, any>

    if ((basePrice !== undefined || costPrice !== undefined) && !isSystemAdmin(user) && !canSetPartPricing(user, existing.businessId)) {
      return NextResponse.json({ error: 'Only managers and administrators can change part pricing' }, { status: 403 })
    }

    const updated = await prisma.businessProducts.update({
      where: { id: partId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(brandId !== undefined ? { brandId: brandId || null } : {}),
        ...(subcategoryId !== undefined ? { subcategoryId: subcategoryId || null } : {}),
        ...(supplierId !== undefined ? { supplierId: supplierId || null } : {}),
        ...(locationId !== undefined ? { locationId: locationId || null } : {}),
        ...(condition !== undefined ? { condition } : {}),
        ...(partType !== undefined ? { partType: partType || null } : {}),
        ...(barcode !== undefined ? { barcode: barcode || null } : {}),
        ...(basePrice !== undefined ? { basePrice: Number(basePrice) } : {}),
        ...(costPrice !== undefined ? { costPrice: costPrice === null ? null : Number(costPrice) } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, part: updated })
  } catch (error) {
    console.error('Update vehicle service part error:', error)
    return NextResponse.json({ error: 'Failed to update part' }, { status: 500 })
  }
}
