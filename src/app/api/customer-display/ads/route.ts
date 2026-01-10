/**
 * Customer Display Ads API
 *
 * Fetch active advertisements for a specific business to display
 * on customer-facing screens during idle time.
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

/**
 * GET /api/customer-display/ads?businessId={id}
 * Fetch active ads for a business, sorted by sortOrder
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    // Fetch active ads for this business
    const ads = await prisma.customerDisplayAd.findMany({
      where: {
        businessId,
        isActive: true
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        title: true,
        imageUrl: true,
        videoUrl: true,
        duration: true,
        sortOrder: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      ads,
      count: ads.length
    })
  } catch (error) {
    console.error('[Customer Display Ads API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        ads: [],
        count: 0
      },
      { status: 500 }
    )
  }
}
