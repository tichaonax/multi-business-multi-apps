import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/expense-account/transfer-history
 * Returns manual transfer history across accounts the user can access.
 *
 * Query params:
 * - accountId  (optional) — filter to transfers involving this account (source or destination)
 * - direction  (optional) — 'IN' | 'OUT' (default: both)
 * - startDate  (optional) — ISO date string
 * - endDate    (optional) — ISO date string
 * - limit      (default 50)
 * - offset     (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check across ALL active memberships — a grant on any business is sufficient
    const canView = user.role === 'admin' ||
      (user.businessMemberships ?? []).some(m => {
        if (!m.isActive) return false
        const p = getEffectivePermissions(user, m.businessId)
        return p.canAccessExpenseAccount || p.canTransferBetweenAccounts
      })
    if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const permissions = getEffectivePermissions(user)

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId') || null
    const direction = searchParams.get('direction') || ''
    const startDate = searchParams.get('startDate') || null
    const endDate = searchParams.get('endDate') || null
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Determine which account IDs the user can access
    let accessibleAccountIds: string[] | null = null // null = admin sees all

    if (user.role !== 'admin') {
      const userBusinessIds = (user.businessMemberships ?? []).map((m: any) => m.businessId)
      const grants = await prisma.expenseAccountGrants.findMany({
        where: { userId: user.id },
        select: { expenseAccountId: true },
      })
      const grantedIds = grants.map(g => g.expenseAccountId)

      const accessible = await prisma.expenseAccounts.findMany({
        where: {
          OR: [
            ...(permissions.canAccessExpenseAccount && userBusinessIds.length > 0
              ? [{ businessId: { in: userBusinessIds } }]
              : []),
            ...(grantedIds.length > 0 ? [{ id: { in: grantedIds } }] : []),
          ],
        },
        select: { id: true },
      })
      accessibleAccountIds = accessible.map(a => a.id)
    }

    // Build where clause for TRANSFER_OUT payments
    const paymentWhere: any = { paymentType: 'TRANSFER_OUT' }

    if (accessibleAccountIds !== null) {
      paymentWhere.expenseAccountId = { in: accessibleAccountIds }
    }

    // If filtering to a specific account and direction is OUT, scope source filter
    if (accountId && direction === 'OUT') {
      paymentWhere.expenseAccountId = accountId
    }

    if (startDate) {
      paymentWhere.paymentDate = { gte: new Date(startDate) }
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      paymentWhere.paymentDate = { ...paymentWhere.paymentDate, lte: end }
    }

    // Fetch all TRANSFER_OUT payments the user has access to
    const transferPayments = await prisma.expenseAccountPayments.findMany({
      where: paymentWhere,
      select: {
        id: true,
        expenseAccountId: true,
        amount: true,
        notes: true,
        paymentDate: true,
        createdBy: true,
        createdAt: true,
        expenseAccount: { select: { id: true, accountName: true, accountNumber: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { paymentDate: 'desc' },
    })

    // For each payment, find the matching ACCOUNT_TRANSFER deposit to get the destination account.
    // Match by: same createdBy + same amount + createdAt within 5s + sourceType = 'ACCOUNT_TRANSFER'
    const transfers = await Promise.all(
      transferPayments.map(async (payment) => {
        const createdAtMin = new Date(payment.createdAt.getTime() - 5000)
        const createdAtMax = new Date(payment.createdAt.getTime() + 5000)

        const deposit = await prisma.expenseAccountDeposits.findFirst({
          where: {
            sourceType: 'ACCOUNT_TRANSFER',
            amount: payment.amount,
            createdBy: payment.createdBy,
            createdAt: { gte: createdAtMin, lte: createdAtMax },
          },
          select: {
            expenseAccount: { select: { id: true, accountName: true, accountNumber: true } },
          },
        })

        return {
          id: payment.id,
          transferDate: payment.paymentDate.toISOString(),
          amount: Number(payment.amount),
          notes: payment.notes ?? '',
          sourceAccount: {
            id: payment.expenseAccount.id,
            accountName: payment.expenseAccount.accountName,
            accountNumber: payment.expenseAccount.accountNumber,
          },
          destinationAccount: deposit?.expenseAccount ?? null,
          initiatedBy: payment.creator
            ? { id: payment.creator.id, name: payment.creator.name }
            : { id: payment.createdBy, name: 'Unknown' },
        }
      })
    )

    // Post-filter by accountId + direction
    let filtered = transfers
    if (accountId) {
      if (direction === 'IN') {
        filtered = transfers.filter(t => t.destinationAccount?.id === accountId)
      } else if (direction === 'OUT') {
        filtered = transfers.filter(t => t.sourceAccount.id === accountId)
      } else {
        filtered = transfers.filter(
          t => t.sourceAccount.id === accountId || t.destinationAccount?.id === accountId
        )
      }
    }

    const total = filtered.length
    const paginated = filtered.slice(offset, offset + limit)

    const totalOut = filtered.reduce((sum, t) =>
      !accountId || t.sourceAccount.id === accountId ? sum + t.amount : sum, 0)
    const totalIn = filtered.reduce((sum, t) =>
      !accountId || t.destinationAccount?.id === accountId ? sum + t.amount : sum, 0)

    return NextResponse.json({
      success: true,
      data: {
        transfers: paginated,
        aggregates: {
          totalTransferredOut: totalOut,
          totalTransferredIn: totalIn,
          net: totalIn - totalOut,
          count: total,
        },
        pagination: { total, limit, offset, hasMore: offset + limit < total },
      },
    })
  } catch (error) {
    console.error('Error fetching transfer history:', error)
    return NextResponse.json({ error: 'Failed to fetch transfer history' }, { status: 500 })
  }
}
