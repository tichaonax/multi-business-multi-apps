import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'

// GET /api/custom-bulk?businessId=xxx[&barcode=xxx][&includeEmpty=true]
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const barcode    = searchParams.get('barcode')
    const includeEmpty    = searchParams.get('includeEmpty') === 'true'
    const includeInactive = searchParams.get('includeInactive') === 'true'

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'Business ID is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { businessId }
    if (!includeInactive) where.isActive = true
    if (!includeEmpty && !includeInactive) where.remainingCount = { gt: 0 }
    if (barcode) where.barcode = barcode.trim()

    const products = await prisma.customBulkProducts.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true } },
        supplier:  { select: { id: true, name: true } },
        employee:  { select: { firstName: true, lastName: true } },
      },
    })

    return NextResponse.json({ success: true, data: products })
  } catch (error) {
    console.error('Custom bulk fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch custom bulk products' }, { status: 500 })
  }
}

// POST /api/custom-bulk
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const {
      businessId,
      name,
      categoryId,
      supplierId,
      employeeId,
      batchNumber,
      itemCount,
      unitPrice,
      costPrice,
      barcode,
      notes,
      expenseDomainId,
      expenseCategoryId,
      expenseSubcategoryId,
    } = data

    // Required field validation
    if (!businessId || !name?.trim()) {
      return NextResponse.json({ success: false, error: 'businessId and name are required' }, { status: 400 })
    }
    if (!itemCount || Number(itemCount) <= 0) {
      return NextResponse.json({ success: false, error: 'Item count must be greater than 0' }, { status: 400 })
    }
    if (unitPrice === undefined || unitPrice === null || Number(unitPrice) <= 0) {
      return NextResponse.json({ success: false, error: 'Unit price must be greater than 0' }, { status: 400 })
    }
    if (costPrice !== undefined && costPrice !== null && costPrice !== '' && Number(costPrice) < 0) {
      return NextResponse.json({ success: false, error: 'Cost price must be 0 or greater' }, { status: 400 })
    }

    // Verify business exists
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { id: true, shortName: true },
    })
    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 })
    }

    // Auto-generate batch number if not provided: CB-YYMMDD-###
    let finalBatchNumber = batchNumber?.trim()
    if (!finalBatchNumber) {
      const now = new Date()
      const yy = String(now.getFullYear()).slice(2)
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const prefix = `CB-${yy}${mm}${dd}`

      const existing = await prisma.customBulkProducts.findMany({
        where: { businessId, batchNumber: { startsWith: prefix } },
        select: { batchNumber: true },
        orderBy: { batchNumber: 'desc' },
        take: 1,
      })

      let seq = 1
      if (existing.length > 0) {
        const lastPart = existing[0].batchNumber.split('-').pop()
        const lastSeq = parseInt(lastPart || '0', 10)
        if (!isNaN(lastSeq)) seq = lastSeq + 1
      }

      finalBatchNumber = `${prefix}-${String(seq).padStart(3, '0')}`
    }

    // Ensure batch number is unique for this business
    const existingBatch = await prisma.customBulkProducts.findUnique({
      where: { businessId_batchNumber: { businessId, batchNumber: finalBatchNumber } },
    })
    if (existingBatch) {
      return NextResponse.json({
        success: false,
        error: 'A bulk product with this batch number already exists for this business',
      }, { status: 409 })
    }

    // Auto-generate SKU: CBULK-{SHORTNAME}-{BATCH}
    const shortName = (business.shortName || 'BIZ').toUpperCase().slice(0, 4)
    const sku = `CBULK-${shortName}-${finalBatchNumber}`

    // Use provided barcode or generate a 4-byte hex scanCode
    const finalBarcode = barcode?.trim() || randomBytes(4).toString('hex')

    const product = await prisma.customBulkProducts.create({
      data: {
        businessId,
        name: name.trim(),
        categoryId: categoryId || null,
        supplierId: supplierId || null,
        employeeId: employeeId || null,
        batchNumber: finalBatchNumber,
        itemCount:      Number(itemCount),
        remainingCount: Number(itemCount),
        unitPrice:  Number(unitPrice),
        costPrice:  costPrice != null && costPrice !== '' ? Number(costPrice) : null,
        sku,
        barcode: finalBarcode,
        notes: notes?.trim() || null,
        expenseDomainId: expenseDomainId || null,
        expenseCategoryId: expenseCategoryId || null,
        expenseSubcategoryId: expenseSubcategoryId || null,
      },
      include: {
        category: { select: { id: true, name: true } },
        supplier:  { select: { id: true, name: true } },
        employee:  { select: { firstName: true, lastName: true } },
      },
    })

    return NextResponse.json({ success: true, data: product }, { status: 201 })
  } catch (error) {
    console.error('Custom bulk create error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create custom bulk product' }, { status: 500 })
  }
}
