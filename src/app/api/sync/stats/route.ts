/**
 * Sync Statistics API
 * Provides detailed sync metrics and statistics for the admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * GET - Get sync statistics and metrics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin permissions
    const user = await prisma.users.findUnique({
      where: { email: session.user.email! },
      select: { role: true }
    })

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get sync statistics
    const [
      totalSyncEvents,
      processedEvents,
      pendingEvents,
      failedEvents,
      conflictResolutions,
      activeSyncNodes,
      recentSessions,
      syncMetrics
    ] = await Promise.all([
      // Total sync events
      prisma.syncEvents.count(),

      // Processed events
      prisma.syncEvents.count({
        where: { processed: true }
      }),

      // Pending events
      prisma.syncEvents.count({
        where: { processed: false, retryCount: { lt: 3 } }
      }),

      // Failed events (max retries exceeded)
      prisma.syncEvents.count({
        where: { retryCount: { gte: 3 } }
      }),

      // Conflict resolutions
      prisma.conflictResolutions.count(),

      // Active sync nodes
      prisma.syncNodes.count({
        where: {
          isActive: true,
          lastSeen: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
          }
        }
      }),

      // Recent sync sessions
      prisma.syncSessions.findMany({
        take: 10,
        orderBy: { startedAt: 'desc' },
        select: {
          sessionId: true,
          sourceNodeId: true,
          targetNodeId: true,
          status: true,
          startedAt: true,
          endedAt: true,
          metadata: true
        }
      }),

      // Sync metrics for the last 7 days
      prisma.syncMetrics.findMany({
        where: {
          metricDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { metricDate: 'desc' }
      })
    ])

    // Get sync nodes with details
    const syncNodes = await prisma.syncNodes.findMany({
      where: { isActive: true },
      select: {
        nodeId: true,
        nodeName: true,
        ipAddress: true,
        port: true,
        isActive: true,
        lastSeen: true,
        capabilities: true,
        createdAt: true
      },
      orderBy: { lastSeen: 'desc' }
    })

    // Calculate additional metrics
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [eventsLast24h, conflictsLast24h, sessionsLast24h] = await Promise.all([
      prisma.syncEvents.count({
        where: { createdAt: { gte: last24Hours } }
      }),
      prisma.conflictResolutions.count({
        where: { createdAt: { gte: last24Hours } }
      }),
      prisma.syncSessions.count({
        where: { startedAt: { gte: last24Hours } }
      })
    ])

    // Get recent conflicts
    const recentConflicts = await prisma.conflictResolutions.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        conflictType: true,
        resolutionStrategy: true,
        sourceEventId: true,
        targetEventId: true,
        resolvedBy: true,
        resolvedAt: true,
        createdAt: true,
        metadata: true
      }
    })

    // Calculate sync health score
    const totalEvents = totalSyncEvents || 1 // Avoid division by zero
    const successRate = ((processedEvents / totalEvents) * 100)
    const conflictRate = ((conflictResolutions / totalEvents) * 100)

    let healthScore = 100
    if (successRate < 95) healthScore -= (95 - successRate) * 2
    if (conflictRate > 5) healthScore -= (conflictRate - 5) * 3
    if (failedEvents > 0) healthScore -= Math.min(failedEvents * 5, 30)
    healthScore = Math.max(0, Math.min(100, healthScore))

    const stats = {
      overview: {
        totalSyncEvents,
        processedEvents,
        pendingEvents,
        failedEvents,
        conflictResolutions,
        activeSyncNodes,
        healthScore: Math.round(healthScore),
        successRate: Math.round(successRate * 100) / 100,
        conflictRate: Math.round(conflictRate * 100) / 100
      },
      last24Hours: {
        events: eventsLast24h,
        conflicts: conflictsLast24h,
        sessions: sessionsLast24h
      },
      syncNodes: syncNodes.map(node => ({
        ...node,
        isOnline: node.lastSeen ?
          (new Date().getTime() - new Date(node.lastSeen).getTime()) < 5 * 60 * 1000 : false,
        lastSeenAgo: node.lastSeen ?
          Math.round((new Date().getTime() - new Date(node.lastSeen).getTime()) / 1000) : null
      })),
      recentSessions,
      recentConflicts,
      metrics: syncMetrics.map(metric => ({
        date: metric.metricDate,
        eventsGenerated: metric.eventsGenerated,
        eventsReceived: metric.eventsReceived,
        eventsProcessed: metric.eventsProcessed,
        conflictsDetected: metric.conflictsDetected,
        conflictsResolved: metric.conflictsResolved,
        peersConnected: metric.peersConnected,
        dataTransferred: Number(metric.dataTransferredBytes)
      })),
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Sync stats error:', error)
    return NextResponse.json(
      { error: 'Failed to get sync statistics' },
      { status: 500 }
    )
  }
}