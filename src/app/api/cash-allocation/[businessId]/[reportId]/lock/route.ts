import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

type Params = { params: Promise<{ businessId: string; reportId: string }> }

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

    const report = await prisma.cashAllocationReport.findUnique({
      where: { id: reportId },
      include: { lineItems: true },
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
    if (report.lineItems.length === 0) {
      return NextResponse.json({ error: 'Cannot lock an empty report' }, { status: 400 })
    }

    // Validate all items are checked with matching amounts
    const mismatches: string[] = []
    for (const item of report.lineItems) {
      if (!item.isChecked) {
        mismatches.push(`"${item.accountName}" is not checked`)
        continue
      }
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

    const lockedReport = await prisma.cashAllocationReport.update({
      where: { id: reportId },
      data: { status: 'LOCKED', lockedAt: new Date(), lockedBy: user.id },
      include: { lineItems: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
    })

    return NextResponse.json({ report: lockedReport, lineItems: lockedReport.lineItems })
  } catch (err) {
    console.error('[POST /api/cash-allocation/lock]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
