/**
 * Download Backup API
 * Serves backup files for PULL operations
 */

import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'crypto'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest) {
  console.log('📥 [DOWNLOAD-BACKUP ENDPOINT] Request received!')
  
  try {
    // Validate authentication
    const nodeId = request.headers.get('X-Node-ID')
    const registrationHash = request.headers.get('X-Registration-Hash')
    
    console.log('🔐 [DOWNLOAD-BACKUP ENDPOINT] Auth headers - NodeId:', nodeId, 'Hash present:', !!registrationHash)

    if (!nodeId || !registrationHash) {
      console.log('❌ [DOWNLOAD-BACKUP ENDPOINT] Missing authentication headers')
      return NextResponse.json(
        { error: 'Missing authentication headers' },
        { status: 401 }
      )
    }

    const expectedHash = crypto.createHash('sha256')
      .update(process.env.SYNC_REGISTRATION_KEY || '')
      .digest('hex')
    
    console.log('🔐 [DOWNLOAD-BACKUP ENDPOINT] Hash validation - expected:', expectedHash.substring(0, 8) + '...', 'received:', registrationHash.substring(0, 8) + '...')

    if (registrationHash !== expectedHash) {
      console.log('❌ [DOWNLOAD-BACKUP ENDPOINT] Invalid registration key')
      return NextResponse.json(
        { error: 'Invalid registration key' },
        { status: 403 }
      )
    }

    console.log('✅ [DOWNLOAD-BACKUP ENDPOINT] Authentication passed')

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    console.log('🔄 [DOWNLOAD-BACKUP ENDPOINT] Request params - sessionId:', sessionId)

    if (!sessionId) {
      console.log('❌ [DOWNLOAD-BACKUP ENDPOINT] Missing sessionId parameter')
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

    console.log('🔍 [DOWNLOAD-BACKUP ENDPOINT] Looking for backup files with patterns:', possibleFiles)
    console.log('🔍 [DOWNLOAD-BACKUP ENDPOINT] Backups directory:', join(process.cwd(), 'backups'))

    let backupFile: string | null = null
    for (const filename of possibleFiles) {
      const filePath = join(process.cwd(), 'backups', filename)
      console.log(`🔍 [DOWNLOAD-BACKUP ENDPOINT] Checking file: ${filePath} - exists: ${existsSync(filePath)}`)
      if (existsSync(filePath)) {
        backupFile = filePath
        console.log(`✅ [DOWNLOAD-BACKUP ENDPOINT] Found backup file: ${backupFile}`)
        break
      }
    }

    if (!backupFile) {
      console.error('❌ [DOWNLOAD-BACKUP ENDPOINT] Backup file not found - tried patterns:', possibleFiles)
      return NextResponse.json(
        { error: '[DOWNLOAD-BACKUP ENDPOINT] Backup file not found' },
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