const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function verify() {
  const b = await prisma.businesses.findUnique({
    where: { id: 'contractors-demo-business' }
  })
  
  const prod = await prisma.businessProducts.count({
    where: { businessId: b.id }
  })
  
  const cats = await prisma.businessCategories.count({
    where: { businessId: b.id }
  })
  
  const sups = await prisma.businessSuppliers.count({
    where: { businessType: 'services' }
  })
  
  console.log('Contractors [Demo] Data Summary:')
  console.log('  Services:', prod)
  console.log('  Categories:', cats)
  console.log('  Suppliers:', sups)
  console.log('')
  
  const catDetails = await prisma.businessCategories.findMany({
    where: { businessId: b.id },
    select: {
      name: true,
      _count: {
        select: { business_products: true }
      }
    },
    orderBy: { name: 'asc' }
  })
  
  console.log('Services by Category:')
  catDetails.forEach(c => {
    console.log(`  ${c.name}: ${c._count.business_products} services`)
  })
  
  console.log('')
  
  // Show sample services
  const sampleServices = await prisma.businessProducts.findMany({
    where: { businessId: b.id },
    select: {
      name: true,
      sku: true,
      basePrice: true,
      business_categories: {
        select: { name: true }
      }
    },
    take: 10,
    orderBy: { sku: 'asc' }
  })
  
  console.log('Sample Services (first 10):')
  sampleServices.forEach(s => {
    console.log(`  ${s.sku} - ${s.name} - $${s.basePrice} (${s.business_categories.name})`)
  })
  
  await prisma.$disconnect()
}

verify()
