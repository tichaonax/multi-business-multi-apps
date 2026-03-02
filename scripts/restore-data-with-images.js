const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const fsPromises = require('fs/promises')
const yauzl = require('yauzl')
const os = require('os')

const prisma = new PrismaClient()

/**
 * Extract a zip file to a directory
 */
function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err)

      zipfile.readEntry()

      zipfile.on('entry', (entry) => {
        const entryPath = path.join(destDir, entry.fileName)

        if (/\/$/.test(entry.fileName)) {
          // Directory entry
          fs.mkdirSync(entryPath, { recursive: true })
          zipfile.readEntry()
        } else {
          // File entry
          fs.mkdirSync(path.dirname(entryPath), { recursive: true })
          zipfile.openReadStream(entry, (streamErr, readStream) => {
            if (streamErr) return reject(streamErr)
            const writeStream = fs.createWriteStream(entryPath)
            readStream.pipe(writeStream)
            writeStream.on('close', () => zipfile.readEntry())
            writeStream.on('error', reject)
          })
        }
      })

      zipfile.on('end', resolve)
      zipfile.on('error', reject)
    })
  })
}

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
  let tempExtractDir = null

  try {
    // Get backup path from command line argument
    const backupArg = process.argv[2]
    if (!backupArg) {
      console.error('❌ Error: Please provide backup path')
      console.log('Usage: node restore-data-with-images.js <backup.zip or backup-directory>')
      console.log('Example: node restore-data-with-images.js ../backups/backup_2026-01-12T10-30-00.zip')
      process.exit(1)
    }

    const backupPath = path.resolve(__dirname, backupArg)

    let backupDir = backupPath

    // If a zip file was provided, extract it first
    if (backupArg.endsWith('.zip')) {
      if (!fs.existsSync(backupPath)) {
        console.error(`❌ Error: Zip file not found: ${backupPath}`)
        process.exit(1)
      }
      tempExtractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mbm-restore-'))
      console.log(`📦 Extracting zip file...`)
      await extractZip(backupPath, tempExtractDir)
      backupDir = tempExtractDir
      console.log(`✅ Extracted to temporary directory`)
    }

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
      console.log(`   Product images: ${manifest.includes.productImages ? `Yes (${manifest.counts?.productImages ?? '?'})` : 'No'}`)
      console.log(`   Employee photos: ${manifest.includes.employeePhotos ? `Yes (${manifest.counts?.employeePhotos ?? '?'})` : 'No'}`)
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

    // Restore product images (from public/uploads)
    if (manifest.includes.productImages) {
      const backupImagesDir = path.join(backupDir, 'uploads', 'images')
      const targetImagesDir = path.join(__dirname, '..', 'public', 'uploads', 'images')

      if (fs.existsSync(backupImagesDir)) {
        console.log('\n📸 Restoring product images...')

        try {
          if (fs.existsSync(targetImagesDir)) {
            await fsPromises.rm(targetImagesDir, { recursive: true, force: true })
            console.log('   ✓ Cleared existing images')
          }

          await copyDirectory(backupImagesDir, targetImagesDir)

          const files = await fsPromises.readdir(targetImagesDir)
          const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
          console.log(`   ✓ Restored ${imageFiles.length} product images`)
        } catch (error) {
          console.error('   ✗ Failed to restore product images:', error.message)
        }
      }
    }

    // Restore employee profile photos (into PostgreSQL images table)
    const photosDir = path.join(backupDir, 'employee-photos')
    const photosIndex = path.join(photosDir, 'index.json')

    if (fs.existsSync(photosIndex)) {
      console.log('\n👤 Restoring employee profile photos...')

      try {
        const photoMeta = JSON.parse(fs.readFileSync(photosIndex, 'utf-8'))
        let restoredCount = 0

        for (const meta of photoMeta) {
          const filePath = path.join(photosDir, meta.filename)
          if (!fs.existsSync(filePath)) {
            console.warn(`   ⚠️  Photo file missing: ${meta.filename}`)
            continue
          }

          const data = await fsPromises.readFile(filePath)

          await prisma.images.upsert({
            where: { id: meta.id },
            update: { data, mimeType: meta.mimeType, size: meta.size },
            create: {
              id: meta.id,
              data,
              mimeType: meta.mimeType,
              size: meta.size,
              expiresAt: null,
              createdAt: new Date(meta.createdAt),
            },
          })
          restoredCount++
        }

        console.log(`   ✓ Restored ${restoredCount} employee photos`)
      } catch (error) {
        console.error('   ✗ Failed to restore employee photos:', error.message)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ RESTORE COMPLETED SUCCESSFULLY')
    console.log('='.repeat(60))
    console.log(`Restored from: ${backupPath}`)
    console.log(`Backup timestamp: ${backupData.timestamp}`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ Restore failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    // Clean up temp extraction directory if we created one
    if (tempExtractDir && fs.existsSync(tempExtractDir)) {
      await fsPromises.rm(tempExtractDir, { recursive: true, force: true })
    }
  }
}

restoreData()
