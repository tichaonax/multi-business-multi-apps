import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/business/[businessId]/display-smart-ads/settings
export async function GET(_req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params
  const settings = await (prisma as any).displayGlobalSettings.findUnique({
    where: { businessId }
  })
  return NextResponse.json({
    rotationIntervalSecs: settings?.rotationIntervalSecs ?? 6,
    enableSmartDisplay: settings?.enableSmartDisplay ?? false,
    enableSplitLayout: settings?.enableSplitLayout ?? true,
    maxItemsInRotation: settings?.maxItemsInRotation ?? 12,
    specialShowPercentage: settings?.specialShowPercentage ?? 25,
    leftPanelCardCount: settings?.leftPanelCardCount ?? 2,
    rightPanelColumns: settings?.rightPanelColumns ?? 2,
    rightPanelRows: settings?.rightPanelRows ?? 4,
  })
}

// PUT /api/business/[businessId]/display-smart-ads/settings
export async function PUT(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params
  const body = await req.json()
  const { rotationIntervalSecs, enableSmartDisplay, enableSplitLayout, maxItemsInRotation, specialShowPercentage, leftPanelCardCount, rightPanelColumns, rightPanelRows } = body

  const settings = await (prisma as any).displayGlobalSettings.upsert({
    where: { businessId },
    create: {
      businessId,
      rotationIntervalSecs: rotationIntervalSecs ?? 6,
      enableSmartDisplay: enableSmartDisplay ?? false,
      enableSplitLayout: enableSplitLayout ?? true,
      maxItemsInRotation: maxItemsInRotation ?? 12,
      specialShowPercentage: specialShowPercentage ?? 25,
      leftPanelCardCount: leftPanelCardCount ?? 2,
      rightPanelColumns: rightPanelColumns ?? 2,
      rightPanelRows: rightPanelRows ?? 4,
    },
    update: {
      ...(rotationIntervalSecs !== undefined && { rotationIntervalSecs }),
      ...(enableSmartDisplay !== undefined && { enableSmartDisplay }),
      ...(enableSplitLayout !== undefined && { enableSplitLayout }),
      ...(maxItemsInRotation !== undefined && { maxItemsInRotation }),
      ...(specialShowPercentage !== undefined && { specialShowPercentage }),
      ...(leftPanelCardCount !== undefined && { leftPanelCardCount }),
      ...(rightPanelColumns !== undefined && { rightPanelColumns }),
      ...(rightPanelRows !== undefined && { rightPanelRows }),
    },
  })

  return NextResponse.json({ success: true, settings })
}
