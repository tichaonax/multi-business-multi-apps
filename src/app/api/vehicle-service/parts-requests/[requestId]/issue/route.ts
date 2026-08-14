import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions, isSystemAdmin } from '@/lib/permission-utils'

function canManageInventory(user: any, businessId: string) {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canManageInventory
}

// POST /api/vehicle-service/parts-requests/[requestId]/issue
// Body: { productVariantId, issuedQuantity? }
// Matches the contractor's free-text request to a real product/variant and
// releases it — stock is decremented NOW (the part physically leaves the shelf
// at this moment, not later at billing), and the issued part is attached to the
// job's parts list so Bill Job can pick it up without re-decrementing.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { requestId } = await params
    const body = await request.json()
    const { productVariantId, issuedQuantity } = body as { productVariantId?: string; issuedQuantity?: number }
    if (!productVariantId) return NextResponse.json({ error: 'productVariantId is required' }, { status: 400 })

    const partsRequest = await prisma.vehicleServicePartsRequests.findUnique({
      where: { id: requestId },
      include: { job: { select: { id: true, businessId: true, status: true } } },
    })
    if (!partsRequest) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    if (!isSystemAdmin(user) && !canManageInventory(user, partsRequest.job.businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (partsRequest.status !== 'REQUESTED') {
      return NextResponse.json({ error: `This request has already been ${partsRequest.status.toLowerCase()}` }, { status: 409 })
    }
    if (partsRequest.job.status === 'billed' || partsRequest.job.status === 'cancelled') {
      return NextResponse.json({ error: `Cannot issue parts — job is ${partsRequest.job.status}` }, { status: 409 })
    }

    const qty = issuedQuantity && issuedQuantity > 0 ? issuedQuantity : partsRequest.quantity

    const variant = await prisma.productVariants.findUnique({
      where: { id: productVariantId },
      include: { business_products: { select: { businessId: true, productType: true, basePrice: true, name: true } } },
    })
    if (!variant) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    if (variant.business_products.businessId !== partsRequest.job.businessId) {
      return NextResponse.json({ error: 'Product does not belong to this business' }, { status: 400 })
    }
    if (Number(variant.stockQuantity) < qty) {
      return NextResponse.json({ error: `Insufficient stock (have ${variant.stockQuantity}, need ${qty})` }, { status: 400 })
    }

    const unitPrice = Number(variant.price ?? variant.business_products.basePrice ?? 0)
    const now = new Date()

    await prisma.$transaction(async (tx) => {
      await tx.productVariants.update({
        where: { id: productVariantId },
        data: { stockQuantity: { decrement: qty } },
      })

      await tx.businessStockMovements.create({
        data: {
          businessId: partsRequest.job.businessId,
          productVariantId,
          movementType: 'SALE',
          quantity: -qty,
          unitCost: unitPrice,
          reference: `Parts request ${requestId.slice(0, 8)}`,
          businessType: 'vehicle_service',
          attributes: { vehicleServiceJobId: partsRequest.job.id, partsRequestId: requestId },
        },
      })

      await tx.vehicleServiceJobParts.create({
        data: {
          jobId: partsRequest.job.id,
          productVariantId,
          quantity: qty,
          unitPrice,
          partsRequestId: requestId,
        },
      })

      await tx.vehicleServicePartsRequests.update({
        where: { id: requestId },
        data: {
          status: 'ISSUED',
          productVariantId,
          issuedQuantity: qty,
          issuedAt: now,
          reviewedBy: user.id,
          reviewedAt: now,
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Issue parts request error:', error)
    return NextResponse.json({ error: 'Failed to issue part' }, { status: 500 })
  }
}
