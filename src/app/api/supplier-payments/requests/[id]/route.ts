import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

// GET /api/supplier-payments/requests/[id] — request detail with partials
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const req = await prisma.supplierPaymentRequests.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true, emoji: true } },
        expenseAccount: { select: { id: true, accountName: true } },
        submitter: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        denier: { select: { id: true, name: true } },
        partialPayments: {
          include: {
            payer: { select: { id: true, name: true } },
          },
          orderBy: { paidAt: 'asc' },
        },
        items: {
          include: {
            category: { select: { id: true, name: true, emoji: true } },
            subcategory: { select: { id: true, name: true, emoji: true } },
          },
        },
      },
    })

    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    const permissions = getEffectivePermissions(user, req.businessId)
    const canViewQueue = permissions.canViewSupplierPaymentQueue

    // POS can only see their own requests
    if (!canViewQueue && req.submittedBy !== user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...req,
        amount: parseFloat(req.amount.toString()),
        paidAmount: parseFloat(req.paidAmount.toString()),
        remainingAmount: parseFloat(req.amount.toString()) - parseFloat(req.paidAmount.toString()),
        partialPayments: req.partialPayments.map((p: typeof req.partialPayments[0]) => ({
          ...p,
          amount: parseFloat(p.amount.toString()),
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching supplier payment request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/supplier-payments/requests/[id] — POS edits PENDING request
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    const req = await prisma.supplierPaymentRequests.findUnique({
      where: { id },
      select: { id: true, status: true, submittedBy: true, businessId: true, paidAmount: true },
    })

    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    // Only the submitter can edit
    if (req.submittedBy !== user.id) {
      return NextResponse.json({ error: 'Only the original submitter can edit this request' }, { status: 403 })
    }

    if (req.status !== 'PENDING') {
      return NextResponse.json({ error: 'Only PENDING requests can be edited' }, { status: 400 })
    }

    // Lock if any payment has been made
    if (parseFloat(req.paidAmount.toString()) > 0) {
      return NextResponse.json({ error: 'Cannot edit a request that has been partially or fully paid' }, { status: 400 })
    }

    const hasItems = Array.isArray(body.items) && body.items.length > 0
    const updateData: any = {}

    if (hasItems) {
      // Recalculate amount from items (base + tax per item)
      const itemTotals = (body.items as any[]).map((item: any) => ({
        base: parseFloat(item.amount),
        tax: item.taxAmount ? parseFloat(item.taxAmount) : 0,
      }))
      if (itemTotals.some((t: any) => isNaN(t.base) || t.base <= 0)) {
        return NextResponse.json({ error: 'Each item must have a positive amount' }, { status: 400 })
      }
      updateData.amount = itemTotals.reduce((s: number, t: any) => s + t.base + t.tax, 0)
    } else if (body.amount !== undefined) {
      const parsed = parseFloat(body.amount)
      if (isNaN(parsed) || parsed <= 0) {
        return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
      }
      updateData.amount = parsed
    }
    if (body.dueDate !== undefined) updateData.dueDate = new Date(body.dueDate)
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null
    if (body.receiptNumber !== undefined) updateData.receiptNumber = body.receiptNumber?.trim() || null

    const updated = await prisma.$transaction(async (tx: any) => {
      const result = await tx.supplierPaymentRequests.update({
        where: { id },
        data: updateData,
      })
      if (hasItems) {
        await tx.supplierPaymentRequestItems.deleteMany({ where: { requestId: id } })
        await tx.supplierPaymentRequestItems.createMany({
          data: (body.items as any[]).map((item: any) => ({
            requestId: id,
            description: item.description?.trim() || null,
            categoryId: item.categoryId || null,
            subcategoryId: item.subcategoryId || null,
            amount: parseFloat(item.amount),
          })),
        })
      }
      return tx.supplierPaymentRequests.findUnique({
        where: { id },
        include: {
          supplier: { select: { id: true, name: true } },
          expenseAccount: { select: { id: true, accountName: true } },
          items: {
            include: {
              category: { select: { id: true, name: true, emoji: true } },
              subcategory: { select: { id: true, name: true, emoji: true } },
            },
          },
        },
      })
    })

    if (!updated) return NextResponse.json({ error: 'Request not found after update' }, { status: 404 })
    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        amount: parseFloat(updated.amount.toString()),
        paidAmount: parseFloat(updated.paidAmount.toString()),
        remainingAmount: parseFloat(updated.amount.toString()) - parseFloat(updated.paidAmount.toString()),
        items: (updated.items ?? []).map((item: any) => ({
          ...item,
          amount: parseFloat(item.amount.toString()),
        })),
      },
    })
  } catch (error) {
    console.error('Error updating supplier payment request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/supplier-payments/requests/[id] — POS cancels PENDING request
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const req = await prisma.supplierPaymentRequests.findUnique({
      where: { id },
      select: { id: true, status: true, submittedBy: true },
    })

    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    if (req.submittedBy !== user.id) {
      return NextResponse.json({ error: 'Only the original submitter can cancel this request' }, { status: 403 })
    }

    if (req.status !== 'PENDING') {
      return NextResponse.json({ error: 'Only PENDING requests can be cancelled' }, { status: 400 })
    }

    await prisma.supplierPaymentRequests.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Request cancelled' })
  } catch (error) {
    console.error('Error cancelling supplier payment request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
