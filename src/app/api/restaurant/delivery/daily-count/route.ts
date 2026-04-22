import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const deliveryResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM delivery_order_meta dom
      JOIN business_orders bo ON bo.id = dom."orderId"
      WHERE bo."businessId" = ${businessId}
        AND bo."createdAt" >= ${startOfDay}
        AND bo."createdAt" <= ${endOfDay}
    `

    const pickupResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM business_orders
      WHERE "businessId" = ${businessId}
        AND "paymentMethod" = 'ON_PICKUP'
        AND "createdAt" >= ${startOfDay}
        AND "createdAt" <= ${endOfDay}
    `

    const deliveryCount = Number(deliveryResult[0]?.count ?? 0)
    const pickupCount = Number(pickupResult[0]?.count ?? 0)

    return NextResponse.json({ deliveryCount, pickupCount })
  } catch (error) {
    console.error('Error in delivery daily-count:', error)
    return NextResponse.json({ error: 'Failed to get counts' }, { status: 500 })
  }
}
