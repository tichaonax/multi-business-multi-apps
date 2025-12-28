import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    const where: any = {}
    if (businessId) {
      where.businessId = businessId
    } else if (!isSystemAdmin(session.user)) {
      const userBusinessIds = session.user.businessMemberships?.map((m: any) => m.businessId) || []
      where.businessId = { in: userBusinessIds }
    }

    const wlans = await prisma.r710Wlans.findMany({
      where,
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        device_registry: {
          select: {
            id: true,
            ipAddress: true,
            description: true,
            connectionStatus: true
          }
        },
        r710_token_configs: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const transformedWlans = wlans.map(wlan => ({
      id: wlan.id,
      ssid: wlan.ssid,
      wlanId: wlan.wlanId,
      guestServiceId: wlan.guestServiceId,
      title: wlan.title,
      validDays: wlan.validDays,
      enableFriendlyKey: wlan.enableFriendlyKey,
      isActive: wlan.isActive,
      logoType: wlan.logoType,
      businesses: wlan.businesses,
      device_registry: wlan.device_registry,
      tokenPackages: wlan.r710_token_configs.length,
      createdAt: wlan.createdAt.toISOString(),
      updatedAt: wlan.updatedAt.toISOString()
    }))

    return NextResponse.json({
      wlans: transformedWlans
    })
  } catch (error) {
    console.error('Error fetching R710 WLANs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch WLANs' },
      { status: 500 }
    )
  }
}
