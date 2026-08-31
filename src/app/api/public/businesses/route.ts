import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/public/businesses
 * Lists active businesses for the Electron kiosk's "Switch Business" device
 * default picker — that picker runs pre-login (a device-level admin setting,
 * not tied to any specific user's memberships), so this has to be reachable
 * without a session. Only display-safe fields (id/name/type), same
 * "no auth required, nothing sensitive" precedent as /api/public/branding.
 */
export async function GET() {
  try {
    const businesses = await prisma.businesses.findMany({
      where: { isActive: true, isUmbrellaBusiness: false },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ businesses })
  } catch {
    return NextResponse.json({ businesses: [] })
  }
}
