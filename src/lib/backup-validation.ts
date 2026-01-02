/**
 * Backup Validation Utilities
 * Verifies that backup and restore data match
 */

import { PrismaClient } from '@prisma/client'

type AnyPrismaClient = PrismaClient & any

export interface ValidationResult {
  tableName: string
  backupCount: number
  databaseCount: number
  match: boolean
  difference: number
  status: 'exact-match' | 'expected-difference' | 'unexpected-mismatch'
  notes?: string
}

export interface ValidationSummary {
  totalTables: number
  exactMatches: number
  expectedDifferences: number
  unexpectedMismatches: number
  results: ValidationResult[]
  overallStatus: 'success' | 'warning' | 'error'
}

/**
 * Count records in backup data
 */
export function countBackupRecords(backupData: any): Record<string, number> {
  const counts: Record<string, number> = {}

  // Handle v3.0 format (businessData/deviceData)
  if (backupData.businessData || backupData.deviceData) {
    // Count businessData
    if (backupData.businessData) {
      for (const [tableName, records] of Object.entries(backupData.businessData)) {
        if (Array.isArray(records)) {
          counts[tableName] = records.length
        }
      }
    }
    // Count deviceData
    if (backupData.deviceData) {
      for (const [tableName, records] of Object.entries(backupData.deviceData)) {
        if (Array.isArray(records)) {
          counts[tableName] = (counts[tableName] || 0) + records.length
        }
      }
    }
  } else {
    // v2.0 flat format
    for (const [key, value] of Object.entries(backupData)) {
      if (key !== 'metadata' && Array.isArray(value)) {
        counts[key] = value.length
      }
    }
  }

  return counts
}

/**
 * Count records in database after restore
 */
export async function countDatabaseRecords(
  prisma: AnyPrismaClient,
  tableNames: string[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}

  for (const tableName of tableNames) {
    try {
      // Find the Prisma model name
      const modelName = findPrismaModelName(prisma, tableName)
      const model = prisma[modelName]

      if (model && typeof model.count === 'function') {
        const count = await model.count()
        counts[tableName] = count
      } else {
        console.warn(`[validation] Model ${modelName} not found or doesn't support count`)
        counts[tableName] = -1 // -1 indicates unable to count
      }
    } catch (error) {
      console.error(`[validation] Error counting ${tableName}:`, error)
      counts[tableName] = -1
    }
  }

  return counts
}

/**
 * Model name mappings (backup table names to Prisma model names)
 */
const TABLE_TO_MODEL_MAPPING: Record<string, string> = {
  'customerLaybys': 'customerLayby',
  'customerLaybyPayments': 'customerLaybyPayment'
}

/**
 * Find Prisma model name from table name
 */
function findPrismaModelName(prisma: AnyPrismaClient, name: string): string {
  // Check explicit mappings first
  if (TABLE_TO_MODEL_MAPPING[name]) {
    return TABLE_TO_MODEL_MAPPING[name]
  }

  // Direct match
  if ((prisma as any)[name]) return name

  // Convert snake_case to camelCase
  const camel = name.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase())
  if ((prisma as any)[camel]) return camel

  // Try lowercase comparison
  const lower = name.toLowerCase().replace(/_/g, '')
  for (const key of Object.keys(prisma)) {
    if (key.toLowerCase().replace(/_/g, '') === lower) {
      return key
    }
  }

  return name
}

/**
 * Validate backup vs database
 */
