import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { checkAndNotifyLowStockForVariant } from '@/lib/inventory/low-stock-notifier'

// POST /api/vehicle-service/parts/[partId]/internal-use
// Body: { quantity, notes? }
// A workshop consumable used internally, never charged to anyone — not a
// financial control point (same tier as using a part on a job), so gated
// only by real business membership, matching the requirements doc's Staff
// permissions list ("use parts on repair jobs" implies the same for
// day-to-day workshop consumables).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { partId } = await params
    const body = await request.json()
    const { quantity, notes } = body as { quantity?: number; notes?: string }
    if (!quantity || Number(quantity) <= 0) return NextResponse.json({ error: 'quantity must be greater than 0' }, { status: 400 })

    const part = await prisma.businessProducts.findUnique({ where: { id: partId }, include: { product_variants: true } })
    if (!part) return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    const variant = part.product_variants[0]
    if (!variant) return NextResponse.json({ error: 'This part has no stock-tracked variant' }, { status: 400 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId: part.businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }
    if (Number(quantity) > Number(variant.stockQuantity)) {
      return NextResponse.json({ error: `Cannot use more than the current stock (${variant.stockQuantity})` }, { status: 400 })
    }

    const employee = await prisma.employees.findFirst({ where: { userId: user.id }, select: { id: true } })

    const [updatedVariant] = await prisma.$transaction([
      prisma.productVariants.update({ where: { id: variant.id }, data: { stockQuantity: { decrement: Number(quantity) } } }),
      prisma.businessStockMovements.create({
        data: {
          businessId: part.businessId,
          businessProductId: part.id,
          productVariantId: variant.id,
          movementType: 'INTERNAL_USE',
          quantity: -Number(quantity),
          reason: notes || null,
          employeeId: employee?.id ?? null,
          businessType: 'vehicle_service',
        },
      }),
    ])

    await checkAndNotifyLowStockForVariant(prisma, variant.id, part.businessId)

    return NextResponse.json({ success: true, stockQuantity: updatedVariant.stockQuantity })
  } catch (error) {
    console.error('Record internal use error:', error)
    return NextResponse.json({ error: 'Failed to record internal use' }, { status: 500 })
  }
}
