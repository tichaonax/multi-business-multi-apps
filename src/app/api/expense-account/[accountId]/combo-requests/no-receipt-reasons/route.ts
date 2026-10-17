import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { canUserViewAccount } from '@/lib/expense-account-access'

/**
 * GET /api/expense-account/[accountId]/combo-requests/no-receipt-reasons
 * MBM-323: "No Receipt" reasons used before, most used first, so the user
 * can pick one instead of retyping it. Read from the existing
 * combo_payment_request_items.noReceiptReason column (no separate phrase
 * table) across all expense accounts of the same business — a reason is
 * "saved" by using it once.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId } = await params
    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      if (!(await canUserViewAccount(user.id, accountId))) {
        return NextResponse.json({ error: 'You do not have permission to access this expense account' }, { status: 403 })
      }
    }

    const account = await prisma.expenseAccounts.findUnique({ where: { id: accountId }, select: { businessId: true } })
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    const items = await prisma.comboPaymentRequestItems.findMany({
      where: {
        noReceiptReason: { not: null },
        request: account.businessId ? { expenseAccount: { businessId: account.businessId } } : { accountId },
      },
      select: { noReceiptReason: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 2000,
    })

    // Group case-insensitively; keep the most recent spelling
    const groups = new Map<string, { reason: string; count: number }>()
    for (const i of items) {
      const reason = (i.noReceiptReason ?? '').trim().replace(/\s+/g, ' ')
      if (!reason) continue
      const key = reason.toLowerCase()
      const g = groups.get(key)
      if (g) g.count++
      else groups.set(key, { reason, count: 1 })
    }
    const reasons = [...groups.values()].sort((a, b) => b.count - a.count).slice(0, 10).map(g => g.reason)

    return NextResponse.json({ success: true, data: reasons })
  } catch (error) {
    console.error('Error fetching no-receipt reasons:', error)
    return NextResponse.json({ error: 'Failed to load reasons' }, { status: 500 })
  }
}
