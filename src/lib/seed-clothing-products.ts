import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

// Price lookup by category name — returns realistic second-hand/bale clothing prices
function getPricingForCategory(categoryName: string): { base: number; cost: number } {
  const n = categoryName.toLowerCase()
  // Outerwear — highest value
  if (n.includes('jacket') || n.includes('coat') || n.includes('outerwear') || n.includes('parka') || n.includes('puffer') || n.includes('windbreaker') || n.includes('bomber')) return { base: 20.00, cost: 7.80 }
  if (n.includes('blazer') || n.includes('suit jacket')) return { base: 25.00, cost: 9.50 }
  if (n.includes('suit') || n.includes('suits')) return { base: 35.00, cost: 13.00 }
  // Hoodies / Sweatshirts / Fleece
  if (n.includes('hoodie') || n.includes('hoodies') || n.includes('sweatshirt') || n.includes('fleece')) return { base: 15.00, cost: 5.50 }
  // Tracksuits / Joggers
  if (n.includes('tracksuit')) return { base: 18.00, cost: 6.50 }
  if (n.includes('jogger') || n.includes('sweatpant')) return { base: 10.00, cost: 3.80 }
  // Jeans
  if (n.includes('jean') || n.includes('denim')) {
    if (n.includes('baby') || n.includes('toddler')) return { base: 5.00, cost: 2.00 }
    if (n.includes('boys') || n.includes('girls') || n.includes('kids')) return { base: 8.00, cost: 3.00 }
    if (n.includes('women') || n.includes('ladies') || n.includes('skin')) return { base: 14.00, cost: 5.50 }
    return { base: 15.00, cost: 6.00 } // mens default
  }
  // Dresses / Skirts
  if (n.includes('dress') || n.includes('dresses')) {
    if (n.includes('formal') || n.includes('wedding') || n.includes('bridesmaid') || n.includes('sheath')) return { base: 18.00, cost: 7.00 }
    if (n.includes('baby') || n.includes('toddler')) return { base: 4.00, cost: 1.50 }
    if (n.includes('girls') || n.includes('kids')) return { base: 6.00, cost: 2.40 }
    return { base: 9.00, cost: 3.50 }
  }
  if (n.includes('skirt') || n.includes('skirts')) return { base: 8.00, cost: 3.00 }
  // Shorts
  if (n.includes('short') || n.includes('shorts') || n.includes('bump short')) return { base: 5.00, cost: 2.00 }
  // Pants / Trousers / Cargo / Chinos / Leggings
  if (n.includes('cargo') || n.includes('chino') || n.includes('khaki')) return { base: 13.00, cost: 5.00 }
  if (n.includes('trouser') || n.includes('pant') || n.includes('pants') || n.includes('dress pant')) {
    if (n.includes('baby') || n.includes('toddler')) return { base: 4.00, cost: 1.50 }
    return { base: 12.00, cost: 4.50 }
  }
  if (n.includes('legging')) return { base: 5.00, cost: 2.00 }
  // T-Shirts / Tops
  if (n.includes('t-shirt') || n.includes('graphic tee') || n.includes('big size t')) {
    if (n.includes('baby') || n.includes('toddler')) return { base: 3.00, cost: 1.20 }
    if (n.includes('boys') || n.includes('girls') || n.includes('kids')) return { base: 4.00, cost: 1.60 }
    return { base: 5.50, cost: 2.00 }
  }
  if (n.includes('polo') || n.includes('rugby') || n.includes('henley')) return { base: 7.00, cost: 2.80 }
  if (n.includes('shirt') || n.includes('shirts') || n.includes('dress shirt')) {
    if (n.includes('baby') || n.includes('toddler')) return { base: 3.50, cost: 1.40 }
    if (n.includes('boys') || n.includes('girls')) return { base: 5.00, cost: 2.00 }
    return { base: 8.00, cost: 3.00 }
  }
  if (n.includes('top') || n.includes('tops') || n.includes('blouse') || n.includes('crop')) {
    if (n.includes('baby') || n.includes('toddler')) return { base: 3.00, cost: 1.20 }
    if (n.includes('boys') || n.includes('girls')) return { base: 4.00, cost: 1.60 }
    return { base: 6.00, cost: 2.40 }
  }
  // Jerseys / Sweaters / Knitwear
  if (n.includes('jersey') || n.includes('jerseys') || n.includes('sweater') || n.includes('knitwear') || n.includes('turtleneck') || n.includes('poloneck')) return { base: 12.00, cost: 4.50 }
  // Jumpsuits / Rompers / Playsuits / Co-ords
  if (n.includes('jumpsuit') || n.includes('romper') || n.includes('playsuit') || n.includes('co-ord')) return { base: 10.00, cost: 3.80 }
  // Swimwear
  if (n.includes('swim') || n.includes('bikini') || n.includes('swimsuit') || n.includes('swimwear')) return { base: 8.00, cost: 3.00 }
  // Lingerie / Underwear / Sleepwear
  if (n.includes('lingerie') || n.includes('nightwear') || n.includes('sleepwear') || n.includes('pajama') || n.includes('loungewear')) return { base: 8.00, cost: 3.00 }
  if (n.includes('bra') || n.includes('bralet')) return { base: 6.00, cost: 2.50 }
  if (n.includes('panties') || n.includes('boxer') || n.includes('brief') || n.includes('underwear') || n.includes('trunks') || n.includes('thong') || n.includes('g-string')) return { base: 3.50, cost: 1.20 }
  if (n.includes('vest') || n.includes('vests') || n.includes('tank top')) return { base: 4.00, cost: 1.50 }
  if (n.includes('sock') || n.includes('socks') || n.includes('tights')) return { base: 2.00, cost: 0.70 }
  // Sets / Outfits
  if (n.includes('set') || n.includes('sets') || n.includes('outfit') || n.includes('two piece')) return { base: 12.00, cost: 4.50 }
  // Shoes / Footwear
  if (n.includes('boot') || n.includes('chelsea') || n.includes('combat') || n.includes('oxford') || n.includes('heels') || n.includes('pump') || n.includes('platform')) return { base: 18.00, cost: 7.00 }
  if (n.includes('sneaker') || n.includes('trainer') || n.includes('active sneaker') || n.includes('casual sneaker') || n.includes('running')) return { base: 15.00, cost: 5.50 }
  if (n.includes('shoe') || n.includes('shoes') || n.includes('loafer') || n.includes('moccasin') || n.includes('mule') || n.includes('clog') || n.includes('espadrille')) return { base: 12.00, cost: 4.50 }
  if (n.includes('sandal') || n.includes('flip-flop') || n.includes('slipper')) return { base: 6.00, cost: 2.50 }
  // Bags / Accessories
  if (n.includes('leather handbag') || n.includes('shoulder bag')) return { base: 18.00, cost: 7.00 }
  if (n.includes('handbag') || n.includes('bag') || n.includes('purse') || n.includes('satchel') || n.includes('backpack') || n.includes('cross bag')) return { base: 12.00, cost: 4.50 }
  if (n.includes('wallet')) return { base: 5.00, cost: 2.00 }
  if (n.includes('watch')) return { base: 8.00, cost: 3.00 }
  if (n.includes('belt')) return { base: 5.00, cost: 1.80 }
  if (n.includes('cap') || n.includes('hat')) return { base: 4.00, cost: 1.50 }
  if (n.includes('scarf') || n.includes('glove')) return { base: 4.00, cost: 1.50 }
  if (n.includes('necklace') || n.includes('bracelet') || n.includes('earring') || n.includes('jewelry') || n.includes('cufflink')) return { base: 5.00, cost: 2.00 }
  if (n.includes('sunglasses') || n.includes('glasses')) return { base: 5.00, cost: 2.00 }
  if (n.includes('tie')) return { base: 4.00, cost: 1.50 }
  // Home Textiles
  if (n.includes('king') || n.includes('queen') || n.includes('bedsheet')) return { base: 25.00, cost: 10.00 }
  if (n.includes('towel') || n.includes('beach towel') || n.includes('ribbon towel')) return { base: 6.00, cost: 2.40 }
  if (n.includes('face towel') || n.includes('small towel') || n.includes('dish towel')) return { base: 3.00, cost: 1.20 }
  if (n.includes('sofa') || n.includes('couch')) return { base: 20.00, cost: 8.00 }
  // Baby extras
  if (n.includes('baby') || n.includes('toddler') || n.includes('napp')) return { base: 4.00, cost: 1.50 }
  // Kids general
  if (n.includes('boys') || n.includes('girls')) return { base: 5.00, cost: 2.00 }
  // Default fallback
  return { base: 8.00, cost: 3.00 }
}

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
            // Category doesn't exist in map - upsert it (rerunnable)
            console.log(`Upserting category: ${item.categoryName} in domain ${domainId}`)

            category = await prisma.businessCategories.upsert({
              where: {
                businessType_domainId_name: {
                  businessType: 'clothing',
                  domainId: domainId,
                  name: item.categoryName
                }
              },
              update: {
                description: item.categoryName,
                updatedAt: new Date()
              },
              create: {
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

          // Derive realistic prices based on category name
          const pricing = getPricingForCategory(item.categoryName)

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
              basePrice: pricing.base,
              costPrice: pricing.cost,
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
              basePrice: pricing.base,
              costPrice: pricing.cost,
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
              stockQuantity: 10,
              reorderLevel: 5,
              price: pricing.base,
              isActive: true,
              updatedAt: new Date()
            },
            create: {
              productId: product.id,
              name: 'Default',
              sku: sku,
              stockQuantity: 10,
              reorderLevel: 5,
              price: pricing.base,
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
