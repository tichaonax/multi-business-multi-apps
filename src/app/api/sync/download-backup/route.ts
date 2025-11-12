/**
 * Download Backup API
 * Serves backup files for PULL operations
 */

import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'crypto'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId parameter' },
        { status: 400 }
      )
    }

    // Find backup file - try different naming patterns
    const possibleFiles = [
      `full-sync-${sessionId}.sql`,
      `initial-load-${sessionId}.sql`,
      `backup-${sessionId}.sql`
    ]

    let backupFile: string | null = null
    for (const filename of possibleFiles) {
      const filePath = join(process.cwd(), 'backups', filename)
      if (existsSync(filePath)) {
        backupFile = filePath
        break
      }
    }

    if (!backupFile) {
      return NextResponse.json(
        { error: 'Backup file not found' },
        { status: 404 }
      )
    }

    console.log(`📦 Serving backup file: ${backupFile}`)

    // Read and return the backup file
    const fileContent = readFileSync(backupFile)
    const base64Content = fileContent.toString('base64')

    return NextResponse.json({
      success: true,
      backupContent: base64Content,
      filename: backupFile.split('/').pop() || 'backup.sql',
      size: fileContent.length
    })

  } catch (error) {
    console.error('Failed to download backup:', error)
    return NextResponse.json(
      { error: 'Failed to download backup' },
      { status: 500 }
    )
  }
}