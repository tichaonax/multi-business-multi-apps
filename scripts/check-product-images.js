/**
 * Check Product Images for Sync
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function checkProductImages() {
  console.log('🖼️  Checking Product Images for Sync')
  console.log('═══════════════════════════════════════════════════\n')

  try {
    // Get all product images
    const images = await prisma.productImages.findMany({
      select: {
        id: true,
        productId: true,
        imageUrl: true,
        isPrimary: true,
        business_products: {
          select: {
            name: true,
            businessId: true
          }
        }
      },
      take: 10
    })

    console.log(`📊 Total Images in Database: ${images.length}\n`)

    if (images.length > 0) {
      console.log('Sample Images:')
      images.forEach((img, i) => {
        console.log(`${i + 1}. Product: ${img.business_products?.name || 'Unknown'}`)
        console.log(`   Image URL: ${img.imageUrl}`)
        console.log(`   Primary: ${img.isPrimary ? 'Yes' : 'No'}`)

        // Check if file exists
        const filePath = path.join(process.cwd(), 'public', img.imageUrl)
        const exists = fs.existsSync(filePath)
        console.log(`   File Exists: ${exists ? '✅ Yes' : '❌ No'}`)
        if (exists) {
          const stats = fs.statSync(filePath)
          console.log(`   File Size: ${(stats.size / 1024).toFixed(2)} KB`)
        }
        console.log('')
      })
    }

    console.log('═══════════════════════════════════════════════════')
    console.log('📋 Image Sync Requirements:\n')
    console.log('1. Database Records:')
    console.log('   - ProductImages table (id, productId, imageUrl, etc.)')
    console.log('   - Currently NOT being tracked by change tracker\n')

    console.log('2. File Content:')
    console.log('   - Physical files in public/uploads/images/')
    console.log('   - Need to transfer actual image bytes\n')

    console.log('3. Implementation Needed:')
    console.log('   - Add ProductImages to change tracker')
    console.log('   - Include file content in sync events (base64)')
    console.log('   - Modify sync receive to write files to disk')
    console.log('   - Handle large files and errors\n')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkProductImages()
