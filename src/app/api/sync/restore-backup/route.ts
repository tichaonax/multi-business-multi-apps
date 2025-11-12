/**
 * Restore Backup API
 * Restores received backup file to database with UPSERT logic
 */

import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'crypto'
import { spawn } from 'child_process'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const nodeId = request.headers.get('X-Node-ID')
    const registrationHash = request.headers.get('X-Registration-Hash')

    if (!nodeId || !registrationHash) {
      return NextResponse.json(
        { error: 'Missing authentication headers' },
        { status: 401 }
      )
    }

    const expectedHash = crypto.createHash('sha256')
      .update(process.env.SYNC_REGISTRATION_KEY || '')
      .digest('hex')

    if (registrationHash !== expectedHash) {
      return NextResponse.json(
        { error: 'Invalid registration key' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { sessionId, filename } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      )
    }

    // Find backup file - use provided filename or fallback to old naming
    const backupFile = filename 
      ? join(process.cwd(), 'backups', filename)
      : join(process.cwd(), 'backups', `initial-load-${sessionId}.sql`)

    console.log(`🔍 Looking for backup file: ${backupFile}`)
    console.log(`📁 Current working directory: ${process.cwd()}`)
    
    const backupsDir = join(process.cwd(), 'backups')
    console.log(`📁 Backups directory: ${backupsDir}`)
    
    try {
      const files = require('fs').readdirSync(backupsDir)
      console.log(`📁 Backups directory contents (${files.length} files):`, files)
    } catch (dirError) {
      const errorMessage = dirError instanceof Error ? dirError.message : 'Unknown error'
      console.error(`❌ Failed to read backups directory: ${errorMessage}`)
      return NextResponse.json(
        { error: `Failed to read backups directory: ${errorMessage}` },
        { status: 500 }
      )
    }

    if (!existsSync(backupFile)) {
      console.error(`❌ Backup file not found: ${backupFile}`)
      console.error(`❌ File exists check: ${existsSync(backupFile)}`)
      return NextResponse.json(
        { error: 'Backup file not found' },
        { status: 404 }
      )
    }

    console.log(`📦 Found backup file: ${backupFile}`)

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

  // Pattern to match: INSERT INTO table_name (columns) VALUES (values);
  // Convert to: INSERT INTO table_name (columns) VALUES (values) ON CONFLICT (id) DO UPDATE SET ...

  const lines = sql.split('\n')
  const upsertLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Check if this is an INSERT statement
    if (line.startsWith('INSERT INTO ')) {
      // Extract table name and columns
      const tableMatch = line.match(/INSERT INTO (\w+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\);/)

      if (tableMatch) {
        const tableName = tableMatch[1]
        const columns = tableMatch[2].split(',').map(c => c.trim())
        const values = tableMatch[3]

        // Build UPDATE SET clause for all columns except id
        const updateColumns = columns
          .filter(col => col !== 'id')
          .map(col => `${col} = EXCLUDED.${col}`)
          .join(', ')

        // Construct UPSERT statement
        const upsertStmt = `INSERT INTO ${tableName} (${tableMatch[2]}) VALUES (${values}) ON CONFLICT (id) DO UPDATE SET ${updateColumns};`

        upsertLines.push(upsertStmt)
      } else {
        // Keep line as-is if we can't parse it
        upsertLines.push(line)
      }
    } else {
      // Keep non-INSERT lines as-is
      upsertLines.push(line)
    }
  }

  writeFileSync(upsertFile, upsertLines.join('\n'))
  console.log(`✅ Converted to UPSERT: ${upsertFile}`)

  return upsertFile
}

/**
 * Restore database from SQL file
 */
async function restoreDatabase(sqlFile: string): Promise<void> {
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
