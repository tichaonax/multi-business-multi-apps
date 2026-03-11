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

    const allInventory = await prisma.chickenInventory.findMany({
      where: { businessId, weighingStatus: 'CLOSED' },
      include: {
        supplier: { select: { id: true, name: true } },
        movements: { orderBy: { movementDate: 'desc' } },
      },
      orderBy: { entryDate: 'desc' },
    })

    const raised = allInventory.filter((i: { source: string }) => i.source === 'RAISED')
    const purchased = allInventory.filter((i: { source: string }) => i.source === 'PURCHASED')

    const summarise = (entries: typeof allInventory) => {
      const totalBirds = entries.reduce((s: number, i: { quantityWhole: number }) => s + i.quantityWhole, 0)
      const totalKg = entries.reduce((s: number, i: { totalWeightKg: unknown }) => s + Number(i.totalWeightKg), 0)
      const inFreezer = entries.reduce((s: number, i: { quantityInFreezer: number }) => s + i.quantityInFreezer, 0)
      return { totalBirds, totalKg: parseFloat(totalKg.toFixed(3)), inFreezer }
    }

    const raisedSummary = summarise(raised)
    const purchasedSummary = summarise(purchased)
    const purchasedTotalCost = purchased.reduce((s: number, i: { costPerKg: unknown; totalWeightKg: unknown }) => s + Number(i.costPerKg) * Number(i.totalWeightKg), 0)

    return NextResponse.json({
      success: true,
      data: {
        raised: { entries: raised, ...raisedSummary },
        purchased: {
          entries: purchased,
          ...purchasedSummary,
          totalCost: parseFloat(purchasedTotalCost.toFixed(2)),
        },
        combined: {
          totalInFreezer: raisedSummary.inFreezer + purchasedSummary.inFreezer,
          totalBirds: raisedSummary.totalBirds + purchasedSummary.totalBirds,
          totalKg: parseFloat((raisedSummary.totalKg + purchasedSummary.totalKg).toFixed(3)),
        },
      },
    })
  } catch (error) {
    console.error('GET /api/chicken-run/reports/inventory error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
