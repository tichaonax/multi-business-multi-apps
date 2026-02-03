/**
 * Backup History API endpoint
 * Provides access to backup history for admin management
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') // Optional filter by status

    // Build where clause
    const whereClause: any = {}
    if (status) {
      whereClause.status = status
    }

    // Get backup sessions with pagination
    const [sessions, totalCount] = await Promise.all([
      prisma.fullSyncSessions.findMany({
        where: whereClause,
        select: {
          id: true,
          sessionId: true,
          sourceNodeId: true,
          targetNodeId: true,
          status: true,
          createdAt: true,
          completedAt: true,
          errorMessage: true,
          totalRecords: true,
          processedRecords: true,
          transferredBytes: true,
          method: true,
          phase: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: Math.min(limit, 100), // Max 100 per request
        skip: offset
      }),
      prisma.fullSyncSessions.count({
        where: whereClause
      })
    ])

    // Convert BigInt values to strings for JSON serialization
    const serializedSessions = sessions.map(session => ({
      ...session,
      transferredBytes: session.transferredBytes ? session.transferredBytes.toString() : null
    }))

    // Get summary statistics
    const stats = await prisma.fullSyncSessions.groupBy({
      by: ['status'],
      _count: {
        id: true
      },
      where: whereClause
    })

    const statusCounts = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      sessions: serializedSessions,
      totalCount,
      statusCounts,
      pagination: {
        limit,
        offset,
        hasMore: offset + sessions.length < totalCount
      }
    })

  } catch (error) {
    console.error('Failed to fetch backup history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch backup history' },
      { status: 500 }
    )
  }
}