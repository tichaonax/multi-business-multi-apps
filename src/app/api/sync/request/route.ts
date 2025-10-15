/**
 * Sync Request API
 * Handles requests for synchronization data from peer nodes
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

/**
 * POST /api/sync/request
 * Handle sync data requests from peer nodes
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
    const { sessionId, sourceNodeId, lastSyncTime, maxEvents = 50 } = body

    // Get sync events since lastSyncTime
    const events = await prisma.syncEvents.findMany({
      where: {
        createdAt: {
          gt: lastSyncTime ? new Date(lastSyncTime) : new Date(0)
        },
        sourceNodeId: {
          not: sourceNodeId // Don't send back events from the requesting node
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: maxEvents
    })

    // Transform events to the expected format
    const syncEvents = events.map(event => ({
      id: event.eventId,
      type: 'change',
      table: event.tableName,
      operation: event.operation,
      data: event.changeData,
      beforeData: event.beforeData,
      recordId: event.recordId,
      timestamp: event.createdAt.toISOString(),
      sourceNodeId: event.sourceNodeId,
      checksum: event.checksum
    }))

    return NextResponse.json({
      success: true,
      sessionId,
      events: syncEvents,
      totalEvents: syncEvents.length,
      hasMoreEvents: syncEvents.length === maxEvents,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Sync request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}