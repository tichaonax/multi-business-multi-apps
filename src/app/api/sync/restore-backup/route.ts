/**
 * Restore Backup API
 * Restores received backup file to database with UPSERT logic
 */

import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'crypto'
import { spawn } from 'child_process'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  console.log('🔄 [RESTORE-BACKUP ENDPOINT] Request received!')
  console.log('🔄 [RESTORE-BACKUP ENDPOINT] Headers:', Object.fromEntries(request.headers.entries()))

  try {
    // Validate authentication
    const nodeId = request.headers.get('X-Node-ID')
    const registrationHash = request.headers.get('X-Registration-Hash')

    console.log('🔄 [RESTORE-BACKUP ENDPOINT] Auth headers - nodeId:', nodeId, 'registrationHash present:', !!registrationHash)

    if (!nodeId || !registrationHash) {
      console.error('❌ [RESTORE-BACKUP ENDPOINT] Missing authentication headers')
      return NextResponse.json(
        { error: 'Missing authentication headers' },
        { status: 401 }
      )
    }

    const expectedHash = crypto.createHash('sha256')
      .update(process.env.SYNC_REGISTRATION_KEY || '')
      .digest('hex')

    console.log('🔄 [RESTORE-BACKUP ENDPOINT] Hash validation - expected:', expectedHash.substring(0, 8) + '...', 'received:', registrationHash.substring(0, 8) + '...')

    if (registrationHash !== expectedHash) {
      console.error('❌ [RESTORE-BACKUP ENDPOINT] Invalid registration key')
      return NextResponse.json(
        { error: 'Invalid registration key' },
        { status: 403 }
      )
    }

    console.log('✅ [RESTORE-BACKUP ENDPOINT] Authentication successful')

    const body = await request.json()
    const { sessionId, filename } = body

    console.log('🔄 [RESTORE-BACKUP ENDPOINT] Request body - sessionId:', sessionId, 'filename:', filename)

    if (!sessionId) {
      console.error('❌ [RESTORE-BACKUP ENDPOINT] Missing sessionId')
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      )
    }

    // Find backup file - use provided filename or fallback to old naming
    const backupFile = filename 
      ? join(process.cwd(), 'backups', filename)
      : join(process.cwd(), 'backups', `initial-load-${sessionId}.sql`)

    console.log(`🔍 RESTORE-BACKUP: Looking for backup file: ${backupFile}`)
    console.log(`� RESTORE-BACKUP: Provided filename: ${filename}`)
    console.log(`🔍 RESTORE-BACKUP: Session ID: ${sessionId}`)
    console.log(`🔍 RESTORE-BACKUP: Current working directory: ${process.cwd()}`)
    
    const backupsDir = join(process.cwd(), 'backups')
    console.log(`� RESTORE-BACKUP: Backups directory: ${backupsDir}`)
    
    try {
      const fs = require('fs')
      const files = fs.readdirSync(backupsDir)
      console.log(`� RESTORE-BACKUP: Backups directory contents (${files.length} files):`, files)
      
      // Check if the specific file exists
      const fileExists = fs.existsSync(backupFile)
      console.log(`🔍 RESTORE-BACKUP: Target file exists: ${fileExists}`)
      
      if (fileExists) {
        const stats = fs.statSync(backupFile)
        console.log(`🔍 RESTORE-BACKUP: File size: ${stats.size} bytes (${(stats.size / 1024 / 1024).toFixed(2)} MB)`)
        console.log(`🔍 RESTORE-BACKUP: File modified: ${stats.mtime}`)
      }
      
    } catch (dirError) {
      const errorMessage = dirError instanceof Error ? dirError.message : 'Unknown error'
      console.error(`❌ RESTORE-BACKUP: Failed to read backups directory: ${errorMessage}`)
      return NextResponse.json(
        { error: `Failed to read backups directory: ${errorMessage}` },
        { status: 500 }
      )
    }

    if (!existsSync(backupFile)) {
      console.error(`❌ RESTORE-BACKUP: Backup file not found: ${backupFile}`)
      console.error(`❌ RESTORE-BACKUP: File exists check: ${existsSync(backupFile)}`)
      return NextResponse.json(
        { error: '[RESTORE-BACKUP ENDPOINT] Backup file not found' },
        { status: 404 }
      )
    }

    console.log(`✅ RESTORE-BACKUP: Found backup file: ${backupFile}`)

    // Convert INSERT statements to UPSERT
    const upsertFile = await convertToUpsert(backupFile)

    // Restore database
    await restoreDatabase(upsertFile)

    console.log(`✅ Database restored successfully`)

    return NextResponse.json({
      success: true,
      message: 'Database restored successfully',
      sessionId
    })

  } catch (error) {
    console.error('Failed to restore backup:', error)
    return NextResponse.json(
      {
        error: 'Failed to restore backup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Convert INSERT statements to UPSERT (INSERT ... ON CONFLICT DO UPDATE)
 */
async function convertToUpsert(backupFile: string): Promise<string> {
  const sql = readFileSync(backupFile, 'utf-8')
  const upsertFile = backupFile.replace('.sql', '-upsert.sql')

  // Get unique constraints for each table
  const uniqueConstraints = await getUniqueConstraints()

  // Filter out PostgreSQL dump comments and metadata
  const lines = sql.split('\n')
  const filteredLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip PostgreSQL dump comments and metadata
    if (line.startsWith('--') ||
        line.includes('PostgreSQL database dump') ||
        line.includes('Dump completed') ||
        line.includes('Type: TABLE DATA') ||
        line.includes('Schema: public') ||
        line.includes('Owner:') ||
        line === '' ||
        line.startsWith('SET ') ||
        line.startsWith('SELECT ')) {
      continue
    }

    filteredLines.push(lines[i])
  }

  // Join back and split by semicolons to get complete statements
  const filteredSql = filteredLines.join('\n')
  const statements = filteredSql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'))

  const upsertLines: string[] = []

  for (const statement of statements) {
    // Check if this is an INSERT statement
    if (statement.toUpperCase().startsWith('INSERT INTO ')) {
      // Extract table name and columns
      const tableMatch = statement.match(/INSERT INTO (\w+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)/i)

      if (tableMatch) {
        const tableName = tableMatch[1]
        const columns = tableMatch[2].split(',').map(c => c.trim())
        const values = tableMatch[3]

        // Get unique constraints for this table
        const tableConstraints = uniqueConstraints[tableName] || []

        // Find the best constraint to use for conflict resolution
        // Prefer composite constraints over single-column id constraint
        let conflictColumns: string[] = ['id'] // default fallback

        if (tableConstraints.length > 0) {
          // Use the first composite constraint, or single column if that's all we have
          const compositeConstraints = tableConstraints.filter((constraint: string[]) => constraint.length > 1)
          if (compositeConstraints.length > 0) {
            conflictColumns = compositeConstraints[0]
          } else {
            // Use single column constraint if available
            conflictColumns = tableConstraints[0]
          }
        }

        console.log(`🔄 Converting ${tableName} INSERT to UPSERT using conflict columns: ${conflictColumns.join(', ')}`)

        // Build UPDATE SET clause for all columns except those in the conflict target
        const updateColumns = columns
          .filter(col => !conflictColumns.includes(col))
          .map(col => `${col} = EXCLUDED.${col}`)
          .join(', ')

        // Only add UPSERT if there are columns to update
        let upsertStmt: string
        if (updateColumns.length > 0) {
          upsertStmt = `INSERT INTO ${tableName} (${tableMatch[2]}) VALUES (${values}) ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET ${updateColumns};`
        } else {
          // If no columns to update (all columns are in conflict target), use ON CONFLICT DO NOTHING
          upsertStmt = `INSERT INTO ${tableName} (${tableMatch[2]}) VALUES (${values}) ON CONFLICT (${conflictColumns.join(', ')}) DO NOTHING;`
        }

        upsertLines.push(upsertStmt)
      } else {
        // Keep statement as-is if we can't parse it
        upsertLines.push(statement + ';')
      }
    } else if (statement.length > 0) {
      // Keep non-INSERT statements as-is (like CREATE, ALTER, etc.)
      upsertLines.push(statement + ';')
    }
  }

  writeFileSync(upsertFile, upsertLines.join('\n'))
  console.log(`✅ Converted to UPSERT: ${upsertFile}`)
  console.log(`📊 Found unique constraints for ${Object.keys(uniqueConstraints).length} tables`)
  console.log(`📝 Processed ${statements.length} SQL statements`)

  return upsertFile
}

/**
 * Restore database from SQL file
 */
async function restoreDatabase(sqlFile: string): Promise<void> {
  try {
    // Try psql first (traditional method)
    await restoreWithPsql(sqlFile)
  } catch (psqlError) {
    console.warn('psql not available, falling back to Prisma:', psqlError instanceof Error ? psqlError.message : String(psqlError))

    // Fallback to Prisma-based restoration
    await restoreWithPrisma(sqlFile)
  }
}

/**
 * Restore database using psql (traditional method)
 */
async function restoreWithPsql(sqlFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      reject(new Error('DATABASE_URL not configured'))
      return
    }

    // Parse connection string
    const url = new URL(databaseUrl)
    const args = [
      '-h', url.hostname,
      '-p', url.port || '5432',
      '-U', url.username,
      '-d', url.pathname.slice(1),
      '-f', sqlFile,
      '-v', 'ON_ERROR_STOP=0' // Continue on errors (for idempotency)
    ]

    const env = {
      ...process.env,
      PGPASSWORD: url.password || ''
    }

    console.log(`Running psql to restore...`)
    const psql = spawn('psql', args, { env })

    let stdout = ''
    let stderr = ''

    psql.stdout.on('data', (data) => {
      stdout += data.toString()
      console.log(data.toString())
    })

    psql.stderr.on('data', (data) => {
      stderr += data.toString()
      console.error(data.toString())
    })

    psql.on('close', (code) => {
      if (code === 0 || stderr.includes('ERROR') === false) {
        resolve()
      } else {
        reject(new Error(`psql failed with code ${code}: ${stderr}`))
      }
    })

    psql.on('error', (error) => {
      reject(new Error(`Failed to run psql: ${error.message}. Is PostgreSQL installed?`))
    })
  })
}

