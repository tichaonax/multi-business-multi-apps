import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

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
    const user = await getServerUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

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

    // BOGO irreversibility guards
    if (data.bogoActive !== undefined) {
      const newActive = Boolean(data.bogoActive)
      if (existing.bogoActive && !newActive) {
        return NextResponse.json({
          success: false,
          error: 'Cannot deactivate BOGO once it has been enabled on a bale'
        }, { status: 400 })
      }
    }

    if (data.bogoRatio !== undefined) {
      const newRatio = Number(data.bogoRatio)
      if (newRatio < existing.bogoRatio) {
        return NextResponse.json({
          success: false,
          error: `Cannot reduce BOGO ratio from ${existing.bogoRatio} to ${newRatio} — ratio can only increase`
        }, { status: 400 })
      }
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

    if (data.costPrice !== undefined) {
      updateData.costPrice = data.costPrice != null ? Number(data.costPrice) : null
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

    // Record BOGO history if bogoActive or bogoRatio changed
    const bogoActiveChanged = data.bogoActive !== undefined && Boolean(data.bogoActive) !== existing.bogoActive
    const bogoRatioChanged = data.bogoRatio !== undefined && Number(data.bogoRatio) !== existing.bogoRatio

    if (bogoActiveChanged || bogoRatioChanged) {
      const action = bogoActiveChanged && Boolean(data.bogoActive) ? 'ENABLED' : 'RATIO_CHANGED'
      await prisma.clothingBaleBogoHistory.create({
        data: {
          baleId,
          changedBy: user.id,
          action,
          previousActive: existing.bogoActive,
          newActive: bale.bogoActive,
          previousRatio: existing.bogoRatio,
          newRatio: bale.bogoRatio,
        },
      })
    }

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
