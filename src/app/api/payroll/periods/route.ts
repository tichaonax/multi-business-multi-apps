import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { computeTotalsForEntry } from '@/lib/payroll/helpers'
import { generatePayrollContractEntries } from '@/lib/payroll/contract-selection'
import { nanoid } from 'nanoid'

// GET /api/payroll/periods - List payroll periods for a business
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    if (!hasPermission(session.user, 'canAccessPayroll')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('businessId')
    const year = searchParams.get('year')
    const status = searchParams.get('status')


    // Build filter - businessId is optional; when omitted return periods across all businesses
    const where: any = {}
    if (businessId) where.businessId = businessId

    if (year) {
      where.year = parseInt(year)
    }

    if (status) {
      where.status = status
    }

    const periods = await prisma.payrollPeriod.findMany({
      where,
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
        _count: {
          select: { payrollEntries: true }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    })

    // Ensure each returned period's business has a shortName (computed fallback) to keep API stable
    const computeShortName = (name?: string) => {
      if (!name) return undefined
      const words = name.split(/\s+/).filter(Boolean)
      if (words.length === 1) return words[0].substring(0, 4).toUpperCase()
      const initials = words.map(w => w[0].toUpperCase()).join('').substring(0, 4)
      return initials
    }

    const periodsWithShort = periods.map(p => {
      const b: any = p.business || null
      if (b) {
        if (!b.shortName) {
          b.shortName = computeShortName(b.name)
        }
      }
      return p
    })

    // Recompute period-level aggregates using authoritative per-entry totals
    try {
      // For each period, fetch its entry ids and compute totals via computeTotalsForEntry
      await Promise.all(periodsWithShort.map(async (p: any) => {
        try {
          const entries = await prisma.payrollEntry.findMany({ where: { payrollPeriodId: p.id }, select: { id: true } })
          if (!entries || entries.length === 0) {
            p.totalGrossPay = String(0)
            p.totalDeductions = String(0)
            p.totalNetPay = String(0)
            return
          }

          const totals = await entries.reduce(async (accP: Promise<any>, e: any) => {
            const acc = await accP
            try {
              const t = await computeTotalsForEntry(e.id)
              acc.gross += Number(t?.grossPay || 0)
              // computeTotalsForEntry may return totalDeductions that already includes stored entry.totalDeductions
              // but it is authoritative; use it as-is
              acc.deductions += Number(t?.totalDeductions || 0)
              acc.net += Number(t?.netPay || 0)
            } catch (err) {
              // ignore entry-level failures
            }
            return acc
          }, Promise.resolve({ gross: 0, deductions: 0, net: 0 }))

          p.totalGrossPay = String(totals.gross)
          p.totalDeductions = String(totals.deductions)
          p.totalNetPay = String(totals.net)
        } catch (err) {
          // if recompute fails for a period, fall back to stored values
          try {
            p.totalGrossPay = String(p.totalGrossPay || 0)
            p.totalDeductions = String(p.totalDeductions || 0)
            p.totalNetPay = String(p.totalNetPay || 0)
          } catch (e) { /* ignore */ }
        }
      }))
    } catch (err) {
      console.warn('Failed to recompute period aggregates for list endpoint', err)
    }

    return NextResponse.json(periodsWithShort)
  } catch (error) {
    console.error('Payroll periods fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll periods' },
      { status: 500 }
    )
  }
}

