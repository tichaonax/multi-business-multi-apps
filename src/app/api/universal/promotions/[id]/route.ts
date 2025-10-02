import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> })
 {

    const { id } = await params
  try {
    const promotionId = id
    const data = await request.json()

    const promotion = await prisma.menuPromotion.update({
      where: { id: promotionId },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : null,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: promotion
    })

  } catch (error) {
    console.error('Promotion update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update promotion'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> })
 {

    const { id } = await params
  try {
    const promotionId = id

    await prisma.menuPromotion.delete({
      where: { id: promotionId }
    })

    return NextResponse.json({
      success: true,
      message: 'Promotion deleted successfully'
    })

  } catch (error) {
    console.error('Promotion deletion error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete promotion'
    }, { status: 500 })
  }
}