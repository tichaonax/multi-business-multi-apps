const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { execSync } = require('child_process')

async function upsertUser(id) {
  const existing = await prisma.users.findUnique({ where: { id } })
  if (existing) return existing
  return prisma.users.create({ data: { id, name: 'Dev User', email: `dev+${id}@example.com`, passwordHash: 'dev-seed-placeholder' } })
}

async function upsertVehicle(id, plate, vin) {
  const existing = await prisma.vehicles.findUnique({ where: { id } })
  if (existing) return existing
  return prisma.vehicles.create({
    data: {
      id,
      licensePlate: plate,
      vin,
      make: 'DevCar',
      model: 'LocalTest',
      year: 2022,
      driveType: 'LEFT_HAND',
      currentMileage: 10000,
      updatedAt: new Date(),
      ownershipType: 'PERSONAL'
    }
  })
}

async function upsertDriver(id, fullName, licenseNumber, licenseCountryOfIssuance = 'US') {
  const existing = await prisma.vehicleDrivers.findUnique({ where: { id } })
  if (existing) return existing
  const now = new Date()
  return prisma.vehicleDrivers.create({
    data: {
      id,
      fullName,
      licenseNumber,
      licenseExpiry: new Date('2026-12-31'),
      licenseCountryOfIssuance,
      isActive: true,
      createdAt: now,
      updatedAt: now
    }
  })
}

async function ensureAuthorization(driverId, vehicleId, authorizerId) {
  const existing = await prisma.driverAuthorizations.findUnique({ where: { driverId_vehicleId: { driverId, vehicleId } } }).catch(() => null)
  if (existing) return existing
  const now = new Date()
  return prisma.driverAuthorizations.create({
    data: {
      id: `auth-${driverId}-${vehicleId}-${Date.now()}`,
      driverId,
      vehicleId,
      authorizedBy: authorizerId,
      authorizedDate: new Date(),
      expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      authorizationLevel: 'BASIC',
      notes: 'Seeded authorization',
      createdAt: now,
      updatedAt: now
    }
  })
}

async function createMaintenance(data) {
  const now = new Date()
  const id = data.id || `dev-maint-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
  return prisma.vehicleMaintenanceRecords.create({
    data: {
      id,
      ...data,
      updatedAt: data.updatedAt || now,
      // createdAt has a default in schema, so only set if provided
      createdAt: data.createdAt || data.createdAt
    }
  })
}

async function createTrip(data) {
  const now = new Date()
  const id = data.id || `dev-trip-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
  return prisma.vehicleTrips.create({
    data: {
      id,
      ...data,
      updatedAt: data.updatedAt || now,
      createdAt: data.createdAt || data.createdAt
    }
  })
}

