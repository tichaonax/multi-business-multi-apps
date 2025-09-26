/**
 * API endpoint for retrieving recovery metrics
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

    // Calculate recovery metrics
    const sessions = await prisma.recoverySession.findMany({
      orderBy: { startedAt: 'desc' }
    })

    const total = sessions.length
    const successful = sessions.filter(s => s.status === 'COMPLETED').length
    const failed = sessions.filter(s => s.status === 'FAILED').length

    const completedSessions = sessions.filter(s => s.completedAt)
    const avgTime = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) =>
        sum + (s.completedAt!.getTime() - s.startedAt.getTime()), 0) / completedSessions.length
      : 0

    // Analyze failure reasons
    const failureReasons = new Map<string, number>()
    sessions.filter(s => s.errorMessage).forEach(s => {
      const reason = s.errorMessage!
      failureReasons.set(reason, (failureReasons.get(reason) || 0) + 1)
    })

    const commonFailures = Array.from(failureReasons.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const metrics = {
      totalRecoveries: total,
      successfulRecoveries: successful,
      failedRecoveries: failed,
      averageRecoveryTime: Math.round(avgTime / 1000), // seconds
      recoverySuccessRate: total > 0 ? successful / total : 0,
      commonFailureReasons: commonFailures
    }

    return NextResponse.json({
      success: true,
      metrics
    })

  } catch (error) {
    console.error('Failed to fetch recovery metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recovery metrics' },
      { status: 500 }
    )
  }
}