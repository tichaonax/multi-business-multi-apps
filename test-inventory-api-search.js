const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testInventoryAPISearch() {
  try {
    console.log('Testing inventory API search logic for CLV-1491\n')

    // Find HXI Fashions business
    const business = await prisma.businesses.findFirst({
      where: {
        name: {
          contains: 'HXI',
          mode: 'insensitive'
        }
      }
    })

    if (!business) {
      console.log('HXI Fashions business not found')
      return
    }

    console.log(`Business: ${business.name}`)
    console.log(`Business ID: ${business.id}`)
    console.log(`Business Type: ${business.type}\n`)

    // Simulate the API search
    const searchTerm = 'CLV-1491'
    const where = {
      businessId: business.id,
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { sku: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } }
      ]
    }

    console.log('Fetching products with search:', searchTerm)

    const products = await prisma.businessProducts.findMany({
      where,
      include: {
        business_categories: true,
        inventory_subcategory: true,
        business_brands: true,
        business_suppliers: true,
        business_locations: true,
        product_variants: {
          include: {
            business_stock_movements: true
          }
        },
        product_barcodes: true
      },
      orderBy: { name: 'asc' },
      take: 50
    })

    console.log(`Found ${products.length} products\n`)

    if (products.length === 0) {
      console.log('❌ NO PRODUCTS FOUND!')
      console.log('\nLet me check if the product exists without search...')

      const directProduct = await prisma.businessProducts.findFirst({
        where: {
          businessId: business.id,
          sku: 'CLV-1491'
        }
      })

      if (directProduct) {
        console.log('\n✓ Product DOES exist:')
        console.log(`  Name: ${directProduct.name}`)
        console.log(`  SKU: ${directProduct.sku}`)
        console.log(`  Active: ${directProduct.isActive}`)
        console.log(`  CategoryId: ${directProduct.categoryId}`)
      }
      return
    }

    // Transform products like the API does
    products.forEach(product => {
      const currentStock = product.product_variants.reduce((total, variant) => {
        return total + (Number(variant.stockQuantity) || 0)
      }, 0)

      const item = {
        id: product.id,
        businessId: product.businessId,
        businessType: product.businessType,
        name: product.name,
        sku: product.sku || '',
        description: product.description || '',
        category: product.business_categories?.name || 'Uncategorized',
        categoryId: product.categoryId || null,
        categoryEmoji: product.business_categories?.emoji || '📦',
        subcategory: product.inventory_subcategory?.name || null,
        currentStock,
        costPrice: parseFloat(product.costPrice?.toString() || '0'),
        sellPrice: parseFloat(product.basePrice?.toString() || '0'),
        supplier: product.business_suppliers?.name || '',
        location: product.business_locations?.name || '',
        isActive: product.isActive,
      }

      console.log('✓ Product found:')
      console.log(`  ID: ${item.id}`)
      console.log(`  Name: ${item.name}`)
      console.log(`  SKU: ${item.sku}`)
      console.log(`  Category: ${item.category}`)
      console.log(`  Stock: ${item.currentStock}`)
      console.log(`  Active: ${item.isActive}`)
      console.log(`  Supplier: ${item.supplier || '(none)'}`)
      console.log(`  Location: ${item.location || '(none)'}`)
      console.log()
    })

    // Check if there are any department/domain filters that might be applied
    const productWithCategory = await prisma.businessProducts.findFirst({
      where: {
        businessId: business.id,
        sku: 'CLV-1491'
      },
      include: {
        business_categories: {
          include: {
            business_domains: true
          }
        }
      }
    })

    if (productWithCategory) {
      console.log('Category details:')
      console.log(`  Category Name: ${productWithCategory.business_categories?.name}`)
      console.log(`  Category Domain ID: ${productWithCategory.business_categories?.domainId}`)
      console.log(`  Domain: ${productWithCategory.business_categories?.business_domains?.name || 'N/A'}`)
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testInventoryAPISearch()
