import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ReportQuerySchema = z.object({
  reportType: z.enum([
    'FLEET_OVERVIEW',
    'MILEAGE_SUMMARY',
    'EXPENSE_SUMMARY',
    'MAINTENANCE_SCHEDULE',
    'COMPLIANCE_ALERTS',
    'DRIVER_ACTIVITY',
    'BUSINESS_ATTRIBUTION',
    'REIMBURSEMENT_SUMMARY'
  ]),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  businessId: z.string().optional(),
  ownershipType: z.enum(['PERSONAL', 'BUSINESS']).optional()
})

// GET - Generate vehicle reports
export async function GET(request: NextRequest) {
  try {
  let session = await getServerSession(authOptions)

    // Development-only override: allow testing endpoints locally by passing
    // ?_devUserId=<id> when NODE_ENV !== 'production'. This avoids needing to
    // copy auth cookies for quick smoke tests. It will not run in production.
  // normalize session user shape for downstream usage and permission helpers
  const currentUser = session?.user as any

  if (!currentUser?.id) {
      try {
        const { searchParams } = new URL(request.url)
        const devUserId = searchParams.get('_devUserId')
        if (devUserId && process.env.NODE_ENV !== 'production') {
          session = { user: { id: devUserId } } as any
        }
      } catch (e) {
        // ignore
      }
    }

    // re-evaluate currentUser after potential dev override
    const currentUserAfter = session?.user as any
    if (!currentUserAfter?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validatedQuery = ReportQuerySchema.parse(queryParams)

    const { reportType, dateFrom, dateTo, vehicleId, driverId, businessId, ownershipType } = validatedQuery

    // Build base date filter
    const dateFilter = dateFrom || dateTo ? {
      gte: dateFrom ? new Date(dateFrom) : undefined,
      lte: dateTo ? new Date(dateTo) : undefined
    } : undefined

    let reportData: any = {}

    switch (reportType) {
      case 'FLEET_OVERVIEW':
        reportData = await generateFleetOverviewReport(vehicleId, businessId, ownershipType)
        break

      case 'MILEAGE_SUMMARY':
        reportData = await generateMileageSummaryReport(dateFilter, vehicleId, driverId, businessId)
        break

      case 'EXPENSE_SUMMARY':
        reportData = await generateExpenseSummaryReport(dateFilter, vehicleId, businessId)
        break

      case 'MAINTENANCE_SCHEDULE':
        reportData = await generateMaintenanceScheduleReport(vehicleId)
        break

      case 'COMPLIANCE_ALERTS':
        reportData = await generateComplianceAlertsReport(vehicleId, driverId)
        break

      case 'DRIVER_ACTIVITY':
        reportData = await generateDriverActivityReport(dateFilter, driverId, vehicleId)
        break

      case 'BUSINESS_ATTRIBUTION':
        reportData = await generateBusinessAttributionReport(dateFilter, businessId, vehicleId)
        break

      case 'REIMBURSEMENT_SUMMARY':
        reportData = await generateReimbursementSummaryReport(dateFilter, businessId, currentUserAfter.id)
        break

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      reportType,
      generatedAt: new Date().toISOString(),
      filters: validatedQuery,
      data: reportData
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error generating vehicle report:', error)
    return NextResponse.json(
      { error: 'Failed to generate vehicle report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Fleet Overview Report
async function generateFleetOverviewReport(vehicleId?: string, businessId?: string, ownershipType?: string) {
  const vehicleFilter: any = {}
  if (vehicleId) vehicleFilter.id = vehicleId
  if (businessId) vehicleFilter.businessId = businessId
  if (ownershipType) vehicleFilter.ownershipType = ownershipType
  // Build driver filter to allow counting drivers relevant to the current fleet filter
  const driverFilter: any = {}
  if (vehicleId) {
    // Drivers authorized for a specific vehicle
    driverFilter.authorizations = { some: { vehicleId: vehicleId, isActive: true } }
  } else if (businessId) {
    // Drivers authorized for any vehicle belonging to the business
    // relation name in Prisma schema is 'vehicles' on DriverAuthorization
    driverFilter.authorizations = { some: { vehicles: { businessId: businessId }, isActive: true } }
  }

  const [vehicles, totalTrips, totalExpenses, maintenanceRecords, totalDrivers, activeDrivers] = await Promise.all([
    prisma.vehicle.findMany({
      where: vehicleFilter,
      include: {
        // schema relation names are pluralized
        businesses: { select: { name: true, type: true } },
        users: { select: { name: true, email: true } }
      }
    }),
    prisma.vehicleTrip.count({ where: vehicleFilter.id ? { vehicleId: vehicleFilter.id } : {} }),
    prisma.vehicleExpense.aggregate({
      where: vehicleFilter.id ? { vehicleId: vehicleFilter.id } : {},
      _sum: { amount: true },
      _count: true
    }),
    prisma.vehicleMaintenanceRecord.count({
      where: vehicleFilter.id ? { vehicleId: vehicleFilter.id } : {}
    })
    , // end maintenanceRecords entry
    // Driver counts
    prisma.vehicleDriver.count({ where: driverFilter }),
    prisma.vehicleDriver.count({ where: { ...driverFilter, isActive: true } })
  ])

  return {
    summary: {
      totalVehicles: vehicles.length,
      activeVehicles: vehicles.filter(v => v.isActive).length,
      personalVehicles: vehicles.filter(v => v.ownershipType === 'PERSONAL').length,
      businessVehicles: vehicles.filter(v => v.ownershipType === 'BUSINESS').length,
      totalTrips,
      totalExpenses: totalExpenses._sum.amount || 0,
      totalMaintenanceRecords: maintenanceRecords
      ,
      totalDrivers,
      activeDrivers
    },
    vehicles: vehicles.map(vehicle => ({
      ...vehicle,
      totalMileage: vehicle.currentMileage
    }))
  }
}

// Mileage Summary Report
async function generateMileageSummaryReport(dateFilter?: any, vehicleId?: string, driverId?: string, businessId?: string) {
  const tripFilter: any = {}
  if (dateFilter) tripFilter.startTime = dateFilter
  if (vehicleId) tripFilter.vehicleId = vehicleId
  if (driverId) tripFilter.driverId = driverId
  if (businessId) tripFilter.businessId = businessId

  const trips = await prisma.vehicleTrip.findMany({
    where: tripFilter,
    include: {
      vehicles: { select: { licensePlate: true, make: true, model: true, ownershipType: true } },
      // relation on VehicleTrip for driver is 'vehicleDrivers'
      vehicleDrivers: { select: { fullName: true } },
      businesses: { select: { name: true } }
    }
  })

  // remap to legacy keys expected by callers (vehicle, driver, business)
  const normalizedTrips = trips.map(t => ({
    ...t,
    vehicle: (t as any).vehicles,
    driver: (t as any).vehicleDrivers,
    business: (t as any).businesses
  }))

  const summary = normalizedTrips.reduce((acc, trip) => {
    acc.totalMileage += trip.tripMileage
    acc.businessMileage += trip.tripType === 'BUSINESS' ? trip.tripMileage : 0
    acc.personalMileage += trip.tripType === 'PERSONAL' ? trip.tripMileage : 0
    acc.mixedMileage += trip.tripType === 'MIXED' ? trip.tripMileage : 0
    return acc
  }, {
    totalMileage: 0,
    businessMileage: 0,
    personalMileage: 0,
    mixedMileage: 0,
    totalTrips: trips.length
  })

  return { summary, trips: normalizedTrips }
}

// Expense Summary Report
async function generateExpenseSummaryReport(dateFilter?: any, vehicleId?: string, businessId?: string) {
  const expenseFilter: any = {}
  if (dateFilter) expenseFilter.expenseDate = dateFilter
  if (vehicleId) expenseFilter.vehicleId = vehicleId
  if (businessId) expenseFilter.businessId = businessId

  const expenses = await prisma.vehicleExpense.findMany({
    where: expenseFilter,
    include: {
      vehicles: { select: { licensePlate: true, make: true, model: true } },
      businesses: { select: { name: true } }
    }
  })
  const normalizedExpenses = expenses.map(e => ({ ...e, vehicle: (e as any).vehicles, business: (e as any).businesses }))

  const summary = normalizedExpenses.reduce((acc, expense) => {
    const amt = Number(expense.amount ?? 0)
    acc.totalAmount += amt
    acc.businessDeductible += expense.isBusinessDeductible ? amt : 0
    acc.byType[expense.expenseType] = (acc.byType[expense.expenseType] || 0) + amt
    return acc
  }, {
    totalAmount: 0,
    businessDeductible: 0,
    totalExpenses: expenses.length,
    byType: {} as Record<string, number>
  })

  return { summary, expenses: normalizedExpenses }
}

// Maintenance Schedule Report
async function generateMaintenanceScheduleReport(vehicleId?: string) {
  const maintenanceFilter: any = {}
  if (vehicleId) maintenanceFilter.vehicleId = vehicleId

  const [upcomingMaintenance, overdueMaintenance, recentMaintenance] = await Promise.all([
    // Upcoming maintenance (next 30 days)
    prisma.vehicleMaintenanceRecord.findMany({
      where: {
        ...maintenanceFilter,
        nextServiceDue: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
          vehicles: { select: { licensePlate: true, make: true, model: true, currentMileage: true } }
      }
    }),
    // Overdue maintenance
    prisma.vehicleMaintenanceRecord.findMany({
      where: {
        ...maintenanceFilter,
        nextServiceDue: {
          lt: new Date()
        }
      },
      include: {
          vehicles: { select: { licensePlate: true, make: true, model: true, currentMileage: true } }
      }
    }),
    // Recent maintenance (last 90 days)
    prisma.vehicleMaintenanceRecord.findMany({
      where: {
        ...maintenanceFilter,
        serviceDate: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
          vehicles: { select: { licensePlate: true, make: true, model: true } }
      },
      orderBy: { serviceDate: 'desc' }
    })
  ])

    // normalize maintenance entries to expose legacy 'vehicle' key
    const normalizeMaintenance = (m: any) => ({ ...m, vehicle: m.vehicles })

  return {
    summary: {
      upcomingCount: upcomingMaintenance.length,
      overdueCount: overdueMaintenance.length,
      recentCount: recentMaintenance.length
    },
    upcomingMaintenance: upcomingMaintenance.map(normalizeMaintenance),
    overdueMaintenance: overdueMaintenance.map(normalizeMaintenance),
    recentMaintenance: recentMaintenance.map(normalizeMaintenance)
  }
}

// Compliance Alerts Report
async function generateComplianceAlertsReport(vehicleId?: string, driverId?: string) {
  const vehicleFilter: any = {}
  if (vehicleId) vehicleFilter.id = vehicleId

  const driverFilter: any = {}
  if (driverId) driverFilter.id = driverId

  const [expiringLicenses, expiringDriverLicenses, inactiveAuthorizations] = await Promise.all([
    // Vehicle licenses expiring in 60 days
    prisma.vehicleLicense.findMany({
      where: {
        // relation name is 'vehicles' on VehicleLicense
        vehicles: vehicleFilter,
        isActive: true,
        expiryDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
          vehicles: { select: { licensePlate: true, make: true, model: true } }
      }
    }),
    // Driver licenses expiring in 60 days
    prisma.vehicleDriver.findMany({
      where: {
        ...driverFilter,
        isActive: true,
        licenseExpiry: {
          gte: new Date(),
          lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        }
      }
    }),
    // Expired or inactive driver authorizations
    prisma.driverAuthorization.findMany({
      where: {
        // relation name is 'vehicleDrivers' on DriverAuthorization
        vehicleDrivers: driverFilter,
        OR: [
          { isActive: false },
          {
            expiryDate: {
              lt: new Date()
            }
          }
        ]
      },
      include: {
        // relation field name for driver on DriverAuthorization is 'vehicleDrivers'
        vehicleDrivers: { select: { fullName: true } },
        vehicles: { select: { licensePlate: true, make: true, model: true } }
      }
    })
  ])

  // remap legacy keys
  const remapExpiringLicenses = expiringLicenses.map(e => ({ ...e, vehicle: (e as any).vehicles }))
  const remapInactiveAuths = inactiveAuthorizations.map(a => ({ ...a, driver: (a as any).vehicleDrivers, vehicle: (a as any).vehicles }))

  return {
    summary: {
      expiringLicensesCount: remapExpiringLicenses.length,
      expiringDriverLicensesCount: expiringDriverLicenses.length,
      inactiveAuthorizationsCount: remapInactiveAuths.length
    },
    expiringLicenses: remapExpiringLicenses,
    expiringDriverLicenses,
    inactiveAuthorizations: remapInactiveAuths
  }
}

// Driver Activity Report
async function generateDriverActivityReport(dateFilter?: any, driverId?: string, vehicleId?: string) {
  const tripFilter: any = {}
  if (dateFilter) tripFilter.startTime = dateFilter
  if (driverId) tripFilter.driverId = driverId
  if (vehicleId) tripFilter.vehicleId = vehicleId

  const driverActivity = await prisma.vehicleDriver.findMany({
    where: driverId ? { id: driverId } : { isActive: true },
    include: {
      vehicleTrips: {
        where: {
          startTime: dateFilter
        },
        include: {
          vehicles: { select: { licensePlate: true, make: true, model: true } }
        }
      },
      driverAuthorizations: {
        where: { isActive: true },
        include: {
          vehicles: { select: { licensePlate: true, make: true, model: true } }
        }
      }
    }
  })

  return driverActivity.map(driver => ({
    driver: {
      id: driver.id,
      fullName: driver.fullName,
      licenseNumber: driver.licenseNumber
    },
    summary: {
      totalTrips: (driver as any).vehicleTrips?.length || 0,
      totalMileage: ((driver as any).vehicleTrips || []).reduce((sum: number, trip: any) => sum + (trip.tripMileage || 0), 0),
      authorizedVehicles: (driver as any).driverAuthorizations?.length || 0
    },
    // normalize nested vehicle keys for callers
    trips: ((driver as any).vehicleTrips || []).map((t: any) => ({ ...t, vehicle: t.vehicles })),
    authorizations: ((driver as any).driverAuthorizations || []).map((a: any) => ({ ...a, vehicle: a.vehicles }))
  }))
}

// Business Attribution Report
async function generateBusinessAttributionReport(dateFilter?: any, businessId?: string, vehicleId?: string) {
  const tripFilter: any = { tripType: 'BUSINESS' }
  if (dateFilter) tripFilter.startTime = dateFilter
  if (businessId) tripFilter.businessId = businessId
  if (vehicleId) tripFilter.vehicleId = vehicleId

  const businessTrips = await prisma.vehicleTrip.findMany({
    where: tripFilter,
    include: {
      vehicles: { select: { licensePlate: true, make: true, model: true, ownershipType: true } },
      businesses: { select: { name: true, type: true } },
      vehicle_expenses: true
    }
  })
  const normalizedBusinessTrips = businessTrips.map(t => ({ ...t, vehicle: (t as any).vehicles, business: (t as any).businesses, expenses: (t as any).vehicle_expenses }))

  const businessSummary = normalizedBusinessTrips.reduce((acc, trip) => {
    const businessName = trip.business?.name || 'Unassigned'
    if (!acc[businessName]) {
      acc[businessName] = {
        totalTrips: 0,
        totalMileage: 0,
        totalExpenses: 0
      }
    }
    acc[businessName].totalTrips++
    acc[businessName].totalMileage += trip.tripMileage
    acc[businessName].totalExpenses += (trip.expenses || []).reduce((sum: number, exp: any) => sum + Number(exp.amount ?? 0), 0)
    return acc
  }, {} as Record<string, any>)

  return {
    summary: businessSummary,
    trips: normalizedBusinessTrips
  }
}

// Reimbursement Summary Report
async function generateReimbursementSummaryReport(dateFilter?: any, businessId?: string, userId?: string) {
  const reimbursementFilter: any = {}
  if (dateFilter) reimbursementFilter.submissionDate = dateFilter
  if (businessId) reimbursementFilter.businessId = businessId
  if (userId) reimbursementFilter.userId = userId

  const reimbursements = await prisma.vehicleReimbursement.findMany({
    where: reimbursementFilter,
    include: {
      // use generated relation name for user relation and plural relation names
      users_vehicle_reimbursements_userIdTousers: { select: { name: true, email: true } },
      vehicles: { select: { licensePlate: true, make: true, model: true } },
      businesses: { select: { name: true } }
    }
  })
  const normalizedReimbursements = reimbursements.map(r => ({ ...r, user: (r as any).users_vehicle_reimbursements_userIdTousers, vehicle: (r as any).vehicles, business: (r as any).businesses }))

  const summary = normalizedReimbursements.reduce((acc, reimb) => {
    acc.totalAmount += Number(reimb.totalAmount ?? 0)
    acc.totalMileage += reimb.totalMileage || 0
    acc.businessMileage += reimb.businessMileage || 0
    acc.byStatus[reimb.status] = (acc.byStatus[reimb.status] || 0) + 1
    return acc
  }, {
    totalAmount: 0,
    totalMileage: 0,
    businessMileage: 0,
    totalReimbursements: normalizedReimbursements.length,
    byStatus: {} as Record<string, number>
  })

  return { summary, reimbursements: normalizedReimbursements }
}