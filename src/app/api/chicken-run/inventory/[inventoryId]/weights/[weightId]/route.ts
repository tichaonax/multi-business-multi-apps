import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { inventoryId: string; weightId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const inventory = await prisma.chickenInventory.findUnique({
      where: { id: params.inventoryId },
    })
    if (!inventory) return NextResponse.json({ error: 'Inventory entry not found' }, { status: 404 })
    if (inventory.weighingStatus !== 'OPEN') {
      return NextResponse.json({ error: 'Inventory weighing session is not open' }, { status: 400 })
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.chickenBirdWeight.delete({ where: { id: params.weightId } })

      const allWeights = await tx.chickenBirdWeight.findMany({
        where: { inventoryId: params.inventoryId },
        select: { weightKg: true },
        orderBy: { sequenceNo: 'asc' },
      })

      const count = allWeights.length
      const total = allWeights.reduce((sum: number, w: { weightKg: unknown }) => sum + Number(w.weightKg), 0)

      await tx.chickenInventory.update({
        where: { id: params.inventoryId },
        data: {
          quantityWhole: count,
          totalWeightKg: total,
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/chicken-run/inventory/[inventoryId]/weights/[weightId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
