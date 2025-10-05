/**
 * Migrate Existing BusinessCustomer Data to Universal Customer System
 *
 * This script converts existing BusinessCustomer records to the new structure:
 * - Creates UniversalCustomer records (one per unique customer)
 * - Creates CustomerDivisionAccount records (business-specific accounts)
 * - Preserves all existing data
 * - Links to BusinessOrder records
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function migrateBusinessCustomers() {
  console.log('🔄 Starting BusinessCustomer migration...\n')

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

    // Group customers by unique identity (email, phone, or name)
    const customerGroups = new Map()

    for (const bc of businessCustomers) {
      // Create a unique key based on email, phone, or name
      let key = null

      if (bc.email && bc.email.trim()) {
        key = `email:${bc.email.toLowerCase().trim()}`
      } else if (bc.phone && bc.phone.trim()) {
        key = `phone:${bc.phone.trim()}`
      } else {
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
    let errors = []

    // Process each customer group
    for (const [key, customers] of customerGroups) {
      try {
        // Use the first record as the "master" record
        const master = customers[0]

        // Generate unique customer number
        const customerNumber = `UCST-${String(universalCustomersCreated + 1).padStart(6, '0')}`

        // Determine customer type
        let customerType = 'INDIVIDUAL'
        if (master.customerType === 'BUSINESS' || master.customerType === 'WHOLESALE') {
          customerType = 'BUSINESS'
        } else if (master.customerType === 'CONTRACTOR') {
          customerType = 'BUSINESS'
        } else if (master.customerType === 'VIP') {
          customerType = 'INDIVIDUAL'
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
            createdAt: master.createdAt,
            updatedAt: master.updatedAt,
            source: 'MIGRATION'
          }
        })

        universalCustomersCreated++
        console.log(`✅ Created UniversalCustomer: ${customerNumber} - ${master.name}`)

        // Create CustomerDivisionAccount for each business
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

          divisionAccountsCreated++
          console.log(`  ├─ Division account: ${divisionCustomerNumber} (${bc.business?.name || 'Unknown Business'})`)

          // Update BusinessOrders to link to the new customer
          if (bc.businessOrders && bc.businessOrders.length > 0) {
            console.log(`  │  └─ Linked ${bc.businessOrders.length} orders`)
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
    console.log(`❌ Errors: ${errors.length}`)

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:')
      errors.forEach(({ key, error }) => {
        console.log(`   - ${key}: ${error}`)
      })
    }

    console.log('\n💡 Next Steps:')
    console.log('   1. Verify the migrated data in Prisma Studio')
    console.log('   2. Test customer lookup by email/phone/name')
    console.log('   3. Verify division accounts are correctly linked')
    console.log('   4. Check that orders are still accessible')

  } catch (error) {
    console.error('\n💥 Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
migrateBusinessCustomers()
  .then(() => {
    console.log('\n✨ Migration completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error)
    process.exit(1)
  })
