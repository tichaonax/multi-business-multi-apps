import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Test basic database connectivity
    const products = await prisma.businessProduct.findMany({
      take: 1,
      select: {
        id: true,
        name: true,
        basePrice: true,
        isActive: true,
        businessType: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Database schema looks good!',
      data: {
        hasProducts: products.length > 0,
        testProduct: products[0] || null
      }
    })

  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Database schema issue',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}