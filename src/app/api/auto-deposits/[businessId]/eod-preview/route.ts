import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

type Params = { params: Promise<{ businessId: string }> }

export interface EodPreviewConfig {
  configId: string
  expenseAccountId: string
  accountName: string
  accountNumber: string
  dailyAmount: number
  displayOrder: number
  isRentAccount: boolean
  rentMinimum: number | null
  isPausedByCap: boolean
  startDate: string | null   // YYYY-MM-DD
  endDate: string | null     // YYYY-MM-DD
  isAutoDepositFrozen: boolean
  alreadyProcessedToday: boolean
  skipReason: string | null  // human-readable reason why row is locked/pre-skipped
  isLoanAccount?: boolean    // true when this account is a loan repayment account
}

export interface EodPreviewResponse {
  configs: EodPreviewConfig[]
  depositAccountBalance: number
  todayNetSales: number
  totalConfiguredAmount: number  // sum of dailyAmount for non-already-done configs
  canProcess: boolean            // depositAccountBalance >= totalConfiguredAmount
}

/**
 * GET /api/auto-deposits/[businessId]/eod-preview?date=YYYY-MM-DD
 *
 * Returns everything the AutoDepositEodSummary component needs to render
 * the interactive preview step before the user confirms EOD close.
 *
 * Auth: canMakeExpenseDeposits OR admin
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params

    const permissions = getEffectivePermissions(user, businessId)
    const canAccess =
      user.role === 'admin' ||
      permissions.canMakeExpenseDeposits ||
      permissions.canManageBusinessSettings
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate date param
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'date query param is required and must be YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Day window for idempotency check
    const dayStart = new Date(date + 'T00:00:00Z')
    const dayEnd = new Date(date + 'T23:59:59.999Z')
    const eodDateObj = new Date(date + 'T00:00:00Z')

    // Fetch business + balance via business_accounts (businesses.balance does NOT exist)
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
        business_accounts: { select: { balance: true } },
      },
    })
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const depositAccountBalance = Number(business.business_accounts?.balance ?? 0)

    // Fetch rent config for this business (to detect rent account + get minimum)
    const rentConfig = await prisma.businessRentConfig.findUnique({
      where: { businessId },
      select: {
        expenseAccountId: true,
        dailyTransferAmount: true,
        isActive: true,
        autoTransferOnEOD: true,
      },
    })

    // Fetch active auto-deposit configs ordered by displayOrder
    const configs = await prisma.expenseAccountAutoDeposit.findMany({
      where: { businessId, isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        expenseAccount: {
          select: {
            id: true,
            accountName: true,
            accountNumber: true,
            accountType: true,
            isActive: true,
            isAutoDepositFrozen: true,
            isLoanAccount: true,
            balance: true,
            depositCap: true,
            depositCapReachedAt: true,
          },
        },
      },
    })

    // For each config check if a deposit was already made today (idempotency)
    const expenseAccountIds: string[] = []
    for (const c of configs) {
      expenseAccountIds.push(c.expenseAccountId)
    }
    const todaysDeposits = await prisma.expenseAccountDeposits.findMany({
      where: {
        expenseAccountId: { in: expenseAccountIds },
        sourceType: 'EOD_AUTO_DEPOSIT',
        sourceBusinessId: businessId,
        depositDate: { gte: dayStart, lte: dayEnd },
      },
      select: { expenseAccountId: true },
    })
    const alreadyDoneIds = new Set<string>()
    for (const d of todaysDeposits) {
      alreadyDoneIds.add(d.expenseAccountId)
    }

    // Build preview config list
    const previewConfigs: EodPreviewConfig[] = []
    for (const config of configs) {
      const isRentAccount =
        config.expenseAccount.accountType === 'RENT' ||
        (rentConfig?.expenseAccountId === config.expenseAccountId && (rentConfig?.isActive ?? false))

      const rentMinimum =
        isRentAccount && rentConfig
          ? Number(rentConfig.dailyTransferAmount)
          : null

      const alreadyProcessedToday = alreadyDoneIds.has(config.expenseAccountId)

      // Compute skip reason for locked rows
      let skipReason: string | null = null
      if (alreadyProcessedToday) {
        skipReason = 'Already processed today'
      } else if (config.expenseAccount.isAutoDepositFrozen) {
        skipReason = 'Account is frozen for auto-deposits'
      } else if (config.isPausedByCap) {
        skipReason = 'Deposit cap reached — awaiting manual reactivation'
      } else if (config.expenseAccount.isLoanAccount && Number(config.expenseAccount.balance) >= 0) {
        skipReason = 'Loan fully repaid — no further deposits needed'
      } else if (config.startDate && eodDateObj < new Date(config.startDate)) {
        skipReason = 'Deposits start on ' + new Date(config.startDate).toISOString().slice(0, 10)
      } else if (config.endDate && eodDateObj > new Date(config.endDate)) {
        skipReason = 'Deposit period ended on ' + new Date(config.endDate).toISOString().slice(0, 10)
      }

      // Loan account: cap effective daily amount to abs(balance) to preview correct deposit
      let effectiveDailyAmount = Number(config.dailyAmount)
      if (config.expenseAccount.isLoanAccount && !skipReason) {
        const currentBalance = Number(config.expenseAccount.balance)
        const maxAllowed = Math.abs(currentBalance)
        if (effectiveDailyAmount > maxAllowed) {
          effectiveDailyAmount = maxAllowed
        }
      }

      previewConfigs.push({
        configId: config.id,
        expenseAccountId: config.expenseAccountId,
        accountName: config.expenseAccount.accountName,
        accountNumber: config.expenseAccount.accountNumber,
        dailyAmount: effectiveDailyAmount,
        displayOrder: config.displayOrder,
        isRentAccount,
        rentMinimum,
        isPausedByCap: config.isPausedByCap,
        startDate: config.startDate
          ? new Date(config.startDate).toISOString().slice(0, 10)
          : null,
        endDate: config.endDate
          ? new Date(config.endDate).toISOString().slice(0, 10)
          : null,
        isAutoDepositFrozen: config.expenseAccount.isAutoDepositFrozen,
        alreadyProcessedToday,
        skipReason,
        isLoanAccount: config.expenseAccount.isLoanAccount,
      })
    }

    // Compute today's confirmed net sales (COMPLETED orders, excludes CANCELLED/REFUNDED)
    // Uses same date-window logic as the daily-sales API
    let todayNetSales = 0
    try {
      const salesResult = await prisma.businessOrders.aggregate({
        where: {
          businessId,
          status: 'COMPLETED',
          OR: [
            { transactionDate: { gte: dayStart, lte: dayEnd } },
            { transactionDate: null, createdAt: { gte: dayStart, lte: dayEnd } },
          ],
        },
        _sum: { totalAmount: true },
      })
      todayNetSales = Number(salesResult._sum.totalAmount ?? 0)
    } catch {
      // Non-fatal — if sales query fails, default to 0 (guardrail will warn but won't block)
      todayNetSales = 0
    }

    // Total configured = sum of daily amounts for configs not already processed today
    const totalConfiguredAmount = previewConfigs
      .filter(c => !c.alreadyProcessedToday)
      .reduce((sum, c) => sum + c.dailyAmount, 0)

    const canProcess = depositAccountBalance >= totalConfiguredAmount

    const response: EodPreviewResponse = {
      configs: previewConfigs,
      depositAccountBalance,
      todayNetSales,
      totalConfiguredAmount,
      canProcess,
    }

    return NextResponse.json({ success: true, data: response })
  } catch (err) {
    console.error('[GET /api/auto-deposits/eod-preview]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
