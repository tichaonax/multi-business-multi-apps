const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testVehicleQueries() {
  try {
    console.log('🚗 Testing Vehicles API Prisma Queries')
    console.log('====================================\n')

    // Test the main vehicles query that was failing
    console.log('🚗 Testing Vehicles query with relations...')
    
    const vehicles = await prisma.vehicles.findMany({
      include: {
        businesses: {
          select: { id: true, name: true, type: true }
        },
        users: {
          select: { id: true, name: true, email: true }
        },
        vehicle_licenses: {
          where: { isActive: true },
          orderBy: { expiryDate: 'asc' }
        },
        vehicle_trips: {
          take: 5,
          orderBy: { startTime: 'desc' },
          include: {
            vehicle_drivers: {
              select: { id: true, fullName: true }
            }
          }
        },
        vehicle_maintenance_records: {
          take: 5,
          orderBy: { serviceDate: 'desc' }
        },
        vehicle_expenses: {
          take: 3
        }
      },
      take: 5
    })

    console.log(`✅ Found ${vehicles.length} vehicles`)
    
    if (vehicles.length > 0) {
      console.log('\n🚗 Sample vehicle data:')
      vehicles.forEach((vehicle, idx) => {
        console.log(`   ${idx + 1}. ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`)
        console.log(`      - Business: ${vehicle.businesses?.name || 'Personal'}`)
        console.log(`      - User: ${vehicle.users?.name || 'None'}`)
        console.log(`      - Licenses: ${vehicle.vehicle_licenses?.length || 0}`)
        console.log(`      - Trips: ${vehicle.vehicle_trips?.length || 0}`)
        console.log(`      - Maintenance: ${vehicle.vehicle_maintenance_records?.length || 0}`)
        console.log(`      - Expenses: ${vehicle.vehicle_expenses?.length || 0}`)
      })
    } else {
      console.log('   No vehicles found - database is clean')
    }

    console.log('\n🧮 Testing count queries...')
    const counts = {
      vehicles: await prisma.vehicles.count(),
      vehicleDrivers: await prisma.vehicleDrivers.count(),
      vehicleTrips: await prisma.vehicleTrips.count(),
      vehicleLicenses: await prisma.vehicleLicenses.count(),
      vehicleMaintenanceRecords: await prisma.vehicleMaintenanceRecords.count(),
      vehicleExpenses: await prisma.vehicleExpenses.count(),
      driverAuthorizations: await prisma.driverAuthorizations.count()
    }

    console.log(`   🚗 Vehicles: ${counts.vehicles}`)
    console.log(`   🚚 Vehicle Drivers: ${counts.vehicleDrivers}`)
    console.log(`   🛣️ Vehicle Trips: ${counts.vehicleTrips}`)
    console.log(`   📄 Vehicle Licenses: ${counts.vehicleLicenses}`)
    console.log(`   🔧 Maintenance Records: ${counts.vehicleMaintenanceRecords}`)
    console.log(`   💰 Vehicle Expenses: ${counts.vehicleExpenses}`)
    console.log(`   📜 Driver Authorizations: ${counts.driverAuthorizations}`)

    console.log('\n🔍 Testing vehicle drivers query...')
    const drivers = await prisma.vehicleDrivers.findMany({
      include: {
        vehicle_trips: true,
        driver_authorizations: {
          include: {
            vehicles: true
          }
        }
      },
      take: 3
    })

    console.log(`✅ Found ${drivers.length} vehicle drivers`)
    drivers.forEach(driver => {
      const trips = driver.vehicle_trips?.length || 0
      const auths = driver.driver_authorizations?.length || 0
      console.log(`   - ${driver.fullName}: ${trips} trips, ${auths} authorizations`)
    })

    console.log('\n📄 Testing vehicle licenses query...')
    const licenses = await prisma.vehicleLicenses.findMany({
      include: {
        vehicles: true
      },
      take: 3
    })

    console.log(`✅ Found ${licenses.length} vehicle licenses`)
    licenses.forEach(license => {
      console.log(`   - ${license.licenseType} (${license.licenseNumber}) for ${license.vehicles.make} ${license.vehicles.model}`)
    })

    console.log('\n🛣️ Testing vehicle trips query...')
    const trips = await prisma.vehicleTrips.findMany({
      include: {
        vehicles: true,
        vehicle_drivers: true
      },
      take: 3
    })

    console.log(`✅ Found ${trips.length} vehicle trips`)
    trips.forEach(trip => {
      const vehicle = `${trip.vehicles.make} ${trip.vehicles.model}`
      const driver = trip.vehicle_drivers.fullName
      console.log(`   - ${vehicle} driven by ${driver} (${trip.tripMileage}km)`)
    })

    console.log('\n✅ All vehicle API queries completed successfully!')
    console.log('🎯 The relation name fixes are working correctly.')

  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error.message.includes('vehicleLicense')) {
      console.error('💡 Still have vehicleLicense relation name issues')
    }
    if (error.message.includes('vehicleTrip')) {
      console.error('💡 Still have vehicleTrip relation name issues')
    }
    if (error.message.includes('vehicleDriver')) {
      console.error('💡 Still have vehicleDriver relation name issues') 
    }
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
if (require.main === module) {
  testVehicleQueries()
    .then(() => {
      console.log('\n🚀 Vehicle API query test completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Vehicle API query test failed:', error)
      process.exit(1)
    })
}

module.exports = { testVehicleQueries }