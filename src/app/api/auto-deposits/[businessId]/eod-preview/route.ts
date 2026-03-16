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

export interface EodRentTransferPreview {
  accountName: string
  dailyAmount: number
  alreadyProcessedToday: boolean
}

export interface EodPayrollContributionPreview {
  amount: number          // whole-dollar contribution (0 if skipped)
  skipped: boolean
  reason: string          // shown to manager when skipped
  targetAmount: number    // what the formula produced before capping/flooring
}

export interface EodPreviewResponse {
  configs: EodPreviewConfig[]
  depositAccountBalance: number
  todayNetSales: number
  totalConfiguredAmount: number  // sum of dailyAmount for non-already-done configs
  canProcess: boolean            // depositAccountBalance >= totalConfiguredAmount
  rentTransfer: EodRentTransferPreview | null  // rent is a separate process — shown read-only
  payrollContribution: EodPayrollContributionPreview | null
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

    // Rent transfer preview — separate process from auto-deposits, shown read-only
    let rentTransfer: EodRentTransferPreview | null = null
    if (rentConfig?.isActive && rentConfig.autoTransferOnEOD && rentConfig.expenseAccountId) {
      const rentAccount = await prisma.expenseAccounts.findUnique({
        where: { id: rentConfig.expenseAccountId },
        select: { accountName: true },
      })
      const rentDoneToday = await prisma.expenseAccountDeposits.findFirst({
        where: {
          expenseAccountId: rentConfig.expenseAccountId,
          sourceType: 'EOD_RENT_TRANSFER',
          sourceBusinessId: businessId,
          depositDate: { gte: dayStart, lte: dayEnd },
        },
        select: { id: true },
      })
      rentTransfer = {
        accountName: rentAccount?.accountName ?? 'Rent Account',
        dailyAmount: Number(rentConfig.dailyTransferAmount),
        alreadyProcessedToday: !!rentDoneToday,
      }
    }

    // Total configured = sum of daily amounts for configs not already processed today
    const totalConfiguredAmount = previewConfigs
      .filter(c => !c.alreadyProcessedToday)
      .reduce((sum, c) => sum + c.dailyAmount, 0)

    const canProcess = depositAccountBalance >= totalConfiguredAmount

    // ── Payroll contribution preview (same formula as close-books auto-contribution) ──
    let payrollContribution: EodPayrollContributionPreview | null = null
    try {
      const NA = (reason: string, targetAmount = 0): EodPayrollContributionPreview =>
        ({ amount: 0, skipped: true, reason, targetAmount })

      const payrollAccount = await prisma.payrollAccounts.findFirst({
        where: { businessId: null, isActive: true },
        select: { id: true, balance: true },
      })

      if (!payrollAccount) {
        payrollContribution = NA('No global payroll account')
      } else {
        const currentBalance = Number(payrollAccount.balance)
        const contracts = await prisma.employeeContracts.findMany({
          where: { status: 'active' },
          select: { baseSalary: true, livingAllowance: true, primaryBusinessId: true },
        })

        if (contracts.length === 0) {
          payrollContribution = NA('No signed employee contracts')
        } else {
          const totalMonthlyPayroll = contracts.reduce(
            (sum, c) => sum + Number(c.baseSalary) + Number(c.livingAllowance ?? 0), 0
          )
          const totalContracts = contracts.length
          const businessContractCount = contracts.filter(c => c.primaryBusinessId === businessId).length

          if (businessContractCount === 0) {
            payrollContribution = NA('No contracts for this business')
          } else {
            const businessShare = businessContractCount / totalContracts
            const eodDateObj2 = new Date(date + 'T00:00:00Z')
            const year = eodDateObj2.getUTCFullYear()
            const month = eodDateObj2.getUTCMonth()
            const daysInMonth = new Date(year, month + 1, 0).getUTCDate()
            const remainingDays = Math.max(1, daysInMonth - eodDateObj2.getUTCDate() + 1)
            const remainingNeeded = Math.max(0, totalMonthlyPayroll - currentBalance)

            if (remainingNeeded < 1) {
              payrollContribution = NA('Payroll account already fully funded')
            } else {
              const businessDailyTarget = (remainingNeeded / remainingDays) * businessShare
              const dailyRentEquivalent = Number(rentConfig?.dailyTransferAmount ?? 0)
              const netDailySalesForPayroll = Math.max(0, todayNetSales - dailyRentEquivalent)
              const rawContribution = Math.min(businessDailyTarget, netDailySalesForPayroll * 0.8)
              const contribution = Math.floor(rawContribution)

              if (contribution < 1) {
                payrollContribution = NA(
                  `Below $1 after 80% cap on net sales`,
                  Math.floor(businessDailyTarget)
                )
              } else {
                // Check if already contributed today
                const alreadyContributed = await prisma.payrollAccountDeposits.findFirst({
                  where: {
                    businessId,
                    transactionType: 'EOD_AUTO_CONTRIBUTION',
                    depositDate: { gte: dayStart, lte: dayEnd },
                  },
                  select: { id: true, amount: true },
                })
                if (alreadyContributed) {
                  payrollContribution = {
                    amount: Number(alreadyContributed.amount),
                    skipped: false,
                    reason: 'Already contributed today',
                    targetAmount: contribution,
                  }
                } else {
                  payrollContribution = {
                    amount: contribution,
                    skipped: false,
                    reason: `${businessContractCount} of ${totalContracts} staff · ${(businessShare * 100).toFixed(0)}% of global payroll share`,
                    targetAmount: contribution,
                  }
                }
              }
            }
          }
        }
      }
    } catch {
      payrollContribution = null  // non-fatal — don't block EOD if payroll preview fails
    }

    const response: EodPreviewResponse = {
      configs: previewConfigs,
      depositAccountBalance,
      todayNetSales,
      totalConfiguredAmount,
      canProcess,
      rentTransfer,
      payrollContribution,
    }

    return NextResponse.json({ success: true, data: response })
  } catch (err) {
    console.error('[GET /api/auto-deposits/eod-preview]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
