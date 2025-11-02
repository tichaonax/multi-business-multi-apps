const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkStatus() {
  console.log('🔍 Checking database seed status...\n')

  // Check businesses
  const businesses = await prisma.businesses.findMany({ 
    where: { name: { contains: '[Demo]' } },
    select: { id: true, name: true, type: true }
  })
  console.log('📊 Demo Businesses:', businesses.length)
  businesses.forEach(b => console.log(`  - ${b.name} (${b.type})`))

  // Check type-based categories
  const categories = await prisma.businessCategories.findMany({
    where: { businessId: null },
    select: { id: true, name: true, businessType: true },
    orderBy: { businessType: 'asc' }
  })
  console.log('\n📂 Type-based Categories:', categories.length)
  const grouped = {}
  categories.forEach(c => {
    if (!grouped[c.businessType]) grouped[c.businessType] = []
    grouped[c.businessType].push(c.name)
  })
  Object.entries(grouped).forEach(([type, names]) => {
    console.log(`  ${type}: ${names.join(', ')}`)
  })

  // Check suppliers
  const suppliers = await prisma.businessSuppliers.findMany({
    select: { id: true, name: true, businessType: true, businessId: true }
  })
  console.log('\n🏭 Suppliers:', suppliers.length)
  suppliers.forEach(s => console.log(`  - ${s.name} (${s.businessType}) [businessId: ${s.businessId || 'null'}]`))

  // Check inventory products
  const products = await prisma.businessProducts.findMany({
    select: { id: true, name: true, businessType: true, businessId: true }
  })
  console.log('\n📦 Products:', products.length)
  const productsByBusiness = {}
  products.forEach(p => {
    if (!productsByBusiness[p.businessId]) productsByBusiness[p.businessId] = 0
    productsByBusiness[p.businessId]++
  })
  Object.entries(productsByBusiness).forEach(([businessId, count]) => {
    console.log(`  ${businessId}: ${count} products`)
  })

  await prisma.$disconnect()
}

checkStatus().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
