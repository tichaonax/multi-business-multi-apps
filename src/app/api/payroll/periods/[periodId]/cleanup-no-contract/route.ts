import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, getUserRoleInBusiness, hasPermission } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

interface RouteParams {
  params: Promise<{ periodId: string }>
}

// POST /api/payroll/periods/[periodId]/cleanup-no-contract
// Body: { apply?: boolean }  (apply=true will perform deletion; default is dry-run)
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodId } = await params

    const existingPeriod = await prisma.payrollPeriods.findUnique({ where: { id: periodId }, include: { businesses: { select: { id: true } } } })
    if (!existingPeriod) {
      return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 })
    }
    const isAdmin = isSystemAdmin(user)
    const role = getUserRoleInBusiness(user, existingPeriod.businesses?.id)
    if (!(isAdmin || role === 'business-manager' || role === 'business-owner' || hasPermission(user, 'canManagePayroll'))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const apply = Boolean(body && body.apply)

    // Load entries for the period
    const entries = await prisma.payrollEntries.findMany({ where: { payrollPeriodId: periodId }, include: { employees: true } })

    const offenders: { entryId: string; employeeId: string | null; employeeNumber?: string | null; employeeName?: string | null }[] = []

    for (const e of entries) {
      const employeeId = e.employeeId
      // Find any contract for the employee that overlaps the period
      const contract = await prisma.employeeContracts.findFirst({
        where: {
          employeeId,
          startDate: { lte: existingPeriod.endDate },
          AND: [
            {
              OR: [
                { status: 'active' },
                {
                  AND: [
                    { status: 'terminated' },
                    { endDate: { gte: existingPeriod.startDate } }
                  ]
                }
              ]
            }
          ]
        }
      })

      if (!contract) {
        offenders.push({ entryId: e.id, employeeId: e.employeeId || null, employeeNumber: e.employeeNumber || null, employeeName: e.employeeName || null })
      }
    }

    if (offenders.length === 0) {
      return NextResponse.json({ ok: true, message: 'No payroll entries without overlapping contracts found', offenders: [] })
    }

    if (!apply) {
      return NextResponse.json({ ok: true, message: 'Dry-run: no changes made', offenders })
    }

    // Perform deletion (benefits then entries) in a transaction
    const entryIds = offenders.map(o => o.entryId)
    await prisma.$transaction(async (tx) => {
      await tx.payrollEntryBenefits.deleteMany({ where: { payrollEntryId: { in: entryIds } } })
      await tx.payrollEntries.deleteMany({ where: { id: { in: entryIds } } })
    })

    return NextResponse.json({ ok: true, message: `Deleted ${entryIds.length} payroll entries`, deleted: entryIds.length, offenders })
  } catch (error) {
    console.error('Cleanup no-contract endpoint error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Failed to run cleanup', details: message }, { status: 500 })
  }
}
