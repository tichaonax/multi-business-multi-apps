import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { canUserViewAccount } from '@/lib/expense-account-access'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/expense-account/[accountId]/transfers
 * List all business transfer ledger records for this account
 * (transfers this account received from other businesses that may need to be returned)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId } = await params
    const permissions = getEffectivePermissions(user)

    if (!permissions.canAccessExpenseAccount && !(await canUserViewAccount(user.id, accountId))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') // optional: OUTSTANDING | PARTIALLY_RETURNED | RETURNED

    const where: any = { toAccountId: accountId }
    if (statusFilter) where.status = statusFilter

    const transfers = await prisma.businessTransferLedger.findMany({
      where,
      orderBy: { transferDate: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        transfers: transfers.map((t: (typeof transfers)[0]) => ({
          id: t.id,
          fromBusinessId: t.fromBusinessId,
          fromBusinessName: t.fromBusinessName,
          toBusinessId: t.toBusinessId,
          depositId: t.depositId,
          originalAmount: Number(t.originalAmount),
          outstandingAmount: Number(t.outstandingAmount),
          transferDate: t.transferDate.toISOString(),
          status: t.status,
          createdAt: t.createdAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching transfers:', error)
    return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 })
  }
}
