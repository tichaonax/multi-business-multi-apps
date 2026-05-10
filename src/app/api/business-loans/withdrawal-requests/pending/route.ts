import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { isSystemAdmin } from '@/lib/permission-utils'

/**
 * GET /api/business-loans/withdrawal-requests/pending
 * Returns all in-flight withdrawal requests (PENDING, DRAFT, APPROVED).
 * Access: canManageBusinessLoans (admin) OR canSubmitPaymentBatch (cashier/manager)
 */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    const sysAdmin = isSystemAdmin(user)

    if (!sysAdmin && !permissions.canManageBusinessLoans && !permissions.canSubmitPaymentBatch) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const requests = await prisma.loanWithdrawalRequest.findMany({
      where: { status: { in: ['PENDING', 'DRAFT', 'APPROVED'] } },
      select: {
        id: true,
        requestNumber: true,
        requestMonth: true,
        requestedAmount: true,
        approvedAmount: true,
        status: true,
        notes: true,
        createdAt: true,
        createdBy: true,
        approvedBy: true,
        deniedByRole: true,
        loanId: true,
        loan: {
          select: {
            id: true,
            loanNumber: true,
            lenderName: true,
            lenderContactInfo: true,
          },
        },
        creator: {
          select: { id: true, name: true },
        },
        approver: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ success: true, data: requests })
  } catch (error) {
    console.error('GET /api/business-loans/withdrawal-requests/pending error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
