import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { nanoid } from 'nanoid'
import { Decimal } from '@prisma/client/runtime/library'

import { randomBytes } from 'crypto';
interface RouteParams {
  params: Promise<{ entryId: string }>
}

// GET /api/payroll/entries/[entryId]/benefits - Get all benefits for an entry
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

    let benefits: any[] = []
    let benefitsLoadError: string | undefined

    try {
      benefits = await prisma.payrollEntryBenefits.findMany({
        where: { payrollEntryId: entryId },
        include: {
          benefit_types: true
        },
        orderBy: { benefitName: 'asc' }
      })
    } catch (err) {
      console.warn('Failed to load payroll entry benefits:', err)
      benefitsLoadError = err instanceof Error ? err.message : String(err)
    }

    // ALWAYS attempt to infer contract benefits and combine with persisted ones
    let inferredBenefits: any[] = []
    try {
      // Fetch latest contract for the employee via payroll entry
      const entry = await prisma.payrollEntries.findUnique({ where: { id: entryId }, select: { employeeId: true } })
      if (entry) {
        const empId = entry.employeeId
        let contract = null
        if (empId) {
          contract = await prisma.employeeContracts.findFirst({
            where: { employeeId: empId },
            orderBy: { startDate: 'desc' },
            include: { contract_benefits: { include: { benefit_types: true } } }
          })
        }
        if (contract) {
          // Helper to normalize names for robust comparison
          const normalizeName = (s?: string | null) => {
            if (!s) return ''
            try {
              return String(s).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
            } catch (e) {
              return String(s).trim().replace(/\s+/g, ' ').toLowerCase()
            }
          }

          // Get IDs and normalized names of already-persisted benefits to avoid duplicates
          // Persisted overrides (including inactive ones) should block inferred contract benefits
          const existingTypeIds = new Set(benefits.map((b: any) => b.benefitTypeId).filter(Boolean))
          const existingNames = new Set(benefits.map((b: any) => normalizeName(b.benefitName || (b.benefitType && b.benefitType.name) || '')).filter(Boolean))

          const contractAny: any = contract
          // Use pdfGenerationData.benefits as the source of truth (includes benefitTypeId after migration)
          if (contractAny.pdfGenerationData && Array.isArray(contractAny.pdfGenerationData.benefits)) {
            for (const cb of contractAny.pdfGenerationData.benefits || []) {
              const amount = Number(cb.amount || 0)
              if (!amount || amount === 0) continue

              const typeId = cb.benefitTypeId || null
              const bName = normalizeName(cb.name || '')

              // Skip if this benefit type or name is already persisted (including inactive overrides)
              if ((typeId && existingTypeIds.has(typeId)) || (bName && existingNames.has(bName))) continue

              inferredBenefits.push({
                id: null,
                payrollEntryId: entryId,
                benefitTypeId: typeId,
                benefitName: cb.name || 'Inferred Benefit',
                amount,
                // Contract-inferred benefits are not persisted active flags; they are
                // shown as contract items and should not be considered 'active'
                // for purposes of manual toggling unless an override exists.
                isActive: false,
                source: 'contract-inferred',
                benefitType: null
              })
            }
          } else if (Array.isArray(contractAny.contract_benefits) && contractAny.contract_benefits.length > 0) {
            // Fallback to contract_benefits table if pdfGenerationData is missing
            for (const b of contractAny.contract_benefits || []) {
              const amount = Number(b.amount ?? b.benefitType?.defaultAmount ?? 0)
              if (!amount || amount === 0) continue
              if (b.benefitType?.type === 'deduction') continue

              const bName = normalizeName(b.benefitType?.name || '')
              if ((b.benefitTypeId && existingTypeIds.has(b.benefitTypeId)) || (bName && existingNames.has(bName))) continue

              inferredBenefits.push({
                id: null,
                payrollEntryId: entryId,
                benefitTypeId: b.benefitTypeId || b.benefitType?.id || null,
                benefitName: b.benefitType?.name || 'Inferred Benefit',
                amount,
                isActive: false,
                source: 'contract-inferred',
                benefitType: undefined
              })
            }
          }
        }
      }
    } catch (inferErr) {
      console.warn('Failed to infer contract benefits for entry:', inferErr)
    }

  // Combine persisted + inferred benefits for compatibility, but return separated lists
  const combinedBenefits = [...benefits, ...inferredBenefits]
  return NextResponse.json({ persisted: benefits, inferred: inferredBenefits, combined: combinedBenefits })
  } catch (error) {
    console.error('Fetch payroll entry benefits error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch benefits' },
      { status: 500 }
    )
  }
}

