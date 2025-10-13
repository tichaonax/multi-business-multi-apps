/**
 * API endpoint for retrieving recovery sessions
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get recovery sessions from sync sessions
    const sessions = await prisma.syncSession.findMany({
      where: {
        metadata: {
          path: ['partitionId'],
          not: null
        }
      },
      orderBy: {
        startedAt: 'desc'
      },
      take: 20 // Limit to recent sessions
    })

    // Transform for frontend
    const transformedSessions = sessions.map(session => ({
      sessionId: session.id,
      partitionId: session.partitionId,
      strategy: session.strategy,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString(),
      status: session.status,
      progress: session.progress,
      currentStep: session.currentStep,
      errorMessage: session.errorMessage
    }))

    return NextResponse.json({
      success: true,
      sessions: transformedSessions
    })

  } catch (error) {
    console.error('Failed to fetch recovery sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recovery sessions' },
      { status: 500 }
    )
  }
}