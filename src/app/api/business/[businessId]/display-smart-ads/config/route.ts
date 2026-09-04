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
  const { itemType, itemId, priorityBoost, isDailySpecial, isFeatured, isHidden, displayDurationSecs, advertisingNote, advertisingImageId } = body

  if (!itemType || !itemId) {
    return NextResponse.json({ error: 'itemType and itemId are required' }, { status: 400 })
  }

  // Full editing (pricing-adjacent fields, images, notes, priority boost, hidden
  // status) requires canManageCustomerDisplay. A request touching ONLY isHidden,
  // or ONLY isDailySpecial, is a narrow single-purpose toggle — allowed for
  // anyone who can at least view the customer display (salespeople included by
  // default), since it can't change anything else about how the item is
  // configured: "86 an item" or "flip today's special" are quick shift-to-shift
  // actions, not configuration changes.
  const permissions = getEffectivePermissions(user, businessId)
  const otherFieldsUntouched =
    priorityBoost === undefined && isFeatured === undefined &&
    displayDurationSecs === undefined && advertisingNote === undefined && advertisingImageId === undefined
  const isHiddenOnlyToggle = isHidden !== undefined && isDailySpecial === undefined && otherFieldsUntouched
  const isDailySpecialOnlyToggle = isDailySpecial !== undefined && isHidden === undefined && otherFieldsUntouched
  const canToggleHidden = user.role === 'admin' || permissions.canManageCustomerDisplay ||
    ((isHiddenOnlyToggle || isDailySpecialOnlyToggle) && permissions.canViewCustomerDisplay)
  if (!canToggleHidden) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
