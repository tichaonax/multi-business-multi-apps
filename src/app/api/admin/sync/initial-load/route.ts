/**
 * API endpoint for initial load operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import crypto from 'crypto'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch real initial load sessions from database
    const sessions = await prisma.initialLoadSessions.findMany({
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
      errorMessage: s.errorMessage
    }))

    return NextResponse.json({
      success: true,
      sessions: formattedSessions
    })

  } catch (error) {
    console.error('Failed to fetch initial load sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch initial load sessions' },
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
    const { action, targetPeer, sourcePeer, options } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'initiate':
        // Send data FROM this node TO target peer
        if (!targetPeer) {
          return NextResponse.json(
            { error: 'Target peer is required for initiate action' },
            { status: 400 }
          )
        }

        const sessionId = await performInitialLoad(targetPeer, options)

        return NextResponse.json({
          success: true,
          sessionId,
          message: 'Initial load initiated successfully'
        })

      case 'request':
        // Request data FROM source peer TO this node
        if (!sourcePeer) {
          return NextResponse.json(
            { error: 'Source peer is required for request action' },
            { status: 400 }
          )
        }

        // For now, this would require the sync service to handle
        // As a workaround, we can initiate from the other direction
        return NextResponse.json({
          success: false,
          message: 'Please initiate load from the source machine instead'
        })

      case 'snapshot':
        // Get snapshot of current data
        const snapshot = await createDataSnapshot()

        return NextResponse.json({
          success: true,
          snapshot,
          message: 'Data snapshot created successfully'
        })

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Failed to process initial load request:', error)
    return NextResponse.json(
      { error: 'Failed to process initial load request' },
      { status: 500 }
    )
  }
}

/**
 * Perform initial load to target peer
 */
async function performInitialLoad(targetPeer: any, options: any = {}): Promise<string> {
  const sessionId = crypto.randomUUID()
  const thisNodeId = process.env.SYNC_NODE_ID || 'unknown'
  const regKey = process.env.SYNC_REGISTRATION_KEY || ''
  const regHash = crypto.createHash('sha256').update(regKey).digest('hex')
  const targetPort = 8080 // HTTP port for Next.js app

  // Create session record
  const selectedTables = options.selectedTables || ['businesses']
  const tableName = Array.isArray(selectedTables) ? selectedTables.join(',') : 'businesses'

  await prisma.initialLoadSessions.create({
    data: {
      sessionId,
      sourceNodeId: thisNodeId,
      targetNodeId: targetPeer.nodeId,
      tableName,
      status: 'PREPARING',
      progress: 0,
      currentStep: 'Preparing data export',
      totalRecords: 0,
      transferredRecords: 0,
      transferredBytes: BigInt(0),
      estimatedTimeRemaining: 0,
      startedAt: new Date(),
      metadata: {
        selectedTables,
        compressionEnabled: options.compressionEnabled ?? false,
        encryptionEnabled: options.encryptionEnabled ?? false,
        batchSize: options.batchSize || 100,
        checksumVerification: options.checksumVerification ?? true
      }
    }
  })

  // Start async transfer (don't await - let it run in background)
  transferDataInBackground(sessionId, thisNodeId, targetPeer, targetPort, regHash, options).catch(err => {
    console.error('Background transfer error:', err)
  })

  return sessionId
}

/**
 * Transfer data in background
 */
