import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

type Params = { params: Promise<{ businessId: string }> }

/**
 * POST /api/cash-allocation/[businessId]/generate
 * Body: { date: "YYYY-MM-DD" }
 *
 * Idempotent: finds or creates the report, then upserts line items
 * for any EOD deposits on that date that are not yet in the report.
 * Never removes existing line items or resets checkbox state.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    const permissions = getEffectivePermissions(user, businessId)

    if (user.role !== 'admin' && !permissions.canRunCashAllocationReport) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { date } = body

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date is required (YYYY-MM-DD)' }, { status: 400 })
    }

    const reportDate = new Date(date)
    const dayStart = new Date(date + 'T00:00:00.000Z')
    const dayEnd = new Date(date + 'T23:59:59.999Z')

    // Find all EOD deposits for this business on this date
    const deposits = await prisma.expenseAccountDeposits.findMany({
      where: {
        sourceBusinessId: businessId,
        sourceType: { in: ['EOD_RENT_TRANSFER', 'EOD_AUTO_DEPOSIT'] },
        depositDate: { gte: dayStart, lte: dayEnd },
      },
      include: {
        expenseAccount: { select: { id: true, accountName: true } },
      },
      orderBy: [{ sourceType: 'asc' }, { depositDate: 'asc' }],
    })

    // Find or create the report
    let report = await prisma.cashAllocationReport.findUnique({
      where: { businessId_reportDate: { businessId, reportDate } },
    })

    if (!report) {
      report = await prisma.cashAllocationReport.create({
        data: {
          businessId,
          reportDate,
          status: deposits.length > 0 ? 'IN_PROGRESS' : 'DRAFT',
          createdBy: user.id,
        },
      })
    } else if (report.status === 'LOCKED') {
      // Locked reports cannot be regenerated
      const lineItems = await prisma.cashAllocationLineItem.findMany({
        where: { reportId: report.id },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      })
      return NextResponse.json({
        report,
        lineItems,
        allChecked: true,
        message: 'Report is locked and cannot be modified',
      })
    }

    // Upsert line items for deposits not yet tracked
    const existingDepositIds = new Set(
      (await prisma.cashAllocationLineItem.findMany({
        where: { reportId: report.id },
        select: { depositId: true },
      })).map(li => li.depositId)
    )

    const toCreate = deposits
      .filter(d => !existingDepositIds.has(d.id))
      .map((d, idx) => ({
        reportId: report!.id,
        expenseAccountId: d.expenseAccountId,
        accountName: d.expenseAccount.accountName,
        sourceType: d.sourceType,
        depositId: d.id,
        reportedAmount: d.amount,
        sortOrder: existingDepositIds.size + idx,
      }))

    if (toCreate.length > 0) {
      await prisma.cashAllocationLineItem.createMany({ data: toCreate })
    }

    // Advance status to IN_PROGRESS if still DRAFT and we now have items
    if (report.status === 'DRAFT' && (toCreate.length > 0 || existingDepositIds.size > 0)) {
      report = await prisma.cashAllocationReport.update({
        where: { id: report.id },
        data: { status: 'IN_PROGRESS' },
      })
    }

    // Return fresh data
    const lineItems = await prisma.cashAllocationLineItem.findMany({
      where: { reportId: report.id },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    })

    const allChecked = lineItems.length > 0 &&
      lineItems.every(item => item.isChecked && item.actualAmount !== null)

    return NextResponse.json({ report, lineItems, allChecked, newItemsAdded: toCreate.length })
  } catch (err) {
    console.error('[POST /api/cash-allocation/generate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
