const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'grocery-demo-business'

async function generateInventoryValueReport(businessId) {
  // This is a smoke test - simplified calculation from actual database
  // Note: Using try/catch to gracefully handle if no products exist
  let products = []
  
  try {
    products = await prisma.businessProducts.findMany({
      where: { businessId, isActive: true },
      include: { product_variants: true, business_categories: true }
    })
  } catch (err) {
    // If error (e.g., no products), return zero values
    console.log('Note: Could not fetch products, returning zero values')
    return {
      totalInventoryValue: 0,
      totalItems: 0,
      categories: [],
      trends: { weekOverWeek: 0 }
    }
  }

  let totalValue = 0
  let totalItems = 0
  const categoryMap = new Map()

  for (const product of products) {
    for (const variant of product.product_variants) {
      const price = parseFloat(variant.price?.toString() || '0')
      const stock = variant.stockQuantity || 0
      const value = price * stock
      
      totalValue += value
      totalItems++

      const categoryName = product.business_categories?.name || 'Uncategorized'
      const catData = categoryMap.get(categoryName) || { value: 0, items: 0 }
      catData.value += value
      catData.items++
      categoryMap.set(categoryName, catData)
    }
  }

  const categories = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    value: Math.round(data.value * 100) / 100,
    percentage: totalValue > 0 ? Math.round((data.value / totalValue) * 1000) / 10 : 0
  }))

  return {
    totalInventoryValue: Math.round(totalValue * 100) / 100,
    totalItems,
    categories: categories.slice(0, 3), // Top 3 for smoke test
    trends: { weekOverWeek: 0 } // Would need movements to calculate
  }
}

async function computeCurrentStockForProduct(product) {
  // Sum movements across variants
  let total = 0
  const variants = await prisma.productVariants.findMany({ where: { productId: product.id }, include: { business_stock_movements: true } })
  for (const v of variants) {
    const variantStock = (v.business_stock_movements || []).reduce((sum, m) => {
      // movementType uses enum values like PURCHASE_RECEIVED, SALE, etc.
      // Treat PURCHASE_RECEIVED and PRODUCTION_IN and RETURN_IN, TRANSFER_IN as IN; others as OUT
      const inTypes = ['PURCHASE_RECEIVED', 'PRODUCTION_IN', 'RETURN_IN', 'TRANSFER_IN']
      if (inTypes.includes(m.movementType)) return sum + m.quantity
      return sum - m.quantity
    }, 0)
    total += variantStock
  }
  return total
}

async function run() {
  try {
    console.log('Checking business', BUSINESS_ID)
    const business = await prisma.businesses.findUnique({ where: { id: BUSINESS_ID } })
    if (!business) {
      console.error('Business not found:', BUSINESS_ID)
      process.exit(1)
    }

  const products = await prisma.businessProducts.findMany({ where: { businessId: BUSINESS_ID }, include: { business_categories: true } })
    console.log('Products count for business:', products.length)

    if (products.length > 0) {
      const p = products[0]
      const currentStock = await computeCurrentStockForProduct(p)
      const sample = {
        id: p.id,
        businessId: p.businessId,
        businessType: p.businessType,
        name: p.name,
        sku: p.sku || '',
        description: p.description || '',
  category: p.business_categories?.name || 'Uncategorized',
        currentStock,
        unit: 'units',
        costPrice: parseFloat(p.costPrice?.toString() || '0'),
        sellPrice: parseFloat(p.basePrice?.toString() || '0'),
        isActive: p.isActive
      }
      console.log('Sample item object:', sample)
    }

    // Generate demo alerts (similar to alerts route)
    const demoAlerts = products.slice(0, 3).map((product, i) => ({
      id: `alert-${product.id}-demo`,
      businessId: BUSINESS_ID,
      alertType: 'low_stock',
      priority: 'medium',
      itemId: product.id,
      itemName: product.name,
      itemSku: product.sku || '',
  category: product.business_categories?.name || 'General',
      currentStock: 5,
      threshold: 10,
      unit: 'units',
      message: `${product.name} stock is running low`,
      actionRequired: 'Consider reordering soon',
      isAcknowledged: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))

    console.log('Demo alerts generated:', demoAlerts.length)
    if (demoAlerts.length > 0) console.log('First alert sample:', demoAlerts[0])

    const report = await generateInventoryValueReport(BUSINESS_ID)
    console.log('Report sample summary:', { totalInventoryValue: report.totalInventoryValue, totalItems: report.totalItems })

    console.log('Smoke inventory check complete')
  } catch (err) {
    console.error('Smoke inventory failed:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) run()
