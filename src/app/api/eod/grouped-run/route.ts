import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { processRentTransfer, processAutoDeposits } from '@/lib/eod-utils'

/**
 * POST /api/eod/grouped-run
 *
 * Core execution endpoint for grouped EOD catch-up (MBM-143).
 * Accepts a manager sign-off with a list of pending dates and a lump-sum
 * cash total. For each date it:
 *   1. Runs rent transfer (non-fatal)
 *   2. Runs auto-deposits (non-fatal)
 *   3. Creates a locked SavedReports record
 *   4. Creates a GroupedEODRunDate record with allocation breakdown
 * Then creates ONE grouped CashAllocationReport (DRAFT) with line items
 * for every deposit made across all dates.
 *
 * Body:
 * {
 *   businessId: string
 *   managerName: string
 *   notes?: string
 *   totalCashReceived: number
 *   dates: { date: string, totalSales: number }[]  // YYYY-MM-DD, oldest first
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, managerName, notes, totalCashReceived, totalEcocashReceived, dates } = body

    // ── Validate input ──────────────────────────────────────────────────────
    if (!businessId || !managerName) {
      return NextResponse.json({ error: 'businessId and managerName are required' }, { status: 400 })
    }
    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: 'dates must be a non-empty array' }, { status: 400 })
    }
    if (typeof totalCashReceived !== 'number' || totalCashReceived < 0) {
      return NextResponse.json({ error: 'totalCashReceived must be a non-negative number' }, { status: 400 })
    }
    const ecocashReceived = typeof totalEcocashReceived === 'number' && totalEcocashReceived > 0 ? totalEcocashReceived : 0
    const dateStrings: string[] = dates.map((d: { date: string }) => d.date)
    const invalidDate = dateStrings.find((d: string) => !/^\d{4}-\d{2}-\d{2}$/.test(d))
    if (invalidDate) {
      return NextResponse.json({ error: `Invalid date format: ${invalidDate}. Use YYYY-MM-DD` }, { status: 400 })
    }

    // ── Auth ────────────────────────────────────────────────────────────────
    const permissions = getEffectivePermissions(user, businessId)
    const canAccess =
      user.role === 'admin' ||
      permissions.canMakeExpenseDeposits ||
      permissions.canManageBusinessSettings
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Verify business ─────────────────────────────────────────────────────
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { id: true, name: true },
    })
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // ── Pre-flight: ensure none of the dates already have a locked EOD report ─
    const alreadyClosed = await prisma.savedReports.findMany({
      where: {
        businessId,
        reportType: 'END_OF_DAY',
        isLocked: true,
        reportDate: { in: dateStrings.map((d: string) => new Date(d)) },
      },
      select: { reportDate: true },
    })
    if (alreadyClosed.length > 0) {
      // Check if ALL locked reports belong to a prior failed grouped run
      // (CashAllocationReport exists but has 0 line items → partial failure, safe to retry)
      const closedReports = await prisma.savedReports.findMany({
        where: {
          businessId,
          reportType: 'END_OF_DAY',
          isLocked: true,
          reportDate: { in: dateStrings.map((d: string) => new Date(d)) },
        },
        select: { id: true, reportDate: true, groupedRunId: true },
      })

      const groupedRunIds = [...new Set(closedReports.map(r => r.groupedRunId).filter(Boolean))] as string[]
      const allFromGroupedRuns = closedReports.every(r => r.groupedRunId != null)

      if (allFromGroupedRuns && groupedRunIds.length > 0) {
        // Find CashAllocationReports for those runs that have no line items (partial failure)
        const failedAllocReports = await prisma.cashAllocationReport.findMany({
          where: { groupedRunId: { in: groupedRunIds }, isGrouped: true },
          include: { _count: { select: { lineItems: true } } },
        })
        const partiallyFailed = failedAllocReports.every(r => r._count.lineItems === 0)

        if (partiallyFailed) {
          // Clean up partial records so the re-run can proceed
          await prisma.cashAllocationReport.deleteMany({ where: { id: { in: failedAllocReports.map(r => r.id) } } })
          await prisma.savedReports.deleteMany({ where: { id: { in: closedReports.map(r => r.id) } } })
          await prisma.groupedEODRunDate.deleteMany({ where: { groupedRunId: { in: groupedRunIds } } })
          await prisma.groupedEODRun.deleteMany({ where: { id: { in: groupedRunIds } } })
          console.log(`[grouped-run] Cleaned up ${groupedRunIds.length} partial failed run(s), retrying…`)
        } else {
          const closed = alreadyClosed.map((r: { reportDate: Date }) => r.reportDate.toISOString().slice(0, 10))
          return NextResponse.json(
            { error: `These dates already have a locked EOD report: ${closed.join(', ')}` },
            { status: 409 }
          )
        }
      } else {
        const closed = alreadyClosed.map((r: { reportDate: Date }) => r.reportDate.toISOString().slice(0, 10))
        return NextResponse.json(
          { error: `These dates already have a locked EOD report: ${closed.join(', ')}` },
          { status: 409 }
        )
      }
    }

    // ── Sort dates oldest → newest ──────────────────────────────────────────
    const sortedDates: { date: string; totalSales: number }[] = [...dates].sort(
      (a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date)
    )

    // ── Create GroupedEODRun ────────────────────────────────────────────────
    const groupedRun = await prisma.groupedEODRun.create({
      data: {
        businessId,
        managerName,
        notes: notes || null,
        totalCashReceived,
        totalEcocashReceived: ecocashReceived > 0 ? ecocashReceived : null,
        runDate: new Date(),
      },
    })

    // ── Process each date ───────────────────────────────────────────────────
    const dateResults: {
      date: string
      totalSales: number
      rentAmount: number
      autoDepositTotal: number
      savedReportId: string
    }[] = []

    for (const entry of sortedDates) {
      const { date, totalSales } = entry
      const dayStart = new Date(date + 'T00:00:00Z')
      const dayEnd = new Date(date + 'T23:59:59.999Z')

      // 1. Rent transfer (non-fatal) — skip entirely if no cash was collected
      let rentAmount = 0
      if (totalCashReceived > 0) {
        try {
          const rentResult = await processRentTransfer(businessId, date, user.id)
          rentAmount = rentResult.amount
        } catch (rentErr: any) {
          // NO_RENT_CONFIG, RENT_ACCOUNT_INACTIVE, INSUFFICIENT_FUNDS — all acceptable
          console.warn(`[grouped-run] Rent transfer skipped for ${date}:`, rentErr.message)
        }
      }

      // 2. Auto-deposits (non-fatal per config) — skip entirely if no cash was collected
      let autoDepositTotal = 0
      if (totalCashReceived > 0) {
        try {
          const { summary } = await processAutoDeposits(businessId, date, user.id)
          autoDepositTotal = summary.totalDeposited
        } catch (autoErr: any) {
          console.warn(`[grouped-run] Auto-deposits failed for ${date}:`, autoErr.message)
        }
      }

      // 3. Query all deposits made for this date (for allocationBreakdown)
      const depositsForDate = await prisma.expenseAccountDeposits.findMany({
        where: {
          sourceBusinessId: businessId,
          sourceType: { in: ['EOD_RENT_TRANSFER', 'EOD_AUTO_DEPOSIT'] },
          depositDate: { gte: dayStart, lte: dayEnd },
        },
        include: { expenseAccount: { select: { accountName: true } } },
      })

      const allocationBreakdown = depositsForDate.reduce(
        (acc: Record<string, number>, dep: { sourceType: string; expenseAccount: { accountName: string }; amount: { toString(): string } }) => {
          const key = dep.expenseAccount.accountName
          acc[key] = (acc[key] ?? 0) + Number(dep.amount)
          return acc
        },
        {} as Record<string, number>
      )

      // 4. Create locked SavedReports for this date
      const savedReport = await prisma.savedReports.create({
        data: {
          businessId,
          reportType: 'END_OF_DAY',
          reportDate: new Date(date + 'T00:00:00.000Z'),
          periodStart: dayStart,
          periodEnd: dayEnd,
          reportData: {
            type: 'GROUPED_EOD_CATCHUP',
            groupedRunId: groupedRun.id,
            date,
            summary: { totalSales, totalOrders: 0, receiptsIssued: 0 },
          },
          managerName,
          managerUserId: user.id,
          signedAt: new Date(),
          totalSales,
          totalOrders: 0,
          receiptsIssued: 0,
          createdBy: user.id,
          isLocked: true,
          groupedRunId: groupedRun.id,
        },
      })

      // 5. Create GroupedEODRunDate record
      await prisma.groupedEODRunDate.create({
        data: {
          groupedRunId: groupedRun.id,
          date,
          totalSales,
          cashCounted: 0,            // individual cash tracked at grouped report level
          allocationBreakdown,
        },
      })

      dateResults.push({ date, totalSales, rentAmount, autoDepositTotal, savedReportId: savedReport.id })
    }

    // ── Create grouped CashAllocationReport ────────────────────────────────
    const cashAllocReport = await prisma.cashAllocationReport.create({
      data: {
        businessId,
        reportDate: null,            // null = grouped (spans multiple dates)
        isGrouped: true,
        groupedRunId: groupedRun.id,
        status: 'DRAFT',
        createdBy: user.id,
      },
    })

    // ── Add line items for every deposit across all selected dates ──────────
    // Query per exact date to avoid picking up deposits from days in between
    // that were not part of this catch-up run.
    const allDeposits = await prisma.expenseAccountDeposits.findMany({
      where: {
        sourceBusinessId: businessId,
        sourceType: { in: ['EOD_RENT_TRANSFER', 'EOD_AUTO_DEPOSIT'] },
        OR: sortedDates.map(d => ({
          depositDate: {
            gte: new Date(d.date + 'T00:00:00Z'),
            lte: new Date(d.date + 'T23:59:59.999Z'),
          },
        })),
      },
      include: { expenseAccount: { select: { id: true, accountName: true } } },
      orderBy: [{ sourceType: 'desc' }, { depositDate: 'asc' }],
    })

    if (allDeposits.length > 0) {
      // Deduplicate by deposit ID (idempotent processAutoDeposits may return existing records)
      const uniqueDeposits = [...new Map(allDeposits.map((d: typeof allDeposits[number]) => [d.id, d])).values()]

      // Filter out deposits that already have a CashAllocationLineItem (orphaned from prior partial run)
      const existingLinks = await prisma.cashAllocationLineItem.findMany({
        where: { depositId: { in: uniqueDeposits.map((d: typeof allDeposits[number]) => d.id) } },
        select: { depositId: true },
      })
      const linkedDepositIds = new Set(existingLinks.map((l: { depositId: string | null }) => l.depositId))
      const depositsToInsert = uniqueDeposits.filter((d: typeof allDeposits[number]) => !linkedDepositIds.has(d.id))

      if (existingLinks.length > 0) {
        console.warn(`[grouped-run] Skipping ${existingLinks.length} deposit(s) already linked to a CashAllocationLineItem`)
      }

      if (depositsToInsert.length > 0) {
        await prisma.cashAllocationLineItem.createMany({
          skipDuplicates: true,
          data: depositsToInsert.map((dep: typeof allDeposits[number], idx: number) => {
            const isRent = dep.sourceType === 'EOD_RENT_TRANSFER'
            return {
              reportId: cashAllocReport.id,
              expenseAccountId: dep.expenseAccountId,
              accountName: dep.expenseAccount.accountName,
              sourceType: dep.sourceType,
              depositId: dep.id,
              reportedAmount: dep.amount,
              isChecked: isRent,
              actualAmount: isRent ? dep.amount : null,
              sortOrder: idx,
            }
          }),
        })
      }
    }

    return NextResponse.json({
      success: true,
      groupedRunId: groupedRun.id,
      cashAllocationReportId: cashAllocReport.id,
      datesProcessed: dateResults.length,
      summary: {
        totalSales: dateResults.reduce((s, d) => s + d.totalSales, 0),
        totalRentTransferred: dateResults.reduce((s, d) => s + d.rentAmount, 0),
        totalAutoDeposited: dateResults.reduce((s, d) => s + d.autoDepositTotal, 0),
        lineItemCount: allDeposits.length,
      },
      dates: dateResults,
    })
  } catch (err) {
    console.error('[POST /api/eod/grouped-run]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
