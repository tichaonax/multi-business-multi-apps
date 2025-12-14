import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPortalClient } from '@/lib/wifi-portal/api-client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    // Check permission
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    const isAdmin = user?.role === 'admin'

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

    // Create portal client and fetch tokens
    const portalClient = createPortalClient({
      baseUrl: `http://${integration.portalIpAddress}:${integration.portalPort}`,
      apiKey: integration.apiKey,
      timeout: 10000,
    })

    const result = await portalClient.listTokens()

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
      tokens: enrichedTokens,
    })

  } catch (error: any) {
    console.error('Error listing portal tokens:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list portal tokens' },
      { status: 500 }
    )
  }
}
