import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/payroll/zimra
 * Returns all ZIMRA P2 remittance records across all payroll periods,
 * joined with period metadata (month, year, business).
 */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const remittances = await prisma.payrollZimraRemittances.findMany({
      include: {
        payroll_periods: {
          select: {
            id: true,
            year: true,
            month: true,
            status: true,
            totalEmployees: true,
            businesses: { select: { id: true, name: true } },
          },
        },
        users_levy_processed: { select: { name: true } },
        users_submitted: { select: { name: true } },
      },
      orderBy: [
        { payroll_periods: { year: 'desc' } },
        { payroll_periods: { month: 'desc' } },
      ],
    })

    const data = remittances.map((r) => ({
      id: r.id,
      periodId: r.payrollPeriodId,
      year: r.payroll_periods.year,
      month: r.payroll_periods.month,
      periodStatus: r.payroll_periods.status,
      businessName: r.payroll_periods.businesses?.name || '',
      employeeCount: r.employeeCount,
      totalRemuneration: Number(r.totalRemuneration),
      grossPaye: Number(r.grossPaye),
      aidsLevy: Number(r.aidsLevy),
      totalTaxDue: Number(r.totalTaxDue),
      levyRate: Number(r.levyRate),
      manualOverride: r.manualOverride,
      status: r.status,
      levyProcessedAt: r.levyProcessedAt,
      levyProcessedBy: r.users_levy_processed?.name || null,
      submittedAt: r.submittedAt,
      submittedBy: r.users_submitted?.name || null,
      paymentReference: r.paymentReference,
      notes: r.notes,
    }))

    // Aggregate totals
    const submitted = data.filter((r) => r.status === 'SUBMITTED')
    const pending = data.filter((r) => r.status === 'PENDING')
    const levyProcessed = data.filter((r) => r.status === 'LEVY_PROCESSED')

    const totals = {
      totalGrossPaye: data.reduce((s, r) => s + r.grossPaye, 0),
      totalAidsLevy: data.reduce((s, r) => s + r.aidsLevy, 0),
      totalTaxDue: data.reduce((s, r) => s + r.totalTaxDue, 0),
      submittedTaxDue: submitted.reduce((s, r) => s + r.totalTaxDue, 0),
      pendingCount: pending.length,
      levyProcessedCount: levyProcessed.length,
      submittedCount: submitted.length,
    }

    return NextResponse.json({ success: true, data, totals })
  } catch (error) {
    console.error('Error fetching ZIMRA summary:', error)
    return NextResponse.json({ error: 'Failed to fetch ZIMRA data' }, { status: 500 })
  }
}
