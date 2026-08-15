import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

// POST /api/vehicle-service/jobs/[jobId]/parts
// Body: { productVariantId, quantity }
//
// Attaches a known part directly to a job — for when staff already knows what's
// needed at task-creation time (e.g. an oil filter for an oil change) rather than
// waiting on the contractor-request → Inventory-issue round trip (see MBM-262
// Phase C). Same permission model and stock-decrement-now behavior as Bill Job's
// existing "Add More Parts" (business membership, not gated behind
// canManageInventory — this mirrors that already-shipped precedent exactly).
// Creates a VehicleServiceJobParts row with no partsRequestId, so Bill Job picks
// it up as an already-issued part with no double decrement, same as a
// contractor-requested part would be.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { jobId } = await params
    const body = await request.json()
    const { productVariantId, quantity } = body as { productVariantId?: string; quantity?: number }
    if (!productVariantId) return NextResponse.json({ error: 'productVariantId is required' }, { status: 400 })
    if (!quantity || quantity < 1) return NextResponse.json({ error: 'quantity must be at least 1' }, { status: 400 })

    const job = await prisma.vehicleServiceJobs.findUnique({
      where: { id: jobId },
      select: { id: true, businessId: true, status: true },
    })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId: job.businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }
    if (job.status === 'billed' || job.status === 'cancelled') {
      return NextResponse.json({ error: `Cannot add parts — job is ${job.status}` }, { status: 409 })
    }

    const variant = await prisma.productVariants.findUnique({
      where: { id: productVariantId },
      include: { business_products: { select: { businessId: true, basePrice: true, name: true } } },
    })
    if (!variant) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    if (variant.business_products.businessId !== job.businessId) {
      return NextResponse.json({ error: 'Product does not belong to this business' }, { status: 400 })
    }
    if (Number(variant.stockQuantity) < quantity) {
      return NextResponse.json({ error: `Insufficient stock for ${variant.business_products.name} (have ${variant.stockQuantity}, need ${quantity})` }, { status: 400 })
    }

    const unitPrice = Number(variant.price ?? variant.business_products.basePrice ?? 0)

    const jobPart = await prisma.$transaction(async (tx) => {
      await tx.productVariants.update({
        where: { id: productVariantId },
        data: { stockQuantity: { decrement: quantity } },
      })

      await tx.businessStockMovements.create({
        data: {
          businessId: job.businessId,
          productVariantId,
          movementType: 'SALE',
          quantity: -quantity,
          unitCost: unitPrice,
          reference: `Job ${jobId.slice(0, 8)} — part added at task creation`,
          businessType: 'vehicle_service',
          attributes: { vehicleServiceJobId: job.id },
        },
      })

      return tx.vehicleServiceJobParts.create({
        data: {
          jobId: job.id,
          productVariantId,
          quantity,
          unitPrice,
        },
        include: { productVariant: { select: { id: true, business_products: { select: { name: true } } } } },
      })
    })

    return NextResponse.json({ success: true, jobPart })
  } catch (error) {
    console.error('Add job part error:', error)
    return NextResponse.json({ error: 'Failed to add part' }, { status: 500 })
  }
}
