import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

// Generate a unique human-readable reward coupon code
function generateCouponCode(): string {
  return `RWD-${randomBytes(4).toString('hex').toUpperCase()}`
}

// Calculate expiry: issuedAt + rewardValidDays days
function calcExpiry(rewardValidDays: number): Date {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + rewardValidDays)
  return expiry
}

// POST /api/business/[businessId]/promo-campaigns/run
// Evaluates all customers for all active campaigns and issues rewards to eligible ones.
// Safe to run multiple times — idempotent (unique constraint prevents duplicate rewards).
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params

    // Current billing period
    const now = new Date()
    const periodYear = now.getFullYear()
    const periodMonth = now.getMonth() + 1 // 1-based
    const monthStart = new Date(periodYear, periodMonth - 1, 1)
    const monthEnd = new Date(periodYear, periodMonth, 1)

    // 1. Get all active campaigns for this business
    const campaigns = await prisma.promoCampaigns.findMany({
      where: { businessId, isActive: true }
    })

    if (campaigns.length === 0) {
      return NextResponse.json({ success: true, data: { rewarded: 0, message: 'No active campaigns' } })
    }

    // 2. Get each customer's total spend this month (COMPLETED + PAID orders only)
    const customerSpends = await prisma.businessOrders.groupBy({
      by: ['customerId'],
      where: {
        businessId,
        customerId: { not: null },
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        createdAt: { gte: monthStart, lt: monthEnd }
      },
      _sum: { totalAmount: true }
    })

    if (customerSpends.length === 0) {
      return NextResponse.json({ success: true, data: { rewarded: 0, message: 'No qualifying customer spend this month' } })
    }

    // 3. Evaluate each campaign against each customer's spend
    let totalRewarded = 0

    for (const campaign of campaigns) {
      const threshold = Number(campaign.spendThreshold)

      // Build spend map for this campaign
      const spendByCustomer = new Map<string, number>()
      customerSpends.forEach((s: typeof customerSpends[number]) => {
        if (s.customerId) spendByCustomer.set(s.customerId, Number(s._sum.totalAmount ?? 0))
      })

      const eligibleCustomerIds = customerSpends
        .filter((s: typeof customerSpends[number]) => s.customerId && Number(s._sum.totalAmount ?? 0) >= threshold)
        .map((s: typeof customerSpends[number]) => s.customerId as string)

      if (eligibleCustomerIds.length === 0) continue

      // 4. Find which customers already have a reward for this campaign this month
      const existingRewards = await prisma.customerRewards.findMany({
        where: {
          campaignId: campaign.id,
          periodYear,
          periodMonth,
          customerId: { in: eligibleCustomerIds }
        },
        select: { customerId: true }
      })

      const alreadyRewarded = new Set(existingRewards.map((r: { customerId: string }) => r.customerId))
      const newlyEligible = eligibleCustomerIds.filter((id: string) => !alreadyRewarded.has(id))

      if (newlyEligible.length === 0) continue

      // 5. Create rewards for newly eligible customers
      const rewardData = newlyEligible.map((customerId: string) => ({
        businessId,
        customerId,
        campaignId: campaign.id,
        rewardType: campaign.rewardType,
        rewardAmount: campaign.rewardAmount,
        rewardProductId: (campaign as any).rewardProductId || null,
        wifiTokenConfigId: (campaign as any).wifiTokenConfigId || null,
        periodSpend: spendByCustomer.get(customerId) ?? 0,
        couponCode: generateCouponCode(),
        status: 'ISSUED' as const,
        periodYear,
        periodMonth,
        issuedAt: now,
        expiresAt: calcExpiry(campaign.rewardValidDays),
        createdAt: now
      }))

      // Insert one by one to handle any rare coupon code collisions gracefully
      for (const reward of rewardData) {
        try {
          await prisma.customerRewards.create({ data: reward })
          totalRewarded++
        } catch (err: any) {
          // Unique constraint on couponCode — retry with a new code once
          if (err?.code === 'P2002' && err?.meta?.target?.includes('couponCode')) {
            await prisma.customerRewards.create({ data: { ...reward, couponCode: generateCouponCode() } })
            totalRewarded++
          } else {
            throw err
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        rewarded: totalRewarded,
        periodYear,
        periodMonth,
        message: `${totalRewarded} reward${totalRewarded !== 1 ? 's' : ''} issued`
      }
    })
  } catch (error) {
    console.error('Error running promo campaigns:', error)
    return NextResponse.json({ success: false, error: 'Failed to run campaigns' }, { status: 500 })
  }
}
