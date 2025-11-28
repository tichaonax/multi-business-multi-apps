const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAllBusinessTypes() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║    Checking ALL Business Types in Database                ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log('')

    const allBusinesses = await prisma.businesses.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true
      },
      orderBy: {
        type: 'asc'
      }
    })

    console.log(`Total businesses: ${allBusinesses.length}`)
    console.log('')

    // Group by type
    const byType = {}
    allBusinesses.forEach(b => {
      if (!byType[b.type]) {
        byType[b.type] = []
      }
      byType[b.type].push(b)
    })

    console.log('Business Types Found:')
    console.log('─'.repeat(60))

    Object.keys(byType).sort().forEach(type => {
      const businesses = byType[type]
      console.log(`\n${type.toUpperCase()} (${businesses.length} business${businesses.length > 1 ? 'es' : ''})`)
      businesses.forEach(b => {
        console.log(`  • ${b.name} ${b.isActive ? '✅' : '❌ Inactive'}`)
        console.log(`    ID: ${b.id}`)
      })
    })

    console.log('')
    console.log('─'.repeat(60))
    console.log('SIDEBAR CONFIGURATION CHECK:')
    console.log('─'.repeat(60))

    const sidebarTypes = ['restaurant', 'grocery', 'clothing', 'hardware', 'construction', 'services']

    Object.keys(byType).forEach(type => {
      const inSidebar = sidebarTypes.includes(type)
      console.log(`${type}: ${inSidebar ? '✅ In sidebar' : '❌ NOT in sidebar'}`)
    })

    console.log('')
    const missingTypes = Object.keys(byType).filter(t => !sidebarTypes.includes(t))
    if (missingTypes.length > 0) {
      console.log('⚠️  TYPES MISSING FROM SIDEBAR:')
      missingTypes.forEach(type => {
        const count = byType[type].length
        console.log(`  • ${type} (${count} business${count > 1 ? 'es' : ''})`)
      })
      console.log('')
      console.log('These business types need to be added to sidebar configuration!')
    } else {
      console.log('✅ All business types are in sidebar configuration!')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAllBusinessTypes()
