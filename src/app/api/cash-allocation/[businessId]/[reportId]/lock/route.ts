
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { processRentTransfer } from '@/lib/eod-utils'

type Params = { params: Promise<{ businessId: string; reportId: string }> }

/**
 * Ensures the EOD_RENT_TRANSFER deposit exists and returns the deposit + account info
 * so the caller can upsert a cash allocation line item for it. Delegates to
 * processRentTransfer (eod-utils.ts) — the single source of truth for the real-cash check
 * and atomic earmark — rather than duplicating that logic here.
 * Idempotent: does nothing if deposit already exists.
 */
async function ensureRentTransfer(
  businessId: string,
  reportDate: Date,
  userId: string,
): Promise<{ depositId: string; expenseAccountId: string; accountName: string; amount: number } | null> {
  const config = await prisma.businessRentConfig.findUnique({
    where: { businessId },
    include: { expenseAccount: { select: { id: true, accountName: true } } },
  })
  if (!config || !config.isActive) return null

  const eodDate = `${reportDate.getUTCFullYear()}-${String(reportDate.getUTCMonth() + 1).padStart(2, '0')}-${String(reportDate.getUTCDate()).padStart(2, '0')}`

  try {
    const result = await processRentTransfer(businessId, eodDate, userId, 'Rent transfer confirmed at cash allocation lock')
    return {
      depositId: result.depositId,
      expenseAccountId: config.expenseAccountId,
      accountName: config.expenseAccount.accountName,
      amount: result.amount,
    }
  } catch (err: any) {
    // NO_RENT_CONFIG / RENT_ACCOUNT_INACTIVE / INSUFFICIENT_FUNDS — no rent line item to add
    return null
  }
}

