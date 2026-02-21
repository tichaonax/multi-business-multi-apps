import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/business/[businessId]/customer-rewards
// Admin view: list all rewards for the business with optional filters
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')         // ISSUED | REDEEMED | EXPIRED
    const campaignId = searchParams.get('campaignId')
    const customerId = searchParams.get('customerId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))
    const skip = (page - 1) * limit

    // Auto-expire any overdue ISSUED rewards before returning results
    await prisma.customerRewards.updateMany({
      where: {
        businessId,
        status: 'ISSUED',
        expiresAt: { lt: new Date() }
      },
      data: { status: 'EXPIRED' }
    })

    const where: Record<string, unknown> = { businessId }
    if (status) where.status = status
    if (campaignId) where.campaignId = campaignId
    if (customerId) where.customerId = customerId

    const [rewards, total] = await Promise.all([
      prisma.customerRewards.findMany({
        where,
        include: {
          business_customers: { select: { id: true, name: true, phone: true, customerNumber: true } },
          promo_campaigns: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.customerRewards.count({ where })
    ])

    // Enrich with product and WiFi config names
    const productIds = rewards.map((r: any) => r.rewardProductId).filter(Boolean) as string[]
    const configIds = rewards.map((r: any) => r.wifiTokenConfigId).filter(Boolean) as string[]
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
    const enriched = rewards.map((r: any) => ({
      ...r,
      rewardProduct: r.rewardProductId ? productMap[r.rewardProductId] ?? null : null,
      wifiConfig: r.wifiTokenConfigId ? configMap[r.wifiTokenConfigId] ?? null : null
    }))

    return NextResponse.json({
      success: true,
      data: enriched,
      meta: { total, page, limit, pages: Math.ceil(total / limit) }
    })
  } catch (error) {
    console.error('Error fetching customer rewards:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch rewards' }, { status: 500 })
  }
}
