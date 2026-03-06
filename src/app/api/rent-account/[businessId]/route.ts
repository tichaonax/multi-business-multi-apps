import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

type Params = { params: Promise<{ businessId: string }> }

function computeIndicator(balance: number, monthlyRent: number): 'red' | 'orange' | 'green' | null {
  if (monthlyRent <= 0) return null
  const pct = (balance / monthlyRent) * 100
  if (pct >= 100) return 'green'
  if (pct >= 75) return 'orange'
  return 'red'
}

/**
 * GET /api/rent-account/[businessId]
 * Fetch rent config + account balance + funding %.
 * Returns { config: null } gracefully when no config exists.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params

    const permissions = getEffectivePermissions(user, businessId)
    if (!permissions.canViewReports && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const config = await prisma.businessRentConfig.findUnique({
      where: { businessId },
      include: {
        expenseAccount: {
          select: { id: true, accountNumber: true, accountName: true, balance: true },
        },
        landlordSupplier: {
          select: { id: true, name: true, contactPerson: true, phone: true, email: true },
        },
      },
    })

    if (!config) {
      return NextResponse.json({ hasRentAccount: false, config: null })
    }

    const balance = Number(config.expenseAccount.balance)
    const monthlyRent = Number(config.monthlyRentAmount)
    const fundingPercent = monthlyRent > 0 ? Math.round((balance / monthlyRent) * 1000) / 10 : 0
    const indicator = computeIndicator(balance, monthlyRent)

    // Calculate how much rent has been paid this calendar month
    const now = new Date()
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    const paymentsThisMonth = await prisma.expenseAccountPayments.aggregate({
      where: {
        expenseAccountId: config.expenseAccount.id,
        paymentDate: { gte: startOfMonth, lt: startOfNextMonth },
        status: { not: 'CANCELLED' },
      },
      _sum: { amount: true },
    })
    const paidThisMonth = Number(paymentsThisMonth._sum.amount || 0)
    const outstanding = Math.max(0, monthlyRent - paidThisMonth)

    return NextResponse.json({
      hasRentAccount: true,
      paidThisMonth,
      outstanding,
      config: {
        id: config.id,
        businessId: config.businessId,
        monthlyRentAmount: monthlyRent,
        dailyTransferAmount: Number(config.dailyTransferAmount),
        operatingDaysPerMonth: config.operatingDaysPerMonth,
        rentDueDay: config.rentDueDay,
        autoTransferOnEOD: config.autoTransferOnEOD,
        isActive: config.isActive,
        landlordSupplier: config.landlordSupplier,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
      account: {
        id: config.expenseAccount.id,
        accountNumber: config.expenseAccount.accountNumber,
        accountName: config.expenseAccount.accountName,
        balance,
      },
      fundingPercent,
      indicator,
    })
  } catch (err) {
    console.error('[GET /api/rent-account]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/rent-account/[businessId]
 * Create a new rent config + linked expense account.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params

    const permissions = getEffectivePermissions(user, businessId)
    if (!permissions.canManageBusiness && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — business owner/admin only' }, { status: 403 })
    }

    // Prevent duplicates
    const existing = await prisma.businessRentConfig.findUnique({ where: { businessId } })
    if (existing) {
      return NextResponse.json(
        { error: 'A rent account already exists for this business' },
        { status: 409 }
      )
    }

    const body = await request.json()
    const {
      monthlyRentAmount,
      operatingDaysPerMonth = 30,
      rentDueDay = 1,
      landlordSupplierId,
      autoTransferOnEOD = true,
    } = body

    // Validate
    if (!monthlyRentAmount || Number(monthlyRentAmount) <= 0) {
      return NextResponse.json({ error: 'monthlyRentAmount must be > 0' }, { status: 400 })
    }
    if (operatingDaysPerMonth < 1 || operatingDaysPerMonth > 31) {
      return NextResponse.json({ error: 'operatingDaysPerMonth must be 1–31' }, { status: 400 })
    }
    if (rentDueDay < 1 || rentDueDay > 28) {
      return NextResponse.json({ error: 'rentDueDay must be 1–28' }, { status: 400 })
    }
    if (!landlordSupplierId) {
      return NextResponse.json({ error: 'landlordSupplierId is required' }, { status: 400 })
    }

    // Verify business exists
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { id: true, name: true },
    })
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Verify landlord supplier exists
    const landlord = await prisma.businessSuppliers.findUnique({
      where: { id: landlordSupplierId },
      select: { id: true, name: true },
    })
    if (!landlord) {
      return NextResponse.json({ error: 'Landlord supplier not found' }, { status: 404 })
    }

    const dailyTransferAmount = Math.ceil(Number(monthlyRentAmount) / Number(operatingDaysPerMonth))

    // Generate account number
    const count = await prisma.expenseAccounts.count()
    const accountNumber = `RENT-${String(count + 1).padStart(5, '0')}`

    // Create in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.expenseAccounts.create({
        data: {
          accountNumber,
          accountName: `${business.name} — Rent Account`,
          balance: 0,
          accountType: 'RENT',
          businessId,
          createdBy: user.id,
          isActive: true,
        },
      })

      const config = await tx.businessRentConfig.create({
        data: {
          businessId,
          expenseAccountId: account.id,
          landlordSupplierId,
          monthlyRentAmount: Number(monthlyRentAmount),
          dailyTransferAmount,
          operatingDaysPerMonth: Number(operatingDaysPerMonth),
          rentDueDay: Number(rentDueDay),
          autoTransferOnEOD,
          isActive: true,
          createdBy: user.id,
        },
        include: {
          expenseAccount: { select: { id: true, accountNumber: true, accountName: true, balance: true } },
          landlordSupplier: { select: { id: true, name: true } },
        },
      })

      return config
    })

    return NextResponse.json({
      success: true,
      config: {
        id: result.id,
        businessId: result.businessId,
        monthlyRentAmount: Number(result.monthlyRentAmount),
        dailyTransferAmount: Number(result.dailyTransferAmount),
        operatingDaysPerMonth: result.operatingDaysPerMonth,
        rentDueDay: result.rentDueDay,
        autoTransferOnEOD: result.autoTransferOnEOD,
        isActive: result.isActive,
        landlordSupplier: result.landlordSupplier,
      },
      account: {
        id: result.expenseAccount.id,
        accountNumber: result.expenseAccount.accountNumber,
        accountName: result.expenseAccount.accountName,
        balance: 0,
      },
      fundingPercent: 0,
      indicator: 'red',
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/rent-account]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/rent-account/[businessId]
 * Update existing rent config. Recalculates dailyTransferAmount when relevant fields change.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params

    const permissions = getEffectivePermissions(user, businessId)
    if (!permissions.canManageBusiness && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await prisma.businessRentConfig.findUnique({ where: { businessId } })
    if (!existing) {
      return NextResponse.json({ error: 'Rent config not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      monthlyRentAmount,
      operatingDaysPerMonth,
      rentDueDay,
      landlordSupplierId,
      autoTransferOnEOD,
      isActive,
    } = body

    // Validate landlord if changing
    if (landlordSupplierId && landlordSupplierId !== existing.landlordSupplierId) {
      const landlord = await prisma.businessSuppliers.findUnique({ where: { id: landlordSupplierId } })
      if (!landlord) {
        return NextResponse.json({ error: 'Landlord supplier not found' }, { status: 404 })
      }
    }

    const newMonthly = monthlyRentAmount !== undefined ? Number(monthlyRentAmount) : Number(existing.monthlyRentAmount)
    const newDays = operatingDaysPerMonth !== undefined ? Number(operatingDaysPerMonth) : existing.operatingDaysPerMonth
    const newDailyTransfer = Math.ceil(newMonthly / newDays)

    if (newMonthly <= 0) return NextResponse.json({ error: 'monthlyRentAmount must be > 0' }, { status: 400 })
    if (newDays < 1 || newDays > 31) return NextResponse.json({ error: 'operatingDaysPerMonth must be 1–31' }, { status: 400 })
    if (rentDueDay !== undefined && (rentDueDay < 1 || rentDueDay > 28)) {
      return NextResponse.json({ error: 'rentDueDay must be 1–28' }, { status: 400 })
    }

    const updated = await prisma.businessRentConfig.update({
      where: { businessId },
      data: {
        ...(monthlyRentAmount !== undefined && { monthlyRentAmount: newMonthly }),
        ...(operatingDaysPerMonth !== undefined && { operatingDaysPerMonth: newDays }),
        dailyTransferAmount: newDailyTransfer,
        ...(rentDueDay !== undefined && { rentDueDay: Number(rentDueDay) }),
        ...(landlordSupplierId !== undefined && { landlordSupplierId }),
        ...(autoTransferOnEOD !== undefined && { autoTransferOnEOD }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      },
      include: {
        expenseAccount: { select: { id: true, accountNumber: true, accountName: true, balance: true } },
        landlordSupplier: { select: { id: true, name: true, contactPerson: true, phone: true, email: true } },
      },
    })

    const balance = Number(updated.expenseAccount.balance)
    const fundingPercent = newMonthly > 0 ? Math.round((balance / newMonthly) * 1000) / 10 : 0

    return NextResponse.json({
      success: true,
      config: {
        id: updated.id,
        businessId: updated.businessId,
        monthlyRentAmount: Number(updated.monthlyRentAmount),
        dailyTransferAmount: Number(updated.dailyTransferAmount),
        operatingDaysPerMonth: updated.operatingDaysPerMonth,
        rentDueDay: updated.rentDueDay,
        autoTransferOnEOD: updated.autoTransferOnEOD,
        isActive: updated.isActive,
        landlordSupplier: updated.landlordSupplier,
      },
      account: {
        id: updated.expenseAccount.id,
        accountNumber: updated.expenseAccount.accountNumber,
        accountName: updated.expenseAccount.accountName,
        balance,
      },
      fundingPercent,
      indicator: computeIndicator(balance, newMonthly),
    })
  } catch (err) {
    console.error('[PUT /api/rent-account]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/rent-account/[businessId]
 * Soft-deactivate the rent config (isActive = false). Does not delete the account or its balance.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params

    const permissions = getEffectivePermissions(user, businessId)
    if (!permissions.canManageBusiness && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await prisma.businessRentConfig.findUnique({ where: { businessId } })
    if (!existing) {
      return NextResponse.json({ error: 'Rent config not found' }, { status: 404 })
    }

    await prisma.businessRentConfig.update({
      where: { businessId },
      data: { isActive: false, updatedAt: new Date() },
    })

    return NextResponse.json({ success: true, message: 'Rent account deactivated' })
  } catch (err) {
    console.error('[DELETE /api/rent-account]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
