const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seed() {
  try {
    const vehicleId = 'dev-vehicle-1'

    // Ensure a creator user exists
    const creatorId = 'dev-user-1'
    let user = await prisma.users.findUnique({ where: { id: creatorId } })
    if (!user) {
      user = await prisma.users.create({
        data: {
          id: creatorId,
          name: 'Dev User',
          email: 'dev+seed@example.com',
          // Minimal placeholder password hash for seed user
          passwordHash: 'dev-seed-placeholder'
        }
      })
      console.log('Created test user:', user.id)
    } else {
      console.log('Found existing user:', user.id)
    }

    let vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } })

    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: {
          id: vehicleId,
          licensePlate: 'DEV-123',
          vin: 'DEVVIN0001',
          make: 'DevCar',
          model: 'LocalTest',
          year: 2022,
          driveType: 'LEFT_HAND',
          currentMileage: 10000,
          updatedAt: new Date(),
          ownershipType: 'PERSONAL'
        }
      })
      console.log('Created test vehicle:', vehicle.id)
    } else {
      console.log('Found existing vehicle:', vehicle.id)
    }

    const record = await prisma.vehicleMaintenanceRecord.create({
      data: {
        id: 'dev-vehicle-maintenance-1',
        vehicleId: vehicle.id,
        serviceType: 'OIL_CHANGE',
        serviceName: 'Dev seed - oil change',
        serviceProvider: 'Dev Garage',
        serviceDate: new Date('2025-09-01'),
        mileageAtService: 10000,
        nextServiceDue: new Date('2025-12-01'),
        nextServiceMileage: 12000,
        serviceCost: 59.99,
        warrantyInfo: null,
        receiptUrl: null,
        notes: 'Seeded via scripts/seed-test-maintenance.js',
        isScheduledService: false,
        createdBy: user.id,
        updatedAt: new Date()
      }
    })

    console.log('Created maintenance record:', record.id)
  } catch (err) {
    console.error('Seeding failed:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

seed()
