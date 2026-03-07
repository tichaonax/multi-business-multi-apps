import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

type Params = { params: Promise<{ businessId: string }> }

const MAX_CONFIGS_PER_BUSINESS = 10

/**
 * GET /api/auto-deposits/[businessId]
 * List all EOD auto-deposit configs for a business, ordered by displayOrder.
 * Returns full expense account info for each config.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params

    const permissions = getEffectivePermissions(user, businessId)
    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify business exists and user has access
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, business_accounts: { select: { balance: true } } },
    })
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const configs = await prisma.expenseAccountAutoDeposit.findMany({
      where: { businessId },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        expenseAccount: {
          select: {
            id: true,
            accountNumber: true,
            accountName: true,
            balance: true,
            isActive: true,
            businessId: true,
            business: { select: { name: true } },
            depositCap: true,
            depositCapReachedAt: true,
            isAutoDepositFrozen: true,
          },
        },
        creator: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        configs,
        businessBalance: Number(business.business_accounts?.balance ?? 0),
        totalActiveConfigs: configs.filter((c: { isActive: boolean }) => c.isActive).length,
        totalDailyCommitment: configs
          .filter((c: { isActive: boolean }) => c.isActive)
          .reduce((sum: number, c: { dailyAmount: unknown }) => sum + Number(c.dailyAmount), 0),
      },
    })
  } catch (err) {
    console.error('[GET /api/auto-deposits]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/auto-deposits/[businessId]
 * Create a new EOD auto-deposit config.
 * Body: { expenseAccountId, dailyAmount, displayOrder?, notes? }
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params

    const permissions = getEffectivePermissions(user, businessId)
    if (!permissions.canManageAutoDeposits && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied — auto-deposit management required' }, { status: 403 })
    }

    // Verify business exists
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { id: true, name: true },
    })
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    // Enforce max 10 configs per business
    const existingCount = await prisma.expenseAccountAutoDeposit.count({
      where: { businessId },
    })
    if (existingCount >= MAX_CONFIGS_PER_BUSINESS) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_CONFIGS_PER_BUSINESS} auto-deposit configs allowed per business` },
        { status: 422 }
      )
    }

    const body = await request.json()
    const { expenseAccountId, dailyAmount, displayOrder, notes, startDate, endDate } = body

    // Validate required fields
    if (!expenseAccountId) {
      return NextResponse.json({ error: 'expenseAccountId is required' }, { status: 400 })
    }
    if (dailyAmount === undefined || dailyAmount === null) {
      return NextResponse.json({ error: 'dailyAmount is required' }, { status: 400 })
    }
    const dailyAmountNum = Number(dailyAmount)
    if (isNaN(dailyAmountNum) || dailyAmountNum <= 0) {
      return NextResponse.json({ error: 'dailyAmount must be a positive number' }, { status: 400 })
    }
    if (dailyAmountNum > 9999999.99) {
      return NextResponse.json({ error: 'dailyAmount exceeds maximum allowed value' }, { status: 400 })
    }

    // Validate optional dates
    const parsedStartDate = startDate ? new Date(startDate) : null
    const parsedEndDate = endDate ? new Date(endDate) : null
    if (parsedStartDate && isNaN(parsedStartDate.getTime())) {
      return NextResponse.json({ error: 'startDate must be a valid date (YYYY-MM-DD)' }, { status: 400 })
    }
    if (parsedEndDate && isNaN(parsedEndDate.getTime())) {
      return NextResponse.json({ error: 'endDate must be a valid date (YYYY-MM-DD)' }, { status: 400 })
    }
    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
      return NextResponse.json({ error: 'startDate must be before or equal to endDate' }, { status: 400 })
    }

    // Verify expense account exists and is active (can belong to any business)
    const expenseAccount = await prisma.expenseAccounts.findFirst({
      where: { id: expenseAccountId, isActive: true },
      select: { id: true, accountName: true, accountNumber: true, businessId: true },
    })
    if (!expenseAccount) {
      return NextResponse.json(
        { error: 'Expense account not found or is inactive' },
        { status: 404 }
      )
    }

    // Check for duplicate (unique constraint on businessId + expenseAccountId)
    const duplicate = await prisma.expenseAccountAutoDeposit.findUnique({
      where: { businessId_expenseAccountId: { businessId, expenseAccountId } },
    })
    if (duplicate) {
      return NextResponse.json(
        { error: `An auto-deposit config for "${expenseAccount.accountName}" already exists` },
        { status: 409 }
      )
    }

    // Determine displayOrder: user-supplied or next available
    let order = displayOrder != null ? Number(displayOrder) : existingCount * 10 + 10

    const config = await prisma.expenseAccountAutoDeposit.create({
      data: {
        businessId,
        expenseAccountId,
        dailyAmount: dailyAmountNum,
        displayOrder: order,
        isActive: true,
        isPausedByCap: false,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        notes: notes?.trim() || null,
        createdBy: user.id,
      },
      include: {
        expenseAccount: {
          select: {
            id: true,
            accountNumber: true,
            accountName: true,
            balance: true,
            isActive: true,
            businessId: true,
            business: { select: { name: true } },
            depositCap: true,
            depositCapReachedAt: true,
            isAutoDepositFrozen: true,
          },
        },
        creator: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, data: { config } }, { status: 201 })
  } catch (err: any) {
    // Unique constraint violation
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { error: 'An auto-deposit config for this expense account already exists' },
        { status: 409 }
      )
    }
    console.error('[POST /api/auto-deposits]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
