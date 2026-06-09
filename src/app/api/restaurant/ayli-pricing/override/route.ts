import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

export async function PUT(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(user, 'canCreateAYLICombos')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    // Two modes:
    // 1. Blanket % adjustment: { comboId, adjustmentPct, comboItemIds? }
    //    comboItemIds = null/undefined → apply to all items in combo
    // 2. Single item override: { overrides: [{ comboItemId, small, medium, large }] }
    const { comboId, adjustmentPct, comboItemIds, overrides } = body

    if (adjustmentPct != null && comboId) {
      const multiplier = 1 + (Number(adjustmentPct) / 100)
      const where: any = comboItemIds?.length
        ? { id: { in: comboItemIds }, comboId }
        : { comboId }

      const items = await prisma.asYouLikeItComboItems.findMany({ where })
      await Promise.all(items.map((item: any) =>
        prisma.asYouLikeItComboItems.update({
          where: { id: item.id },
          data: {
            pricePerKgSmall: Math.round(Number(item.pricePerKgSmall) * multiplier * 100) / 100,
            pricePerKgMedium: Math.round(Number(item.pricePerKgMedium) * multiplier * 100) / 100,
            pricePerKgLarge: Math.round(Number(item.pricePerKgLarge) * multiplier * 100) / 100,
          }
        })
      ))
      return NextResponse.json({ success: true, updated: items.length })
    }

    if (overrides?.length) {
      await Promise.all((overrides as Array<{ comboItemId: string; small?: number; medium?: number; large?: number }>).map(o => {
        const data: any = {}
        if (o.small != null) data.pricePerKgSmall = o.small
        if (o.medium != null) data.pricePerKgMedium = o.medium
        if (o.large != null) data.pricePerKgLarge = o.large
        return prisma.asYouLikeItComboItems.update({ where: { id: o.comboItemId }, data })
      }))
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Provide adjustmentPct+comboId or overrides array' }, { status: 400 })
  } catch (error) {
    console.error('AYLI pricing override error:', error)
    return NextResponse.json({ error: 'Failed to apply override' }, { status: 500 })
  }
}
