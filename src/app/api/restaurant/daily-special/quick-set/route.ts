import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

function getTodayDateStr(): string {
  return new Date().toLocaleDateString('en-CA')
}

// POST — make a plain menu item today's special with one click, from the
// Item Priority / Product Display Settings quick-toggle. Unlike the full
// Today's Special Library flow (which requires a promo price, add-ons, etc.
// to be configured up front), this reuses an existing library entry for the
// product if one exists, or creates a minimal one (no discount — special
// price defaults to the item's current base price) so the toggle works
// immediately for any item. Setting today's override this way replaces
// whatever special was previously active for today, same as the full flow.
export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(user, 'canOverrideDailySpecial')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { businessId, productId } = await req.json()
    if (!businessId || !productId) {
      return NextResponse.json({ error: 'businessId and productId are required' }, { status: 400 })
    }

    const product = await prisma.businessProducts.findFirst({
      where: { id: productId, businessId },
      select: { id: true, basePrice: true },
    })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    let special = await prisma.dailySpecial.findFirst({
      where: { businessId, productId, isActive: true },
    })
    if (!special) {
      special = await prisma.dailySpecial.create({
        data: {
          businessId,
          productId,
          specialPrice: product.basePrice,
          includeWifi: true,
          bulletPoints: [],
        },
      })
    }

    const date = getTodayDateStr()
    await prisma.dailySpecialDayOverride.upsert({
      where: { businessId_date: { businessId, date } },
      create: {
        businessId,
        date,
        isDisabled: false,
        overrideSpecialId: special.id,
        createdById: user.id,
        createdByName: user.name ?? '',
      },
      update: {
        isDisabled: false,
        overrideSpecialId: special.id,
        createdById: user.id,
        createdByName: user.name ?? '',
      },
    })

    return NextResponse.json({ success: true, specialId: special.id })
  } catch (error) {
    console.error('Daily special quick-set POST error:', error)
    return NextResponse.json({ error: 'Failed to set special' }, { status: 500 })
  }
}
