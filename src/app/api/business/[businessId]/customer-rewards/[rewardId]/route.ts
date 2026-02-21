import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/business/[businessId]/customer-rewards/[rewardId]
// Deactivate an issued reward
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string; rewardId: string }> }
) {
  try {
    const { businessId, rewardId } = await params

    const reward = await prisma.customerRewards.findFirst({
      where: { id: rewardId, businessId }
    })

    if (!reward) {
      return NextResponse.json({ success: false, error: 'Reward not found' }, { status: 404 })
    }

    if (reward.status !== 'ISSUED') {
      return NextResponse.json(
        { success: false, error: 'Only ISSUED rewards can be deactivated' },
        { status: 400 }
      )
    }

    const updated = await prisma.customerRewards.update({
      where: { id: rewardId },
      data: { status: 'DEACTIVATED' }
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error deactivating reward:', error)
    return NextResponse.json({ success: false, error: 'Failed to deactivate reward' }, { status: 500 })
  }
}
