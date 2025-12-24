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

    if (tokens.length > 20) {
      return NextResponse.json({ error: 'Maximum 20 tokens per batch' }, { status: 400 })
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

    // COMPREHENSIVE ESP32 RESPONSE LOGGING
    console.log('=== ESP32 BATCH SYNC COMPLETE RESPONSE ANALYSIS ===')
    console.log('Request tokens count:', tokens.length)
    console.log('Request tokens sample:', tokens.slice(0, 3), '...')

    console.log('\n--- RAW RESPONSE OBJECT ---')
    console.log('Type of batchResult:', typeof batchResult)
    console.log('batchResult keys:', Object.keys(batchResult))
    console.log('batchResult is null/undefined:', batchResult == null)

    if (batchResult != null) {
      console.log('batchResult.success:', batchResult.success, '(type:', typeof batchResult.success, ')')
      console.log('batchResult.error:', batchResult.error, '(type:', typeof batchResult.error, ')')
      console.log('batchResult.message exists:', 'message' in batchResult)
      console.log('batchResult.message type:', typeof batchResult.message)
      console.log('batchResult.message length:', batchResult.message ? batchResult.message.length : 'N/A')

      if (batchResult.message) {
        console.log('\n--- MESSAGE FIELD CONTENT ---')
        console.log('Raw message (first 200 chars):', batchResult.message.substring(0, 200))
        if (batchResult.message.length > 200) {
          console.log('Raw message (remaining):', batchResult.message.substring(200))
        }

        console.log('\n--- MESSAGE PARSING ATTEMPT ---')
        try {
          const parsedMessage = JSON.parse(batchResult.message)
          console.log('Parsed message type:', typeof parsedMessage)
          console.log('Parsed message keys:', Object.keys(parsedMessage))
          console.log('Parsed message.success:', parsedMessage.success)
          console.log('Parsed message.tokens exists:', 'tokens' in parsedMessage)
          console.log('Parsed message.tokens type:', typeof parsedMessage.tokens)
          console.log('Parsed message.tokens length:', Array.isArray(parsedMessage.tokens) ? parsedMessage.tokens.length : 'not array')
        } catch (parseError) {
          console.log('JSON parse error:', parseError.message)
          console.log('Message starts with:', batchResult.message.substring(0, 50))
          console.log('Message ends with:', batchResult.message.substring(batchResult.message.length - 50))
        }
      }

      console.log('\n--- OTHER FIELDS ---')
      Object.keys(batchResult).forEach(key => {
        if (key !== 'message') {
          console.log(`${key}:`, batchResult[key as keyof typeof batchResult], '(type:', typeof batchResult[key as keyof typeof batchResult], ')')
        }
      })
    }

    console.log('\n--- FULL JSON STRINGIFY ---')
    console.log('Response:', JSON.stringify(batchResult, null, 2))
    console.log('=====================================')

    if (!batchResult.success) {
      return NextResponse.json(
        { error: batchResult.error || 'Failed to fetch token info from portal' },
        { status: 500 }
      )
    }

    // Parse the nested JSON response from ESP32
    let parsedData
    try {
      console.log('\n--- PARSING LOGIC ---')
      if (batchResult.message) {
        console.log('Using batchResult.message for parsing')
        parsedData = JSON.parse(batchResult.message)
      } else {
        console.log('No message field, using batchResult directly')
        parsedData = batchResult
      }

      console.log('Parsed data type:', typeof parsedData)
      console.log('Parsed data keys:', Object.keys(parsedData))
      console.log('Parsed data.success:', parsedData.success)
      console.log('Parsed data.tokens exists:', 'tokens' in parsedData)
      console.log('Parsed data.tokens type:', typeof parsedData.tokens)
      console.log('Parsed data.tokens is array:', Array.isArray(parsedData.tokens))
      if (Array.isArray(parsedData.tokens)) {
        console.log('Parsed data.tokens length:', parsedData.tokens.length)
        if (parsedData.tokens.length > 0) {
          console.log('First token sample:', JSON.stringify(parsedData.tokens[0], null, 2))
        }
      }
      console.log('--- END PARSING LOGIC ---\n')
    } catch (parseError) {
      console.error('Failed to parse ESP32 response:', parseError)
      console.error('Parse error details:', {
        message: parseError.message,
        stack: parseError.stack,
        batchResultKeys: Object.keys(batchResult),
        messageExists: 'message' in batchResult,
        messageType: typeof batchResult.message,
        messageLength: batchResult.message ? batchResult.message.length : 'N/A',
        messagePreview: batchResult.message ? batchResult.message.substring(0, 100) : 'N/A'
      })
      return NextResponse.json(
        { error: 'Invalid response format from ESP32 portal' },
        { status: 500 }
      )
    }

    if (!parsedData.success || !parsedData.tokens) {
      return NextResponse.json(
        { error: 'ESP32 portal returned invalid data structure' },
        { status: 500 }
      )
    }

    console.log('\n--- ABOUT TO MAP TOKENS ---')
    console.log('parsedData.tokens type:', typeof parsedData.tokens)
    console.log('parsedData.tokens is array:', Array.isArray(parsedData.tokens))
    console.log('parsedData.tokens length:', parsedData.tokens ? parsedData.tokens.length : 'undefined/null')
    console.log('--- END TOKEN MAPPING PREP ---\n')

    // Update database with device information
    const updatePromises = parsedData.tokens.map(async (tokenInfo) => {
      if (!tokenInfo.token) return null

      console.log(`\n🔄 [SYNC] Processing token: ${tokenInfo.token}`)
      console.log(`   ESP32 status: ${tokenInfo.status}`)
      console.log(`   ESP32 success: ${tokenInfo.success}`)

      try {
        // Find the token in our database
        const dbToken = await prisma.wifiTokens.findFirst({
          where: {
            token: tokenInfo.token,
            businessId: businessId,
          },
        })

        if (!dbToken) {
          console.log(`   ❌ Token not found in database`)
          return null
        }

        console.log(`   DB status before: ${dbToken.status}`)

        // Skip tokens that are already EXPIRED or DISABLED - no point syncing
        if (dbToken.status === 'EXPIRED' || dbToken.status === 'DISABLED') {
          console.log(`   ⏭️  Skipping - already ${dbToken.status}`)
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
          console.log(`   🚫 Token not found on ESP32 - marking as ${newStatus}`)

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
          console.log(`   ⚠️  Skipping - ESP32 fetch failed: ${tokenInfo.error}`)
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

          // Convert to lowercase for mapping (API client returns uppercase)
          const newStatus = statusMap[tokenInfo.status.toLowerCase()] || 'ACTIVE'
          console.log(`   📊 Status mapping: ESP32 '${tokenInfo.status}' → '${newStatus}'`)

          // CRITICAL RULE: UNUSED tokens can NEVER become EXPIRED
          // Expiration ONLY applies to tokens that have been redeemed (ACTIVE → EXPIRED)
          // If ESP32 says "expired" but token was never used, mark as DISABLED instead
          if (newStatus === 'EXPIRED' && !dbToken.firstUsedAt && !tokenInfo.firstUsedAt) {
            // Token expired before ever being used - mark as DISABLED
            console.log(`   ⚠️  Token expired but never used - marking as DISABLED`)
            updateData.status = 'DISABLED'
          } else {
            console.log(`   ✅ Setting status to: ${newStatus}`)
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

        console.log(`   💾 Updating token ${tokenInfo.token} - New status will be: ${updateData.status || 'unchanged'}`)

        const updated = await prisma.wifiTokens.update({
          where: { id: dbToken.id },
          data: updateData,
        })

        console.log(`   ✅ Token ${tokenInfo.token} updated successfully to status: ${updated.status}`)

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
    const foundTokens = new Set(parsedData.tokens.map(t => t.token).filter(Boolean))
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