/**
 * Restore database using Prisma (fallback method)
 */
async function restoreWithPrisma(sqlFile: string): Promise<void> {
  console.log('Restoring database using Prisma...')

  const sql = readFileSync(sqlFile, 'utf-8')

  // Split by semicolons but be careful with semicolons inside VALUES clauses
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
    .map(s => s.endsWith(';') ? s : s + ';') // Ensure each statement ends with semicolon

  console.log(`Found ${statements.length} SQL statements to execute`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    if (!statement || statement.trim() === ';') continue

    try {
      console.log(`Executing statement ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`)
      await prisma.$queryRawUnsafe(statement)
      successCount++
    } catch (error) {
      errorCount++
      // Log the error but continue with other statements
      console.warn(`Statement ${i + 1} failed:`, error instanceof Error ? error.message : String(error))
      console.warn(`Failed statement:`, statement.substring(0, 200) + '...')

      // For INSERT statements, try to convert to UPSERT if it fails due to conflicts
      if (statement.toUpperCase().startsWith('INSERT INTO') && error instanceof Error && error.message.includes('duplicate key')) {
        try {
          const upsertStatement = await convertInsertToUpsert(statement)
          console.log(`Retrying with UPSERT...`)
          await prisma.$queryRawUnsafe(upsertStatement)
          console.log(`UPSERT successful`)
          successCount++
          errorCount--
        } catch (upsertError) {
          console.error(`UPSERT also failed:`, upsertError instanceof Error ? upsertError.message : String(upsertError))
        }
      }
    }
  }

  console.log(`Database restoration completed with Prisma: ${successCount} successful, ${errorCount} failed`)
}

