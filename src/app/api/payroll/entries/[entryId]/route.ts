import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { Decimal } from '@prisma/client/runtime/library'

interface RouteParams {
  params: Promise<{ entryId: string }>
}

// GET /api/payroll/entries/[entryId]
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { entryId } = await params

    if (!hasPermission(session.user, 'canAccessPayroll')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const entry = await prisma.payrollEntry.findUnique({
      where: { id: entryId },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            fullName: true,
            nationalId: true,
            dateOfBirth: true,
            hireDate: true,
            email: true,
            jobTitles: { select: { title: true } }
          }
        },
        payrollPeriod: {
          select: {
            id: true,
            year: true,
            month: true,
            status: true
          }
        },
        payrollAdjustments: {
          include: {
            creator: {
              select: { id: true, name: true }
            },
            approver: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    if (!entry) {
      return NextResponse.json(
        { error: 'Payroll entry not found' },
        { status: 404 }
      )
    }

    // Calculate derived work days (same logic as period API)
    const helper = await import('@/lib/payroll/helpers')

    // Determine payroll year/month safely (payrollPeriod may be null in some queries)
    const payrollYear = entry.payrollPeriod?.year ?? (entry as any).year
    const payrollMonth = entry.payrollPeriod?.month ?? (entry as any).month
    const monthRequiredWorkDaysSafe = payrollYear && payrollMonth ? helper.getWorkingDaysInMonth(payrollYear, payrollMonth) : 0

    // Check for time tracking data (only query when we have payrollYear/month)
    let timeTracking = null
    if (entry.employee?.id && payrollYear && payrollMonth) {
      timeTracking = await prisma.employeeTimeTracking.findFirst({
        where: {
          employeeId: entry.employee.id,
          year: payrollYear,
          month: payrollMonth
        }
      })
    }

    const derivedWorkDays = (entry.workDays && entry.workDays > 0)
      ? entry.workDays
      : (timeTracking
        ? ((timeTracking.workDays && timeTracking.workDays > 0) ? timeTracking.workDays : monthRequiredWorkDaysSafe)
        : monthRequiredWorkDaysSafe)

    // Get persisted/manual/override benefits via helper
    const mergedPersisted = await helper.computeCombinedBenefitsForEntry(entry)

    // Keep the raw persisted benefits for display in the modal (so deactivated overrides are visible)
    let persistedBenefits: any[] = []
    try {
      persistedBenefits = await prisma.payrollEntryBenefit.findMany({ where: { payrollEntryId: entryId }, include: { benefitType: true }, orderBy: { benefitName: 'asc' } })
    } catch (err) {
      // ignore
    }

    // Fetch contract benefits (most recent contract) and build an effective merged list
    let contract: any = null
    try {
      const empId = entry.employee?.id || (entry as any).employeeId
      if (empId) {
        contract = await prisma.employeeContract.findFirst({ where: { employeeId: empId }, orderBy: { startDate: 'desc' } })
      } else {
        contract = null
      }
    } catch (err) {
      contract = null
    }

    const normalizeName = (s?: string | null) => {
      if (!s) return ''
      try { return String(s).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() } catch (e) { return String(s).trim().replace(/\s+/g, ' ').toLowerCase() }
    }

    const keyFor = (obj: any) => {
      if (!obj) return ''
      if (obj.benefitType && obj.benefitType.id) return String(obj.benefitType.id)
      if (obj.benefitTypeId) return String(obj.benefitTypeId)
      const n = normalizeName(obj.benefitName || obj.name || obj.benefitType?.name || obj.benefitName)
      return n || ''
    }

    const contractBenefits: any[] = []
    if (contract && contract.pdfGenerationData && Array.isArray(contract.pdfGenerationData.benefits)) {
      for (const cb of contract.pdfGenerationData.benefits) {
        const k = keyFor(cb) || `contract-${Math.random().toString(36).slice(2,9)}`
        const id = cb.benefitTypeId || k
        const name = cb.name || cb.benefitType?.name || id
        const amount = Number(cb.amount || 0)
        if (amount === 0) continue
        contractBenefits.push({ key: k, id, benefitTypeId: cb.benefitTypeId || null, benefitName: name, amount, source: 'contract' })
      }
    }

    // Build effective merged list: start from contract benefits, then apply persisted overrides
  const mergedByKey = new Map<string, any>()
    for (const cb of contractBenefits) {
      mergedByKey.set(cb.key, { ...cb, isActive: true })
    }

    for (const pb of persistedBenefits) {
      const k = keyFor(pb) || String(pb.id)
      const name = pb.benefitName || pb.benefitType?.name || `Benefit-${pb.id}`
      const payload = {
        id: pb.id,
        benefitTypeId: pb.benefitTypeId || null,
        benefitName: name,
        amount: Number(pb.amount || 0),
        isActive: pb.isActive !== false,
        deactivatedReason: pb.deactivatedReason || null,
        source: 'manual'
      }
      // Override or add
      mergedByKey.set(k, payload)
    }

    const effectiveMerged = Array.from(mergedByKey.values())

    // Use the helper to compute authoritative totals (it will include persisted benefits and
    // apply the adjustment rule: positive adjustments add to gross, negative adjustments are
    // treated as deductions applied after taxes).
    const totals = await import('@/lib/payroll/helpers').then(m => m.computeTotalsForEntry(entryId))

    // Ensure baseSalary exists on the response. If payroll entry has no baseSalary, prefer
    // the employee's most recent contract baseSalary.
    let resolvedBaseSalary = Number((entry as any).baseSalary || 0)
    if ((!resolvedBaseSalary || resolvedBaseSalary === 0) && contract && contract.baseSalary != null) {
      try { resolvedBaseSalary = Number(contract.baseSalary) } catch (e) { resolvedBaseSalary = resolvedBaseSalary }
    }

    const responseEntry = {
      ...entry,
      workDays: derivedWorkDays,
      payrollEntryBenefits: persistedBenefits,
      mergedBenefits: effectiveMerged,
      benefitsTotal: totals.benefitsTotal ?? 0,
      grossPay: totals.grossPay ?? 0,
      netPay: totals.netPay ?? 0,
      // Ensure baseSalary is present for UI display
      baseSalary: resolvedBaseSalary,
      // Expose the adjustments accounting breakdown for the UI
      adjustmentsTotal: totals.additionsTotal ?? 0,
      adjustmentsAsDeductions: totals.adjustmentsAsDeductions ?? 0,
      // Normalize payroll adjustments for display (isAddition + absolute amount)
      payrollAdjustments: (entry.payrollAdjustments || []).map((a: any) => ({
        ...a,
        // keep UI-friendly absolute amount but expose the original signed DB value as storedAmount
        isAddition: Number(a.amount || 0) >= 0,
        amount: Math.abs(Number(a.amount || 0)),
        storedAmount: Number(a.amount || 0),
        description: a.reason ?? a.description ?? ''
      })),
      // Prefer the employee's DOB from the employee record, fall back to stored payrollEntry value
      dateOfBirth: entry.employee?.dateOfBirth ?? (entry as any).dateOfBirth ?? null,
      hireDate: contract?.startDate ?? (entry as any).hireDate ?? null,
      contract: contract || (entry as any).contract || null
    }

    return NextResponse.json(responseEntry)
  } catch (error) {
    console.error('Payroll entry fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll entry' },
      { status: 500 }
    )
  }
}

