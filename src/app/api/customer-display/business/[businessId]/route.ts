/**
 * Public Customer Display Business Info API
 *
 * Provides basic business information for customer-facing displays
 * without requiring authentication (since displays are public)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/customer-display/business/[businessId]
 * Fetch public business information for customer display
 * No authentication required (public display)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    // Fetch basic business details (only public info)
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        type: true,
        phone: true,
        receiptReturnPolicy: true,
        umbrellaBusinessName: true,
        umbrellaBusinessPhone: true,
        isActive: true
      }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    if (!business.isActive) {
      return NextResponse.json(
        { error: 'Business is not active' },
        { status: 404 }
      )
    }

    // Return only public-safe information
    const publicBusinessInfo = {
      id: business.id,
      name: business.name,
      type: business.type,
      phone: business.phone || business.umbrellaBusinessPhone || '',
      receiptReturnPolicy: business.receiptReturnPolicy || 'All sales are final',
      umbrellaBusinessName: business.umbrellaBusinessName,
      umbrellaBusinessPhone: business.umbrellaBusinessPhone
    }

    return NextResponse.json({
      success: true,
      business: publicBusinessInfo
    })
  } catch (error) {
    console.error('[Customer Display Business API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch business information'
      },
      { status: 500 }
    )
  }
}
