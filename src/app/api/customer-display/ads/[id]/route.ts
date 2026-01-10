/**
 * Customer Display Ad Management API
 *
 * Individual ad operations: Update and Delete
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

/**
 * PUT /api/customer-display/ads/[id]
 * Update an advertisement (title, duration, isActive, or replace image)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if ad exists
    const existingAd = await prisma.customerDisplayAd.findUnique({
      where: { id }
    })

    if (!existingAd) {
      return NextResponse.json(
        { success: false, error: 'Advertisement not found' },
        { status: 404 }
      )
    }

    // Check if user has admin access to this business
    const userBusinesses = await prisma.employeeBusinesses.findFirst({
      where: {
        employeeId: session.user.id,
        businessId: existingAd.businessId,
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

    const formData = await request.formData()
    const title = formData.get('title') as string | null
    const duration = formData.get('duration') as string | null
    const isActive = formData.get('isActive') as string | null
    const file = formData.get('image') as File | null

    const updateData: any = {}

    // Update title if provided
    if (title !== null) {
      if (title.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Title cannot be empty' },
          { status: 400 }
        )
      }
      updateData.title = title.trim()
    }

    // Update duration if provided
    if (duration !== null) {
      const durationNum = parseInt(duration, 10)
      if (isNaN(durationNum) || durationNum < 5 || durationNum > 60) {
        return NextResponse.json(
          { success: false, error: 'Duration must be between 5 and 60 seconds' },
          { status: 400 }
        )
      }
      updateData.duration = durationNum
    }

    // Update isActive if provided
    if (isActive !== null) {
      updateData.isActive = isActive === 'true'
    }

    // Replace image if new file provided
    if (file) {
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

      // Delete old image file
      if (existingAd.imageUrl) {
        const oldFilePath = join(process.cwd(), 'public', existingAd.imageUrl)
        if (existsSync(oldFilePath)) {
          try {
            await unlink(oldFilePath)
          } catch (error) {
            console.warn('Failed to delete old image file:', error)
          }
        }
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
      const filename = `${existingAd.businessId}_${timestamp}_${randomString}.${extension}`

      // Save new file
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const filepath = join(uploadDir, filename)
      await writeFile(filepath, buffer)

      updateData.imageUrl = `/uploads/customer-display-ads/${filename}`
    }

    // Update ad record
    const updatedAd = await prisma.customerDisplayAd.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      ad: updatedAd,
      message: 'Advertisement updated successfully'
    })
  } catch (error) {
    console.error('[Customer Display Ads API] PUT Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update advertisement'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/customer-display/ads/[id]
 * Delete an advertisement (soft delete by setting isActive=false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if ad exists
    const existingAd = await prisma.customerDisplayAd.findUnique({
      where: { id }
    })

    if (!existingAd) {
      return NextResponse.json(
        { success: false, error: 'Advertisement not found' },
        { status: 404 }
      )
    }

    // Check if user has admin access to this business
    const userBusinesses = await prisma.employeeBusinesses.findFirst({
      where: {
        employeeId: session.user.id,
        businessId: existingAd.businessId,
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

    // Get hard delete parameter (optional)
    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hard') === 'true'

    if (hardDelete) {
      // Hard delete: Remove file and database record
      if (existingAd.imageUrl) {
        const filePath = join(process.cwd(), 'public', existingAd.imageUrl)
        if (existsSync(filePath)) {
          try {
            await unlink(filePath)
          } catch (error) {
            console.warn('Failed to delete image file:', error)
          }
        }
      }

      await prisma.customerDisplayAd.delete({
        where: { id }
      })

      return NextResponse.json({
        success: true,
        message: 'Advertisement permanently deleted'
      })
    } else {
      // Soft delete: Set isActive to false
      const deletedAd = await prisma.customerDisplayAd.update({
        where: { id },
        data: { isActive: false }
      })

      return NextResponse.json({
        success: true,
        ad: deletedAd,
        message: 'Advertisement deactivated'
      })
    }
  } catch (error) {
    console.error('[Customer Display Ads API] DELETE Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete advertisement'
      },
      { status: 500 }
    )
  }
}
