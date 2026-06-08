import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

// PUT — update a special (price, bullets, image, add-ons)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(user, 'canManageDailySpecial')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { specialPrice, bulletPoints, imageId, addOns } = await req.json()
    const { id } = params

    const existing = await prisma.dailySpecial.findUnique({ where: { id } })
    if (!existing || !existing.isActive) {
      return NextResponse.json({ error: 'Special not found' }, { status: 404 })
    }

    // Validate add-on products if provided
    if (Array.isArray(addOns) && addOns.length > 0) {
      const addOnIds = addOns.map((a: { productId: string }) => a.productId)
      const found = await prisma.businessProducts.findMany({
        where: { id: { in: addOnIds }, businessId: existing.businessId, isActive: true },
        select: { id: true },
      })
      if (found.length !== addOnIds.length) {
        return NextResponse.json({ error: 'One or more add-on products not found' }, { status: 404 })
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Replace add-ons wholesale
      if (Array.isArray(addOns)) {
        await tx.dailySpecialAddOn.deleteMany({ where: { dailySpecialId: id } })
        if (addOns.length > 0) {
          await tx.dailySpecialAddOn.createMany({
            data: addOns.map((a: { productId: string; quantity?: number; sortOrder?: number }, idx: number) => ({
              dailySpecialId: id,
              productId: a.productId,
              quantity: a.quantity ?? 1,
              sortOrder: a.sortOrder ?? idx,
            })),
          })
        }
      }

      return tx.dailySpecial.update({
        where: { id },
        data: {
          ...(specialPrice != null && { specialPrice }),
          ...(bulletPoints != null && { bulletPoints }),
          ...(imageId !== undefined && { imageId }),
        },
        include: {
          product: { select: { id: true, name: true, menuNumber: true, basePrice: true } },
          add_ons: {
            include: { product: { select: { id: true, name: true, basePrice: true } } },
            orderBy: { sortOrder: 'asc' },
          },
        },
      })
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Daily special PUT error:', error)
    return NextResponse.json({ error: 'Failed to update special' }, { status: 500 })
  }
}

// DELETE — soft-delete a special from the library
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(user, 'canManageDailySpecial')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = params

    await prisma.dailySpecial.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Daily special DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete special' }, { status: 500 })
  }
}
