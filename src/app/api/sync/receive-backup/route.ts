/**
 * Receive Backup API
 * Receives backup file from source node
 */

import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  console.log(`🔄 [RECEIVE-BACKUP ENDPOINT] Request received`)
  
  try {
    // Validate authentication
    const nodeId = request.headers.get('X-Node-ID')
    const registrationHash = request.headers.get('X-Registration-Hash')
    
    console.log(`🔐 [RECEIVE-BACKUP ENDPOINT] Auth headers - NodeId: ${nodeId}, Hash: ${registrationHash ? 'present' : 'missing'}`)

    if (!nodeId || !registrationHash) {
      console.log(`❌ [RECEIVE-BACKUP ENDPOINT] Missing authentication headers`)
      return NextResponse.json(
        { error: 'Missing authentication headers' },
        { status: 401 }
      )
    }

    const expectedHash = crypto.createHash('sha256')
      .update(process.env.SYNC_REGISTRATION_KEY || '')
      .digest('hex')
    
    console.log(`🔐 [RECEIVE-BACKUP ENDPOINT] Expected hash: ${expectedHash.substring(0, 8)}..., Received: ${registrationHash.substring(0, 8)}...`)

    if (registrationHash !== expectedHash) {
      console.log(`❌ [RECEIVE-BACKUP ENDPOINT] Invalid registration key`)
      return NextResponse.json(
        { error: 'Invalid registration key' },
        { status: 403 }
      )
    }

    console.log(`✅ [RECEIVE-BACKUP ENDPOINT] Authentication passed`)

    const body = await request.json()
    const { sessionId, backupContent, filename } = body
    
    console.log(`📦 [RECEIVE-BACKUP ENDPOINT] Request body - sessionId: ${sessionId}, filename: ${filename}, content length: ${backupContent?.length || 'missing'}`)

    if (!backupContent || !filename) {
      console.log(`❌ [RECEIVE-BACKUP ENDPOINT] Missing backup content or filename`)
      return NextResponse.json(
        { error: 'Missing backup content or filename' },
        { status: 400 }
      )
    }

    console.log(`✅ [RECEIVE-BACKUP ENDPOINT] Request validation passed`)

    // Ensure backups directory exists
    const backupsDir = join(process.cwd(), 'backups')
    console.log(`📁 [RECEIVE-BACKUP ENDPOINT] Checking backups directory: ${backupsDir}`)
    console.log(`📂 [RECEIVE-BACKUP ENDPOINT] Directory exists: ${existsSync(backupsDir)}`)
    
    if (!existsSync(backupsDir)) {
      console.log(`📁 [RECEIVE-BACKUP ENDPOINT] Creating backups directory...`)
      await mkdir(backupsDir, { recursive: true })
      console.log(`✅ [RECEIVE-BACKUP ENDPOINT] Created backups directory`)
    }

    // Write backup file
    const backupPath = join(backupsDir, filename)
    console.log(`💾 [RECEIVE-BACKUP ENDPOINT] Writing backup file to: ${backupPath}`)
    console.log(`📊 [RECEIVE-BACKUP ENDPOINT] Backup content length: ${backupContent.length} characters`)
    
    const buffer = Buffer.from(backupContent, 'base64')
    console.log(`🔄 [RECEIVE-BACKUP ENDPOINT] Decoded buffer size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`)
    
    await writeFile(backupPath, buffer)
    
    // Verify file was written
    const fs = require('fs')
    const stats = fs.statSync(backupPath)
    console.log(`✅ [RECEIVE-BACKUP ENDPOINT] File written successfully: ${stats.size} bytes`)
    
    console.log(`✅ [RECEIVE-BACKUP ENDPOINT] Received backup file: ${filename} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`)
    console.log(`📁 [RECEIVE-BACKUP ENDPOINT] Saved to: ${backupPath}`)

    return NextResponse.json({
      success: true,
      message: 'Backup received successfully',
      filename,
      size: buffer.length,
      path: backupPath
    })

  } catch (error) {
    console.error('Failed to receive backup:', error)
    return NextResponse.json(
      { error: 'Failed to receive backup' },
      { status: 500 }
    )
  }
}
