import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { canAdjustParts } from '@/lib/vehicle-service/permissions'
import { checkAndNotifyLowStockForVariant } from '@/lib/inventory/low-stock-notifier'

// POST /api/vehicle-service/parts/[partId]/adjust
// Body: { quantityDelta, reason } — a manager-level correction (miscount,
// found stock, etc). quantityDelta can be negative; reason is required so
// every adjustment is auditable, per the requirements doc's "no quantity
// change without an auditable movement record" rule.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { partId } = await params
    const body = await request.json()
    const { quantityDelta, reason } = body as { quantityDelta?: number; reason?: string }
    if (quantityDelta === undefined || quantityDelta === null || Number(quantityDelta) === 0) {
      return NextResponse.json({ error: 'quantityDelta must be a non-zero number' }, { status: 400 })
    }
    if (!reason || !reason.trim()) return NextResponse.json({ error: 'A reason is required for stock adjustments' }, { status: 400 })

    const part = await prisma.businessProducts.findUnique({ where: { id: partId }, include: { product_variants: true } })
    if (!part) return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    const variant = part.product_variants[0]
    if (!variant) return NextResponse.json({ error: 'This part has no stock-tracked variant' }, { status: 400 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId: part.businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }
    if (!isSystemAdmin(user) && !canAdjustParts(user, part.businessId)) {
      return NextResponse.json({ error: 'You do not have permission to adjust stock' }, { status: 403 })
    }

    const newQty = Number(variant.stockQuantity) + Number(quantityDelta)
    if (newQty < 0) return NextResponse.json({ error: 'Adjustment would leave stock negative' }, { status: 400 })

    const employee = await prisma.employees.findFirst({ where: { userId: user.id }, select: { id: true } })

    const [updatedVariant] = await prisma.$transaction([
      prisma.productVariants.update({ where: { id: variant.id }, data: { stockQuantity: newQty } }),
      prisma.businessStockMovements.create({
        data: {
          businessId: part.businessId,
          businessProductId: part.id,
          productVariantId: variant.id,
          movementType: 'ADJUSTMENT',
          quantity: Number(quantityDelta),
          reason: reason.trim(),
          employeeId: employee?.id ?? null,
          businessType: 'vehicle_service',
        },
      }),
    ])

    if (Number(quantityDelta) < 0) {
      await checkAndNotifyLowStockForVariant(prisma, variant.id, part.businessId)
    }

    return NextResponse.json({ success: true, stockQuantity: updatedVariant.stockQuantity })
  } catch (error) {
    console.error('Adjust vehicle service part stock error:', error)
    return NextResponse.json({ error: 'Failed to adjust stock' }, { status: 500 })
  }
}
