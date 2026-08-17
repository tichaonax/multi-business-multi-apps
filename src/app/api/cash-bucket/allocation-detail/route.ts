/**
 * GET /api/cash-bucket/allocation-detail?businessId=&entryType=&notes=
 *
 * Drill-down for one earmarked line on the Cash Box "Per-Business Breakdown" —
 * lists the individual CashBucketEntry rows that sum to that line's amount this
 * month, plus the real expense account it belongs to.
 *
 * The earmarked line's own grouping key IS the account name (CashBucketEntry.notes
 * for CASH_ALLOCATION is set to `account.accountName` at creation time — see
 * expense-account/[accountId]/deposits/route.ts and the EOD-lock route), so the
 * whole group resolves to one account via a single exact-name lookup rather than
 * chasing each row's own referenceId — those vary by creation path (some point at
 * an ExpenseAccountDeposits row, older EOD-lock entries point at a
 * CashAllocationReport instead) and aren't a reliable resolution path on their own.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    const canAccess = permissions.canSubmitPaymentBatch || (permissions as any).canViewCashBucketReport || user.role === 'admin'
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const entryType = searchParams.get('entryType')
    const notes = searchParams.get('notes') // present for CASH_ALLOCATION, omitted for PAYROLL_FUNDING

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (entryType !== 'CASH_ALLOCATION' && entryType !== 'PAYROLL_FUNDING') {
      return NextResponse.json({ error: 'entryType must be CASH_ALLOCATION or PAYROLL_FUNDING' }, { status: 400 })
    }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const entries = await prisma.cashBucketEntry.findMany({
      where: {
        businessId,
        entryType,
        direction: 'OUTFLOW',
        deletedAt: null,
        entryDate: { gte: startOfMonth },
        ...(entryType === 'CASH_ALLOCATION' ? { notes: notes ?? undefined } : {}),
      },
      select: {
        id: true,
        amount: true,
        entryDate: true,
        notes: true,
        creator: { select: { name: true } },
      },
      orderBy: { entryDate: 'desc' },
    })

    // Resolve the one account this whole group belongs to (see file header) — a
    // single lookup, not one per row. Try this business's own account first, then
    // fall back to a shared/virtual account (businessId: null — e.g. "General
    // Expenses" or a shared loan account used by several businesses at once).
    const resolvedAccount = entryType === 'CASH_ALLOCATION' && notes
      ? (await prisma.expenseAccounts.findFirst({
          where: { businessId, accountName: notes },
          select: { accountName: true, accountNumber: true },
        })) ?? (await prisma.expenseAccounts.findFirst({
          where: { businessId: null, accountName: notes },
          select: { accountName: true, accountNumber: true },
        }))
      : null

    const items = entries.map(e => ({
      id: e.id,
      amount: Number(e.amount),
      date: e.entryDate.toISOString(),
      notes: e.notes,
      createdBy: e.creator?.name ?? null,
      accountName: entryType === 'PAYROLL_FUNDING' ? 'Payroll Account' : (resolvedAccount?.accountName ?? null),
      accountNumber: entryType === 'PAYROLL_FUNDING' ? null : (resolvedAccount?.accountNumber ?? null),
    }))

    return NextResponse.json({ success: true, items })
  } catch (err) {
    console.error('[GET /api/cash-bucket/allocation-detail]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
