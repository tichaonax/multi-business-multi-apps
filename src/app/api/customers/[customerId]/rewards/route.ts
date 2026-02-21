import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/customers/[customerId]/rewards?businessId=xxx
// Returns a customer's active (ISSUED, not expired) rewards for a specific business.
// Used by the POS when a customer is selected.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 })
    }

    const now = new Date()

    // Auto-expire overdue rewards for this customer in this business
    await prisma.customerRewards.updateMany({
      where: { customerId, businessId, status: 'ISSUED', expiresAt: { lt: now } },
      data: { status: 'EXPIRED' }
    })

    // Return active (ISSUED, non-expired) rewards + recently used rewards (last 90 days)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    const [rewards, usedRewards] = await Promise.all([
      prisma.customerRewards.findMany({
        where: { customerId, businessId, status: 'ISSUED', expiresAt: { gte: now } },
        include: { promo_campaigns: { select: { name: true } } },
        orderBy: [{ rewardAmount: 'asc' }, { expiresAt: 'asc' }]
      }),
      prisma.customerRewards.findMany({
        where: {
          customerId,
          businessId,
          status: { in: ['REDEEMED', 'DEACTIVATED', 'EXPIRED'] },
          createdAt: { gte: ninetyDaysAgo }
        },
        include: { promo_campaigns: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ])

    // Enrich both lists with product and WiFi config details
    const allRewards = [...rewards, ...usedRewards]
    const productIds = allRewards.map((r: any) => r.rewardProductId).filter(Boolean) as string[]
    const configIds = allRewards.map((r: any) => r.wifiTokenConfigId).filter(Boolean) as string[]

    const [products, wifiConfigs] = await Promise.all([
      productIds.length > 0
        ? prisma.businessProducts.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, basePrice: true } })
        : Promise.resolve([]),
      configIds.length > 0
        ? prisma.r710TokenConfigs.findMany({ where: { id: { in: configIds } }, select: { id: true, name: true, durationValue: true, durationUnit: true } })
        : Promise.resolve([])
    ])

    const productMap = Object.fromEntries(products.map((p: any) => [p.id, p]))
    const configMap = Object.fromEntries(wifiConfigs.map((c: any) => [c.id, c]))

    const enrich = (r: any) => ({
      ...r,
      rewardProduct: r.rewardProductId ? productMap[r.rewardProductId] ?? null : null,
      wifiConfig: r.wifiTokenConfigId ? configMap[r.wifiTokenConfigId] ?? null : null
    })

    return NextResponse.json({
      success: true,
      data: rewards.map(enrich),
      usedRewards: usedRewards.map(enrich)
    })
  } catch (error) {
    console.error('Error fetching customer rewards:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch rewards' }, { status: 500 })
  }
}
