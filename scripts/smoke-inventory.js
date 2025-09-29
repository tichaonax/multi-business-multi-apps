const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'grocery-demo-business'

function generateInventoryValueReport(businessId) {
  return {
    totalInventoryValue: 47850.0,
    totalItems: 147,
    categories: [
      { category: 'Proteins', value: 15240.0, percentage: 31.8 },
      { category: 'Vegetables', value: 8920.0, percentage: 18.6 },
      { category: 'Dairy', value: 6780.0, percentage: 14.2 }
    ],
    trends: { weekOverWeek: 2.3 }
  }
}

async function computeCurrentStockForProduct(product) {
  // Sum movements across variants
  let total = 0
  const variants = await prisma.productVariant.findMany({ where: { productId: product.id }, include: { stockMovements: true } })
  for (const v of variants) {
    const variantStock = (v.stockMovements || []).reduce((sum, m) => {
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
    const business = await prisma.business.findUnique({ where: { id: BUSINESS_ID } })
    if (!business) {
      console.error('Business not found:', BUSINESS_ID)
      process.exit(1)
    }

  const products = await prisma.businessProduct.findMany({ where: { businessId: BUSINESS_ID }, include: { businessCategory: true } })
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
  category: p.businessCategory?.name || 'Uncategorized',
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
  category: product.businessCategory?.name || 'General',
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

    const report = generateInventoryValueReport(BUSINESS_ID)
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
