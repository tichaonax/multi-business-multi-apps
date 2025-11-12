/**
 * Clear Backup History API endpoint
 * Allows admins to clear old or failed backup history entries
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      clearType = 'failed', // 'failed', 'old', 'all'
      olderThanDays = 30, // For 'old' type
      confirmDelete = false // Safety check
    } = body

    if (!confirmDelete) {
      return NextResponse.json(
        { error: 'Confirmation required. Set confirmDelete to true to proceed.' },
        { status: 400 }
      )
    }

    let whereClause: any = {}

    switch (clearType) {
      case 'failed':
        // Clear only failed backup sessions
        whereClause.status = 'FAILED'
        break

      case 'old':
        // Clear sessions older than specified days
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
        whereClause.createdAt = {
          lt: cutoffDate
        }
        break

      case 'all':
        // Clear all backup history (dangerous!)
        // This will clear all full_sync_sessions
        break

      default:
        return NextResponse.json(
          { error: 'Invalid clearType. Must be "failed", "old", or "all"' },
          { status: 400 }
        )
    }

    // Get count before deletion for reporting
    const countBefore = await prisma.fullSyncSessions.count({
      where: whereClause
    })

    if (countBefore === 0) {
      return NextResponse.json({
        success: true,
        message: 'No backup history entries found to clear',
        clearedCount: 0
      })
    }

    // Perform the deletion
    const deleteResult = await prisma.fullSyncSessions.deleteMany({
      where: whereClause
    })

    // Log the action for audit purposes
    console.log(`Admin ${session.user.email} cleared ${deleteResult.count} backup history entries (type: ${clearType})`)

    return NextResponse.json({
      success: true,
      message: `Successfully cleared ${deleteResult.count} backup history entries`,
      clearedCount: deleteResult.count,
      clearType,
      ...(clearType === 'old' && { olderThanDays })
    })

  } catch (error) {
    console.error('Failed to clear backup history:', error)
    return NextResponse.json(
      { error: 'Failed to clear backup history' },
      { status: 500 }
    )
  }
}

// GET endpoint to preview what would be cleared
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clearType = searchParams.get('clearType') || 'failed'
    const olderThanDays = parseInt(searchParams.get('olderThanDays') || '30')

    let whereClause: any = {}

    switch (clearType) {
      case 'failed':
        whereClause.status = 'FAILED'
        break

      case 'old':
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
        whereClause.createdAt = {
          lt: cutoffDate
        }
        break

      case 'all':
        // Preview all sessions
        break

      default:
        return NextResponse.json(
          { error: 'Invalid clearType. Must be "failed", "old", or "all"' },
          { status: 400 }
        )
    }

    // Get preview of what would be cleared
    const sessionsToClear = await prisma.fullSyncSessions.findMany({
      where: whereClause,
      select: {
        id: true,
        sessionId: true,
        status: true,
        createdAt: true,
        errorMessage: true,
        sourceNodeId: true,
        targetNodeId: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limit preview to 50 items
    })

    const totalCount = await prisma.fullSyncSessions.count({
      where: whereClause
    })

    return NextResponse.json({
      preview: true,
      totalCount,
      sessions: sessionsToClear,
      clearType,
      ...(clearType === 'old' && { olderThanDays })
    })

  } catch (error) {
    console.error('Failed to preview backup history:', error)
    return NextResponse.json(
      { error: 'Failed to preview backup history' },
      { status: 500 }
    )
  }
}