async function seed() {
  try {
    const user = await upsertUser('dev-user-1')

    // Vehicles
    const v1 = await upsertVehicle('dev-vehicle-1', 'DEV-123', 'DEVVIN0001')
    const v2 = await upsertVehicle('dev-vehicle-2', 'DEV-456', 'DEVVIN0002')

    // Drivers
    const d1 = await upsertDriver('dev-driver-1', 'Alice Developer', 'DL-ALICE-001')
    const d2 = await upsertDriver('dev-driver-2', 'Bob Developer', 'DL-BOB-002')

    // Authorizations (required by VehicleTrip relation)
    await ensureAuthorization(d1.id, v1.id, user.id)
    await ensureAuthorization(d2.id, v2.id, user.id)

    // Maintenance records - varied
    const now = new Date()
    const pastDate1 = new Date(now);
    pastDate1.setMonth(now.getMonth() - 2)

    const pastDate2 = new Date(now);
    pastDate2.setMonth(now.getMonth() - 1)

    const upcoming1 = new Date(now);
    upcoming1.setDate(now.getDate() + 20)

    const upcoming2 = new Date(now);
    upcoming2.setMonth(now.getMonth() + 2)

    const m1 = await createMaintenance({
      vehicleId: v1.id,
      serviceType: 'OIL_CHANGE',
      serviceName: 'Oil change - seed A',
      serviceDate: pastDate1,
      mileageAtService: 9500,
      nextServiceDue: upcoming1,
      nextServiceMileage: 12000,
      serviceCost: 49.99,
      serviceProvider: 'Seed Garage A',
      warrantyInfo: null,
      notes: 'Past oil change',
      isScheduledService: false,
      createdBy: user.id
    })

    const m2 = await createMaintenance({
      vehicleId: v1.id,
      serviceType: 'TIRE_REPLACEMENT',
      serviceName: 'Tire replacement - seed B',
      serviceDate: pastDate2,
      mileageAtService: 9800,
      nextServiceDue: null,
      nextServiceMileage: null,
      serviceCost: 299.0,
      serviceProvider: 'Seed Tires',
      warrantyInfo: '12 months',
      notes: 'Replaced tires',
      isScheduledService: false,
      createdBy: user.id
    })

    const m3 = await createMaintenance({
      vehicleId: v2.id,
      serviceType: 'BRAKE_SERVICE',
      serviceName: 'Brake check - upcoming',
      serviceDate: now,
      mileageAtService: 10050,
      nextServiceDue: upcoming2,
      nextServiceMileage: 14000,
      serviceCost: 120.0,
      serviceProvider: 'Seed Brakes',
      warrantyInfo: null,
      notes: 'Scheduled brake inspection',
      isScheduledService: true,
      createdBy: user.id
    })

    const m4 = await createMaintenance({
      vehicleId: v2.id,
      serviceType: 'INSPECTION',
      serviceName: 'Annual inspection',
      serviceDate: new Date(now.getFullYear(), 0, 15),
      mileageAtService: 8000,
      nextServiceDue: new Date(now.getFullYear() + 1, 0, 15),
      nextServiceMileage: 20000,
      serviceCost: 80.0,
      serviceProvider: 'Seed Inspectors',
      warrantyInfo: 'Inspection certificate 2025',
      notes: 'Yearly safety inspection',
      isScheduledService: true,
      createdBy: user.id
    })

    // Recent trips for v1
    const trip1Start = new Date()
    trip1Start.setDate(now.getDate() - 3)
    const trip1End = new Date(trip1Start)
    trip1End.setHours(trip1End.getHours() + 2)

    const t1 = await createTrip({
      vehicleId: v1.id,
      driverId: d1.id,
      businessId: null,
      startMileage: 9400,
      endMileage: 9450,
      tripMileage: 50,
      tripPurpose: 'Client visit',
      tripType: 'BUSINESS',
      startLocation: 'Office',
      endLocation: 'Client HQ',
      startTime: trip1Start,
      endTime: trip1End,
      notes: 'Seed recent trip 1'
    })

    const trip2Start = new Date()
    trip2Start.setDate(now.getDate() - 1)
    const trip2End = new Date(trip2Start)
    trip2End.setHours(trip2End.getHours() + 1)

    const t2 = await createTrip({
      vehicleId: v1.id,
      driverId: d1.id,
      businessId: null,
      startMileage: 9450,
      endMileage: 9480,
      tripMileage: 30,
      tripPurpose: 'Supply run',
      tripType: 'BUSINESS',
      startLocation: 'Office',
      endLocation: 'Supplier',
      startTime: trip2Start,
      endTime: trip2End,
      notes: 'Seed recent trip 2'
    })

    // Upcoming maintenance should show from m1.nextServiceDue and m3.nextServiceDue

    console.log('Seed complete:')
    console.log(' Vehicles:', [v1.id, v2.id])
    console.log(' Drivers:', [d1.id, d2.id])
    console.log(' Maintenance created:', [m1.id, m2.id, m3.id, m4.id])
    console.log(' Trips created:', [t1.id, t2.id])
    
  // --- Compliance seeds ---
  // Vehicle license expiring tomorrow (HIGH urgency for quick UI testing)
  const licenseExpirySoon = new Date()
  licenseExpirySoon.setDate(now.getDate() + 1)

    const vl1 = await prisma.vehicleLicenses.create({
      data: {
        id: `vl-${v1.id}-${Date.now()}`,
        vehicleId: v1.id,
        licenseType: 'REGISTRATION',
        licenseNumber: 'REG-DEV-1',
        issuingAuthority: 'Dev Authority',
        issueDate: new Date(),
        expiryDate: licenseExpirySoon,
        isActive: true,
        renewalCost: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Make one driver's license expire soon
    const driverExpirySoon = new Date()
    driverExpirySoon.setDate(now.getDate() + 30)
    await prisma.vehicleDrivers.update({ where: { id: d2.id }, data: { licenseExpiry: driverExpirySoon } })

    // Create an expired/inactive authorization for a new driver
    const d3 = await upsertDriver('dev-driver-3', 'Eve Developer', 'DL-EVE-003')
    const expiredAuth = await prisma.driverAuthorizations.upsert({
      where: { driverId_vehicleId: { driverId: d3.id, vehicleId: v1.id } },
      update: {
        authorizedBy: user.id,
        authorizedDate: new Date(now.getFullYear() - 2, now.getMonth(), now.getDate()),
        expiryDate: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
        isActive: false,
        authorizationLevel: 'BASIC',
        notes: 'Seeded expired authorization (upsert)',
        updatedAt: new Date()
      },
      create: {
        id: `auth-${d3.id}-${v1.id}-${Date.now()}`,
        driverId: d3.id,
        vehicleId: v1.id,
        authorizedBy: user.id,
        authorizedDate: new Date(now.getFullYear() - 2, now.getMonth(), now.getDate()),
        expiryDate: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
        isActive: false,
        authorizationLevel: 'BASIC',
        notes: 'Seeded expired authorization',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Additional recent trips for v2 to show activity
    const trip3Start = new Date()
    trip3Start.setDate(now.getDate() - 4)
    const trip3End = new Date(trip3Start)
    trip3End.setHours(trip3End.getHours() + 1)

    const t3 = await createTrip({
      vehicleId: v2.id,
      driverId: d2.id,
      businessId: null,
      startMileage: 10050,
      endMileage: 10090,
      tripMileage: 40,
      tripPurpose: 'Team pickup',
      tripType: 'BUSINESS',
      startLocation: 'Depot',
      endLocation: 'Office',
      startTime: trip3Start,
      endTime: trip3End,
      notes: 'Seed recent trip v2'
    })

    const trip4Start = new Date()
    trip4Start.setDate(now.getDate() - 2)
    const trip4End = new Date(trip4Start)
    trip4End.setHours(trip4End.getHours() + 1)

    const t4 = await createTrip({
      vehicleId: v2.id,
      driverId: d2.id,
      businessId: null,
      startMileage: 10090,
      endMileage: 10120,
      tripMileage: 30,
      tripPurpose: 'Service visit',
      tripType: 'BUSINESS',
      startLocation: 'Office',
      endLocation: 'Service Center',
      startTime: trip4Start,
      endTime: trip4End,
      notes: 'Seed recent trip v2 - 2'
    })

    console.log('Compliance seeds: vehicleLicense', vl1.id, 'expiredAuth', expiredAuth.id)
    
    // --- Add an overdue maintenance record to surface HIGH-priority alerts ---
    const yesterday = new Date()
    yesterday.setDate(now.getDate() - 3)
    const overdueNextDue = new Date()
    overdueNextDue.setDate(now.getDate() - 1)

    const mOverdue = await createMaintenance({
      vehicleId: v1.id,
      serviceType: 'OTHER',
      serviceName: 'Overdue safety check',
      serviceDate: yesterday,
      mileageAtService: 9000,
      nextServiceDue: overdueNextDue,
      nextServiceMileage: 9500,
      serviceCost: 0,
      serviceProvider: 'Seed Safety',
      warrantyInfo: null,
      notes: 'Overdue maintenance seed',
      isScheduledService: false,
      createdBy: user.id
    })

    console.log('Added overdue maintenance:', mOverdue.id)

    // --- Restaurant demo seeds ---
    try {
      console.log('\n🍽️ Running restaurant demo seed scripts...')
      // Seed menu items / products + initial stock
      execSync('node scripts/seed-restaurant-demo.js', { stdio: 'inherit' })
      // Create some simple restaurant orders to exercise order flows
      execSync('node scripts/create-simple-restaurant-orders.js', { stdio: 'inherit' })
      // Optionally create more realistic orders
      // execSync('node scripts/create-real-restaurant-orders.js', { stdio: 'inherit' })
      console.log('🍽️ Restaurant demo scripts completed')
    } catch (e) {
      console.error('Error running restaurant demo seeds:', e)
    }
  } catch (err) {
    console.error('Seed failed:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

seed()
