import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/clothing/bales/[baleId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ baleId: string }> }
) {
  try {
    const { baleId } = await params

    const bale = await prisma.clothingBales.findUnique({
      where: { id: baleId },
      include: {
        category: { select: { id: true, name: true } },
        employee: { select: { firstName: true, lastName: true } }
      }
    })

    if (!bale) {
      return NextResponse.json({
        success: false,
        error: 'Bale not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: bale
    })
  } catch (error) {
    console.error('Bale fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch bale'
    }, { status: 500 })
  }
}

// PUT /api/clothing/bales/[baleId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ baleId: string }> }
) {
  try {
    const { baleId } = await params
    const data = await request.json()

    const existing = await prisma.clothingBales.findUnique({
      where: { id: baleId }
    })

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: 'Bale not found'
      }, { status: 404 })
    }

    // Build update payload — only include fields that were sent
    const updateData: Record<string, unknown> = {}

    if (data.bogoActive !== undefined) {
      updateData.bogoActive = Boolean(data.bogoActive)
    }

    if (data.bogoRatio !== undefined) {
      const ratio = Number(data.bogoRatio)
      if (ratio !== 1 && ratio !== 2) {
        return NextResponse.json({
          success: false,
          error: 'bogoRatio must be 1 (buy1get1) or 2 (buy1get2)'
        }, { status: 400 })
      }
      updateData.bogoRatio = ratio
    }

    if (data.isActive !== undefined) {
      updateData.isActive = Boolean(data.isActive)
    }

    if (data.barcode !== undefined) {
      updateData.barcode = data.barcode?.trim() || null
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes?.trim() || null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid fields to update'
      }, { status: 400 })
    }

    const bale = await prisma.clothingBales.update({
      where: { id: baleId },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
        employee: { select: { firstName: true, lastName: true } }
      }
    })

    return NextResponse.json({
      success: true,
      data: bale
    })
  } catch (error) {
    console.error('Bale update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update bale'
    }, { status: 500 })
  }
}
