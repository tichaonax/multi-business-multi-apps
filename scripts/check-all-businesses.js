const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAllBusinesses() {
  try {
    console.log('📊 All Businesses in Database')
    console.log('═══════════════════════════════════════════════════')

    const businesses = await prisma.businesses.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    console.log(`\nTotal Businesses: ${businesses.length}\n`)

    businesses.forEach((business, index) => {
      const isDemoById = business.id.includes('-demo-business') ||
                        business.id.endsWith('-demo') ||
                        business.id.startsWith('demo-')
      const isDemoByType = business.type === 'demo'

      console.log(`${index + 1}. ${business.name}`)
      console.log(`   ID: ${business.id}`)
      console.log(`   Type: ${business.type || 'NULL'}`)
      console.log(`   Created: ${business.createdAt.toISOString().split('T')[0]}`)
      console.log(`   Demo by ID: ${isDemoById ? '✅' : '❌'}`)
      console.log(`   Demo by Type: ${isDemoByType ? '✅' : '❌'}`)
      console.log('')
    })

    // Check demo employees
    console.log('\n📊 Demo Employee Count')
    console.log('═══════════════════════════════════════════════════')

    const employees = await prisma.persons.findMany({
      where: {
        businesses: {
          some: {
            business: {
              OR: [
                { id: { contains: '-demo-business' } },
                { id: { endsWith: '-demo' } },
                { id: { startsWith: 'demo-' } },
                { type: 'demo' }
              ]
            }
          }
        }
      }
    })

    console.log(`Total Demo Employees: ${employees.length}`)

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkAllBusinesses()
