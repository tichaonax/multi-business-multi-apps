import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

function toMinutes(value: number, unit: string): number {
  const u = unit.toLowerCase()
  if (u.includes('week')) return value * 10080
  if (u.includes('day'))  return value * 1440
  if (u.includes('hour')) return value * 60
  return value // minutes
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params

    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { name: true },
    })
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    // Check R710 first
    const wlan = await prisma.r710Wlans.findFirst({
      where: { businessId },
      select: { ssid: true },
    })

    if (wlan) {
      const menuItems = await prisma.r710BusinessTokenMenuItems.findMany({
        where: { businessId, isActive: true },
        orderBy: { displayOrder: 'asc' },
        include: {
          r710_token_configs: {
            select: { name: true, durationValue: true, durationUnit: true },
          },
        },
      })

      const packages = menuItems.map(item => ({
        name: item.r710_token_configs.name,
        durationMinutes: toMinutes(
          item.r710_token_configs.durationValue,
          item.r710_token_configs.durationUnit
        ),
        price: Number(item.businessPrice),
      })).sort((a, b) => a.durationMinutes - b.durationMinutes)

      return NextResponse.json({
        success: true,
        data: {
          businessName: business.name,
          type: 'r710' as const,
          ssid: wlan.ssid ?? null,
          packages,
        },
      })
    }

    // Check ESP32
    const portal = await prisma.portalIntegrations.findUnique({
      where: { businessId },
    })

    if (portal) {
      const menuItems = await prisma.businessTokenMenuItems.findMany({
        where: { businessId, isActive: true },
        orderBy: { createdAt: 'asc' },
        include: {
          token_configurations: {
            select: { name: true, durationMinutes: true },
          },
        },
      })

      const packages = menuItems.map(item => ({
        name: item.token_configurations.name,
        durationMinutes: item.token_configurations.durationMinutes,
        price: Number(item.businessPrice),
      })).sort((a, b) => a.durationMinutes - b.durationMinutes)

      return NextResponse.json({
        success: true,
        data: {
          businessName: business.name,
          type: 'esp32' as const,
          ssid: null,
          packages,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        businessName: business.name,
        type: 'none' as const,
        ssid: null,
        packages: [],
      },
    })
  } catch (error) {
    console.error('wifi-flier-data error:', error)
    return NextResponse.json({ error: 'Failed to load WiFi flier data' }, { status: 500 })
  }
}
