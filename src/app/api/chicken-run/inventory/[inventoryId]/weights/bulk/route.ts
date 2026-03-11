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
    const { mode, totalWeightKg, weightList, quantityWhole } = body

    const inventory = await prisma.chickenInventory.findUnique({
      where: { id: params.inventoryId },
    })
    if (!inventory) return NextResponse.json({ error: 'Inventory entry not found' }, { status: 404 })
    if (inventory.weighingStatus !== 'OPEN') {
      return NextResponse.json({ error: 'Inventory weighing session is not open' }, { status: 400 })
    }

    if (mode === 'BULK_TOTAL') {
      if (!quantityWhole || Number(quantityWhole) <= 0) {
        return NextResponse.json({ error: 'quantityWhole must be greater than 0' }, { status: 400 })
      }
      if (!totalWeightKg || Number(totalWeightKg) <= 0) {
        return NextResponse.json({ error: 'totalWeightKg must be greater than 0' }, { status: 400 })
      }

      const updatedInventory = await prisma.chickenInventory.update({
        where: { id: params.inventoryId },
        data: {
          quantityWhole: Number(quantityWhole),
          totalWeightKg: Number(totalWeightKg),
        },
      })

      return NextResponse.json({ success: true, data: updatedInventory })
    }

    if (mode === 'BULK_LIST') {
      if (!weightList || !Array.isArray(weightList) || weightList.length === 0) {
        return NextResponse.json({ error: 'weightList must be a non-empty array' }, { status: 400 })
      }

      const updatedInventory = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.chickenBirdWeight.deleteMany({ where: { inventoryId: params.inventoryId } })

        const weightData = (weightList as number[]).map((w: number, i: number) => ({
          inventoryId: params.inventoryId,
          weightKg: Number(w),
          sequenceNo: i + 1,
        }))

        await tx.chickenBirdWeight.createMany({ data: weightData })

        const count = weightData.length
        const total = weightData.reduce((sum: number, w: { weightKg: number }) => sum + w.weightKg, 0)

        return tx.chickenInventory.update({
          where: { id: params.inventoryId },
          data: {
            quantityWhole: count,
            totalWeightKg: total,
          },
        })
      })

      return NextResponse.json({ success: true, data: updatedInventory })
    }

    return NextResponse.json({ error: 'Invalid mode. Use BULK_TOTAL or BULK_LIST' }, { status: 400 })
  } catch (error) {
    console.error('POST /api/chicken-run/inventory/[inventoryId]/weights/bulk error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
