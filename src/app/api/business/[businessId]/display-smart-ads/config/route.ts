import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT /api/business/[businessId]/display-smart-ads/config
export async function PUT(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params
  const body = await req.json()
  const { itemType, itemId, priorityBoost, isDailySpecial, isFeatured, isHidden, displayDurationSecs, advertisingNote, advertisingImageId } = body

  if (!itemType || !itemId) {
    return NextResponse.json({ error: 'itemType and itemId are required' }, { status: 400 })
  }

  // If marking as daily special, clear the existing one first
  if (isDailySpecial) {
    await (prisma as any).displayProductConfig.updateMany({
      where: { businessId, isDailySpecial: true },
      data: { isDailySpecial: false }
    })
  }

  const record = await (prisma as any).displayProductConfig.upsert({
    where: { businessId_itemType_itemId: { businessId, itemType, itemId } },
    create: {
      businessId, itemType, itemId,
      priorityBoost: priorityBoost ?? 0,
      isDailySpecial: isDailySpecial ?? false,
      isFeatured: isFeatured ?? false,
      isHidden: isHidden ?? false,
      displayDurationSecs: displayDurationSecs ?? null,
      advertisingNote: advertisingNote ?? null,
      advertisingImageId: advertisingImageId ?? null,
    },
    update: {
      ...(priorityBoost !== undefined && { priorityBoost }),
      ...(isDailySpecial !== undefined && { isDailySpecial }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(isHidden !== undefined && { isHidden }),
      ...(displayDurationSecs !== undefined && { displayDurationSecs }),
      ...(advertisingNote !== undefined && { advertisingNote }),
      ...(advertisingImageId !== undefined && { advertisingImageId }),
    },
  })

  return NextResponse.json({ success: true, config: record })
}
