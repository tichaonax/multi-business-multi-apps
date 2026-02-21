import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/customer-rewards/redeem
// Marks a reward as REDEEMED and links it to the order being paid.
// Called during POS checkout after the order is created.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rewardId, customerId, orderId } = body

    if (!rewardId || !customerId || !orderId) {
      return NextResponse.json(
        { success: false, error: 'rewardId, customerId and orderId are required' },
        { status: 400 }
      )
    }

    // Fetch the reward
    const reward = await prisma.customerRewards.findUnique({
      where: { id: rewardId }
    })

    if (!reward) {
      return NextResponse.json({ success: false, error: 'Reward not found' }, { status: 404 })
    }

    // Verify the reward belongs to this customer — prevents using someone else's reward
    if (reward.customerId !== customerId) {
      return NextResponse.json(
        { success: false, error: 'This reward does not belong to this customer' },
        { status: 403 }
      )
    }

    // Check reward is still ISSUED
    if (reward.status === 'REDEEMED') {
      return NextResponse.json({ success: false, error: 'This reward has already been redeemed' }, { status: 409 })
    }

    if (reward.status === 'EXPIRED') {
      return NextResponse.json({ success: false, error: 'This reward has expired' }, { status: 409 })
    }

    // Check expiry
    if (reward.expiresAt < new Date()) {
      await prisma.customerRewards.update({
        where: { id: rewardId },
        data: { status: 'EXPIRED' }
      })
      return NextResponse.json({ success: false, error: 'This reward has expired' }, { status: 409 })
    }

    // Mark as redeemed
    const updated = await prisma.customerRewards.update({
      where: { id: rewardId },
      data: {
        status: 'REDEEMED',
        redeemedAt: new Date(),
        redeemedOrderId: orderId
      }
    })

    // If the reward includes WiFi, pull an available token from the pool
    let wifiToken: { tokenCode: string; packageName: string; duration: number; ssid?: string } | null = null
    if (reward.wifiReward) {
      const token = await (prisma as any).wifiTokens.findFirst({
        where: {
          businessId: reward.businessId,
          status: 'AVAILABLE'
        },
        include: {
          token_configurations: { select: { name: true, durationMinutes: true, ssid: true } }
        }
      })
      if (token) {
        await (prisma as any).wifiTokens.update({
          where: { id: token.id },
          data: { status: 'SOLD' }
        })
        wifiToken = {
          tokenCode: token.token,
          packageName: token.token_configurations?.name || 'WiFi Access',
          duration: token.token_configurations?.durationMinutes || 0,
          ssid: token.token_configurations?.ssid || undefined
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        couponCode: updated.couponCode,
        rewardAmount: updated.rewardAmount,
        rewardType: updated.rewardType,
        wifiReward: updated.wifiReward,
        wifiToken,
        redeemedAt: updated.redeemedAt
      }
    })
  } catch (error) {
    console.error('Error redeeming customer reward:', error)
    return NextResponse.json({ success: false, error: 'Failed to redeem reward' }, { status: 500 })
  }
}
