import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkingDaysInMonth, computeTotalsForEntry } from '@/lib/payroll/helpers'
import { hasPermission } from '@/lib/permission-utils'

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
                fullName: true,
                nationalId: true,
                email: true,
                jobTitles: {
                  select: { title: true }
                }
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

      let enrichedEntries: any[] = period.payrollEntries.map(entry => ({
        ...entry,
        payrollEntryBenefits: benefitsByEntry[entry.id] || []
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

          return {
            ...entry,
            payrollEntryBenefits: entryBenefits,
            contract: contract || null,
            mergedBenefits,
            totalBenefitsAmount,
            workDays: derivedWorkDays,
            cumulativeSickDays: cumulative.cumulativeSickDays,
            cumulativeLeaveDays: cumulative.cumulativeLeaveDays,
            cumulativeAbsenceDays: cumulative.cumulativeAbsenceDays,
            grossPay: Number(totals.grossPay ?? Number(entry.grossPay || 0)),
            netPay: Number(totals.netPay ?? Number(entry.netPay || 0))
          }
        })) as any
      } catch (contractErr) {
        console.warn('Failed to load/merge contract benefits:', contractErr)
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

      const result: any = { ...period, payrollEntries: enrichedEntries as any, visibleBenefitColumns }
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

    if (!hasPermission(session.user, 'canManagePayroll')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify period exists
    const existingPeriod = await prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      include: {
        _count: {
          select: { payrollEntries: true }
        }
      }
    })

    if (!existingPeriod) {
      return NextResponse.json(
        { error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    // Only allow deletion of draft and in_progress periods
    if (!['draft', 'in_progress'].includes(existingPeriod.status)) {
      return NextResponse.json(
        { error: 'Only draft or in-progress payroll periods can be deleted' },
        { status: 400 }
      )
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
