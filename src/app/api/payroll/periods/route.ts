import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { computeTotalsForEntry } from '@/lib/payroll/helpers'
import { generatePayrollContractEntries } from '@/lib/payroll/contract-selection'
import { captureContractSnapshot } from '@/lib/payroll/contract-snapshot'
import { nanoid } from 'nanoid'

import { randomBytes } from 'crypto';
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

    const periods = await prisma.payrollPeriods.findMany({
      where,
      include: {
        businesses: {
          select: { id: true, name: true, type: true }
        },
        users_payroll_periods_createdByTousers: {
          select: { id: true, name: true, email: true }
        },
        users_payroll_periods_approvedByTousers: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { payroll_entries: true }
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
      const b: any = p.businesses || null
      if (b) {
        if (!b.shortName) {
          b.shortName = computeShortName(b.name)
        }
      }
      return {
        ...p,
        business: b, // Transform businesses -> business for frontend compatibility
        creator: p.users_payroll_periods_createdByTousers,
        approver: p.users_payroll_periods_approvedByTousers
      }
    })

    // Recompute period-level aggregates using authoritative per-entry totals
    try {
      // For each period, fetch its entry ids and compute totals via computeTotalsForEntry
      await Promise.all(periodsWithShort.map(async (p: any) => {
        try {
          const entries = await prisma.payroll_entries.findMany({ where: { payrollPeriodId: p.id }, select: { id: true } })
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
  } catch (error: any) {
    console.error('Payroll period creation error:', error)
    
    // Handle specific Prisma errors
    if (error.code === 'P2003') {
      const constraint = error.meta?.constraint || 'unknown'
      console.error(`Foreign key constraint violation: ${constraint}`)
      
      if (constraint.includes('createdBy')) {
        return NextResponse.json(
          { error: `User not found or invalid user ID: ${session.user.id}` },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: `Foreign key constraint violation: ${constraint}` },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create payroll period', details: error.message },
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

    // Validate that the month parameter matches the month in periodStart
    // Parse ISO date string directly to avoid timezone issues
    // periodStart should be in format "YYYY-MM-DD"
    const dateMatch = periodStart.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!dateMatch) {
      return NextResponse.json(
        { error: 'Invalid periodStart date format. Expected YYYY-MM-DD.' },
        { status: 400 }
      )
    }

    const startYear = parseInt(dateMatch[1], 10)
    const startMonth = parseInt(dateMatch[2], 10)
    const startDay = parseInt(dateMatch[3], 10)

    if (parseInt(month) !== startMonth || parseInt(year) !== startYear) {
      return NextResponse.json(
        {
          error: `Month/year mismatch: period starts in ${startYear}-${startMonth.toString().padStart(2, '0')} but month=${month}, year=${year} was provided. Please ensure the month and year match the period start date.`
        },
        { status: 400 }
      )
    }

    // Check if period already exists
    const existingPeriod = await prisma.payrollPeriods.findUnique({
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
    const business = await prisma.businesses.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
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
      const conflicting = await prisma.payrollPeriods.findFirst({
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
      const umbrellaExists = await prisma.payrollPeriods.findFirst({
        where: {
          year: yr,
          month: mo,
          businesses: {
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

    // Verify the user exists before creating the payroll period
    const user = await prisma.users.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify the user exists in the database
    const currentUser = await prisma.users.findUnique({
      where: { id: session.user.id }
    })

    if (!currentUser) {
      console.error(`User not found in database: ${session.user.id}`)
      
      // Debug: List all users in the database
      const allUsers = await prisma.users.findMany({
        select: { id: true, name: true, email: true }
      })
      console.error('All users in database:', allUsers)
      
      return NextResponse.json(
        { error: `User not found: ${session.user.id}. Available users: ${allUsers.map(u => `${u.name} (${u.id})`).join(', ')}` },
        { status: 404 }
      )
    }

    console.log(`Creating payroll period for user: ${currentUser.name} (${currentUser.id})`)

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

    console.log('Creating payroll period with data:', JSON.stringify(createData, null, 2))

    const period = await prisma.$transaction(async (tx) => {
      const p = await tx.payroll_periods.create({ data: createData })

      if (targetAllEmployees) {
        // Create entries for all employees in the selected business
        // If business is umbrella, get ALL employees across all businesses
        // If business is specific, get only employees for that business
        const employeeWhere: any = { isActive: true }
        if (!business.isUmbrellaBusiness) {
          // Regular business: only get employees assigned to this business
          employeeWhere.primaryBusinessId = businessId
        }
        // Umbrella business: no filter, get everyone!

        const employees = await tx.employees.findMany({
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
            business.isUmbrellaBusiness ? undefined : businessId  // No business filter for umbrella
          )

          if (contractEntries.length === 0) {
            console.log(`Skipping employee ${employee.employeeNumber} (${employee.fullName}): No signed contracts for period`)
            continue
          }

          employeesWithContracts++

          // Create one payroll entry for each contract period
          for (const contractEntry of contractEntries) {
            const { contract, effectiveStartDate, effectiveEndDate, workDays, proratedBaseSalary, isProrated } = contractEntry

            // Capture immutable contract snapshot at period creation time
            let contractSnapshot = null
            try {
              const snapshot = await captureContractSnapshot(contract.id, p.createdAt)
              contractSnapshot = snapshot
            } catch (error) {
              console.warn(`Failed to capture contract snapshot for ${contract.contractNumber}:`, error)
              // Continue without snapshot - will fall back to live contract data if needed
            }

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
              contractSnapshot,  // Store immutable snapshot
              createdAt: new Date(),
              updatedAt: new Date()
            }

            allEntries.push(entry)

            console.log(`  - Entry for ${employee.employeeNumber}: Contract ${contract.contractNumber}, ${effectiveStartDate.toISOString().split('T')[0]} to ${effectiveEndDate.toISOString().split('T')[0]}, ${workDays} days, $${proratedBaseSalary}${isProrated ? ' (prorated)' : ''}${contractSnapshot ? ' [snapshot captured]' : ''}`)
          }
        }

        if (allEntries.length > 0) {
          await tx.payroll_entries.createMany({ data: allEntries })
          console.log(`Created ${allEntries.length} payroll entries for ${employeesWithContracts} employees`)

          // Update totals on period
          await tx.payroll_periods.update({
            where: { id: p.id },
            data: { totalEmployees: employeesWithContracts, updatedAt: new Date() }
          })
          p.totalEmployees = employeesWithContracts
        }
      }

      const result = await tx.payroll_periods.findUnique({ where: { id: p.id }, include: { businesses: { select: { id: true, name: true, type: true } }, users_payroll_periods_createdByTousers: { select: { id: true, name: true, email: true } } } })
      // Attach fallback shortName if missing and transform response
      const transformedResult = {
        ...result,
        business: result?.businesses,
        creator: result?.users_payroll_periods_createdByTousers
      }
      
      if (transformedResult?.business && !(transformedResult.business as any).shortName) {
        const computeShortName = (name?: string) => {
          if (!name) return undefined
          const words = name.split(/\s+/).filter(Boolean)
          if (words.length === 1) return words[0].substring(0, 4).toUpperCase()
          const initials = words.map(w => w[0].toUpperCase()).join('').substring(0, 4)
          return initials
        }
        ; (transformedResult.business as any).shortName = computeShortName(transformedResult.businesses.name)
      }
      return transformedResult
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
