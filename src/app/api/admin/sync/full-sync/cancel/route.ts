/**
 * Cancel Full Sync API endpoint
 * Cancels an active sync session
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Find the session
    const syncSession = await prisma.fullSyncSessions.findUnique({
      where: { sessionId }
    })

    if (!syncSession) {
      return NextResponse.json(
        { error: 'Sync session not found' },
        { status: 404 }
      )
    }

    // Check if session can be cancelled
    if (!['PREPARING', 'TRANSFERRING'].includes(syncSession.status)) {
      return NextResponse.json(
        {
          error: 'Cannot cancel sync',
          message: `Sync session is already ${syncSession.status}`
        },
        { status: 400 }
      )
    }

    // Cancel the session
    const updatedSession = await prisma.fullSyncSessions.update({
      where: { sessionId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
        errorMessage: 'Cancelled by user'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Sync session cancelled successfully',
      session: {
        sessionId: updatedSession.sessionId,
        status: updatedSession.status,
        completedAt: updatedSession.completedAt
      }
    })

  } catch (error) {
    console.error('Failed to cancel sync session:', error)
    return NextResponse.json(
      { error: 'Failed to cancel sync session' },
      { status: 500 }
    )
  }
}
