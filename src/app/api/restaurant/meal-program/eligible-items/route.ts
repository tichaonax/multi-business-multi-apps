import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// ─── GET /api/restaurant/meal-program/eligible-items ────────────────────────
// List all eligible items for a business (with product details).
// Query: businessId (required), includeInactive (optional, default false)
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    const items = await prisma.mealProgramEligibleItems.findMany({
      where: {
        businessId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            description: true,
            isActive: true,
            isAvailable: true,
            business_categories: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      data: items.map((item: any) => ({
        id: item.id,
        businessId: item.businessId,
        productId: item.productId,
        productName: item.product.name,
        productBasePrice: Number(item.product.basePrice),
        productCategory: item.product.business_categories?.name || '',
        productIsAvailable: item.product.isAvailable,
        isActive: item.isActive,
        notes: item.notes,
        createdAt: item.createdAt,
      })),
      meta: { total: items.length, active: (items as any[]).filter((i) => i.isActive).length },
    })
  } catch (error) {
    console.error('[meal-program/eligible-items GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/restaurant/meal-program/eligible-items ───────────────────────
// Add a product to the eligible items list.
// Body: { businessId, productId, notes? }
// Requires canManageInventory permission.
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const canManage =
      isAdmin ||
      (user.businessMemberships || []).some(
        (m: any) =>
          m.permissions?.canManageInventory === true ||
          m.permissions?.isAdmin === true ||
          m.role === 'business-owner' ||
          m.role === 'business-manager'
      )
    if (!canManage) {
      return NextResponse.json(
        { error: 'You do not have permission to manage eligible items' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { businessId, productId, notes } = body

    if (!businessId || !productId) {
      return NextResponse.json(
        { error: 'businessId and productId are required' },
        { status: 400 }
      )
    }

    // Verify product belongs to this restaurant
    const product = await prisma.businessProducts.findFirst({
      where: { id: productId, businessId, isActive: true },
      select: { id: true, name: true, basePrice: true },
    })
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found or does not belong to this business' },
        { status: 404 }
      )
    }

    const item = await prisma.mealProgramEligibleItems.create({
      data: {
        businessId,
        productId,
        isActive: true,
        notes: notes || null,
        createdBy: user.id,
      },
      include: {
        product: { select: { name: true, basePrice: true } },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          id: item.id,
          businessId: item.businessId,
          productId: item.productId,
          productName: item.product.name,
          productBasePrice: Number(item.product.basePrice),
          isActive: item.isActive,
          notes: item.notes,
          createdAt: item.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'This product is already on the eligible items list' },
        { status: 409 }
      )
    }
    console.error('[meal-program/eligible-items POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
