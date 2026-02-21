import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

interface RouteParams {
  params: Promise<{ periodId: string }>
}

/**
 * GET /api/payroll/periods/[periodId]/zimra
 * Returns (or creates/refreshes) the ZIMRA P2 remittance summary for the period.
 * - On first create: defaults levyRate from the most recent prior period (fallback 0.03)
 * - When manualOverride=false and status=PENDING: auto-sums from captured payslips
 * - When manualOverride=true or status!=PENDING: returns stored figures unchanged
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodId } = await params

    const period = await prisma.payrollPeriods.findUnique({
      where: { id: periodId },
      select: { id: true, businessId: true },
    })
    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    }

    // Get existing record
    const existing = await prisma.payrollZimraRemittances.findUnique({
      where: { payrollPeriodId: periodId },
    })

    // If locked (levy processed, submitted, or manually overridden) — return as-is
    if (existing && (existing.manualOverride || existing.status !== 'PENDING')) {
      return NextResponse.json({
        success: true,
        remittance: toResponse(existing),
        capturedSlips: 0,
      })
    }

    // Sum P2 figures from captured payslips
    const slips = await prisma.payrollSlips.findMany({
      where: {
        payrollPeriodId: periodId,
        status: { in: ['CAPTURED', 'DISTRIBUTED'] },
      },
      select: { totalEarnings: true, payeTax: true, aidsLevy: true },
    })

    const capturedCount = slips.length
    let totalRemuneration = 0, grossPaye = 0, aidsLevy = 0
    for (const r of slips) {
      totalRemuneration += Number(r.totalEarnings || 0)
      grossPaye += Number(r.payeTax || 0)
      aidsLevy += Number(r.aidsLevy || 0)
    }
    const totalTaxDue = grossPaye + aidsLevy

    // Determine levyRate: use existing, or last period's, or default 0.03
    let levyRate = existing ? Number(existing.levyRate) : 0.03
    if (!existing) {
      const lastRemittance = await prisma.payrollZimraRemittances.findFirst({
        where: { payrollPeriodId: { not: periodId } },
        orderBy: { createdAt: 'desc' },
        select: { levyRate: true },
      })
      if (lastRemittance) levyRate = Number(lastRemittance.levyRate)
    }

    // Upsert with latest computed figures
    const remittance = await prisma.payrollZimraRemittances.upsert({
      where: { payrollPeriodId: periodId },
      create: {
        payrollPeriodId: periodId,
        levyRate,
        totalRemuneration,
        employeeCount: capturedCount,
        grossPaye,
        aidsLevy,
        totalTaxDue,
        status: 'PENDING',
      },
      update: {
        totalRemuneration,
        employeeCount: capturedCount,
        grossPaye,
        aidsLevy,
        totalTaxDue,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      remittance: toResponse(remittance),
      capturedSlips: capturedCount,
    })
  } catch (error) {
    console.error('Error fetching ZIMRA remittance:', error)
    return NextResponse.json({ error: 'Failed to fetch ZIMRA remittance' }, { status: 500 })
  }
}

/**
 * PUT /api/payroll/periods/[periodId]/zimra
 * Save levy rate and/or manually overridden P2 figures.
 * Body: { levyRate?: number, grossPaye?: number, aidsLevy?: number, totalRemuneration?: number, employeeCount?: number }
 * Setting grossPaye or aidsLevy sets manualOverride=true.
 * Setting only levyRate does NOT set manualOverride (still auto-recalcs from slips).
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodId } = await params
    const body = await request.json()
    const { levyRate, grossPaye, aidsLevy, totalRemuneration, employeeCount, resetOverride } = body

    const existing = await prisma.payrollZimraRemittances.findUnique({
      where: { payrollPeriodId: periodId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'ZIMRA remittance record not found. Load the summary first.' }, { status: 404 })
    }
    if (existing.status !== 'PENDING') {
      return NextResponse.json({ error: `Cannot edit figures — status is ${existing.status}` }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (levyRate !== undefined) updateData.levyRate = levyRate

    if (resetOverride) {
      // Recalculate from slips — clear manualOverride
      updateData.manualOverride = false
    } else if (grossPaye !== undefined || aidsLevy !== undefined) {
      // Manual figure override
      const newGrossPaye = grossPaye ?? Number(existing.grossPaye)
      const newAidsLevy  = aidsLevy  ?? Number(existing.aidsLevy)
      updateData.grossPaye      = newGrossPaye
      updateData.aidsLevy       = newAidsLevy
      updateData.totalTaxDue    = newGrossPaye + newAidsLevy
      updateData.manualOverride = true
      if (totalRemuneration !== undefined) updateData.totalRemuneration = totalRemuneration
      if (employeeCount     !== undefined) updateData.employeeCount     = employeeCount
    }

    const updated = await prisma.payrollZimraRemittances.update({
      where: { id: existing.id },
      data: updateData,
    })

    return NextResponse.json({ success: true, remittance: toResponse(updated) })
  } catch (error) {
    console.error('Error updating ZIMRA remittance:', error)
    return NextResponse.json({ error: 'Failed to update ZIMRA remittance' }, { status: 500 })
  }
}

function toResponse(r: {
  id: string; status: string; levyRate: unknown; manualOverride: boolean
  totalRemuneration: unknown; employeeCount: number; grossPaye: unknown
  aidsLevy: unknown; totalTaxDue: unknown
  levyProcessedAt: Date | null; levyProcessedBy: string | null
  submittedAt: Date | null; submittedBy: string | null
  paymentReference: string | null; notes: string | null
}) {
  return {
    id: r.id,
    status: r.status,
    levyRate: Number(r.levyRate),
    manualOverride: r.manualOverride,
    totalRemuneration: Number(r.totalRemuneration),
    employeeCount: r.employeeCount,
    grossPaye: Number(r.grossPaye),
    aidsLevy: Number(r.aidsLevy),
    totalTaxDue: Number(r.totalTaxDue),
    levyProcessedAt: r.levyProcessedAt,
    levyProcessedBy: r.levyProcessedBy,
    submittedAt: r.submittedAt,
    submittedBy: r.submittedBy,
    paymentReference: r.paymentReference,
    notes: r.notes,
  }
}
