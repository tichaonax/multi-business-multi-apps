import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { emitNotification } from '@/lib/notifications/notification-emitter'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string; requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId, requestId } = await params

    const comboRequest = await prisma.comboPaymentRequests.findFirst({
      where: { id: requestId, accountId },
      include: {
        sections: { include: { items: true } },
      },
    })
    if (!comboRequest) return NextResponse.json({ error: 'Combo request not found' }, { status: 404 })

    // Only the requester can trigger a settle request
    if (comboRequest.createdBy !== user.id) {
      return NextResponse.json({ error: 'Only the requester can initiate a settlement' }, { status: 403 })
    }

    if (comboRequest.status !== 'PAID') {
      return NextResponse.json({ error: 'Only PAID requests can be settled' }, { status: 400 })
    }

    // Verify there IS remaining balance to settle
    const allItems = comboRequest.sections.flatMap(s => s.items)
    const totalPaid = allItems.reduce((sum, i) => sum + Number(i.paidAmount ?? 0), 0)
    const approvedAmount = Number(comboRequest.approvedAmount ?? 0)
    const remaining = approvedAmount - totalPaid

    if (remaining <= 0) {
      return NextResponse.json({ error: 'No remaining balance to settle' }, { status: 400 })
    }

    const now = new Date()

    await prisma.comboPaymentRequests.update({
      where: { id: requestId },
      data: {
        status: 'SETTLE_REQUESTED',
        settleRequestedAt: now,
      },
    })

    // Notify all cashiers / admins with canMakeExpensePayments on this account
    // Notify account's approvers: we notify the last approver + any admin
    const cashierUsers = await prisma.users.findMany({
      where: {
        isActive: true,
        OR: [
          { role: 'admin' },
        ],
      },
      select: { id: true, permissions: true },
    })

    const cashierIds = cashierUsers
      .filter(u => {
        const perms = u.permissions as Record<string, boolean>
        return u.role === 'admin' || perms?.canMakeExpensePayments === true
      })
      .map(u => u.id)
      .filter(id => id !== user.id)

    // Also always notify the approver if set
    if (comboRequest.approvedBy && !cashierIds.includes(comboRequest.approvedBy)) {
      cashierIds.push(comboRequest.approvedBy)
    }

    if (cashierIds.length > 0) {
      await emitNotification({
        userIds: cashierIds,
        type: 'COMBO_REQUEST_SETTLE_REQUESTED',
        title: 'Change return ready',
        message: `${user.name} is returning $${remaining.toFixed(2)} from combo request "${comboRequest.title}"`,
        linkUrl: `/expense-accounts/${accountId}/combo-requests/${requestId}`,
        metadata: { requestId, accountId, remaining },
      })
    }

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    console.error('[settle-request] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
