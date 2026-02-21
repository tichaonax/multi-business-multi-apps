import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/business/[businessId]/promo-campaigns/[campaignId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; campaignId: string }> }
) {
  try {
    const { businessId, campaignId } = await params
    const body = await request.json()

    const existing = await prisma.promoCampaigns.findFirst({
      where: { id: campaignId, businessId }
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = String(body.name).trim()
    if (body.description !== undefined) updateData.description = body.description?.trim() || null
    if (body.spendThreshold !== undefined) updateData.spendThreshold = Number(body.spendThreshold)
    if (body.rewardType !== undefined) updateData.rewardType = body.rewardType
    if (body.rewardAmount !== undefined) updateData.rewardAmount = Number(body.rewardAmount)
    if (body.rewardProductId !== undefined) updateData.rewardProductId = body.rewardProductId || null
    if (body.wifiTokenConfigId !== undefined) updateData.wifiTokenConfigId = body.wifiTokenConfigId || null
    if (body.rewardValidDays !== undefined) updateData.rewardValidDays = Number(body.rewardValidDays)
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive)

    const campaign = await prisma.promoCampaigns.update({
      where: { id: campaignId },
      data: updateData
    })

    // When deactivating a campaign, mark all its outstanding ISSUED rewards as DEACTIVATED
    if (body.isActive === false) {
      await prisma.customerRewards.updateMany({
        where: { campaignId, status: 'ISSUED' },
        data: { status: 'DEACTIVATED' }
      })
    }

    return NextResponse.json({ success: true, data: campaign })
  } catch (error) {
    console.error('Error updating promo campaign:', error)
    return NextResponse.json({ success: false, error: 'Failed to update campaign' }, { status: 500 })
  }
}

// DELETE /api/business/[businessId]/promo-campaigns/[campaignId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string; campaignId: string }> }
) {
  try {
    const { businessId, campaignId } = await params

    const existing = await prisma.promoCampaigns.findFirst({
      where: { id: campaignId, businessId },
      include: { _count: { select: { customer_rewards: true } } }
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 })
    }

    // Soft-delete if rewards have been issued — preserve history
    if (existing._count.customer_rewards > 0) {
      await prisma.promoCampaigns.update({
        where: { id: campaignId },
        data: { isActive: false }
      })
      return NextResponse.json({
        success: true,
        data: { deactivated: true, message: 'Campaign has issued rewards and was deactivated instead of deleted' }
      })
    }

    await prisma.promoCampaigns.delete({ where: { id: campaignId } })
    return NextResponse.json({ success: true, data: { deleted: true } })
  } catch (error) {
    console.error('Error deleting promo campaign:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete campaign' }, { status: 500 })
  }
}
