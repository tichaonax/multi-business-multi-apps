import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const combo = await prisma.asYouLikeItCombos.findUnique({
      where: { id },
      include: {
        sizes: { orderBy: { sortOrder: 'asc' } },
        items: {
          where: { isActive: true, pool_item: { isActive: true } },
          orderBy: { sortOrder: 'asc' },
          include: { pool_item: true }
        }
      }
    })
    if (!combo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(combo)
  } catch (error) {
    console.error('AYC combo GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch combo' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(user, 'canCreateAYLICombos')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const { name, description, sizes, poolItemIds, menuNumber } = await req.json()

    // Validate and enforce menuNumber uniqueness across both products and AYLI combos
    if (menuNumber !== undefined && menuNumber !== null) {
      const normalised = String(menuNumber).toLowerCase()
      if (!/^[1-9][0-9]*[a-z]?$/.test(normalised)) {
        return NextResponse.json({ error: 'Invalid menu number format. Use a positive integer with an optional lowercase letter suffix (e.g. 4, 4a).' }, { status: 400 })
      }
      const combo = await prisma.asYouLikeItCombos.findUnique({ where: { id }, select: { businessId: true } })
      if (!combo) return NextResponse.json({ error: 'Combo not found' }, { status: 404 })
      const [productConflict, ayliConflict] = await Promise.all([
        prisma.businessProducts.findFirst({
          where: { businessId: combo.businessId, menuNumber: normalised, isActive: true },
          select: { name: true }
        }),
        prisma.asYouLikeItCombos.findFirst({
          where: { businessId: combo.businessId, menuNumber: normalised, isActive: true, id: { not: id } },
          select: { name: true }
        })
      ])
      const conflict = productConflict || ayliConflict
      const type = productConflict ? 'menu item' : 'AYLI combo'
      if (conflict) {
        return NextResponse.json(
          { error: `Menu number ${normalised} is already assigned to "${conflict.name}" (${type}). Choose a different number.` },
          { status: 409 }
        )
      }
    }

    await prisma.$transaction(async (tx) => {
      // Only delete + recreate sizes/items when explicitly provided — a menuNumber-only
      // update must never touch sizes or items (that would silently wipe them).
      if (sizes !== undefined) {
        await tx.asYouLikeItComboSizes.deleteMany({ where: { comboId: id } })
      }
      if (poolItemIds !== undefined) {
        await tx.asYouLikeItComboItems.deleteMany({ where: { comboId: id } })
      }

      const updateData: any = {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(menuNumber !== undefined ? { menuNumber: menuNumber === null ? null : String(menuNumber).toLowerCase() } : {}),
        ...(sizes !== undefined ? {
          sizes: {
            create: sizes.map((s: any, i: number) => ({
              sizeName: s.sizeName,
              basePrice: parseFloat(s.basePrice),
              sortOrder: i
            }))
          }
        } : {}),
        ...(poolItemIds !== undefined ? {
          items: {
            create: poolItemIds.map((poolItemId: string, i: number) => ({
              poolItemId,
              sortOrder: i
            }))
          }
        } : {}),
      }

      await tx.asYouLikeItCombos.update({ where: { id }, data: updateData })
    })

    const updated = await prisma.asYouLikeItCombos.findUnique({
      where: { id },
      include: {
        sizes: { orderBy: { sortOrder: 'asc' } },
        items: { orderBy: { sortOrder: 'asc' }, include: { pool_item: true } }
      }
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('AYC combo PUT error:', error)
    return NextResponse.json({ error: 'Failed to update combo' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(user, 'canDeleteAYLICombos')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    await prisma.asYouLikeItCombos.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('AYC combo DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete combo' }, { status: 500 })
  }
}
