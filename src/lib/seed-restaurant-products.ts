import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export interface SeedProductResult {
  success: boolean
  imported: number
  skipped: number
  errors: number
  errorLog: Array<{
    name: string
    error: string
  }>
  totalProducts: number
  message?: string
}

/**
 * Seed default restaurant menu items for a specific business
 *
 * This function imports pre-defined restaurant products with zero pricing
 * to help restaurants get started quickly. Each restaurant can then set their own prices.
 * It's idempotent - products with existing names are skipped.
 *
 * @param businessId - The ID of the restaurant business to seed products for
 * @returns Promise<SeedProductResult> - Import statistics and any errors
 */
export async function seedRestaurantProducts(businessId: string): Promise<SeedProductResult> {
  const errorLog: Array<{ name: string; error: string }> = []
  let imported = 0
  let skipped = 0
  let errors = 0

  try {
    // 1. Verify business exists and is restaurant type
    const business = await prisma.businesses.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: 0,
        errorLog: [],
        totalProducts: 0,
        message: 'Business not found'
      }
    }

    if (business.type !== 'restaurant') {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: 0,
        errorLog: [],
        totalProducts: 0,
        message: 'Business is not a restaurant business'
      }
    }

    // 2. Load product data from seed file
    const dataFile = path.join(process.cwd(), 'seed-data', 'restaurant-products', 'default-menu-items.json')

    if (!fs.existsSync(dataFile)) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: 0,
        errorLog: [],
        totalProducts: 0,
        message: 'Product seed data file not found'
      }
    }

    const productData = JSON.parse(fs.readFileSync(dataFile, 'utf-8'))

    // 3. Get or create restaurant categories
    const categoryMap = new Map<string, string>()
    const uniqueCategories = [...new Set(productData.map((p: any) => p.categoryName))]

    for (const categoryName of uniqueCategories) {
      // Find or create type-based category
      let category = await prisma.businessCategories.findFirst({
        where: {
          businessType: 'restaurant',
          name: categoryName,
          businessId: null  // Type-based category
        }
      })

      if (!category) {
        // Create category ID
        const categoryId = `cat_restaurant_${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_001`
        category = await prisma.businessCategories.create({
          data: {
            id: categoryId,
            businessType: 'restaurant',
            name: categoryName,
            description: categoryName,
            businessId: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      }

      categoryMap.set(categoryName, category.id)
    }

    // 4. Import products
    const timestamp = Date.now()
    let index = 0

    for (const item of productData) {
      index++
      try {
        const categoryId = categoryMap.get(item.categoryName)
        if (!categoryId) {
          throw new Error(`Category not found: ${item.categoryName}`)
        }

        // Generate unique SKU for this business
        const baseSku = item.name
          .replace(/[^\w\s]/g, '') // Remove emojis and special chars
          .trim()
          .toUpperCase()
          .replace(/\s+/g, '-')
        const sku = `RST-${baseSku}-${timestamp}-${index}`

        // Check if product with same name already exists for this business
        const existing = await prisma.businessProducts.findFirst({
          where: {
            businessId,
            name: item.name
          }
        })

        if (existing) {
          skipped++
          continue
        }

        // Create product
        const product = await prisma.businessProducts.create({
          data: {
            businessId,
            name: item.name,
            description: item.description || '',
            sku,
            categoryId,
            basePrice: 0, // Always zero - each restaurant sets their own prices
            costPrice: 0,
            businessType: 'restaurant',
            productType: item.productType || 'PHYSICAL',
            isActive: true,
            isCombo: item.isCombo || false,
            comboItemsData: item.comboItemsData || null,
            attributes: item.attributes || {},
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        // Create default variant
        const variantSku = `${sku}-VARIANT-${timestamp}`
        const variantId = `${product.id}-variant-default-${timestamp}`

        await prisma.productVariants.create({
          data: {
            id: variantId,
            productId: product.id,
            sku: variantSku,
            price: 0,
            stockQuantity: 0,
            isActive: true,
            isAvailable: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        imported++

      } catch (error: any) {
        errors++
        errorLog.push({
          name: item.name,
          error: error.message || 'Unknown error'
        })
      }
    }

    return {
      success: true,
      imported,
      skipped,
      errors,
      errorLog,
      totalProducts: productData.length,
      message: `Successfully imported ${imported} products (${skipped} skipped, ${errors} errors)`
    }

  } catch (error: any) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: 0,
      errorLog: [],
      totalProducts: 0,
      message: error.message || 'Unknown error during seeding'
    }
  }
}
