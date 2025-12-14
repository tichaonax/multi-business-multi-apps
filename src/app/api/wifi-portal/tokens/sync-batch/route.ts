import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPortalClient } from '@/lib/wifi-portal/api-client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { businessId, tokens } = body

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json({ error: 'tokens array is required' }, { status: 400 })
    }

    if (tokens.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 tokens per batch' }, { status: 400 })
    }

    // Check permission - admins have access to all businesses
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    const isAdmin = user?.role === 'admin'

    // Check if user has access to this business (admins skip this check)
    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId: businessId,
          isActive: true,
        },
      })

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Get portal integration
    const integration = await prisma.portalIntegrations.findUnique({
      where: { businessId: businessId },
      select: {
        id: true,
        portalIpAddress: true,
        portalPort: true,
        apiKey: true,
        isActive: true,
      },
    })

    if (!integration) {
      return NextResponse.json({ error: 'Portal integration not found' }, { status: 404 })
    }

    if (!integration.isActive) {
      return NextResponse.json({ error: 'Portal integration is not active' }, { status: 400 })
    }

    // Create portal client
    const portalClient = createPortalClient({
      baseUrl: `http://${integration.portalIpAddress}:${integration.portalPort}`,
      apiKey: integration.apiKey,
      timeout: 15000, // Longer timeout for batch operations
    })

    // Batch fetch token info from ESP32 portal
    const batchResult = await portalClient.batchGetTokenInfo({ tokens })

    if (!batchResult.success) {
      return NextResponse.json(
        { error: batchResult.error || 'Failed to fetch token info from portal' },
        { status: 500 }
      )
    }

    // Update database with device information
    const updatePromises = batchResult.tokens.map(async (tokenInfo) => {
      if (!tokenInfo.token) return null

      try {
        // Find the token in our database
        const dbToken = await prisma.wifiTokens.findFirst({
          where: {
            token: tokenInfo.token,
            businessId: businessId,
          },
        })

        if (!dbToken) return null

        // Skip tokens that are already EXPIRED or DISABLED - no point syncing
        if (dbToken.status === 'EXPIRED' || dbToken.status === 'DISABLED') {
          console.log(`Skipping ${dbToken.status} token: ${tokenInfo.token}`)
          return null
        }

        // Check if token was not found on ESP32 (expired and removed)
        if (!tokenInfo.success &&
            (tokenInfo.error?.toLowerCase().includes('token not found') ||
             tokenInfo.error?.toLowerCase().includes('not found'))) {
          // Mark as expired
          return await prisma.wifiTokens.update({
            where: { id: dbToken.id },
            data: {
              status: 'EXPIRED',
              lastSyncedAt: new Date(),
            },
          })
        }

        // Skip if token info fetch failed for other reasons
        if (!tokenInfo.success) {
          console.error(`Failed to get info for token ${tokenInfo.token}:`, tokenInfo.error)
          return null
        }

        // Update token with device information
        const updated = await prisma.wifiTokens.update({
          where: { id: dbToken.id },
          data: {
            bandwidthUsedDown: tokenInfo.bandwidthUsedDown || 0,
            bandwidthUsedUp: tokenInfo.bandwidthUsedUp || 0,
            usageCount: tokenInfo.usageCount || 0,
            lastSyncedAt: new Date(),
            // Device tracking fields (v3.4)
            hostname: tokenInfo.hostname || null,
            deviceType: tokenInfo.deviceType || null,
            firstSeen: tokenInfo.firstSeen ? new Date(tokenInfo.firstSeen * 1000) : null,
            lastSeen: tokenInfo.lastSeen ? new Date(tokenInfo.lastSeen * 1000) : null,
            deviceCount: tokenInfo.deviceCount || 0,
            primaryMac: tokenInfo.devices && tokenInfo.devices.length > 0
              ? tokenInfo.devices[0].mac
              : null,
          },
        })

        // Update or create device records
        if (tokenInfo.devices && tokenInfo.devices.length > 0) {
          await Promise.all(
            tokenInfo.devices.map(async (device) => {
              await prisma.wifiTokenDevices.upsert({
                where: {
                  wifiTokenId_macAddress: {
                    wifiTokenId: dbToken.id,
                    macAddress: device.mac,
                  },
                },
                create: {
                  wifiTokenId: dbToken.id,
                  macAddress: device.mac,
                  isOnline: device.online,
                  currentIp: device.currentIp || null,
                  firstSeen: new Date(),
                  lastSeen: new Date(),
                },
                update: {
                  isOnline: device.online,
                  currentIp: device.currentIp || null,
                  lastSeen: new Date(),
                },
              })
            })
          )
        }

        return updated
      } catch (error: any) {
        console.error(`Error updating token ${tokenInfo.token}:`, error)
        return null
      }
    })

    await Promise.all(updatePromises)

    // Fetch updated tokens from database
    const updatedTokens = await prisma.wifiTokens.findMany({
      where: {
        token: { in: tokens },
        businessId: businessId,
      },
      include: {
        token_configurations: true,
        wifi_token_devices: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      count: updatedTokens.length,
      tokens: updatedTokens,
    })

  } catch (error: any) {
    console.error('Error in batch token sync:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync tokens' },
      { status: 500 }
    )
  }
}