// POST /api/payroll/entries/[entryId]/benefits - Add manual benefit
export async function POST(req: NextRequest, { params }: RouteParams) {
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
    const { benefitTypeId, benefitName, amount, isActive, deactivatedReason } = data

    // Treat empty string as missing
    const bTypeId = benefitTypeId && String(benefitTypeId).trim() !== '' ? String(benefitTypeId) : null

    // Require amount and either a benefitTypeId or a benefitName so we can create a standalone override
    if (amount === undefined || (bTypeId === null && (!benefitName || String(benefitName).trim() === ''))) {
      return NextResponse.json(
        { error: 'Benefit amount and either benefitTypeId or benefitName are required' },
        { status: 400 }
      )
    }

    // Verify entry exists
    const entry = await prisma.payrollEntries.findUnique({
      where: { id: entryId },
      include: { payroll_periods: true }
    })

    if (!entry) {
      return NextResponse.json(
        { error: 'Payroll entry not found' },
        { status: 404 }
      )
    }

    // Check if period is editable
    if (entry.payroll_periods && (entry.payroll_periods.status === 'exported' || entry.payroll_periods.status === 'closed')) {
      return NextResponse.json(
        { error: 'Cannot add benefits to exported or closed payroll period' },
        { status: 400 }
      )
    }

    // Get benefit type info if an id was provided
    let benefitType = null
    if (bTypeId) {
      benefitType = await prisma.benefitTypes.findUnique({ where: { id: bTypeId } })
      if (!benefitType) {
        return NextResponse.json({ error: 'Benefit type not found' }, { status: 404 })
      }
    }

    // Create benefit in transaction
    let result: any
    try {
      result = await prisma.$transaction(async (tx) => {
      // Ensure we have a benefitType to satisfy the schema (benefitTypeId is required)
      let finalBenefitType = benefitType

      if (!finalBenefitType) {
        // Try to find an existing BenefitType by name (case-insensitive)
        const found = await tx.benefit_types.findFirst({ where: { name: { equals: String(benefitName), mode: 'insensitive' } } })
        if (found) {
          finalBenefitType = found
        } else {
          // Create a lightweight BenefitType to reference
          finalBenefitType = await tx.benefit_types.create({
            data: {
              id: `BT-${nanoid(8)}`,
              name: String(benefitName),
              type: 'benefit',
              defaultAmount: amount !== undefined ? new Decimal(parseFloat(amount)) : undefined,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
        }
      }

      // Prevent creating duplicate benefits for the same payroll entry by benefitTypeId or name
      const normalizeName = (s?: string | null) => {
        if (!s) return ''
        try { return String(s).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() } catch (e) { return String(s).trim().replace(/\s+/g, ' ').toLowerCase() }
      }

      const normalizedNewName = normalizeName(finalBenefitType!.name)
      const existingConflict = await tx.payrollEntryBenefits.findFirst({
        where: {
          payrollEntryId: entryId,
          OR: [
            { benefitTypeId: finalBenefitType!.id },
            { benefitName: { equals: finalBenefitType!.name, mode: 'insensitive' } }
          ]
        }
      })

      if (existingConflict) {
        // Signal a duplicate in a way the caller can react to
        throw new Error('Benefit already exists for this payroll entry')
      }

      const newBenefit = await tx.payrollEntryBenefits.create({
        data: {
          id: `PEB-${nanoid(12)}`,
          payrollEntryId: entryId,
          benefitTypeId: finalBenefitType!.id,
          benefitName: finalBenefitType!.name,
          amount: parseFloat(amount),
          // Allow caller to create an inactive override (deactivation) by passing isActive=false
          isActive: typeof isActive === 'boolean' ? Boolean(isActive) : true,
          deactivatedReason: deactivatedReason ?? null,
          source: 'manual',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          benefit_types: true
        }
      })

      // Recalculate totals
      await recalculateEntryTotals(tx, entryId)

      return newBenefit
      return result
    })
    } catch (txErr) {
      // Translate known business errors into HTTP responses
      if (txErr instanceof Error && txErr.message && txErr.message.includes('Benefit already exists')) {
        return NextResponse.json({ error: txErr.message }, { status: 409 })
      }
      throw txErr
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Add payroll entry benefit error:', error)
    return NextResponse.json(
      { error: 'Failed to add benefit' },
      { status: 500 }
    )
  }
}

// PUT /api/payroll/entries/[entryId]/benefits/[benefitId] - Update a manual benefit (amount, isActive, deactivatedReason)
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
    const { id, amount, isActive, deactivatedReason } = data
    if (!id) return NextResponse.json({ error: 'Benefit id required' }, { status: 400 })

    const existing = await prisma.payrollEntryBenefits.findUnique({ where: { id }, include: { payroll_entries: { include: { payroll_periods: true } } } })
    if (!existing) return NextResponse.json({ error: 'Benefit not found' }, { status: 404 })

    // Ensure payrollEntry and payrollPeriod exist before checking status
    if (!existing.payroll_entries || !existing.payroll_entries.payroll_periods) {
      return NextResponse.json({ error: 'Payroll entry or period information missing' }, { status: 500 })
    }

    if (existing.payroll_entries.payroll_periods.status === 'exported' || existing.payroll_entries.payroll_periods.status === 'closed') {
      return NextResponse.json({ error: 'Cannot modify benefits on exported or closed payroll period' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.payrollEntryBenefits.update({
        where: { id }, data: {
          amount: amount !== undefined ? parseFloat(amount) : existing.amount,
          isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
          deactivatedReason: deactivatedReason !== undefined ? deactivatedReason : existing.deactivatedReason,
          updatedAt: new Date()
        }, include: { benefit_types: true }
      })

      await recalculateEntryTotals(tx, entryId)
      return updated
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Update payroll entry benefit error:', error)
    return NextResponse.json({ error: 'Failed to update benefit' }, { status: 500 })
  }
}

// DELETE /api/payroll/entries/[entryId]/benefits/[benefitId] - Delete a manual benefit
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { entryId } = await params
    if (!hasPermission(session.user, 'canEditPayrollEntry')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const benefitId = searchParams.get('benefitId')
    if (!benefitId) return NextResponse.json({ error: 'benefitId required' }, { status: 400 })

    const existing = await prisma.payrollEntryBenefits.findUnique({ where: { id: benefitId }, include: { payroll_entries: { include: { payroll_periods: true } } } })
    if (!existing) return NextResponse.json({ error: 'Benefit not found' }, { status: 404 })

    // Ensure payrollEntry and payrollPeriod exist before checking status
    if (!existing.payroll_entries || !existing.payroll_entries.payroll_periods) {
      return NextResponse.json({ error: 'Payroll entry or period information missing' }, { status: 500 })
    }

    if (existing.payroll_entries.payroll_periods.status === 'exported' || existing.payroll_entries.payroll_periods.status === 'closed') {
      return NextResponse.json({ error: 'Cannot delete benefits on exported or closed payroll period' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.payrollEntryBenefits.delete({ where: { id: benefitId } })
      await recalculateEntryTotals(tx, entryId)
      return { success: true }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Delete payroll entry benefit error:', error)
    return NextResponse.json({ error: 'Failed to delete benefit' }, { status: 500 })
  }
}

// Helper function to recalculate entry totals
async function recalculateEntryTotals(tx: any, entryId: string) {
  const entry = await tx.payrollEntries.findUnique({
    where: { id: entryId },
    include: {
      PayrollEntryBenefits: true
    }
  })

  if (!entry) return

  // Calculate benefits total (only active benefits)
  const benefitsTotal = entry.payroll_entry_benefits
    .filter((b: any) => b.isActive)
    .reduce((sum: number, b: any) => sum + Number(b.amount), 0)

  // Calculate gross pay
  const baseSalary = Number(entry.baseSalary)
  const commission = Number(entry.commission)
  const overtimePay = Number(entry.overtimePay)
  const adjustmentsTotal = Number(entry.adjustmentsTotal)

  const grossPay = baseSalary + commission + overtimePay + benefitsTotal + adjustmentsTotal

  // Calculate net pay
  const totalDeductions = Number(entry.totalDeductions)
  const netPay = grossPay - totalDeductions

  // Update entry
  await tx.payrollEntries.update({
    where: { id: entryId },
    data: {
      benefitsTotal,
      grossPay,
      netPay,
      updatedAt: new Date()
    }
  })

  // Update period totals
  const allEntries = await tx.payrollEntries.findMany({
    where: { payrollPeriodId: entry.payrollPeriodId }
  })

  const periodTotals = allEntries.reduce(
    (acc: any, e: any) => ({
      totalGrossPay: acc.totalGrossPay + Number(e.grossPay),
      totalDeductions: acc.totalDeductions + Number(e.totalDeductions),
      totalNetPay: acc.totalNetPay + Number(e.netPay)
    }),
    { totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 }
  )

  await tx.payrollPeriods.update({
    where: { id: entry.payrollPeriodId },
    data: {
      totalGrossPay: periodTotals.totalGrossPay,
      totalDeductions: periodTotals.totalDeductions,
      totalNetPay: periodTotals.totalNetPay,
      updatedAt: new Date()
    }
  })
}
