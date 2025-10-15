/**
 * Sync Receive API
 * Handles receiving synchronization data from peer nodes
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

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

        // TODO: Apply the actual data changes to the target tables
        // This would involve updating the actual business data tables
        // based on the sync event information

        processedCount++
        processedEvents.push({
          eventId: event.id,
          status: 'processed'
        })

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