export async function validateBackupRestore(
  prisma: AnyPrismaClient,
  backupData: any,
  restoreResult?: {
    processed: number
    skippedRecords: number
    modelCounts: Record<string, { attempted: number; successful: number; skipped: number }>
  }
): Promise<ValidationSummary> {
  console.log('[validation] Starting backup validation...')

  // Count records in backup
  const backupCounts = countBackupRecords(backupData)
  const tableNames = Object.keys(backupCounts)

  console.log(`[validation] Found ${tableNames.length} tables in backup`)

  // Count records in database
  const dbCounts = await countDatabaseRecords(prisma, tableNames)

  // Compare and build results
  const results: ValidationResult[] = []
  let exactMatches = 0
  let expectedDifferences = 0
  let unexpectedMismatches = 0

  for (const tableName of tableNames) {
    const backupCount = backupCounts[tableName] || 0
    const databaseCount = dbCounts[tableName] || 0
    const difference = Math.abs(backupCount - databaseCount)
    const match = backupCount === databaseCount

    // Get restore stats for this table
    const restoreStats = restoreResult?.modelCounts?.[tableName]
    const skipped = restoreStats?.skipped || 0

    let status: ValidationResult['status']
    let notes: string | undefined

    if (match) {
      status = 'exact-match'
      exactMatches++
    } else if (databaseCount === -1) {
      status = 'unexpected-mismatch'
      notes = 'Unable to count records in database'
      unexpectedMismatches++
    } else if (restoreStats && backupCount === restoreStats.attempted && databaseCount === restoreStats.successful) {
      // Expected: some records were skipped due to foreign key constraints
      status = 'expected-difference'
      notes = `${skipped} records skipped during restore (foreign key constraints or validation errors)`
      expectedDifferences++
    } else if (difference <= skipped) {
      // Difference is within expected skipped range
      status = 'expected-difference'
      notes = `Difference matches skipped count (${skipped} skipped)`
      expectedDifferences++
    } else {
      // Unexpected mismatch
      status = 'unexpected-mismatch'
      notes = `Unexpected difference: backup=${backupCount}, database=${databaseCount}, skipped=${skipped}`
      unexpectedMismatches++
    }

    results.push({
      tableName,
      backupCount,
      databaseCount,
      match,
      difference,
      status,
      notes
    })

    console.log(`[validation] ${tableName}: backup=${backupCount}, db=${databaseCount}, status=${status}`)
  }

  // Sort results: mismatches first, then expected differences, then exact matches
  results.sort((a, b) => {
    const priority = { 'unexpected-mismatch': 0, 'expected-difference': 1, 'exact-match': 2 }
    return priority[a.status] - priority[b.status]
  })

  const overallStatus: ValidationSummary['overallStatus'] =
    unexpectedMismatches > 0 ? 'error' :
    expectedDifferences > 0 ? 'warning' :
    'success'

  const summary: ValidationSummary = {
    totalTables: tableNames.length,
    exactMatches,
    expectedDifferences,
    unexpectedMismatches,
    results,
    overallStatus
  }

  console.log('[validation] Validation complete:', {
    totalTables: summary.totalTables,
    exactMatches: summary.exactMatches,
    expectedDifferences: summary.expectedDifferences,
    unexpectedMismatches: summary.unexpectedMismatches,
    overallStatus: summary.overallStatus
  })

  return summary
}

/**
 * Format validation summary as human-readable text
 */
export function formatValidationSummary(summary: ValidationSummary): string {
  let text = `Backup Validation Report\n`
  text += `========================\n\n`

  // Overall status
  const statusEmoji = {
    'success': '✅',
    'warning': '⚠️',
    'error': '❌'
  }[summary.overallStatus]

  text += `Overall Status: ${statusEmoji} ${summary.overallStatus.toUpperCase()}\n\n`

  // Summary stats
  text += `Total Tables: ${summary.totalTables}\n`
  text += `✅ Exact Matches: ${summary.exactMatches}\n`
  text += `⚠️  Expected Differences: ${summary.expectedDifferences}\n`
  text += `❌ Unexpected Mismatches: ${summary.unexpectedMismatches}\n\n`

  // Detailed results
  if (summary.unexpectedMismatches > 0) {
    text += `\n❌ UNEXPECTED MISMATCHES:\n`
    text += `========================\n`
    summary.results
      .filter(r => r.status === 'unexpected-mismatch')
      .forEach(r => {
        text += `\n${r.tableName}:\n`
        text += `  Backup: ${r.backupCount} records\n`
        text += `  Database: ${r.databaseCount} records\n`
        text += `  Difference: ${r.difference}\n`
        if (r.notes) text += `  Notes: ${r.notes}\n`
      })
  }

  if (summary.expectedDifferences > 0) {
    text += `\n⚠️  EXPECTED DIFFERENCES:\n`
    text += `========================\n`
    summary.results
      .filter(r => r.status === 'expected-difference')
      .forEach(r => {
        text += `\n${r.tableName}:\n`
        text += `  Backup: ${r.backupCount} records\n`
        text += `  Database: ${r.databaseCount} records\n`
        text += `  Difference: ${r.difference}\n`
        if (r.notes) text += `  Notes: ${r.notes}\n`
      })
  }

  // Top exact matches (just count, not full list)
  if (summary.exactMatches > 0) {
    text += `\n✅ EXACT MATCHES: ${summary.exactMatches} tables\n`
    const topMatches = summary.results
      .filter(r => r.status === 'exact-match')
      .sort((a, b) => b.backupCount - a.backupCount)
      .slice(0, 10)

    if (topMatches.length > 0) {
      text += `Top ${topMatches.length} by record count:\n`
      topMatches.forEach(r => {
        text += `  • ${r.tableName}: ${r.backupCount} records\n`
      })
    }
  }

  return text
}
