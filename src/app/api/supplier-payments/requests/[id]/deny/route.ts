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

// POST /api/supplier-payments/requests/[id]/deny
// Body: { denialNote: string, itemIds?: string[] }  — omit itemIds to deny all PENDING items
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { denialNote, itemIds } = body

    if (!denialNote || denialNote.trim().length < 5) {
      return NextResponse.json({ error: 'A denial note of at least 5 characters is required' }, { status: 400 })
    }

    const req = await prisma.supplierPaymentRequests.findUnique({
      where: { id },
      include: { items: { select: { id: true, status: true } } },
    })

    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    const permissions = getEffectivePermissions(user, req.businessId)
    if (!permissions.canApproveSupplierPayments) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    if (!['PENDING', 'APPROVED'].includes(req.status)) {
      return NextResponse.json({ error: 'Cannot deny items on a request in this state' }, { status: 400 })
    }

    await prisma.$transaction(async (tx: any) => {
      const idsToDeny = itemIds && itemIds.length > 0
        ? itemIds
        : req.items.filter(i => i.status === 'PENDING').map(i => i.id)

      if (idsToDeny.length > 0) {
        await tx.supplierPaymentRequestItems.updateMany({
          where: { id: { in: idsToDeny }, requestId: id, status: { in: ['PENDING', 'APPROVED'] } },
          data: { status: 'DENIED' },
        })
      }

      const allItems = await tx.supplierPaymentRequestItems.findMany({
        where: { requestId: id },
        select: { status: true },
      })
      const newStatus = deriveRequestStatus(allItems.map((i: any) => i.status))

      await tx.supplierPaymentRequests.update({
        where: { id },
        data: {
          status: newStatus,
          deniedBy: user.id,
          deniedAt: new Date(),
          denialNote: denialNote.trim(),
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error denying supplier payment request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
