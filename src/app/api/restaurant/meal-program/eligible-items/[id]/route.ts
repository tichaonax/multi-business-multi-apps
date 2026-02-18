import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// ─── PUT /api/restaurant/meal-program/eligible-items/[id] ───────────────────
// Update an eligible item (toggle active status or notes).
// Body: { isActive?, notes? }
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const canManage =
      isAdmin ||
      (user.businessMemberships || []).some(
        (m: any) =>
          m.permissions?.canManageInventory === true ||
          m.permissions?.isAdmin === true ||
          m.role === 'business-owner' ||
          m.role === 'business-manager'
      )
    if (!canManage) {
      return NextResponse.json(
        { error: 'You do not have permission to manage eligible items' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { isActive, notes } = body

    const updated = await prisma.mealProgramEligibleItems.update({
      where: { id },
      data: {
        ...(isActive !== undefined ? { isActive } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: {
        product: { select: { name: true, basePrice: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        productId: updated.productId,
        productName: updated.product.name,
        productBasePrice: Number(updated.product.basePrice),
        isActive: updated.isActive,
        notes: updated.notes,
        updatedAt: updated.updatedAt,
      },
    })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Eligible item not found' }, { status: 404 })
    }
    console.error('[meal-program/eligible-items/[id] PUT]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/restaurant/meal-program/eligible-items/[id] ────────────────
// Remove an item from the eligible list (hard delete — no transactions linked).
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const canManage =
      isAdmin ||
      (user.businessMemberships || []).some(
        (m: any) =>
          m.permissions?.canManageInventory === true ||
          m.permissions?.isAdmin === true ||
          m.role === 'business-owner' ||
          m.role === 'business-manager'
      )
    if (!canManage) {
      return NextResponse.json(
        { error: 'You do not have permission to manage eligible items' },
        { status: 403 }
      )
    }

    const { id } = params

    await prisma.mealProgramEligibleItems.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Eligible item removed' })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Eligible item not found' }, { status: 404 })
    }
    console.error('[meal-program/eligible-items/[id] DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