// POST /api/payroll/periods - Create new payroll period
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    if (!hasPermission(session.user, 'canCreatePayrollPeriod')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const { businessId, year, month, periodStart, periodEnd, notes, targetAllEmployees } = data

    // Validation
    if (!businessId || !year || !month || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Month must be between 1 and 12' },
        { status: 400 }
      )
    }

    // Check if period already exists
    const existingPeriod = await prisma.payrollPeriod.findUnique({
      where: {
        businessId_year_month: {
          businessId,
          year: parseInt(year),
          month: parseInt(month)
        }
      }
    })

    if (existingPeriod) {
      return NextResponse.json(
        { error: 'Payroll period for this month already exists' },
        { status: 400 }
      )
    }

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // If the client requested creating for all employees, ensure the
    // selected business is in fact the umbrella business. Otherwise the
    // subsequent duplicate-period checks can return a misleading error
    // (e.g. "Payroll period for this month already exists"). Provide a
    // clearer validation message here.
    if (targetAllEmployees && !business.isUmbrellaBusiness) {
      return NextResponse.json(
        { error: 'targetAllEmployees may only be used with the umbrella (All employees) business. Please select the All employees (Umbrella) option.' },
        { status: 400 }
      )
    }

    // Parse ints for year/month for reuse
    const yr = parseInt(year)
    const mo = parseInt(month)

    // Determine if the business we're creating for is the umbrella business.
    const creatingForUmbrella = !!business.isUmbrellaBusiness

    if (creatingForUmbrella) {
      // Disallow creating an umbrella payroll for a month/year when any
      // business-specific payroll period already exists for that month/year.
      const conflicting = await prisma.payrollPeriod.findFirst({
        where: {
          year: yr,
          month: mo,
          // Any payroll period belonging to a different business
          NOT: { businessId: businessId }
        }
      })

      if (conflicting) {
        return NextResponse.json(
          { error: 'Cannot create umbrella (all-employees) payroll: business-specific periods already exist for this month/year' },
          { status: 400 }
        )
      }
    } else {
      // Disallow creating a business-specific payroll when an umbrella
      // payroll already exists for the same month/year. We check the related
      // business record on the payrollPeriod via a relation filter.
      const umbrellaExists = await prisma.payrollPeriod.findFirst({
        where: {
          year: yr,
          month: mo,
          business: {
            is: { isUmbrellaBusiness: true }
          }
        }
      })

      if (umbrellaExists) {
        return NextResponse.json(
          { error: 'Cannot create business-specific payroll: an umbrella (all-employees) payroll exists for this month/year' },
          { status: 400 }
        )
      }
    }

    // Create payroll period
    // If targetAllEmployees is true, create entries for all active employees in the business
    const createData: any = {
      id: `PP-${nanoid(12)}`,
      businessId,
      year: parseInt(year),
      month: parseInt(month),
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      status: 'draft',
      totalEmployees: 0,
      totalGrossPay: 0,
      totalDeductions: 0,
      totalNetPay: 0,
      createdBy: session.user.id,
      notes: notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const period = await prisma.$transaction(async (tx) => {
      const p = await tx.payrollPeriod.create({ data: createData })

      if (targetAllEmployees) {
        // NEW LOGIC: Create multiple entries per employee if they have multiple signed contracts in the period
        // Get all employees (filter by business if not umbrella)
        const employeeWhere: any = { isActive: true }
        if (!business.isUmbrellaBusiness) {
          employeeWhere.primaryBusinessId = businessId
        }

        const employees = await tx.employee.findMany({
          where: employeeWhere,
          select: {
            id: true,
            employeeNumber: true,
            fullName: true,
            nationalId: true,
            dateOfBirth: true,
            hireDate: true,
            terminationDate: true
          }
        })

        console.log(`Period ${p.id}: Processing ${employees.length} employees for payroll entries`)

        const allEntries: any[] = []
        let employeesWithContracts = 0

        for (const employee of employees) {
          // Generate payroll contract entries for this employee
          // This handles: signed contracts only, multi-contract scenarios, proration, auto-renewal
          const contractEntries = await generatePayrollContractEntries(
            employee.id,
            p.periodStart,
            p.periodEnd,
            employee.terminationDate,
            business.isUmbrellaBusiness ? undefined : businessId
          )

          if (contractEntries.length === 0) {
            console.log(`Skipping employee ${employee.employeeNumber} (${employee.fullName}): No signed contracts for period`)
            continue
          }

          employeesWithContracts++

          // Create one payroll entry for each contract period
          for (const contractEntry of contractEntries) {
            const { contract, effectiveStartDate, effectiveEndDate, workDays, proratedBaseSalary, isProrated } = contractEntry

            const entryId = `PE-${nanoid(12)}`
            const entry: any = {
              id: entryId,
              payrollPeriodId: p.id,
              employeeId: employee.id,
              employeeNumber: employee.employeeNumber || null,
              employeeName: employee.fullName || null,
              nationalId: employee.nationalId || null,
              dateOfBirth: employee.dateOfBirth || null,
              hireDate: employee.hireDate || null,
              terminationDate: employee.terminationDate || null,
              workDays,
              baseSalary: proratedBaseSalary,
              grossPay: proratedBaseSalary, // Will be recalculated with benefits/deductions later
              netPay: proratedBaseSalary,   // Will be recalculated later
              contractId: contract.id,
              contractNumber: contract.contractNumber,
              contractStartDate: effectiveStartDate,
              contractEndDate: effectiveEndDate,
              isProrated,
              createdAt: new Date(),
              updatedAt: new Date()
            }

            allEntries.push(entry)

            console.log(`  - Entry for ${employee.employeeNumber}: Contract ${contract.contractNumber}, ${effectiveStartDate.toISOString().split('T')[0]} to ${effectiveEndDate.toISOString().split('T')[0]}, ${workDays} days, $${proratedBaseSalary}${isProrated ? ' (prorated)' : ''}`)
          }
        }

        if (allEntries.length > 0) {
          await tx.payrollEntry.createMany({ data: allEntries })
          console.log(`Created ${allEntries.length} payroll entries for ${employeesWithContracts} employees`)

          // Update totals on period
          await tx.payrollPeriod.update({
            where: { id: p.id },
            data: { totalEmployees: employeesWithContracts, updatedAt: new Date() }
          })
          p.totalEmployees = employeesWithContracts
        }
      }

      const result = await tx.payrollPeriod.findUnique({ where: { id: p.id }, include: { business: { select: { id: true, name: true, type: true } }, creator: { select: { id: true, name: true, email: true } } } })
      // Attach fallback shortName if missing (we haven't applied Prisma migration in local client yet)
      if (result?.business && !(result.business as any).shortName) {
        const computeShortName = (name?: string) => {
          if (!name) return undefined
          const words = name.split(/\s+/).filter(Boolean)
          if (words.length === 1) return words[0].substring(0, 4).toUpperCase()
          const initials = words.map(w => w[0].toUpperCase()).join('').substring(0, 4)
          return initials
        }
          ; (result.business as any).shortName = computeShortName(result.business.name)
      }
      return result
    })

    return NextResponse.json(period, { status: 201 })
  } catch (error) {
    console.error('Payroll period creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payroll period' },
      { status: 500 }
    )
  }
}
