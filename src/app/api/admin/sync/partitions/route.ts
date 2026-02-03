/**
 * API endpoint for retrieving active partitions
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

    // Get active partitions
    const partitions = await prisma.networkPartition.findMany({
      where: {
        isResolved: false
      },
      orderBy: {
        detectedAt: 'desc'
      }
    })

    // Transform for frontend
    const transformedPartitions = partitions.map(partition => ({
      partitionId: partition.id,
      partitionType: partition.partitionType,
      affectedPeers: [], // Would be populated from partition metadata
      detectedAt: partition.detectedAt.toISOString(),
      severity: partition.partitionMetadata?.severity || 'MEDIUM',
      isResolved: partition.isResolved,
      metadata: {
        failureCount: partition.partitionMetadata?.failureCount || 0,
        errorMessages: partition.partitionMetadata?.errorMessages || []
      }
    }))

    return NextResponse.json({
      success: true,
      partitions: transformedPartitions
    })

  } catch (error) {
    console.error('Failed to fetch partitions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch partitions' },
      { status: 500 }
    )
  }
}