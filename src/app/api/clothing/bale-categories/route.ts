import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/clothing/bale-categories
export async function GET() {
  try {
    const categories = await prisma.clothingBaleCategories.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { bales: true } }
      }
    })

    return NextResponse.json({
      success: true,
      data: categories
    })
  } catch (error) {
    console.error('Bale categories fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch bale categories'
    }, { status: 500 })
  }
}

// POST /api/clothing/bale-categories
export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Category name is required'
      }, { status: 400 })
    }

    const existing = await prisma.clothingBaleCategories.findUnique({
      where: { name: name.trim() }
    })

    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'A category with this name already exists'
      }, { status: 409 })
    }

    const category = await prisma.clothingBaleCategories.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null
      }
    })

    return NextResponse.json({
      success: true,
      data: category
    }, { status: 201 })
  } catch (error) {
    console.error('Bale category creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create bale category'
    }, { status: 500 })
  }
}
