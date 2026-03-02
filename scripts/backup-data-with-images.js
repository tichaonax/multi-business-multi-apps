const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const fsPromises = require('fs/promises')
const archiver = require('archiver')

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

/**
 * Zip an entire directory into a .zip file
 */
function zipDirectory(sourceDir, outputZip) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputZip)
    const archive = archiver('zip', { zlib: { level: 6 } })

    output.on('close', () => resolve(archive.pointer()))
    archive.on('error', reject)

    archive.pipe(output)
    archive.directory(sourceDir, false) // false = no top-level folder wrapper
    archive.finalize()
  })
}

async function backupData() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
  const backupsRoot = path.join(__dirname, '..', 'backups')
  const tempDir = path.join(backupsRoot, `backup_${timestamp}`)
  const zipFile = path.join(backupsRoot, `backup_${timestamp}.zip`)

  try {
    console.log('Starting comprehensive data backup...')

    // Backup database
    const backup = {
      timestamp: new Date().toISOString(),
      users: await prisma.users.findMany(),
      businesses: await prisma.businesses.findMany(),
      businessMemberships: await prisma.businessMemberships.findMany(),
      permissionTemplates: await prisma.permissionTemplates.findMany(),
      constructionProjects: await prisma.constructionProjects.findMany(),
      constructionExpenses: await prisma.constructionExpenses.findMany(),
      personalExpenses: await prisma.personalExpenses.findMany(),
      expenseCategories: await prisma.expenseCategories.findMany(),
      personalBudgets: await prisma.personalBudgets.findMany(),
      fundSources: await prisma.fundSources.findMany(),
      menuItems: await prisma.menuItems.findMany(),
      orders: await prisma.orders.findMany(),
      orderItems: await prisma.orderItems.findMany(),
      businessProducts: await prisma.businessProducts.findMany(),
      productImages: await prisma.productImages.findMany(),
      productVariants: await prisma.productVariants.findMany(),

      // Expense account loans & transfers
      expenseAccountLenders: await prisma.expenseAccountLenders.findMany(),
      expenseAccountLoans: await prisma.expenseAccountLoans.findMany(),
      businessTransferLedger: await prisma.businessTransferLedger.findMany(),
      accountOutgoingLoans: await prisma.accountOutgoingLoans.findMany(),
      accountOutgoingLoanPayments: await prisma.accountOutgoingLoanPayments.findMany(),

      // Payroll additions
      payrollSlips: await prisma.payrollSlips.findMany(),
      payrollZimraRemittances: await prisma.payrollZimraRemittances.findMany(),
      payrollPaymentVouchers: await prisma.payrollPaymentVouchers.findMany(),
    }

    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true })

    // Save database backup
    fs.writeFileSync(path.join(tempDir, 'database.json'), JSON.stringify(backup, null, 2))
    console.log('✅ Database backup completed')

    // Backup product images (from public/uploads)
    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads')
    const imagesDir = path.join(uploadsDir, 'images')
    let productImageCount = 0

    if (fs.existsSync(imagesDir)) {
      console.log('📸 Backing up product images...')
      try {
        await copyDirectory(imagesDir, path.join(tempDir, 'uploads', 'images'))
        const files = await fsPromises.readdir(imagesDir)
        productImageCount = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f)).length
        console.log(`✅ Product images: ${productImageCount} images`)
      } catch (error) {
        console.warn('⚠️ Warning: Failed to backup product images:', error.message)
      }
    } else {
      console.log('ℹ️ No product images directory found, skipping')
    }

    // Backup employee profile photos (stored in PostgreSQL images table, expiresAt IS NULL)
    console.log('👤 Backing up employee profile photos...')
    let employeePhotoCount = 0

    try {
      const employeePhotos = await prisma.images.findMany({
        where: { expiresAt: null },
      })

      if (employeePhotos.length > 0) {
        const photosDir = path.join(tempDir, 'employee-photos')
        await fsPromises.mkdir(photosDir, { recursive: true })

        const photoMeta = []

        for (const photo of employeePhotos) {
          const ext = photo.mimeType === 'image/png' ? 'png'
            : photo.mimeType === 'image/webp' ? 'webp'
            : 'jpg'
          const filename = `${photo.id}.${ext}`
          await fsPromises.writeFile(path.join(photosDir, filename), photo.data)
          photoMeta.push({
            id: photo.id,
            filename,
            mimeType: photo.mimeType,
            size: photo.size,
            createdAt: photo.createdAt,
          })
        }

        await fsPromises.writeFile(
          path.join(photosDir, 'index.json'),
          JSON.stringify(photoMeta, null, 2)
        )

        employeePhotoCount = employeePhotos.length
        console.log(`✅ Employee photos: ${employeePhotoCount} photos`)
      } else {
        console.log('ℹ️ No employee photos found, skipping')
      }
    } catch (error) {
      console.warn('⚠️ Warning: Failed to backup employee photos:', error.message)
    }

    // Write manifest
    const manifest = {
      timestamp: new Date().toISOString(),
      backupType: 'full',
      databaseRecords: Object.values(backup).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0),
      includes: {
        database: true,
        productImages: productImageCount > 0,
        employeePhotos: employeePhotoCount > 0,
      },
      counts: {
        productImages: productImageCount,
        employeePhotos: employeePhotoCount,
      },
    }
    fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

    // Zip the backup directory into a single file
    console.log('🗜️  Compressing backup...')
    const zipBytes = await zipDirectory(tempDir, zipFile)
    console.log(`✅ Compressed: ${(zipBytes / 1024 / 1024).toFixed(2)} MB`)

    // Remove temp directory now that zip is created
    await fsPromises.rm(tempDir, { recursive: true, force: true })

    console.log('\n' + '='.repeat(60))
    console.log('✅ BACKUP COMPLETED SUCCESSFULLY')
    console.log('='.repeat(60))
    console.log(`ZIP file:        ${zipFile}`)
    console.log(`Database records: ${manifest.databaseRecords}`)
    console.log(`Product images:  ${productImageCount}`)
    console.log(`Employee photos: ${employeePhotoCount}`)
    console.log('='.repeat(60))
    console.log('\nTo restore on this or another machine:')
    console.log(`  node scripts/restore-data-with-images.js "${zipFile}"`)
    console.log('='.repeat(60))

  } catch (error) {
    // Clean up temp dir on failure
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
    console.error('❌ Backup failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

backupData()
