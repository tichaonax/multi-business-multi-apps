/**
 * Sync Receive API
 * Handles receiving synchronization data from peer nodes
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const prisma = new PrismaClient()

/**
 * Write image file to disk
 */
async function writeImageFile(imageUrl: string, base64Content: string): Promise<void> {
  try {
    const uploadDir = join(process.cwd(), 'public/uploads/images')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const filePath = join(process.cwd(), 'public', imageUrl)
    const buffer = Buffer.from(base64Content, 'base64')
    await writeFile(filePath, buffer)
    console.log(`✅ Wrote image file: ${imageUrl}`)
  } catch (error) {
    console.error(`Failed to write image file ${imageUrl}:`, error)
    throw error
  }
}

/**
 * Apply a sync event change to the actual database tables
 */
async function applyChangeToDatabase(prisma: PrismaClient, event: any): Promise<void> {
  const { table: tableName, recordId, operation, data, metadata } = event

  // For ProductImages, write the file first if we have content
  if ((tableName === 'ProductImages' || tableName === 'product_images') &&
      metadata?.imageFileContent &&
      data?.imageUrl) {
    await writeImageFile(data.imageUrl, metadata.imageFileContent)
  }

  // Get the Prisma model name (capitalize first letter)
  const modelName = tableName.charAt(0).toUpperCase() + tableName.slice(1)

  // Check if model exists
  if (!(prisma as any)[modelName]) {
    throw new Error(`Model ${modelName} not found in Prisma client`)
  }

  const model = (prisma as any)[modelName]

  try {
    switch (operation) {
      case 'CREATE':
        // Check if record already exists
        const existing = await model.findUnique({ where: { id: recordId } })
        if (!existing) {
          await model.create({ data: { ...data, id: recordId } })
          console.log(`✅ Applied CREATE for ${tableName}:${recordId}`)
        } else {
          console.log(`⚠️  Skipped CREATE for ${tableName}:${recordId} - already exists`)
        }
        break

      case 'UPDATE':
        await model.upsert({
          where: { id: recordId },
          update: data,
          create: { ...data, id: recordId }
        })
        console.log(`✅ Applied UPDATE for ${tableName}:${recordId}`)
        break

      case 'DELETE':
        try {
          await model.delete({ where: { id: recordId } })
          console.log(`✅ Applied DELETE for ${tableName}:${recordId}`)
        } catch (error: any) {
          // Ignore if record doesn't exist
          if (error.code === 'P2025') {
            console.log(`⚠️  Skipped DELETE for ${tableName}:${recordId} - not found`)
          } else {
            throw error
          }
        }
        break

      default:
        throw new Error(`Unknown operation: ${operation}`)
    }
  } catch (error) {
    console.error(`Failed to apply ${operation} for ${tableName}:${recordId}:`, error)
    throw error
  }
}

/**
 * Check if a business ID is a demo business
 */
function isDemoBusinessId(businessId: string): boolean {
  if (!businessId || typeof businessId !== 'string') {
    return false
  }

  const lowerBusinessId = businessId.toLowerCase()
  return lowerBusinessId.includes('-demo-business') ||
         lowerBusinessId.endsWith('-demo') ||
         lowerBusinessId.startsWith('demo-') ||
         lowerBusinessId === 'demo'
}

/**
 * Check if an event is for a demo business
 */
function isDemoBusinessEvent(event: any): boolean {
  const { table, recordId, data } = event

  // Check if the event is directly on the businesses table
  if (table === 'businesses' || table === 'Businesses') {
    return isDemoBusinessId(recordId)
  }

  // For other tables, check if they have a businessId field
  if (data && typeof data === 'object') {
    const businessId = data.businessId || data.business_id
    if (businessId && typeof businessId === 'string') {
      return isDemoBusinessId(businessId)
    }
  }

  return false
}

/**
 * POST /api/sync/receive
 * Handle receiving sync data from peer nodes
 */
export async function POST(request: NextRequest) {
  try {
    // Validate authentication headers
    const nodeId = request.headers.get('X-Node-ID')
    const registrationHash = request.headers.get('X-Registration-Hash')

    if (!nodeId || !registrationHash) {
      return NextResponse.json(
        { error: 'Missing authentication headers' }, 
        { status: 401 }
      )
    }

    // Verify registration key hash
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
    const { sessionId, events, sourceNodeId } = body

    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Invalid events payload' }, 
        { status: 400 }
      )
    }

    let processedCount = 0
    let conflictsDetected = 0
    const processedEvents = []

    // Process each event
    for (const event of events) {
      try {
        // Filter out demo business events
        if (isDemoBusinessEvent(event)) {
          console.log(`Rejected demo business event: ${event.table}:${event.recordId}`)
          processedEvents.push({
            eventId: event.id,
            status: 'rejected',
            error: 'Demo businesses are not synced'
          })
          continue // Skip demo events
        }

        // Check if event already exists (deduplication)
        const existingEvent = await prisma.syncEvents.findUnique({
          where: { eventId: event.id }
        })

        if (existingEvent) {
          continue // Skip duplicate events
        }

        // Create sync event record
        const syncEvent = await prisma.syncEvents.create({
          data: {
            eventId: event.id,
            sourceNodeId: event.sourceNodeId,
            tableName: event.table,
            recordId: event.recordId,
            operation: event.operation,
            changeData: event.data,
            beforeData: event.beforeData || null,
            checksum: event.checksum || null,
            processed: false
          }
        })

        // Apply the actual data changes to the target tables
        try {
          await applyChangeToDatabase(prisma, event)

          // Mark as processed
          await prisma.syncEvents.update({
            where: { eventId: event.id },
            data: { processed: true, processedAt: new Date() }
          })

          processedCount++
          processedEvents.push({
            eventId: event.id,
            status: 'processed'
          })
        } catch (applyError) {
          console.error(`Failed to apply changes for event ${event.id}:`, applyError)
          processedEvents.push({
            eventId: event.id,
            status: 'failed',
            error: applyError instanceof Error ? applyError.message : 'Failed to apply changes'
          })
        }

      } catch (error) {
        console.error(`Failed to process sync event ${event.id}:`, error)
        processedEvents.push({
          eventId: event.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Update processed status
    if (processedEvents.length > 0) {
      await prisma.syncEvents.updateMany({
        where: {
          eventId: {
            in: processedEvents
              .filter(e => e.status === 'processed')
              .map(e => e.eventId)
          }
        },
        data: {
          processed: true
        }
      })
    }

    return NextResponse.json({
      success: true,
      sessionId,
      processedCount,
      conflictsDetected,
      totalReceived: events.length,
      events: processedEvents,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Sync receive error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}