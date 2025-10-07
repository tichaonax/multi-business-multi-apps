import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkingDaysInMonth, computeTotalsForEntry } from '@/lib/payroll/helpers'
import { hasPermission } from '@/lib/permission-utils'
import { isSystemAdmin, getUserRoleInBusiness } from '@/lib/permission-utils'

interface RouteParams {
  params: Promise<{ periodId: string }>
}


// GET /api/payroll/periods/[periodId] - Get period details
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodId } = await params

    if (!hasPermission(session.user, 'canAccessPayroll')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const period = await prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      include: {
        business: {
          select: { id: true, name: true, type: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        },
        approver: {
          select: { id: true, name: true, email: true }
        },
        payrollEntries: {
          include: {
            employee: {
              select: {
                id: true,
                employeeNumber: true,
                firstName: true,
                lastName: true,
                fullName: true,
                nationalId: true,
                dateOfBirth: true,
                hireDate: true,
                email: true,
                jobTitles: { select: { title: true } },
                primaryBusinessId: true
              }
            }
          },
          orderBy: { employeeName: 'asc' }
        },
        _count: {
          select: { payrollEntries: true }
        }
      }
    })

    if (!period) {
      return NextResponse.json(
        { error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    // TEMPORARY LOGGING: For each payroll entry, log whether the employee has an overlapping contract for this period
    try {
      const periodStart = period.periodStart instanceof Date ? period.periodStart : new Date(period.periodStart)
      const periodEnd = period.periodEnd instanceof Date ? period.periodEnd : new Date(period.periodEnd)
      for (const entry of period.payrollEntries || []) {
        const employeeId = entry.employeeId
        const employeeNumber = entry.employee?.employeeNumber || entry.employeeNumber || null
        // Find any contract for the employee that overlaps the period
        const contract = await prisma.employeeContract.findFirst({
          where: {
            employeeId,
            startDate: { lte: periodEnd },
            AND: [
              {
                OR: [
                  { status: 'active' },
                  {
                    AND: [
                      { status: 'terminated' },
                      { endDate: { gte: periodStart } }
                    ]
                  }
                ]
              }
            ]
          }
        })
        if (contract) {
          console.info(`[payroll-period-diagnostics] entryId=${entry.id} employeeId=${employeeId} employeeNumber=${employeeNumber} HAS overlapping contract id=${contract.id}`)
        } else {
          console.warn(`[payroll-period-diagnostics] entryId=${entry.id} employeeId=${employeeId} employeeNumber=${employeeNumber} NO overlapping contract for period ${period.id}`)
        }
      }
    } catch (logErr) {
      console.error('Temporary payroll period diagnostics logging failed:', logErr)
    }

    // If we have entries, load their benefits separately (avoid nested include mismatches)
    if (period && period.payrollEntries && period.payrollEntries.length > 0) {
      const entryIds = period.payrollEntries.map(e => e.id)
      let benefits: any[] = []
      let benefitLoadError: string | undefined

      try {
        // Load all persisted payroll entry benefits (including inactive overrides).
        // We used to restrict to active benefits here which caused `payrollEntryBenefits`
        // to be empty while `mergedBenefits` (computed later) included inactive/manual overrides.
        // Returning all persisted benefits keeps the API consistent for the client.
        benefits = await prisma.payrollEntryBenefit.findMany({
          where: { payrollEntryId: { in: entryIds } },
          include: { benefitType: { select: { id: true, name: true, type: true, defaultAmount: true } } }
        })
      } catch (err) {
        console.warn('Failed to load payroll entry benefits:', err)
        const message = err instanceof Error ? err.message : String(err)
        benefitLoadError = message
      }

      // attach benefits to their entries (if any)
      const benefitsByEntry: Record<string, any[]> = {}
      for (const b of benefits) {
        if (!benefitsByEntry[b.payrollEntryId]) benefitsByEntry[b.payrollEntryId] = []
        benefitsByEntry[b.payrollEntryId].push(b)
      }

      // Load payroll adjustments for entries so the period API can return the same
      // normalized adjustments shape as the single-entry endpoint. This prevents
      // inconsistencies where the UI shows different signs for adjustments.
      let adjustments: any[] = []
      try {
        adjustments = await prisma.payrollAdjustment.findMany({
          where: { payrollEntryId: { in: entryIds } }
        })
      } catch (err) {
        console.warn('Failed to load payroll adjustments for period entries:', err)
      }

      const adjustmentsByEntry: Record<string, any[]> = {}
      for (const a of adjustments) {
        if (!adjustmentsByEntry[a.payrollEntryId]) adjustmentsByEntry[a.payrollEntryId] = []
        adjustmentsByEntry[a.payrollEntryId].push(a)
      }

      let enrichedEntries: any[] = period.payrollEntries.map(entry => ({
        ...entry,
        payrollEntryBenefits: benefitsByEntry[entry.id] || [],
        employeeFirstName: (entry as any).employee?.firstName || null,
        employeeLastName: (entry as any).employee?.lastName || null,
        employeeFullName: (entry as any).employee?.fullName || (entry as any).employeeName || null,
        employeeDateOfBirth: (entry as any).employee?.dateOfBirth || (entry as any).dateOfBirth || null,
        employeeHireDate: (entry as any).employee?.hireDate || (entry as any).hireDate || null
      }))

      // Merge contract-level benefits with payroll-entry-level benefits for every entry.
      // Fetch latest contracts for all employees in this period so we can combine benefits.
      try {
        const employeeIds = Array.from(new Set(enrichedEntries.map(e => e.employeeId).filter((id): id is string => !!id)))
        const contracts = await prisma.employeeContract.findMany({
          where: { employeeId: { in: employeeIds } },
          orderBy: { startDate: 'desc' },
          include: {
            contract_benefits: { include: { benefitType: { select: { id: true, name: true, type: true, defaultAmount: true } } } }
          }
        })

        const latestContractByEmployee: Record<string, any> = {}
        for (const c of contracts) {
          if (!latestContractByEmployee[c.employeeId]) latestContractByEmployee[c.employeeId] = c
        }

        // Load employee time tracking for this payroll's month/year so we can derive workDays when missing
        const timeTrackings = await prisma.employeeTimeTracking.findMany({
          where: {
            employeeId: { in: employeeIds },
            year: period.year,
            month: period.month
          }
        })

        const timeTrackingByEmployee: Record<string, any> = {}
        for (const t of timeTrackings) {
          timeTrackingByEmployee[t.employeeId] = t
        }

        // Determine the expected/required work days for the payroll month
        const monthRequiredWorkDays = getWorkingDaysInMonth(period.year, period.month)

        // Compute cumulative totals (sick/leave/absence) from prior payroll entries for each employee
        let priorPeriodIds: string[] = []
        if (period.periodStart) {
          const priorPeriods = await prisma.payrollPeriod.findMany({
            where: {
              businessId: period.businessId,
              periodStart: { lt: period.periodStart }
            },
            select: { id: true }
          })
          priorPeriodIds = priorPeriods.map(p => p.id)
        }

        let cumulativeByEmployee: Record<string, any> = {}
        if (priorPeriodIds.length > 0) {
          const grouped = await prisma.payrollEntry.groupBy({
            by: ['employeeId'],
            where: { payrollPeriodId: { in: priorPeriodIds } },
            _sum: { sickDays: true, leaveDays: true, absenceDays: true }
          })

          for (const g of grouped) {
            if (!g.employeeId) continue
            cumulativeByEmployee[g.employeeId] = {
              cumulativeSickDays: Number(g._sum.sickDays ?? 0),
              cumulativeLeaveDays: Number(g._sum.leaveDays ?? 0),
              cumulativeAbsenceDays: Number(g._sum.absenceDays ?? 0)
            }
          }
        }

  enrichedEntries = await Promise.all(enrichedEntries.map(async entry => {
          const entryBenefits = entry.payrollEntryBenefits || []
          const empId = entry.employeeId
          const contract = empId ? latestContractByEmployee[empId] : null

          // Use helper to compute persisted/manual totals
          const totals = await computeTotalsForEntry(entry.id)
          const persistedCombined = totals.combined || []

          // Build contract-derived benefits (from pdfGenerationData) and apply persisted overrides
          const contractBenefits: any[] = []
          if (contract && contract.pdfGenerationData && Array.isArray(contract.pdfGenerationData.benefits)) {
            for (const cb of contract.pdfGenerationData.benefits) {
              const amount = Number(cb.amount || 0)
              if (!amount || amount === 0) continue
              contractBenefits.push({
                benefitTypeId: cb.benefitTypeId || null,
                benefitName: cb.name || cb.benefitType?.name || '',
                amount,
                source: 'contract'
              })
            }
          }

          // Merge: start with contract benefits, then apply persisted overrides (persisted wins)
          const normalize = (s?: string | null) => {
            if (!s) return ''
            try { return String(s).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() } catch (e) { return String(s).trim().replace(/\s+/g, ' ').toLowerCase() }
          }

          const mergedByKey = new Map<string, any>()
          const keyFor = (x: any) => String(x.benefitTypeId || normalize(x.benefitName || x.name || ''))

          for (const cb of contractBenefits) {
            const k = keyFor(cb)
            mergedByKey.set(k, { ...cb, isActive: true })
          }

          // Apply persisted overrides
          for (const pb of entryBenefits) {
            const k = keyFor(pb)
            mergedByKey.set(k, {
              id: pb.id,
              benefitTypeId: pb.benefitTypeId || null,
              benefitName: pb.benefitName || pb.benefitType?.name || '',
              amount: Number(pb.amount || 0),
              isActive: pb.isActive !== false,
              source: 'manual'
            })
          }

          const mergedBenefits = Array.from(mergedByKey.values())
          const totalBenefitsAmount = mergedBenefits.filter(b => b.isActive !== false).reduce((s, b) => s + Number(b.amount || 0), 0)


          // If workDays is not provided or zero, try to fall back to employee time tracking for the period
          const timeTracking = empId ? timeTrackingByEmployee[empId] : null
          // If explicit entry.workDays is provided and > 0 use it. Otherwise prefer time-tracking >0.
          // If time-tracking exists but shows zero (no time taken) assume full required days for the month.
          const derivedWorkDays = (entry.workDays && entry.workDays > 0)
            ? entry.workDays
            : (timeTracking
              ? ((timeTracking.workDays && timeTracking.workDays > 0) ? timeTracking.workDays : monthRequiredWorkDays)
              : monthRequiredWorkDays)

          const cumulative = empId ? (cumulativeByEmployee[empId] || { cumulativeSickDays: 0, cumulativeLeaveDays: 0, cumulativeAbsenceDays: 0 }) : { cumulativeSickDays: 0, cumulativeLeaveDays: 0, cumulativeAbsenceDays: 0 }

          // Non-destructive display fallbacks: use employee.dateOfBirth or contract-derived DOB
          let displayDob = (entry as any).employee?.dateOfBirth || (entry as any).dateOfBirth || null
          // Attempt to extract dateOfBirth from contract.pdfGenerationData if present
          if ((!displayDob || displayDob === null) && contract && contract.pdfGenerationData) {
            const pdf = contract.pdfGenerationData
            displayDob = pdf.employeeDateOfBirth || pdf.employeeDob || pdf.dateOfBirth || pdf.employeeBirthDate || pdf.birthDate || displayDob || null
          }

          // Base salary display fallback: prefer stored entry.baseSalary, then contract.baseSalary, then pdfGenerationData.basicSalary
          let displayBaseSalary = Number((entry as any).baseSalary ?? 0)
          if ((!displayBaseSalary || displayBaseSalary === 0) && contract) {
            try {
              if (contract.baseSalary != null) {
                displayBaseSalary = typeof contract.baseSalary.toNumber === 'function' ? contract.baseSalary.toNumber() : Number(contract.baseSalary)
              } else if (contract.pdfGenerationData && contract.pdfGenerationData.basicSalary) {
                displayBaseSalary = Number(contract.pdfGenerationData.basicSalary || 0)
              }
            } catch (e) {
              displayBaseSalary = Number(contract.baseSalary || 0)
            }
          }

          // Attach normalized payrollAdjustments for each entry (if present)
          let payrollAdjustmentsForEntry: any[] | undefined = undefined
          try {
            const rawList = adjustmentsByEntry[entry.id] || []
            if (Array.isArray(rawList) && rawList.length > 0) {
              const deductionTypes = new Set(['penalty', 'loan', 'loan_payment', 'loan payment', 'advance', 'advance_payment', 'advance payment', 'loanpayment'])
              payrollAdjustmentsForEntry = rawList.map((a: any) => {
                const signed = Number(a.amount || 0)
                const rawType = String(a.adjustmentType || a.type || '').toLowerCase()
                const isDeductionType = deductionTypes.has(rawType)
                return {
                  id: a.id,
                  payrollEntryId: a.payrollEntryId,
                  // UI-facing absolute amount
                  amount: Math.abs(Number(signed || 0)),
                  // expose original DB-signed value for consumers that need it
                  storedAmount: Number(signed || 0),
                  isAddition: isDeductionType ? false : (Number(signed) >= 0),
                  type: a.adjustmentType ?? a.type,
                  description: a.reason ?? a.description ?? '',
                  createdAt: a.createdAt
                }
              })
            }
          } catch (err) {
            // ignore adjustments attach errors
          }

          // Mutate returned object for API consumers (non-persistent): set entry-level DOB/baseSalary
          // Also compute adjustmentsTotal and adjustmentsAsDeductions from payrollAdjustments
          // to avoid stale aggregated fields causing UI inconsistencies.
            let adjustmentsTotalForReturn = Number((entry as any).adjustmentsTotal || 0)
          let adjustmentsAsDeductionsForReturn = Number((entry as any).adjustmentsAsDeductions || 0)
          try {
            if (Array.isArray(payrollAdjustmentsForEntry) && payrollAdjustmentsForEntry.length > 0) {
              const derivedAdditions = payrollAdjustmentsForEntry.reduce((s: number, a: any) => {
                const amt = Number((a.storedAmount !== undefined && a.storedAmount !== null) ? a.storedAmount : (a.amount ?? 0))
                return s + (a.isAddition ? Math.abs(amt) : 0)
              }, 0)
              // Exclude 'absence' type from deductions so it's shown separately and not double-counted
              const derivedDeductions = payrollAdjustmentsForEntry.reduce((s: number, a: any) => {
                const rawType = String((a.type || '')).toLowerCase()
                if (rawType === 'absence') return s
                const amt = Number((a.storedAmount !== undefined && a.storedAmount !== null) ? a.storedAmount : (a.amount ?? 0))
                return s + (!a.isAddition ? Math.abs(amt) : 0)
              }, 0)
              adjustmentsTotalForReturn = derivedAdditions
              adjustmentsAsDeductionsForReturn = derivedDeductions
            }
          } catch (err) {
            // ignore
          }

          // Compute a safe totalDeductions to return to UI: prefer a derived breakdown-based
          // total (advances + loans + misc + adjustmentsAsDeductions) when it differs from
          // the stored entry.totalDeductions. This prevents stale/incorrect negative totals
          // from the DB leaking into the summary/table UI.
          const advances = Number(entry.advanceDeductions || 0)
          const loans = Number(entry.loanDeductions || 0)
          const misc = Number(entry.miscDeductions || 0)
          const derivedTotalDeductions = advances + loans + misc + adjustmentsAsDeductionsForReturn
          const serverTotalDeductions = Number(entry.totalDeductions || 0)
          const totalDeductionsForReturn = serverTotalDeductions !== derivedTotalDeductions ? derivedTotalDeductions : serverTotalDeductions

            const returnedEntry = {
            ...entry,
            payrollEntryBenefits: entryBenefits,
            payrollAdjustments: payrollAdjustmentsForEntry,
            adjustmentsTotal: adjustmentsTotalForReturn,
            adjustmentsAsDeductions: adjustmentsAsDeductionsForReturn,
            // Normalize totalDeductions exposed to clients to avoid showing negative/stale DB values
            totalDeductions: totalDeductionsForReturn,
            contract: contract || null,
            mergedBenefits,
            totalBenefitsAmount,
            workDays: derivedWorkDays,
              // Include current entry's day counts into the returned cumulative totals so UI sees non-zero values
              cumulativeSickDays: Number(cumulative.cumulativeSickDays || 0) + Number(entry.sickDays || 0),
              cumulativeLeaveDays: Number(cumulative.cumulativeLeaveDays || 0) + Number(entry.leaveDays || 0),
              cumulativeAbsenceDays: Number(cumulative.cumulativeAbsenceDays || 0) + Number(entry.absenceDays || 0),
            grossPay: Number(totals.grossPay ?? Number(entry.grossPay || 0)),
            // Expose any absence deduction computed from adjustments
            absenceDeduction: Number(totals.absenceDeduction ?? 0),
            // Recompute netPay based on the gross we are returning and the normalized totalDeductions
            netPay: (Number(totals.grossPay ?? Number(entry.grossPay || 0)) - totalDeductionsForReturn),
            // Presentational fields only - do not write these back to DB here
            displayBaseSalary,
            displayDateOfBirth: displayDob,
            primaryBusiness: (entry as any).employee?.primaryBusiness || null
          }

          // Overwrite entry.dateOfBirth and nested employee.dateOfBirth if missing and we have a fallback
          if (!returnedEntry.dateOfBirth && displayDob) {
            try {
              returnedEntry.dateOfBirth = displayDob
            } catch (err) {
              // ignore
            }
          }

          if (returnedEntry.employee && !returnedEntry.employee.dateOfBirth && displayDob) {
            try {
              returnedEntry.employee.dateOfBirth = displayDob
            } catch (err) {
              // ignore
            }
          }

          // Overwrite entry.baseSalary for display when missing/zero
          if ((!returnedEntry.baseSalary || Number(returnedEntry.baseSalary) === 0) && displayBaseSalary) {
            try {
              returnedEntry.baseSalary = displayBaseSalary
            } catch (err) {
              // ignore
            }
          }

          return returnedEntry
        })) as any
      } catch (contractErr) {
        console.warn('Failed to load/merge contract benefits:', contractErr)
      }

      // Fetch businesses for employee.primaryBusinessId and attach to enriched entries
  const employeePrimaryBusinessIds = Array.from(new Set(enrichedEntries.map((e: any) => (e.employee?.primaryBusinessId) || null).filter(Boolean))) as string[]
  const empBusinesses = employeePrimaryBusinessIds.length > 0 ? await prisma.business.findMany({ where: { id: { in: employeePrimaryBusinessIds } }, select: { id: true, name: true, type: true } }) : []
      const empBusinessById: Record<string, any> = {}
      for (const b of empBusinesses) empBusinessById[b.id] = b

      for (const ee of enrichedEntries) {
        try {
          const pbId = ee.employee?.primaryBusinessId
          ee.primaryBusiness = pbId ? empBusinessById[pbId] || null : (ee.primaryBusiness || null)
        } catch (err) {
          // ignore
        }
      }

      // Ensure primaryBusiness.shortName is consistently available server-side
      const computeShortName = (name?: string) => {
        if (!name) return undefined
        const parts = String(name).split(/\s+/).filter(Boolean)
        if (parts.length === 1) return parts[0].slice(0, 4).toUpperCase()
        const acronym = parts.map(p => p[0]).join('').slice(0, 4).toUpperCase()
        return acronym
      }

      for (const e of enrichedEntries) {
        try {
          if ((e as any).primaryBusiness && !((e as any).primaryBusiness as any).shortName) {
            ;(((e as any).primaryBusiness) as any).shortName = computeShortName((((e as any).primaryBusiness) as any).name)
          }
          if ((e as any).employee?.primaryBusiness && !((e as any).employee.primaryBusiness as any).shortName) {
            ((e as any).employee.primaryBusiness as any).shortName = computeShortName((e as any).employee.primaryBusiness.name)
          }
        } catch (err) {
          // non-fatal
        }
      }

      // Build server-side visible benefit columns by scanning mergedBenefits of each entry
      const normalizeName = (s?: string | null) => {
        if (!s) return ''
        try {
          return String(s).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
        } catch (e) {
          return String(s).trim().replace(/\s+/g, ' ').toLowerCase()
        }
      }

      const visibleMap = new Map<string, { benefitTypeId: string | null, benefitName: string }>()
      for (const e of enrichedEntries) {
        const merged: any[] = e.mergedBenefits || []
        for (const mb of merged) {
          if (!mb) continue
          // Skip inactive merged items
          if (mb.isActive === false) continue
          const name = mb.benefitName || mb.benefitType?.name || ''
          // Prefer benefitTypeId as the stable key when available; fallback to normalized name
          const key = mb.benefitTypeId ? String(mb.benefitTypeId) : normalizeName(name)
          if (!key) continue
          if (!visibleMap.has(key)) {
            visibleMap.set(key, { benefitTypeId: mb.benefitTypeId || null, benefitName: name })
          }
        }
      }

      const visibleBenefitColumns = Array.from(visibleMap.values()).sort((a, b) => (a.benefitName || '').localeCompare(b.benefitName || ''))

      // Recompute period-level aggregates from the enriched entries to avoid
      // returning stale or entry-specific totals that may have been stored on
      // the period row. This ensures the list/summary view reflects the same
      // numbers shown on each entry returned in `payrollEntries`.
      const summed = (enrichedEntries || []).reduce((acc: any, e: any) => {
        acc.gross += Number(e.grossPay || 0)
        acc.deductions += Number(e.totalDeductions || 0)
        acc.net += Number(e.netPay || 0)
        return acc
      }, { gross: 0, deductions: 0, net: 0 })

      const result: any = {
        ...period,
        // prefer runtime-computed employee count since we may have filtered/merged
        totalEmployees: (enrichedEntries || []).length,
        // keep the original shape (strings in some responses) by casting to string
        totalGrossPay: String(summed.gross),
        totalDeductions: String(summed.deductions),
        totalNetPay: String(summed.net),
        payrollEntries: enrichedEntries as any,
        visibleBenefitColumns
      }
      if (benefitLoadError) {
        const hint = /does not exist/.test(benefitLoadError)
          ? 'Payroll benefits table/column missing. Run prisma migrations or check your DB schema.'
          : undefined
        result.benefitLoadError = benefitLoadError
        if (hint) result.hint = hint
      }

      return NextResponse.json(result)
    }

    return NextResponse.json(period)
  } catch (error) {
    console.error('Payroll period fetch error:', error)
    const message = error instanceof Error ? error.message : String(error)
    const hint = /does not exist/.test(message)
      ? 'Database schema mismatch detected. Did you run prisma migrations?'
      : undefined
    return NextResponse.json(
      { error: 'Failed to fetch payroll period', details: message, hint },
      { status: 500 }
    )
  }
}

// PUT /api/payroll/periods/[periodId] - Update period
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodId } = await params

    if (!hasPermission(session.user, 'canManagePayroll')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const { status, notes } = data

    // Verify period exists
    const existingPeriod = await prisma.payrollPeriod.findUnique({
      where: { id: periodId }
    })

    if (!existingPeriod) {
      return NextResponse.json(
        { error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    // Status transition validation
    const validStatuses = ['draft', 'in_progress', 'review', 'approved', 'exported', 'closed']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    }

    if (status) {
      updateData.status = status

      // Update timestamps based on status
      if (status === 'approved' && !existingPeriod.approvedAt) {
        updateData.approvedAt = new Date()
        updateData.approvedBy = session.user.id
      }

      if (status === 'exported' && !existingPeriod.exportedAt) {
        updateData.exportedAt = new Date()
      }

      if (status === 'closed' && !existingPeriod.closedAt) {
        updateData.closedAt = new Date()
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    const period = await prisma.payrollPeriod.update({
      where: { id: periodId },
      data: updateData,
      include: {
        business: {
          select: { id: true, name: true, type: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        },
        approver: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json(period)
  } catch (error) {
    console.error('Payroll period update error:', error)
    return NextResponse.json(
      { error: 'Failed to update payroll period' },
      { status: 500 }
    )
  }
}

// DELETE /api/payroll/periods/[periodId] - Delete period (only if draft)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodId } = await params

    // Verify period exists (need businessId and approvedAt)
    const existingPeriod = await prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      include: {
        business: { select: { id: true } },
        _count: { select: { payrollEntries: true } }
      }
    })

    if (!existingPeriod) {
      return NextResponse.json(
        { error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    // Only allow managers (business-manager or business-owner) or system admins to delete a period
    const user = session.user as any
    const isAdmin = isSystemAdmin(user)
    const role = getUserRoleInBusiness(user, existingPeriod.business?.id)
    if (!(isAdmin || role === 'business-manager' || role === 'business-owner')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // If the period was approved, ensure deletion happens within 7 days of approval
    if (existingPeriod.approvedAt) {
      const approvedAt = new Date(existingPeriod.approvedAt as any)
      const cutoff = new Date(approvedAt)
      cutoff.setDate(cutoff.getDate() + 7)
      if (new Date() > cutoff) {
        return NextResponse.json({ error: 'Payroll period cannot be deleted more than 7 days after approval' }, { status: 400 })
      }
    }

    // Delete in transaction - first entries (cascade should handle benefits), then period
    await prisma.$transaction(async (tx) => {
      // Delete all payroll entries (benefits will cascade delete due to FK constraint)
      await tx.payrollEntry.deleteMany({
        where: { payrollPeriodId: periodId }
      })

      // Delete the period
      await tx.payrollPeriod.delete({
        where: { id: periodId }
      })
    })

    return NextResponse.json({ message: 'Payroll period deleted successfully' })
  } catch (error) {
    console.error('Payroll period deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete payroll period' },
      { status: 500 }
    )
  }
}
