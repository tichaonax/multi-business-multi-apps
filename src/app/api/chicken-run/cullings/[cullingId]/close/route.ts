import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function POST(_request: NextRequest, { params }: { params: { cullingId: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const culling = await prisma.chickenCulling.findUnique({
      where: { id: params.cullingId },
      include: { batch: { select: { businessId: true } } },
    })
    if (!culling) return NextResponse.json({ error: 'Culling session not found' }, { status: 404 })
    if (culling.weighingStatus !== 'OPEN') {
      return NextResponse.json({ error: 'Culling session is not open' }, { status: 400 })
    }
    if (culling.quantityCulled === 0) {
      return NextResponse.json({ error: 'No birds have been weighed yet' }, { status: 400 })
    }

    const businessId = culling.batch.businessId
    const totalWeight = Number(culling.totalWeightKg)
    const count = culling.quantityCulled
    const avgWeight = count > 0 ? totalWeight / count : 0

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const closedCulling = await tx.chickenCulling.update({
        where: { id: params.cullingId },
        data: {
          weighingStatus: 'CLOSED',
          closedAt: new Date(),
          avgWeightKg: avgWeight,
        },
      })

      const inventory = await tx.chickenInventory.create({
        data: {
          businessId,
          source: 'RAISED',
          cullingId: params.cullingId,
          entryDate: culling.cullingDate,
          weighingStatus: 'CLOSED',
          weightEntryMode: culling.weightEntryMode,
          quantityWhole: count,
          totalWeightKg: totalWeight,
          costPerBird: 0,
          costPerKg: 0,
          quantityInFreezer: count,
          notes: culling.notes || null,
          createdBy: user.id,
        },
      })

      await tx.chickenInventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          movementDate: culling.cullingDate,
          movementType: 'FREEZER_IN',
          quantity: count,
          weightKg: totalWeight,
          createdBy: user.id,
        },
      })

      return { culling: closedCulling, inventory }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('POST /api/chicken-run/cullings/[cullingId]/close error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