/**
 * POST /api/cash-allocation/[businessId]/[reportId]/lock
 *
 * Locks the report. Pre-conditions:
 * - All line items must be checked (isChecked = true)
 * - All line items must have actualAmount set and matching reportedAmount exactly
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId, reportId } = await params
    const permissions = getEffectivePermissions(user, businessId)

    if (user.role !== 'admin' && !permissions.canRunCashAllocationReport) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    // forceClose = true: skip all deductions, record cash as cashbox inflow only
    const forceClose: boolean = body?.forceClose === true

    const report = await prisma.cashAllocationReport.findUnique({
      where: { id: reportId },
      include: { lineItems: true, groupedRun: true },
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }
    if (report.businessId !== businessId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (report.status === 'LOCKED') {
      return NextResponse.json({ error: 'Report is already locked' }, { status: 409 })
    }

    let skipOutflow = forceClose // if forceClose, skip all outflow entries

    if (!forceClose) {
      // Auto-confirm any rent items that weren't created with isChecked=true (data fix)
      for (const item of report.lineItems) {
        if (item.sourceType === 'EOD_RENT_TRANSFER' && (!item.isChecked || item.actualAmount === null)) {
          await prisma.cashAllocationLineItem.update({
            where: { id: item.id },
            data: { isChecked: true, actualAmount: item.reportedAmount, checkedAt: new Date(), checkedBy: user.id },
          })
        }
      }

      // Validate checked items only — unchecked items are treated as skipped today
      const mismatches: string[] = []
      for (const item of report.lineItems) {
        if (item.sourceType === 'EOD_RENT_TRANSFER') continue
        if (!item.isChecked) continue  // skip unchecked items silently
        if (item.actualAmount === null) {
          mismatches.push(`"${item.accountName}" has no actual amount entered`)
          continue
        }
        const reported = Number(item.reportedAmount)
        const actual = Number(item.actualAmount)
        if (Math.abs(reported - actual) > 0.009) {
          mismatches.push(`"${item.accountName}": reported $${reported.toFixed(2)} ≠ actual $${actual.toFixed(2)}`)
        }
      }

      if (mismatches.length > 0) {
        return NextResponse.json({
          error: 'Cannot lock: validation failed',
          mismatches,
        }, { status: 422 })
      }

      // NOTE: there used to be an overdraft pre-check here that compared allocationTotal
      // against live cash and set skipOutflow=true on a shortfall. That check ran too late
      // to matter: by lock time, processRentTransfer/processAutoDeposits (eod-utils.ts) had
      // already created the actual deposits and credited the destination accounts — so
      // "skipping" here only suppressed a cosmetic CASH_ALLOCATION ledger line, while the
      // real (unfunded) credit stood. That's the bug: accounts reported as funded when the
      // cash never existed.
      //
      // Fixed at the source instead — processRentTransfer/processAutoDeposits/the payroll
      // EOD contribution now gate on real available cash (CashBucketEntry balance + today's
      // counted cash) before ever creating a deposit, and write their own OUTFLOW earmark
      // atomically with it. By the time a line item is confirmed here, its deposit (if any)
      // was only created because funds actually existed at that moment. See the reconciliation
      // safety net below the cash-bucket-entries block for what happens if that invariant is
      // ever violated (e.g. cash withdrawn from the bucket between deposit-time and lock-time).
    }

    // When force-closing, zero out all line item actual amounts (no deductions taken)
    if (forceClose && report.lineItems.length > 0) {
      await prisma.cashAllocationLineItem.updateMany({
        where: { reportId },
        data: { actualAmount: 0, isChecked: false },
      })
    }

    const lockedReport = await prisma.cashAllocationReport.update({
      where: { id: reportId },
      data: { status: 'LOCKED', lockedAt: new Date(), lockedBy: user.id },
      include: { lineItems: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
    })

    // Ensure rent transfer deposit exists and upsert its line item into the report
    // Skip for grouped reports — rent was already transferred per-date during grouped-run execution
    try {
      const rent = report.isGrouped || !report.reportDate
        ? null
        : await ensureRentTransfer(businessId, report.reportDate, user.id)
      if (rent) {
        const alreadyHasRentItem = lockedReport.lineItems.some(
          li => li.sourceType === 'EOD_RENT_TRANSFER'
        )
        if (!alreadyHasRentItem) {
          await prisma.cashAllocationLineItem.create({
            data: {
              reportId,
              expenseAccountId: rent.expenseAccountId,
              accountName: rent.accountName,
              sourceType: 'EOD_RENT_TRANSFER',
              depositId: rent.depositId,
              reportedAmount: rent.amount,
              isChecked: true,
              actualAmount: rent.amount,
              sortOrder: -1, // always first
            },
          })
        }
      }
    } catch (rentErr) {
      console.error('[cash-allocation/lock] Rent transfer/line-item failed (non-fatal):', rentErr)
    }

    // Re-fetch line items so response includes the rent line item
    const finalLineItems = await prisma.cashAllocationLineItem.findMany({
      where: { reportId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    })

    // Record cash bucket entries: INFLOW for EOD cash counted, OUTFLOW per line item allocation
    // Idempotency: skip if entries for this report already exist (prevents duplicates on retry)
    let cashDiscrepancyWarning: string | null = null
    try {
      const alreadyRecorded = await prisma.cashBucketEntry.count({ where: { referenceId: reportId } })
      if (alreadyRecorded > 0) {
        console.warn(`[cash-allocation/lock] Bucket entries already exist for report ${reportId}, skipping`)
        return NextResponse.json({ report: { ...lockedReport, lockerName: user.name }, lineItems: finalLineItems, cashDiscrepancyWarning: null })
      }

      const now = new Date()

      // INFLOW: total cash + EcoCash counted at EOD for this date
      let cashCounted: number | null = null
      let ecocashCounted: number | null = null
      if (!report.isGrouped && report.reportDate) {
        const dayStart = new Date(Date.UTC(report.reportDate.getUTCFullYear(), report.reportDate.getUTCMonth(), report.reportDate.getUTCDate(), 0, 0, 0))
        const dayEnd   = new Date(Date.UTC(report.reportDate.getUTCFullYear(), report.reportDate.getUTCMonth(), report.reportDate.getUTCDate(), 23, 59, 59, 999))
        const eodSaved = await prisma.savedReports.findFirst({
          where: { businessId, reportType: 'END_OF_DAY', reportDate: { gte: dayStart, lte: dayEnd } },
          select: { cashCounted: true, confirmedEcocashAmount: true },
        })
        if (eodSaved?.cashCounted != null) cashCounted = Number(eodSaved.cashCounted)
        if ((eodSaved as any)?.confirmedEcocashAmount != null) ecocashCounted = Number((eodSaved as any).confirmedEcocashAmount)
      } else if (report.isGrouped && report.groupedRun?.totalCashReceived != null) {
        cashCounted = Number(report.groupedRun.totalCashReceived)
        if ((report.groupedRun as any).totalEcocashReceived != null) {
          ecocashCounted = Number((report.groupedRun as any).totalEcocashReceived)
        }
      }

      if (cashCounted != null && cashCounted > 0) {
        await prisma.cashBucketEntry.create({
          data: {
            businessId,
            entryType: 'EOD_RECEIPT',
            direction: 'INFLOW',
            paymentChannel: 'CASH',
            amount: cashCounted,
            referenceType: 'CASH_ALLOCATION',
            referenceId: reportId,
            notes: `EOD cash counted — ${report.reportDate?.toISOString().split('T')[0] ?? 'grouped'}`,
            entryDate: now,
            createdBy: user.id,
          },
        })
      }

      if (ecocashCounted != null && ecocashCounted > 0) {
        await prisma.cashBucketEntry.create({
          data: {
            businessId,
            entryType: 'EOD_RECEIPT',
            direction: 'INFLOW',
            paymentChannel: 'ECOCASH',
            amount: ecocashCounted,
            referenceType: 'CASH_ALLOCATION',
            referenceId: reportId,
            notes: `EOD EcoCash confirmed — ${report.reportDate?.toISOString().split('T')[0] ?? 'grouped'}`,
            entryDate: now,
            createdBy: user.id,
          },
        })
      }

      // OUTFLOW: backfill a ledger entry for any confirmed line item that doesn't already have
      // one. Going forward this is a no-op for every item — processRentTransfer /
      // processAutoDeposits (eod-utils.ts) now write their OUTFLOW earmark atomically with the
      // deposit itself, at creation time. This only fires for legacy items created before that
      // fix shipped (no earmark yet) — never for a shortfall, since skipOutflow is only true on
      // an explicit forceClose now.
      if (!skipOutflow) {
        const confirmedItems = finalLineItems.filter(
          item => item.isChecked || item.sourceType === 'EOD_RENT_TRANSFER'
        )
        for (const item of confirmedItems) {
          const alreadyEarmarked = item.depositId
            ? await prisma.cashBucketEntry.findFirst({
                where: {
                  referenceType: { in: ['EOD_RENT_TRANSFER', 'EOD_AUTO_DEPOSIT'] },
                  referenceId: item.depositId,
                },
                select: { id: true },
              })
            : null
          if (alreadyEarmarked) continue

          await prisma.cashBucketEntry.create({
            data: {
              businessId,
              entryType: 'CASH_ALLOCATION',
              direction: 'OUTFLOW',
              amount: Number(item.reportedAmount),
              referenceType: 'ALLOCATION',
              referenceId: reportId,
              // MBM-287 §2.1 follow-up: no "(legacy backfill)" suffix — this
              // must group with the same account's normal entries in the
              // Set Aside by Purpose table, not fragment into its own row.
              notes: item.accountName,
              entryDate: now,
              createdBy: user.id,
            },
          })
        }
      }

      // Reconciliation safety net: with deposits now gated on real cash at creation time,
      // the bucket should never go negative. If it does — e.g. cash was withdrawn from the
      // bucket by another action between deposit-time and lock-time — surface it clearly
      // instead of silently reporting the lock as fully successful.
      const bucketRowsAfter = await prisma.cashBucketEntry.groupBy({
        by: ['direction'] as any,
        where: { businessId },
        _sum: { amount: true },
      })
      const bucketBalanceAfter =
        Number((bucketRowsAfter as any[]).find(r => r.direction === 'INFLOW')?._sum.amount ?? 0) -
        Number((bucketRowsAfter as any[]).find(r => r.direction === 'OUTFLOW')?._sum.amount ?? 0)
      if (bucketBalanceAfter < -0.01) {
        cashDiscrepancyWarning =
          `Cash bucket balance is negative ($${bucketBalanceAfter.toFixed(2)}) after this lock — ` +
          `more has been allocated out of this business's cash bucket than actual cash on hand. ` +
          `This should not happen with the current funding checks; please review recent cash ` +
          `allocations for this business.`
        console.error(`[cash-allocation/lock] ${cashDiscrepancyWarning} (business ${businessId}, report ${reportId})`)
      }
    } catch (bucketErr) {
      console.error('[cash-allocation/lock] Cash bucket entries failed (non-fatal):', bucketErr)
    }

    return NextResponse.json({
      report: { ...lockedReport, lockerName: user.name },
      lineItems: finalLineItems,
      skippedDeductions: skipOutflow,
      cashDiscrepancyWarning,
    })
  } catch (err) {
    console.error('[POST /api/cash-allocation/lock]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
