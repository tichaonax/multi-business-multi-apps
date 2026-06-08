import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

function getTodayDateStr(): string {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in server local time
}

function getDayOfWeek(): number {
  return new Date().getDay() // 0 = Sunday … 6 = Saturday
}

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const businessId = new URL(req.url).searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    const todayDate = getTodayDateStr()
    const dayOfWeek = getDayOfWeek()

    // Step 1: check for a day override
    const override = await prisma.dailySpecialDayOverride.findUnique({
      where: { businessId_date: { businessId, date: todayDate } },
    })

    if (override?.isDisabled) {
      return NextResponse.json(null)
    }

    // Determine which special to use
    let specialId: string | null = override?.overrideSpecialId ?? null

    if (!specialId) {
      // Step 2: fall back to scheduled special for this day
      const schedule = await prisma.dailySpecialSchedule.findUnique({
        where: { businessId_dayOfWeek: { businessId, dayOfWeek } },
      })
      specialId = schedule?.specialId ?? null
    }

    if (!specialId) return NextResponse.json(null)

    const special = await prisma.dailySpecial.findFirst({
      where: { id: specialId, businessId, isActive: true },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            menuNumber: true,
            basePrice: true,
            product_images: {
              select: { imageUrl: true },
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
              take: 1,
            },
          },
        },
        add_ons: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                basePrice: true,
                isActive: true,
                product_images: {
                  select: { imageUrl: true },
                  orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                  take: 1,
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!special) return NextResponse.json(null)

    // custom uploaded images → /api/images/[id]; product file images → direct path
    const productImageUrl = special.product.product_images[0]?.imageUrl ?? null
    const displayImageUrl = special.imageId
      ? `/api/images/${special.imageId}`
      : productImageUrl

    return NextResponse.json({
      specialId: special.id,
      productId: special.product.id,
      productName: special.product.name,
      menuNumber: special.product.menuNumber,
      basePrice: Number(special.product.basePrice),
      specialPrice: Number(special.specialPrice),
      includeWifi: special.includeWifi,
      bulletPoints: special.bulletPoints as string[],
      imageUrl: displayImageUrl, // final ready-to-use URL for <img src>
      addOns: special.add_ons
        .filter((a) => a.product.isActive)
        .map((a) => ({
          addOnId: a.id,
          productId: a.product.id,
          productName: a.product.name,
          quantity: a.quantity,
          unitPrice: Number(a.product.basePrice),
          sortOrder: a.sortOrder,
          imageUrl: a.product.product_images[0]?.imageUrl ?? null,
        })),
    })
  } catch (error) {
    console.error('Daily special today GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch today\'s special' }, { status: 500 })
  }
}
