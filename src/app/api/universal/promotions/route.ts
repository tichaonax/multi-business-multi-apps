import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({
        success: false,
        error: 'Business ID is required'
      }, { status: 400 })
    }

    const promotions = await prisma.menuPromotions.findMany({
      where: {
        businessId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: promotions
    })

  } catch (error) {
    console.error('Promotions fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch promotions'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const {
      businessId,
      name,
      description,
      type,
      value,
      minOrderAmount,
      maxDiscountAmount,
      startDate,
      endDate,
      startTime,
      endTime,
      daysOfWeek,
      isActive,
      usageLimit,
      applicableCategories,
      applicableProducts
    } = data

    // Validation
    if (!businessId || !name || !type || value === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    if (value <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Value must be greater than 0'
      }, { status: 400 })
    }

    if (type === 'PERCENTAGE' && value > 100) {
      return NextResponse.json({
        success: false,
        error: 'Percentage discount cannot exceed 100%'
      }, { status: 400 })
    }

    const promotion = await prisma.menuPromotions.create({
      data: {
        id: randomUUID(),
        businessId,
        name,
        description,
        type,
        value,
        minOrderAmount,
        maxDiscountAmount,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        startTime,
        endTime,
        daysOfWeek: daysOfWeek || [],
        isActive: isActive ?? true,
        usageLimit,
        usageCount: 0,
        applicableCategories: applicableCategories || [],
        applicableProducts: applicableProducts || [],
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: promotion
    })

  } catch (error) {
    console.error('Promotion creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create promotion'
    }, { status: 500 })
  }
}