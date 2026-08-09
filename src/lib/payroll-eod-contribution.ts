import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAvailableCashForAllocation } from '@/lib/eod-utils'

export interface PayrollEodContributionResult {
  amount: number
  skipped: boolean
  reason: string
  targetAmount: number
  payrollBalance: number
}

/**
 * Compute and execute the EOD payroll auto-contribution for a business.
 *
 * Formula:
 *   1. Total monthly payroll = sum of all active (status='active') employee contracts
 *   2. Remaining needed     = max(0, totalMonthlyPayroll − currentPayrollBalance)
 *   3. Business daily share = (remainingNeeded / remainingDaysInMonth) × (businessContracts / totalContracts)
 *   4. Net daily sales      = dailySales − (monthlyRent / daysInMonth)
 *   5. Contribution         = floor(min(businessDailyShare, netDailySales × 0.8))   ← whole dollars, 80% cap
 *
 * Silently skips (returns skipped=true) when payroll is funded, no contracts exist,
 * contribution rounds to < $1, or there isn't enough real cash on hand (CashBucketEntry
 * balance + today's counted cash — NOT businessAccounts.balance, which is credited for
 * every payment method and doesn't reflect physical cash) to cover the contribution.
 */
export async function computeAndExecutePayrollContribution(
  businessId: string,
  eodDate: string,        // YYYY-MM-DD
  dailySales: number,
  userId: string
): Promise<PayrollEodContributionResult> {
  const NA = (reason: string, targetAmount = 0, payrollBalance = 0): PayrollEodContributionResult =>
    ({ amount: 0, skipped: true, reason, targetAmount, payrollBalance })

  // 1. Global payroll account
  const payrollAccount = await prisma.payrollAccounts.findFirst({
    where: { businessId: null, isActive: true },
    select: { id: true, balance: true },
  })
  if (!payrollAccount) return NA('No global payroll account')

  const currentBalance = Number(payrollAccount.balance)

  // 2. Active employee contracts across ALL businesses
  const contracts = await prisma.employeeContracts.findMany({
    where: { status: 'active' },
    select: { baseSalary: true, livingAllowance: true, primaryBusinessId: true },
  })
  if (contracts.length === 0) return NA('No active employee contracts', 0, currentBalance)

  const totalMonthlyPayroll = contracts.reduce(
    (sum, c) => sum + Number(c.baseSalary) + Number(c.livingAllowance ?? 0), 0
  )
  const totalContracts = contracts.length
  const businessContractCount = contracts.filter(c => c.primaryBusinessId === businessId).length
  if (businessContractCount === 0) return NA('No contracts for this business', 0, currentBalance)

  const businessShare = businessContractCount / totalContracts

  // 3. Remaining days in the month (from eodDate to end of month, inclusive)
  const dateObj = new Date(eodDate + 'T00:00:00Z')
  const year = dateObj.getUTCFullYear()
  const month = dateObj.getUTCMonth()
  const daysInMonth = new Date(year, month + 1, 0).getUTCDate()
  const remainingDays = Math.max(1, daysInMonth - dateObj.getUTCDate() + 1)

  // 4. Daily payroll target for this business
  const remainingNeeded = Math.max(0, totalMonthlyPayroll - currentBalance)
  if (remainingNeeded < 1) return NA('Payroll account already fully funded', 0, currentBalance)

  const businessDailyTarget = (remainingNeeded / remainingDays) * businessShare

  // 5. Net daily sales = sales − prorated daily rent
  const rentConfig = await prisma.businessRentConfig.findFirst({
    where: { businessId, isActive: true },
    select: { monthlyRentAmount: true },
  })
  const dailyRentEquivalent = Number(rentConfig?.monthlyRentAmount ?? 0) / daysInMonth
  const netDailySales = Math.max(0, dailySales - dailyRentEquivalent)

  // 6. Cap at 80% of net sales, floor to whole dollar
  const rawContribution = Math.min(businessDailyTarget, netDailySales * 0.8)
  const contribution = Math.floor(rawContribution)

  if (contribution < 1) {
    return NA(
      `Contribution rounds to $0 (target $${Math.floor(businessDailyTarget)}, net sales $${netDailySales.toFixed(2)})`,
      Math.floor(businessDailyTarget),
      currentBalance
    )
  }

  // 7. Idempotency — skip if already contributed for this date
  // Use a 48-hour window centred on noon UTC to be timezone-safe
  const dayStart = new Date(eodDate + 'T00:00:00Z')
  const dayEnd   = new Date(new Date(eodDate + 'T00:00:00Z').getTime() + 48 * 60 * 60 * 1000 - 1)
  const existing = await prisma.payrollAccountDeposits.findFirst({
    where: {
      businessId,
      transactionType: 'EOD_AUTO_CONTRIBUTION',
      depositDate: { gte: dayStart, lte: dayEnd },
    },
    select: { id: true, amount: true },
  })
  if (existing) {
    return {
      amount: Number(existing.amount),
      skipped: false,
      reason: 'Already contributed today',
      targetAmount: contribution,
      payrollBalance: currentBalance,
    }
  }

  // 8. Check REAL cash available (CashBucketEntry + today's counted cash) — reflects any
  // amount already earmarked by rent transfer / expense auto-deposits earlier in this same
  // EOD close, since those write their OUTFLOW earmark atomically with their deposit.
  const availableCash = await getAvailableCashForAllocation(businessId, eodDate)
  if (availableCash < contribution) {
    return NA(
      `Insufficient cash available (target $${contribution}, available $${availableCash.toFixed(2)})`,
      contribution,
      currentBalance
    )
  }

  // 9. Execute atomically: re-check inside the transaction, debit business account
  // (bookkeeping only — see eod-utils.ts processRentTransfer for why this is unchanged),
  // create deposit + PAYROLL_FUNDING earmark, update payroll balance.
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const availableCashInTx = await getAvailableCashForAllocation(businessId, eodDate, undefined, tx)
    if (availableCashInTx < contribution) {
      throw new Error('INSUFFICIENT_FUNDS:' + availableCashInTx.toFixed(2))
    }

    const bizAcct = await tx.businessAccounts.findUnique({ where: { businessId }, select: { balance: true } })
    const bizBalance = Number(bizAcct?.balance ?? 0)

    await tx.businessAccounts.update({
      where: { businessId },
      data: { balance: { decrement: contribution } },
    })
    await tx.businessTransactions.create({
      data: {
        businessId,
        type: 'DEBIT',
        amount: -contribution,
        description: `EOD payroll auto-contribution for ${eodDate}`,
        balanceAfter: bizBalance - contribution,
        createdBy: userId,
        referenceType: 'PAYROLL_DEPOSIT',
        referenceId: payrollAccount.id,
      },
    })

    const deposit = await tx.payrollAccountDeposits.create({
      data: {
        payrollAccountId: payrollAccount.id,
        businessId,
        amount: contribution,
        depositDate: new Date(eodDate + 'T12:00:00.000Z'), // noon UTC = always same calendar date regardless of timezone
        transactionType: 'EOD_AUTO_CONTRIBUTION',
        autoGeneratedNote:
          `EOD auto-contribution for ${eodDate}. ` +
          `Business share: ${(businessShare * 100).toFixed(1)}% ` +
          `(${businessContractCount}/${totalContracts} employees). ` +
          `Net sales: $${netDailySales.toFixed(2)}. Daily target: $${Math.floor(businessDailyTarget)}.`,
        createdBy: userId,
      },
    })

    await tx.payrollAccounts.update({
      where: { id: payrollAccount.id },
      data: { balance: { increment: contribution } },
    })

    // Real-cash earmark, mirroring the manual "fund payroll from cash box" pattern
    // (payroll/account/fund/route.ts) so this automatic path leaves the same audit trail.
    await tx.cashBucketEntry.create({
      data: {
        businessId,
        entryType: 'PAYROLL_FUNDING',
        direction: 'OUTFLOW',
        amount: contribution,
        referenceType: 'PAYROLL_ACCOUNT',
        referenceId: deposit.id,
        notes: `EOD payroll auto-contribution — ${eodDate}`,
        entryDate: new Date(eodDate + 'T12:00:00.000Z'),
        createdBy: userId,
      },
    })
  })

  return {
    amount: contribution,
    skipped: false,
    reason: `${businessContractCount}/${totalContracts} staff · ${(businessShare * 100).toFixed(0)}% share`,
    targetAmount: contribution,
    payrollBalance: currentBalance,
  }
}
