import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/expense-account/[accountId]/loans-owed
 * MBM-312 — the borrower's-side view: every BUSINESS loan where this
 * account's business is the recipient, i.e. what it owes and to whom. The
 * existing /outgoing-loans endpoint only shows the lender's side (loans
 * sourced FROM this account) — nothing before this showed the reverse.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount && !permissions.canManageLending && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const account = await prisma.expenseAccounts.findUnique({
      where: { id: params.accountId },
      select: { businessId: true },
    })
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    if (!account.businessId) {
      return NextResponse.json({ success: true, data: { loans: [] } })
    }

    const loans = await prisma.accountOutgoingLoans.findMany({
      where: { loanType: 'BUSINESS', recipientBusinessId: account.businessId },
      include: {
        expenseAccount: { select: { id: true, accountName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        loans: loans.map(l => ({
          id: l.id,
          loanNumber: l.loanNumber,
          sourceAccountId: l.expenseAccountId,
          sourceAccountName: l.expenseAccount?.accountName ?? 'Unknown',
          principalAmount: Number(l.principalAmount),
          remainingBalance: Number(l.remainingBalance),
          status: l.status,
          purpose: l.purpose,
          disbursementDate: l.disbursementDate.toISOString(),
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching loans owed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
