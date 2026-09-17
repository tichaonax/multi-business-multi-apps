import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

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
//
// MBM-297 follow-up: "Register New" no longer creates a CustomBulkProducts
// row (an isolated third catalog invisible to the main Inventory list, Edit
// Item, and the Pricing/Cost/Value Exceptions report). It now creates a real
// BarcodeInventoryItems row — the same catalog the Bulk Stock Panel / Stock
// Take flow already writes to — so a bulk-registered item shows up, is
// editable, and is correctly priced-checked everywhere immediately. See
// src/app/api/inventory/bulk-add-stock/route.ts for the field-population
// pattern this follows. Existing CustomBulkProducts rows (registered before
// this change) are untouched and keep working via their own POS/report code
// — GET below still serves them for the "Manage Existing" tab.
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const data = await request.json()

    const {
      businessId,
      name,
      categoryId,
      supplierId,
      batchNumber,
      itemCount,
      unitPrice,
      costPrice,
      barcode,
      notes,
      expenseDomainId,
      expenseCategoryId,
      expenseSubcategoryId,
      force,
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
      select: { id: true, shortName: true, type: true },
    })
    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 })
    }

    // Duplicate name detection (skip if caller passed force:true) — checks
    // the real Inventory catalog now, not the legacy custom-bulk table.
    if (!force) {
      const similar = await prisma.barcodeInventoryItems.findMany({
        where: {
          businessId,
          isActive: true,
          name: { contains: name.trim(), mode: 'insensitive' },
        },
        select: { id: true, name: true, stockQuantity: true, sku: true },
      })
      if (similar.length > 0) {
        return NextResponse.json({
          success: false,
          code: 'DUPLICATE_NAME',
          matches: similar.map(s => ({ id: s.id, name: s.name, remainingCount: s.stockQuantity, sku: s.sku })),
          error: 'A product with a similar name already exists in Inventory.',
        }, { status: 409 })
      }
    }

    // Auto-generate batch number if not provided: CB-YYMMDD-###
    let finalBatchNumber = batchNumber?.trim()
    if (!finalBatchNumber) {
      const now = new Date()
      const yy = String(now.getFullYear()).slice(2)
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const prefix = `CB-${yy}${mm}${dd}`

      const existing = await prisma.barcodeInventoryItems.findMany({
        where: { businessId, batchNumber: { startsWith: prefix } },
        select: { batchNumber: true },
        orderBy: { batchNumber: 'desc' },
        take: 1,
      })

      let seq = 1
      if (existing.length > 0 && existing[0].batchNumber) {
        const lastPart = existing[0].batchNumber.split('-').pop()
        const lastSeq = parseInt(lastPart || '0', 10)
        if (!isNaN(lastSeq)) seq = lastSeq + 1
      }

      finalBatchNumber = `${prefix}-${String(seq).padStart(3, '0')}`
    }

    // Ensure batch number is unique for this business (no DB-level unique
    // constraint on BarcodeInventoryItems.batchNumber — application check)
    const existingBatch = await prisma.barcodeInventoryItems.findFirst({
      where: { businessId, batchNumber: finalBatchNumber },
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

    // `costPrice` here is the whole container's cost, exactly as entered in
    // the "Bulk/Case Cost" field — this is the same field that caused the
    // original root-cause bug when a downstream reader treated it as a
    // per-unit cost. The real per-unit cost saved to BarcodeInventoryItems'
    // own `costPrice` column is always the computed division, never the raw
    // container figure — the fix for that bug lives here.
    const containerCost = costPrice != null && costPrice !== '' ? Number(costPrice) : null
    const unitsPerPack = Number(itemCount)
    const perUnitCost = containerCost != null && unitsPerPack > 0 ? containerCost / unitsPerPack : null
    const inventoryItemId = randomBytes(8).toString('hex')

    const item = await prisma.barcodeInventoryItems.create({
      data: {
        businessId,
        name: name.trim(),
        sku,
        inventoryItemId,
        barcodeData: finalBarcode,
        batchNumber: finalBatchNumber,
        quantity: unitsPerPack,
        stockQuantity: unitsPerPack,
        costPrice: perUnitCost,
        unitsPerPack,
        bulkPackCost: containerCost,
        sellingPrice: Number(unitPrice),
        categoryId: categoryId || null,
        supplierId: supplierId || null,
        customLabel: notes?.trim() || undefined,
        expenseDomainId: expenseDomainId || null,
        expenseCategoryId: expenseCategoryId || null,
        expenseSubcategoryId: expenseSubcategoryId || null,
        createdById: user.id,
        lastOrderQty: unitsPerPack,
        maxOrderQty: unitsPerPack,
        lastOrderedAt: new Date(),
      },
      include: {
        business_category: { select: { id: true, name: true } },
        business_supplier:  { select: { id: true, name: true } },
      },
    })

    await prisma.businessStockMovements.create({
      data: {
        businessId,
        barcodeInventoryItemId: item.id,
        movementType: 'PURCHASE_RECEIVED',
        quantity: unitsPerPack,
        unitCost: perUnitCost,
        businessType: business.type ?? 'unknown',
      },
    }).catch(() => {}) // non-fatal

    // Response keeps the field names the existing client already expects
    // (barcode/unitPrice/itemCount) so the print-modal-building code in
    // custom-bulk-modal.tsx needs no changes.
    return NextResponse.json({
      success: true,
      data: {
        id: item.id,
        name: item.name,
        barcode: item.barcodeData,
        unitPrice: item.sellingPrice,
        sku: item.sku,
        batchNumber: item.batchNumber,
        itemCount: item.stockQuantity,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Custom bulk create error:', error)
    return NextResponse.json({ success: false, error: 'Failed to register bulk product' }, { status: 500 })
  }
}
