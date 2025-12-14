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

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    // Parse request body
    const body = await request.json()
    const { unusedOnly, maxAgeMinutes, expiredOnly } = body

    // Check permission - admins have access to all businesses
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

    // Create portal client and purge tokens
    const portalClient = createPortalClient({
      baseUrl: `http://${integration.portalIpAddress}:${integration.portalPort}`,
      apiKey: integration.apiKey,
      timeout: 15000,
    })

    const result = await portalClient.purgeTokens({
      unusedOnly,
      maxAgeMinutes,
      expiredOnly,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to purge tokens from portal' },
        { status: 500 }
      )
    }

    // Mark purged tokens as expired in our database
    if (result.purgedTokens && result.purgedTokens.length > 0) {
      await prisma.wifiTokens.updateMany({
        where: {
          token: { in: result.purgedTokens },
          businessId: businessId,
        },
        data: {
          status: 'EXPIRED',
          lastSyncedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      purgedCount: result.purgedCount,
      purgedTokens: result.purgedTokens,
    })

  } catch (error: any) {
    console.error('Error purging portal tokens:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to purge portal tokens' },
      { status: 500 }
    )
  }
}