/**
 * Get unique constraints for each table from the Prisma schema
 */
async function getUniqueConstraints(): Promise<Record<string, string[][]>> {
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma')
  const schema = readFileSync(schemaPath, 'utf-8')

  const constraints: Record<string, string[][]> = {}
  let currentModel = ''

  const lines = schema.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Find model declarations
    const modelMatch = trimmed.match(/^model (\w+) \{/)
    if (modelMatch) {
      currentModel = modelMatch[1]
      constraints[currentModel] = []
      continue
    }

    // Find unique constraints
    if (trimmed.startsWith('@@unique')) {
      const uniqueMatch = trimmed.match(/@@unique\(\[([^\]]+)\]\)/)
      if (uniqueMatch && currentModel) {
        const columns = uniqueMatch[1].split(',').map(col => col.trim())
        constraints[currentModel].push(columns)
      }
    }

    // Also check for @unique fields (single column)
    const fieldUniqueMatch = trimmed.match(/^(\w+)\s+.*\s+@unique/)
    if (fieldUniqueMatch && currentModel) {
      const column = fieldUniqueMatch[1]
      constraints[currentModel].push([column])
    }
  }

  // Also create lowercase versions for table name matching
  const tableConstraints: Record<string, string[][]> = {}
  for (const [modelName, constraintList] of Object.entries(constraints)) {
    // Convert PascalCase to snake_case (Prisma's default table naming)
    const tableName = modelName
      .split('')
      .map((char, index) => {
        if (index > 0 && char >= 'A' && char <= 'Z') {
          return '_' + char.toLowerCase()
        }
        return char.toLowerCase()
      })
      .join('')
    tableConstraints[tableName] = constraintList
  }

  return { ...constraints, ...tableConstraints }
}

