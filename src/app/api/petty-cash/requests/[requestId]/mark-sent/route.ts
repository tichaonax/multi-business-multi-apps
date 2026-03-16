import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

async function hasPettyCashApprove(userId: string): Promise<boolean> {
  const record = await prisma.userPermissions.findFirst({
    where: { userId, granted: true, permission: { name: 'petty_cash.approve' } },
  })
  return !!record
}

/**
 * POST /api/petty-cash/requests/[requestId]/mark-sent
 * Cashier confirms EcoCash was sent for an APPROVED petty cash request.
 * Creates the CashBucketEntry OUTFLOW ECOCASH.
 * Only valid for EcoCash payment channel requests.
 * Body: { ecocashTransactionCode }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!isSystemAdmin(user) && !(await hasPettyCashApprove(user.id))) {
      return NextResponse.json({ error: 'You do not have permission to mark petty cash as sent' }, { status: 403 })
    }

    const { requestId } = await params
    const body = await request.json()
    const ecocashTransactionCode = body.ecocashTransactionCode?.trim()

    if (!ecocashTransactionCode) {
      return NextResponse.json({ error: 'ecocashTransactionCode is required' }, { status: 400 })
    }

    const pcRequest = await prisma.pettyCashRequests.findUnique({
      where: { id: requestId },
    })

    if (!pcRequest) return NextResponse.json({ error: 'Petty cash request not found' }, { status: 404 })
    if ((pcRequest as any).paymentChannel !== 'ECOCASH') {
      return NextResponse.json({ error: 'This endpoint is only for EcoCash petty cash requests' }, { status: 400 })
    }
    if (pcRequest.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `Only APPROVED requests can be marked as sent. Current status: ${pcRequest.status}` },
        { status: 400 }
      )
    }

    const now = new Date()
    const amount = Number(pcRequest.approvedAmount)

    await prisma.cashBucketEntry.create({
      data: {
        businessId: pcRequest.businessId,
        entryType: 'PETTY_CASH',
        direction: 'OUTFLOW',
        amount,
        paymentChannel: 'ECOCASH',
        referenceType: 'PETTY_CASH',
        referenceId: requestId,
        notes: `EcoCash: ${ecocashTransactionCode} — ${pcRequest.purpose}`,
        entryDate: now,
        createdBy: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: `EcoCash sent confirmed (${ecocashTransactionCode})`,
    })
  } catch (error) {
    console.error('Error marking petty cash as sent:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to mark as sent' },
      { status: 500 }
    )
  }
}
