import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    const where: any = { businessId }
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) {
        const toDate = new Date(to)
        toDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = toDate
      }
    }

    const logs = await prisma.cashRoundingLogs.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    const totalUp = logs
      .filter((l) => l.direction === 'UP')
      .reduce((s, l) => s + Number(l.adjustment), 0)
    const totalDown = logs
      .filter((l) => l.direction === 'DOWN')
      .reduce((s, l) => s + Math.abs(Number(l.adjustment)), 0)

    return NextResponse.json({
      success: true,
      summary: {
        totalEvents: logs.length,
        upCount: logs.filter((l) => l.direction === 'UP').length,
        downCount: logs.filter((l) => l.direction === 'DOWN').length,
        totalRoundedUp: Math.round(totalUp * 100) / 100,
        totalRoundedDown: Math.round(totalDown * 100) / 100,
      },
      logs: logs.map((l) => ({
        id: l.id,
        direction: l.direction,
        originalAmount: Number(l.originalAmount),
        roundedAmount: Number(l.roundedAmount),
        adjustment: Number(l.adjustment),
        orderId: l.orderId,
        staffNote: l.staffNote,
        createdAt: l.createdAt,
      })),
    })
  } catch (error) {
    console.error('Error fetching cash rounding report:', error)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}