/**
 * Convert INSERT statement to UPSERT for conflict resolution
 */
async function convertInsertToUpsert(insertStatement: string): Promise<string> {
  // Get unique constraints for dynamic conflict resolution
  const uniqueConstraints = await getUniqueConstraints()

  // Simple conversion for basic INSERT statements
  // This is a fallback for when we can't parse the full statement
  const match = insertStatement.match(/INSERT INTO (\w+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)/i)
  if (!match) return insertStatement

  const tableName = match[1]
  const columns = match[2].split(',').map(c => c.trim())
  const values = match[3]

  // Get unique constraints for this table
  const tableConstraints = uniqueConstraints[tableName] || []

  // Find the best constraint to use for conflict resolution
  let conflictColumns: string[] = ['id'] // default fallback

  if (tableConstraints.length > 0) {
    // Use the first composite constraint, or single column if that's all we have
    const compositeConstraints = tableConstraints.filter((constraint: string[]) => constraint.length > 1)
    if (compositeConstraints.length > 0) {
      conflictColumns = compositeConstraints[0]
    } else {
      // Use single column constraint if available
      conflictColumns = tableConstraints[0]
    }
  }

  // Build UPDATE SET clause for all columns except those in the conflict target
  const updateColumns = columns
    .filter(col => !conflictColumns.includes(col))
    .map(col => `${col} = EXCLUDED.${col}`)
    .join(', ')

  // Only add UPSERT if there are columns to update
  if (updateColumns.length > 0) {
    return `INSERT INTO ${tableName} (${match[2]}) VALUES (${values}) ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET ${updateColumns}`
  } else {
    // If no columns to update (all columns are in conflict target), use ON CONFLICT DO NOTHING
    return `INSERT INTO ${tableName} (${match[2]}) VALUES (${values}) ON CONFLICT (${conflictColumns.join(', ')}) DO NOTHING`
  }
}
