import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPortalClient } from '@/lib/wifi-portal/api-client'
import { getServerUser } from '@/lib/get-server-user'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { mac, list } = body

    if (!mac) {
      return NextResponse.json({ error: 'mac is required' }, { status: 400 })
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

    // Create portal client and remove MAC filter
    const portalClient = createPortalClient({
      baseUrl: `http://${integration.portalIpAddress}:${integration.portalPort}`,
      apiKey: integration.apiKey,
      timeout: 10000,
    })

    const result = await portalClient.removeMacFilter({ mac, list: list as 'blacklist' | 'whitelist' | 'both' })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to remove MAC filter' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    })

  } catch (error: any) {
    console.error('Error removing MAC filter:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove MAC filter' },
      { status: 500 }
    )
  }
}
