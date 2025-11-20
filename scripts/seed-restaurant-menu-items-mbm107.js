const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Seed Restaurant Menu Items - MBM-107
 *
 * This script seeds:
 * - 25 food & beverage products (single emoji)
 * - 1 service product (WIFI)
 * - 2 revenue items (Loan, Transfer In)
 * - 27 combo menu items (two emojis)
 *
 * Total: 55 products
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract emoji from product name
 * Example: "☕ Tea" => "☕"
 * Example: "☕🍞 Tea & Bread" => ["☕", "🍞"]
 */
function extractEmojis(text) {
  const emojiRegex = /[\p{Emoji}\u200d]+/gu
  const matches = text.match(emojiRegex)
  return matches || []
}

/**
 * Extract text after emoji(s)
 * Example: "☕ Tea" => "Tea"
 * Example: "☕🍞 Tea & Bread" => "Tea & Bread"
 */
function extractTextAfterEmoji(text) {
  // Remove all emojis and trim
  return text.replace(/[\p{Emoji}\u200d]+/gu, '').trim()
}

/**
 * Generate SKU from product name
 * Example: "Tea" => "RST-TEA-001"
 * Example: "Tea & Bread" => "RST-COMBO-TEA-BREAD-001"
 */
function generateSKU(name, isCombo = false) {
  // Extract text without emojis
  const text = extractTextAfterEmoji(name)

  // Create slug: uppercase, replace spaces/special chars with dash
  const slug = text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes

  // Add prefix
  const prefix = isCombo ? 'RST-COMBO' : 'RST'

  return `${prefix}-${slug}-001`
}

/**
 * Create or get category by name
 */
