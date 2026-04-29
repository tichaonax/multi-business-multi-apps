/**
 * eod-utils.ts
 * Shared business logic for EOD (End-of-Day) processing.
 * Used by both the standard single-day EOD routes and the grouped EOD catch-up (MBM-143).
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserEntry {
  configId: string
  amount: number
  skip: boolean
}

export interface AutoDepositResult {
  configId: string
  expenseAccountId: string
  accountName: string
  accountNumber: string
  dailyAmount: number
  actualDepositAmount?: number
  status:
    | 'processed'
    | 'skipped_already_done'
    | 'skipped_insufficient_funds'
    | 'skipped_inactive_account'
    | 'skipped_cap_reached'
    | 'skipped_account_frozen'
    | 'skipped_before_start'
    | 'skipped_after_end'
    | 'skipped_user_selected'
    | 'failed'
  depositId?: string
  errorMessage?: string
}

export interface AutoDepositSummary {
  processed: number
  skippedAlreadyDone: number
  skippedInsufficientFunds: number
  skippedInactiveAccount: number
  skippedCapReached: number
  skippedFrozen: number
  skippedBeforeStart: number
  skippedAfterEnd: number
  skippedUserSelected: number
  failed: number
  totalDeposited: number
}

export interface RentTransferResult {
  alreadyTransferred: boolean
  depositId: string
  amount: number
}

// ─── autoGenerateCashAllocationReport ────────────────────────────────────────

/**
 * Finds or creates a CashAllocationReport for the given EOD date and upserts
 * deposit line items. Safe to call multiple times (idempotent).
 */
export async function autoGenerateCashAllocationReport(
  businessId: string,
  eodDate: string,
  userId: string,
) {
  const reportDate = new Date(eodDate)
  const dayStart = new Date(eodDate + 'T00:00:00Z')
  const dayEnd = new Date(eodDate + 'T23:59:59.999Z')

  const deposits = await prisma.expenseAccountDeposits.findMany({
    where: {
      sourceBusinessId: businessId,
      sourceType: { in: ['EOD_RENT_TRANSFER', 'EOD_AUTO_DEPOSIT'] },
      depositDate: { gte: dayStart, lte: dayEnd },
    },
    include: { expenseAccount: { select: { id: true, accountName: true } } },
    orderBy: [{ sourceType: 'desc' }, { depositDate: 'asc' }],
  })
  if (deposits.length === 0) return

  let report = await prisma.cashAllocationReport.findFirst({
    where: { businessId, reportDate },
  })
  if (!report) {
    report = await prisma.cashAllocationReport.create({
      data: { businessId, reportDate, status: 'IN_PROGRESS', createdBy: userId },
    })
  }
  if (report.status === 'LOCKED') return

  const existing = await prisma.cashAllocationLineItem.findMany({
    where: { reportId: report.id },
    select: { depositId: true },
  })
  const existingIds = new Set(existing.map((li: { depositId: string }) => li.depositId))
  const toCreate = deposits
    .filter((d: { id: string }) => !existingIds.has(d.id))
    .map((d: typeof deposits[number], idx: number) => {
      const isRent = d.sourceType === 'EOD_RENT_TRANSFER'
      return {
        reportId: report!.id,
        expenseAccountId: d.expenseAccountId,
        accountName: d.expenseAccount.accountName,
        sourceType: d.sourceType,
        depositId: d.id,
        reportedAmount: d.amount,
        isChecked: isRent,
        actualAmount: isRent ? d.amount : null,
        sortOrder: existing.length + idx,
      }
    })
  if (toCreate.length > 0) {
    await prisma.cashAllocationLineItem.createMany({ data: toCreate })
  }
}

// ─── processRentTransfer ─────────────────────────────────────────────────────

/**
 * Executes the EOD rent transfer for a given business and date.
 * Idempotent: returns the existing deposit if one already exists for the date.
 * Throws if no rent config found, rent account inactive, or insufficient funds.
 */
