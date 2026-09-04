import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { computeStatus, isOpenPromotion } from '@/lib/promotions/resolve-active-promotions'

// PUT /api/business/[businessId]/promotions/[id]
// Body is either { action: 'pause' | 'resume' } or an edit patch (discountType,
// discountValue, startAt, endAt) — edits only allowed while still SCHEDULED
// (hasn't started yet), to avoid retroactively changing a promo customers may
// have already been charged under.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ businessId: string; id: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId, id } = await params
  const permissions = getEffectivePermissions(user, businessId)
  if (user.role !== 'admin' && !permissions.canManagePromotions) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const promo = await prisma.productPromotions.findFirst({ where: { id, businessId } })
  if (!promo) return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })

  const body = await req.json()
  const now = new Date()

  if (body.action === 'pause') {
    const updated = await prisma.productPromotions.update({ where: { id }, data: { isPaused: true } })
    return NextResponse.json({ success: true, promotion: updated })
  }

  if (body.action === 'resume') {
    if (now > promo.endAt) {
      return NextResponse.json({ error: "This promotion's scheduled window has already ended — create a new one instead" }, { status: 400 })
    }
    // Something else may have been scheduled for this item while this one was paused.
    const others = await prisma.productPromotions.findMany({
      where: { businessId, itemType: promo.itemType, itemId: promo.itemId, id: { not: id } },
    })
    const conflicting = others.find(p => isOpenPromotion(p, now) && new Date(p.endAt) >= promo.startAt && new Date(p.startAt) <= promo.endAt)
    if (conflicting) {
      return NextResponse.json({ error: 'Another promotion is now active/scheduled for this item — pause or end that one first' }, { status: 409 })
    }
    const updated = await prisma.productPromotions.update({ where: { id }, data: { isPaused: false } })
    return NextResponse.json({ success: true, promotion: updated })
  }

  // Full edit — only while not yet started.
  const status = computeStatus(promo, now)
  if (status !== 'SCHEDULED') {
    return NextResponse.json({ error: 'Only a promotion that has not started yet can be edited — pause or end an active one instead' }, { status: 400 })
  }
  const { discountType, discountValue, startAt, endAt } = body
  const data: Record<string, unknown> = {}
  if (discountType !== undefined) {
    if (!['FIXED_PRICE', 'PERCENT_OFF'].includes(discountType)) {
      return NextResponse.json({ error: 'discountType must be FIXED_PRICE or PERCENT_OFF' }, { status: 400 })
    }
    if (promo.itemType === 'category' && discountType !== 'PERCENT_OFF') {
      return NextResponse.json({ error: 'Category-level promotions only support percent-off' }, { status: 400 })
    }
    data.discountType = discountType
  }
  if (discountValue !== undefined) data.discountValue = discountValue
  if (startAt !== undefined) data.startAt = new Date(startAt)
  if (endAt !== undefined) data.endAt = new Date(endAt)
  if ((data.startAt as Date | undefined) && (data.endAt as Date | undefined) && (data.endAt as Date) <= (data.startAt as Date)) {
    return NextResponse.json({ error: 'endAt must be after startAt' }, { status: 400 })
  }

  const updated = await prisma.productPromotions.update({ where: { id }, data })
  return NextResponse.json({ success: true, promotion: updated })
}

// DELETE /api/business/[businessId]/promotions/[id] — only a not-yet-started promotion
// can be hard-deleted; anything that has run must be ended/paused instead, to keep history.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ businessId: string; id: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId, id } = await params
  const permissions = getEffectivePermissions(user, businessId)
  if (user.role !== 'admin' && !permissions.canManagePromotions) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const promo = await prisma.productPromotions.findFirst({ where: { id, businessId } })
  if (!promo) return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })

  if (new Date() >= promo.startAt) {
    return NextResponse.json({ error: 'This promotion has already started — pause or end it instead of deleting, to keep history' }, { status: 400 })
  }

  await prisma.productPromotions.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
