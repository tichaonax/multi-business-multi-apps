import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/expense-account/transfers
 * System-wide transfer imbalance report (admin/manager only)
 * Returns all outstanding + partially-returned transfers
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') // OUTSTANDING | PARTIALLY_RETURNED | RETURNED | all

    const where: any = {}
    if (statusFilter && statusFilter !== 'all') {
      where.status = statusFilter
    } else if (!statusFilter) {
      // Default: only show outstanding / partially returned
      where.status = { in: ['OUTSTANDING', 'PARTIALLY_RETURNED'] }
    }

    const transfers = await prisma.businessTransferLedger.findMany({
      where,
      include: {
        toAccount: {
          select: { id: true, accountName: true, accountNumber: true },
        },
      },
      orderBy: { transferDate: 'desc' },
    })

    const totalOutstanding = transfers.reduce((s: number, t: (typeof transfers)[0]) => s + Number(t.outstandingAmount), 0)

    return NextResponse.json({
      success: true,
      data: {
        transfers: transfers.map((t: (typeof transfers)[0]) => ({
          id: t.id,
          fromBusinessId: t.fromBusinessId,
          fromBusinessName: t.fromBusinessName,
          toAccount: t.toAccount,
          toBusinessId: t.toBusinessId,
          originalAmount: Number(t.originalAmount),
          outstandingAmount: Number(t.outstandingAmount),
          returnedAmount: Number(t.originalAmount) - Number(t.outstandingAmount),
          transferDate: t.transferDate.toISOString(),
          status: t.status,
          createdAt: t.createdAt.toISOString(),
        })),
        totalOutstanding,
        count: transfers.length,
      },
    })
  } catch (error) {
    console.error('Error fetching transfer report:', error)
    return NextResponse.json({ error: 'Failed to fetch transfer report' }, { status: 500 })
  }
}
