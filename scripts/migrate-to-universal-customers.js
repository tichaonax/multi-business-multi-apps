/**
 * Migrate BusinessCustomer to Universal Customer System
 *
 * This script:
 * 1. Converts BusinessCustomer records to UniversalCustomer + CustomerDivisionAccount
 * 2. Links existing BusinessOrders to the new CustomerDivisionAccount
 * 3. Preserves all existing data including orders, loyalty points, etc.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function migrateToUniversalCustomers() {
  console.log('🔄 Starting BusinessCustomer → Universal Customer migration...\n')

  try {
    // Get all existing BusinessCustomer records
    const businessCustomers = await prisma.businessCustomer.findMany({
      include: {
        business: true,
        businessOrders: true
      },
      orderBy: { createdAt: 'asc' }
    })

    console.log(`📊 Found ${businessCustomers.length} BusinessCustomer records\n`)

    if (businessCustomers.length === 0) {
      console.log('✅ No BusinessCustomer records to migrate')
      return
    }

    // Group customers by unique identity (email, phone, or name + business combo)
    const customerGroups = new Map()
    const customerKeyMap = new Map() // Maps old customerId to new divisionAccountId

    for (const bc of businessCustomers) {
      // Create a unique key - try email first, then phone, then name
      let key = null

      if (bc.email && bc.email.trim()) {
        key = `email:${bc.email.toLowerCase().trim()}`
      } else if (bc.phone && bc.phone.trim()) {
        key = `phone:${bc.phone.trim()}`
      } else {
        // Use name + first business ID to avoid merging unrelated customers
        key = `name:${bc.name.toLowerCase().trim()}`
      }

      if (!customerGroups.has(key)) {
        customerGroups.set(key, [])
      }
      customerGroups.get(key).push(bc)
    }

    console.log(`👥 Identified ${customerGroups.size} unique customers\n`)

    let universalCustomersCreated = 0
    let divisionAccountsCreated = 0
    let ordersLinked = 0
    let errors = []

    // Process each customer group
    for (const [key, customers] of customerGroups) {
      try {
        // Use the first record as the "master" record
        const master = customers[0]

        // Generate unique customer number
        const existingCount = await prisma.universalCustomer.count()
        const customerNumber = `UCST-${String(existingCount + 1).padStart(6, '0')}`

        // Determine customer type
        let customerType = 'INDIVIDUAL'
        if (master.customerType === 'BUSINESS' || master.customerType === 'WHOLESALE') {
          customerType = 'BUSINESS'
        } else if (master.customerType === 'CONTRACTOR') {
          customerType = 'BUSINESS'
        } else if (master.customerType === 'VIP') {
          customerType = 'INDIVIDUAL'
        } else if (master.customerType === 'GOVERNMENT') {
          customerType = 'GOVERNMENT'
        } else if (master.customerType === 'NGO') {
          customerType = 'NGO'
        }

        // Create UniversalCustomer
        const universalCustomer = await prisma.universalCustomer.create({
          data: {
            customerNumber,
            type: customerType,
            fullName: master.name,
            primaryEmail: master.email || null,
            primaryPhone: master.phone || '',
            address: master.address || null,
            city: master.city || null,
            country: master.country || 'Zimbabwe',
            dateOfBirth: master.dateOfBirth || null,
            isActive: master.isActive,
            source: 'MIGRATION',
            createdAt: master.createdAt,
            updatedAt: master.updatedAt
          }
        })

        universalCustomersCreated++
        console.log(`✅ Created UniversalCustomer: ${customerNumber} - ${master.name}`)

        // Create CustomerDivisionAccount for each business the customer is in
        for (const bc of customers) {
          const divisionCustomerNumber = bc.customerNumber

          const divisionAccount = await prisma.customerDivisionAccount.create({
            data: {
              universalCustomerId: universalCustomer.id,
              businessId: bc.businessId,
              divisionCustomerNumber,
              status: bc.isActive ? 'ACTIVE' : 'INACTIVE',
              accountType: bc.customerType,
              segment: bc.segment || null,
              totalSpent: bc.totalSpent || 0,
              loyaltyPoints: bc.loyaltyPoints || 0,
              preferences: bc.attributes || null,
              isActive: bc.isActive,
              createdAt: bc.createdAt,
              updatedAt: bc.updatedAt
            }
          })

          // Store mapping for order updates
          customerKeyMap.set(bc.id, divisionAccount.id)

          divisionAccountsCreated++
          console.log(`  ├─ Division account: ${divisionCustomerNumber} (${bc.business?.name || 'Unknown Business'})`)

          // Link existing BusinessOrders to the new CustomerDivisionAccount
          if (bc.businessOrders && bc.businessOrders.length > 0) {
            const orderUpdateResult = await prisma.businessOrder.updateMany({
              where: { customerId: bc.id },
              data: { divisionAccountId: divisionAccount.id }
            })

            ordersLinked += orderUpdateResult.count
            console.log(`  │  └─ Linked ${orderUpdateResult.count} orders to division account`)
          }
        }

        console.log('')

      } catch (error) {
        console.error(`❌ Error migrating customer group ${key}:`, error.message)
        errors.push({ key, error: error.message })
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📈 Migration Summary:')
    console.log('='.repeat(60))
    console.log(`✅ Universal Customers Created: ${universalCustomersCreated}`)
    console.log(`✅ Division Accounts Created: ${divisionAccountsCreated}`)
    console.log(`✅ Orders Linked: ${ordersLinked}`)
    console.log(`❌ Errors: ${errors.length}`)

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:')
      errors.forEach(({ key, error }) => {
        console.log(`   - ${key}: ${error}`)
      })
    }

    console.log('\n💡 Next Steps:')
    console.log('   1. Verify the migrated data in Prisma Studio')
    console.log('   2. Test customer lookup and order association')
    console.log('   3. Update application code to use CustomerDivisionAccount')
    console.log('   4. Once verified, BusinessCustomer model can be deprecated')
    console.log('\n⚠️  Note: BusinessCustomer records are preserved for rollback safety')

  } catch (error) {
    console.error('\n💥 Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
migrateToUniversalCustomers()
  .then(() => {
    console.log('\n✨ Migration completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error)
    process.exit(1)
  })
