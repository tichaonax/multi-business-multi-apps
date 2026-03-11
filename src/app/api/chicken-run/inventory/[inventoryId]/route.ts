import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function GET(_request: NextRequest, { params }: { params: { inventoryId: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const inventory = await prisma.chickenInventory.findUnique({
      where: { id: params.inventoryId },
      include: {
        supplier: { select: { id: true, name: true } },
        birdWeights: { orderBy: { sequenceNo: 'asc' } },
        movements: { orderBy: { movementDate: 'desc' } },
      },
    })

    if (!inventory) return NextResponse.json({ error: 'Inventory entry not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: inventory })
  } catch (error) {
    console.error('GET /api/chicken-run/inventory/[inventoryId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
