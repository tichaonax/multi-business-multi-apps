import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function POST(request: NextRequest, { params }: { params: { inventoryId: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { weightKg, notes } = body

    if (!weightKg || Number(weightKg) <= 0) {
      return NextResponse.json({ error: 'weightKg must be greater than 0' }, { status: 400 })
    }

    const inventory = await prisma.chickenInventory.findUnique({
      where: { id: params.inventoryId },
    })
    if (!inventory) return NextResponse.json({ error: 'Inventory entry not found' }, { status: 404 })
    if (inventory.weighingStatus !== 'OPEN') {
      return NextResponse.json({ error: 'Inventory weighing session is not open' }, { status: 400 })
    }

    const existingCount = await prisma.chickenBirdWeight.count({
      where: { inventoryId: params.inventoryId },
    })
    const sequenceNo = existingCount + 1

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const weight = await tx.chickenBirdWeight.create({
        data: {
          inventoryId: params.inventoryId,
          weightKg: parseFloat(String(weightKg)),
          sequenceNo,
          notes: notes || null,
        },
      })

      const allWeights = await tx.chickenBirdWeight.findMany({
        where: { inventoryId: params.inventoryId },
        select: { weightKg: true },
      })

      const count = allWeights.length
      const totalWeight = allWeights.reduce((sum: number, w: { weightKg: unknown }) => sum + Number(w.weightKg), 0)
      const avgWeight = count > 0 ? totalWeight / count : 0

      const updatedInventory = await tx.chickenInventory.update({
        where: { id: params.inventoryId },
        data: {
          quantityWhole: count,
          totalWeightKg: totalWeight,
        },
        include: { birdWeights: { orderBy: { sequenceNo: 'asc' } } },
      })

      return { weight, inventory: { ...updatedInventory, avgWeightKg: avgWeight } }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('POST /api/chicken-run/inventory/[inventoryId]/weights error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
