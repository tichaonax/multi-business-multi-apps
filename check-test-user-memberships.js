// Check what business memberships the test user has
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUserMemberships() {
  try {
    // Find the test user (adjust the where clause as needed)
    const users = await prisma.users.findMany({
      where: {
        OR: [
          { id: 'test-user-id' },
          { email: { contains: 'test' } },
          { email: { contains: 'admin' } }
        ]
      },
      include: {
        business_memberships: {
          where: { isActive: true },
          include: {
            businesses: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        }
      },
      take: 5
    })

    console.log(`Found ${users.length} user(s):\n`)

    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`)
      console.log(`  ID: ${user.id}`)
      console.log(`  Email: ${user.email}`)
      console.log(`  Name: ${user.name}`)
      console.log(`  Role: ${user.role}`)
      console.log(`  Business Memberships: ${user.business_memberships.length}`)

      if (user.business_memberships.length > 0) {
        console.log(`\n  Accessible Businesses:`)
        user.business_memberships.forEach((membership) => {
          console.log(`    - ${membership.businesses.name} (${membership.businesses.type}) [${membership.businesses.id}]`)
        })
      } else {
        console.log(`  ⚠️ NO BUSINESS MEMBERSHIPS - This user won't have access to any businesses!`)
      }
      console.log('\n---\n')
    })

    // Also check if there are any businesses in the system
    const totalBusinesses = await prisma.businesses.count()
    console.log(`Total businesses in system: ${totalBusinesses}`)

    // Check for products with barcodes
    const productsWithBarcodes = await prisma.productBarcodes.findMany({
      take: 5,
      include: {
        business_product: {
          include: {
            businesses: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        }
      }
    })

    console.log(`\nSample products with barcodes:`)
    productsWithBarcodes.forEach((barcode, index) => {
      console.log(`  ${index + 1}. Barcode: ${barcode.code}`)
      if (barcode.business_product) {
        console.log(`     Business: ${barcode.business_product.businesses.name} (${barcode.business_product.businesses.type})`)
        console.log(`     Business ID: ${barcode.business_product.businesses.id}`)
      }
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUserMemberships()
