const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function dryRunDataReset() {
  try {
    console.log('🧪 DRY RUN: Data Reset Analysis')
    console.log('===============================\n')
    
    console.log('📊 Current database counts:')
    
    // Get counts of what would be deleted
    const beforeCounts = {
      businesses: await prisma.businesses.count(),
      employees: await prisma.employees.count(),
      employeeContracts: await prisma.employeeContracts.count(),
      businessMemberships: await prisma.businessMemberships.count(),
      auditLogs: await prisma.auditLogs.count(),
      users: await prisma.users.count(),
      // Business data that would be deleted
      businessCustomers: await prisma.businessCustomers.count(),
      businessOrders: await prisma.businessOrders.count(),
      businessOrderItems: await prisma.businessOrderItems.count(),
      businessProducts: await prisma.businessProducts.count(),
      productVariants: await prisma.productVariants.count(),
      businessCategories: await prisma.businessCategories.count(),
      // Vehicle data
      vehicles: await prisma.vehicles.count(),
      vehicleDrivers: await prisma.vehicleDrivers.count(),
      vehicleTrips: await prisma.vehicleTrips.count(),
      vehicleMaintenanceRecords: await prisma.vehicleMaintenanceRecords.count(),
      driverAuthorizations: await prisma.driverAuthorizations.count(),
      // Reference data that will be reset and recreated
      idFormatTemplates: await prisma.idFormatTemplates.count(),
      compensationTypes: await prisma.compensationTypes.count(),
      jobTitles: await prisma.jobTitles.count(),
      benefitTypes: await prisma.benefitTypes.count(),
      driverLicenseTemplates: await prisma.driverLicenseTemplates.count(),
    }

    console.log(`   💼 Businesses: ${beforeCounts.businesses}`)
    console.log(`   👥 Employees: ${beforeCounts.employees}`)
    console.log(`   📋 Employee Contracts: ${beforeCounts.employeeContracts}`)
    console.log(`   🏢 Business Memberships: ${beforeCounts.businessMemberships}`)
    console.log(`   👤 Users: ${beforeCounts.users} (PRESERVED)`)
    console.log(`   📝 Audit Logs: ${beforeCounts.auditLogs} (PRESERVED)`)
    console.log(`   🛒 Business Customers: ${beforeCounts.businessCustomers}`)
    console.log(`   📦 Business Orders: ${beforeCounts.businessOrders}`)
    console.log(`   📋 Business Order Items: ${beforeCounts.businessOrderItems}`)
    console.log(`   🏷️  Business Products: ${beforeCounts.businessProducts}`)
    console.log(`   📊 Product Variants: ${beforeCounts.productVariants}`)
    console.log(`   📂 Business Categories: ${beforeCounts.businessCategories}`)
    console.log(`   🚗 Vehicles: ${beforeCounts.vehicles}`)
    console.log(`   🚚 Vehicle Drivers: ${beforeCounts.vehicleDrivers}`)
    console.log(`   🛣️  Vehicle Trips: ${beforeCounts.vehicleTrips}`)
    console.log(`   🔧 Maintenance Records: ${beforeCounts.vehicleMaintenanceRecords}`)
    console.log(`   📜 Driver Authorizations: ${beforeCounts.driverAuthorizations}`)
    console.log('\n📋 Reference data (will be deleted and recreated):')
    console.log(`   🆔 ID Format Templates: ${beforeCounts.idFormatTemplates}`)
    console.log(`   💰 Compensation Types: ${beforeCounts.compensationTypes}`)
    console.log(`   👔 Job Titles: ${beforeCounts.jobTitles}`)
    console.log(`   🎁 Benefit Types: ${beforeCounts.benefitTypes}`)
    console.log(`   🪪  Driver License Templates: ${beforeCounts.driverLicenseTemplates}`)

    // Get sample of data that would be deleted for preview
    console.log('\n🔍 Sample data that would be deleted:')
    
    const sampleBusinesses = await prisma.businesses.findMany({
      take: 3,
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    if (sampleBusinesses.length > 0) {
      console.log('   📊 Recent businesses:')
      sampleBusinesses.forEach(b => {
        console.log(`      - ${b.name} (${b.type}) [${b.id}] - ${b.createdAt.toDateString()}`)
      })
    }

    const sampleEmployees = await prisma.employees.findMany({
      take: 3,
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    if (sampleEmployees.length > 0) {
      console.log('   👥 Recent employees:')
      sampleEmployees.forEach(e => {
        console.log(`      - ${e.fullName} (${e.email}) [${e.id}] - ${e.createdAt.toDateString()}`)
      })
    }

    const sampleOrders = await prisma.businessOrders.findMany({
      take: 3,
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        status: true,
        businessType: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    if (sampleOrders.length > 0) {
      console.log('   📦 Recent orders:')
      sampleOrders.forEach(o => {
        console.log(`      - ${o.orderNumber} ($${o.totalAmount}) [${o.status}] ${o.businessType} - ${o.createdAt.toDateString()}`)
      })
    }

    const sampleVehicles = await prisma.vehicles.findMany({
      take: 3,
      select: {
        id: true,
        licensePlate: true,
        make: true,
        model: true,
        year: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    if (sampleVehicles.length > 0) {
      console.log('   🚗 Recent vehicles:')
      sampleVehicles.forEach(v => {
        console.log(`      - ${v.licensePlate} (${v.make} ${v.model} ${v.year}) [${v.id}] - ${v.createdAt.toDateString()}`)
      })
    }

    // Calculate totals
    const totalItemsToDelete = beforeCounts.businesses + 
                              beforeCounts.employees + 
                              beforeCounts.employeeContracts + 
                              beforeCounts.businessMemberships +
                              beforeCounts.businessCustomers +
                              beforeCounts.businessOrders +
                              beforeCounts.businessOrderItems +
                              beforeCounts.businessProducts +
                              beforeCounts.productVariants +
                              beforeCounts.businessCategories +
                              beforeCounts.vehicles +
                              beforeCounts.vehicleDrivers +
                              beforeCounts.vehicleTrips +
                              beforeCounts.vehicleMaintenanceRecords +
                              beforeCounts.driverAuthorizations +
                              beforeCounts.idFormatTemplates +
                              beforeCounts.compensationTypes +
                              beforeCounts.jobTitles +
                              beforeCounts.benefitTypes +
                              beforeCounts.driverLicenseTemplates

    console.log('\n🧮 SUMMARY:')
    console.log(`   🗑️  Total items to be DELETED: ${totalItemsToDelete}`)
    console.log(`   ✅ Items to be PRESERVED: ${beforeCounts.users} users + ${beforeCounts.auditLogs} audit logs`)
    console.log(`   🌱 Reference data items to be RECREATED: ~89 (ID templates, job titles, etc.)`)

    console.log('\n⚠️  WHAT WOULD HAPPEN IN ACTUAL DATA RESET:')
    console.log('   1. 🗑️  Delete all business data (orders, products, customers, etc.)')
    console.log('   2. 🗑️  Delete all vehicle and fleet data')  
    console.log('   3. 🗑️  Delete all employee contracts and memberships')
    console.log('   4. 🗑️  Delete all businesses and employees')
    console.log('   5. 🗑️  Delete all reference data (templates, job titles, etc.)')
    console.log('   6. ✅ Preserve all user accounts and login credentials')
    console.log('   7. ✅ Preserve all audit logs and activity history')
    console.log('   8. 🌱 Automatically recreate 89 essential reference data records')
    console.log('   9. 📝 Create audit log entry for the reset action')

    if (totalItemsToDelete === 0) {
      console.log('\n✨ DATABASE IS ALREADY CLEAN - No data to reset!')
    } else {
      console.log('\n⚠️  DANGER: This would permanently delete all business and operational data!')
      console.log('   Only user accounts and audit history would be preserved.')
    }

  } catch (error) {
    console.error('❌ Dry run failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the dry run
if (require.main === module) {
  dryRunDataReset()
    .then(() => {
      console.log('\n🎯 Dry run completed successfully!')
      console.log('💡 To perform actual reset, use the admin panel at /admin')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Dry run failed:', error)
      process.exit(1)
    })
}

module.exports = { dryRunDataReset }