// PUT /api/payroll/entries/[entryId]
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { entryId } = await params

    if (!hasPermission(session.user, 'canEditPayrollEntry')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const {
      workDays,
      sickDays,
      leaveDays,
      absenceDays,
      overtimeHours,
      commission,
      notes
    } = data

    // Verify entry exists
    const existingEntry = await prisma.payrollEntry.findUnique({
      where: { id: entryId },
      include: {
        payrollPeriod: true
      }
    })

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Payroll entry not found' },
        { status: 404 }
      )
    }

    // Check if period is editable
    if (existingEntry.payrollPeriod && (existingEntry.payrollPeriod.status === 'closed' || existingEntry.payrollPeriod.status === 'exported')) {
      return NextResponse.json(
        { error: 'Cannot edit entries in closed or exported payroll period' },
        { status: 400 }
      )
    }

    // Update mutable fields first
    const updatedEntry = await prisma.payrollEntry.update({
      where: { id: entryId },
      data: {
        workDays: workDays !== undefined ? workDays : existingEntry.workDays,
        sickDays: sickDays !== undefined ? sickDays : existingEntry.sickDays,
        leaveDays: leaveDays !== undefined ? leaveDays : existingEntry.leaveDays,
        absenceDays: absenceDays !== undefined ? absenceDays : existingEntry.absenceDays,
        overtimeHours: overtimeHours !== undefined ? overtimeHours : existingEntry.overtimeHours,
        commission: commission !== undefined ? commission : existingEntry.commission,
        notes: notes !== undefined ? notes : existingEntry.notes,
        updatedAt: new Date()
      }
    })

    // Recompute totals using helper which accounts for persisted benefits and adjustment handling
    const recomputed = await import('@/lib/payroll/helpers').then(m => m.computeTotalsForEntry(entryId))

    // Persist computed aggregates back to the payroll entry
    const entry = await prisma.payrollEntry.update({
      where: { id: entryId },
      data: {
        grossPay: recomputed.grossPay,
        netPay: recomputed.netPay,
        benefitsTotal: recomputed.benefitsTotal ?? 0,
        // store adjustmentsTotal as additions only (positive adjustments)
        adjustmentsTotal: recomputed.additionsTotal ?? 0,
  totalDeductions: Number(existingEntry.totalDeductions ?? 0) + Number(recomputed.adjustmentsAsDeductions ?? 0),
        updatedAt: new Date()
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            fullName: true,
            nationalId: true
          }
        },
        payrollAdjustments: true
      }
    })

    // Update period totals
    if (existingEntry.payrollPeriodId) await updatePeriodTotals(existingEntry.payrollPeriodId)

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Payroll entry update error:', error)
    return NextResponse.json(
      { error: 'Failed to update payroll entry' },
      { status: 500 }
    )
  }
}

