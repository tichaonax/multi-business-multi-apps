import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Get all clothing categories and subcategories
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const domainId = searchParams.get('domainId')

    const where: any = {
      businessType: 'clothing'
    }

    if (domainId) {
      where.domainId = domainId
    }

    // Get all categories with their subcategories and domains
    const categories = await prisma.businessCategories.findMany({
      where,
      include: {
        domain: {
          select: {
            id: true,
            name: true,
            emoji: true
          }
        },
        inventory_subcategories: {
          select: {
            id: true,
            name: true
          },
          orderBy: {
            name: 'asc'
          }
        }
      },
      orderBy: [
        { domain: { name: 'asc' } },
        { name: 'asc' }
      ]
    })

    // Also get all domains for filtering
    const domains = await prisma.inventoryDomains.findMany({
      where: {
        businessType: 'clothing',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        emoji: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        categories,
        domains
      }
    })
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
