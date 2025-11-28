const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkServiceBusiness() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║    Checking Service Business Type in Database             ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log('')

    // Find all businesses with 'service' in the name or type
    const allBusinesses = await prisma.businesses.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true
      }
    })

    console.log(`Total businesses in database: ${allBusinesses.length}`)
    console.log('')

    // Filter service-related businesses
    const serviceBusinesses = allBusinesses.filter(b =>
      b.type?.toLowerCase().includes('service') ||
      b.name?.toLowerCase().includes('service')
    )

    if (serviceBusinesses.length === 0) {
      console.log('❌ No service businesses found!')
      console.log('')
      console.log('Possible reasons:')
      console.log('  1. No business with type containing "service" exists')
      console.log('  2. Business type might be spelled differently')
      console.log('')
      console.log('All business types in your database:')
      const uniqueTypes = [...new Set(allBusinesses.map(b => b.type))]
      uniqueTypes.forEach(type => {
        const count = allBusinesses.filter(b => b.type === type).length
        console.log(`  - ${type}: ${count} business${count > 1 ? 'es' : ''}`)
      })
    } else {
      console.log(`✅ Found ${serviceBusinesses.length} service business(es):`)
      console.log('')

      serviceBusinesses.forEach(b => {
        console.log(`  Business: ${b.name}`)
        console.log(`  ID: ${b.id}`)
        console.log(`  Type: "${b.type}" ${b.type === 'services' ? '✅ (matches sidebar)' : '⚠️ (does NOT match sidebar)'}`)
        console.log(`  Active: ${b.isActive}`)
        console.log(`  Status: ${b.isActive ? '✅ Active' : '❌ Inactive'}`)
        console.log('')
      })

      // Check what sidebar expects
      console.log('─'.repeat(60))
      console.log('SIDEBAR CONFIGURATION:')
      console.log('  Expected type: "services" (plural, lowercase)')
      console.log('')

      const mismatch = serviceBusinesses.find(b => b.type !== 'services')
      if (mismatch) {
        console.log('⚠️  TYPE MISMATCH DETECTED!')
        console.log('')
        console.log(`Your business has type: "${mismatch.type}"`)
        console.log(`Sidebar expects type: "services"`)
        console.log('')
        console.log('SOLUTION:')
        console.log(`Run this command to fix:`)
        console.log(``)
        console.log(`UPDATE businesses SET type = 'services' WHERE id = '${mismatch.id}';`)
        console.log('')
      } else {
        console.log('✅ Business type matches sidebar configuration!')
      }
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkServiceBusiness()
