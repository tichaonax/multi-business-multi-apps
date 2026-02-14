/**
 * Test script: Restore a backup file and report errors
 * Usage: node scripts/test-restore-backup.js <path-to-backup.json.gz>
 */
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const zlib = require('zlib')
const path = require('path')

const prisma = new PrismaClient()

async function main() {
  const backupPath = process.argv[2]
  if (!backupPath) {
    console.error('Usage: node scripts/test-restore-backup.js <path-to-backup.json.gz>')
    process.exit(1)
  }

  console.log('Loading backup from:', backupPath)

  // Read and decompress
  const raw = fs.readFileSync(backupPath)
  let jsonStr
  try {
    jsonStr = zlib.gunzipSync(raw).toString('utf-8')
  } catch {
    jsonStr = raw.toString('utf-8')
  }

  const backupData = JSON.parse(jsonStr)
  console.log('Backup version:', backupData.metadata?.version)
  console.log('Backup timestamp:', backupData.metadata?.timestamp)
  console.log('Source node:', backupData.metadata?.sourceNodeId)

  // Count tables and records
  const tables = Object.keys(backupData).filter(k => k !== 'metadata')
  let totalRecords = 0
  for (const t of tables) {
    const count = Array.isArray(backupData[t]) ? backupData[t].length : 0
    if (count > 0) totalRecords += count
  }
  console.log(`Tables: ${tables.length}, Total records: ${totalRecords}\n`)

  // Import restoreCleanBackup
  // We need to use ts-node or tsx to import TypeScript
  // Instead, let's use the compiled version or call directly

  // Use dynamic import with tsx
  const { restoreCleanBackup } = await import('../src/lib/restore-clean.ts')

  const errors = []
  const result = await restoreCleanBackup(prisma, backupData, {
    onProgress: (model, processed, total) => {
      if (processed === total) {
        process.stdout.write(`  ${model}: ${processed}/${total}\n`)
      }
    },
    onError: (model, recordId, error) => {
      errors.push({ model, recordId, error })
      console.error(`  ERROR [${model}] ${recordId}: ${error}`)
    }
  })

  console.log('\n=== RESTORE RESULT ===')
  console.log('Success:', result.success)
  console.log('Processed:', result.processed)
  console.log('Errors:', result.errors)
  console.log('Skipped:', result.skippedRecords)
  console.log('Device mismatch:', result.deviceMismatch)
  console.log('Skipped device data:', result.skippedDeviceData)

  if (result.errorLog.length > 0) {
    console.log('\n=== ERROR DETAILS ===')
    for (const e of result.errorLog) {
      console.log(`  [${e.model}] ${e.recordId}: ${e.error}`)
    }
  }

  console.log('\n=== MODEL COUNTS ===')
  for (const [model, counts] of Object.entries(result.modelCounts)) {
    if (counts.skipped > 0 || counts.attempted > 0) {
      console.log(`  ${model}: attempted=${counts.attempted} success=${counts.successful} skipped=${counts.skipped}`)
    }
  }
}

main()
  .catch(err => {
    console.error('Script failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
