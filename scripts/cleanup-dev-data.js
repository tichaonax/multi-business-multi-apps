const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function cleanup() {
  try {
    if (process.env.CLEANUP_CONFIRM !== 'YES') {
      console.log('Safety check: To run cleanup set CLEANUP_CONFIRM=YES in the environment.')
      console.log('Example: CLEANUP_CONFIRM=YES node scripts/cleanup-dev-data.js')
      process.exit(0)
    }

    console.log('Starting cleanup of dev-seeded data...')

    // Gather full records to delete for a reversible backup
    const maintenanceToDelete = await prisma.vehicleMaintenanceRecord.findMany({ where: { createdBy: { in: ['dev-user-1'] } } })
    const licensesToDelete = await prisma.vehicleLicense.findMany({ where: { vehicleId: { in: ['dev-vehicle-1', 'dev-vehicle-2'] } } })
    const authsToDelete = await prisma.driverAuthorization.findMany({ where: { driverId: { in: ['dev-driver-1', 'dev-driver-2', 'dev-driver-3'] } } })
    const tripsToDelete = await prisma.vehicleTrip.findMany({ where: { vehicleId: { in: ['dev-vehicle-1', 'dev-vehicle-2'] } } })
    const driversToDelete = await prisma.vehicleDriver.findMany({ where: { id: { in: ['dev-driver-1', 'dev-driver-2', 'dev-driver-3'] } } })
    const vehiclesToDelete = await prisma.vehicle.findMany({ where: { id: { in: ['dev-vehicle-1', 'dev-vehicle-2'] } } })
    const usersToDelete = await prisma.user.findMany({ where: { id: 'dev-user-1' } })

    const backup = {
      createdAt: new Date().toISOString(),
      maintenanceRecords: maintenanceToDelete,
      licenses: licensesToDelete,
      driverAuthorizations: authsToDelete,
      trips: tripsToDelete,
      drivers: driversToDelete,
      vehicles: vehiclesToDelete,
      users: usersToDelete
    }

    const fs = require('fs')
    const path = require('path')
    const backupFile = path.join(process.cwd(), 'scripts', `cleanup-backup-${Date.now()}.json`)
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))
    console.log('Backup written to', backupFile)

    // Perform deletions
  // Perform deletions using the IDs from the backed-up records
  // Order matters to avoid FK constraint errors: trips & maintenance (depend on vehicles/drivers) first
  const delTrips = await prisma.vehicleTrip.deleteMany({ where: { id: { in: backup.trips.map(r => r.id) } } })
  const delMaintenance = await prisma.vehicleMaintenanceRecord.deleteMany({ where: { id: { in: backup.maintenanceRecords.map(r => r.id) } } })
  // Then delete authorizations and licenses
  const delAuths = await prisma.driverAuthorization.deleteMany({ where: { id: { in: backup.driverAuthorizations.map(r => r.id) } } })
  const delLicenses = await prisma.vehicleLicense.deleteMany({ where: { id: { in: backup.licenses.map(r => r.id) } } })
  // Then drivers, vehicles, and finally users
  const delDrivers = await prisma.vehicleDriver.deleteMany({ where: { id: { in: backup.drivers.map(r => r.id) } } })
  const delVehicles = await prisma.vehicle.deleteMany({ where: { id: { in: backup.vehicles.map(r => r.id) } } })
  const delUser = await prisma.user.deleteMany({ where: { id: { in: backup.users.map(r => r.id) } } })

  // --- Restaurant cleanup ---
  // Remove products/variants/stock movements created for restaurant-demo
  const demoBusinessId = 'restaurant-demo'
    const demoProducts = await prisma.businessProduct.findMany({ where: { businessId: demoBusinessId } })
    const demoProductIds = demoProducts.map(p => p.id)
    const demoVariantIds = await prisma.productVariant.findMany({ where: { productId: { in: demoProductIds } }, select: { id: true } }).then(rows => rows.map(r => r.id))

    const delOrderItemsDemo = await prisma.businessOrderItem.deleteMany({ where: { productVariant: { product: { businessId: demoBusinessId } } } }).catch(() => ({ count: 0 }))
    const delOrdersDemo = await prisma.businessOrder.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => ({ count: 0 }))
    const delStockMovementsDemo = await prisma.businessStockMovement.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => ({ count: 0 }))
    const delVariantsDemo = await prisma.productVariant.deleteMany({ where: { id: { in: demoVariantIds } } }).catch(() => ({ count: 0 }))
    const delAttrsDemo = await prisma.productAttribute.deleteMany({ where: { productId: { in: demoProductIds } } }).catch(() => ({ count: 0 }))
    const delProductsDemo = await prisma.businessProduct.deleteMany({ where: { id: { in: demoProductIds } } }).catch(() => ({ count: 0 }))
    const delCategoriesDemo = await prisma.businessCategory.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => ({ count: 0 }))
    const delBusinessDemo = await prisma.business.deleteMany({ where: { id: demoBusinessId } }).catch(() => ({ count: 0 }))

    // Also remove orders created for named restaurant HXI EATS (some scripts target that business)
    const hxi = await prisma.business.findFirst({ where: { name: { contains: 'HXI', mode: 'insensitive' }, type: 'restaurant' } })
    let delOrderItemsHxi = { count: 0 }
    let delOrdersHxi = { count: 0 }
    if (hxi) {
      delOrderItemsHxi = await prisma.businessOrderItem.deleteMany({ where: { order: { businessId: hxi.id } } }).catch(() => ({ count: 0 }))
      delOrdersHxi = await prisma.businessOrder.deleteMany({ where: { businessId: hxi.id } }).catch(() => ({ count: 0 }))
    }

  console.log('Cleanup results:', { delMaintenance, delLicenses, delAuths, delTrips, delDrivers, delVehicles, delUser, delOrderItemsDemo, delOrdersDemo, delStockMovementsDemo, delVariantsDemo, delAttrsDemo, delProductsDemo, delCategoriesDemo, delBusinessDemo, delOrderItemsHxi, delOrdersHxi })
  } catch (err) {
    console.error('Cleanup failed:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

cleanup()
