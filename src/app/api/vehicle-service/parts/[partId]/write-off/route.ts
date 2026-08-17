import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { canWriteOffParts } from '@/lib/vehicle-service/permissions'
import { checkAndNotifyLowStockForVariant } from '@/lib/inventory/low-stock-notifier'

const WRITE_OFF_TYPES = ['DAMAGE', 'THEFT'] as const

// POST /api/vehicle-service/parts/[partId]/write-off
// Body: { quantity, movementType: 'DAMAGE'|'THEFT', reason }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { partId } = await params
    const body = await request.json()
    const { quantity, movementType, reason } = body as { quantity?: number; movementType?: string; reason?: string }
    if (!quantity || Number(quantity) <= 0) return NextResponse.json({ error: 'quantity must be greater than 0' }, { status: 400 })
    if (!movementType || !WRITE_OFF_TYPES.includes(movementType as any)) {
      return NextResponse.json({ error: `movementType must be one of ${WRITE_OFF_TYPES.join(', ')}` }, { status: 400 })
    }
    if (!reason || !reason.trim()) return NextResponse.json({ error: 'A reason is required to write off stock' }, { status: 400 })

    const part = await prisma.businessProducts.findUnique({ where: { id: partId }, include: { product_variants: true } })
    if (!part) return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    const variant = part.product_variants[0]
    if (!variant) return NextResponse.json({ error: 'This part has no stock-tracked variant' }, { status: 400 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId: part.businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }
    if (!isSystemAdmin(user) && !canWriteOffParts(user, part.businessId)) {
      return NextResponse.json({ error: 'You do not have permission to write off stock' }, { status: 403 })
    }
    if (Number(quantity) > Number(variant.stockQuantity)) {
      return NextResponse.json({ error: `Cannot write off more than the current stock (${variant.stockQuantity})` }, { status: 400 })
    }

    const employee = await prisma.employees.findFirst({ where: { userId: user.id }, select: { id: true } })

    const [updatedVariant] = await prisma.$transaction([
      prisma.productVariants.update({ where: { id: variant.id }, data: { stockQuantity: { decrement: Number(quantity) } } }),
      prisma.businessStockMovements.create({
        data: {
          businessId: part.businessId,
          businessProductId: part.id,
          productVariantId: variant.id,
          movementType: movementType as 'DAMAGE' | 'THEFT',
          quantity: -Number(quantity),
          reason: reason.trim(),
          employeeId: employee?.id ?? null,
          businessType: 'vehicle_service',
        },
      }),
    ])

    await checkAndNotifyLowStockForVariant(prisma, variant.id, part.businessId)

    return NextResponse.json({ success: true, stockQuantity: updatedVariant.stockQuantity })
  } catch (error) {
    console.error('Write off vehicle service part stock error:', error)
    return NextResponse.json({ error: 'Failed to write off stock' }, { status: 500 })
  }
}
