import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const { id: productId, imageId } = await params
  try {

    // Ensure image belongs to product
    const img = await prisma.productImage.findUnique({ where: { id: imageId } })
    if (!img || img.productId !== productId) return NextResponse.json({ error: 'Image not found for product' }, { status: 404 })

    // unset other images
    await prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } })

  const updated = await prisma.productImage.update({ where: { id: imageId }, data: { isPrimary: true, updatedAt: new Date() } })

    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    console.error('Set primary image error:', err)
    return NextResponse.json({ success: false, error: 'Failed to set primary image' }, { status: 500 })
  }
}
