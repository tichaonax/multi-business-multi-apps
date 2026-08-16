import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { canReceiveParts } from '@/lib/vehicle-service/permissions'

// POST /api/vehicle-service/parts/[partId]/receive
// Body: { quantity, unitCost?, supplierId?, reference? }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { partId } = await params
    const body = await request.json()
    const { quantity, unitCost, reference } = body as {
      quantity?: number; unitCost?: number; reference?: string
    }
    if (!quantity || Number(quantity) <= 0) return NextResponse.json({ error: 'quantity must be greater than 0' }, { status: 400 })

    const part = await prisma.businessProducts.findUnique({
      where: { id: partId },
      include: { product_variants: true },
    })
    if (!part) return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    const variant = part.product_variants[0]
    if (!variant) return NextResponse.json({ error: 'This part has no stock-tracked variant' }, { status: 400 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId: part.businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }
    if (!isSystemAdmin(user) && !canReceiveParts(user, part.businessId)) {
      return NextResponse.json({ error: 'You do not have permission to receive stock' }, { status: 403 })
    }

    const employee = await prisma.employees.findFirst({ where: { userId: user.id }, select: { id: true } })

    const [updatedVariant] = await prisma.$transaction([
      prisma.productVariants.update({ where: { id: variant.id }, data: { stockQuantity: { increment: Number(quantity) } } }),
      prisma.businessStockMovements.create({
        data: {
          businessId: part.businessId,
          businessProductId: part.id,
          productVariantId: variant.id,
          movementType: 'PURCHASE_RECEIVED',
          quantity: Number(quantity),
          unitCost: unitCost !== undefined ? Number(unitCost) : null,
          reference: reference || null,
          employeeId: employee?.id ?? null,
          businessType: 'vehicle_service',
        },
      }),
    ])

    return NextResponse.json({ success: true, stockQuantity: updatedVariant.stockQuantity })
  } catch (error) {
    console.error('Receive vehicle service part stock error:', error)
    return NextResponse.json({ error: 'Failed to receive stock' }, { status: 500 })
  }
}
