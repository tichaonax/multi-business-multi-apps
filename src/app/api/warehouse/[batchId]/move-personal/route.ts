import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { batchId: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const hasPermission = isAdmin || (user.permissions as any)?.canAccessWarehouse === true
    if (!hasPermission) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { batchId } = params
    const body = await req.json()
    const { itemIds } = body

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'itemIds array is required' }, { status: 400 })
    }

    const batch = await (prisma as any).warehouseBatches.findUnique({ where: { id: batchId } })
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

    const warehouseItems = await (prisma as any).warehouseItems.findMany({
      where: { id: { in: itemIds }, batchId, status: 'IN_WAREHOUSE' },
    })
    if (warehouseItems.length === 0) {
      return NextResponse.json({ error: 'No eligible IN_WAREHOUSE items found' }, { status: 400 })
    }

    const movedAt = new Date()
    const results: Array<{ itemId: string; expenseId: string }> = []

    for (const item of warehouseItems) {
      const amount = item.costUsd ? Number(item.costUsd) : 0
      const description = item.shortName || item.productName.slice(0, 100)

      const expense = await (prisma as any).personalExpenses.create({
        data: {
          category: 'Warehouse',
          description,
          amount,
          date: movedAt,
          notes: `Warehouse import — ${batch.batchName} / ${item.orderNumber}`,
          userId: user.id,
          updatedAt: movedAt,
        }
      })

      await (prisma as any).warehouseItems.update({
        where: { id: item.id },
        data: {
          status: 'MOVED_TO_PERSONAL',
          personalExpenseId: expense.id,
          movedAt,
          movedBy: user.id,
          updatedAt: movedAt,
        }
      })

      results.push({ itemId: item.id, expenseId: expense.id })
    }

    return NextResponse.json({
      success: true,
      movedCount: results.length,
      items: results,
    })
  } catch (error: any) {
    console.error('POST /api/warehouse/[batchId]/move-personal error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
