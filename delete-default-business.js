const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function deleteDefaultBusiness() {
  try {
    const businessId = 'bda3aebe-2968-460b-9612-cf90a59a57f8'

    console.log('Deleting Default Business and all related data...\n')

    // Delete in order to respect foreign key constraints

    // 1. Delete business memberships
    const memberships = await prisma.businessMemberships.deleteMany({
      where: { businessId }
    })
    console.log(`✓ Deleted ${memberships.count} business memberships`)

    // 2. Delete business accounts
    const accounts = await prisma.businessAccounts.deleteMany({
      where: { businessId }
    })
    console.log(`✓ Deleted ${accounts.count} business accounts`)

    // 3. Delete business orders
    const orders = await prisma.businessOrders.deleteMany({
      where: { businessId }
    })
    console.log(`✓ Deleted ${orders.count} business orders`)

    // 4. Delete business products
    const products = await prisma.businessProducts.deleteMany({
      where: { businessId }
    })
    console.log(`✓ Deleted ${products.count} business products`)

    // 5. Delete the business itself
    const business = await prisma.businesses.delete({
      where: { id: businessId }
    })
    console.log(`✓ Deleted business: ${business.name}`)

    console.log('\n✅ Successfully deleted Default Business!')
    console.log('You can now create your first business from scratch.\n')

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

deleteDefaultBusiness()
