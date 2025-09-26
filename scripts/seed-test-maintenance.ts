import { prisma } from '../src/lib/prisma'

async function seed() {
  try {
    // Ensure there's a vehicle to attach to. Try to find one by id first
    const vehicleId = 'dev-vehicle-1'

    let vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } })

    if (!vehicle) {
      // Create a minimal vehicle so we can attach maintenance
      vehicle = await prisma.vehicle.create({
        data: {
          id: vehicleId,
          licensePlate: 'DEV-123',
          make: 'DevCar',
          model: 'LocalTest',
          year: 2022,
          vin: 'DEVVIN0001',
          driveType: 'FWD' as any,
          currentMileage: 10000,
          // ownershipType is an enum in the Prisma schema; cast to any to avoid TS issues in the seed script
          ownershipType: 'OWNED' as any
        }
      })
      console.log('Created test vehicle:', vehicle.id)
    } else {
      console.log('Found existing vehicle:', vehicle.id)
    }

    const record = await prisma.vehicleMaintenanceRecord.create({
      data: {
        vehicleId: vehicle.id,
        serviceType: 'ROUTINE' as any,
        serviceName: 'Dev seed - oil change',
        serviceProvider: 'Dev Garage',
        serviceDate: new Date('2025-09-01'),
        mileageAtService: 10000,
        nextServiceDue: new Date('2025-12-01'),
        nextServiceMileage: 12000,
        serviceCost: 59.99,
        // currency is not part of the vehicleMaintenanceRecord input in current schema; omit
        warrantyInfo: null,
        receiptUrl: null,
        notes: 'Seeded via scripts/seed-test-maintenance.ts',
        isScheduledService: false,
        createdBy: 'dev-user-1'
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
