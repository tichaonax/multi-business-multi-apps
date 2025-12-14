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

    // LOG RAW ESP32 RESPONSE
    console.log('=== ESP32 BATCH SYNC RAW RESPONSE ===')
    console.log('Request tokens:', tokens)
    console.log('Response:', JSON.stringify(batchResult, null, 2))
    console.log('=====================================')

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
          return null
        }

        // Check if token was not found on ESP32 (expired and removed)
        if (!tokenInfo.success &&
            (tokenInfo.error?.toLowerCase().includes('token not found') ||
             tokenInfo.error?.toLowerCase().includes('not found'))) {
          // For missing tokens, differentiate based on current status:
          // - ACTIVE tokens that go missing were in use, so mark as EXPIRED
          // - UNUSED tokens that go missing may never have been synced, so mark as DISABLED
          const newStatus = dbToken.status === 'ACTIVE' ? 'EXPIRED' : 'DISABLED'

          return await prisma.wifiTokens.update({
            where: { id: dbToken.id },
            data: {
              status: newStatus,
              lastSyncedAt: new Date(),
            },
          })
        }

        // Skip if token info fetch failed for other reasons
        if (!tokenInfo.success) {
          return null
        }

        // Update token with device information
        const updateData: any = {
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
        }

        // Update status based on ESP32 portal response
        if (tokenInfo.status) {
          const statusMap: Record<string, 'ACTIVE' | 'UNUSED' | 'EXPIRED' | 'DISABLED'> = {
            'active': 'ACTIVE',
            'expired': 'EXPIRED',
            'unused': 'UNUSED',
          }

          const newStatus = statusMap[tokenInfo.status] || 'ACTIVE'

          // CRITICAL RULE: UNUSED tokens can NEVER become EXPIRED
          // Expiration ONLY applies to tokens that have been redeemed (ACTIVE → EXPIRED)
          // If ESP32 says "expired" but token was never used, mark as DISABLED instead
          if (newStatus === 'EXPIRED' && !dbToken.firstUsedAt && !tokenInfo.firstUsedAt) {
            // Token expired before ever being used - mark as DISABLED
            updateData.status = 'DISABLED'
          } else {
            updateData.status = newStatus
          }
        }

        // Update firstUsedAt if token was redeemed
        if (tokenInfo.firstUsedAt && !dbToken.firstUsedAt) {
          updateData.firstUsedAt = new Date(tokenInfo.firstUsedAt)
        }

        // Update expiresAt if available from portal
        if (tokenInfo.expiresAt) {
          updateData.expiresAt = new Date(tokenInfo.expiresAt * 1000)
        }

        console.log(`Updating token ${tokenInfo.token} with data:`, JSON.stringify(updateData, null, 2))

        const updated = await prisma.wifiTokens.update({
          where: { id: dbToken.id },
          data: updateData,
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
        return null
      }
    })

    // Handle tokens that were requested but not found in the batch response
    // When ESP32 returns {"success":true,"tokens":[],"total_requested":3,"total_found":0},
    // it means all requested tokens are missing and should be marked as EXPIRED or DISABLED
    const foundTokens = new Set(batchResult.tokens.map(t => t.token).filter(Boolean))
    const missingTokens = tokens.filter(token => !foundTokens.has(token))

    const missingTokenPromises = missingTokens.map(async (token) => {
      try {
        const dbToken = await prisma.wifiTokens.findFirst({
          where: {
            token: token,
            businessId: businessId,
          },
        })

        if (!dbToken) return null

        // Skip tokens that are already EXPIRED or DISABLED
        if (dbToken.status === 'EXPIRED' || dbToken.status === 'DISABLED') {
          return null
        }

        // For missing tokens, differentiate based on current status:
        // - ACTIVE tokens that go missing were in use, so mark as EXPIRED
        // - UNUSED tokens that go missing may never have been synced, so mark as DISABLED
        const newStatus = dbToken.status === 'ACTIVE' ? 'EXPIRED' : 'DISABLED'

        return await prisma.wifiTokens.update({
          where: { id: dbToken.id },
          data: {
            status: newStatus,
            lastSyncedAt: new Date(),
          },
        })
      } catch (error: any) {
        return null
      }
    })

    await Promise.all([...updatePromises, ...missingTokenPromises])

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
    return NextResponse.json(
      { error: error.message || 'Failed to sync tokens' },
      { status: 500 }
    )
  }
}
