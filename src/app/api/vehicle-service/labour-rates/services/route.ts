import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { canViewFinancials } from '@/lib/vehicle-service/permissions'

// POST /api/vehicle-service/labour-rates/services
// Body: { businessId, categoryId, name, emoji?, customerRate? }
// Creates a new labour rate "definition" — an InventorySubcategories row
// under an existing Vehicle Services category, same shape/format as the
// built-in ones (name + emoji). This is a shared, global catalog (categories
// have businessId: null), so the new definition is immediately visible to
// every vehicle-service business — same trade-off as every other
// on-the-fly category/subcategory addition in this app. Optionally also
// sets this business's own initial customer rate in the same call.
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, categoryId, name, emoji, customerRate } = body as {
      businessId?: string; categoryId?: string; name?: string; emoji?: string; customerRate?: number
    }
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!categoryId) return NextResponse.json({ error: 'categoryId is required' }, { status: 400 })
    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    if (!isSystemAdmin(user) && !canViewFinancials(user, businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const category = await prisma.businessCategories.findFirst({
      where: { id: categoryId, businessType: 'vehicle_service', domain: { name: 'Vehicle Services' } },
      select: { id: true },
    })
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

    const duplicate = await prisma.inventorySubcategories.findFirst({
      where: { categoryId, name: { equals: name.trim(), mode: 'insensitive' } },
      select: { id: true, name: true },
    })
    if (duplicate) {
      return NextResponse.json({ error: `A service named "${duplicate.name}" already exists in this category` }, { status: 409 })
    }

    if (customerRate !== undefined && customerRate !== null && (isNaN(Number(customerRate)) || Number(customerRate) < 0)) {
      return NextResponse.json({ error: 'customerRate must be a non-negative number' }, { status: 400 })
    }

    const subcategory = await prisma.inventorySubcategories.create({
      data: {
        id: randomUUID(),
        categoryId,
        name: name.trim(),
        emoji: emoji?.trim() || null,
        isDefault: false,
        isUserCreated: true,
        createdBy: user.id,
      },
    })

    let rate: { customerRate: number } | null = null
    if (customerRate !== undefined && customerRate !== null) {
      const created = await prisma.vehicleServiceLabourRates.upsert({
        where: { businessId_subcategoryId: { businessId, subcategoryId: subcategory.id } },
        create: { businessId, subcategoryId: subcategory.id, customerRate: Number(customerRate), createdBy: user.id },
        update: { customerRate: Number(customerRate), isActive: true },
      })
      rate = { customerRate: Number(created.customerRate) }
    }

    return NextResponse.json({
      success: true,
      service: { id: subcategory.id, name: subcategory.name, emoji: subcategory.emoji, customerRate: rate?.customerRate ?? null },
    }, { status: 201 })
  } catch (error) {
    console.error('Create labour rate service error:', error)
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }
}

// PATCH /api/vehicle-service/labour-rates/services
// Body: { businessId, subcategoryId, name, emoji? }
// Renames/re-emojis an existing labour rate definition. There is
// deliberately no DELETE — definitions can be added or updated, never
// removed (they may be referenced by historical jobs/tasks).
export async function PATCH(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, subcategoryId, name, emoji } = body as {
      businessId?: string; subcategoryId?: string; name?: string; emoji?: string
    }
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!subcategoryId) return NextResponse.json({ error: 'subcategoryId is required' }, { status: 400 })
    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    if (!isSystemAdmin(user) && !canViewFinancials(user, businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await prisma.inventorySubcategories.findUnique({
      where: { id: subcategoryId },
      select: { id: true, categoryId: true },
    })
    if (!existing) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    const duplicate = await prisma.inventorySubcategories.findFirst({
      where: {
        categoryId: existing.categoryId,
        id: { not: subcategoryId },
        name: { equals: name.trim(), mode: 'insensitive' },
      },
      select: { id: true, name: true },
    })
    if (duplicate) {
      return NextResponse.json({ error: `A service named "${duplicate.name}" already exists in this category` }, { status: 409 })
    }

    const updated = await prisma.inventorySubcategories.update({
      where: { id: subcategoryId },
      data: { name: name.trim(), emoji: emoji?.trim() || null },
    })

    return NextResponse.json({ success: true, service: { id: updated.id, name: updated.name, emoji: updated.emoji } })
  } catch (error) {
    console.error('Update labour rate service error:', error)
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
  }
}
