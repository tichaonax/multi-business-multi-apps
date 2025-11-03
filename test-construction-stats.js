const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testConstructionStats() {
  try {
    console.log('Testing Construction Demo Stats...\n')
    
    // Get the business
    const business = await prisma.businesses.findUnique({
      where: { id: 'construction-demo-business' }
    })
    
    if (!business) {
      console.error('❌ Business not found!')
      return
    }
    
    console.log('Business Details:')
    console.log(`  ID: ${business.id}`)
    console.log(`  Name: ${business.name}`)
    console.log(`  Type: ${business.type}`)
    console.log(`  Is Demo: ${business.isDemo}\n`)
    
    // Count products (services)
    const products = await prisma.businessProducts.count({
      where: { businessId: business.id }
    })
    
    const activeProducts = await prisma.businessProducts.count({
      where: { businessId: business.id, isActive: true }
    })
    
    // Count categories
    const categories = await prisma.businessCategories.count({
      where: {
        OR: [
          { businessId: business.id },
          { businessId: null, businessType: business.type }
        ],
        isActive: true
      }
    })
    
    // Count suppliers
    const suppliers = await prisma.businessSuppliers.count({
      where: {
        businessType: business.type,
        isActive: true
      }
    })
    
    console.log('Stats Counts:')
    console.log(`  Products (All): ${products}`)
    console.log(`  Products (Active): ${activeProducts}`)
    console.log(`  Categories: ${categories}`)
    console.log(`  Suppliers: ${suppliers}\n`)
    
    // Sample some products
    const sampleProducts = await prisma.businessProducts.findMany({
      where: { businessId: business.id },
      take: 5,
      select: { name: true, basePrice: true, isActive: true }
    })
    
    console.log('Sample Products:')
    sampleProducts.forEach(p => {
      console.log(`  - ${p.name} ($${p.basePrice}) [${p.isActive ? 'Active' : 'Inactive'}]`)
    })
    
    // Sample some suppliers
    const sampleSuppliers = await prisma.businessSuppliers.findMany({
      where: { businessType: business.type },
      take: 5,
      select: { supplierName: true, isActive: true }
    })
    
    console.log('\nSample Suppliers:')
    sampleSuppliers.forEach(s => {
      console.log(`  - ${s.supplierName} [${s.isActive ? 'Active' : 'Inactive'}]`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConstructionStats()
