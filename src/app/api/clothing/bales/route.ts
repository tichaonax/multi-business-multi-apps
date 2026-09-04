import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getActivePromotions, applyPromotion } from '@/lib/promotions/resolve-active-promotions'

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
      where: {
        businessId,
        isActive: true,
        // Exclude bales that have been fully transferred to another business
        NOT: {
          inventory_transfer_items: {
            some: {
              transfer: {
                status: 'COMPLETED',
                sourceBusinessId: businessId,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true } },
        employee: { select: { firstName: true, lastName: true } }
      }
    })

    // MBM-289: promotional sales — category-level (percent-off only), since bales
    // within a category have different prices. Applied to each bale's own unitPrice
    // relative to that bale's price, not a shared fixed price across the category.
    // The POS reads bale.unitPrice directly for cart math, so it must be overwritten
    // here (not just exposed alongside) for the discount to actually charge correctly.
    const activePromotions = await getActivePromotions(businessId)
    const pricedBales = bales.map(bale => {
      const priced = applyPromotion(Number(bale.unitPrice), activePromotions.get(`category:${bale.categoryId}`))
      return {
        ...bale,
        unitPrice: priced.price,
        originalPrice: priced.originalPrice,
        isPromoActive: priced.isPromoActive,
        promoEndsAt: priced.promoEndsAt,
      }
    })

    return NextResponse.json({
      success: true,
      data: pricedBales
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
      costPrice,
      barcode,
      employeeId,
      notes
    } = data

    // Validation
    if (!businessId || !categoryId || !itemCount || unitPrice === undefined || costPrice === undefined || costPrice === null || costPrice === '') {
      return NextResponse.json({
        success: false,
        error: 'businessId, categoryId, itemCount, unitPrice, and costPrice are required'
      }, { status: 400 })
    }

    if (Number(costPrice) < 0) {
      return NextResponse.json({
        success: false,
        error: 'Bale cost must be 0 or greater'
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
    const existingSku = await prisma.clothingBales.findFirst({
      where: { sku }
    })

    if (existingSku) {
      return NextResponse.json({
        success: false,
        error: `Generated SKU "${sku}" already exists. Use a different batch number.`
      }, { status: 409 })
    }

    const scanCode = randomBytes(4).toString('hex')

    const bale = await prisma.clothingBales.create({
      data: {
        businessId,
        categoryId,
        batchNumber: finalBatchNumber,
        itemCount: Number(itemCount),
        remainingCount: Number(itemCount),
        unitPrice: Number(unitPrice),
        costPrice: costPrice != null ? Number(costPrice) : null,
        sku,
        scanCode,
        barcode: barcode?.trim() || scanCode,
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
