import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

// PUT /api/business/[businessId]/display-smart-ads/config
export async function PUT(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId } = await params
  const body = await req.json()
  const { itemType, itemId, priorityBoost, isFeatured, isHidden, displayDurationSecs, advertisingNote, advertisingImageId } = body

  if (!itemType || !itemId) {
    return NextResponse.json({ error: 'itemType and itemId are required' }, { status: 400 })
  }

  // Full editing (pricing-adjacent fields, images, notes, priority boost, hidden
  // status) requires canManageCustomerDisplay. A request touching ONLY isHidden is
  // the narrow "quickly 86 an item / bring it back" toggle — allowed for anyone who
  // can at least view the customer display (salespeople included by default), since
  // it can't change anything else about how the item is configured.
  // (Today's Special is a separate, real system — see /api/restaurant/daily-special/
  // quick-set and /override — not a field on this config at all.)
  const permissions = getEffectivePermissions(user, businessId)
  const isHiddenOnlyToggle =
    isHidden !== undefined &&
    priorityBoost === undefined && isFeatured === undefined &&
    displayDurationSecs === undefined && advertisingNote === undefined && advertisingImageId === undefined
  const canToggleHidden = user.role === 'admin' || permissions.canManageCustomerDisplay ||
    (isHiddenOnlyToggle && permissions.canViewCustomerDisplay)
  if (!canToggleHidden) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const record = await (prisma as any).displayProductConfig.upsert({
    where: { businessId_itemType_itemId: { businessId, itemType, itemId } },
    create: {
      businessId, itemType, itemId,
      priorityBoost: priorityBoost ?? 0,
      isFeatured: isFeatured ?? false,
      isHidden: isHidden ?? false,
      displayDurationSecs: displayDurationSecs ?? null,
      advertisingNote: advertisingNote ?? null,
      advertisingImageId: advertisingImageId ?? null,
    },
    update: {
      ...(priorityBoost !== undefined && { priorityBoost }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(isHidden !== undefined && { isHidden }),
      ...(displayDurationSecs !== undefined && { displayDurationSecs }),
      ...(advertisingNote !== undefined && { advertisingNote }),
      ...(advertisingImageId !== undefined && { advertisingImageId }),
    },
  })

  return NextResponse.json({ success: true, config: record })
}