// DELETE /api/payroll/entries/[entryId]
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { entryId } = await params

    if (!hasPermission(session.user, 'canManagePayroll')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify entry exists
    const existingEntry = await prisma.payrollEntry.findUnique({
      where: { id: entryId },
      include: {
        payrollPeriod: true
      }
    })

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Payroll entry not found' },
        { status: 404 }
      )
    }

    // Only allow deletion if period is draft or in_progress
    if (!existingEntry.payrollPeriod || !['draft', 'in_progress'].includes(existingEntry.payrollPeriod.status)) {
      return NextResponse.json(
        { error: 'Cannot delete entries from approved or closed periods' },
        { status: 400 }
      )
    }

    const periodId = existingEntry.payrollPeriodId

    await prisma.payrollEntry.delete({
      where: { id: entryId }
    })

    // Update period totals
    if (periodId) await updatePeriodTotals(periodId)

    return NextResponse.json({ message: 'Payroll entry deleted successfully' })
  } catch (error) {
    console.error('Payroll entry deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete payroll entry' },
      { status: 500 }
    )
  }
}

// Helper function
async function updatePeriodTotals(periodId: string) {
  // Recompute totals per-entry to ensure benefits (persisted + inferred) are included
  const entries = await prisma.payrollEntry.findMany({ where: { payrollPeriodId: periodId }, select: { id: true } })

  let totalGross = 0
  let totalDeductions = 0
  let totalNet = 0

  for (const e of entries) {
    try {
      const totals = await import('@/lib/payroll/helpers').then(m => m.computeTotalsForEntry(e.id))
      totalGross += Number(totals.grossPay || 0)
      totalDeductions += Number((await prisma.payrollEntry.findUnique({ where: { id: e.id } }))?.totalDeductions || 0)
      totalNet += Number(totals.netPay || 0)
    } catch (err) {
      // on any failure, fallback to stored aggregates
      console.warn('Failed to recompute totals for entry', e.id, err)
    }
  }

  // Fallback: if no entries found, set zeros
  await prisma.payrollPeriod.update({
    where: { id: periodId },
    data: {
      totalEmployees: entries.length,
      totalGrossPay: totalGross,
      totalDeductions: totalDeductions,
      totalNetPay: totalNet,
      updatedAt: new Date()
    }
  })
}
