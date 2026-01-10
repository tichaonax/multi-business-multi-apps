/**
 * Customer Display Ads Reorder API
 *
 * Update the sort order of advertisements
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

/**
 * PUT /api/customer-display/ads/reorder
 * Update sortOrder for multiple ads in a single transaction
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { businessId, ads } = body

    // Validation
    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'businessId is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(ads) || ads.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ads array is required and cannot be empty' },
        { status: 400 }
      )
    }

    // Validate each ad entry
    for (const ad of ads) {
      if (!ad.id || typeof ad.sortOrder !== 'number') {
        return NextResponse.json(
          { success: false, error: 'Each ad must have id and sortOrder' },
          { status: 400 }
        )
      }
    }

    // Check if user has admin access to this business
    const userBusinesses = await prisma.employeeBusinesses.findFirst({
      where: {
        employeeId: session.user.id,
        businessId,
        role: {
          in: ['admin', 'owner']
        }
      }
    })

    if (!userBusinesses) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Verify all ads belong to this business
    const adIds = ads.map(ad => ad.id)
    const adsToUpdate = await prisma.customerDisplayAd.findMany({
      where: {
        id: { in: adIds },
        businessId
      }
    })

    if (adsToUpdate.length !== ads.length) {
      return NextResponse.json(
        { success: false, error: 'Some ads do not belong to this business or do not exist' },
        { status: 400 }
      )
    }

    // Update sortOrder for all ads in a transaction
    await prisma.$transaction(
      ads.map(ad =>
        prisma.customerDisplayAd.update({
          where: { id: ad.id },
          data: { sortOrder: ad.sortOrder }
        })
      )
    )

    // Fetch updated ads
    const updatedAds = await prisma.customerDisplayAd.findMany({
      where: {
        businessId,
        isActive: true
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      ads: updatedAds,
      message: 'Ads reordered successfully'
    })
  } catch (error) {
    console.error('[Customer Display Ads Reorder API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reorder advertisements'
      },
      { status: 500 }
    )
  }
}
