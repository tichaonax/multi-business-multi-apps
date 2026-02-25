import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

function deriveRequestStatus(statuses: string[]): string {
  const hasPaid = statuses.includes('PAID')
  const hasApproved = statuses.includes('APPROVED')
  const hasPending = statuses.includes('PENDING')
  if (!hasPending && !hasApproved) return hasPaid ? 'PAID' : 'DENIED'
  if (hasPaid) return 'PARTIAL'
  if (hasApproved) return 'APPROVED'
  return 'PENDING'
}

// POST /api/supplier-payments/requests/[id]/approve
// Body: { itemIds?: string[], amount?: number, approvalNote?: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const itemIds: string[] | undefined = body.itemIds
    const amount: number | undefined = body.amount
    const approvalNote: string | undefined = body.approvalNote

    const req = await prisma.supplierPaymentRequests.findUnique({
      where: { id },
      include: { items: { select: { id: true, status: true, amount: true } } },
    })

    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    const permissions = getEffectivePermissions(user, req.businessId)
    if (!permissions.canApproveSupplierPayments) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    if (!['PENDING', 'APPROVED'].includes(req.status)) {
      return NextResponse.json({ error: 'Cannot approve items on a request in this state' }, { status: 400 })
    }

    await prisma.$transaction(async (tx: any) => {
      const idsToApprove = itemIds && itemIds.length > 0
        ? itemIds
        : req.items.filter(i => i.status === 'PENDING').map(i => i.id)

      if (idsToApprove.length === 0) return

      const itemsToApprove = req.items.filter(i => idsToApprove.includes(i.id))
      const itemSum = itemsToApprove.reduce((s, i) => s + parseFloat(i.amount.toString()), 0)

      // Determine if manager entered an override amount
      let parsedAmount = itemSum
      let isOverride = false
      if (amount !== undefined && amount !== null) {
        parsedAmount = parseFloat(amount.toString())
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          throw new Error('Approval amount must be greater than zero')
        }
        if (parsedAmount > itemSum + 0.001) {
          throw new Error(`Approval amount cannot exceed selected items total ($${itemSum.toFixed(2)})`)
        }
        isOverride = parsedAmount < itemSum - 0.001
      }

      if (isOverride && (!approvalNote || approvalNote.trim().length < 3)) {
        throw new Error('A reason is required when approving less than the requested amount')
      }

      // Update each item individually so we can store proportional approvedAmount
      for (const item of itemsToApprove) {
        const itemAmt = parseFloat(item.amount.toString())
        const approved = isOverride
          ? Math.round((itemAmt / itemSum) * parsedAmount * 100) / 100
          : null
        await tx.supplierPaymentRequestItems.update({
          where: { id: item.id },
          data: {
            status: 'APPROVED',
            approvedAmount: approved,
            approvalNote: approvalNote?.trim() || null,
          },
        })
      }

      // Recalculate request status
      const allItems = await tx.supplierPaymentRequestItems.findMany({
        where: { requestId: id },
        select: { status: true },
      })
      const newStatus = deriveRequestStatus(allItems.map((i: any) => i.status))

      await tx.supplierPaymentRequests.update({
        where: { id },
        data: { status: newStatus, approvedBy: user.id, approvedAt: new Date() },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error approving supplier payment request:', error)
    if (error.message?.startsWith('Approval amount') || error.message?.startsWith('A reason')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
