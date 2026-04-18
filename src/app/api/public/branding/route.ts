import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/public/branding
 * Returns basic branding info for public pages (login, register).
 * No authentication required — only exposes display-safe fields.
 */
export async function GET() {
  try {
    const umbrella = await prisma.businesses.findFirst({
      where: { isUmbrellaBusiness: true },
      select: {
        umbrellaBusinessName: true,
        logoImageId: true,
      },
    })

    return NextResponse.json({
      logoImageId: umbrella?.logoImageId ?? null,
      businessName: umbrella?.umbrellaBusinessName ?? null,
    })
  } catch {
    // Fail gracefully — login page still works without branding
    return NextResponse.json({ logoImageId: null, businessName: null })
  }
}