export async function processRentTransfer(
  businessId: string,
  eodDate: string,      // YYYY-MM-DD
  userId: string,
  note?: string,
): Promise<RentTransferResult> {
  const config = await prisma.businessRentConfig.findUnique({
    where: { businessId },
    include: { expenseAccount: { select: { id: true, balance: true } } },
  })
  if (!config) throw new Error('NO_RENT_CONFIG')
  if (!config.isActive) throw new Error('RENT_ACCOUNT_INACTIVE')

  const depositDate = new Date(eodDate)
  const dayStart = new Date(eodDate + 'T00:00:00Z')
  const dayEnd = new Date(eodDate + 'T23:59:59.999Z')

  // Idempotency check
  const existing = await prisma.expenseAccountDeposits.findFirst({
    where: {
      expenseAccountId: config.expenseAccountId,
      sourceType: 'EOD_RENT_TRANSFER',
      depositDate: { gte: dayStart, lte: dayEnd },
    },
  })
  if (existing) {
    return { alreadyTransferred: true, depositId: existing.id, amount: Number(existing.amount) }
  }

  const transferAmount = Math.ceil(Number(config.dailyTransferAmount))
  if (transferAmount <= 0) throw new Error('NO_RENT_CONFIG')

  let depositId = ''

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const bizAcct = await tx.businessAccounts.findUnique({
      where: { businessId },
      select: { balance: true },
    })
    const currentBalance = Number(bizAcct?.balance ?? 0)
    if (currentBalance < transferAmount) throw new Error('INSUFFICIENT_FUNDS:' + currentBalance.toFixed(2))

    const deposit = await tx.expenseAccountDeposits.create({
      data: {
        expenseAccountId: config.expenseAccountId,
        sourceType: 'EOD_RENT_TRANSFER',
        sourceBusinessId: businessId,
        amount: transferAmount,
        depositDate: dayStart,
        autoGeneratedNote: note ?? `EOD rent transfer for ${eodDate}`,
        createdBy: userId,
      },
    })
    depositId = deposit.id

    await tx.expenseAccounts.update({
      where: { id: config.expenseAccountId },
      data: { balance: { increment: transferAmount }, updatedAt: new Date() },
    })
    await tx.businessAccounts.update({
      where: { businessId },
      data: { balance: { decrement: transferAmount } },
    })
    await tx.businessTransactions.create({
      data: {
        businessId,
        type: 'DEBIT',
        amount: -transferAmount,
        description: `EOD rent transfer for ${eodDate}`,
        balanceAfter: currentBalance - transferAmount,
        createdBy: userId,
        referenceType: 'RENT_TRANSFER',
        referenceId: config.expenseAccountId,
      },
    })
  })

  return { alreadyTransferred: false, depositId, amount: transferAmount }
}

// ─── processAutoDeposits ─────────────────────────────────────────────────────

/**
 * Executes all active auto-deposit configs for a given business and date.
 * Optionally accepts user-selected entries (amounts / skips from the EOD preview).
 * Idempotent per config per date.
 */
