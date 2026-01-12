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

async function restoreData() {
  try {
    // Get backup directory from command line argument
    const backupDirArg = process.argv[2]
    if (!backupDirArg) {
      console.error('❌ Error: Please provide backup directory path')
      console.log('Usage: node restore-data-with-images.js <backup-directory-path>')
      console.log('Example: node restore-data-with-images.js ../backups/backup_2026-01-12T10-30-00')
      process.exit(1)
    }

    const backupDir = path.resolve(__dirname, backupDirArg)
    const dbBackupFile = path.join(backupDir, 'database.json')
    const manifestFile = path.join(backupDir, 'manifest.json')

    // Verify backup exists
    if (!fs.existsSync(backupDir)) {
      console.error(`❌ Error: Backup directory not found: ${backupDir}`)
      process.exit(1)
    }

    if (!fs.existsSync(dbBackupFile)) {
      console.error(`❌ Error: Database backup not found: ${dbBackupFile}`)
      process.exit(1)
    }

    // Read manifest
    let manifest = { includes: { database: true, productImages: false } }
    if (fs.existsSync(manifestFile)) {
      manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'))
      console.log('📋 Backup manifest:')
      console.log(`   Timestamp: ${manifest.timestamp}`)
      console.log(`   Type: ${manifest.backupType}`)
      console.log(`   Database records: ${manifest.databaseRecords}`)
      console.log(`   Product images: ${manifest.includes.productImages ? 'Yes' : 'No'}`)
    }

    console.log('\n⚠️  WARNING: This will overwrite your current database and images!')
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n')

    await new Promise(resolve => setTimeout(resolve, 5000))

    console.log('Starting restore...\n')

    // Read backup data
    const backupData = JSON.parse(fs.readFileSync(dbBackupFile, 'utf-8'))

    // Restore database tables
    console.log('🗄️  Restoring database...')

    // Define table restore order (respecting foreign key constraints)
    const tablesToRestore = [
      { name: 'users', data: backupData.users },
      { name: 'businesses', data: backupData.businesses },
      { name: 'businessMemberships', data: backupData.businessMemberships },
      { name: 'permissionTemplates', data: backupData.permissionTemplates },
      { name: 'expenseCategories', data: backupData.expenseCategories },
      { name: 'fundSources', data: backupData.fundSources },
      { name: 'constructionProjects', data: backupData.constructionProjects },
      { name: 'contractors', data: backupData.contractors },
      { name: 'constructionExpenses', data: backupData.constructionExpenses },
      { name: 'projectPayments', data: backupData.projectPayments },
      { name: 'personalExpenses', data: backupData.personalExpenses },
      { name: 'personalBudgets', data: backupData.personalBudgets },
      { name: 'menuItems', data: backupData.menuItems },
      { name: 'orders', data: backupData.orders },
      { name: 'orderItems', data: backupData.orderItems },
      { name: 'businessProducts', data: backupData.businessProducts },
      { name: 'productVariants', data: backupData.productVariants },
      { name: 'productImages', data: backupData.productImages },
    ]

    for (const table of tablesToRestore) {
      if (table.data && table.data.length > 0) {
        try {
          // Delete existing data
          await prisma[table.name].deleteMany({})
          console.log(`   ✓ Cleared ${table.name}`)

          // Restore data
          await prisma[table.name].createMany({
            data: table.data,
            skipDuplicates: true
          })
          console.log(`   ✓ Restored ${table.name}: ${table.data.length} records`)
        } catch (error) {
          console.error(`   ✗ Failed to restore ${table.name}:`, error.message)
        }
      }
    }

    // Restore product images
    if (manifest.includes.productImages) {
      const backupImagesDir = path.join(backupDir, 'uploads', 'images')
      const targetImagesDir = path.join(__dirname, '..', 'public', 'uploads', 'images')

      if (fs.existsSync(backupImagesDir)) {
        console.log('\n📸 Restoring product images...')

        try {
          // Clear existing images
          if (fs.existsSync(targetImagesDir)) {
            await fsPromises.rm(targetImagesDir, { recursive: true, force: true })
            console.log('   ✓ Cleared existing images')
          }

          // Copy backup images
          await copyDirectory(backupImagesDir, targetImagesDir)

          // Count restored files
          const files = await fsPromises.readdir(targetImagesDir)
          const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
          console.log(`   ✓ Restored ${imageFiles.length} product images`)
        } catch (error) {
          console.error('   ✗ Failed to restore images:', error.message)
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ RESTORE COMPLETED SUCCESSFULLY')
    console.log('='.repeat(60))
    console.log(`Restored from: ${backupDir}`)
    console.log(`Backup timestamp: ${backupData.timestamp}`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ Restore failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

restoreData()
