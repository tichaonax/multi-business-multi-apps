import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/cash-allocation/[businessId]/ledger
export async function GET(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const { businessId } = params
    // Get all locked cash allocation reports for this business
    const reports = await prisma.cashAllocationReport.findMany({
      where: { businessId, status: 'LOCKED' },
      include: {
        lineItems: true,
        groupedRun: true,
      },
      orderBy: { createdAt: 'asc' },
    })
    // Build a ledger: deposits (cash received) and debits (allocations)
    const ledger: Array<{ type: 'DEPOSIT' | 'DEBIT', date: string, amount: number, description: string, reportId: string }> = []
    for (const report of reports) {
      // Deposit
      let depositAmount = 0
      let depositDesc = ''
      if (report.isGrouped && report.groupedRun?.totalCashReceived != null) {
        depositAmount = Number(report.groupedRun.totalCashReceived)
        depositDesc = `Grouped Cash Allocation: ${report.groupedRun.managerName || ''}`
      } else if (!report.isGrouped && report.totalReported != null) {
        depositAmount = Number(report.totalReported)
        depositDesc = 'Daily Cash Allocation'
      }
      if (depositAmount > 0) {
        ledger.push({
          type: 'DEPOSIT',
          date: report.createdAt.toISOString(),
          amount: depositAmount,
          description: depositDesc,
          reportId: report.id,
        })
      }
      // Debits (allocations)
      for (const li of report.lineItems) {
        if (li.actualAmount != null && Number(li.actualAmount) > 0) {
          ledger.push({
            type: 'DEBIT',
            date: report.createdAt.toISOString(),
            amount: Number(li.actualAmount),
            description: `Allocated to ${li.accountName}`,
            reportId: report.id,
          })
        }
      }
    }
    // Sort by date ascending
    ledger.sort((a, b) => a.date.localeCompare(b.date))
    return NextResponse.json({ ledger })
  } catch (err) {
    console.error('[GET /api/cash-allocation/[businessId]/ledger]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
