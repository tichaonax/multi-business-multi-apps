import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

// GET — list all specials in the library for this business
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(user, 'canManageDailySpecial')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const businessId = new URL(req.url).searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    const specials = await prisma.dailySpecial.findMany({
      where: { businessId, isActive: true },
      include: {
        product: {
          select: {
            id: true, name: true, menuNumber: true, basePrice: true,
            product_images: { select: { imageUrl: true }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
          },
        },
        add_ons: {
          include: {
            product: { select: { id: true, name: true, basePrice: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(specials)
  } catch (error) {
    console.error('Daily special library GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch specials' }, { status: 500 })
  }
}

// POST — create a new special in the library
export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(user, 'canManageDailySpecial')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { businessId, productId, specialPrice, bulletPoints, imageId, addOns } = await req.json()

    if (!businessId || !productId || specialPrice == null) {
      return NextResponse.json({ error: 'businessId, productId and specialPrice are required' }, { status: 400 })
    }

    // Validate product belongs to business
    const product = await prisma.businessProducts.findFirst({
      where: { id: productId, businessId, isActive: true },
    })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    // Validate add-on products
    if (Array.isArray(addOns) && addOns.length > 0) {
      const addOnIds = addOns.map((a: { productId: string }) => a.productId)
      const found = await prisma.businessProducts.findMany({
        where: { id: { in: addOnIds }, businessId, isActive: true },
        select: { id: true },
      })
      if (found.length !== addOnIds.length) {
        return NextResponse.json({ error: 'One or more add-on products not found' }, { status: 404 })
      }
    }

    const special = await prisma.dailySpecial.create({
      data: {
        businessId,
        productId,
        specialPrice,
        bulletPoints: bulletPoints ?? [],
        imageId: imageId ?? null,
        add_ons: {
          create: (addOns ?? []).map((a: { productId: string; quantity?: number; sortOrder?: number }, idx: number) => ({
            productId: a.productId,
            quantity: a.quantity ?? 1,
            sortOrder: a.sortOrder ?? idx,
          })),
        },
      },
      include: {
        product: { select: { id: true, name: true, menuNumber: true, basePrice: true } },
        add_ons: {
          include: { product: { select: { id: true, name: true, basePrice: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    return NextResponse.json(special, { status: 201 })
  } catch (error) {
    console.error('Daily special library POST error:', error)
    return NextResponse.json({ error: 'Failed to create special' }, { status: 500 })
  }
}
