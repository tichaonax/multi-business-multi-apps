/**
 * Full Sync API endpoint
 * Handles bidirectional sync (PULL and PUSH) using backup/restore method
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch full sync sessions from database
    const sessions = await prisma.fullSyncSessions.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20
    })

    // Format sessions for UI
    const formattedSessions = sessions.map(s => ({
      sessionId: s.sessionId,
      sourceNodeId: s.sourceNodeId,
      targetNodeId: s.targetNodeId,
      status: s.status,
      progress: s.progress,
      currentStep: s.currentStep || 'Unknown',
      totalRecords: s.totalRecords,
      transferredRecords: s.transferredRecords,
      transferredBytes: Number(s.transferredBytes || 0),
      startedAt: s.startedAt.toISOString(),
      completedAt: s.completedAt?.toISOString(),
      estimatedTimeRemaining: s.estimatedTimeRemaining,
      errorMessage: s.errorMessage,
      direction: s.direction,
      method: s.method,
      phase: s.phase,
      transferSpeed: s.transferSpeed
    }))

    return NextResponse.json({
      success: true,
      sessions: formattedSessions
    })

  } catch (error) {
    console.error('Failed to fetch full sync sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch full sync sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, targetPeer, options } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    if (action !== 'pull' && action !== 'push') {
      return NextResponse.json(
        { error: 'Action must be either "pull" or "push"' },
        { status: 400 }
      )
    }

    if (!targetPeer) {
      return NextResponse.json(
        { error: 'Target peer is required' },
        { status: 400 }
      )
    }

    // Check if there's already a running sync
    const runningSession = await prisma.fullSyncSessions.findFirst({
      where: {
        status: {
          in: ['PREPARING', 'TRANSFERRING']
        }
      },
      orderBy: { startedAt: 'desc' }
    })

    if (runningSession) {
      return NextResponse.json({
        error: 'Full sync already in progress',
        sessionId: runningSession.sessionId,
        currentStep: runningSession.currentStep,
        progress: runningSession.progress
      }, { status: 409 })
    }

    const sessionId = await performFullSync(action, targetPeer, options)

    return NextResponse.json({
      success: true,
      sessionId,
      message: `Full sync ${action} initiated successfully`
    })

  } catch (error) {
    console.error('Failed to process full sync request:', error)
    return NextResponse.json(
      { error: 'Failed to process full sync request' },
      { status: 500 }
    )
  }
}

/**
 * Perform full sync (PULL or PUSH)
 */
async function performFullSync(
  action: 'pull' | 'push',
  targetPeer: any,
  options: any = {}
): Promise<string> {
  const sessionId = crypto.randomUUID()
  const thisNodeId = process.env.SYNC_NODE_ID || 'unknown'
  const regKey = process.env.SYNC_REGISTRATION_KEY || ''
  const regHash = crypto.createHash('sha256').update(regKey).digest('hex')
  const targetPort = 8080 // HTTP port for Next.js app

  // Determine source and target based on action
  const sourceNodeId = action === 'push' ? thisNodeId : targetPeer.nodeId
  const targetNodeId = action === 'push' ? targetPeer.nodeId : thisNodeId

  // Create session record
  await prisma.fullSyncSessions.create({
    data: {
      sessionId,
      sourceNodeId,
      targetNodeId,
      tableName: 'all', // Full sync includes all tables
      status: 'PREPARING',
      progress: 0,
      currentStep: `Preparing ${action} sync`,
      totalRecords: 0,
      transferredRecords: 0,
      transferredBytes: BigInt(0),
      estimatedTimeRemaining: 0,
      startedAt: new Date(),
      direction: action,
      method: options.method || 'backup', // 'backup' or 'http'
      phase: 'preparing',
      metadata: {
        compressionEnabled: options.compressionEnabled ?? false,
        verifyAfterSync: options.verifyAfterSync ?? false
      }
    }
  })

  // Start async transfer based on method
  const method = options.method || 'backup'

  if (method === 'backup') {
    const { performBackupTransfer } = await import('./backup-transfer')
    performBackupTransfer(sessionId, action, thisNodeId, targetPeer, targetPort, regHash, options).catch(err => {
      console.error('Background backup transfer error:', err)
    })
  } else {
    const { performHttpTransfer } = await import('./http-transfer')
    performHttpTransfer(sessionId, action, thisNodeId, targetPeer, targetPort, regHash, options).catch(err => {
      console.error('Background HTTP transfer error:', err)
    })
  }

  return sessionId
}
