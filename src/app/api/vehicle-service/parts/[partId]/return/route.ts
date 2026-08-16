import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { canProcessPartReturns } from '@/lib/vehicle-service/permissions'
import { checkAndNotifyLowStockForVariant } from '@/lib/inventory/low-stock-notifier'

// POST /api/vehicle-service/parts/[partId]/return
// Body: { direction: 'customer'|'supplier', quantity, reference?, reason? }
// Customer return: part comes back, stock goes up (RETURN_IN).
// Supplier return: part goes back to the supplier, stock goes down (RETURN_OUT).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { partId } = await params
    const body = await request.json()
    const { direction, quantity, reference, reason } = body as {
      direction?: string; quantity?: number; reference?: string; reason?: string
    }
    if (direction !== 'customer' && direction !== 'supplier') {
      return NextResponse.json({ error: "direction must be 'customer' or 'supplier'" }, { status: 400 })
    }
    if (!quantity || Number(quantity) <= 0) return NextResponse.json({ error: 'quantity must be greater than 0' }, { status: 400 })

    const part = await prisma.businessProducts.findUnique({ where: { id: partId }, include: { product_variants: true } })
    if (!part) return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    const variant = part.product_variants[0]
    if (!variant) return NextResponse.json({ error: 'This part has no stock-tracked variant' }, { status: 400 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId: part.businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }
    if (!isSystemAdmin(user) && !canProcessPartReturns(user, part.businessId)) {
      return NextResponse.json({ error: 'You do not have permission to process returns' }, { status: 403 })
    }

    const isSupplierReturn = direction === 'supplier'
    if (isSupplierReturn && Number(quantity) > Number(variant.stockQuantity)) {
      return NextResponse.json({ error: `Cannot return more than the current stock (${variant.stockQuantity})` }, { status: 400 })
    }

    const employee = await prisma.employees.findFirst({ where: { userId: user.id }, select: { id: true } })

    const [updatedVariant] = await prisma.$transaction([
      prisma.productVariants.update({
        where: { id: variant.id },
        data: { stockQuantity: isSupplierReturn ? { decrement: Number(quantity) } : { increment: Number(quantity) } },
      }),
      prisma.businessStockMovements.create({
        data: {
          businessId: part.businessId,
          businessProductId: part.id,
          productVariantId: variant.id,
          movementType: isSupplierReturn ? 'RETURN_OUT' : 'RETURN_IN',
          quantity: isSupplierReturn ? -Number(quantity) : Number(quantity),
          reference: reference || null,
          reason: reason || null,
          employeeId: employee?.id ?? null,
          businessType: 'vehicle_service',
        },
      }),
    ])

    if (isSupplierReturn) {
      await checkAndNotifyLowStockForVariant(prisma, variant.id, part.businessId)
    }

    return NextResponse.json({ success: true, stockQuantity: updatedVariant.stockQuantity })
  } catch (error) {
    console.error('Process vehicle service part return error:', error)
    return NextResponse.json({ error: 'Failed to process return' }, { status: 500 })
  }
}
