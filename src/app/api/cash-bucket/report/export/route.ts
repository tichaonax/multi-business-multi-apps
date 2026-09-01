import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { calculateCashPosition } from '@/lib/cash-position/calculate-cash-position'
import { calculateSetAsideBreakdown } from '@/lib/cash-position/calculate-set-aside-breakdown'

/**
 * GET /api/cash-bucket/report/export
 * MBM-287 §6: Excel export of the Cash Position Report — same filters as
 * the report page itself, unpaginated. Streams the workbook directly
 * (no disk persistence, no export-history record) since this is a report
 * snapshot, not a generated business document.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    const canAccess = permissions.canSubmitPaymentBatch || (permissions as any).canViewCashBucketReport || user.role === 'admin'
    if (!canAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || undefined
    const direction = searchParams.get('direction') || undefined
    const entryTypeParam = searchParams.get('entryType') || undefined
    const entryType = entryTypeParam?.includes(',')
      ? { in: entryTypeParam.split(',').map((t) => t.trim()) }
      : entryTypeParam
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const allTime = searchParams.get('allTime') === 'true'

    const dateFilter: any = {}
    if (!allTime) {
      if (startDate) dateFilter.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        dateFilter.lt = end
      }
    }

    const entryWhere: any = {
      ...(businessId && { businessId }),
      ...(direction && { direction }),
      ...(entryType && { entryType }),
      ...(Object.keys(dateFilter).length > 0 && { entryDate: dateFilter }),
    }

    const entries = await prisma.cashBucketEntry.findMany({
      where: entryWhere,
      include: {
        business: { select: { name: true } },
        creator: { select: { name: true } },
      },
      orderBy: [{ entryDate: 'desc' }, { businessId: 'asc' }],
    })

    let cashPosition: Awaited<ReturnType<typeof calculateCashPosition>> | null = null
    let setAsideBreakdown: Awaited<ReturnType<typeof calculateSetAsideBreakdown>> = []
    if (!allTime) {
      const periodStart = startDate ? new Date(startDate) : (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })()
      const periodEnd = endDate
        ? (() => { const d = new Date(endDate); d.setDate(d.getDate() + 1); return d })()
        : (() => { const d = new Date(periodStart); d.setDate(d.getDate() + 1); return d })()
      cashPosition = await calculateCashPosition({
        businessIds: businessId ? [businessId] : undefined,
        periodStart,
        periodEnd,
      })
      setAsideBreakdown = await calculateSetAsideBreakdown({
        businessIds: businessId ? [businessId] : undefined,
        periodStart,
        periodEnd,
      })
    }

    const round2 = (n: number) => Number(n.toFixed(2))

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Multi-Business Management Platform'
    workbook.created = new Date()

    if (cashPosition) {
      const sheet = workbook.addWorksheet('Cash Position')
      sheet.columns = [
        { header: 'Metric', key: 'metric', width: 28 },
        { header: 'Amount (USD)', key: 'amount', width: 18 },
      ]
      sheet.getRow(1).font = { bold: true }
      const c = cashPosition.combined
      sheet.addRow({ metric: 'Opening Balance', amount: round2(c.openingBalance) })
      sheet.addRow({ metric: 'Cash In', amount: round2(c.cashIn) })
      sheet.addRow({ metric: 'Set Aside', amount: round2(c.setAside) })
      sheet.addRow({ metric: 'Expenses', amount: round2(c.expenses) })
      if (Math.abs(c.adjustments) > 0.009) {
        sheet.addRow({ metric: 'Adjustments', amount: round2(c.adjustments) })
      }
      sheet.addRow({ metric: 'Available Balance', amount: round2(c.availableBalance) })
      sheet.addRow({ metric: 'Closing Balance', amount: round2(c.closingBalance) })
      sheet.getColumn('amount').numFmt = '#,##0.00'
    }

    if (setAsideBreakdown.length > 0) {
      const sheet = workbook.addWorksheet('Set Aside by Purpose')
      sheet.columns = [
        { header: 'Purpose', key: 'purpose', width: 24 },
        { header: 'This Period', key: 'thisPeriod', width: 16 },
        { header: 'Lifetime Contributed', key: 'lifetimeContributed', width: 20 },
        { header: 'Lifetime Disbursed', key: 'lifetimeDisbursed', width: 20 },
        { header: 'Still Available', key: 'stillAvailable', width: 16 },
      ]
      sheet.getRow(1).font = { bold: true }
      for (const row of setAsideBreakdown) {
        sheet.addRow({
          purpose: row.purpose,
          thisPeriod: round2(row.thisPeriod),
          lifetimeContributed: round2(row.lifetimeContributed),
          lifetimeDisbursed: round2(row.lifetimeDisbursed),
          stillAvailable: round2(row.stillAvailable),
        })
      }
      ;['thisPeriod', 'lifetimeContributed', 'lifetimeDisbursed', 'stillAvailable'].forEach((k) => {
        sheet.getColumn(k).numFmt = '#,##0.00'
      })
    }

    const ledgerSheet = workbook.addWorksheet('Ledger')
    ledgerSheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Business', key: 'business', width: 24 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Direction', key: 'direction', width: 12 },
      { header: 'Channel', key: 'channel', width: 12 },
      { header: 'Amount', key: 'amount', width: 14 },
      { header: 'Notes', key: 'notes', width: 32 },
      { header: 'Recorded By', key: 'createdBy', width: 20 },
      { header: 'Deleted', key: 'deleted', width: 10 },
    ]
    ledgerSheet.getRow(1).font = { bold: true }
    for (const e of entries) {
      ledgerSheet.addRow({
        date: e.entryDate.toISOString().split('T')[0],
        business: e.business?.name ?? e.businessId,
        type: e.entryType,
        direction: e.direction,
        channel: e.paymentChannel,
        amount: round2(Number(e.amount)),
        notes: e.notes ?? '',
        createdBy: e.creator?.name ?? '',
        deleted: e.deletedAt ? 'Yes' : 'No',
      })
    }
    ledgerSheet.getColumn('amount').numFmt = '#,##0.00'

    const buffer = await workbook.xlsx.writeBuffer()
    const filename = `cash-position-report-${new Date().toISOString().split('T')[0]}.xlsx`
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting cash position report:', error)
    return NextResponse.json({ error: 'Failed to export report' }, { status: 500 })
  }
}
