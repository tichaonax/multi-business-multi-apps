import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { processRentTransfer } from '@/lib/eod-utils'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ businessId: string }> }

function computeIndicator(balance: number, monthlyRent: number): 'red' | 'orange' | 'green' {
  if (monthlyRent <= 0) return 'red'
  const pct = (balance / monthlyRent) * 100
  if (pct >= 100) return 'green'
  if (pct >= 75) return 'orange'
  return 'red'
}

/**
 * POST /api/rent-account/[businessId]/eod-transfer
 * Create an EOD_RENT_TRANSFER deposit in the rent account.
 * Idempotent: returns existing deposit if one already exists for the given date.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params

    const permissions = getEffectivePermissions(user, businessId)
    const canTransfer =
      user.role === 'admin' ||
      permissions.canManageBusinessSettings ||
      permissions.canMakeExpenseDeposits

    if (!canTransfer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { eodDate, note } = body

    if (!eodDate) {
      return NextResponse.json({ error: 'eodDate is required (YYYY-MM-DD)' }, { status: 400 })
    }

    let result
    try {
      result = await processRentTransfer(businessId, eodDate, user.id, note)
    } catch (err: any) {
      if (err.message === 'NO_RENT_CONFIG') {
        return NextResponse.json({ error: 'No rent account configured for this business' }, { status: 404 })
      }
      if (err.message === 'RENT_ACCOUNT_INACTIVE') {
        return NextResponse.json({ error: 'Rent account is inactive' }, { status: 400 })
      }
      if (err.message === 'RENT_AMOUNT_ZERO') {
        return NextResponse.json({ error: 'amount must be > 0' }, { status: 400 })
      }
      if (err.message?.startsWith('INSUFFICIENT_FUNDS:')) {
        return NextResponse.json({ error: 'Insufficient business account balance' }, { status: 422 })
      }
      throw err
    }

    // Fetch fresh rent account balance for response
    const config = await prisma.businessRentConfig.findUnique({
      where: { businessId },
      include: { expenseAccount: { select: { balance: true } } },
    })
    const newBalance = Number(config?.expenseAccount?.balance ?? 0)
    const monthlyRent = Number(config?.monthlyRentAmount ?? 0)
    const fundingPercent = monthlyRent > 0 ? Math.round((newBalance / monthlyRent) * 1000) / 10 : 0

    return NextResponse.json(
      {
        success: true,
        alreadyTransferred: result.alreadyTransferred,
        deposit: { id: result.depositId, amount: result.amount },
        newBalance,
        fundingPercent,
        indicator: computeIndicator(newBalance, monthlyRent),
      },
      { status: result.alreadyTransferred ? 200 : 201 }
    )
  } catch (err) {
    console.error('[POST /api/rent-account/eod-transfer]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