export async function processAutoDeposits(
  businessId: string,
  eodDate: string,   // YYYY-MM-DD
  userId: string,
  entries?: UserEntry[],
): Promise<{ results: AutoDepositResult[]; summary: AutoDepositSummary }> {
  const entryMap: Map<string, UserEntry> | null =
    entries !== undefined ? new Map(entries.map(e => [e.configId, e])) : null

  const eodDateObj = new Date(eodDate + 'T00:00:00Z')
  const dayStart = new Date(eodDate + 'T00:00:00Z')
  const dayEnd = new Date(eodDate + 'T23:59:59.999Z')

  const configs = await prisma.expenseAccountAutoDeposit.findMany({
    where: { businessId, isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      expenseAccount: {
        select: {
          id: true,
          accountName: true,
          accountNumber: true,
          balance: true,
          isActive: true,
          isAutoDepositFrozen: true,
          isLoanAccount: true,
          depositCap: true,
          depositCapReachedAt: true,
        },
      },
    },
  })

  const results: AutoDepositResult[] = []
  let insufficientFundsReached = false

  for (const config of configs) {
    const dailyAmount = Number(config.dailyAmount)
    const base = {
      configId: config.id,
      expenseAccountId: config.expenseAccountId,
      accountName: config.expenseAccount.accountName,
      accountNumber: config.expenseAccount.accountNumber,
      dailyAmount,
    }

    // 1. Config paused by cap
    if (config.isPausedByCap) {
      results.push({
        ...base,
        status: 'skipped_cap_reached',
        errorMessage: 'Config paused — account deposit cap reached. Requires manual reactivation.',
      })
      continue
    }

    // 1a. Loan account already at $0
    if (config.expenseAccount.isLoanAccount) {
      const currentBalance = Number(config.expenseAccount.balance)
      if (currentBalance >= 0) {
        await prisma.expenseAccountAutoDeposit.update({
          where: { id: config.id },
          data: { isPausedByCap: true },
        })
        await prisma.businessLoan.updateMany({
          where: { expenseAccountId: config.expenseAccountId, status: 'LOCKED' },
          data: { status: 'SETTLED', settledAt: new Date() },
        })
        results.push({ ...base, status: 'skipped_cap_reached', errorMessage: 'Loan fully repaid — config frozen.' })
        continue
      }
    }

    // 2. startDate check
    if (config.startDate && eodDateObj < config.startDate) {
      results.push({ ...base, status: 'skipped_before_start', errorMessage: 'Deposits start on ' + config.startDate.toISOString().slice(0, 10) })
      continue
    }

    // 3. endDate check
    if (config.endDate && eodDateObj > config.endDate) {
      results.push({ ...base, status: 'skipped_after_end', errorMessage: 'Deposit period ended on ' + config.endDate.toISOString().slice(0, 10) })
      continue
    }

    // 4. Account freeze check
    if (config.expenseAccount.isAutoDepositFrozen) {
      results.push({ ...base, status: 'skipped_account_frozen', errorMessage: 'Target account is frozen for auto-deposits.' })
      continue
    }

    // 5. Account inactive check
    if (!config.expenseAccount.isActive) {
      results.push({ ...base, status: 'skipped_inactive_account' })
      continue
    }

    // 5a. User-selected skip
    if (entryMap !== null) {
      const entry = entryMap.get(config.id)
      if (!entry || entry.skip) {
        results.push({ ...base, status: 'skipped_user_selected' })
        continue
      }
    }

    // 6. Cascade: prior config exhausted funds
    if (insufficientFundsReached) {
      results.push({ ...base, status: 'skipped_insufficient_funds', errorMessage: 'Business account balance exhausted by prior config' })
      continue
    }

    // 7. Idempotency check
    const existingDeposit = await prisma.expenseAccountDeposits.findFirst({
      where: {
        expenseAccountId: config.expenseAccountId,
        sourceType: 'EOD_AUTO_DEPOSIT',
        sourceBusinessId: businessId,
        depositDate: { gte: dayStart, lte: dayEnd },
      },
    })
    if (existingDeposit) {
      results.push({ ...base, status: 'skipped_already_done', depositId: existingDeposit.id })
      continue
    }

    // 8. Cap aggregate check
    const depositCap = config.expenseAccount.depositCap ? Number(config.expenseAccount.depositCap) : null
    const requestedAmount = entryMap !== null ? (entryMap.get(config.id)?.amount ?? dailyAmount) : dailyAmount
    let effectiveAmount = requestedAmount
    let capNowReached = false

    if (depositCap !== null) {
      const { _sum } = await prisma.expenseAccountDeposits.aggregate({
        where: { expenseAccountId: config.expenseAccountId },
        _sum: { amount: true },
      })
      const totalDeposited = Number(_sum.amount ?? 0)
      const remaining = depositCap - totalDeposited

      if (remaining <= 0) {
        await prisma.expenseAccountAutoDeposit.update({ where: { id: config.id }, data: { isPausedByCap: true } })
        if (!config.expenseAccount.depositCapReachedAt) {
          await prisma.expenseAccounts.update({ where: { id: config.expenseAccountId }, data: { depositCapReachedAt: new Date() } })
        }
        results.push({ ...base, status: 'skipped_cap_reached', errorMessage: 'Cap of $' + depositCap.toFixed(2) + ' reached (total: $' + totalDeposited.toFixed(2) + ')' })
        continue
      }

      if (remaining < requestedAmount) {
        effectiveAmount = remaining
        capNowReached = true
      }
    }

    // 8a. Loan account: cap to abs(balance)
    if (config.expenseAccount.isLoanAccount) {
      const currentBalance = Number(config.expenseAccount.balance)
      const maxAllowed = Math.abs(currentBalance)
      if (effectiveAmount > maxAllowed) effectiveAmount = maxAllowed
    }

    // 9. Execute deposit transaction
    try {
      let depositId: string | undefined
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const biz = await tx.businessAccounts.findUnique({ where: { businessId }, select: { balance: true } })
        const currentBalance = Number(biz?.balance ?? 0)
        if (currentBalance < effectiveAmount) throw new Error('INSUFFICIENT_FUNDS:' + currentBalance.toFixed(2))

        const deposit = await tx.expenseAccountDeposits.create({
          data: {
            expenseAccountId: config.expenseAccountId,
            sourceType: 'EOD_AUTO_DEPOSIT',
            sourceBusinessId: businessId,
            amount: effectiveAmount,
            depositDate: eodDateObj,
            autoGeneratedNote: capNowReached
              ? 'EOD auto-deposit (partial — cap) to ' + config.expenseAccount.accountName + ' on ' + eodDate
              : 'EOD auto-deposit to ' + config.expenseAccount.accountName + ' on ' + eodDate,
            createdBy: userId,
          },
        })
        depositId = deposit.id

        await tx.expenseAccounts.update({ where: { id: config.expenseAccountId }, data: { balance: { increment: effectiveAmount }, updatedAt: new Date() } })
        await tx.businessAccounts.update({ where: { businessId }, data: { balance: { decrement: effectiveAmount } } })
        await tx.businessTransactions.create({
          data: {
            businessId,
            type: 'DEBIT',
            amount: -effectiveAmount,
            description: capNowReached
              ? 'EOD auto-deposit (partial/cap) → ' + config.expenseAccount.accountName
              : 'EOD auto-deposit → ' + config.expenseAccount.accountName,
            balanceAfter: currentBalance - effectiveAmount,
            createdBy: userId,
            referenceType: 'EXPENSE_DEPOSIT',
            referenceId: config.expenseAccountId,
          },
        })
      })

      if (capNowReached) {
        await prisma.expenseAccountAutoDeposit.update({ where: { id: config.id }, data: { isPausedByCap: true } })
        await prisma.expenseAccounts.update({ where: { id: config.expenseAccountId }, data: { depositCapReachedAt: new Date() } })
      }

      if (config.expenseAccount.isLoanAccount) {
        const newBalance = Number(config.expenseAccount.balance) + effectiveAmount
        if (newBalance >= 0) {
          await prisma.expenseAccountAutoDeposit.update({ where: { id: config.id }, data: { isPausedByCap: true } })
          await prisma.businessLoan.updateMany({
            where: { expenseAccountId: config.expenseAccountId, status: 'LOCKED' },
            data: { status: 'SETTLED', settledAt: new Date() },
          })
        }
      }

      results.push({
        ...base,
        status: 'processed',
        depositId,
        actualDepositAmount: effectiveAmount,
        errorMessage: capNowReached ? 'Partial $' + effectiveAmount.toFixed(2) + ' — cap reached. Config paused.' : undefined,
      })
    } catch (err: any) {
      if (err?.message?.startsWith('INSUFFICIENT_FUNDS:')) {
        insufficientFundsReached = true
        results.push({
          ...base,
          status: 'skipped_insufficient_funds',
          errorMessage: 'Available: $' + err.message.split(':')[1] + ', Required: $' + effectiveAmount.toFixed(2),
        })
      } else {
        results.push({ ...base, status: 'failed', errorMessage: err?.message || 'Unknown error' })
        console.error('[EOD auto-deposit] Config ' + config.id + ' failed:', err)
      }
    }
  }

  const summary: AutoDepositSummary = {
    processed: results.filter(r => r.status === 'processed').length,
    skippedAlreadyDone: results.filter(r => r.status === 'skipped_already_done').length,
    skippedInsufficientFunds: results.filter(r => r.status === 'skipped_insufficient_funds').length,
    skippedInactiveAccount: results.filter(r => r.status === 'skipped_inactive_account').length,
    skippedCapReached: results.filter(r => r.status === 'skipped_cap_reached').length,
    skippedFrozen: results.filter(r => r.status === 'skipped_account_frozen').length,
    skippedBeforeStart: results.filter(r => r.status === 'skipped_before_start').length,
    skippedAfterEnd: results.filter(r => r.status === 'skipped_after_end').length,
    skippedUserSelected: results.filter(r => r.status === 'skipped_user_selected').length,
    failed: results.filter(r => r.status === 'failed').length,
    totalDeposited: results
      .filter(r => r.status === 'processed')
      .reduce((sum, r) => sum + (r.actualDepositAmount ?? r.dailyAmount), 0),
  }

  return { results, summary }
}
