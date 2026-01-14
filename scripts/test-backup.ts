/**
 * Test Backup Script
 * Tests the backup system to find all missing tables/columns at once
 */

import { PrismaClient } from '@prisma/client'
import { createCleanBackup } from '../src/lib/backup-clean'

const prisma = new PrismaClient()

async function testBackup() {
  console.log('='.repeat(60))
  console.log('TESTING BACKUP SYSTEM')
  console.log('='.repeat(60))
  console.log()

  try {
    console.log('[TEST] Starting backup with all options...')
    console.log('[TEST] Options: full backup, include business data, no demo data')
    console.log()

    const backupData = await createCleanBackup(prisma, {
      backupType: 'full',
      includeDemoData: false,
      includeDeviceData: true,
      includeAuditLogs: false,
      auditLogLimit: 1000,
      createdBy: 'Test Script'
    })

    console.log()
    console.log('='.repeat(60))
    console.log('✅ BACKUP COMPLETED SUCCESSFULLY!')
    console.log('='.repeat(60))
    console.log()
    console.log('Backup Metadata:')
    console.log('  Version:', backupData.metadata.version)
    console.log('  Timestamp:', backupData.metadata.timestamp)
    console.log('  Total Records:', backupData.metadata.stats.totalRecords)
    console.log('  Uncompressed Size:', backupData.metadata.stats.uncompressedSize, 'bytes')
    console.log()
    console.log('Business Data Tables:', Object.keys((backupData as any).businessData || {}).length)
    console.log('Shared Data Tables:', Object.keys((backupData as any).sharedData || {}).length)
    if ((backupData as any).deviceData) {
      console.log('Device Data Tables:', Object.keys((backupData as any).deviceData).length)
    }
    console.log()
    console.log('✅ ALL TESTS PASSED - No missing tables or columns!')
    console.log()

  } catch (error: any) {
    console.log()
    console.log('='.repeat(60))
    console.log('❌ BACKUP FAILED!')
    console.log('='.repeat(60))
    console.log()
    console.log('Error:', error.message)
    console.log()

    if (error.message.includes('does not exist')) {
      console.log('⚠️  MISSING TABLE OR COLUMN DETECTED')
      console.log()

      // Try to extract table/column name
      const tableMatch = error.message.match(/table `[^`]+\.([^`]+)`/)
      const columnMatch = error.message.match(/column `[^`]+\.([^`]+)`/)

      if (tableMatch) {
        console.log('Missing table:', tableMatch[1])
      }
      if (columnMatch) {
        console.log('Missing column:', columnMatch[1])
      }
    }

    console.log()
    console.log('Full error details:')
    console.log(error)
    console.log()

    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testBackup()
