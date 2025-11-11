/**
 * Backup Progress API
 * Get current backup/restore progress for a session
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId parameter' },
        { status: 400 }
      )
    }

    // Fetch session from database
    const session = await prisma.fullSyncSessions.findUnique({
      where: { sessionId }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Calculate time remaining
    let estimatedTimeRemaining = 0
    if (session.transferSpeed && session.transferSpeed > 0) {
      const totalBytes = Number(session.transferredBytes || 0)
      const remainingBytes = (session.totalRecords || 0) - totalBytes
      estimatedTimeRemaining = Math.round(remainingBytes / session.transferSpeed)
    }

    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      phase: session.phase || 'unknown',
      progress: session.progress,
      status: session.status,
      currentStep: session.currentStep,
      bytesTransferred: Number(session.transferredBytes || 0),
      totalBytes: session.totalRecords || 0,
      transferSpeed: session.transferSpeed || 0,
      estimatedTimeRemaining,
      direction: session.direction,
      method: session.method,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString(),
      errorMessage: session.errorMessage
    })

  } catch (error) {
    console.error('Failed to fetch backup progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch backup progress' },
      { status: 500 }
    )
  }
}
