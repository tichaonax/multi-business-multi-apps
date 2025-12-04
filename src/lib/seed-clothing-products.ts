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
  skipped: number // Always 0 now - kept for API compatibility
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

    // 3. Load all existing clothing categories and domains
    const categories = await prisma.businessCategories.findMany({
      where: { businessType: 'clothing' },
      include: {
        inventory_subcategories: true,
        domain: true
      }
    })

    // Load all domains to ensure they exist
    const domains = await prisma.inventoryDomains.findMany({
      where: {
        OR: [
          { name: { in: ['Mens', 'Womens', 'Boys', 'Girls', 'Baby', 'Accessories', 'Home Textiles', 'General Merchandise'] } }
        ]
      }
    })

    const domainLookup = new Map<string, any>()
    domains.forEach(d => domainLookup.set(d.id, d))

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
          // Generate unique SKU for this business + product
          const sku = item.sku

          // Look up or create category (businessType specific, NOT businessId specific)
          const categoryKey = `${domainId}|${item.categoryName}`
          let category = categoryMap.get(categoryKey)

          if (!category) {
            // Category doesn't exist - create it (businessType: 'clothing', businessId: null)
            console.log(`Creating missing category: ${item.categoryName} in domain ${domainId}`)
            
            category = await prisma.businessCategories.create({
              data: {
                name: item.categoryName,
                businessType: 'clothing',
                businessId: null, // Business type specific, not business ID specific
                domainId: domainId,
                description: item.categoryName,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            })
            
            // Add to map for future lookups
            categoryMap.set(categoryKey, category)
          }

          // Look up or create subcategory if available
          let subcategoryId = null
          if (item.subcategoryName) {
            const subcategoryKey = `${category.id}|${item.subcategoryName}`
            let subcategory = subcategoryMap.get(subcategoryKey)
            
            if (!subcategory) {
              // Subcategory doesn't exist - create it
              console.log(`Creating missing subcategory: ${item.subcategoryName} for category ${item.categoryName}`)
              
              subcategory = await prisma.inventorySubcategories.create({
                data: {
                  name: item.subcategoryName,
                  categoryId: category.id,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              })
              
              // Add to map for future lookups
              subcategoryMap.set(subcategoryKey, subcategory)
            }
            
            subcategoryId = subcategory.id
          }

          // Use upsert to either create new product or update existing one
          const product = await prisma.businessProducts.upsert({
            where: {
              businessId_sku: {
                businessId: businessId,
                sku: sku
              }
            },
            update: {
              name: item.product,
              categoryId: category.id,
              subcategoryId: subcategoryId,
              basePrice: 0.00, // Reset to default, can be updated later
              costPrice: null,
              businessType: 'clothing',
              isActive: true,
              isAvailable: true,
              productType: 'PHYSICAL',
              condition: 'NEW',
              description: item.categoryName,
              updatedAt: new Date()
            },
            create: {
              businessId: businessId,
              name: item.product,
              sku: sku,
              categoryId: category.id,
              subcategoryId: subcategoryId,
              basePrice: 0.00,
              costPrice: null,
              businessType: 'clothing',
              isActive: true,
              isAvailable: true,
              productType: 'PHYSICAL',
              condition: 'NEW',
              description: item.categoryName,
              updatedAt: new Date()
            }
          })

          // Handle product variant - upsert by unique SKU (not productId which is not unique)
          await prisma.productVariants.upsert({
            where: {
              sku: sku // Use unique SKU constraint
            },
            update: {
              name: 'Default',
              productId: product.id, // Ensure variant is linked to current product
              stockQuantity: 0,
              reorderLevel: 5,
              price: 0.00,
              isActive: true,
              updatedAt: new Date()
            },
            create: {
              productId: product.id,
              name: 'Default',
              sku: sku,
              stockQuantity: 0,
              reorderLevel: 5,
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
      skipped: 0, // No longer skipping - we update existing products
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