async function transferDataInBackground(
  sessionId: string,
  sourceNodeId: string,
  targetPeer: any,
  targetPort: number,
  regHash: string,
  options: any
) {
  try {
    // Update status to TRANSFERRING
    await prisma.initialLoadSessions.update({
      where: { sessionId },
      data: {
        status: 'TRANSFERRING',
        currentStep: 'Exporting businesses'
      }
    })

    // Export businesses (excluding demo)
    // Demo businesses are identified by ID pattern, not type field
    const allBusinesses = await prisma.businesses.findMany()
    const businesses = allBusinesses.filter(b => !isDemoBusinessId(b.id))

    // Get product images for non-demo businesses
    const businessIds = businesses.map(b => b.id)
    const productImages = await prisma.productImages.findMany({
      where: {
        business_products: {
          businessId: { in: businessIds }
        }
      },
      include: {
        business_products: {
          select: { businessId: true }
        }
      }
    })

    const totalRecords = businesses.length + productImages.length

    await prisma.initialLoadSessions.update({
      where: { sessionId },
      data: { totalRecords }
    })

    let transferredRecords = 0
    let transferredBytes = BigInt(0)

    // Transfer each business
    for (const business of businesses) {
      const syncEvent = {
        id: crypto.randomUUID(),
        sourceNodeId,
        table: 'businesses',
        recordId: business.id,
        operation: 'CREATE',
        data: {
          id: business.id,
          name: business.name,
          type: business.type,
          address: business.address,
          phone: business.phone,
          email: business.email,
          website: business.website,
          logo: business.logo,
          createdAt: business.createdAt,
          updatedAt: business.updatedAt
        },
        checksum: crypto.createHash('md5').update(JSON.stringify(business)).digest('hex')
      }

      const response = await fetch(`http://${targetPeer.ipAddress}:${targetPort}/api/sync/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Node-ID': sourceNodeId,
          'X-Registration-Hash': regHash
        },
        body: JSON.stringify({
          sessionId,
          sourceNodeId,
          events: [syncEvent]
        })
      })

      if (response.ok) {
        transferredRecords++
        transferredBytes += BigInt(JSON.stringify(syncEvent).length)

        const progress = Math.round((transferredRecords / totalRecords) * 100)

        await prisma.initialLoadSessions.update({
          where: { sessionId },
          data: {
            transferredRecords,
            transferredBytes,
            progress,
            currentStep: `Transferred ${transferredRecords} of ${totalRecords} records`
          }
        })
      }

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // Transfer product images
    for (const image of productImages) {
      // Read image file content
      let imageFileContent: string | null = null
      try {
        const filePath = join(process.cwd(), 'public', image.imageUrl)
        if (existsSync(filePath)) {
          const buffer = await readFile(filePath)
          imageFileContent = buffer.toString('base64')
        }
      } catch (error) {
        console.error(`Failed to read image file ${image.imageUrl}:`, error)
      }

      const syncEvent = {
        id: crypto.randomUUID(),
        sourceNodeId,
        table: 'ProductImages',
        recordId: image.id,
        operation: 'CREATE',
        data: {
          id: image.id,
          productId: image.productId,
          imageUrl: image.imageUrl,
          altText: image.altText,
          isPrimary: image.isPrimary,
          sortOrder: image.sortOrder,
          imageSize: image.imageSize,
          businessType: image.businessType,
          createdAt: image.createdAt,
          updatedAt: image.updatedAt
        },
        metadata: imageFileContent ? { imageFileContent } : {},
        checksum: crypto.createHash('md5').update(JSON.stringify(image)).digest('hex')
      }

      const response = await fetch(`http://${targetPeer.ipAddress}:${targetPort}/api/sync/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Node-ID': sourceNodeId,
          'X-Registration-Hash': regHash
        },
        body: JSON.stringify({
          sessionId,
          sourceNodeId,
          events: [syncEvent]
        })
      })

      if (response.ok) {
        transferredRecords++
        transferredBytes += BigInt(JSON.stringify(syncEvent).length)

        const progress = Math.round((transferredRecords / totalRecords) * 100)

        await prisma.initialLoadSessions.update({
          where: { sessionId },
          data: {
            transferredRecords,
            transferredBytes,
            progress,
            currentStep: `Transferred ${transferredRecords} of ${totalRecords} records (${productImages.length} images)`
          }
        })
      }

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // Complete
    await prisma.initialLoadSessions.update({
      where: { sessionId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        currentStep: 'Transfer complete',
        completedAt: new Date()
      }
    })

  } catch (error) {
    await prisma.initialLoadSessions.update({
      where: { sessionId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date()
      }
    })
  }
}

/**
 * Create data snapshot
 */
async function createDataSnapshot() {
  const allBusinesses = await prisma.businesses.findMany()
  const businesses = allBusinesses.filter(b => !isDemoBusinessId(b.id))

  const totalRecords = businesses.length
  const totalSize = JSON.stringify(businesses).length

  return {
    snapshotId: crypto.randomUUID(),
    totalRecords,
    totalSize,
    createdAt: new Date().toISOString(),
    tables: [
      {
        tableName: 'businesses',
        recordCount: totalRecords,
        dataSize: totalSize
      }
    ]
  }
}

/**
 * Check if a business ID is a demo business
 * Demo businesses have IDs like: "clothing-demo-business", "restaurant-demo", etc.
 */
function isDemoBusinessId(businessId: string): boolean {
  if (!businessId || typeof businessId !== 'string') {
    return false
  }

  const lowerBusinessId = businessId.toLowerCase()

  // Check for common demo business ID patterns
  return lowerBusinessId.includes('-demo-business') ||
         lowerBusinessId.endsWith('-demo') ||
         lowerBusinessId.startsWith('demo-') ||
         lowerBusinessId === 'demo'
}