import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPortalClient } from '@/lib/wifi-portal/api-client'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    // Check permission
    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    const isAdmin = user?.role === 'admin'

    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: user.id,
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

    // Create portal client and fetch tokens
    const portalClient = createPortalClient({
      baseUrl: `http://${integration.portalIpAddress}:${integration.portalPort}`,
      apiKey: integration.apiKey,
      timeout: 10000,
    })

    // Build filter params from query string
    const filterParams: any = {
      businessId: businessId, // CRITICAL: Filter by businessId for multi-business ESP32 sharing
    }

    // Check for v3.5 filter parameters
    const unusedOnly = searchParams.get('unusedOnly')
    const status = searchParams.get('status')
    const minAgeMinutes = searchParams.get('minAgeMinutes')
    const maxAgeMinutes = searchParams.get('maxAgeMinutes')
    const offset = searchParams.get('offset')
    const limit = searchParams.get('limit')

    if (unusedOnly === 'true') {
      filterParams.unusedOnly = true
    }
    if (status) {
      filterParams.status = status
    }
    if (minAgeMinutes) {
      filterParams.minAgeMinutes = parseInt(minAgeMinutes)
    }
    if (maxAgeMinutes) {
      filterParams.maxAgeMinutes = parseInt(maxAgeMinutes)
    }
    if (offset) {
      filterParams.offset = parseInt(offset)
    }

    // Default limit: if not provided by caller, request 20 tokens to avoid large defaults from the portal
    if (limit) {
      filterParams.limit = parseInt(limit)
    } else {
      filterParams.limit = 20
    }

    const result = await portalClient.listTokens(filterParams)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to list tokens from portal' },
        { status: 500 }
      )
    }

    // Enrich tokens with database information
    const enrichedTokens = await Promise.all(
      result.tokens.map(async (portalToken) => {
        // Find the corresponding WiFi token in our database
        const dbToken = await prisma.wifiTokens.findFirst({
          where: {
            token: portalToken.token,
            businessId: businessId,
          },
          include: {
            token_configurations: true,
          },
        })

        // Use database duration if available, otherwise fall back to portal data
        const durationMinutes = dbToken?.token_configurations?.durationMinutes ?? portalToken.durationMinutes ?? 0

        // Calculate remaining seconds if not provided or invalid
        let remainingSeconds = portalToken.remainingSeconds
        if (!remainingSeconds || isNaN(remainingSeconds)) {
          if (portalToken.expiresAt && portalToken.expiresAt > 0) {
            const now = Math.floor(Date.now() / 1000)
            remainingSeconds = Math.max(0, portalToken.expiresAt - now)
          } else {
            remainingSeconds = 0
          }
        }

        return {
          ...portalToken,
          durationMinutes: isNaN(durationMinutes) ? 0 : durationMinutes,
          remainingSeconds,
        }
      })
    )

    return NextResponse.json({
      success: true,
      count: result.count,
      total: result.total || result.count, // Total capacity usage
      tokens: enrichedTokens,
      offset: result.offset,
      limit: result.limit,
      has_more: result.hasMore,
    })

  } catch (error: any) {
    console.error('Error listing portal tokens:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list portal tokens' },
      { status: 500 }
    )
  }
}
