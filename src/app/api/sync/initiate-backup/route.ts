/**
 * Initiate Backup API
 * Triggers backup creation on remote server (for PULL requests)
 */

import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'crypto'
import { spawn } from 'child_process'
import { isPgDumpAvailable, installPgDumpHint } from '@/lib/pg-utils'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync, statSync } from 'fs'

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
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      )
    }

    // Ensure backups directory exists
    const backupsDir = join(process.cwd(), 'backups')
    if (!existsSync(backupsDir)) {
      await mkdir(backupsDir, { recursive: true })
    }

    const backupFile = join(backupsDir, `full-sync-${sessionId}.sql`)

    // Create backup using pg_dump
    await createDatabaseBackup(backupFile)

    const stats = statSync(backupFile)
    const backupSize = stats.size

    console.log(`✅ Backup created for PULL request: ${(backupSize / 1024 / 1024).toFixed(2)} MB`)

    return NextResponse.json({
      success: true,
      backupCreated: true,
      size: backupSize,
      filename: `full-sync-${sessionId}.sql`
    })

  } catch (error) {
    console.error('Failed to create backup:', error)
    return NextResponse.json(
      {
        error: 'Failed to create backup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Create PostgreSQL backup using pg_dump
 */
async function createDatabaseBackup(backupFile: string): Promise<void> {
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
      '-f', backupFile,
      '--data-only',
      '--column-inserts',
      '--no-owner',
      '--no-privileges'
    ]

    const env = {
      ...process.env,
      PGPASSWORD: url.password || ''
    }

    if (!isPgDumpAvailable()) {
      const hint = installPgDumpHint()
      console.error('pg_dump is not available on this server - aborting backup creation', hint)
      reject(new Error(`pg_dump not available: ${hint}`))
      return
    }

    console.log(`Creating backup with pg_dump...`)
    const pgDump = spawn('pg_dump', args, { env })

    let stderr = ''
    pgDump.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    pgDump.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`pg_dump failed with code ${code}: ${stderr}`))
      }
    })

    pgDump.on('error', (error) => {
      reject(new Error(`Failed to run pg_dump: ${error.message}. Is PostgreSQL installed?`))
    })
  })
}
