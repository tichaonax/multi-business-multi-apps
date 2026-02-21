import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/business/[businessId]/promo-campaigns
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params

    const campaigns = await prisma.promoCampaigns.findMany({
      where: { businessId },
      include: {
        _count: { select: { customer_rewards: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: campaigns })
  } catch (error) {
    console.error('Error fetching promo campaigns:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

// POST /api/business/[businessId]/promo-campaigns
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params
    const body = await request.json()
    const { name, description, spendThreshold, rewardType, rewardAmount, rewardProductId, wifiTokenConfigId, rewardValidDays, createdBy } = body

    if (!name || spendThreshold === undefined) {
      return NextResponse.json(
        { success: false, error: 'name and spendThreshold are required' },
        { status: 400 }
      )
    }

    const hasCredit = rewardType === 'CREDIT' && Number(rewardAmount) > 0
    const hasProduct = !!rewardProductId
    const hasWifi = !!wifiTokenConfigId

    if (!hasCredit && !hasProduct && !hasWifi) {
      return NextResponse.json(
        { success: false, error: 'Campaign must include at least one reward: credit, free item, or WiFi' },
        { status: 400 }
      )
    }

    if (Number(spendThreshold) <= 0) {
      return NextResponse.json(
        { success: false, error: 'spendThreshold must be greater than 0' },
        { status: 400 }
      )
    }

    const campaign = await prisma.promoCampaigns.create({
      data: {
        businessId,
        name: name.trim(),
        description: description?.trim() || null,
        spendThreshold: Number(spendThreshold),
        rewardType: hasCredit ? 'CREDIT' : 'FREE_WIFI',
        rewardAmount: hasCredit ? Number(rewardAmount) : 0,
        rewardProductId: rewardProductId || null,
        wifiTokenConfigId: wifiTokenConfigId || null,
        rewardValidDays: rewardValidDays ? Number(rewardValidDays) : 30,
        createdBy: createdBy || null,
        isActive: true
      }
    })

    return NextResponse.json({ success: true, data: campaign }, { status: 201 })
  } catch (error) {
    console.error('Error creating promo campaign:', error)
    return NextResponse.json({ success: false, error: 'Failed to create campaign' }, { status: 500 })
  }
}
