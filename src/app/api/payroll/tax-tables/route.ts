import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

// GET /api/payroll/tax-tables?year=2025&tableType=MONTHLY
// All payroll users can read
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!hasPermission(user, 'canAccessPayroll')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const yearParam = searchParams.get('year')
    const tableType = searchParams.get('tableType') || 'MONTHLY'

    // List of distinct years available
    const availableYears = await prisma.payeTaxBrackets.findMany({
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'desc' },
    })

    const years = availableYears.map(r => r.year)

    // Resolve year: default to latest
    let year = yearParam ? parseInt(yearParam) : (years[0] ?? new Date().getFullYear())

    // If the requested year has no brackets, fall back to the most recent year that does
    if (yearParam) {
      const exists = await prisma.payeTaxBrackets.count({ where: { year } })
      if (exists === 0 && years.length > 0) {
        year = years[0]
      }
    }

    const brackets = await prisma.payeTaxBrackets.findMany({
      where: { year, tableType },
      orderBy: { sortOrder: 'asc' },
    })

    const constants = await prisma.payrollTaxConstants.findFirst({
      where: { year: { lte: year } },
      orderBy: { year: 'desc' },
    })

    return NextResponse.json({
      year,
      tableType,
      years,
      brackets: brackets.map(b => ({
        id: b.id,
        sortOrder: b.sortOrder,
        lowerBound: Number(b.lowerBound),
        upperBound: b.upperBound !== null ? Number(b.upperBound) : null,
        rate: Number(b.rate),
        deductAmount: Number(b.deductAmount),
      })),
      constants: constants
        ? {
            year: constants.year,
            aidsLevyRate: Number(constants.aidsLevyRate),
            nssaEmployeeRate: Number(constants.nssaEmployeeRate),
            nssaEmployerRate: Number(constants.nssaEmployerRate),
          }
        : null,
    })
  } catch (err) {
    console.error('GET /api/payroll/tax-tables error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/payroll/tax-tables — update brackets and/or constants for a year
// Requires canManagePayroll
export async function PUT(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!hasPermission(user, 'canManagePayroll')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { year, tableType = 'MONTHLY', brackets, constants } = body

    if (!year || typeof year !== 'number') {
      return NextResponse.json({ error: 'year is required' }, { status: 400 })
    }

    // Update brackets if provided
    if (Array.isArray(brackets)) {
      for (const b of brackets) {
        if (!b.id) continue
        await prisma.payeTaxBrackets.update({
          where: { id: b.id },
          data: {
            lowerBound: b.lowerBound,
            upperBound: b.upperBound ?? null,
            rate: b.rate,
            deductAmount: b.deductAmount,
            sortOrder: b.sortOrder,
          },
        })
      }
    }

    // Update constants if provided
    if (constants) {
      await prisma.payrollTaxConstants.upsert({
        where: { year },
        create: {
          year,
          aidsLevyRate: constants.aidsLevyRate,
          nssaEmployeeRate: constants.nssaEmployeeRate,
          nssaEmployerRate: constants.nssaEmployerRate,
        },
        update: {
          aidsLevyRate: constants.aidsLevyRate,
          nssaEmployeeRate: constants.nssaEmployeeRate,
          nssaEmployerRate: constants.nssaEmployerRate,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PUT /api/payroll/tax-tables error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/payroll/tax-tables/clone — copy brackets from one year to another
// Requires canManagePayroll
export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!hasPermission(user, 'canManagePayroll')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { fromYear, toYear } = body

    if (!fromYear || !toYear || fromYear === toYear) {
      return NextResponse.json({ error: 'fromYear and toYear are required and must differ' }, { status: 400 })
    }

    // Check destination year doesn't already have brackets
    const existing = await prisma.payeTaxBrackets.count({ where: { year: toYear } })
    if (existing > 0) {
      return NextResponse.json({ error: `Year ${toYear} already has tax brackets` }, { status: 409 })
    }

    // Clone all brackets from source year
    const sourceBrackets = await prisma.payeTaxBrackets.findMany({ where: { year: fromYear } })
    if (sourceBrackets.length === 0) {
      return NextResponse.json({ error: `No brackets found for year ${fromYear}` }, { status: 404 })
    }

    await prisma.payeTaxBrackets.createMany({
      data: sourceBrackets.map(b => ({
        year: toYear,
        tableType: b.tableType,
        lowerBound: b.lowerBound,
        upperBound: b.upperBound,
        rate: b.rate,
        deductAmount: b.deductAmount,
        sortOrder: b.sortOrder,
      })),
    })

    // Clone constants from source year if no constants for toYear
    const sourceConstants = await prisma.payrollTaxConstants.findUnique({ where: { year: fromYear } })
    if (sourceConstants) {
      await prisma.payrollTaxConstants.upsert({
        where: { year: toYear },
        create: {
          year: toYear,
          aidsLevyRate: sourceConstants.aidsLevyRate,
          nssaEmployeeRate: sourceConstants.nssaEmployeeRate,
          nssaEmployerRate: sourceConstants.nssaEmployerRate,
        },
        update: {},
      })
    }

    return NextResponse.json({ success: true, cloned: sourceBrackets.length })
  } catch (err) {
    console.error('POST /api/payroll/tax-tables error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
