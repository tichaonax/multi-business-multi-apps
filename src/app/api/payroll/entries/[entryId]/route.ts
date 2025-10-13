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

    const entry = await prisma.payrollEntries.findUnique({
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
            status: true,
            businesses: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        payrollAdjustments: {
          include: {
            users_payroll_periods_createdByTousers: {
              select: { id: true, name: true }
            },
            users_payroll_periods_approvedByTousers: {
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
      persistedBenefits = await prisma.payrollEntryBenefits.findMany({ where: { payrollEntryId: entryId }, include: { benefitType: true }, orderBy: { benefitName: 'asc' } })
    } catch (err) {
      // ignore
    }

    // Fetch contract benefits (most recent contract) and build an effective merged list
    let contract: any = null
    try {
      const empId = entry.employee?.id || (entry as any).employeeId
      if (empId) {
        contract = await prisma.employeeContracts.findFirst({ where: { employeeId: empId }, orderBy: { startDate: 'desc' } })
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
        const k = keyFor(cb) || `contract-${Math.random().toString(36).slice(2, 9)}`
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

    // Ensure we expose any persisted absenceFraction even when the generated Prisma client
    // may be stale and not include the field. Try to read from the `entry` object first,
    // otherwise fall back to a direct DB select.
    let persistedAbsenceFraction: number | null = null
    try {
      const v = (entry as any).absenceFraction
      if (v !== undefined && v !== null) persistedAbsenceFraction = Number(v)
    } catch (e) {
      // ignore
    }
    if (persistedAbsenceFraction === null) {
      try {
        // Try a deterministic select that aliases the DB column as `absenceFraction`.
        // Use COALESCE to ensure a numeric value when column exists.
        const rows: any = await prisma.$queryRaw`SELECT COALESCE(absence_fraction, 0) AS "absenceFraction" FROM payroll_entries WHERE id = ${entryId}`
        if (Array.isArray(rows) && rows.length > 0 && rows[0] && rows[0].absenceFraction !== undefined && rows[0].absenceFraction !== null) {
          try { persistedAbsenceFraction = Number(rows[0].absenceFraction) } catch (e) { persistedAbsenceFraction = Number(String(rows[0].absenceFraction || 0)) }
        }
      } catch (e) {
        // If raw select fails (e.g., column missing or DB doesn't match), try the more generic probe as a fallback
        try {
          const rows2: any = await prisma.$queryRaw`SELECT * FROM payroll_entries WHERE id = ${entryId}`
          if (Array.isArray(rows2) && rows2.length > 0 && rows2[0]) {
            const row = rows2[0]
            const candidates = ['absenceFraction', 'absence_fraction', 'absencefraction']
            for (const c of candidates) {
              if (Object.prototype.hasOwnProperty.call(row, c) && row[c] !== undefined && row[c] !== null) {
                try { persistedAbsenceFraction = Number(row[c]) } catch (errConv) { persistedAbsenceFraction = Number(String(row[c] || 0)) }
                break
              }
            }
          }
        } catch (e2) {
          console.warn('Raw SELECT for absenceFraction failed (both attempts)', { entryId, err: e, err2: e2 })
          persistedAbsenceFraction = null
        }
      }
    }

    const responseEntry = {
      ...entry,
      workDays: derivedWorkDays,
      payrollEntryBenefits: persistedBenefits,
      mergedBenefits: effectiveMerged,
      benefitsTotal: totals.benefitsTotal ?? 0,
      grossPay: totals.grossPay ?? 0,
      netPay: totals.netPay ?? 0,
      // Expose any absence deduction derived from adjustments (e.g. absence payrollAdjustment)
      absenceDeduction: Number(totals.absenceDeduction ?? 0),
      // Expose persisted fractional absence if available (null when not present).
      absenceFraction: persistedAbsenceFraction !== null ? persistedAbsenceFraction : 0,
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

    // Debugging: log what absenceFraction we will return so it's easy to trace in server logs
    try {
      console.debug('GET /api/payroll/entries/[entryId] - returning absenceFraction', { entryId, absenceFraction: persistedAbsenceFraction })
    } catch (e) { /* ignore logging errors */ }

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
      absenceFraction,
      overtimeHours,
      standardOvertimeHours,
      doubleTimeOvertimeHours,
      commission,
      miscDeductions,
      notes
    } = data

    // Verify entry exists
    const existingEntry = await prisma.payrollEntries.findUnique({
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

    // Update mutable fields first (exclude `absenceFraction` from the typed update because
    // the generated Prisma client may be stale until `prisma generate` runs locally).
    const updateData: any = {
      workDays: workDays !== undefined ? workDays : existingEntry.workDays,
      sickDays: sickDays !== undefined ? sickDays : existingEntry.sickDays,
      leaveDays: leaveDays !== undefined ? leaveDays : existingEntry.leaveDays,
      absenceDays: absenceDays !== undefined ? absenceDays : existingEntry.absenceDays,
      overtimeHours: overtimeHours !== undefined ? overtimeHours : existingEntry.overtimeHours,
      standardOvertimeHours: standardOvertimeHours !== undefined ? standardOvertimeHours : existingEntry.standardOvertimeHours,
      doubleTimeOvertimeHours: doubleTimeOvertimeHours !== undefined ? doubleTimeOvertimeHours : existingEntry.doubleTimeOvertimeHours,
      commission: commission !== undefined ? commission : existingEntry.commission,
      miscDeductions: miscDeductions !== undefined ? miscDeductions : existingEntry.miscDeductions,
      notes: notes !== undefined ? notes : existingEntry.notes,
      updatedAt: new Date()
    }

    const updatedEntry = await prisma.payrollEntries.update({ where: { id: entryId }, data: updateData })

    // Persist absenceFraction via a parameterized raw query when provided. This avoids relying
    // on a generated Prisma client that may not yet include the new field.
    if (absenceFraction !== undefined) {
      // Try updating both camelCase and snake_case column names to be robust across DB column naming.
      const dec = new Decimal(absenceFraction)
      let updated = false
      try {
        try {
          await prisma.$executeRaw`UPDATE payroll_entries SET "absenceFraction" = ${dec} WHERE id = ${entryId}`
          updated = true
        } catch (errCamel) {
          // Try snake_case variant
          try {
            await prisma.$executeRaw`UPDATE payroll_entries SET absence_fraction = ${dec} WHERE id = ${entryId}`
            updated = true
          } catch (errSnake) {
            console.error('Failed to persist absenceFraction (both camelCase and snake_case attempts):', { entryId, errCamel, errSnake })
          }
        }
      } catch (err) {
        console.error('Unexpected error while persisting absenceFraction:', err)
      }
      if (!updated) {
        // Log a friendly message suggesting migration may be required
        console.warn('absenceFraction column not found or update failed. Ensure DB migration was applied and Prisma client regenerated.')
      }
    }

    // Recompute totals using helper which accounts for persisted benefits and adjustment handling
    const recomputed = await import('@/lib/payroll/helpers').then(m => m.computeTotalsForEntry(entryId))

    // Persist computed aggregates back to the payroll entry
    const entry = await prisma.payrollEntries.update({
      where: { id: entryId },
      data: {
        grossPay: recomputed.grossPay,
        netPay: recomputed.netPay,
        benefitsTotal: recomputed.benefitsTotal ?? 0,
        overtimePay: recomputed.overtimePay ?? 0,
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
        payrollAdjustments: true,
        payrollPeriod: {
          select: {
            year: true,
            month: true
          }
        }
      }
    })

    // Compute cumulative sick/leave/absence days from time tracking
    let cumulativeSickDays = Number(entry.sickDays || 0)
    let cumulativeLeaveDays = Number(entry.leaveDays || 0)
    let cumulativeAbsenceDays = Number(entry.absenceDays || 0)

    if (entry.employee?.id && entry.payrollPeriod) {
      try {
        const timeTracking = await prisma.employeeTimeTracking.findFirst({
          where: {
            employeeId: entry.employee.id,
            year: entry.payrollPeriod.year,
            month: entry.payrollPeriod.month
          }
        })

        if (timeTracking) {
          cumulativeSickDays = Number(timeTracking.sickDays || 0)
          cumulativeLeaveDays = Number(timeTracking.leaveDays || 0)
          cumulativeAbsenceDays = Number(timeTracking.absenceDays || 0)
        }
      } catch (err) {
        console.warn('Failed to fetch time tracking for cumulative days:', err)
      }
    }

    // Attach recomputed absenceDeduction and cumulative days to the returned entry
    const returnedEntry = {
      ...(entry as any),
      absenceDeduction: Number(recomputed.absenceDeduction ?? 0),
      cumulativeSickDays,
      cumulativeLeaveDays,
      cumulativeAbsenceDays
    }

    // Update period totals
    if (existingEntry.payrollPeriodId) await updatePeriodTotals(existingEntry.payrollPeriodId)

    return NextResponse.json(returnedEntry)
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
    const existingEntry = await prisma.payrollEntries.findUnique({
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

    await prisma.payrollEntries.delete({
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
  const entries = await prisma.payrollEntries.findMany({ where: { payrollPeriodId: periodId }, select: { id: true } })

  let totalGross = 0
  let totalDeductions = 0
  let totalNet = 0

  for (const e of entries) {
    try {
      const totals = await import('@/lib/payroll/helpers').then(m => m.computeTotalsForEntry(e.id))
      totalGross += Number(totals.grossPay || 0)
      totalDeductions += Number((await prisma.payrollEntries.findUnique({ where: { id: e.id } }))?.totalDeductions || 0)
      totalNet += Number(totals.netPay || 0)
    } catch (err) {
      // on any failure, fallback to stored aggregates
      console.warn('Failed to recompute totals for entry', e.id, err)
    }
  }

  // Fallback: if no entries found, set zeros
  await prisma.payrollPeriods.update({
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
