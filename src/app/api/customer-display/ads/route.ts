/**
 * Customer Display Ads API
 *
 * Fetch active advertisements for a specific business to display
 * on customer-facing screens during idle time.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

/**
 * POST /api/customer-display/ads
 * Create a new advertisement with image upload
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const businessId = formData.get('businessId') as string
    const title = formData.get('title') as string
    const duration = formData.get('duration') as string
    const file = formData.get('image') as File | null

    // Validation
    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'businessId is required' },
        { status: 400 }
      )
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Image file is required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Parse and validate duration
    const durationNum = parseInt(duration || '10', 10)
    if (isNaN(durationNum) || durationNum < 5 || durationNum > 60) {
      return NextResponse.json(
        { success: false, error: 'Duration must be between 5 and 60 seconds' },
        { status: 400 }
      )
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

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public/uploads/customer-display-ads')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 10)
    const extension = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg'
    const filename = `${businessId}_${timestamp}_${randomString}.${extension}`

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filepath = join(uploadDir, filename)
    await writeFile(filepath, buffer)

    const imageUrl = `/uploads/customer-display-ads/${filename}`

    // Get current max sortOrder for this business
    const maxSortOrder = await prisma.customerDisplayAd.findFirst({
      where: { businessId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true }
    })

    const nextSortOrder = (maxSortOrder?.sortOrder ?? -1) + 1

    // Create ad record
    const ad = await prisma.customerDisplayAd.create({
      data: {
        businessId,
        title: title.trim(),
        imageUrl,
        duration: durationNum,
        isActive: true,
        sortOrder: nextSortOrder
      }
    })

    return NextResponse.json({
      success: true,
      ad,
      message: 'Advertisement created successfully'
    })
  } catch (error) {
    console.error('[Customer Display Ads API] POST Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create advertisement'
      },
      { status: 500 }
    )
  }
}
