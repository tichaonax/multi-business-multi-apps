import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-account/payments/receipt-counts?paymentIds=a,b,c
 * Returns { [paymentId]: count } for badge rendering — avoids N+1 queries.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const raw = searchParams.get('paymentIds') ?? ''
    const paymentIds = raw.split(',').map(s => s.trim()).filter(Boolean)

    if (paymentIds.length === 0) {
      return NextResponse.json({ success: true, data: {} })
    }

    const counts = await prisma.expensePaymentReceipts.groupBy({
      by: ['expensePaymentId'],
      where: { expensePaymentId: { in: paymentIds } },
      _count: { id: true },
    })

    const result: Record<string, number> = {}
    for (const row of counts) {
      result[row.expensePaymentId] = row._count.id
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error fetching receipt counts:', error)
    return NextResponse.json({ error: 'Failed to fetch receipt counts' }, { status: 500 })
  }
}
