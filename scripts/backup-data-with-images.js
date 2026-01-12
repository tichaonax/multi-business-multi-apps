const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const fsPromises = require('fs/promises')

const prisma = new PrismaClient()

/**
 * Recursively copy directory
 */
async function copyDirectory(src, dest) {
  await fsPromises.mkdir(dest, { recursive: true })
  const entries = await fsPromises.readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath)
    } else {
      await fsPromises.copyFile(srcPath, destPath)
    }
  }
}

async function backupData() {
  try {
    console.log('Starting comprehensive data backup...')

    // Backup database
    const backup = {
      timestamp: new Date().toISOString(),
      users: await prisma.users.findMany(),
      businesses: await prisma.businesses.findMany(),
      businessMemberships: await prisma.businessMembership.findMany(),
      permissionTemplates: await prisma.permissionTemplate.findMany(),
      constructionProjects: await prisma.constructionProject.findMany(),
      constructionExpenses: await prisma.constructionExpense.findMany(),
      contractors: await prisma.contractor.findMany(),
      projectPayments: await prisma.projectPayment.findMany(),
      personalExpenses: await prisma.personalExpense.findMany(),
      expenseCategories: await prisma.expenseCategory.findMany(),
      personalBudgets: await prisma.personalBudget.findMany(),
      fundSources: await prisma.fundSource.findMany(),
      menuItems: await prisma.menuItem.findMany(),
      orders: await prisma.order.findMany(),
      orderItems: await prisma.orderItem.findMany(),
      businessProducts: await prisma.businessProducts.findMany(),
      productImages: await prisma.productImages.findMany(),
      productVariants: await prisma.productVariants.findMany(),
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
    const backupDir = path.join(__dirname, '..', 'backups', `backup_${timestamp}`)

    // Create backup directory
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    // Save database backup
    const dbBackupFile = path.join(backupDir, 'database.json')
    fs.writeFileSync(dbBackupFile, JSON.stringify(backup, null, 2))
    console.log(`✅ Database backup completed: ${dbBackupFile}`)

    // Backup product images
    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads')
    const imagesDir = path.join(uploadsDir, 'images')

    if (fs.existsSync(imagesDir)) {
      const backupImagesDir = path.join(backupDir, 'uploads', 'images')
      console.log('📸 Backing up product images...')

      try {
        await copyDirectory(imagesDir, backupImagesDir)

        // Count files
        const files = await fsPromises.readdir(imagesDir)
        const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
        console.log(`✅ Product images backup completed: ${imageFiles.length} images`)
      } catch (error) {
        console.warn('⚠️ Warning: Failed to backup images:', error.message)
      }
    } else {
      console.log('ℹ️ No images directory found, skipping images backup')
    }

    // Create backup manifest
    const manifest = {
      timestamp: new Date().toISOString(),
      backupType: 'full',
      databaseRecords: Object.values(backup).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0),
      includes: {
        database: true,
        productImages: fs.existsSync(imagesDir)
      }
    }

    const manifestFile = path.join(backupDir, 'manifest.json')
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2))

    console.log('\n' + '='.repeat(60))
    console.log(`✅ BACKUP COMPLETED SUCCESSFULLY`)
    console.log(`=`.repeat(60))
    console.log(`Location: ${backupDir}`)
    console.log(`Database records: ${manifest.databaseRecords}`)
    console.log(`Product images: ${manifest.includes.productImages ? 'Included' : 'Not found'}`)
    console.log(`=`.repeat(60))

  } catch (error) {
    console.error('❌ Backup failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

backupData()