async function getOrCreateCategory(name, description, businessType = 'restaurant') {
  // First try to find existing type-based category (businessId = null)
  let category = await prisma.businessCategories.findFirst({
    where: {
      businessType,
      name,
      businessId: null
    }
  })

  if (!category) {
    // Create new type-based category
    const categoryId = `cat_${businessType}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_001`
    category = await prisma.businessCategories.create({
      data: {
        id: categoryId,
        businessType,
        name,
        description: description || name,
        businessId: null, // Type-based category
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    console.log(`  ✅ Created new category: ${name}`)
  }

  return category
}

/**
 * Create a single product with variant
 */
async function createProduct(businessId, productData, initialStock = 0) {
  const { name, sku, categoryId, basePrice = 0, costPrice = 0, attributes = {}, isCombo = false, comboItemsData = null, productType = 'PHYSICAL' } = productData

  // Upsert product
  const product = await prisma.businessProducts.upsert({
    where: { businessId_sku: { businessId, sku } },
    update: {
      name,
      description: attributes.description || '',
      basePrice,
      costPrice,
      categoryId,
      isCombo,
      comboItemsData,
      productType,
      attributes,
      updatedAt: new Date()
    },
    create: {
      businessId,
      name,
      description: attributes.description || '',
      sku,
      categoryId,
      basePrice,
      costPrice,
      businessType: 'restaurant',
      isActive: true,
      isCombo,
      comboItemsData,
      productType,
      attributes,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })

  // Create default variant
  const timestamp = Date.now()
  const variantSku = `${sku}-VARIANT-${timestamp}`
  const variantId = `${product.id}-variant-default-${timestamp}`

  await prisma.productVariants.upsert({
    where: { id: variantId },
    update: {
      sku: variantSku,
      price: basePrice,
      stockQuantity: initialStock,
      isActive: true,
      updatedAt: new Date()
    },
    create: {
      id: variantId,
      productId: product.id,
      sku: variantSku,
      price: basePrice,
      stockQuantity: initialStock,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })

  return product
}

/**
 * Find product by name (for combo references)
 */
async function findProductByName(businessId, namePattern) {
  // Try exact match first
  let product = await prisma.businessProducts.findFirst({
    where: {
      businessId,
      name: {
        contains: namePattern,
        mode: 'insensitive'
      }
    }
  })

  return product
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seed() {
  try {
    console.log('🍽️  Starting restaurant menu items seed (MBM-107)...\n')

    const businessId = 'restaurant-demo-business'
    const now = new Date()

    // Verify business exists
    const business = await prisma.businesses.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      console.error(`❌ Business not found: ${businessId}`)
      console.error('   Please run: node scripts/seed-restaurant-demo.js first')
      process.exitCode = 1
      return
    }

    console.log(`✅ Found business: ${business.name}\n`)

    // ========================================================================
    // STEP 1: Get/Create Categories
    // ========================================================================
    console.log('📂 Setting up categories...')

    const mainCoursesCategory = await getOrCreateCategory('Main Courses', 'Main dishes and entrees')
    const beveragesCategory = await getOrCreateCategory('Beverages', 'Drinks and beverages')
    const appetizersCategory = await getOrCreateCategory('Appetizers', 'Starters and sides')
    const dessertsCategory = await getOrCreateCategory('Desserts', 'Sweet treats')
    const revenueCategory = await getOrCreateCategory('Revenue', 'Revenue and financial transactions')

    console.log('✅ Categories ready\n')

    // ========================================================================
    // STEP 2: Create Single Products
    // ========================================================================
    console.log('🍴 Creating single products (28 items)...\n')

    const singleProducts = [
      // Beverages
      { name: '☕ Tea', category: beveragesCategory.id },
      { name: '🧃 Revive', category: beveragesCategory.id },
      { name: '🍹 Beverages', category: beveragesCategory.id },
      { name: '🚰 Bottled Water', category: beveragesCategory.id },
      { name: '🥛 Milk', category: beveragesCategory.id },
      { name: '🛜 WIFI', category: beveragesCategory.id, productType: 'SERVICE', attributes: { serviceType: 'wifi', requiresCodeGeneration: false } },

      // Main Courses - Base items
      { name: '🍽️ Sadza', category: mainCoursesCategory.id },
      { name: '🍚 Rice', category: mainCoursesCategory.id },
      { name: '🍝 Spaghetti', category: mainCoursesCategory.id },
      { name: '🍛 Curry Rice', category: mainCoursesCategory.id },

      // Main Courses - Proteins
      { name: '🥩 Beef', category: mainCoursesCategory.id },
      { name: '🐔 Chicken', category: mainCoursesCategory.id },
      { name: '🐟 Fish', category: mainCoursesCategory.id },
      { name: '🐐 Goat', category: mainCoursesCategory.id },
      { name: '🐓 Road Runner', category: mainCoursesCategory.id },
      { name: '🥩 Liver', category: mainCoursesCategory.id },
      { name: '🍲 Gango', category: mainCoursesCategory.id },
      { name: '🧭 Guru', category: mainCoursesCategory.id },
      { name: '🐂 Beef Restock', category: mainCoursesCategory.id },

      // Appetizers
      { name: '🍞 Bread', category: appetizersCategory.id },
      { name: '🌭 Russian', category: appetizersCategory.id },
      { name: '🍟 Chips', category: appetizersCategory.id },
      { name: '🥬 Vegetables', category: appetizersCategory.id },
      { name: '🥗 Salad', category: appetizersCategory.id },
      { name: '🫘 Beans', category: appetizersCategory.id },

      // Desserts
      { name: '🍪 Cookies', category: dessertsCategory.id },

      // Revenue items (special)
      { name: '💰 Loan', category: revenueCategory.id, attributes: { itemType: 'revenue', transactionType: 'loan', isFinancialTransaction: true } },
      { name: '🦚 Transfer In', category: revenueCategory.id, attributes: { itemType: 'revenue', transactionType: 'transfer_in', isFinancialTransaction: true } }
    ]

    const createdProducts = {}

    for (const item of singleProducts) {
      const emojis = extractEmojis(item.name)
      const sku = generateSKU(item.name, false)

      const productData = {
        name: item.name,
        sku,
        categoryId: item.category,
        basePrice: 0,
        costPrice: 0,
        isCombo: false,
        productType: item.productType || 'PHYSICAL',
        attributes: {
          emoji: emojis[0] || '',
          itemType: item.attributes?.itemType || 'single',
          ...item.attributes
        }
      }

      const product = await createProduct(businessId, productData)
      createdProducts[item.name] = product
      console.log(`  ✅ ${item.name} (${sku})`)
    }

    console.log(`\n✅ Created ${singleProducts.length} single products\n`)

    // ========================================================================
    // STEP 3: Create Combo Menu Items
    // ========================================================================
    console.log('🍽️  Creating combo menu items (27 items)...\n')

    const comboItems = [
      { name: '☕🍞 Tea & Bread', components: ['☕ Tea', '🍞 Bread'], category: appetizersCategory.id },
      { name: '🌭🍟 Russian & Chips', components: ['🌭 Russian', '🍟 Chips'], category: appetizersCategory.id },
      { name: '🍽️🥩 Sadza & Beef', components: ['🍽️ Sadza', '🥩 Beef'], category: mainCoursesCategory.id },
      { name: '🍽️🐔 Sadza & Chicken', components: ['🍽️ Sadza', '🐔 Chicken'], category: mainCoursesCategory.id },
      { name: '🍽️🐟 Sadza & Fish', components: ['🍽️ Sadza', '🐟 Fish'], category: mainCoursesCategory.id },
      { name: '🍚🐔 Rice & Chicken', components: ['🍚 Rice', '🐔 Chicken'], category: mainCoursesCategory.id },
      { name: '🍚🥩 Rice & Beef', components: ['🍚 Rice', '🥩 Beef'], category: mainCoursesCategory.id },
      { name: '🍚🐟 Rice & Fish', components: ['🍚 Rice', '🐟 Fish'], category: mainCoursesCategory.id },
      { name: '🍝🥩 Spaghetti & Beef', components: ['🍝 Spaghetti', '🥩 Beef'], category: mainCoursesCategory.id },
      { name: '🍝🐔 Spaghetti & Chicken', components: ['🍝 Spaghetti', '🐔 Chicken'], category: mainCoursesCategory.id },
      { name: '🍚🐐 Rice & Goat', components: ['🍚 Rice', '🐐 Goat'], category: mainCoursesCategory.id },
      { name: '🍽️🐐 Sadza & Goat', components: ['🍽️ Sadza', '🐐 Goat'], category: mainCoursesCategory.id },
      { name: '🍝🐐 Spaghetti & Goat', components: ['🍝 Spaghetti', '🐐 Goat'], category: mainCoursesCategory.id },
      { name: '🍽️🫘 Sadza & Beans', components: ['🍽️ Sadza', '🫘 Beans'], category: mainCoursesCategory.id },
      { name: '🍚🫘 Rice & Beans', components: ['🍚 Rice', '🫘 Beans'], category: mainCoursesCategory.id },
      { name: '🍽️🍲 Sadza & Gango', components: ['🍽️ Sadza', '🍲 Gango'], category: mainCoursesCategory.id },
      { name: '🍽️🐓 Sadza & Road Runner', components: ['🍽️ Sadza', '🐓 Road Runner'], category: mainCoursesCategory.id },
      { name: '🍚🐓 Rice & Road Runner', components: ['🍚 Rice', '🐓 Road Runner'], category: mainCoursesCategory.id },
      { name: '🍽️🧭 Sadza & Guru', components: ['🍽️ Sadza', '🧭 Guru'], category: mainCoursesCategory.id },
      { name: '🍽️🥛 Sadza & Milk', components: ['🍽️ Sadza', '🥛 Milk'], category: mainCoursesCategory.id },
      { name: '🍽️🐟 Sadza & Fish (L)', components: ['🍽️ Sadza', '🐟 Fish'], category: mainCoursesCategory.id },
      { name: '🍚🐟 Rice & Fish (L)', components: ['🍚 Rice', '🐟 Fish'], category: mainCoursesCategory.id },
      { name: '🐟🍟 Fish & Chips', components: ['🐟 Fish', '🍟 Chips'], category: mainCoursesCategory.id },
      { name: '🐔🍟 Chicken & Chips', components: ['🐔 Chicken', '🍟 Chips'], category: mainCoursesCategory.id },
      { name: '🥩🍟 Beef & Chips', components: ['🥩 Beef', '🍟 Chips'], category: mainCoursesCategory.id },
      { name: '🍚🥩 Rice & Liver', components: ['🍚 Rice', '🥩 Liver'], category: mainCoursesCategory.id },
      { name: '🍽️🥩 Sadza & Liver', components: ['🍽️ Sadza', '🥩 Liver'], category: mainCoursesCategory.id }
    ]

    let comboSuccessCount = 0
    let comboErrorCount = 0

    for (const combo of comboItems) {
      try {
        const emojis = extractEmojis(combo.name)
        const sku = generateSKU(combo.name, true)

        // Find component products
        const comboItemsData = {
          items: []
        }

        let allComponentsFound = true
        for (const componentName of combo.components) {
          const component = createdProducts[componentName]
          if (component) {
            comboItemsData.items.push({
              productId: component.id,
              quantity: 1,
              name: extractTextAfterEmoji(componentName)
            })
          } else {
            console.log(`  ⚠️  Warning: Component not found for ${combo.name}: ${componentName}`)
            allComponentsFound = false
          }
        }

        if (!allComponentsFound) {
          console.log(`  ❌ Skipping ${combo.name} - missing components`)
          comboErrorCount++
          continue
        }

        const productData = {
          name: combo.name,
          sku,
          categoryId: combo.category,
          basePrice: 0,
          costPrice: 0,
          isCombo: true,
          comboItemsData,
          attributes: {
            emojis,
            itemType: 'combo',
            comboComponents: combo.components.map(c => extractTextAfterEmoji(c))
          }
        }

        await createProduct(businessId, productData)
        console.log(`  ✅ ${combo.name} (${sku})`)
        comboSuccessCount++
      } catch (error) {
        console.error(`  ❌ Error creating combo ${combo.name}:`, error.message)
        comboErrorCount++
      }
    }

    console.log(`\n✅ Created ${comboSuccessCount} combo items`)
    if (comboErrorCount > 0) {
      console.log(`⚠️  Failed to create ${comboErrorCount} combo items`)
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n' + '='.repeat(60))
    console.log('✅ Restaurant menu items seed complete!')
    console.log('='.repeat(60))
    console.log(`📊 Single products: ${singleProducts.length}`)
    console.log(`📊 Combo items: ${comboSuccessCount}`)
    console.log(`📊 Total products: ${singleProducts.length + comboSuccessCount}`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

// Run seed if called directly
if (require.main === module) {
  seed()
}

module.exports = { seed }
