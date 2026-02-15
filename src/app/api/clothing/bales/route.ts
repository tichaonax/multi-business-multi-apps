import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/clothing/bales?businessId=xxx
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

    const bales = await prisma.clothingBales.findMany({
      where: { businessId, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true } },
        employee: { select: { firstName: true, lastName: true } }
      }
    })

    return NextResponse.json({
      success: true,
      data: bales
    })
  } catch (error) {
    console.error('Bales fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch bales'
    }, { status: 500 })
  }
}

// POST /api/clothing/bales
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const {
      businessId,
      categoryId,
      batchNumber,
      itemCount,
      unitPrice,
      barcode,
      employeeId,
      notes
    } = data

    // Validation
    if (!businessId || !categoryId || !itemCount || unitPrice === undefined) {
      return NextResponse.json({
        success: false,
        error: 'businessId, categoryId, itemCount, and unitPrice are required'
      }, { status: 400 })
    }

    if (itemCount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Item count must be greater than 0'
      }, { status: 400 })
    }

    if (Number(unitPrice) <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Unit price must be greater than 0'
      }, { status: 400 })
    }

    // Check business exists and is clothing type
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { id: true, type: true, shortName: true }
    })

    if (!business) {
      return NextResponse.json({
        success: false,
        error: 'Business not found'
      }, { status: 404 })
    }

    if (business.type !== 'clothing') {
      return NextResponse.json({
        success: false,
        error: 'Bales can only be registered for clothing businesses'
      }, { status: 400 })
    }

    // Check category exists
    const category = await prisma.clothingBaleCategories.findUnique({
      where: { id: categoryId }
    })

    if (!category) {
      return NextResponse.json({
        success: false,
        error: 'Bale category not found'
      }, { status: 404 })
    }

    // Auto-generate batch number if not provided
    let finalBatchNumber = batchNumber?.trim()
    if (!finalBatchNumber) {
      const now = new Date()
      const yy = String(now.getFullYear()).slice(2)
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const prefix = `B-${yy}${mm}${dd}`

      // Find highest sequence for this prefix in this business
      const existing = await prisma.clothingBales.findMany({
        where: { businessId, batchNumber: { startsWith: prefix } },
        select: { batchNumber: true },
        orderBy: { batchNumber: 'desc' },
        take: 1
      })

      let seq = 1
      if (existing.length > 0) {
        const lastPart = existing[0].batchNumber.split('-').pop()
        const lastSeq = parseInt(lastPart || '0', 10)
        if (!isNaN(lastSeq)) seq = lastSeq + 1
      }

      finalBatchNumber = `${prefix}-${String(seq).padStart(3, '0')}`
    }

    // Check batch number is unique for this business
    const existingBale = await prisma.clothingBales.findUnique({
      where: { businessId_batchNumber: { businessId, batchNumber: finalBatchNumber } }
    })

    if (existingBale) {
      return NextResponse.json({
        success: false,
        error: 'A bale with this batch number already exists for this business'
      }, { status: 409 })
    }

    // Generate SKU: BALE-{SHORTNAME}-{BATCH}
    const shortName = (business.shortName || 'CLO').toUpperCase().slice(0, 4)
    const sku = `BALE-${shortName}-${finalBatchNumber}`

    // Check SKU uniqueness
    const existingSku = await prisma.clothingBales.findUnique({
      where: { sku }
    })

    if (existingSku) {
      return NextResponse.json({
        success: false,
        error: `Generated SKU "${sku}" already exists. Use a different batch number.`
      }, { status: 409 })
    }

    const bale = await prisma.clothingBales.create({
      data: {
        businessId,
        categoryId,
        batchNumber: finalBatchNumber,
        itemCount: Number(itemCount),
        remainingCount: Number(itemCount),
        unitPrice: Number(unitPrice),
        sku,
        barcode: barcode?.trim() || null,
        employeeId: employeeId || null,
        notes: notes?.trim() || null
      },
      include: {
        category: { select: { id: true, name: true } },
        employee: { select: { firstName: true, lastName: true } }
      }
    })

    return NextResponse.json({
      success: true,
      data: bale
    }, { status: 201 })
  } catch (error) {
    console.error('Bale creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create bale'
    }, { status: 500 })
  }
}
