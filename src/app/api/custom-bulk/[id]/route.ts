import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

const include = {
  category: { select: { id: true, name: true } },
  supplier:  { select: { id: true, name: true } },
  employee:  { select: { firstName: true, lastName: true } },
}

// GET /api/custom-bulk/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const product = await prisma.customBulkProducts.findUnique({ where: { id }, include })

    if (!product) {
      return NextResponse.json({ success: false, error: 'Custom bulk product not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    console.error('Custom bulk get error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch custom bulk product' }, { status: 500 })
  }
}

// PUT /api/custom-bulk/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()

    const existing = await prisma.customBulkProducts.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Custom bulk product not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) {
      const name = data.name?.trim()
      if (!name) return NextResponse.json({ success: false, error: 'Name cannot be empty' }, { status: 400 })
      updateData.name = name
    }

    if (data.barcode !== undefined) {
      const barcode = data.barcode?.trim()
      if (!barcode) return NextResponse.json({ success: false, error: 'Barcode cannot be empty' }, { status: 400 })
      updateData.barcode = barcode
    }

    if (data.unitPrice !== undefined) {
      const price = Number(data.unitPrice)
      if (price <= 0) return NextResponse.json({ success: false, error: 'Unit price must be greater than 0' }, { status: 400 })
      updateData.unitPrice = price
    }

    if (data.costPrice !== undefined) {
      updateData.costPrice = data.costPrice != null && data.costPrice !== '' ? Number(data.costPrice) : null
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes?.trim() || null
    }

    if (data.categoryId !== undefined) {
      updateData.categoryId = data.categoryId || null
    }

    if (data.supplierId !== undefined) {
      updateData.supplierId = data.supplierId || null
    }

    if (data.topUpCount !== undefined) {
      const count = Number(data.topUpCount)
      if (!Number.isInteger(count) || count <= 0) {
        return NextResponse.json({ success: false, error: 'Top-up count must be a positive whole number' }, { status: 400 })
      }
      updateData.itemCount = existing.itemCount + count
      updateData.remainingCount = Number(existing.remainingCount) + count
      updateData.isActive = true
    }

    if (data.isActive !== undefined) {
      updateData.isActive = Boolean(data.isActive)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 })
    }

    const product = await prisma.customBulkProducts.update({ where: { id }, data: updateData, include })

    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    console.error('Custom bulk update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update custom bulk product' }, { status: 500 })
  }
}

// DELETE /api/custom-bulk/[id]
// Hard-deletes if no items sold; soft-deletes (isActive=false) if sales exist.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })

    const { id } = await params
    const product = await prisma.customBulkProducts.findUnique({ where: { id } })
    if (!product) return NextResponse.json({ success: false, error: 'Bulk product not found' }, { status: 404 })

    if (product.remainingCount < product.itemCount) {
      // Items have been sold — soft-delete only
      await prisma.customBulkProducts.update({ where: { id }, data: { isActive: false } })
      return NextResponse.json({ success: true, deactivated: true, message: 'Product deactivated (has sales history)' })
    }

    await prisma.customBulkProducts.delete({ where: { id } })
    return NextResponse.json({ success: true, deleted: true, message: 'Product deleted' })
  } catch (error) {
    console.error('Custom bulk delete error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete bulk product' }, { status: 500 })
  }
}
