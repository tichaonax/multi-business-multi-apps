import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const startDate = startDateParam ? new Date(startDateParam) : new Date(Date.now() - 30 * 86400000)
    const endDate = endDateParam ? new Date(endDateParam + 'T23:59:59.999Z') : new Date()

    const inventoryEntries = await prisma.chickenInventory.findMany({
      where: { businessId },
      select: { id: true, source: true },
    })

    const inventoryIds = inventoryEntries.map((i: { id: string }) => i.id)
    const sourceMap: Record<string, string> = {}
    for (const i of inventoryEntries) {
      sourceMap[i.id] = i.source
    }

    if (inventoryIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          movements: [],
          summary: { totalKitchenOut: 0, totalTransferred: 0, raisedUsed: 0, purchasedUsed: 0 },
        },
      })
    }

    const movements = await prisma.chickenInventoryMovement.findMany({
      where: {
        inventoryId: { in: inventoryIds },
        movementType: { in: ['KITCHEN_OUT', 'BUSINESS_TRANSFER'] },
        movementDate: { gte: startDate, lte: endDate },
      },
      orderBy: { movementDate: 'desc' },
    })

    const enriched = movements.map((m: {
      id: string
      inventoryId: string
      movementDate: Date
      movementType: string
      quantity: number
      weightKg: unknown
      destinationBusinessId: string | null
      purpose: string | null
      notes: string | null
    }) => ({
      ...m,
      source: sourceMap[m.inventoryId] ?? 'UNKNOWN',
    }))

    const totalKitchenOut = enriched
      .filter((m: { movementType: string }) => m.movementType === 'KITCHEN_OUT')
      .reduce((s: number, m: { quantity: number }) => s + m.quantity, 0)
    const totalTransferred = enriched
      .filter((m: { movementType: string }) => m.movementType === 'BUSINESS_TRANSFER')
      .reduce((s: number, m: { quantity: number }) => s + m.quantity, 0)
    const raisedUsed = enriched
      .filter((m: { source: string }) => m.source === 'RAISED')
      .reduce((s: number, m: { quantity: number }) => s + m.quantity, 0)
    const purchasedUsed = enriched
      .filter((m: { source: string }) => m.source === 'PURCHASED')
      .reduce((s: number, m: { quantity: number }) => s + m.quantity, 0)

    return NextResponse.json({
      success: true,
      data: {
        movements: enriched,
        summary: { totalKitchenOut, totalTransferred, raisedUsed, purchasedUsed },
      },
    })
  } catch (error) {
    console.error('GET /api/chicken-run/reports/kitchen-usage error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
