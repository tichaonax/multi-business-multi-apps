import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

// Department to domain ID mapping
const DEPT_TO_DOMAIN: Record<string, string> = {
  'mens': 'domain_clothing_mens',
  'womens': 'domain_clothing_womens',
  'boys': 'domain_clothing_boys',
  'girls': 'domain_clothing_girls',
  'baby': 'domain_clothing_baby',
  'accessories': 'domain_clothing_accessories',
  'home-textiles': 'domain_clothing_home_textiles',
  'general-merch': 'domain_clothing_general_merch'
}

export interface SeedProductResult {
  success: boolean
  imported: number
  skipped: number
  errors: number
  errorLog: Array<{
    sku: string
    product: string
    error: string
  }>
  totalProducts: number
  message?: string
}

/**
 * Seed common clothing products for a specific business
 *
 * This function imports 1067 pre-defined clothing products with zero quantities
 * to help with bulk product registration. It's idempotent - products with
 * existing SKUs are skipped, making it safe to rerun.
 *
 * @param businessId - The ID of the clothing business to seed products for
 * @returns Promise<SeedProductResult> - Import statistics and any errors
 */
export async function seedClothingProducts(businessId: string): Promise<SeedProductResult> {
  const errorLog: Array<{ sku: string; product: string; error: string }> = []
  let imported = 0
  let skipped = 0
  let errors = 0

  try {
    // 1. Verify business exists and is clothing type
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

    if (business.type !== 'clothing') {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: 0,
        errorLog: [],
        totalProducts: 0,
        message: 'Business is not a clothing business'
      }
    }

    // 2. Load product data from seed file
    const dataFile = path.join(process.cwd(), 'seed-data', 'clothing-categories', 'final-8-departments.json')

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

    // 3. Load all clothing categories and subcategories
    const categories = await prisma.businessCategories.findMany({
      where: { businessType: 'clothing' },
      include: {
        inventory_subcategories: true,
        domain: true
      }
    })

    if (categories.length === 0) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: 0,
        errorLog: [],
        totalProducts: 0,
        message: 'No clothing categories found. Please run category seeding first.'
      }
    }

    // Build lookup maps
    const categoryMap = new Map<string, any>() // domain|categoryName -> category
    const subcategoryMap = new Map<string, any>() // categoryId|subcategoryName -> subcategory

    categories.forEach((cat: any) => {
      const domainId = cat.domainId
      const key = `${domainId}|${cat.name}`
      categoryMap.set(key, cat)

      // Map subcategories
      cat.inventory_subcategories?.forEach((subcat: any) => {
        const subKey = `${cat.id}|${subcat.name}`
        subcategoryMap.set(subKey, subcat)
      })
    })

    // 4. Import products from each department
    for (const [deptKey, dept] of Object.entries(productData.departments) as Array<[string, any]>) {
      const domainId = DEPT_TO_DOMAIN[deptKey]

      if (!dept.items || !Array.isArray(dept.items)) {
        continue
      }

      for (const item of dept.items) {
        try {
          // Check if product already exists (by businessId + SKU)
          const existing = await prisma.businessProducts.findFirst({
            where: {
              businessId: businessId,
              sku: item.sku
            }
          })

          if (existing) {
            skipped++
            continue
          }

          // Find matching category
          // Handle null categoryName by defaulting to "Uncategorized" for the domain
          const categoryName = item.categoryName || 'Uncategorized'

          // First try exact domain-specific match
          const categoryKey = `${domainId}|${categoryName}`
          let category = categoryMap.get(categoryKey)

          // If not found, try exact match with any domain (fallback 1)
          if (!category) {
            category = Array.from(categoryMap.values()).find(c => c.name === categoryName)
          }

          // If still not found, try fuzzy match - categories that start with the name (fallback 2)
          // This handles renamed categories like "Accessories" -> "Accessories (Women's)"
          if (!category) {
            // First try within the correct domain
            category = Array.from(categoryMap.values()).find(c =>
              c.domainId === domainId && c.name.startsWith(categoryName)
            )

            // If still not found, try any domain
            if (!category) {
              category = Array.from(categoryMap.values()).find(c =>
                c.name.startsWith(categoryName)
              )
            }
          }

          if (!category) {
            errors++
            errorLog.push({
              sku: item.sku,
              product: item.product,
              error: `Category not found: ${categoryName} (domain: ${domainId})`
            })
            continue
          }

          // Find matching subcategory (if provided)
          let subcategoryId: string | null = null
          if (item.subcategory) {
            const subcategoryKey = `${category.id}|${item.subcategory}`
            const subcategory = subcategoryMap.get(subcategoryKey)
            if (subcategory) {
              subcategoryId = subcategory.id
            }
          }

          // Create product
          const product = await prisma.businessProducts.create({
            data: {
              businessId: businessId,
              name: item.product,
              sku: item.sku,
              categoryId: category.id,
              subcategoryId: subcategoryId,
              basePrice: 0.00, // Default price, can be updated later
              costPrice: null,
              businessType: 'clothing',
              isActive: true,
              isAvailable: true, // True so it shows in inventory (zero stock but visible for restocking)
              productType: 'PHYSICAL',
              condition: 'NEW',
              description: item.categoryName, // Use category as description
              updatedAt: new Date()
            }
          })

          // Create default variant with zero stock
          await prisma.productVariants.create({
            data: {
              productId: product.id,
              name: 'Default',
              sku: item.sku,
              stockQuantity: 0, // Zero quantity ready for restocking
              reorderLevel: 5, // Default reorder threshold
              price: 0.00,
              isActive: true,
              updatedAt: new Date()
            }
          })

          imported++

        } catch (error: any) {
          errors++
          errorLog.push({
            sku: item.sku,
            product: item.product,
            error: error.message
          })
        }
      }
    }

    // 5. Return results
    const totalProducts = productData.summary?.totalItems || 0

    return {
      success: true,
      imported,
      skipped,
      errors,
      errorLog,
      totalProducts,
      message: `Successfully processed ${totalProducts} products`
    }

  } catch (error: any) {
    return {
      success: false,
      imported,
      skipped,
      errors,
      errorLog,
      totalProducts: 0,
      message: `Error during seeding: ${error.message}`
    }
  }
}
