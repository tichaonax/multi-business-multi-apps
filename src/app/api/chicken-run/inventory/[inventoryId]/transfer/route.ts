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
    const { movementDate, movementType, quantity, destinationBusinessId, purpose, notes } = body

    if (!movementDate) return NextResponse.json({ error: 'movementDate is required' }, { status: 400 })
    if (!movementType) return NextResponse.json({ error: 'movementType is required' }, { status: 400 })
    if (!quantity || Number(quantity) <= 0) {
      return NextResponse.json({ error: 'quantity must be greater than 0' }, { status: 400 })
    }

    const inventory = await prisma.chickenInventory.findUnique({
      where: { id: params.inventoryId },
    })
    if (!inventory) return NextResponse.json({ error: 'Inventory entry not found' }, { status: 404 })
    if (inventory.weighingStatus !== 'CLOSED') {
      return NextResponse.json({ error: 'Inventory must be closed before transfers' }, { status: 400 })
    }

    const qty = Number(quantity)
    if (qty > inventory.quantityInFreezer) {
      return NextResponse.json({
        error: `Cannot transfer ${qty} birds. Only ${inventory.quantityInFreezer} available in freezer.`,
      }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const movement = await tx.chickenInventoryMovement.create({
        data: {
          inventoryId: params.inventoryId,
          movementDate: new Date(movementDate),
          movementType,
          quantity: qty,
          destinationBusinessId: destinationBusinessId || null,
          purpose: purpose || null,
          notes: notes || null,
          createdBy: user.id,
        },
      })

      const updatedInventory = await tx.chickenInventory.update({
        where: { id: params.inventoryId },
        data: { quantityInFreezer: { decrement: qty } },
      })

      return { movement, inventory: updatedInventory }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('POST /api/chicken-run/inventory/[inventoryId]/transfer error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
