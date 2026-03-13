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
    const { totalCost, supplierId } = body

    if (!totalCost || Number(totalCost) <= 0) {
      return NextResponse.json({ error: 'totalCost must be greater than 0' }, { status: 400 })
    }

    const inventory = await prisma.chickenInventory.findUnique({
      where: { id: params.inventoryId },
    })
    if (!inventory) return NextResponse.json({ error: 'Inventory entry not found' }, { status: 404 })
    if (inventory.weighingStatus !== 'OPEN') {
      return NextResponse.json({ error: 'Inventory weighing session is not open' }, { status: 400 })
    }
    if (inventory.quantityWhole === 0) {
      return NextResponse.json({ error: 'No birds have been weighed yet' }, { status: 400 })
    }

    const count = inventory.quantityWhole
    const totalWeight = Number(inventory.totalWeightKg)
    const cost = Number(totalCost)
    const costPerBird = cost / count
    const costPerKg = totalWeight > 0 ? cost / totalWeight : 0

    const expenseAccount = await prisma.expenseAccounts.findFirst({
      where: { businessId: inventory.businessId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })

    const updatedInventory = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let expensePaymentId: string | null = null

      if (expenseAccount) {
        const payment = await tx.expenseAccountPayments.create({
          data: {
            expenseAccountId: expenseAccount.id,
            payeeType: supplierId ? 'SUPPLIER' : 'OTHER',
            ...(supplierId ? { payeeSupplierId: supplierId } : {}),
            amount: cost,
            paymentDate: inventory.entryDate,
            status: 'SUBMITTED',
            paymentType: 'REGULAR',
            notes: `Chicken Run: Purchased stock - ${count} birds ${totalWeight}kg`,
            createdBy: user.id,
          },
        })
        expensePaymentId = payment.id
      }

      const closed = await tx.chickenInventory.update({
        where: { id: params.inventoryId },
        data: {
          weighingStatus: 'CLOSED',
          closedAt: new Date(),
          quantityInFreezer: count,
          costPerBird,
          costPerKg,
          expensePaymentId,
          ...(supplierId ? { supplierId } : {}),
        },
      })

      await tx.chickenInventoryMovement.create({
        data: {
          inventoryId: params.inventoryId,
          movementDate: inventory.entryDate,
          movementType: 'FREEZER_IN',
          quantity: count,
          weightKg: totalWeight,
          createdBy: user.id,
        },
      })

      return closed
    })

    return NextResponse.json({ success: true, data: updatedInventory })
  } catch (error) {
    console.error('POST /api/chicken-run/inventory/[inventoryId]/close error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
