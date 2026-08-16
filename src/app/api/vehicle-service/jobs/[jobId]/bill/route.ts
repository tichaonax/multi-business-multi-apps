import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { notifyJobBilled } from '@/lib/vehicle-service/notify'

function generateOrderNumber(orderCount: number): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const counter = String(orderCount + 1).padStart(4, '0')
  return `VSV-${date}-${counter}`
}

// POST /api/vehicle-service/jobs/[jobId]/bill
// Body: { parts?: [{productVariantId, quantity}], otherCharges?: [{description, amount}], discountAmount?, taxAmount? }
//
// Generates the customer invoice only — see MBM-266. This creates the order
// with paymentStatus PENDING and does NOT collect a payment method or credit
// the business account; that happens later, separately, via
// POST .../collect-payment (potentially by a different user — the cashier
// the customer's printed invoice gets handed to).
//
// Converts a completed job into a normal BusinessOrders record (see MBM-261 Design
// Decision #3): each completed task becomes a labour line item (customerPriceOverride
// if set, else the customer's labour rate — see MBM-265), parts become normal physical
// line items with the usual stock decrement, and the resulting order flows through the
// existing receipt/EOD/business-account pipeline exactly like any other sale.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { jobId } = await params
    const body = await request.json()
    const { parts, otherCharges, discountAmount, taxAmount } = body as {
      parts?: Array<{ productVariantId: string; quantity: number }>
      otherCharges?: Array<{ description: string; amount: number }>
      discountAmount?: number
      taxAmount?: number
    }

    const job = await prisma.vehicleServiceJobs.findUnique({
      where: { id: jobId },
      include: {
        tasks: {
          include: {
            subcategory: { select: { name: true } },
            contractor: { select: { id: true } },
          },
        },
        // Parts already issued by Inventory Department via a parts request — stock
        // was decremented and the movement logged at issue time, not now.
        jobParts: {
          include: { productVariant: { select: { business_products: { select: { name: true } } } } },
        },
      },
    })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId: job.businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    if (job.status === 'billed') {
      return NextResponse.json({ error: 'This job has already been billed', orderId: job.orderId }, { status: 409 })
    }
    if (job.status === 'cancelled') {
      return NextResponse.json({ error: 'A cancelled job cannot be billed' }, { status: 409 })
    }
    if (job.tasks.length === 0) {
      return NextResponse.json({ error: 'This job has no tasks to bill' }, { status: 400 })
    }
    if (!job.tasks.every(t => t.status === 'completed')) {
      return NextResponse.json({ error: 'All tasks must be completed before billing this job' }, { status: 400 })
    }

    // Validate parts and their stock
    const partsInput = parts || []
    let variants: any[] = []
    if (partsInput.length > 0) {
      const variantIds = partsInput.map(p => p.productVariantId)
      variants = await prisma.productVariants.findMany({
        where: { id: { in: variantIds } },
        include: { business_products: { select: { productType: true, businessId: true, name: true } } },
      })
      for (const p of partsInput) {
        const v = variants.find(v => v.id === p.productVariantId)
        if (!v) return NextResponse.json({ error: `Part ${p.productVariantId} not found` }, { status: 400 })
        if (v.business_products.businessId !== job.businessId) {
          return NextResponse.json({ error: `Part ${v.business_products.name} does not belong to this business` }, { status: 400 })
        }
        if (Number(v.stockQuantity) < p.quantity) {
          return NextResponse.json({ error: `Insufficient stock for ${v.business_products.name} (have ${v.stockQuantity}, need ${p.quantity})` }, { status: 400 })
        }
      }
    }

    const employee = await prisma.employees.findFirst({ where: { userId: user.id }, select: { id: true } })

    // customerLabourRate is the customer-facing price (independent of the
    // contractor's own agreedFeeAmount, see MBM-265). Tasks created before
    // that field existed fall back to agreedFeeAmount so an in-progress job's
    // total doesn't silently change underneath it.
    const labourLines = job.tasks.map(t => ({
      amount: Number(t.customerPriceOverride ?? t.customerLabourRate ?? t.agreedFeeAmount),
      name: t.subcategory.name,
      taskId: t.id,
      contractorId: t.contractorId,
    }))
    // customerUnitPrice is what the invoice charges — forced to $0 on a
    // parts-waived rework job (MBM-267). unitPrice (the real price) is kept
    // separately and always used for the stock movement's unitCost below, so
    // inventory/COGS tracking stays accurate even when the customer isn't billed.
    const partLines = partsInput.map(p => {
      const v = variants.find(v => v.id === p.productVariantId)
      const unitPrice = Number(v.price ?? v.business_products?.basePrice ?? 0)
      return { variantId: p.productVariantId, quantity: p.quantity, unitPrice, customerUnitPrice: job.waiveParts ? 0 : unitPrice, name: v.business_products.name }
    })
    // Already-issued parts (Inventory Department fulfilled a contractor's request) —
    // billed at their recorded price, stock is NOT decremented again here.
    const issuedPartLines = job.jobParts.map(jp => {
      const unitPrice = Number(jp.unitPrice)
      return {
        variantId: jp.productVariantId,
        quantity: jp.quantity,
        unitPrice,
        customerUnitPrice: job.waiveParts ? 0 : unitPrice,
        name: jp.productVariant.business_products.name,
      }
    })
    const otherLines = (otherCharges || []).filter(c => c.description && Number(c.amount) > 0)

    const subtotal =
      labourLines.reduce((s, l) => s + l.amount, 0) +
      partLines.reduce((s, l) => s + l.customerUnitPrice * l.quantity, 0) +
      issuedPartLines.reduce((s, l) => s + l.customerUnitPrice * l.quantity, 0) +
      otherLines.reduce((s, c) => s + Number(c.amount), 0)

    // A rework job (MBM-267) can legitimately bill $0 when labor/parts are
    // fully waived — every other job keeps the original protection against
    // an accidental empty invoice.
    if (subtotal < 0 || (subtotal === 0 && !job.reworkOfJobId)) {
      return NextResponse.json({ error: 'Total must be greater than zero' }, { status: 400 })
    }

    const tax = taxAmount && !isNaN(Number(taxAmount)) && Number(taxAmount) > 0 ? Number(taxAmount) : 0
    // Discount can never exceed subtotal+tax — same clamp the universal orders endpoint uses.
    const discount = discountAmount && !isNaN(Number(discountAmount)) && Number(discountAmount) > 0
      ? Math.min(Number(discountAmount), subtotal + tax)
      : 0
    const totalAmount = subtotal + tax - discount

    const result = await prisma.$transaction(async (tx) => {
      const orderCount = await tx.businessOrders.count({ where: { businessId: job.businessId } })
      const orderNumber = generateOrderNumber(orderCount)
      const now = new Date()

      const order = await tx.businessOrders.create({
        data: {
          id: randomUUID(),
          businessId: job.businessId,
          orderNumber,
          customerId: job.customerId,
          employeeId: employee?.id ?? null,
          orderType: 'SALE',
          status: 'COMPLETED',
          subtotal,
          taxAmount: tax,
          discountAmount: discount,
          totalAmount,
          paymentMethod: null,
          paymentStatus: 'PENDING',
          businessType: 'vehicle_service',
          attributes: { vehicleServiceJobId: job.id },
          processedAt: now,
          transactionDate: now,
          createdBy: user.id,
          updatedAt: now,
        },
      })

      for (const l of labourLines) {
        await tx.businessOrderItems.create({
          data: {
            id: randomUUID(),
            orderId: order.id,
            productVariantId: null,
            quantity: 1,
            unitPrice: l.amount,
            discountAmount: 0,
            totalPrice: l.amount,
            attributes: {
              type: 'labour',
              productName: l.name,
              vehicleServiceTaskId: l.taskId,
              contractorId: l.contractorId,
            },
          },
        })
      }

      for (const p of partLines) {
        await tx.businessOrderItems.create({
          data: {
            id: randomUUID(),
            orderId: order.id,
            productVariantId: p.variantId,
            quantity: p.quantity,
            unitPrice: p.customerUnitPrice,
            discountAmount: 0,
            totalPrice: p.customerUnitPrice * p.quantity,
            attributes: { type: 'part', ...(job.waiveParts ? { waived: true } : {}) },
          },
        })
        await tx.productVariants.update({
          where: { id: p.variantId },
          data: { stockQuantity: { decrement: p.quantity } },
        })
        await tx.businessStockMovements.create({
          data: {
            businessId: job.businessId,
            productVariantId: p.variantId,
            movementType: 'SALE',
            quantity: -p.quantity,
            unitCost: p.unitPrice,
            reference: orderNumber,
            employeeId: employee?.id ?? null,
            businessType: 'vehicle_service',
            attributes: { orderId: order.id, vehicleServiceJobId: job.id },
          },
        })
      }

      for (const p of issuedPartLines) {
        await tx.businessOrderItems.create({
          data: {
            id: randomUUID(),
            orderId: order.id,
            productVariantId: p.variantId,
            quantity: p.quantity,
            unitPrice: p.customerUnitPrice,
            discountAmount: 0,
            totalPrice: p.customerUnitPrice * p.quantity,
            attributes: { type: 'part', issuedByRequest: true, ...(job.waiveParts ? { waived: true } : {}) },
          },
        })
        // No stock decrement / movement here — already recorded when Inventory issued it.
      }

      for (const c of otherLines) {
        await tx.businessOrderItems.create({
          data: {
            id: randomUUID(),
            orderId: order.id,
            productVariantId: null,
            quantity: 1,
            unitPrice: Number(c.amount),
            discountAmount: 0,
            totalPrice: Number(c.amount),
            attributes: { type: 'other', productName: c.description },
          },
        })
      }

      await tx.vehicleServiceJobs.update({
        where: { id: job.id },
        data: { orderId: order.id, status: 'billed' },
      })

      return order
    })

    // Business account is credited when payment is actually collected
    // (POST .../collect-payment), not here — crediting revenue before the
    // customer has paid would misstate real cash position. See MBM-266.

    notifyJobBilled(job.id, job.businessId, result.orderNumber, totalAmount)

    return NextResponse.json({
      success: true,
      order: { id: result.id, orderNumber: result.orderNumber, subtotal, taxAmount: tax, discountAmount: discount, totalAmount },
    })
  } catch (error) {
    console.error('Bill vehicle service job error:', error)
    return NextResponse.json({ error: 'Failed to bill job' }, { status: 500 })
  }
}
