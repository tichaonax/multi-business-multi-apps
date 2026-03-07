import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

type Params = { params: Promise<{ accountId: string }> }

/**
 * GET /api/expense-accounts/[accountId]/auto-deposit-settings
 * Returns current cap + freeze state for the account.
 * Accessible to any user who can access the expense account.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId } = await params

    const account = await prisma.expenseAccounts.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        accountName: true,
        accountNumber: true,
        depositCap: true,
        depositCapSetBy: true,
        depositCapSetAt: true,
        depositCapReachedAt: true,
        isAutoDepositFrozen: true,
        autoDepositFrozenBy: true,
        autoDepositFrozenAt: true,
        depositCapSetter: { select: { id: true, name: true } },
        autoDepositFreezer: { select: { id: true, name: true } },
        // Total all-time deposits for cap progress
        deposits: {
          select: { amount: true },
        },
      },
    })
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    const totalDeposited = account.deposits.reduce((sum: number, d: { amount: unknown }) => sum + Number(d.amount), 0)
    const depositCap = account.depositCap ? Number(account.depositCap) : null
    const remainingTowardsCap = depositCap !== null ? Math.max(0, depositCap - totalDeposited) : null
    const capReached = depositCap !== null && totalDeposited >= depositCap

    return NextResponse.json({
      success: true,
      data: {
        accountId: account.id,
        accountName: account.accountName,
        accountNumber: account.accountNumber,
        depositCap,
        depositCapSetBy: account.depositCapSetter ?? null,
        depositCapSetAt: account.depositCapSetAt ?? null,
        depositCapReachedAt: account.depositCapReachedAt ?? null,
        isAutoDepositFrozen: account.isAutoDepositFrozen,
        autoDepositFrozenBy: account.autoDepositFreezer ?? null,
        autoDepositFrozenAt: account.autoDepositFrozenAt ?? null,
        totalDeposited,
        remainingTowardsCap,
        capReached,
      },
    })
  } catch (err) {
    console.error('[GET auto-deposit-settings]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/expense-accounts/[accountId]/auto-deposit-settings
 * Admin-only. Sets/clears depositCap and/or isAutoDepositFrozen.
 *
 * Body (all optional):
 *   depositCap: number | null        — null removes the cap
 *   isAutoDepositFrozen: boolean
 *
 * Cap rules:
 * - When cap is raised or removed, depositCapReachedAt is cleared (cap no longer reached).
 * - isPausedByCap flags on configs are NOT auto-reset (manual reactivation required per spec).
 *
 * Freeze rules:
 * - Setting freeze=true records who froze and when.
 * - Setting freeze=false clears the audit fields.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { accountId } = await params

    const account = await prisma.expenseAccounts.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        accountName: true,
        depositCap: true,
        depositCapReachedAt: true,
        isAutoDepositFrozen: true,
        deposits: { select: { amount: true } },
      },
    })
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    const body = await request.json()
    const { depositCap: newCap, isAutoDepositFrozen: newFrozen } = body

    const updateData: Record<string, unknown> = {}
    const now = new Date()

    // ── Cap handling ──────────────────────────────────────────────────────────
    if ('depositCap' in body) {
      if (newCap === null || newCap === undefined) {
        // Remove cap entirely
        updateData.depositCap = null
        updateData.depositCapSetBy = null
        updateData.depositCapSetAt = null
        updateData.depositCapReachedAt = null  // clear reached flag
      } else {
        const capNum = Number(newCap)
        if (isNaN(capNum) || capNum <= 0) {
          return NextResponse.json({ error: 'depositCap must be a positive number' }, { status: 400 })
        }
        const prevCap = account.depositCap ? Number(account.depositCap) : null
        updateData.depositCap = capNum
        updateData.depositCapSetBy = user.id
        updateData.depositCapSetAt = now

        // If cap has been raised or is newly set, clear the reached flag
        if (prevCap === null || capNum > prevCap) {
          updateData.depositCapReachedAt = null
        }
        // If cap has been lowered, check if already exceeded new cap
        if (capNum < (prevCap ?? Infinity)) {
          const totalDeposited = account.deposits.reduce((sum: number, d: { amount: unknown }) => sum + Number(d.amount), 0)
          if (totalDeposited >= capNum) {
            updateData.depositCapReachedAt = account.depositCapReachedAt ?? now
          }
        }
      }
    }

    // ── Freeze handling ───────────────────────────────────────────────────────
    if ('isAutoDepositFrozen' in body) {
      updateData.isAutoDepositFrozen = Boolean(newFrozen)
      if (newFrozen) {
        updateData.autoDepositFrozenBy = user.id
        updateData.autoDepositFrozenAt = now
      } else {
        updateData.autoDepositFrozenBy = null
        updateData.autoDepositFrozenAt = null
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const updated = await prisma.expenseAccounts.update({
      where: { id: accountId },
      data: updateData,
      select: {
        id: true,
        depositCap: true,
        depositCapSetBy: true,
        depositCapSetAt: true,
        depositCapReachedAt: true,
        isAutoDepositFrozen: true,
        autoDepositFrozenBy: true,
        autoDepositFrozenAt: true,
        depositCapSetter: { select: { id: true, name: true } },
        autoDepositFreezer: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: `Auto-deposit settings updated for ${account.accountName}`,
      data: {
        depositCap: updated.depositCap ? Number(updated.depositCap) : null,
        depositCapSetBy: updated.depositCapSetter ?? null,
        depositCapSetAt: updated.depositCapSetAt ?? null,
        depositCapReachedAt: updated.depositCapReachedAt ?? null,
        isAutoDepositFrozen: updated.isAutoDepositFrozen,
        autoDepositFrozenBy: updated.autoDepositFreezer ?? null,
        autoDepositFrozenAt: updated.autoDepositFrozenAt ?? null,
      },
    })
  } catch (err) {
    console.error('[PATCH auto-deposit-settings]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
