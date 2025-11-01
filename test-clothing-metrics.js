/**
 * Test script to verify clothing-specific metrics calculations
 * Tests: seasonalStock %, avgMarkdown %, sizeDistribution, brandCount
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testClothingMetrics() {
  try {
    const businessId = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'clothing-demo-business'
    console.log(`\n🧪 Testing Clothing Metrics for: ${businessId}\n`)

    // Fetch products with variants and brands
    const products = await prisma.businessProducts.findMany({
      where: {
        businessId,
        isActive: true
      },
      include: {
        product_variants: true,
        business_brands: true
      }
    })

    console.log(`📦 Total Products: ${products.length}`)
    
    // Show sample product details
    if (products.length > 0) {
      console.log('\n📋 Sample Product Details:')
      products.slice(0, 2).forEach(p => {
        console.log(`  Product: ${p.name}`)
        console.log(`    - Brand: ${p.business_brands?.name || 'None'}`)
        console.log(`    - Attributes: ${JSON.stringify(p.attributes)}`)
        console.log(`    - Original Price: ${p.originalPrice}`)
        console.log(`    - Base Price: ${p.basePrice}`)
        console.log(`    - Discount %: ${p.discountPercent}`)
        console.log(`    - Promotion: ${p.promotionStartDate ? 'Yes' : 'No'}`)
        console.log(`    - Variants: ${p.product_variants.length}`)
        p.product_variants.slice(0, 3).forEach(v => {
          console.log(`      * ${v.name || v.sku}: Attributes = ${JSON.stringify(v.attributes)}`)
        })
      })
    }

    // Calculate metrics
    let seasonalItemsCount = 0
    let markdownItemsTotal = 0
    let markdownItemsCount = 0
    const sizeMap = new Map()
    const brandSet = new Set()
    let totalItems = products.length

    products.forEach((product) => {
      // Count seasonal items
      if (product.attributes?.season || product.promotionStartDate) {
        seasonalItemsCount++
        console.log(`  ✓ Seasonal: ${product.name} (${product.attributes?.season || 'promotion'})`)
      }

      // Calculate markdown
      if (product.discountPercent && parseFloat(product.discountPercent) > 0) {
        const markdown = parseFloat(product.discountPercent)
        markdownItemsTotal += markdown
        markdownItemsCount++
        console.log(`  💰 Markdown: ${product.name} = ${markdown}%`)
      } else if (product.originalPrice && product.basePrice && 
                 parseFloat(product.originalPrice) > parseFloat(product.basePrice)) {
        const markdown = ((parseFloat(product.originalPrice) - parseFloat(product.basePrice)) / 
                         parseFloat(product.originalPrice)) * 100
        markdownItemsTotal += markdown
        markdownItemsCount++
        console.log(`  💰 Markdown: ${product.name} = ${markdown.toFixed(1)}%`)
      }

      // Collect sizes
      if (product.product_variants && product.product_variants.length > 0) {
        product.product_variants.forEach((variant) => {
          // Try attributes first
          let size = variant.attributes?.size || variant.attributes?.Size
          
          // Parse from variant name if no attributes
          if (!size && variant.name) {
            const sizeMatch = variant.name.match(/\b(XXS|XS|S|M|L|XL|XXL|XXXL|Size\s+\d+|\d+)\b/i)
            if (sizeMatch) {
              size = sizeMatch[1].toUpperCase()
            }
          }
          
          if (size) {
            sizeMap.set(size, (sizeMap.get(size) || 0) + variant.stockQuantity)
            console.log(`  📏 Size: ${size} from "${variant.name}" (Stock: ${variant.stockQuantity})`)
          }
        })
      }

      // Count brands
      if (product.business_brands) {
        brandSet.add(product.business_brands.name)
      }
    })

    // Calculate results
    const seasonalStockPercent = totalItems > 0 ? (seasonalItemsCount / totalItems) * 100 : 0
    const avgMarkdownPercent = markdownItemsCount > 0 ? markdownItemsTotal / markdownItemsCount : 0
    
    const totalSizeStock = Array.from(sizeMap.values()).reduce((sum, count) => sum + count, 0)
    const sizeDistribution = {}
    sizeMap.forEach((count, size) => {
      sizeDistribution[size] = totalSizeStock > 0 ? Math.round((count / totalSizeStock) * 100) : 0
    })

    console.log('\n📊 Calculated Metrics:')
    console.log('====================')
    console.log(`Seasonal Stock: ${seasonalStockPercent.toFixed(1)}% (${seasonalItemsCount}/${totalItems} items)`)
    console.log(`Avg Markdown: ${avgMarkdownPercent.toFixed(1)}% (${markdownItemsCount} items with markdowns)`)
    console.log(`Brand Count: ${brandSet.size}`)
    console.log(`Brands: ${Array.from(brandSet).join(', ') || 'None'}`)
    console.log(`\nSize Distribution:`)
    Object.entries(sizeDistribution).forEach(([size, percent]) => {
      const count = sizeMap.get(size)
      console.log(`  ${size}: ${percent}% (${count} units)`)
    })

    console.log('\n✅ Test complete\n')

  } catch (error) {
    console.error('❌ Error testing metrics:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testClothingMetrics()
