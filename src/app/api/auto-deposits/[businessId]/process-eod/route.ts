import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

type Params = { params: Promise<{ businessId: string }> }

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

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { businessId } = await params
    const permissions = getEffectivePermissions(user, businessId)
    const canProcess =
      user.role === 'admin' ||
      permissions.canMakeExpenseDeposits ||
      permissions.canManageBusinessSettings
    if (!canProcess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { eodDate } = body
    if (!eodDate || !/^\d{4}-\d{2}-\d{2}$/.test(eodDate)) {
      return NextResponse.json(
        { error: 'eodDate is required and must be YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    // Optional user-selected entries (from interactive EOD preview step)
    // When undefined: auto-process all active configs (backward compat)
    // When array: only process entries where skip=false, using user-supplied amounts
    const entries: UserEntry[] | undefined =
      Array.isArray(body.entries) ? (body.entries as UserEntry[]) : undefined
    const entryMap: Map<string, UserEntry> | null =
      entries !== undefined ? new Map(entries.map(e => [e.configId, e])) : null

    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        isActive: true,
        business_accounts: { select: { balance: true } },
      },
    })
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

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
            depositCap: true,
            depositCapReachedAt: true,
          },
        },
      },
    })

    // When entries provided: server-side pre-validation before processing
    if (entries !== undefined) {
      const nonSkipped = entries.filter(e => !e.skip)
      if (nonSkipped.length > 0) {
        const totalRequested = nonSkipped.reduce((sum, e) => sum + e.amount, 0)
        const currentBalance = Number(business.business_accounts?.balance ?? 0)
        if (totalRequested > currentBalance) {
          return NextResponse.json(
            {
              error:
                `Insufficient balance — $${currentBalance.toFixed(2)} available but ` +
                `$${totalRequested.toFixed(2)} requested`,
            },
            { status: 422 }
          )
        }
        // Rent minimum check
        const rentConfig = await prisma.businessRentConfig.findUnique({
          where: { businessId },
          select: { expenseAccountId: true, dailyTransferAmount: true, isActive: true },
        })
        if (rentConfig?.isActive && rentConfig.expenseAccountId) {
          const rentAutoConfig = configs.find(
            (c: { expenseAccountId: string | null }) => c.expenseAccountId === rentConfig.expenseAccountId
          )
          if (rentAutoConfig) {
            const rentEntry = entryMap?.get(rentAutoConfig.id)
            if (rentEntry && !rentEntry.skip) {
              const rentMinimum = Number(rentConfig.dailyTransferAmount)
              if (rentEntry.amount < rentMinimum) {
                return NextResponse.json(
                  {
                    error:
                      `Rent deposit amount $${rentEntry.amount.toFixed(2)} is below the ` +
                      `minimum of $${rentMinimum.toFixed(2)}`,
                  },
                  { status: 422 }
                )
              }
            }
          }
        }
      }
    }

    if (configs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active auto-deposit configs found',
        results: [],
        summary: {
          processed: 0,
          skippedAlreadyDone: 0,
          skippedInsufficientFunds: 0,
          skippedInactiveAccount: 0,
          skippedCapReached: 0,
          skippedFrozen: 0,
          skippedBeforeStart: 0,
          skippedAfterEnd: 0,
          failed: 0,
          totalDeposited: 0,
        },
      })
    }

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

      // 1. Config paused by cap — requires manual reactivation
      if (config.isPausedByCap) {
        results.push({
          ...base,
          status: 'skipped_cap_reached',
          errorMessage: 'Config paused — account deposit cap reached. Requires manual reactivation.',
        })
        continue
      }

      // 2. startDate check
      if (config.startDate && eodDateObj < config.startDate) {
        results.push({
          ...base,
          status: 'skipped_before_start',
          errorMessage: 'Deposits start on ' + config.startDate.toISOString().slice(0, 10),
        })
        continue
      }

      // 3. endDate check
      if (config.endDate && eodDateObj > config.endDate) {
        results.push({
          ...base,
          status: 'skipped_after_end',
          errorMessage: 'Deposit period ended on ' + config.endDate.toISOString().slice(0, 10),
        })
        continue
      }

      // 4. Account freeze check
      if (config.expenseAccount.isAutoDepositFrozen) {
        results.push({
          ...base,
          status: 'skipped_account_frozen',
          errorMessage: 'Target account is frozen for auto-deposits.',
        })
        continue
      }

      // 5. Account inactive check
      if (!config.expenseAccount.isActive) {
        results.push({ ...base, status: 'skipped_inactive_account' })
        continue
      }

      // 5a. User-selected skip (only when entries array was provided)
      if (entryMap !== null) {
        const entry = entryMap.get(config.id)
        if (!entry || entry.skip) {
          results.push({ ...base, status: 'skipped_user_selected' })
          continue
        }
      }

      // 6. Cascade: prior config exhausted funds
      if (insufficientFundsReached) {
        results.push({
          ...base,
          status: 'skipped_insufficient_funds',
          errorMessage: 'Business account balance exhausted by prior config',
        })
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
      const depositCap = config.expenseAccount.depositCap
        ? Number(config.expenseAccount.depositCap)
        : null
      // Use user-supplied amount when entries provided; fall back to configured dailyAmount
      const requestedAmount =
        entryMap !== null ? (entryMap.get(config.id)?.amount ?? dailyAmount) : dailyAmount
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
          // Cap already reached — mark config paused
          await prisma.expenseAccountAutoDeposit.update({
            where: { id: config.id },
            data: { isPausedByCap: true },
          })
          if (!config.expenseAccount.depositCapReachedAt) {
            await prisma.expenseAccounts.update({
              where: { id: config.expenseAccountId },
              data: { depositCapReachedAt: new Date() },
            })
          }
          results.push({
            ...base,
            status: 'skipped_cap_reached',
            errorMessage:
              'Cap of $' + depositCap.toFixed(2) + ' reached (total: $' + totalDeposited.toFixed(2) + ')',
          })
          continue
        }

        if (remaining < requestedAmount) {
          effectiveAmount = remaining
          capNowReached = true
        }
      }

      // 9. Execute deposit transaction
      try {
        let depositId: string | undefined
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const biz = await tx.businessAccounts.findUnique({
            where: { businessId },
            select: { balance: true },
          })
          const currentBalance = Number(biz?.balance ?? 0)
          if (currentBalance < effectiveAmount) {
            throw new Error('INSUFFICIENT_FUNDS:' + currentBalance.toFixed(2))
          }

          const deposit = await tx.expenseAccountDeposits.create({
            data: {
              expenseAccountId: config.expenseAccountId,
              sourceType: 'EOD_AUTO_DEPOSIT',
              sourceBusinessId: businessId,
              amount: effectiveAmount,
              depositDate: eodDateObj,
              autoGeneratedNote: capNowReached
                ? 'EOD auto-deposit (partial — cap) to ' +
                  config.expenseAccount.accountName +
                  ' on ' +
                  eodDate
                : 'EOD auto-deposit to ' + config.expenseAccount.accountName + ' on ' + eodDate,
              createdBy: user.id,
            },
          })
          depositId = deposit.id

          await tx.expenseAccounts.update({
            where: { id: config.expenseAccountId },
            data: { balance: { increment: effectiveAmount }, updatedAt: new Date() },
          })
          await tx.businessAccounts.update({
            where: { businessId },
            data: { balance: { decrement: effectiveAmount } },
          })
          await tx.businessTransactions.create({
            data: {
              businessId,
              type: 'DEBIT',
              amount: -effectiveAmount,
              description: capNowReached
                ? 'EOD auto-deposit (partial/cap) → ' + config.expenseAccount.accountName
                : 'EOD auto-deposit → ' + config.expenseAccount.accountName,
              balanceAfter: currentBalance - effectiveAmount,
              createdBy: user.id,
              referenceType: 'EXPENSE_DEPOSIT',
              referenceId: config.expenseAccountId,
            },
          })
        })

        // After successful transaction: mark cap reached if applicable
        if (capNowReached) {
          await prisma.expenseAccountAutoDeposit.update({
            where: { id: config.id },
            data: { isPausedByCap: true },
          })
          await prisma.expenseAccounts.update({
            where: { id: config.expenseAccountId },
            data: { depositCapReachedAt: new Date() },
          })
        }

        results.push({
          ...base,
          status: 'processed',
          depositId,
          actualDepositAmount: effectiveAmount,
          errorMessage: capNowReached
            ? 'Partial $' + effectiveAmount.toFixed(2) + ' — cap reached. Config paused.'
            : undefined,
        })
      } catch (err: any) {
        if (err?.message?.startsWith('INSUFFICIENT_FUNDS:')) {
          insufficientFundsReached = true
          results.push({
            ...base,
            status: 'skipped_insufficient_funds',
            errorMessage:
              'Available: $' +
              err.message.split(':')[1] +
              ', Required: $' +
              effectiveAmount.toFixed(2),
          })
        } else {
          results.push({ ...base, status: 'failed', errorMessage: err?.message || 'Unknown error' })
          console.error('[EOD auto-deposit] Config ' + config.id + ' failed:', err)
        }
      }
    }

    const summary = {
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

    return NextResponse.json({ success: true, eodDate, results, summary })
  } catch (err) {
    console.error('[POST /api/auto-deposits/process-eod]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
