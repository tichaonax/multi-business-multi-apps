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
    const { sessionId, backupContent, filename } = body

    if (!backupContent || !filename) {
      return NextResponse.json(
        { error: 'Missing backup content or filename' },
        { status: 400 }
      )
    }

    // Ensure backups directory exists
    const backupsDir = join(process.cwd(), 'backups')
    console.log(`📁 Checking backups directory: ${backupsDir}`)
    console.log(`📂 Directory exists: ${existsSync(backupsDir)}`)
    
    if (!existsSync(backupsDir)) {
      console.log(`📁 Creating backups directory...`)
      await mkdir(backupsDir, { recursive: true })
      console.log(`✅ Created backups directory`)
    }

    // Write backup file
    const backupPath = join(backupsDir, filename)
    console.log(`💾 Writing backup file to: ${backupPath}`)
    console.log(`📊 Backup content length: ${backupContent.length} characters`)
    
    const buffer = Buffer.from(backupContent, 'base64')
    console.log(`🔄 Decoded buffer size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`)
    
    await writeFile(backupPath, buffer)
    
    // Verify file was written
    const fs = require('fs')
    const stats = fs.statSync(backupPath)
    console.log(`✅ File written successfully: ${stats.size} bytes`)
    
    console.log(`✅ Received backup file: ${filename} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`)
    console.log(`📁 Saved to: ${backupPath}`)

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
