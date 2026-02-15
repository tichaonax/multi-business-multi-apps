import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

/**
 * GET /api/promotions/bogo?businessId=xxx
 * Returns active BOGO promotion for a business (if any)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 })
    }

    const bogo = await prisma.menuPromotions.findFirst({
      where: {
        businessId,
        type: 'BUY_ONE_GET_ONE',
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: bogo
    })
  } catch (error) {
    console.error('BOGO fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch BOGO promotion' }, { status: 500 })
  }
}

/**
 * POST /api/promotions/bogo
 * Create or update BOGO promotion for used clothing
 * Body: { businessId, bogoRatio: '1+1' | '1+2', isActive: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, bogoRatio, isActive } = await request.json()

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 })
    }

    const ratio = bogoRatio || '1+1'
    const freeItems = ratio === '1+2' ? 2 : 1

    // Check for existing BOGO promotion
    const existing = await prisma.menuPromotions.findFirst({
      where: {
        businessId,
        type: 'BUY_ONE_GET_ONE',
      }
    })

    if (existing) {
      // Update existing
      const updated = await prisma.menuPromotions.update({
        where: { id: existing.id },
        data: {
          isActive: isActive ?? true,
          value: freeItems,
          name: `BOGO Used Clothing (${ratio})`,
          description: `Buy 1, get ${freeItems} free on used clothing`,
          updatedAt: new Date()
        }
      })

      return NextResponse.json({ success: true, data: updated })
    } else {
      // Create new
      const created = await prisma.menuPromotions.create({
        data: {
          id: randomUUID(),
          businessId,
          name: `BOGO Used Clothing (${ratio})`,
          description: `Buy 1, get ${freeItems} free on used clothing`,
          type: 'BUY_ONE_GET_ONE',
          value: freeItems,
          startDate: new Date(),
          daysOfWeek: [],
          isActive: isActive ?? true,
          usageCount: 0,
          applicableCategories: [],
          applicableProducts: [],
          updatedAt: new Date()
        }
      })

      return NextResponse.json({ success: true, data: created })
    }
  } catch (error) {
    console.error('BOGO create/update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to save BOGO promotion' }, { status: 500 })
  }
}

/**
 * PUT /api/promotions/bogo
 * Toggle BOGO on/off
 * Body: { businessId, isActive: boolean }
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, isActive } = await request.json()

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 })
    }

    const existing = await prisma.menuPromotions.findFirst({
      where: {
        businessId,
        type: 'BUY_ONE_GET_ONE',
      }
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'No BOGO promotion found' }, { status: 404 })
    }

    const updated = await prisma.menuPromotions.update({
      where: { id: existing.id },
      data: {
        isActive: isActive,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('BOGO toggle error:', error)
    return NextResponse.json({ success: false, error: 'Failed to toggle BOGO' }, { status: 500 })
  }
}
